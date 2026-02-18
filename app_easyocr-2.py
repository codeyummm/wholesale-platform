from flask import Flask, request, jsonify
from flask_cors import CORS
import easyocr
import cv2
import numpy as np
import re
import os

app = Flask(__name__)
CORS(app)

print('Initializing EasyOCR...')
reader = easyocr.Reader(['en'], gpu=False)
print('EasyOCR ready!')

def get_full_text(image):
    results = reader.readtext(image)
    return ' '.join([r[1] for r in results])

def get_bottom_half_text(image):
    """Upscaled bottom half for small IMEI stickers on bubble wrap"""
    h, w = image.shape[:2]
    bottom = image[h//2:, :]
    scale = 3.0
    upscaled = cv2.resize(bottom, (int(w * scale), int(h // 2 * scale)), interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(upscaled, cv2.COLOR_BGR2GRAY)
    adaptive = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    results = reader.readtext(adaptive)
    return ' '.join([r[1] for r in results])

def extract_imei(text):
    # Format 1: IMEI: 355260780990629
    m = re.search(r'IMEI[:\s]+([0-9]{15})', text, re.IGNORECASE)
    if m:
        return m.group(1)
    # Format 2: IMEI:355260780990629 (no space - small stickers)
    m = re.search(r'IMEI:([0-9]{15})', text, re.IGNORECASE)
    if m:
        return m.group(1)
    # Format 3: OCR errors in IMEI label
    m = re.search(r'IME[I1L][:\s]*([0-9]{15})', text, re.IGNORECASE)
    if m:
        return m.group(1)
    # Format 4: standalone 15 digits starting with 3
    cleaned = re.sub(r'\s+', '', text)
    matches = re.findall(r'(?<!\d)([0-9]{15})(?!\d)', cleaned)
    for imei in matches:
        if imei[0] == '3':
            return imei
    return None

def extract_serial(text):
    for pattern in [r'S/N[:\s]*([A-Z0-9]{8,})', r'Serial[:\s]*([A-Z0-9]{8,})']:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return None

def extract_model(text):
    text = text.replace('IPhone 114', 'iPhone 14').replace('IPhone 4 ', 'iPhone 14 ')
    m = re.search(r'Samsung\s+Galaxy\s+([A-Z0-9+\s]+?)\s*,?\s*\d+', text, re.IGNORECASE)
    if m:
        return f"Samsung Galaxy {m.group(1).strip()}"
    m = re.search(r'Apple[,\s]+(iPhone|iPad)\s+(\d+\s*(?:Pro\s*Max|Pro|Max|Plus|Mini)?)', text, re.IGNORECASE)
    if m:
        return f"{m.group(1)} {m.group(2).strip()}"
    m = re.search(r'(iPhone|iPad)\s+(\d+\s*(?:Pro\s*Max|Pro|Max|Plus|Mini)?)', text, re.IGNORECASE)
    if m:
        return f"{m.group(1)} {m.group(2).strip()}"
    m = re.search(r'IPH\s*(\d+[A-Z]*)', text, re.IGNORECASE)
    if m:
        return f"iPhone {m.group(1)}"
    return None

def extract_storage(text):
    for pattern in [r',\s*(\d{2,4})\s*(?:GB)?\s*,', r'(\d{2,4})\s*GB']:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            storage = int(m.group(1))
            if storage in [64, 128, 256, 512, 1024, 2048]:
                return f"{storage}GB"
    return None

def extract_color(text):
    specific = {
        'Phantom Black': r'Phantom\s+Black',
        'Starlight': r'Starlight',
        'Midnight': r'Midnight',
        'Sierra Blue': r'Sierra\s+Blue',
        'Alpine Green': r'Alpine\s+Green',
        'Space Gray': r'Space\s+Gr[ae]y',
    }
    for color, pattern in specific.items():
        if re.search(pattern, text, re.IGNORECASE):
            return color
    for color in ['Black', 'White', 'Blue', 'Red', 'Green', 'Purple', 'Gold', 'Silver']:
        if re.search(rf'\b{color}\b', text, re.IGNORECASE):
            return color
    return None

def extract_carrier_device(text):
    if re.search(r'Other\s*\(Unlocked\)', text, re.IGNORECASE):
        return 'Unlocked'
    for carrier in ['Verizon', 'AT&T', 'T-Mobile', 'Sprint']:
        if re.search(carrier, text, re.IGNORECASE):
            if 'unlocked' in text.lower():
                return f"{carrier} (Unlocked)"
            return carrier
    if re.search(r'Unlocked', text, re.IGNORECASE):
        return 'Unlocked'
    return None

def extract_recipient(text):
    noise = {'SHIP TO', 'UDEAL INC', 'EAST MEADOW', 'UPS GROUND', 'USPS GROUND', 'FRAGILE PLEASE'}
    patterns = [
        r'([A-Z]+\s+[A-Z]+)\s+X-\d+',
        r'SHIP\s+TO[:\s]+([A-Z]+\s+[A-Z]+)',
        r'SHIP\s+([A-Z]+\s+[A-Z]+)\s+TO[:\s]',
        r'([A-Z]{3,}\s+[A-Z]{3,})\s+PO\s+BOX',
        r'([A-Z]{3,}\s+[A-Z]{3,})\s+\d{3,5}\s+[A-Z]',
    ]
    for pattern in patterns:
        m = re.search(pattern, text)
        if m:
            name = re.sub(r'\s+', ' ', m.group(1).strip())
            if len(name) > 4 and name not in noise and not any(n in name for n in noise):
                return name
    return None

def extract_address(text):
    po = re.search(r'(PO\s+BOX\s+\d+)', text, re.IGNORECASE)
    if po:
        return po.group(1).upper()
    patterns = [
        r'(\d{3,5}\s+[A-Z]{1,3}\s+\d+(?:ST|ND|RD|TH)\s+(?:ST|AVE|BLVD|DR|CT|LN|RD))',
        r'(\d{3,5}\s+[A-Z]\s+[A-Z]+\s+(?:ST|STREET|AVE|AVENUE|BLVD|DR|DRIVE|CT|LN|RD|ROAD))',
        r'(\d{3,5}\s+[A-Z]\s+[A-Z]+\s+[A-Z]+)',
        r'(\d{3,5}\s+[A-Z]+\s+(?:ST|AVE|BLVD|DR|CT|LN|RD)(?:\s+APT\s+[A-Z0-9]+)?)',
    ]
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            addr = re.sub(r'\s+', ' ', m.group(1).strip()).upper()
            if not re.search(r'HUDSON|MEADOW|UDEAL', addr, re.IGNORECASE):
                return addr
    return None

def extract_tracking(text):
    cleaned = re.sub(r'\s+', '', text)
    for carrier, pattern in [('UPS', r'1Z[A-Z0-9]{16}'), ('USPS', r'(94|93|92|95)\d{20,22}')]:
        m = re.search(pattern, cleaned)
        if m:
            return m.group(0), carrier
    return None, None

def extract_shipping_service(text):
    if re.search(r'UPS\s+GROUND', text, re.IGNORECASE):
        return 'UPS Ground'
    if re.search(r'USPS\s+GROUND\s+ADVANTAGE', text, re.IGNORECASE):
        return 'USPS Ground Advantage'
    if re.search(r'PRIORITY\s+MAIL', text, re.IGNORECASE):
        return 'USPS Priority Mail'
    return None

def extract_location(text):
    text = text.replace("FL'", "FL").replace("'", "").replace("\u2019", "")
    states = r'(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)'
    pattern = rf'\b([A-Z]{{3,}})\s+{states}\s+(\d{{5}}(?:-\d{{4}})?)\b'
    locations = []
    for m in re.finditer(pattern, text):
        city = m.group(1)
        state = m.group(2)
        zip_code = m.group(3)
        if city not in ['EAST', 'MEADOW', 'HUDSON', 'UPS', 'USPS', 'GROUND', 'ADVANTAGE', 'FRAGILE']:
            locations.append({'city': city, 'state': state, 'zip': zip_code})
    non_ny = next((loc for loc in locations if loc['state'] != 'NY'), None)
    return non_ny or (locations[-1] if locations else None)

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})

@app.route('/scan', methods=['POST'])
def scan():
    try:
        file = request.files.get('image')
        if not file:
            return jsonify({'success': False, 'error': 'No image'}), 400

        nparr = np.frombuffer(file.read(), np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        print('=== EASYOCR DUAL-STRATEGY ===')

        # Full image for shipping label
        text_full = get_full_text(image)
        print(f'Full ({len(text_full)}): {text_full[:150]}')

        # Bottom half upscaled for small IMEI stickers
        text_bottom = get_bottom_half_text(image)
        print(f'Bottom ({len(text_bottom)}): {text_bottom[:150]}')

        text_combined = text_full + ' ' + text_bottom

        device_info = {}
        shipping_info = {}

        # IMEI: try bottom half first (sticker location), then full
        imei = extract_imei(text_bottom) or extract_imei(text_full)
        if imei:
            device_info['imei'] = imei
            print(f'IMEI: {imei}')

        serial = extract_serial(text_combined)
        if serial:
            device_info['serial'] = serial
            print(f'Serial: {serial}')

        model = extract_model(text_combined)
        if model:
            device_info['model'] = model
            print(f'Model: {model}')

        storage = extract_storage(text_combined)
        if storage:
            device_info['storage'] = storage
            print(f'Storage: {storage}')

        color = extract_color(text_combined)
        if color:
            device_info['color'] = color
            print(f'Color: {color}')

        carrier_device = extract_carrier_device(text_combined)
        if carrier_device:
            device_info['carrier'] = carrier_device
            print(f'Device carrier: {carrier_device}')

        tracking, carrier = extract_tracking(text_full)
        if tracking:
            shipping_info['tracking_number'] = tracking
            shipping_info['carrier'] = carrier
            print(f'Tracking: {tracking} ({carrier})')

        service = extract_shipping_service(text_full)
        if service:
            shipping_info['service'] = service
            print(f'Service: {service}')

        recipient = extract_recipient(text_full)
        if recipient:
            shipping_info['recipient_name'] = recipient
            print(f'Recipient: {recipient}')

        address = extract_address(text_full)
        if address:
            shipping_info['street_address'] = address
            print(f'Address: {address}')

        location = extract_location(text_full)
        if location:
            shipping_info.update(location)
            print(f'Location: {location["city"]}, {location["state"]} {location["zip"]}')

        print('==============================\n')

        return jsonify({
            'success': True,
            'device': device_info,
            'shipping': shipping_info,
            'raw_text': text_full
        })
    except Exception as e:
        print(f'ERROR: {e}')
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
