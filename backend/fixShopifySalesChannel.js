const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Sale = require('./models/Sale');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    const result = await Sale.updateMany(
      { paymentMethod: 'shopify', salesChannel: 'in_store' },
      { $set: { salesChannel: 'shopify' } }
    );
    console.log('Updated:', result.modifiedCount);
  } catch (err) {
    console.error('Failed:', err.message);
  }
  process.exit(0);
}
run();
