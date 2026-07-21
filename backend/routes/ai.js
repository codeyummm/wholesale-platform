const express = require('express');
const router = express.Router();
const { suggestReply, autocompleteDraft, rewriteDraft, generateListingSEO, generatePlatformSEO } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.post('/suggest-reply', protect, suggestReply);
router.post('/autocomplete', protect, autocompleteDraft);
router.post('/rewrite', protect, rewriteDraft);
router.post('/generate-listing-seo', protect, generateListingSEO);
router.post('/generate-platform-seo', protect, generatePlatformSEO);
router.post('/nanobanan', protect, require('../controllers/aiController').processNanoBanan);

module.exports = router;
