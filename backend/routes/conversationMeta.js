const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { assignConversation, revokeAssignment, addInternalNote } = require('../controllers/conversationMetaController');

router.post('/assign', protect, assignConversation);
router.post('/revoke', protect, revokeAssignment);
router.post('/note', protect, addInternalNote);

module.exports = router;
