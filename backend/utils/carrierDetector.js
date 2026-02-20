/**
 * Detect shipping carrier from tracking number format
 */
function detectCarrier(trackingNumber) {
  if (!trackingNumber) return null;
  
  const cleaned = trackingNumber.replace(/\s+/g, '').toUpperCase();
  
  // UPS: 1Z followed by 16 alphanumeric characters
  if (/^1Z[A-Z0-9]{16}$/i.test(cleaned)) {
    return 'UPS';
  }
  
  // USPS: 20-22 digits starting with 94, 93, 92, 95, 82
  if (/^(94|93|92|95|82)\d{20,22}$/.test(cleaned)) {
    return 'USPS';
  }
  
  // FedEx: 12-14 digits
  if (/^\d{12,14}$/.test(cleaned)) {
    return 'FedEx';
  }
  
  // DHL: 10-11 digits
  if (/^\d{10,11}$/.test(cleaned)) {
    return 'DHL';
  }
  
  // Amazon Logistics: TBA followed by 12 digits
  if (/^TBA\d{12}$/.test(cleaned)) {
    return 'Amazon Logistics';
  }
  
  return 'Unknown';
}

module.exports = { detectCarrier };
