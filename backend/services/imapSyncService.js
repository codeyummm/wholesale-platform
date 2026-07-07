const imaps = require('imap-simple');
const simpleParser = require('mailparser').simpleParser;
const Integration = require('../models/Integration');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

let activeConnections = {};

async function startImapSync(integration) {
  if (!integration || !integration.credentials) return;
  const { emailAddress, password, imapHost, imapPort } = integration.credentials;

  const config = {
    imap: {
      user: emailAddress,
      password: password,
      host: imapHost,
      port: imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000
    },
    onmail: function (numNewMail) {
      console.log(`[IMAP] ${numNewMail} new mail arrived for ${emailAddress}`);
      fetchNewEmails(emailAddress);
    }
  };

  try {
    // If already connected, close it first
    if (activeConnections[emailAddress]) {
      activeConnections[emailAddress].end();
    }

    const connection = await imaps.connect(config);
    activeConnections[emailAddress] = connection;
    
    await connection.openBox('INBOX');
    console.log(`[IMAP] Connected and listening to INBOX for ${emailAddress}`);

    // Initial fetch of unread emails
    await fetchNewEmails(emailAddress);

  } catch (err) {
    console.error(`[IMAP] Failed to connect for ${emailAddress}:`, err);
  }
}

async function fetchNewEmails(emailAddress) {
  const connection = activeConnections[emailAddress];
  if (!connection) return;

  try {
    const searchCriteria = ['UNSEEN'];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: true
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    
    for (const item of messages) {
      const allParts = item.parts.find(part => part.which === '');
      const id = item.attributes.uid;
      const idHeader = "Imap-Uid: " + id + "\r\n";
      
      const parsed = await simpleParser(idHeader + allParts.body);
      
      await processIncomingEmail(parsed, emailAddress);
    }
  } catch (err) {
    console.error(`[IMAP] Error fetching emails for ${emailAddress}:`, err);
  }
}

async function processIncomingEmail(parsed, accountEmail) {
  try {
    const fromAddress = parsed.from.value[0].address;
    const fromName = parsed.from.value[0].name || fromAddress;
    const subject = parsed.subject || '(No Subject)';
    const textContent = parsed.text || parsed.html || '(No Content)';
    const messageId = parsed.messageId;

    // Skip emails from ourselves (sent items if they land in inbox)
    if (fromAddress.toLowerCase() === accountEmail.toLowerCase()) return;

    // 1. Find or create conversation
    // In a real app, you'd match the In-Reply-To header to an existing message
    // For now, group by sender email for simplicity, or subject
    let conversation = await Conversation.findOne({
      platform: 'email',
      'customer.email': fromAddress
    });

    if (!conversation) {
      conversation = new Conversation({
        platform: 'email',
        customer: {
          name: fromName,
          email: fromAddress
        },
        subject: subject,
        status: 'open',
        unreadCount: 1,
        lastMessageAt: new Date(),
        lastMessagePreview: textContent.substring(0, 100)
      });
    } else {
      conversation.unreadCount += 1;
      conversation.lastMessageAt = new Date();
      conversation.lastMessagePreview = textContent.substring(0, 100);
      conversation.subject = subject; // Update to latest subject
    }

    await conversation.save();

    // 2. Save the message
    const message = new Message({
      conversationId: conversation._id,
      externalSender: {
        name: fromName,
        email: fromAddress
      },
      content: textContent,
      emailMetadata: {
        messageId: messageId,
        inReplyTo: parsed.inReplyTo || ''
      }
    });

    await message.save();
    console.log(`[IMAP] Saved new email message from ${fromAddress}`);

  } catch (err) {
    console.error(`[IMAP] Error processing email:`, err);
  }
}

// Function to start all configured integrations on server boot
async function bootImapConnections() {
  try {
    const integrations = await Integration.find({ platform: 'zohomail', isConnected: true });
    for (const integration of integrations) {
      if (integration.credentials && integration.credentials.emailAddress) {
        startImapSync(integration);
      }
    }
  } catch (err) {
    console.error('[IMAP] Boot error:', err);
  }
}

module.exports = {
  startImapSync,
  bootImapConnections
};
