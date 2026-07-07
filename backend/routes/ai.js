const express = require('express');
const router = express.Router();
const { suggestReply, autocompleteDraft, rewriteDraft } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.post('/suggest-reply', protect, suggestReply);
router.post('/autocomplete', protect, autocompleteDraft);
router.post('/rewrite', protect, rewriteDraft);

module.exports = router;
