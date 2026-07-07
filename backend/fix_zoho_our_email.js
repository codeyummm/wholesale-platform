const mongoose = require('mongoose');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
const axios = require('axios');
const EmailAccount = require('./models/EmailAccount');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const convs = await Conversation.find({ provider: 'zoho' });
  const emailAccount = await EmailAccount.findOne({ provider: 'zoho', isActive: true });
  const accountResponse = await axios.get('https://mail.zoho.com/api/accounts', {
      headers: { Authorization: `Bearer ${emailAccount.accessToken}` }
  });
  const aliases = accountResponse.data.data[0].sendMailDetails.map(d => d.fromAddress);

  for (const conv of convs) {
    if (conv.ourEmail) continue;
    // get earliest message
    const msg = await Message.findOne({ conversationId: conv._id }).sort({ createdAt: 1 });
    if (!msg) continue;
    
    // We can't get toAddress easily from our DB because we didn't save it.
    // Let's just hit Zoho API to get the message details using emailMetadata.messageId
    try {
      const folder = msg.emailMetadata.folder;
      const foldersResponse = await axios.get(`https://mail.zoho.com/api/accounts/${accountResponse.data.data[0].accountId}/folders`, {
         headers: { Authorization: `Bearer ${emailAccount.accessToken}` }
      });
      const fMatch = foldersResponse.data.data.find(f => f.folderName === folder);
      
      if (fMatch) {
         const mRes = await axios.get(`https://mail.zoho.com/api/accounts/${accountResponse.data.data[0].accountId}/folders/${fMatch.folderId}/messages/${msg.emailMetadata.messageId}`, {
           headers: { Authorization: `Bearer ${emailAccount.accessToken}` }
         });
         
         const zohoMsg = mRes.data.data;
         const isSent = folder.toLowerCase().includes('sent');
         let ourRaw = isSent ? (zohoMsg.fromAddress || zohoMsg.sender) : (zohoMsg.toAddress || '');
         
         if (ourRaw) {
           ourRaw = ourRaw.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
           const match = ourRaw.match(/<([^>]+)>/);
           let ourEmail = match ? match[1].trim() : ourRaw.split(',')[0].trim();
           
           // fallback to primary if not found in aliases
           if (!aliases.includes(ourEmail)) {
               ourEmail = aliases[0]; // primary
           }
           
           conv.ourEmail = ourEmail;
           await conv.save();
           console.log(`Updated conv ${conv.name} ourEmail to ${ourEmail}`);
         }
      }
    } catch(err) {
      console.log('Error fetching msg:', err.message);
    }
  }
  process.exit(0);
});
