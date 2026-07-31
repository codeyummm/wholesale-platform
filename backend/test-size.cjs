const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI);

(async () => {
  try {
    const Listing = require('./models/Listing');
    const docs = await Listing.find().select('-description -images').lean();
    console.log(`Found ${docs.length} docs.`);
    
    let totalSize = 0;
    let maxDocSize = 0;
    for (const d of docs) {
      const size = Buffer.byteLength(JSON.stringify(d));
      totalSize += size;
      if (size > maxDocSize) maxDocSize = size;
    }
    
    console.log(`Total BSON/JSON size: ${(totalSize/1024/1024).toFixed(2)} MB`);
    console.log(`Max doc size: ${(maxDocSize/1024).toFixed(2)} KB`);
    
    // Check if platformDescriptions are large
    let totalPdSize = 0;
    for (const d of docs) {
      if (d.platformDescriptions) totalPdSize += Buffer.byteLength(JSON.stringify(d.platformDescriptions));
    }
    console.log(`Total platformDescriptions size: ${(totalPdSize/1024/1024).toFixed(2)} MB`);
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
