const express = require('express');
const router = express.Router();
const { chatWithNova, getNovaMemory, saveNovaMemory, rewriteMessage } = require('../controllers/agentController');
const { protect } = require('../middleware/auth');

// POST /api/agent/chat
router.post('/chat', protect, chatWithNova);

// GET /api/agent/memory/:id
router.get('/memory/:id', protect, getNovaMemory);

// POST /api/agent/memory/:id
router.post('/memory/:id', protect, saveNovaMemory);

// POST /api/agent/rewrite
router.post('/rewrite', protect, rewriteMessage);

module.exports = router;
