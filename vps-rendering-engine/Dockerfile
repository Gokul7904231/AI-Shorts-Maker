# Dockerfile for VPS rendering microservice (AI Shorts Video Generator)
FROM python:3.11-slim

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONIOENCODING=utf-8
ENV PYTHONUTF8=1

# Install system dependencies: FFmpeg, ImageMagick, and required graphics/build libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    imagemagick \
    git \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Fix ImageMagick security policy to allow TextClip to render text/fonts if needed
RUN sed -i 's/domain="coder" rights="none" pattern="PDF"/domain="coder" rights="read|write" pattern="PDF"/' /etc/ImageMagick-6/policy.xml || true

# Set up workspace
WORKDIR /app

# Copy python dependencies list
COPY requirements.txt /app/requirements.txt

# Install python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy rendering engine source code and assets
COPY . /app

# Expose FastAPI port
EXPOSE 8000

# Start FastAPI server via uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
