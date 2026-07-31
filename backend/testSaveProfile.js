require('dotenv').config();
const mongoose = require('mongoose');
const EbayProfile = require('./models/EbayProfile');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    
    const configuration = {
      paymentMethods: [{ paymentMethodType: 'PAYPAL', recipientAccountReference: { referenceId: 'test@paypal.com' } }]
    };
    
    const profile = new EbayProfile({ 
        name: 'test', 
        type: 'PAYMENT', 
        description: '', 
        ebayPolicyId: 'mock123', 
        configuration 
    });
    
    await profile.save();
    console.log("Saved successfully!");
  } catch (err) {
    console.error("Error saving:", err.message);
  }
  process.exit(0);
}
test();
