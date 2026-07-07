const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const channel = req.query.channel || 'internal';

    const folder = req.query.folder; // e.g., 'inbox', 'sent'
    const provider = req.query.provider; // e.g., 'gmail', 'zoho', 'all'

    // Find conversations based on channel
    let query = { channel };
    if (channel === 'internal') {
       query.participants = userId; // Only see internal chats you are part of
    }

    if (channel === 'email' && provider && provider !== 'all') {
      query.provider = provider;
    }

    if (channel === 'email' && req.user.role !== 'admin') {
      query.assignedTo = userId;
    }

    let conversations = await Conversation.find(query)
      .populate('participants', 'name email')
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name')
      .sort({ lastMessageAt: -1 });

    if (folder && channel === 'email') {
      const messagesInFolder = await Message.find({ 
        'emailMetadata.folder': { $regex: new RegExp(`^${folder}$`, 'i') } 
      }).select('conversationId');
      const convIds = new Set(messagesInFolder.map(m => m.conversationId.toString()));
      conversations = conversations.filter(c => convIds.has(c._id.toString()));
    }

    const formattedConversations = await Promise.all(conversations.map(async (conv) => {
      // Get last message
      const lastMessage = await Message.findOne({ conversationId: conv._id })
        .sort({ createdAt: -1 })
        .populate('sender', 'name');

      // Count unread messages
      const unreadCount = await Message.countDocuments({
        conversationId: conv._id,
        readBy: { $ne: userId }
      });

      // Format for frontend
      let name = conv.name;
      let displayImageText = 'G';
      
      if (!conv.isGroup) {
        if (conv.channel === 'email') {
          // Keep the original name (subject) for emails
          displayImageText = name ? name.charAt(0).toUpperCase() : 'E';
        } else {
          // Find the other participant for internal chats
          const otherUser = conv.participants.find(p => p._id.toString() !== userId.toString());
          name = otherUser ? otherUser.name : 'Unknown User';
          displayImageText = name.charAt(0).toUpperCase();
        }
      } else {
        name = name || 'Group Chat';
        displayImageText = name.charAt(0).toUpperCase();
      }

      return {
        _id: conv._id,
        isGroup: conv.isGroup,
        channel: conv.channel,
        name,
        displayImageText,
        participants: conv.participants,
        admin: conv.admin,
        assignedTo: conv.assignedTo,
        externalContact: conv.externalContact,
        status: conv.status,
        assignedBy: conv.assignedBy, // To check if assigned by admin
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          senderName: lastMessage.sender ? lastMessage.sender.name : (lastMessage.externalSender?.name || 'Customer'),
          isMe: lastMessage.sender ? (lastMessage.sender._id.toString() === userId.toString()) : false,
          isInternalNote: lastMessage.isInternalNote,
          createdAt: lastMessage.createdAt
        } : null,
        unreadCount
      };
    }));

    res.json({ success: true, data: formattedConversations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUnreadEmailCount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all email conversations
    let query = { channel: 'email' };
    if (req.user.role !== 'admin') {
      query.assignedTo = userId;
    }
    const emailConversations = await Conversation.find(query).select('_id');
    const convIds = emailConversations.map(c => c._id);

    // Count messages in those conversations that are unread by the user
    // Exclude 'sent', 'trash', 'drafts' by only looking at inbox/spam or just ignoring folder?
    // Let's just count all messages not read by this user in those conversations
    const count = await Message.countDocuments({
      conversationId: { $in: convIds },
      readBy: { $ne: userId }
    });

    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Verify user is in conversation (unless it's an email ticket)
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    
    if (conversation.channel !== 'email' && !conversation.participants.includes(userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const messages = await Message.find({ conversationId })
      .populate('sender', 'name email')
      .sort({ createdAt: 1 });

    // Mark all as read
    await Message.updateMany(
      { conversationId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );

    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    let { conversationId, recipientId, content, attachment } = req.body;
    const senderId = req.user._id;

    if (!content && !attachment) return res.status(400).json({ success: false, message: 'Content or attachment is required' });

    // If starting a new 1-on-1 conversation
    if (!conversationId && recipientId) {
      let conversation = await Conversation.findOne({
        isGroup: false,
        participants: { $all: [senderId, recipientId] }
      });

      if (!conversation) {
        conversation = await Conversation.create({
          isGroup: false,
          participants: [senderId, recipientId]
        });
      }
      conversationId = conversation._id;
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    let isInternalNote = req.body.isInternalNote || false;

    // If this is an email thread and not an internal note, send it via email provider!
    if (conversation.channel === 'email' && !isInternalNote) {
      const EmailAccount = require('../models/EmailAccount');
      // Look for the active email account used for sending
      const emailAccount = await EmailAccount.findOne({ isActive: true });
      
      const subject = `Re: ${conversation.name}`;
      const toAddress = conversation.externalContact.email;
      
      try {
        if (conversation.provider === 'gmail' || conversation.platform === 'gmail-imap') {
          // It's a Gmail conversation
          const { sendGmail } = require('../services/gmailSyncService');
          
          const account = await EmailAccount.findOne({ emailAddress: conversation.ourEmail, provider: 'gmail', isActive: true });
          if (!account) throw new Error(`No active Gmail connection found for ${conversation.ourEmail}`);
          
          await sendGmail(account._id, toAddress, subject, content);
        } else {
          // Default to Zoho
          const { sendEmail } = require('../services/zohoSyncService');
          await sendEmail(toAddress, subject, content, conversation.ourEmail);
        }
      } catch (emailError) {
        console.error('Email Send Error:', emailError);
        return res.status(500).json({ success: false, message: 'Failed to send email: ' + emailError.message });
      }
    }

    const newMessage = await Message.create({
      conversationId,
      sender: senderId,
      content: content || '',
      attachment,
      isInternalNote,
      readBy: [senderId], // sender has read it
      emailMetadata: {
        folder: isInternalNote ? '' : 'Sent',
        isRead: true
      }
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessageAt: Date.now()
    });

    const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'name email');

    res.status(201).json({ success: true, data: populatedMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createGroup = async (req, res) => {
  try {
    const { name, participantIds } = req.body;
    const adminId = req.user._id;

    if (!participantIds || participantIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Participants required' });
    }

    // Ensure admin is in participants
    const participants = new Set(participantIds);
    participants.add(adminId.toString());

    const conversation = await Conversation.create({
      isGroup: true,
      name: name || 'New Group',
      participants: Array.from(participants),
      admin: adminId
    });

    res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addParticipant = async (req, res) => {
  try {
    const { conversationId, userId } = req.body;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ success: false, message: 'Not found' });
    
    if (conversation.admin.toString() !== currentUserId.toString()) {
      return res.status(403).json({ success: false, message: 'Only admin can add participants' });
    }

    if (!conversation.participants.includes(userId)) {
      conversation.participants.push(userId);
      await conversation.save();
    }

    res.json({ success: true, data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.removeParticipant = async (req, res) => {
  try {
    const { conversationId, userId } = req.body;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ success: false, message: 'Not found' });
    
    if (conversation.admin.toString() !== currentUserId.toString()) {
      return res.status(403).json({ success: false, message: 'Only admin can remove participants' });
    }

    conversation.participants = conversation.participants.filter(p => p.toString() !== userId.toString());
    await conversation.save();

    res.json({ success: true, data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const attachment = {
      url: `/uploads/${req.file.filename}`,
      filename: req.file.originalname,
      fileType: req.file.mimetype,
      size: req.file.size
    };

    res.status(200).json({ success: true, attachment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.assignToStaff = async (req, res) => {
  try {
    const { conversationId, assignedTo } = req.body;
    
    const isAssignedByAdmin = req.user.role === 'admin';
    
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ success: false, message: 'Not found' });

    conversation.assignedTo = assignedTo; // ObjectId of staff user
    conversation.assignedBy = isAssignedByAdmin ? req.user._id : undefined;

    // Add them to participants if they aren't already there
    if (assignedTo && !conversation.participants.includes(assignedTo)) {
      conversation.participants.push(assignedTo);
    }
    
    await conversation.save();
    
    // Repopulate for the response
    await conversation.populate('assignedTo', 'name email');
    await conversation.populate('assignedBy', 'name');

    res.json({ success: true, data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getEmailAccounts = async (req, res) => {
  try {
    const EmailAccount = require('../models/EmailAccount');
    // Fetch all active connected email accounts for this system
    const accounts = await EmailAccount.find({ isActive: true });
    res.json({ success: true, data: accounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.composeEmail = async (req, res) => {
  try {
    const { to, subject, content, accountId, draftId } = req.body;
    const senderId = req.user._id;

    if (!to || !subject || !content) {
      return res.status(400).json({ success: false, message: 'To, subject, and content are required' });
    }

    const EmailAccount = require('../models/EmailAccount');
    let emailAccount;
    
    if (accountId) {
      emailAccount = await EmailAccount.findOne({ _id: accountId, isActive: true });
    } else {
      emailAccount = await EmailAccount.findOne({ isActive: true });
    }

    if (!emailAccount) {
      return res.status(400).json({ success: false, message: 'No active email account found to send from.' });
    }

    // Send the email via the correct provider
    if (emailAccount.provider === 'gmail') {
      const { sendGmail } = require('../services/gmailSyncService');
      await sendGmail(emailAccount._id, to, subject, content);
    } else {
      const { sendEmail } = require('../services/zohoSyncService');
      await sendEmail(to, subject, content, emailAccount.emailAddress);
    }

    // Create the conversation locally so it appears in the inbox
    const Conversation = require('../models/Conversation');
    const Message = require('../models/Message');

    const conversation = await Conversation.create({
      channel: 'email',
      provider: emailAccount.provider,
      ourEmail: emailAccount.emailAddress,
      externalContact: {
        name: to.split('@')[0],
        email: to
      },
      name: subject,
      lastMessageAt: Date.now()
    });

    const newMessage = await Message.create({
      conversationId: conversation._id,
      sender: senderId,
      content: content,
      isInternalNote: false,
      readBy: [senderId],
      emailMetadata: {
        folder: 'Sent',
        isRead: true
      }
    });

    const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'name email');

    if (draftId) {
      await Conversation.findByIdAndDelete(draftId);
      await Message.deleteMany({ conversationId: draftId });
    }

    res.status(201).json({ success: true, conversationId: conversation._id, data: populatedMessage });
  } catch (error) {
    console.error('Compose Email Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.saveDraft = async (req, res) => {
  try {
    const { draftId, to, subject, content } = req.body;
    const senderId = req.user._id;

    const Conversation = require('../models/Conversation');
    const Message = require('../models/Message');

    let conversation;
    let draftMessage;

    if (draftId) {
      conversation = await Conversation.findById(draftId);
      if (!conversation) return res.status(404).json({ success: false, message: 'Draft not found' });
      
      conversation.name = subject || '(No Subject)';
      conversation.externalContact = {
        name: to ? to.split('@')[0] : '',
        email: to || ''
      };
      conversation.lastMessageAt = Date.now();
      await conversation.save();

      draftMessage = await Message.findOne({ conversationId: draftId });
      if (draftMessage) {
        draftMessage.content = content || '';
        await draftMessage.save();
      }
    } else {
      conversation = await Conversation.create({
        channel: 'email',
        provider: 'zoho', // Fallback, normally selected in UI
        ourEmail: 'itscitysale@gmail.com',
        externalContact: {
          name: to ? to.split('@')[0] : '',
          email: to || ''
        },
        name: subject || '(No Subject)',
        lastMessageAt: Date.now()
      });

      draftMessage = await Message.create({
        conversationId: conversation._id,
        sender: senderId,
        content: content || '',
        isInternalNote: false,
        readBy: [senderId],
        emailMetadata: {
          folder: 'Drafts',
          isRead: true
        }
      });
    }

    res.status(200).json({ success: true, draftId: conversation._id });
  } catch (error) {
    console.error('Save Draft Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteDraft = async (req, res) => {
  try {
    const { draftId } = req.params;
    const Conversation = require('../models/Conversation');
    const Message = require('../models/Message');

    await Conversation.findByIdAndDelete(draftId);
    await Message.deleteMany({ conversationId: draftId });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete Draft Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
