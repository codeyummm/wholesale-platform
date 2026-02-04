const express = require('express');
const router = express.Router();
const DeviceTest = require('../models/DeviceTest');
const { protect } = require('../middleware/auth');

// @route   POST /api/device-tests
// @desc    Save a new device test result
router.post('/', async (req, res) => {
  try {
    const { deviceId, imei, inventoryId, deviceInfo, testResults, testedBy, notes } = req.body;

    const deviceTest = new DeviceTest({
      deviceId,
      imei,
      inventoryId,
      deviceInfo,
      testResults,
      testedBy,
      notes
    });

    const savedTest = await deviceTest.save();
    res.status(201).json({
      success: true,
      data: savedTest,
      message: 'Device test saved successfully'
    });
  } catch (error) {
    console.error('Error saving device test:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while saving device test'
    });
  }
});

// @route   GET /api/device-tests
// @desc    Get all device tests with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search;

    let query = {};
    
    if (status && status !== 'all') {
      query.overallStatus = status;
    }
    
    if (search) {
      query.$or = [
        { deviceId: { $regex: search, $options: 'i' } },
        { imei: { $regex: search, $options: 'i' } },
        { testedBy: { $regex: search, $options: 'i' } }
      ];
    }

    const tests = await DeviceTest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await DeviceTest.countDocuments(query);

    res.json({
      success: true,
      data: tests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Error fetching device tests:', error);
    res.status(500).json({ success: false, error: 'Server error while fetching device tests' });
  }
});

// @route   GET /api/device-tests/stats/summary
// @desc    Get summary statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await DeviceTest.aggregate([
      { $group: { _id: '$overallStatus', count: { $sum: 1 } } }
    ]);

    const totalTests = await DeviceTest.countDocuments();
    const recentTests = await DeviceTest.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('deviceId imei overallStatus createdAt summary');

    const passedCount = stats.find(s => s._id === 'passed')?.count || 0;
    const passRate = totalTests > 0 ? ((passedCount / totalTests) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: { statusBreakdown: stats, totalTests, passRate: parseFloat(passRate), recentTests }
    });
  } catch (error) {
    console.error('Error fetching test stats:', error);
    res.status(500).json({ success: false, error: 'Server error while fetching statistics' });
  }
});

// @route   GET /api/device-tests/imei/:imei
// @desc    Get tests for a specific IMEI
router.get('/imei/:imei', async (req, res) => {
  try {
    const tests = await DeviceTest.find({ imei: req.params.imei }).sort({ createdAt: -1 });
    res.json({ success: true, data: tests, count: tests.length });
  } catch (error) {
    console.error('Error fetching device tests:', error);
    res.status(500).json({ success: false, error: 'Server error while fetching device tests' });
  }
});

// @route   GET /api/device-tests/:id
// @desc    Get a single device test by ID
router.get('/:id', async (req, res) => {
  try {
    const deviceTest = await DeviceTest.findById(req.params.id);
    if (!deviceTest) {
      return res.status(404).json({ success: false, error: 'Device test not found' });
    }
    res.json({ success: true, data: deviceTest });
  } catch (error) {
    console.error('Error fetching device test:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, error: 'Device test not found' });
    }
    res.status(500).json({ success: false, error: 'Server error while fetching device test' });
  }
});

// @route   PUT /api/device-tests/:id
// @desc    Update a device test
router.put('/:id', async (req, res) => {
  try {
    const { testResults, overallStatus, notes } = req.body;
    const updateData = { updatedAt: Date.now() };

    if (testResults) updateData.testResults = testResults;
    if (overallStatus) updateData.overallStatus = overallStatus;
    if (notes !== undefined) updateData.notes = notes;

    const deviceTest = await DeviceTest.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!deviceTest) {
      return res.status(404).json({ success: false, error: 'Device test not found' });
    }

    res.json({ success: true, data: deviceTest, message: 'Device test updated successfully' });
  } catch (error) {
    console.error('Error updating device test:', error);
    res.status(500).json({ success: false, error: 'Server error while updating device test' });
  }
});

// @route   DELETE /api/device-tests/:id
// @desc    Delete a device test
router.delete('/:id', async (req, res) => {
  try {
    const deviceTest = await DeviceTest.findByIdAndDelete(req.params.id);
    if (!deviceTest) {
      return res.status(404).json({ success: false, error: 'Device test not found' });
    }
    res.json({ success: true, message: 'Device test deleted successfully' });
  } catch (error) {
    console.error('Error deleting device test:', error);
    res.status(500).json({ success: false, error: 'Server error while deleting device test' });
  }
});

module.exports = router;
