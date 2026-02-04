const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndex() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('inventories');
    
    try {
      await collection.dropIndex('devices.imei_1');
      console.log('Dropped devices.imei_1 index');
    } catch (e) {
      console.log('Index may not exist:', e.message);
    }
    
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixIndex();
