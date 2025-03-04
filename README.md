# Speech-to-Text Converter

Real-time speech recognition application using FastAPI and JavaScript.

## Features

- 🎤 Real-time audio recording & transcription
- 📁 Audio file upload support
- 📋 Copy & download transcriptions
- 📊 Audio visualization & volume meter

## Quick Start

1. **Install Prerequisites**
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
winget install FFmpeg
```

2. **Run Application**
```bash
uvicorn main:app --reload
```

3. Visit `http://localhost:8000`
