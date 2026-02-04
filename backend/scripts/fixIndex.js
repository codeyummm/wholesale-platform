const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected!');
    
    const db = mongoose.connection.db;
    const collection = db.collection('inventories');
    
    // List all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(i => i.name));
    
    // Drop the problematic index
    try {
      await collection.dropIndex('devices.imei_1');
      console.log('✅ Dropped devices.imei_1 index');
    } catch (e) {
      console.log('Index drop result:', e.message);
    }
    
    // Also try to drop any other imei index
    try {
      await collection.dropIndex('imei_1');
      console.log('✅ Dropped imei_1 index');
    } catch (e) {
      console.log('imei_1 index:', e.message);
    }
    
    // List indexes again
    const newIndexes = await collection.indexes();
    console.log('Ins after cleanup:', newIndexes.map(i => i.name));
    
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixIndex();
