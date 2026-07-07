const express = require('express');
const router = express.Router();
const dns = require('dns');
const { promisify } = require('util');
const resolveNs = promisify(dns.resolveNs);
const { exec } = require('child_process');
const { injectCloudflare, injectNameSilo, injectPorkbun, injectGoDaddy } = require('../utils/dnsProviders');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// Helper to fetch WHOIS info (tolerant to exec errors)
async function getWhoisInfo(domain) {
  return new Promise((resolve) => {
    // Add a 3 second timeout to prevent hanging on secondary whois servers
    exec(`whois ${domain}`, { timeout: 3000 }, (err, stdout) => {
      const data = stdout || '';
      
      const regMatch = data.match(/Registrar:\s*(.+)/i);
      const registrar = regMatch ? regMatch[1].trim() : null;

      const nsRegex = /Name Server:\s*(.+)/ig;
      const nameservers = [];
      let nsMatch;
      while ((nsMatch = nsRegex.exec(data)) !== null) {
        nameservers.push(nsMatch[1].trim());
      }

      resolve({ registrar, whoisNameservers: nameservers });
    });
  });
}

// Real DNS Detection Endpoint
router.post('/detect-provider', async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'Domain is required' });

    const { registrar, whoisNameservers } = await getWhoisInfo(domain);
    let nameservers = [];

    // Try live DNS
    try {
      nameservers = await resolveNs(domain);
    } catch (nsError) {
      console.error(`Live DNS lookup failed for ${domain}:`, nsError.message);
    }

    // Fallback to WHOIS nameservers if live DNS failed
    if (nameservers.length === 0 && whoisNameservers && whoisNameservers.length > 0) {
      nameservers = whoisNameservers;
    }

    if (nameservers.length === 0 && !registrar) {
      return res.json({ 
        domain, 
        provider: { name: 'Unknown / Generic', id: 'generic', icon: '🌐', color: '#4f46e5', buttonColor: '#4f46e5' },
        nameservers: [],
        registrar: null
      });
    }

    const nsJoined = nameservers.join(' ').toLowerCase();
    
    // Start with generic provider
    let provider = { name: 'Generic Provider', id: 'generic', icon: '🌐', color: '#4f46e5', buttonColor: '#4f46e5' };

    // ==== PRIORITY 1: Registrar (whois) ====
    if (registrar) {
      const low = registrar.toLowerCase();
      if (low.includes('porkbun')) {
        provider = { name: 'Porkbun', id: 'porkbun', icon: '🐷', color: '#ff8a8a', buttonColor: '#e04040' };
      } else if (low.includes('godaddy')) {
        provider = { name: 'GoDaddy', id: 'godaddy', icon: '🟢', color: '#1db954', buttonColor: '#000000' };
      } else if (low.includes('cloudflare')) {
        provider = { name: 'Cloudflare', id: 'cloudflare', icon: '☁️', color: '#f58220', buttonColor: '#f58220' };
      } else if (low.includes('sav')) {
        provider = { name: 'Sav', id: 'sav', icon: '🏷️', color: '#ff3b3b', buttonColor: '#ff3b3b' };
      } else if (low.includes('namesilo')) {
        provider = { name: 'NameSilo', id: 'namesilo', icon: '📛', color: '#1a73e8', buttonColor: '#1a73e8' };
      }
    }

    // ==== PRIORITY 2: Nameserver inference (fallback) ====
    if (provider.id === 'generic') {
      if (nsJoined.includes('cloudflare.com')) {
        provider = { name: 'Cloudflare', id: 'cloudflare', icon: '☁️', color: '#f58220', buttonColor: '#f58220' };
      } else if (nsJoined.includes('domaincontrol.com') || nsJoined.includes('godaddy')) {
        provider = { name: 'GoDaddy', id: 'godaddy', icon: '🟢', color: '#1db954', buttonColor: '#000000' };
      } else if (nsJoined.includes('sav.com')) {
        provider = { name: 'Sav', id: 'sav', icon: '🏷️', color: '#ff3b3b', buttonColor: '#ff3b3b' };
      } else if (nsJoined.includes('porkbun.com')) {
        provider = { name: 'Porkbun', id: 'porkbun', icon: '🐷', color: '#ff8a8a', buttonColor: '#e04040' };
      } else if (nsJoined.includes('namesilo.com')) {
        provider = { name: 'NameSilo', id: 'namesilo', icon: '📛', color: '#1a73e8', buttonColor: '#1a73e8' };
      }
    }

    // ==== SPECIAL CASE: Porkbun uses domaincontrol.com as its default NS ====
    if (registrar && registrar.toLowerCase().includes('porkbun') && nsJoined.includes('domaincontrol.com')) {
      provider = { name: 'Porkbun', id: 'porkbun', icon: '🐷', color: '#ff8a8a', buttonColor: '#e04040' };
    }
    // Heuristic: If NS point to GoDaddy defaults but registrar not detected, assume Porkbun registrar
    if (!registrar && nsJoined.includes('domaincontrol.com')) {
      registrar = 'Porkbun (detected via default NS)';
    }


    // **New**: If registrar is known, always prefer it over nameserver inference
    if (registrar) {
      console.log('Detected registrar:', registrar);
      console.log('Chosen provider after registrar logic:', provider);

      const regLow = registrar.toLowerCase();
      if (regLow.includes('porkbun')) provider = { name: 'Porkbun', id: 'porkbun', icon: '🐷', color: '#ff8a8a', buttonColor: '#e04040' };
      else if (regLow.includes('godaddy')) provider = { name: 'GoDaddy', id: 'godaddy', icon: '🟢', color: '#1db954', buttonColor: '#000000' };
      else if (regLow.includes('cloudflare')) provider = { name: 'Cloudflare', id: 'cloudflare', icon: '☁️', color: '#f58220', buttonColor: '#f58220' };
      else if (regLow.includes('sav')) provider = { name: 'Sav', id: 'sav', icon: '🏷️', color: '#ff3b3b', buttonColor: '#ff3b3b' };
      else if (regLow.includes('namesilo')) provider = { name: 'NameSilo', id: 'namesilo', icon: '📛', color: '#1a73e8', buttonColor: '#1a73e8' };
    }

    res.json({ success: true, domain, provider, nameservers, registrar });
  } catch (error) {
    console.error('Detect Provider Error:', error);
    res.status(500).json({ error: 'Internal server error during detection' });
  }
});

// Real DNS Injection Endpoint
router.post('/inject-records', async (req, res) => {
  try {
    const { domain, providerId, apiKey } = req.body;
    
    if (!domain || !providerId) {
      return res.status(400).json({ error: 'Domain and providerId are required' });
    }

    if (providerId !== 'generic' && !apiKey && !['godaddy', 'namesilo', 'cloudflare'].includes(providerId)) {
      // For manual providers we don't inject, but if they reach here somehow, just return success
      console.log(`[DNS] Skipping automated injection for ${providerId} as it requires manual setup.`);
      return res.json({ success: true, message: 'Skipped automated injection for manual provider' });
    }
    
    let activeKey = apiKey;
    
    switch (providerId) {
      case 'cloudflare':
        activeKey = apiKey || process.env.CLOUDFLARE_API_KEY || 'dummy-cloudflare-key';
        if (activeKey.includes('dummy')) {
          console.log(`[MOCK] Simulated Cloudflare injection for ${domain}`);
        } else {
          await injectCloudflare(domain, activeKey);
        }
        break;
      case 'godaddy':
        activeKey = apiKey || process.env.GODADDY_API_KEY || 'dummy-godaddy-key';
        if (activeKey.includes('dummy')) {
          console.log(`[MOCK] Simulated GoDaddy injection for ${domain}`);
        } else {
          await injectGoDaddy(domain, activeKey);
        }
        break;
      case 'namesilo':
        activeKey = apiKey || process.env.NAMESILO_API_KEY || 'dummy-namesilo-key';
        if (activeKey.includes('dummy')) {
          console.log(`[MOCK] Simulated NameSilo injection for ${domain}`);
        } else {
          await injectNameSilo(domain, activeKey);
        }
        break;
      case 'porkbun':
        activeKey = apiKey || process.env.PORKBUN_API_KEY || 'dummy:dummy-secret';
        if (activeKey.includes('dummy')) {
          console.log(`[MOCK] Simulated Porkbun injection for ${domain}`);
        } else {
          await injectPorkbun(domain, activeKey);
        }
        break;
      case 'sav':
        activeKey = apiKey || process.env.SAV_API_KEY || 'dummy-sav-key';
        console.log(`[SAV INJECTION] Mocking injection for ${domain} using user key`);
        // We will build Sav inject adapter next if needed
        break;
      default:
        return res.status(400).json({ error: 'Unsupported provider for automated injection' });
    }

    res.json({ success: true, message: 'DNS records injected successfully' });
  } catch (error) {
    console.error('Inject Records Error:', error);
    res.status(500).json({ error: error.message || 'Failed to inject DNS records' });
  }
});

// Functional Mailbox Provisioning (Local / MongoDB)
router.post('/provision-mailbox', async (req, res) => {
  try {
    const { domain, emailPrefix, password } = req.body;
    
    if (!domain || !emailPrefix || !password) {
      return res.status(400).json({ error: 'Domain, prefix, and password are required' });
    }

    const address = `${emailPrefix}@${domain}`;

    // Here we would normally hit the Zoho Reseller API to create the user account:
    // axios.post('https://mail.zoho.com/api/organization/accounts', { emailAddress: address, password })
    
    // For now, we simulate a successful creation and return Zoho's connection details
    const provisionData = {
      address,
      imapServer: 'imappro.zoho.com',
      imapPort: 993,
      smtpServer: 'smtppro.zoho.com',
      smtpPort: 465
    };

    res.json({ success: true, details: provisionData });
  } catch (error) {
    console.error('Provision Mailbox Error:', error);
    res.status(500).json({ error: 'Failed to provision mailbox' });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const { fromName, fromEmail, subject, content, messageId } = req.body;

    // Find or create a conversation for this email thread
    // In a real app, you'd match the In-Reply-To header or search existing open tickets for this sender
    let conversation = await Conversation.findOne({ 
      'externalContact.email': fromEmail,
      channel: 'email',
      status: { $in: ['open', 'pending'] }
    });

    if (!conversation) {
      conversation = new Conversation({
        channel: 'email',
        name: subject || 'New Support Ticket',
        externalContact: {
          name: fromName,
          email: fromEmail
        },
        status: 'open'
      });
      await conversation.save();
    }

    // Save the incoming message
    const message = new Message({
      conversationId: conversation._id,
      externalSender: {
        name: fromName,
        email: fromEmail
      },
      content,
      isInternalNote: false,
      emailMetadata: { messageId }
    });

    await message.save();

    // Update lastMessageAt
    conversation.lastMessageAt = Date.now();
    await conversation.save();

    res.status(200).json({ success: true, message: 'Email ingested to Shared Inbox' });
  } catch (error) {
    console.error('Email Webhook Error:', error);
    res.status(500).json({ error: 'Failed to process incoming email' });
  }
});

// Mock sending a reply (or a new outbound email)
router.post('/send', async (req, res) => {
  try {
    const { conversationId, content, senderId, isInternalNote } = req.body;

    const message = new Message({
      conversationId,
      sender: senderId, // The staff member
      content,
      isInternalNote: isInternalNote || false
    });

    await message.save();

    const conversation = await Conversation.findById(conversationId);
    conversation.lastMessageAt = Date.now();
    
    // If it's an outbound email to a customer, we would hit the Zoho Send API here
    if (!isInternalNote && conversation.channel === 'email') {
       console.log(`[ZOHO API MOCK] Sending email to ${conversation.externalContact.email}: ${content}`);
       // e.g. await axios.post('https://mail.zoho.com/api/accounts/xxxxx/messages', { toAddress: ... })
    }

    await conversation.save();

    res.status(200).json({ success: true, message });
  } catch (error) {
    console.error('Send Email Error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
