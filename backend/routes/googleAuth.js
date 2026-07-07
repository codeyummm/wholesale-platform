const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const EmailAccount = require('../models/EmailAccount');
const { startGmailAutoSync } = require('../services/gmailSyncService');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/google/callback'
);

// 1. Redirect to Google Consent Screen
router.get('/login', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).send('userId is required');
  }

  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required to get a refresh_token
    prompt: 'consent', // Force consent to guarantee refresh_token
    scope: scopes,
    state: userId // Pass userId in state to retrieve it in callback
  });

  res.redirect(url);
});

// 2. Google OAuth Callback
router.get('/callback', async (req, res) => {
  const { code, state: userId, error } = req.query;

  if (error) {
    return res.status(400).send(`Google Login Failed: ${error}`);
  }
  if (!code || !userId) {
    return res.status(400).send('Missing code or userId');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get the user's email address
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const emailAddress = userInfo.data.email;

    // Save tokens in database
    let emailAccount = await EmailAccount.findOne({ user: userId, provider: 'gmail', emailAddress });
    if (!emailAccount) {
      emailAccount = new EmailAccount({ user: userId, provider: 'gmail', emailAddress });
    }

    emailAccount.accessToken = tokens.access_token;
    if (tokens.refresh_token) {
      emailAccount.refreshToken = tokens.refresh_token;
    }
    // Set expiry if provided, default to +1 hr
    const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600000);
    emailAccount.expiresAt = expiryDate;
    emailAccount.isActive = true;
    emailAccount.lastSync = new Date();

    await emailAccount.save();

    // Trigger initial background sync
    startGmailAutoSync(emailAccount);

    // Redirect back to the frontend settings page
    res.redirect('http://localhost:5177/settings/email?emailConnected=true');
  } catch (err) {
    console.error('Google OAuth Callback Error:', err);
    res.status(500).send('Authentication Failed');
  }
});

// 3. Status Endpoint for Frontend
router.get('/status', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  try {
    const accounts = await EmailAccount.find({ user: userId, provider: 'gmail', isActive: true });
    res.json({ success: true, accounts: accounts.map(a => ({ email: a.emailAddress, id: a._id })) });
  } catch (err) {
    console.error('Google Status Error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch status' });
  }
});

// 4. Disconnect Endpoint
router.delete('/disconnect', async (req, res) => {
  const { userId, accountId } = req.query;
  if (!userId || !accountId) {
    return res.status(400).json({ success: false, error: 'User ID and Account ID are required' });
  }

  try {
    const account = await EmailAccount.findOne({ _id: accountId, user: userId, provider: 'gmail' });
    if (account) {
      account.isActive = false;
      account.accessToken = null;
      account.refreshToken = null;
      await account.save();
    }
    res.json({ success: true, message: 'Gmail disconnected successfully' });
  } catch (err) {
    console.error('Google Disconnect Error:', err);
    res.status(500).json({ success: false, error: 'Failed to disconnect Gmail' });
  }
});

module.exports = router;
