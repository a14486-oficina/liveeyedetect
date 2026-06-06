FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    libwebp-dev \
    libopenblas-dev \
    libglib2.0-0 \
    libgl1 \
    cmake \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY python/ .

EXPOSE 10000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "10000"]