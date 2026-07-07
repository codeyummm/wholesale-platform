const { google } = require('googleapis');
const EmailAccount = require('../models/EmailAccount');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/google/callback'
);

async function refreshGoogleToken(account) {
  if (!account.refreshToken) {
    throw new Error('No refresh token available');
  }

  oauth2Client.setCredentials({
    refresh_token: account.refreshToken
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  account.accessToken = credentials.access_token;
  if (credentials.refresh_token) {
    account.refreshToken = credentials.refresh_token;
  }
  const expiryDate = credentials.expiry_date ? new Date(credentials.expiry_date) : new Date(Date.now() + 3600000);
  account.expiresAt = expiryDate;
  await account.save();
  return credentials.access_token;
}

async function getValidAuth(account) {
  if (account.expiresAt && account.expiresAt < new Date()) {
    console.log(`[Google API] Token expired for user ${account.user}. Refreshing...`);
    await refreshGoogleToken(account);
  }
  oauth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken
  });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function parseHeader(headers, name) {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : '';
}

function decodeBase64Url(str) {
  if (!str) return '';
  return Buffer.from(str, 'base64url').toString('utf-8');
}

function extractBody(payload) {
  let body = '';
  if (payload.body && payload.body.size > 0) {
    body = decodeBase64Url(payload.body.data);
  } else if (payload.parts) {
    // Look for HTML part first
    const htmlPart = payload.parts.find(part => part.mimeType === 'text/html');
    if (htmlPart && htmlPart.body && htmlPart.body.data) {
      body = decodeBase64Url(htmlPart.body.data);
    } else {
      // Fallback to text/plain
      const textPart = payload.parts.find(part => part.mimeType === 'text/plain');
      if (textPart && textPart.body && textPart.body.data) {
        body = decodeBase64Url(textPart.body.data);
      }
    }
  }
  return body;
}

async function fetchAndSaveGmailMessages(account) {
  try {
    const gmail = await getValidAuth(account);
    const lastSyncTime = Math.floor(account.lastSync.getTime() / 1000) - 86400; // Look back 24 hours to be safe
    
    // Search for recent messages in all relevant labels
    const q = `after:${lastSyncTime}`;
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: q,
      maxResults: 50 // Limit to avoid hitting rate limits on massive accounts
    });

    const messages = res.data.messages;
    if (!messages || messages.length === 0) {
      return;
    }

    // Process each message
    for (const msg of messages) {
      // Check if message already exists
      const existingMessage = await Message.findOne({ 'emailMetadata.messageId': msg.id });
      if (existingMessage) continue;

      // Fetch full message details
      const detailRes = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full'
      });
      const data = detailRes.data;

      const headers = data.payload.headers;
      const subject = parseHeader(headers, 'Subject') || 'No Subject';
      const from = parseHeader(headers, 'From');
      const to = parseHeader(headers, 'To');
      const dateStr = parseHeader(headers, 'Date');
      const receivedAt = dateStr ? new Date(dateStr) : new Date(parseInt(data.internalDate));

      const bodyHtml = extractBody(data.payload) || '(Empty Body)';
      const isSent = data.labelIds.includes('SENT');
      
      let folder = 'inbox';
      if (isSent) folder = 'sent';
      else if (data.labelIds.includes('DRAFT')) folder = 'drafts';
      else if (data.labelIds.includes('TRASH')) folder = 'trash';
      else if (data.labelIds.includes('SPAM')) folder = 'spam';

      // 1. Group into Conversation (threadId from Gmail maps well)
      // Extract raw email from format "Name <email@domain.com>" or just "email@domain.com"
      const rawContact = isSent ? to : from;
      let extractedEmail = rawContact;
      let extractedName = rawContact;
      if (rawContact && rawContact.includes('<')) {
        const match = rawContact.match(/(.*?)\s*<([^>]+)>/);
        if (match) {
          extractedName = match[1].replace(/"/g, '').trim() || match[2];
          extractedEmail = match[2];
        }
      }

      const cleanSubject = subject ? subject.replace(/^(Re|Fwd|Fw|Aw):\s*/i, '').trim() : 'New Email Conversation';

      let conversation = await Conversation.findOne({ 
        channel: 'email',
        provider: 'gmail', 
        ourEmail: account.emailAddress,
        'externalContact.email': extractedEmail,
        name: cleanSubject
      });

      if (!conversation) {
        conversation = new Conversation({
          channel: 'email',
          provider: 'gmail',
          ourEmail: account.emailAddress,
          name: cleanSubject,
          externalContact: { name: extractedName, email: extractedEmail },
          assignedTo: account.user,
          status: 'open',
          lastMessageAt: receivedAt
        });
        await conversation.save();
      } else {
        // Update lastMessageAt if newer
        if (receivedAt > conversation.lastMessageAt) {
          conversation.lastMessageAt = receivedAt;
          await conversation.save();
        }
      }

      // 2. Save Message
      const newMessage = new Message({
        conversationId: conversation._id,
        externalSender: {
          email: from,
          name: from.split('<')[0].trim() || 'Unknown'
        },
        content: bodyHtml || '(Empty)',
        emailMetadata: {
          messageId: data.id,
          folder: folder,
          isRead: !data.labelIds.includes('UNREAD')
        }
      });

      // Override createdAt to match the email's received date
      newMessage.createdAt = receivedAt;

      await newMessage.save();
    }

    // Update last sync time
    account.lastSync = new Date();
    await account.save();

  } catch (error) {
    if (error.response && error.response.data) {
      console.error(`[Gmail API] Sync Error for user ${account.user}:`, JSON.stringify(error.response.data));
    } else {
      console.error(`[Gmail API] Sync Error for user ${account.user}:`, error.message);
    }
  }
}

// Background Cron Wrapper
async function startGmailAutoSync() {
  console.log('[Gmail API] Auto-Sync background task initialized.');
  setInterval(async () => {
    try {
      const activeAccounts = await EmailAccount.find({ provider: 'gmail', isActive: true });
      for (const account of activeAccounts) {
        await fetchAndSaveGmailMessages(account);
      }
    } catch (err) {
      console.error('[Gmail API] Auto-Sync cycle failed:', err);
    }
  }, 60000); // 60 seconds
}

// Outgoing Mail Service
async function sendGmail(accountId, to, subject, bodyHtml) {
  const account = await EmailAccount.findById(accountId);
  if (!account || account.provider !== 'gmail') {
    throw new Error('Invalid Gmail account');
  }

  const gmail = await getValidAuth(account);

  // Construct RFC 2822 email
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    bodyHtml
  ];
  const message = messageParts.join('\n');
  const encodedMessage = Buffer.from(message)
    .toString('base64url');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage
    }
  });

  return res.data;
}

module.exports = { startGmailAutoSync, fetchAndSaveGmailMessages, sendGmail };
