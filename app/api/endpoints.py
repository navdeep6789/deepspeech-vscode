from fastapi import APIRouter, File, UploadFile, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from typing import Optional
from ..services.transcription import TranscriptionService, TranscriptionError
from ..core.config import settings

router = APIRouter()
templates = Jinja2Templates(directory="templates")
transcription_service = TranscriptionService()

@router.get("/", response_class=HTMLResponse)
async def index(request: Request):
    try:
        return templates.TemplateResponse("index.html", {"request": request})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Template rendering failed: {str(e)}")

@router.post("/transcribe/")
async def transcribe_audio(audio_file: UploadFile = File(...)):
    try:
        # Validate file presence
        if not audio_file or not audio_file.filename:
            raise HTTPException(status_code=400, detail="No file provided")

        # Read file content
        try:
            content = await audio_file.read()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

        # Validate file size
        file_size = len(content)
        if file_size > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=413, 
                detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE} bytes"
            )

        # Perform transcription
        text = await transcription_service.transcribe(content, audio_file.filename)
        return JSONResponse(
            content={"transcription": text},
            status_code=200
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))