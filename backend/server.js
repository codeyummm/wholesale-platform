const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { startZohoAutoSync } = require('./services/zohoSyncService');
const { startGmailAutoSync } = require('./services/gmailSyncService');

const app = express();

const { startAutoSync } = require('./utils/imeiAutoSync');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected');
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('inventories');
      await collection.dropIndex('devices.imei_1');
      console.log('✅ Dropped devices.imei_1 index');
    } catch (e) {
      console.log('Index check:', e.message);
    }
    
    // Boot up Zoho connections auto-sync
    startZohoAutoSync();
    
    // Boot up Gmail OAuth connections auto-sync
    startGmailAutoSync();
    
    // Start background sync tasks
    startAutoSync();
  })
  .catch(err => console.error('❌ MongoDB Error:', err));

app.use(express.json({ limit: '10mb' }));
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(helmet({ crossOriginResourcePolicy: false })); // allow images to load cross-origin

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin === 'https://wholesale-platform-vert.vercel.app') {
      return callback(null, true);
    }
    if (origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    callback(null, true); // Allow all in dev
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Safari CORS headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Wholesale Platform API', 
    version: '3.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/suppliers', require('./routes/supplier'));
app.use('/api/invoices', require('./routes/invoice'));
app.use('/api/device-tests', require('./routes/deviceTest'));
app.use('/api/customers', require('./routes/customer'));
app.use('/api/sales', require('./routes/sale'));
app.use('/api/profit-loss', require('./routes/profitLoss'));
app.use('/api/sale-scanner', require('./routes/saleScanner'));
app.use('/api/imei', require('./routes/imeiLookup'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/ebay', require('./routes/ebay'));
app.use('/api/etsy', require('./routes/etsy'));
app.use('/api/shopify', require('./routes/shopify'));
app.use('/api/users', require('./routes/user'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/imeilab', require('./routes/imeiLab'));
app.use('/api/shipping', require('./routes/shipping'));
app.use('/api/agent', require('./routes/agent'));
app.use('/api/tiktok', require('./routes/tiktok'));
app.use('/api/whatnot', require('./routes/whatnot'));
app.use('/api/groupon', require('./routes/groupon'));
app.use('/api/poshmark', require('./routes/poshmark'));
app.use('/api/mercari', require('./routes/mercari'));
app.use('/api/messages', require('./routes/message'));
app.use('/api/conversations/meta', require('./routes/conversationMeta'));
app.use('/api/email', require('./routes/email'));
app.use('/api/zoho', require('./routes/zohoAuth'));
app.use('/api/google', require('./routes/googleAuth'));
app.use('/api/ai', require('./routes/ai'));
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
// Updated for carrier fix
