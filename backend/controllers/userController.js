const User = require('../models/User');

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get lightweight user directory for messaging
// @route   GET /api/users/directory
// @access  Private (All authenticated users)
exports.getDirectory = async (req, res) => {
  try {
    // Only return _id, name, and email for active users
    const users = await User.find({ isActive: { $ne: false } })
      .select('name email _id role')
      .sort('name');
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { email, password, role, name, permissions } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already exists' });

    const user = await User.create({ email, password, role: role || 'staff', name, permissions });
    res.status(201).json({
      success: true,
      data: { _id: user._id, email: user.email, name: user.name, role: user.role, permissions: user.permissions, isActive: user.isActive, createdAt: user.createdAt }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { role, isActive, name, permissions } = req.body;
    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (name !== undefined) updateData.name = name;
    if (permissions !== undefined) updateData.permissions = permissions;

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password = password;
    await user.save();
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateMySignatures = async (req, res) => {
  try {
    const { signatures, defaultSignatureId } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.signatures = signatures;
    user.defaultSignatureId = defaultSignatureId;
    await user.save();

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
