const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Sale = require('./models/Sale');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    const result = await Sale.deleteMany({ salesChannel: 'shopify' });
    console.log('Deleted:', result.deletedCount);
  } catch (err) {
    console.error('Failed:', err.message);
  }
  process.exit(0);
}
run();
