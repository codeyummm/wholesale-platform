const express = require('express');
const router = express.Router();
const Integration = require('../models/Integration');
const imaps = require('imap-simple');
const { startImapSync } = require('../services/imapSyncService');

// Connect existing mailbox via IMAP
router.post('/connect', async (req, res) => {
  try {
    const { emailAddress, password, providerId } = req.body;

    if (!emailAddress || !password) {
      return res.status(400).json({ error: 'Email address and App Password are required' });
    }

    // Default to Zoho if providerId isn't specified but we can support others later
    const imapHost = 'imap.zoho.com';
    const imapPort = 993;
    const smtpHost = 'smtp.zoho.com';
    const smtpPort = 465;

    // 1. Verify credentials by doing a dry-run IMAP connection
    const config = {
      imap: {
        user: emailAddress,
        password: password,
        host: imapHost,
        port: imapPort,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000
      }
    };

    let connection;
    try {
      connection = await imaps.connect(config);
      connection.end();
    } catch (err) {
      console.error('IMAP Verification Error:', err);
      return res.status(400).json({ error: 'Invalid Email Address or App Password. Please check your credentials and try again.' });
    }

    // 2. Save to Integration model
    let integration = await Integration.findOne({ platform: 'zohomail' });
    if (!integration) {
      integration = new Integration({ platform: 'zohomail' });
    }

    integration.isConnected = true;
    integration.credentials = {
      ...integration.credentials,
      emailAddress,
      password, // In a production app, encrypt this before saving
      imapHost,
      imapPort,
      smtpHost,
      smtpPort
    };

    await integration.save();

    // 3. Start the background sync service here
    startImapSync(integration);

    res.json({ success: true, message: 'Mailbox connected successfully!' });

  } catch (error) {
    console.error('IMAP Connect Route Error:', error);
    res.status(500).json({ error: 'Internal server error while connecting mailbox' });
  }
});

// Check if a mailbox is connected
router.get('/status', async (req, res) => {
  try {
    const integration = await Integration.findOne({ platform: 'zohomail' });
    if (integration && integration.isConnected && integration.credentials?.emailAddress) {
      res.json({
        connected: true,
        emailAddress: integration.credentials.emailAddress
      });
    } else {
      res.json({ connected: false });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to check status' });
  }
});

module.exports = router;
