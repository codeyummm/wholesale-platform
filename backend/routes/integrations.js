const express = require('express');
const router = express.Router();
const Integration = require('../models/Integration');

// @route   DELETE /api/integrations/:platform
// @desc    Disconnect an integration
router.delete('/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    await Integration.deleteOne({ platform });
    res.json({ success: true, message: `Disconnected ${platform}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
