const Customer = require('../models/Customer');
const Sale = require('../models/Sale');

exports.getCustomers = async (req, res) => {
  try {
    const { search, type } = req.query;
    const query = {};

    if (search) {
      // Find matching sales by order number or IMEI
      const salesMatches = await Sale.find({
        $or: [
          { saleNumber: { $regex: search, $options: 'i' } },
          { 'items.imei': { $regex: search, $options: 'i' } }
        ]
      }).select('customer');
      
      const saleCustomerIds = salesMatches.map(s => s.customer).filter(Boolean);

      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { 'contact.email': { $regex: search, $options: 'i' } },
        { 'contact.phone': { $regex: search, $options: 'i' } },
        { $expr: { $regexMatch: { input: { $toString: "$_id" }, regex: search, options: "i" } } }
      ];

      if (saleCustomerIds.length > 0) {
        query.$or.push({ _id: { $in: saleCustomerIds } });
      }
    }
    if (type) query.type = type;

    const customers = await Customer.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
