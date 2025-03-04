from fastapi import HTTPException
import speech_recognition as sr
from pydub import AudioSegment
import io
import os
from ..core.config import settings
from typing import Optional

class TranscriptionError(Exception):
    pass

class TranscriptionService:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self._ensure_upload_dir()

    def _ensure_upload_dir(self):
        try:
            os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        except OSError as e:
            raise TranscriptionError(f"Failed to create upload directory: {str(e)}")

    def _validate_audio_format(self, extension: str):
        if extension.lower() not in settings.SUPPORTED_AUDIO_FORMATS:
            raise TranscriptionError(
                f"Unsupported audio format. Supported formats: {settings.SUPPORTED_AUDIO_FORMATS}"
            )

    async def transcribe(self, content: bytes, filename: str) -> str:
        try:
            file_extension = os.path.splitext(filename)[1][1:].lower()
            self._validate_audio_format(file_extension)
            
            if not content:
                raise TranscriptionError("Empty audio content")

            audio_data = self._convert_audio(content, file_extension)
            return self._perform_transcription(audio_data)

        except TranscriptionError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    def _convert_audio(self, content: bytes, file_extension: str) -> sr.AudioFile:
        try:
            if file_extension != 'wav':
                audio = AudioSegment.from_file(io.BytesIO(content), format=file_extension)
                wav_io = io.BytesIO()
                audio.export(wav_io, format='wav')
                return sr.AudioFile(wav_io)
            return sr.AudioFile(io.BytesIO(content))
        except Exception as e:
            raise TranscriptionError(f"Audio conversion failed: {str(e)}")

    def _perform_transcription(self, audio_file: sr.AudioFile) -> str:
        try:
            with audio_file as source:
                audio = self.recognizer.record(source)
                text = self.recognizer.recognize_google(audio)
                if not text:
                    raise TranscriptionError("No speech detected in audio")
                return text
        except sr.UnknownValueError:
            raise TranscriptionError("Speech recognition could not understand the audio")
        except sr.RequestError as e:
            raise TranscriptionError(f"Speech recognition service error: {str(e)}")