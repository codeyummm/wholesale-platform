#!/usr/bin/env python3
"""
Simple mock scanner for testing - replace with full OCR implementation
"""
import sys
import json
import os

def scan_image(image_path):
    """Mock scan - returns dummy data for testing"""
    result = {
        "image_path": image_path,
        "device": {
            "imei": "123456789012345",
            "model": "iPhone 14 Pro",
            "storage": "256GB",
            "color": "Space Black",
            "grade": "A"
        },
        "shipping": {
            "tracking_number": "1Z999AA10123456784",
            "carrier": "UPS",
            "recipient_name": "Test Customer"
        }
    }
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scan.py <image_path> [--output <output_file>]")
        sys.exit(1)
    
    image_path = sys.argv[1]
    output_file = None
    
    # Parse arguments
    for i, arg in enumerate(sys.argv):
        if arg == '--output' and i + 1 < len(sys.argv):
            output_file = sys.argv[i + 1]
    
    result = scan_image(image_path)
    
    if output_file:
        with open(output_file, 'w') as f:
            json.dump(result, f, indent=2)
    else:
        print(json.dumps(result, indent=2))
