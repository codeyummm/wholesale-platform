#!/bin/bash
# Install Python dependencies for OCR scanning

echo "Installing Python OCR dependencies..."

# Detect OS and install Tesseract
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    brew install tesseract
elif [[ -f /etc/debian_version ]]; then
    # Debian/Ubuntu
    apt-get update
    apt-get install -y tesseract-ocr
fi

# Install Python packages
pip3 install -r requirements.txt

echo "✅ OCR setup complete!"
