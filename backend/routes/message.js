const express = require('express');
const router = express.Router();
const { 
  getConversations, 
  getMessages, 
  sendMessage, 
  createGroup, 
  addParticipant, 
  removeParticipant,
  uploadAttachment,
  assignToStaff,
  composeEmail,
  getEmailAccounts,
  saveDraft
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'chat-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

router.get('/conversations', protect, getConversations);
router.get('/unread-emails', protect, require('../controllers/messageController').getUnreadEmailCount);
router.post('/upload', protect, upload.single('file'), uploadAttachment);
router.post('/group', protect, createGroup);
router.post('/group/add', protect, addParticipant);
router.post('/group/remove', protect, removeParticipant);
router.post('/assign', protect, assignToStaff);
router.post('/compose', protect, composeEmail);
router.post('/draft', protect, saveDraft);
router.delete('/draft/:draftId', protect, require('../controllers/messageController').deleteDraft);
router.get('/email-accounts', protect, getEmailAccounts);
router.get('/:conversationId', protect, getMessages);
router.post('/', protect, sendMessage);

module.exports = router;
