const express = require('express');
const router = express.Router();
const axios = require('axios');
const Integration = require('../models/Integration');
const { startZohoSync } = require('../services/zohoSyncService');

// 1. Redirect to Zoho Login
router.get('/login', (req, res) => {
  const { userId } = req.query;
  const clientId = process.env.ZOHO_CLIENT_ID;
  const redirectUri = process.env.ZOHO_REDIRECT_URI || 'http://localhost:5000/api/zoho/callback';
  
  if (!clientId) {
    return res.status(500).json({ error: 'ZOHO_CLIENT_ID is not configured in .env' });
  }
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  // Scopes required to read emails, send emails, and read folders
  const scopes = 'ZohoMail.messages.ALL,ZohoMail.accounts.READ,ZohoMail.folders.ALL';
  
  // Pass userId via state parameter
  const authUrl = `https://accounts.zoho.com/oauth/v2/auth?scope=${scopes}&client_id=${clientId}&response_type=code&access_type=offline&redirect_uri=${redirectUri}&prompt=consent&state=${userId}`;
  
  res.redirect(authUrl);
});

// 2. Callback from Zoho
router.get('/callback', async (req, res) => {
  const { code, error, state } = req.query;
  const userId = state;

  if (error) {
    return res.redirect(`http://localhost:5177/settings/email?emailError=${error}`);
  }

  if (!code || !userId) {
    return res.redirect(`http://localhost:5177/settings/email?emailError=No_Code_Or_State_Provided`);
  }

  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const redirectUri = process.env.ZOHO_REDIRECT_URI || 'http://localhost:5000/api/zoho/callback';

  try {
    // Exchange code for tokens
    const response = await axios.post(`https://accounts.zoho.com/oauth/v2/token`, null, {
      params: {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code
      }
    });

    const { access_token, refresh_token, expires_in } = response.data;

    if (!access_token) {
      throw new Error('No access token received');
    }

    // Calculate expiry time
    const tokenExpiry = new Date(Date.now() + (expires_in * 1000));

    // Save tokens temporarily mapping to the user
    const EmailAccount = require('../models/EmailAccount');
    let emailAccount = new EmailAccount({
      user: userId,
      provider: 'zoho',
      accessToken: access_token,
      refreshToken: refresh_token || null,
      tokenExpiry: tokenExpiry,
      isActive: false // Must be finalized by selecting email addresses
    });
    
    await emailAccount.save();

    // Redirect user to frontend settings page to select aliases
    res.redirect(`http://localhost:5177/settings/email?zohoSetup=true&accountId=${emailAccount._id}`);

  } catch (err) {
    console.error('Zoho OAuth Error:', err.response?.data || err.message);
    res.redirect(`http://localhost:5177/settings/email?emailError=OAuth_Failed`);
  }
});

// 3. Fetch Aliases
router.get('/aliases', async (req, res) => {
  const { accountId } = req.query;
  if (!accountId) return res.status(400).json({ success: false, error: 'accountId required' });

  try {
    const EmailAccount = require('../models/EmailAccount');
    const account = await EmailAccount.findById(accountId);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

    const response = await axios.get('https://mail.zoho.com/api/accounts', {
      headers: { Authorization: `Bearer ${account.accessToken}` }
    });

    if (!response.data.data || response.data.data.length === 0) {
      return res.json({ success: true, aliases: [] });
    }

    // Zoho returns primaryEmailAddress and an array of sendMailDetails
    const primaryEmail = response.data.data[0].primaryEmailAddress;
    const aliases = response.data.data[0].sendMailDetails.map(detail => detail.fromAddress);
    // Deduplicate just in case primaryEmail is in sendMailDetails
    const uniqueAliases = [...new Set([primaryEmail, ...aliases])];

    res.json({ success: true, aliases: uniqueAliases });
  } catch (error) {
    console.error('Zoho Aliases Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch aliases' });
  }
});

// 4. Finalize Setup
router.post('/finalize', async (req, res) => {
  const { accountId, selectedEmails } = req.body;
  if (!accountId || !selectedEmails || !selectedEmails.length) {
    return res.status(400).json({ success: false, error: 'accountId and selectedEmails are required' });
  }

  try {
    const EmailAccount = require('../models/EmailAccount');
    const tempAccount = await EmailAccount.findById(accountId);
    if (!tempAccount) return res.status(404).json({ success: false, error: 'Temp account not found' });

    const activeAccounts = [];
    
    // Create an active record for each selected email
    for (const email of selectedEmails) {
      // Check if we already have this email connected
      let existing = await EmailAccount.findOne({ user: tempAccount.user, provider: 'zoho', emailAddress: email });
      if (existing) {
        existing.accessToken = tempAccount.accessToken;
        existing.refreshToken = tempAccount.refreshToken;
        existing.tokenExpiry = tempAccount.tokenExpiry;
        existing.isActive = true;
        await existing.save();
        activeAccounts.push(existing);
      } else {
        const newAccount = new EmailAccount({
          user: tempAccount.user,
          provider: 'zoho',
          emailAddress: email,
          accessToken: tempAccount.accessToken,
          refreshToken: tempAccount.refreshToken,
          tokenExpiry: tempAccount.tokenExpiry,
          isActive: true
        });
        await newAccount.save();
        activeAccounts.push(newAccount);
      }
    }

    // Delete the temp account
    await EmailAccount.findByIdAndDelete(accountId);

    // Start sync engines
    for (const account of activeAccounts) {
      startZohoSync(account);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Zoho Finalize Error:', error);
    res.status(500).json({ success: false, error: 'Failed to finalize setup' });
  }
});

// 5. Check Connection Status
router.get('/status', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  try {
    const EmailAccount = require('../models/EmailAccount');
    const accounts = await EmailAccount.find({ user: userId, provider: 'zoho', isActive: true });
    
    res.json({ success: true, accounts: accounts.map(a => ({ email: a.emailAddress, id: a._id })) });
  } catch (error) {
    console.error('Zoho Status Error:', error);
    res.status(500).json({ success: false, error: 'Failed to check connection status' });
  }
});

// 6. Disconnect Endpoint
router.delete('/disconnect', async (req, res) => {
  const { userId, accountId } = req.query;
  if (!userId || !accountId) {
    return res.status(400).json({ success: false, error: 'User ID and Account ID are required' });
  }

  try {
    const EmailAccount = require('../models/EmailAccount');
    const account = await EmailAccount.findOne({ _id: accountId, user: userId, provider: 'zoho' });
    if (account) {
      account.isActive = false;
      account.accessToken = null;
      account.refreshToken = null;
      await account.save();
    }
    res.json({ success: true, message: 'Zoho disconnected successfully' });
  } catch (err) {
    console.error('Zoho Disconnect Error:', err);
    res.status(500).json({ success: false, error: 'Failed to disconnect Zoho' });
  }
});

module.exports = router;
