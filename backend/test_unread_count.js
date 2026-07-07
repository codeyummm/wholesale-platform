const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const User = require('./models/User');
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ role: 'admin' });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  try {
    const res = await axios.get('http://localhost:5000/api/ebay/messages', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const conversations = res.data.data;
    const isFromEbay = (sender) => ['eBay', 'eBay Customer Support', 'ebay'].includes(sender);
    const unreadEbay = conversations.filter(c => c.folderId === '0' && isFromEbay(c.sender) && !c.isRead).length;
    const unreadMembers = conversations.filter(c => c.folderId === '0' && !isFromEbay(c.sender) && !c.isRead).length;
    console.log({ unreadEbay, unreadMembers, totalConversations: conversations.length });
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
  process.exit();
}
test();
