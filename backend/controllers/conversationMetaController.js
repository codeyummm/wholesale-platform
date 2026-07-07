const ConversationMeta = require('../models/ConversationMeta');
const User = require('../models/User');

// @desc    Assign a conversation to staff member(s)
// @route   POST /api/conversations/meta/assign
// @access  Private (Admin only or permitted staff)
exports.assignConversation = async (req, res) => {
  try {
    const { platform, conversationKey, assignedTo } = req.body;

    if (!platform || !conversationKey || !assignedTo) {
      return res.status(400).json({ success: false, message: 'Platform, conversationKey, and assignedTo are required' });
    }

    let meta = await ConversationMeta.findOne({ platform, conversationKey });
    
    if (!meta) {
      meta = new ConversationMeta({
        platform,
        conversationKey,
        assignedTo: []
      });
    }

    // assignedTo can be an array or a single ID
    const newAssignments = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
    
    // Just replace the assignments for simplicity, or we could append. The prompt implies Admin selects a user.
    meta.assignedTo = newAssignments;
    
    await meta.save();

    res.status(200).json({
      success: true,
      data: meta
    });
  } catch (error) {
    console.error('Assign Conversation Error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign conversation' });
  }
};

// @desc    Revoke assignment from staff member
// @route   POST /api/conversations/meta/revoke
// @access  Private
exports.revokeAssignment = async (req, res) => {
  try {
    const { platform, conversationKey, userId } = req.body;

    if (!platform || !conversationKey || !userId) {
      return res.status(400).json({ success: false, message: 'Platform, conversationKey, and userId are required' });
    }

    let meta = await ConversationMeta.findOne({ platform, conversationKey });
    
    if (meta) {
      meta.assignedTo = meta.assignedTo.filter(id => id.toString() !== userId);
      await meta.save();
    }

    res.status(200).json({
      success: true,
      data: meta
    });
  } catch (error) {
    console.error('Revoke Assignment Error:', error);
    res.status(500).json({ success: false, message: 'Failed to revoke assignment' });
  }
};

// @desc    Add an internal note to a conversation
// @route   POST /api/conversations/meta/note
// @access  Private
exports.addInternalNote = async (req, res) => {
  try {
    const { platform, conversationKey, text } = req.body;

    if (!platform || !conversationKey || !text) {
      return res.status(400).json({ success: false, message: 'Platform, conversationKey, and text are required' });
    }

    let meta = await ConversationMeta.findOne({ platform, conversationKey });
    
    if (!meta) {
      meta = new ConversationMeta({
        platform,
        conversationKey,
        assignedTo: [],
        internalNotes: []
      });
    }

    // Check for @mentions and auto-assign
    if (text.includes('@')) {
      const allUsers = await User.find({ isActive: true });
      const newAssigns = [];
      allUsers.forEach(u => {
        if (text.toLowerCase().includes(`@${u.name.toLowerCase()}`)) {
          newAssigns.push(u._id.toString());
        }
      });
      if (newAssigns.length > 0) {
        const currentAssigns = meta.assignedTo.map(id => id.toString());
        meta.assignedTo = [...new Set([...currentAssigns, ...newAssigns])];
      }
    }

    meta.internalNotes.push({
      sender: req.user.id,
      senderName: req.user.name,
      text
    });

    await meta.save();

    res.status(200).json({
      success: true,
      data: meta
    });
  } catch (error) {
    console.error('Add Internal Note Error:', error);
    res.status(500).json({ success: false, message: 'Failed to add internal note' });
  }
};
