const axios = require('axios');
const EmailAccount = require('../models/EmailAccount');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

async function startZohoSync(emailAccount) {
  if (!emailAccount || !emailAccount.accessToken) {
    console.log('[Zoho API] Missing access token for User:', emailAccount?.user);
    return;
  }

  console.log(`[Zoho API] Sync Engine Started for User: ${emailAccount.user}`);
  
  try {
    // 0. Check if token is expired and refresh if necessary
    if (emailAccount.refreshToken && emailAccount.tokenExpiry && Date.now() + 300000 >= emailAccount.tokenExpiry.getTime()) {
      console.log(`[Zoho API] Token expired or expiring soon for user ${emailAccount.user}. Refreshing...`);
      try {
        const refreshResponse = await axios.post(`https://accounts.zoho.com/oauth/v2/token`, null, {
          params: {
            refresh_token: emailAccount.refreshToken,
            client_id: process.env.ZOHO_CLIENT_ID,
            client_secret: process.env.ZOHO_CLIENT_SECRET,
            grant_type: 'refresh_token'
          }
        });
        
        emailAccount.accessToken = refreshResponse.data.access_token;
        emailAccount.tokenExpiry = new Date(Date.now() + (refreshResponse.data.expires_in * 1000));
        await emailAccount.save();
        console.log(`[Zoho API] Successfully refreshed token for user ${emailAccount.user}`);
      } catch (err) {
        console.error(`[Zoho API] Failed to refresh token:`, err.response?.data || err.message);
        return; // Abort sync if refresh fails
      }
    }

    // 1. Fetch Account ID
    const accountResponse = await axios.get('https://mail.zoho.com/api/accounts', {
      headers: { Authorization: `Bearer ${emailAccount.accessToken}` }
    });
    
    if (!accountResponse.data.data || accountResponse.data.data.length === 0) {
      console.error('[Zoho API] No accounts found for this user.');
      return;
    }
    
    const accountId = accountResponse.data.data[0].accountId;
    const userEmailAddress = accountResponse.data.data[0].primaryEmailAddress;
    
    // 2. Fetch Folders
    let folders = [];
    try {
      const foldersResponse = await axios.get(`https://mail.zoho.com/api/accounts/${accountId}/folders`, {
        headers: { Authorization: `Bearer ${emailAccount.accessToken}` }
      });
      
      if (foldersResponse.data && foldersResponse.data.data) {
        const targetFolderNames = ['inbox', 'sent', 'drafts', 'spam', 'trash', 'deleted'];
        folders = foldersResponse.data.data.filter(f => 
          targetFolderNames.some(t => f.folderName.toLowerCase().includes(t))
        );
      }
    } catch (err) {
      console.warn('[Zoho API] Failed to fetch folders (likely INVALID_OAUTHSCOPE). Falling back to Inbox only.');
      // Fallback: If no folderId is passed to messages/view, it defaults to Inbox.
      folders = [{ folderId: undefined, folderName: 'Inbox' }];
    }

    if (folders.length === 0) {
      console.log('[Zoho API] No target folders found.');
      return;
    }

    // 3. Process each folder
    for (const folder of folders) {
      const isSentFolder = folder.folderName.toLowerCase().includes('sent');
      
      const msgResponse = await axios.get(`https://mail.zoho.com/api/accounts/${accountId}/messages/view`, {
        headers: { Authorization: `Bearer ${emailAccount.accessToken}` },
        params: { limit: 15, folderId: folder.folderId }
      });
      
      const messages = msgResponse.data.data;
      if (!messages || messages.length === 0) continue;

      for (const msg of messages) {
        const msgId = msg.messageId;
        
        // Check if message already exists
        const existingMessage = await Message.findOne({ 'emailMetadata.messageId': msgId });
        if (existingMessage) continue; 
        
        // Clean subject for matching (remove Re:, Fwd:, etc)
        const cleanSubject = msg.subject ? msg.subject.replace(/^(Re|Fwd|Fw|Aw):\s*/i, '').trim() : 'New Email Conversation';

        // Determine external contact
        let rawTo = msg.toAddress || '';
        // Decode HTML entities like &lt; and &gt;
        rawTo = rawTo.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
        let extractedTo = rawTo.match(/<([^>]+)>/) ? rawTo.match(/<([^>]+)>/)[1] : rawTo.split(',')[0];
        
        const contactEmail = isSentFolder ? extractedTo : (msg.fromAddress || msg.sender);
        const contactName = isSentFolder ? extractedTo : msg.sender;

        let ourRawAddress = isSentFolder ? (msg.fromAddress || msg.sender) : (msg.toAddress || '');
        let ourEmail = '';
        if (ourRawAddress) {
           ourRawAddress = ourRawAddress.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
           
           const addresses = ourRawAddress.split(',').map(part => {
             const match = part.match(/<([^>]+)>/);
             return match ? match[1].trim() : part.trim();
           });

           const validAliases = accountResponse.data.data[0].emailAlias || [];
           if (accountResponse.data.data[0].primaryEmailAddress) {
             validAliases.push(accountResponse.data.data[0].primaryEmailAddress);
           }
           if (accountResponse.data.data[0].sendMailDetails) {
             accountResponse.data.data[0].sendMailDetails.forEach(d => validAliases.push(d.fromAddress));
           }

           ourEmail = addresses.find(addr => validAliases.includes(addr)) || addresses[0];
        }

        // Isolate sync to the specific email address this account is configured for
        if (emailAccount.emailAddress && ourEmail && ourEmail !== emailAccount.emailAddress) {
          continue;
        }

        // Find or create Conversation based on External Contact AND Subject
        let conversation = await Conversation.findOne({ 
          channel: 'email',
          provider: 'zoho',
          ourEmail: emailAccount.emailAddress,
          'externalContact.email': contactEmail,
          name: cleanSubject
        });

        const receivedDate = msg.receivedTime ? new Date(parseInt(msg.receivedTime)) : new Date();

        if (!conversation) {
          conversation = await Conversation.create({
            channel: 'email',
            provider: 'zoho',
            ourEmail: emailAccount.emailAddress,
            externalContact: { name: contactName, email: contactEmail },
            assignedTo: emailAccount.user, // Assign to the user who connected this inbox
            status: 'open',
            name: cleanSubject,
            lastMessageAt: receivedDate
          });
        }

        // Fetch Full HTML Content
        let fullContent = msg.summary || msg.subject || 'No content';
        try {
          const contentResponse = await axios.get(`https://mail.zoho.com/api/accounts/${accountId}/folders/${msg.folderId}/messages/${msgId}/content`, {
            headers: { Authorization: `Bearer ${emailAccount.accessToken}` }
          });
          if (contentResponse.data && contentResponse.data.data && contentResponse.data.data.content) {
            fullContent = contentResponse.data.data.content;
          }
        } catch (err) {
          console.error(`[Zoho API] Failed to fetch HTML content for message ${msgId}`);
        }

        const isUnread = msg.status === '0';

        // Save Message
        await Message.create({
          conversationId: conversation._id,
          content: fullContent,
          externalSender: { name: msg.sender, email: msg.sender },
          emailMetadata: { 
            messageId: msgId,
            folder: folder.folderName,
            isRead: !isUnread
          },
          readBy: [],
          createdAt: receivedDate,
          updatedAt: receivedDate
        });

        // Update Conversation timestamp if it's newer
        if (receivedDate > new Date(conversation.lastMessageAt)) {
          conversation.lastMessageAt = receivedDate;
        }
        await conversation.save();
        
        console.log(`[Zoho API] Synced new email in ${folder.folderName} (Subject: ${cleanSubject})`);
      }
    }
    
  } catch (error) {
    console.error(`[Zoho API] Sync error for user ${emailAccount.user}:`, error.response?.data || error.message);
  }
}

async function bootZohoConnections() {
  try {
    const emailAccounts = await EmailAccount.find({ provider: 'zoho', isActive: true });
    for (const emailAccount of emailAccounts) {
      if (emailAccount.accessToken) {
        startZohoSync(emailAccount);
      }
    }
  } catch (err) {
    console.error('[Zoho API] Boot error:', err);
  }
}

function startZohoAutoSync() {
  console.log('[Zoho API] Auto-Sync background task initialized.');
  // Run immediately on boot
  bootZohoConnections();
  // Run every 60 seconds
  setInterval(() => {
    bootZohoConnections();
  }, 60000);
}

async function sendEmail(toAddress, subject, content, fromAddressOverride) {
  const emailAccount = await EmailAccount.findOne({ provider: 'zoho', isActive: true });
  if (!emailAccount || !emailAccount.accessToken) {
    throw new Error('No active Zoho account found for sending email.');
  }

  // Refresh token if needed
  if (emailAccount.refreshToken && emailAccount.tokenExpiry && Date.now() + 300000 >= emailAccount.tokenExpiry.getTime()) {
    const refreshResponse = await axios.post(`https://accounts.zoho.com/oauth/v2/token`, null, {
      params: {
        refresh_token: emailAccount.refreshToken,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        grant_type: 'refresh_token'
      }
    });
    emailAccount.accessToken = refreshResponse.data.access_token;
    emailAccount.tokenExpiry = new Date(Date.now() + (refreshResponse.data.expires_in * 1000));
    await emailAccount.save();
  }

  const accountResponse = await axios.get('https://mail.zoho.com/api/accounts', {
    headers: { Authorization: `Bearer ${emailAccount.accessToken}` }
  });
  const accountId = accountResponse.data.data[0].accountId;
  const primaryFromAddress = accountResponse.data.data[0].primaryEmailAddress;
  
  // Verify the override address is actually a valid send-as alias for this account
  let validatedFromAddress = primaryFromAddress;
  if (fromAddressOverride) {
    const aliases = accountResponse.data.data[0].sendMailDetails.map(d => d.fromAddress);
    if (aliases.includes(fromAddressOverride)) {
      validatedFromAddress = fromAddressOverride;
    } else {
      console.warn(`[Zoho API] Requested fromAddress ${fromAddressOverride} is not a valid alias. Falling back to primary: ${primaryFromAddress}`);
    }
  }

  const mailData = {
    fromAddress: validatedFromAddress,
    toAddress: toAddress,
    subject: subject,
    content: content
  };

  const sendResponse = await axios.post(`https://mail.zoho.com/api/accounts/${accountId}/messages`, mailData, {
    headers: { Authorization: `Bearer ${emailAccount.accessToken}` }
  });

  return sendResponse.data;
}

module.exports = {
  startZohoSync,
  bootZohoConnections,
  startZohoAutoSync,
  sendEmail
};
