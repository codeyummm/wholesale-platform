const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
dotenv.config();
const app = express();

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
  })
  .catch(err => console.error('❌ MongoDB Error:', err));

app.use(express.json({ limit: '10mb' }));
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Wholesale Platform API', version: '3.0.0' });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/suppliers', require('./routes/supplier'));
app.use('/api/invoices', require('./routes/invoice'));
app.use('/api/device-tests', require('./routes/deviceTest'));
app.use('/api/customers', require('./routes/customer'));
app.use('/api/sales', require('./routes/sale'));
app.use('/api/imei', require('./routes/imeiLookup'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/users', require('./routes/user'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('🚀 Server running on port ' + PORT);
});
