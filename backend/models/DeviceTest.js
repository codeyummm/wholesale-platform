const mongoose = require('mongoose');

const TestResultSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['pending', 'running', 'passed', 'failed', 'skipped', 'manual'],
    default: 'pending'
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const DeviceInfoSchema = new mongoose.Schema({
  userAgent: String,
  platform: String,
  language: String,
  screenWidth: Number,
  screenHeight: Number,
  pixelRatio: Number,
  colorDepth: Number,
  orientation: String,
  touchPoints: Number,
  hardwareConcurrency: Number,
  deviceMemory: mongoose.Schema.Types.Mixed,
  connection: mongoose.Schema.Types.Mixed
}, { _id: false });

const DeviceTestSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: [true, 'Device ID is required'],
    trim: true,
    index: true
  },
  imei: {
    type: String,
    trim: true,
    index: true
  },
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory'
  },
  deviceInfo: {
    type: DeviceInfoSchema,
    required: true
  },
  testResults: {
    touchScreen: TestResultSchema,
    multiTouch: TestResultSchema,
    screenRGB: TestResultSchema,
    proximityScreen: TestResultSchema,
    speaker: TestResultSchema,
    receiver: TestResultSchema,
    earphone: TestResultSchema,
    frontMic: TestResultSchema,
    rearMic: TestResultSchema,
    bottomMic: TestResultSchema,
    rearCamera: TestResultSchema,
    telephotoCamera: TestResultSchema,
    ultraWideCamera: TestResultSchema,
    frontCamera: TestResultSchema,
    flash: TestResultSchema,
    lidarScanner: TestResultSchema,
    accelerometer: TestResultSchema,
    gyroscope: TestResultSchema,
    proximitySensor: TestResultSchema,
    compass: TestResultSchema,
    barometer: TestResultSchema,
    faceID: TestResultSchema,
    faceDetection: TestResultSchema,
    rearFaceDetection: TestResultSchema,
    wifi: TestResultSchema,
    bluetooth: TestResultSchema,
    nfc: TestResultSchema,
    cellularNetwork: TestResultSchema,
    gps: TestResultSchema,
    callFunction: TestResultSchema,
    volumeControl: TestResultSchema,
    sleepWakeButton: TestResultSchema,
    vibration: TestResultSchema,
    chargingPort: TestResultSchema,
    wirelessCharging: TestResultSchema,
    cpu: TestResultSchema,
    memory: TestResultSchema,
    storage: TestResultSchema,
    specification: TestResultSchema
  },
  overallStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'passed', 'failed', 'partial'],
    default: 'pending',
    index: true
  },
  testedBy: {
    type: String,
    trim: true,
    default: 'Anonymous'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },
  summary: {
    totalTests: { type: Number, default: 0 },
    passedTests: { type: Number, default: 0 },
    failedTests: { type: Number, default: 0 },
    skippedTests: { type: Number, default: 0 },
    manualTests: { type: Number, default: 0 },
    passRate: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

DeviceTestSchema.pre('save', function(next) {
  if (this.testResults) {
    const results = Object.values(this.testResults);
    const total = results.filter(r => r && r.status).length;
    const passed = results.filter(r => r && r.status === 'passed').length;
    const failed = results.filter(r => r && r.status === 'failed').length;
    const skipped = results.filter(r => r && r.status === 'skipped').length;
    const manual = results.filter(r => r && r.status === 'manual').length;
    
    this.summary = {
      totalTests: total,
      passedTests: passed,
      failedTests: failed,
      skippedTests: skipped,
      manualTests: manual,
      passRate: total > 0 ? parseFloat(((passed / total) * 100).toFixed(1)) : 0
    };

    if (failed > 0) {
      this.overallStatus = passed > 0 ? 'partial' : 'failed';
    } else if (passed === total && total > 0) {
      this.overallStatus = 'passed';
    } else if (passed > 0) {
      this.overallStatus = 'partial';
    } else {
      this.overallStatus = 'pending';
    }
  }
  next();
});

module.exports = mongoose.model('DeviceTest', DeviceTestSchema);
