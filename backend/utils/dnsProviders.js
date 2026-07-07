const axios = require('axios');

// Zoho Mail Required Records
const ZOHO_RECORDS = [
  { type: 'MX', name: '@', content: 'mx.zoho.com', priority: 10 },
  { type: 'MX', name: '@', content: 'mx2.zoho.com', priority: 20 },
  { type: 'MX', name: '@', content: 'mx3.zoho.com', priority: 50 },
  { type: 'TXT', name: '@', content: 'v=spf1 include:zoho.com ~all' },
  { type: 'TXT', name: 'zmail._domainkey', content: 'v=DKIM1; k=rsa; p=YOUR_ZOHO_DKIM_KEY_HERE' }
];

async function injectCloudflare(domain, apiKey) {
  // Cloudflare expects Bearer Token
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Get Zone ID
    const zoneRes = await axios.get(`https://api.cloudflare.com/client/v4/zones?name=${domain}`, { headers });
    if (!zoneRes.data.success || zoneRes.data.result.length === 0) {
      throw new Error('Domain not found in this Cloudflare account');
    }
    const zoneId = zoneRes.data.result[0].id;

    // 2. Inject Records
    for (const record of ZOHO_RECORDS) {
      await axios.post(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
        type: record.type,
        name: record.name === '@' ? domain : `${record.name}.${domain}`,
        content: record.content,
        priority: record.priority,
        proxied: false
      }, { headers }).catch(err => {
        // Ignore if record already exists
        if (err.response?.data?.errors?.[0]?.code !== 81057) {
          console.error('Cloudflare Record Error:', err.response?.data || err.message);
        }
      });
    }
    return true;
  } catch (error) {
    console.error('Cloudflare Injection Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.message || error.message);
  }
}

async function injectNameSilo(domain, apiKey) {
  // NameSilo uses query params and XML, but has a JSON wrapper: &type=xml|json
  try {
    for (const record of ZOHO_RECORDS) {
      const url = `https://www.namesilo.com/api/dnsAddRecord?version=1&type=json&key=${apiKey}&domain=${domain}&rrtype=${record.type}&rrhost=${record.name === '@' ? '' : record.name}&rrvalue=${encodeURIComponent(record.content)}${record.priority ? `&rrdistance=${record.priority}` : ''}`;
      const res = await axios.get(url);
      if (res.data.reply && res.data.reply.code !== '300' && res.data.reply.code !== '280') { 
        // 300 is success, 280 is record already exists
        throw new Error(res.data.reply.detail || 'NameSilo API Error');
      }
    }
    return true;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function injectPorkbun(domain, apiKey) {
  // Porkbun requires API Key and Secret Key in body. For simplicity, we assume the user pasted "apiKey:secretKey"
  const [key, secret] = apiKey.split(':');
  if (!key || !secret) {
    throw new Error('Porkbun requires API Key and Secret Key formatted as "apiKey:secretKey"');
  }

  try {
    for (const record of ZOHO_RECORDS) {
      await axios.post(`https://porkbun.com/api/json/v3/dns/create/${domain}`, {
        apikey: key,
        secretapikey: secret,
        name: record.name === '@' ? '' : record.name,
        type: record.type,
        content: record.content,
        prio: record.priority ? record.priority.toString() : undefined
      }).catch(err => {
        if (!err.response?.data?.message?.includes('already exists')) {
          console.error('Porkbun Record Error:', err.response?.data || err.message);
        }
      });
    }
    return true;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message);
  }
}

async function injectGoDaddy(domain, apiKey) {
  // GoDaddy expects "sso-key api_key:api_secret"
  const headers = {
    'Authorization': `sso-key ${apiKey}`,
    'Content-Type': 'application/json'
  };

  // GoDaddy uses a single PUT / PATCH to update records by type.
  // We'll format the records for GoDaddy's schema
  const records = ZOHO_RECORDS.map(r => ({
    data: r.content,
    name: r.name,
    ttl: 3600,
    type: r.type,
    priority: r.priority
  }));

  try {
    await axios.patch(`https://api.godaddy.com/v1/domains/${domain}/records`, records, { headers });
    return true;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message);
  }
}

module.exports = {
  injectCloudflare,
  injectNameSilo,
  injectPorkbun,
  injectGoDaddy
};
