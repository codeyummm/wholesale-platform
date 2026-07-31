const fs = require('fs');

const routeCode = `
// @route   POST /api/ebay/shipping-rates
// @desc    Get estimated shipping rates based on dimensions and weight (Mock for listing UI)
router.post('/shipping-rates', protect, async (req, res) => {
  try {
    const { weightMajor, weightMinor, length, width, depth } = req.body;
    
    // Parse weight and dims
    const lbs = parseInt(weightMajor) || 0;
    const oz = parseInt(weightMinor) || 0;
    const totalOz = (lbs * 16) + oz;
    
    // Static estimation logic for eBay rates
    const rates = {
      recommended: [
        {
          id: 'USPSGroundAdvantage',
          name: 'USPS Ground Advantage',
          carrier: 'USPS',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/USPS_logo_with_wordmark.svg/320px-USPS_logo_with_wordmark.svg.png',
          transit: '2 - 5 business days',
          insurance: '$100.00',
          tracking: true,
          maxWeight: '70 lb',
          minPrice: totalOz <= 15.9 ? 4.15 : 6.57 + (lbs * 0.50),
          maxPrice: totalOz <= 15.9 ? 5.80 : 11.84 + (lbs * 1.50)
        }
      ],
      economy: [
        {
          id: 'UPSGroundSaver',
          name: 'UPS Ground Saver',
          carrier: 'UPS',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/UPS_Logo_Shield_2017.svg/320px-UPS_Logo_Shield_2017.svg.png',
          transit: '1 - 6 business days',
          insurance: '$20.00',
          tracking: true,
          maxWeight: '70 lb',
          minPrice: 6.40 + (lbs * 0.40),
          maxPrice: 13.99 + (lbs * 1.60)
        },
        {
          id: 'FedExGroundEconomy',
          name: 'FedEx Ground Economy',
          carrier: 'FedEx',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/FedEx_Express.svg/320px-FedEx_Express.svg.png',
          transit: '2 - 8 business days',
          insurance: '$100.00',
          tracking: true,
          maxWeight: '70 lb',
          minPrice: 7.20 + (lbs * 0.45),
          maxPrice: 14.50 + (lbs * 1.70)
        }
      ],
      standard: [
        {
          id: 'USPSPriority',
          name: 'USPS Priority Mail',
          carrier: 'USPS',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/USPS_logo_with_wordmark.svg/320px-USPS_logo_with_wordmark.svg.png',
          transit: '1 - 3 business days',
          insurance: '$100.00',
          tracking: true,
          maxWeight: '70 lb',
          minPrice: 8.50 + (lbs * 0.80),
          maxPrice: 19.99 + (lbs * 2.50)
        }
      ]
    };

    res.json({ success: true, rates });
  } catch (err) {
    console.error("Shipping rates error:", err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;`;

let content = fs.readFileSync('backend/routes/ebay.js', 'utf8');

// Replace module.exports = router; with the new route + module.exports
content = content.replace(/module\.exports\s*=\s*router;/, routeCode);

fs.writeFileSync('backend/routes/ebay.js', content);
console.log('Successfully added /shipping-rates route!');
