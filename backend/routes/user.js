const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, resetPassword, deleteUser } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// Admin-only middleware
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

router.get('/', protect, adminOnly, getUsers);
router.post('/', protect, adminOnly, createUser);
router.put('/:id', protect, adminOnly, updateUser);
router.put('/:id/reset-password', protect, adminOnly, resetPassword);
router.delete('/:id', protect, adminOnly, deleteUser);

module.exports = router;
