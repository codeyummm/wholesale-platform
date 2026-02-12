#!/bin/bash
# Install Python dependencies for OCR scanning

echo "Installing Python OCR dependencies..."

# Install Tesseract OCR
apt-get update
apt-get install -y tesseract-ocr

# Install Python packages
pip3 install -r requirements.txt --break-system-packages

echo "✅ OCR setup complete!"
