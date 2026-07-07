require('dotenv').config();
const mongoose = require('mongoose');
const DeviceTest = require('./models/DeviceTest');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const dt = new DeviceTest({
    deviceInfo: { userAgent: "Test", platform: "Test" },
    testResults: {
      touch: { status: "passed" },
      battery: { status: "failed" },
      camera: { status: "skipped" },
      gyro: { status: "pending" }
    }
  });
  await dt.save();
  const saved = await DeviceTest.findById(dt._id);
  console.log("Keys saved:", Object.keys(saved.testResults));
  await DeviceTest.findByIdAndDelete(dt._id);
  process.exit(0);
});
