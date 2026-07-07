require('dotenv').config();
const mongoose = require('mongoose');
const Inventory = require('./models/Inventory');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const result = await Inventory.updateOne(
    { _id: '6a21195200d9daf2e7e8610e' },
    { 
      $set: { 
        quantity: 1,
        'price.retail': 610
      }
    }
  );
  console.log("Database update result:", result);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
