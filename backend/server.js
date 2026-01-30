const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

dotenv.config();
const app = express();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Error:', err));

app.use(express.json());
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Wholesale Platform API', version: '1.0.0' });
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

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
