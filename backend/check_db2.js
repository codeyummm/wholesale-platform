require('dotenv').config();
const mongoose = require('mongoose');
const DeviceTest = require('./models/DeviceTest');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const tests = await DeviceTest.find().sort({ createdAt: -1 }).limit(1);
  console.log("Keys:", Object.keys(tests[0].testResults));
  console.log("Data:", JSON.stringify(tests[0].testResults, null, 2));
  process.exit(0);
});
