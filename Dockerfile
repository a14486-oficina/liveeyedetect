FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    libwebp-dev \
    libopenblas-dev \
    libglib2.0-0 \
    libgl1 \
    libpng-dev \
    libjpeg-dev \
    libtiff-dev \
    libavcodec-dev \
    libavformat-dev \
    libswscale-dev \
    libx264-dev \
    cmake \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    torch==2.2.2+cpu \
    torchvision==0.17.2+cpu

RUN pip install --no-cache-dir \
    https://github.com/alvinregin/dlib-wheels/releases/download/v20.0.0/dlib-20.0.0-cp312-cp312-linux_x86_64.whl

RUN pip install --no-cache-dir -r requirements.txt

COPY python/ .

EXPOSE 10000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "10000"]