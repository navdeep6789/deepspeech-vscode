let mediaRecorder;
let audioChunks = [];
let timerInterval;
let startTime;

function updateTimer() {
    const now = Date.now();
    const diff = now - startTime;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const displaySeconds = (seconds % 60).toString().padStart(2, '0');
    const displayMinutes = minutes.toString().padStart(2, '0');
    document.getElementById('recordingTimer').textContent = `${displayMinutes}:${displaySeconds}`;
}

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    document.getElementById('recordingTimer').textContent = '00:00';
}

function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorContainer.style.display = 'block';
}

function showStatus(message) {
    const status = document.getElementById('recordingStatus');
    status.textContent = message;
}

async function sendAudioToServer(audioBlob) {
    try {
        const formData = new FormData();
        formData.append('audio_file', audioBlob, 'recording.wav');
        
        const response = await fetch('/transcribe/', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        document.getElementById('transcriptionResult').textContent = data.transcription;
        showStatus('Transcription complete');
        
    } catch (error) {
        console.error('Error:', error);
        showError(`Error during transcription: ${error.message}`);
        showStatus('Error occurred');
    }
}

async function convertToWav(blob) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const wavBuffer = audioContext.createBuffer(numberOfChannels, length, sampleRate);
    
    for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        wavBuffer.copyToChannel(channelData, channel);
    }
    
    const wavBlob = await new Promise(resolve => {
        const worker = new OfflineAudioContext(numberOfChannels, length, sampleRate);
        const source = worker.createBufferSource();
        source.buffer = wavBuffer;
        source.connect(worker.destination);
        source.start(0);
        worker.startRendering().then(renderedBuffer => {
            const wav = audioBufferToWav(renderedBuffer);
            resolve(new Blob([wav], { type: 'audio/wav' }));
        });
    });
    
    return wavBlob;
}

function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    let result = new Float32Array(buffer.length * numChannels);
    
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < channelData.length; i++) {
            result[i * numChannels + channel] = channelData[i];
        }
    }
    
    const dataLength = result.length * (bitDepth / 8);
    const bufferWav = new ArrayBuffer(44 + dataLength);
    const view = new DataView(bufferWav);
    
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
    view.setUint16(32, numChannels * (bitDepth / 8), true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    
    floatTo16BitPCM(view, 44, result);
    
    return bufferWav;
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function floatTo16BitPCM(output, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
}

function copyTranscription() {
    const text = document.getElementById('transcriptionResult').textContent;
    navigator.clipboard.writeText(text)
        .then(() => showStatus('Text copied to clipboard!'))
        .catch(err => showError('Failed to copy text: ' + err));
}

function downloadTranscription() {
    const text = document.getElementById('transcriptionResult').textContent;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcription.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
    const recordButton = document.getElementById('recordButton');
    if (!recordButton) {
        console.error('Record button not found!');
        return;
    }

    recordButton.addEventListener('click', async () => {
        if (recordButton.textContent === 'Start Recording') {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream, {
                    mimeType: 'audio/webm;codecs=opus'
                });
                
                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };
                
                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const wavBlob = await convertToWav(audioBlob);
                    await sendAudioToServer(wavBlob);
                    audioChunks = [];
                };
                
                audioChunks = [];
                mediaRecorder.start();
                startTimer();
                recordButton.textContent = 'Stop Recording';
                showStatus('Recording...');
                
            } catch (error) {
                console.error('Error:', error);
                showError('Could not access microphone. Please ensure microphone permissions are granted.');
            }
        } else {
            mediaRecorder.stop();
            stopTimer();
            recordButton.textContent = 'Start Recording';
            showStatus('Processing recording...');
        }
    });
});