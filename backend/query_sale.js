const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Sale = require('./models/Sale');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(await Sale.findOne({ _id: '6a172f3c039edf1e690a4bd2' }));
  process.exit(0);
}
run();
