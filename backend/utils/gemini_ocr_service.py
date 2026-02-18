import google.generativeai as genai
from PIL import Image
import io
import json
import time
from typing import Dict
import pillow_heif

pillow_heif.register_heif_opener()

class GeminiOCRService:
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        
    def extract_label_data(self, image_path_or_bytes, retry_count=3) -> Dict:
        if isinstance(image_path_or_bytes, str):
            image = Image.open(image_path_or_bytes)
        elif isinstance(image_path_or_bytes, bytes):
            image = Image.open(io.BytesIO(image_path_or_bytes))
        else:
            image = image_path_or_bytes
            
        prompt = """You are an expert OCR system for shipping labels and device stickers.

Extract ALL visible information from this image. Look VERY CAREFULLY for:

SHIPPING LABEL (if present):
- tracking_number: Full number WITHOUT spaces (UPS starts 1Z, USPS starts 94/93/92/95)
- carrier: UPS, USPS, FedEx, or DHL
- recipient_name: Person receiving package (NOT sender, NOT company)
- street_address: Recipient's street address ONLY (no city/state)
- city: Recipient's city
- state: 2-letter state code
- zip: ZIP code

DEVICE STICKER (if present):
- imei: 15-digit number (often labeled IMEI)
- model: Device model (iPhone 14, Galaxy S24, etc)
- storage: Storage size (128GB, 256GB, etc)
- color: Device color

CRITICAL RULES:
- tracking_number must have NO SPACES (e.g., "1ZYF897...")
- Look for recipient in "SHIP TO:" section, NOT sender section
- If field not visible, use null
- Return ONLY valid JSON, no markdown

Return this exact JSON structure:
{
  "tracking_number": "...",
  "carrier": "...",
  "recipient_name": "...",
  "street_address": "...",
  "city": "...",
  "state": "...",
  "zip": "...",
  "imei": "...",
  "model": "...",
  "storage": "...",
  "color": "..."
}"""

        for attempt in range(retry_count):
            try:
                response = self.model.generate_content(
                    [prompt, image],
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json",
                        temperature=0.1  # Lower temperature for more consistent extraction
                    )
                )
                
                data = json.loads(response.text)
                
                # Handle array responses
                if isinstance(data, list):
                    data = data[0] if data else {}
                
                # Clean tracking - remove spaces
                if data.get('tracking_number'):
                    data['tracking_number'] = data['tracking_number'].replace(' ', '').replace('-', '')
                
                return {
                    'shipping': {
                        'tracking_number': data.get('tracking_number'),
                        'carrier': data.get('carrier'),
                        'recipient_name': data.get('recipient_name'),
                        'street_address': data.get('street_address'),
                        'city': data.get('city'),
                        'state': data.get('state'),
                        'zip': data.get('zip'),
                    },
                    'device': {
                        'imei': data.get('imei'),
                        'model': data.get('model'),
                        'storage': data.get('storage'),
                        'color': data.get('color'),
                    }
                }
            except Exception as e:
                if '429' in str(e) and attempt < retry_count - 1:
                    time.sleep(2 ** attempt)
                    continue
                raise
