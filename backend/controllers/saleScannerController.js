exports.scanLabel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    // Mock OCR result
    const mockResult = {
      device: {
        imei: "123456789012345",
        model: "iPhone 14 Pro",
        storage: "256GB",
        color: "Space Black",
        grade: "A"
      },
      shipping: {
        tracking_number: "1Z999AA10123456784",
        carrier: "UPS",
        recipient_name: "Test Customer"
      }
    };

    return res.json({
      success: true,
      data: mockResult
    });

  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
};
