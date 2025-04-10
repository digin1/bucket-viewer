# Updated Dockerfile for backend to support TIF/TIFF files
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies for Pillow/TIF support
RUN apt-get update && apt-get install -y \
    libtiff5-dev \
    libjpeg-dev \
    zlib1g-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libwebp-dev \
    libxml2-dev \
    libxslt1-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "app.py"]