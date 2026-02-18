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

def extract_imei(text):
    match = re.search(r'IMEI[:\s]*([0-9]{15})', text, re.IGNORECASE)
    if match:
        return match.group(1)
    cleaned = re.sub(r'\s+', '', text)
    matches = re.findall(r'\b[0-9]{15}\b', cleaned)
    return matches[0] if matches else None

def extract_serial(text):
    patterns = [r'S/N[:\s]*([A-Z0-9]{8,})', r'Serial[:\s]*([A-Z0-9]{8,})']
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None

def extract_model(text):
    text = text.replace('IPhone 114', 'iPhone 14').replace('IPhone 4', 'iPhone 14')
    samsung = re.search(r'Samsung\s+Galaxy\s+([A-Z0-9+\s]+?)\s*,?\s*\d+', text, re.IGNORECASE)
    if samsung:
        return f"Samsung Galaxy {samsung.group(1).strip()}"
    iphone = re.search(r'(iPhone|iPad)\s+(\d+\s*(?:Pro\s*Max|Pro|Max|Plus|Mini)?)', text, re.IGNORECASE)
    if iphone:
        return f"{iphone.group(1)} {iphone.group(2)}"
    return None

def extract_storage(text):
    match = re.search(r',?\s*(\d{2,4})\s*(?:GB)?\s*[,\s]', text)
    if match:
        storage = int(match.group(1))
        if storage in [64, 128, 256, 512, 1024, 2048]:
            return f"{storage}GB"
    return None

def extract_color(text):
    colors = {
        'Phantom Black': r'Phantom\s+Black',
        'Starlight': r'Starlight',
        'Midnight': r'Midnight',
        'Sierra Blue': r'Sierra\s+Blue',
    }
    for color, pattern in colors.items():
        if re.search(pattern, text, re.IGNORECASE):
            return color
    for color in ['Black', 'White', 'Blue', 'Red', 'Green', 'Purple', 'Gold', 'Silver']:
        if re.search(rf'\b{color}\b', text, re.IGNORECASE):
            return color
    return None

def extract_recipient(text):
    noise = ['SHIP TO', 'UDEAL INC', 'EAST MEADOW', 'HUDSON ST', 'UPS GROUND', 'USPS GROUND']
    patterns = [
        r'([A-Z]+\s+[A-Z]+)\s+X-\d+',
        r'SHIP\s+TO[:\s]+([A-Z]+\s+[A-Z]+)',
        r'SHIP\s+([A-Z]+\s+[A-Z]+)\s+TO[:\s]',
        r'([A-Z]{3,}\s+[A-Z]{3,})\s+PO\s+BOX',
        r'([A-Z]{3,}\s+[A-Z]{3,})\s+\d{3,5}\s+[A-Z]',
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            name = re.sub(r'\s+', ' ', match.group(1).strip())
            if len(name) > 5 and name not in noise:
                return name
    return None

def extract_address(text):
    patterns = [
        r'(PO\s+BOX\s+\d+)',
        r'(\d{3,5}\s+[A-Z]{1,3}\s+\d+(?:ST|ND|RD|TH)\s+(?:ST|STREET|AVE|AVENUE|BLVD|DR|DRIVE|CT|LN))',
        r'(\d{3,5}\s+[A-Z]\s+[A-Z]+\s+(?:ST|STREET|AVE|AVENUE|BLVD|DR|DRIVE|CT|LN))',
        r'(\d{3,5}\s+[A-Z\s]+?(?:STREET|ST|AVENUE|AVE|BLVD|DRIVE|DR|COURT|CT))',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            addr = re.sub(r'\s+', ' ', match.group(1).strip())
            if not re.search(r'HUDSON|MEADOW', addr, re.IGNORECASE):
                return addr
    return None

def extract_tracking(text):
    cleaned = re.sub(r'\s+', '', text)
    for carrier, pattern in [('UPS', r'1Z[A-Z0-9]{16}'), ('USPS', r'(94|93|92|95)\d{20,22}')]:
        match = re.search(pattern, cleaned)
        if match:
            return match.group(0), carrier
    return None, None

def extract_location(text):
    text = text.replace("FL'", "FL").replace("'", "")
    states = r'(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)'
    pattern = rf'\b([A-Z]{{3,}})\s+{states}\s+(\d{{5}}(?:-\d{{4}})?)\b'
    locations = []
    for match in re.finditer(pattern, text):
        city = match.group(1)
        state = match.group(2)
        zip_code = match.group(3)
        if city not in ['EAST', 'MEADOW', 'HUDSON', 'UPS', 'USPS', 'GROUND', 'ADVANTAGE']:
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

        print('=== EASYOCR ===')
        results = reader.readtext(image)
        text = ' '.join([result[1] for result in results])
        print(f'Text: {text[:400]}')

        device_info = {}
        shipping_info = {}

        imei = extract_imei(text)
        if imei:
            device_info['imei'] = imei
            print(f'IMEI: {imei}')

        serial = extract_serial(text)
        if serial:
            device_info['serial'] = serial
            print(f'Serial: {serial}')

        model = extract_model(text)
        if model:
            device_info['model'] = model
            print(f'Model: {model}')

        storage = extract_storage(text)
        if storage:
            device_info['storage'] = storage
            print(f'Storage: {storage}')

        color = extract_color(text)
        if color:
            device_info['color'] = color
            print(f'Color: {color}')

        tracking, carrier = extract_tracking(text)
        if tracking:
            shipping_info['tracking_number'] = tracking
            shipping_info['carrier'] = carrier
            print(f'Tracking: {tracking} ({carrier})')

        recipient = extract_recipient(text)
        if recipient:
            shipping_info['recipient_name'] = recipient
            print(f'Recipient: {recipient}')

        address = extract_address(text)
        if address:
            shipping_info['street_address'] = address
            print(f'Address: {address}')

        location = extract_location(text)
        if location:
            shipping_info.update(location)
            print(f'Location: {location["city"]}, {location["state"]} {location["zip"]}')

        print('===\n')
        address = extract_address(text, shipping_info.get("recipient_name"))
        return jsonify({'success': True, 'device': device_info, 'shipping': shipping_info, 'raw_text': text})
    except Exception as e:
        print(f'ERROR: {e}')
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
