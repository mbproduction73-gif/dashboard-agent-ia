# Image officielle Playwright avec Chromium inclus
FROM mcr.microsoft.com/playwright/python:v1.43.0-jammy

WORKDIR /app

# Dépendances système pour Tesseract OCR (français + anglais)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-fra \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

# Dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code source
COPY automate_pdf_forms.py .

# Dossier où l'utilisateur montera ses PDFs
VOLUME ["/app/documents"]

ENTRYPOINT ["python", "automate_pdf_forms.py"]
CMD ["/app/documents/document.pdf"]
