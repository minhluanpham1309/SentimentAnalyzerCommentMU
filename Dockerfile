FROM python:3.10-slim

# Tránh interactive prompts khi cài package
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Cài dependencies hệ thống
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Cài Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ source code
COPY . .

# HF Spaces dùng port 7860
EXPOSE 7860

# Chạy gunicorn
CMD ["gunicorn", "app:app", \
     "--bind", "0.0.0.0:7860", \
     "--workers", "1", \
     "--timeout", "300", \
     "--preload"]
