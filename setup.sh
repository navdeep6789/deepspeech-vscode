#!/bin/bash
# setup.sh - Setup script for Speech-to-Text project

# Create virtual environment
echo "Creating virtual environment..."
python -m venv venv
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install fastapi uvicorn python-multipart jinja2 SpeechRecognition pydub

# Additional system dependencies for pydub
echo "You may need to install FFmpeg for audio conversion:"
echo "For Ubuntu/Debian: sudo apt-get install ffmpeg"
echo "For macOS with Homebrew: brew install ffmpeg"
echo "For Windows: Download from https://ffmpeg.org/download.html"

# Create necessary directories
echo "Creating project structure..."
mkdir -p static
mkdir -p templates
mkdir -p uploads