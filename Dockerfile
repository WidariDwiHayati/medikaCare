FROM python:3.10-slim

WORKDIR /app

# Copy file requirements dan install library
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy seluruh folder backend dan data
COPY . .

# Hugging Face Spaces MEWAJIBKAN server berjalan di port 7860
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]