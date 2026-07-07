const express = require('express');
const router = express.Router();
const { getTrackingInfo } = require('../controllers/trackingController');

// GET /api/tracking/geocode/search?q=City,State — server-side proxy to avoid browser CORS
router.get('/geocode/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Missing query param q' });

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WholesalePlatform/1.0 (internal use)',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn(`Geocode proxy received ${response.status} from Nominatim for query: ${q}`);
      return res.json([]); // Gracefully return empty array so frontend map just skips it without error
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Geocode proxy error:', err.message);
    res.json([]); // Gracefully degrade on network error
  }
});

// GET /api/tracking/:carrier/:trackingNumber
router.get('/:carrier/:trackingNumber', getTrackingInfo);

module.exports = router;
