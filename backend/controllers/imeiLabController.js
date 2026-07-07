const DhruFusionAPI = require('../utils/dhruApi');
const ImeiOrder = require('../models/ImeiOrder');

// We will load these from environment variables. 
// If they change, the user just updates the .env file.
const getClient = () => {
  const url = process.env.IMEI_API_URL || 'https://www.imeifree.com/api/index.php';
  const username = process.env.IMEI_API_USERNAME || 'Deep1920';
  const apiKey = process.env.IMEI_API_KEY || 'OVFPQ29-HP9Q902-CQWW1KP-5TKAQWE';
  return new DhruFusionAPI(url, username, apiKey);
};

exports.getAccountInfo = async (req, res) => {
  try {
    const api = getClient();
    const data = await api.action('accountinfo');
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getServiceList = async (req, res) => {
  try {
    const api = getClient();
    const data = await api.action('imeiservicelist');
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.placeOrder = async (req, res) => {
  try {
    const api = getClient();
    const { ID, IMEI, cost, serviceName } = req.body;
    
    // API Call
    const data = await api.action('placeimeiorder', { ID, IMEI });
    
    if (data && data.SUCCESS && data.SUCCESS[0] && data.SUCCESS[0].ORDERID) {
      // Save to database
      const newOrder = new ImeiOrder({
        apiOrderId: data.SUCCESS[0].ORDERID.toString(),
        referenceId: data.SUCCESS[0].REFERENCEID || '',
        imei: IMEI,
        serviceId: ID,
        serviceName: serviceName || 'Unknown Service',
        cost: cost || 0,
        status: 'Pending',
        apiResponse: data.SUCCESS[0]
      });
      await newOrder.save();
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOrderStatus = async (req, res) => {
  try {
    const api = getClient();
    const { id } = req.params;
    const data = await api.action('getimeiorder', { ID: id });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await ImeiOrder.find().sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.syncOrder = async (req, res) => {
  try {
    const { id } = req.params; // MongoDB ID
    const order = await ImeiOrder.findById(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const api = getClient();
    // Dhru API getimeiorder usually expects the REFERENCEID from place order.
    const apiId = order.referenceId || order.apiOrderId;
    const data = await api.action('getimeiorder', { ID: apiId });
    
    if (data && data.SUCCESS && data.SUCCESS[0]) {
      const apiResult = data.SUCCESS[0];
      const apiStatus = apiResult.STATUS;
      
      let newStatus = order.status;
      // Dhru Fusion status codes: 0=Pending, 1=In Process, 2=Rejected, 3=Canceled, 4=Success
      if (apiStatus !== undefined) {
         if (apiStatus == 0) newStatus = 'Pending';
         else if (apiStatus == 1) newStatus = 'In Process';
         else if (apiStatus == 2) newStatus = 'Rejected';
         else if (apiStatus == 3) newStatus = 'Canceled';
         else if (apiStatus == 4) newStatus = 'Success';
      }
      
      order.status = newStatus;
      order.apiResponse = { ...order.apiResponse, ...apiResult };
      await order.save();

      // If Success, parse IMEI2 and Serial Number and update Inventory
      if (newStatus === 'Success' && order.apiResponse.CODE) {
        const codeText = order.apiResponse.CODE;
        let imei1 = null;
        let imei2 = null;
        let serialNumber = null;
        
        const imei1Match = codeText.match(/IMEI:\s*([A-Za-z0-9]+)/i);
        if (imei1Match) imei1 = imei1Match[1];

        // Use regex to extract IMEI2
        const imei2Match = codeText.match(/IMEI2:\s*([A-Za-z0-9]+)/i);
        if (imei2Match) imei2 = imei2Match[1];
        
        // Use regex to extract Serial Number
        const snMatch = codeText.match(/Serial Number:\s*([A-Za-z0-9]+)/i);
        if (snMatch) serialNumber = snMatch[1];

        if ((imei1 || imei2 || serialNumber) && order.inventoryId && order.imei) {
          const Inventory = require('../models/Inventory');
          const updateData = {};
          if (imei1) updateData['devices.$[elem].imei'] = imei1;
          if (imei2) updateData['devices.$[elem].imei2'] = imei2;
          if (serialNumber) updateData['devices.$[elem].serialNumber'] = serialNumber;
          updateData['devices.$[elem].labData'] = order.apiResponse;
          
          await Inventory.updateOne(
            { _id: order.inventoryId, 'devices.imei': order.imei },
            { $set: updateData },
            { arrayFilters: [{ 'elem.imei': order.imei }] }
          );
        }
      }

      return res.json({ success: true, data: order });
    }
    
    res.json({ success: false, message: 'Could not fetch status from API' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    // Basic aggregation for spending stats
    const orders = await ImeiOrder.find();
    
    const totalSpent = orders.reduce((sum, o) => {
       if (o.status === 'Rejected' || o.status === 'Refunded' || o.status === 'Canceled') return sum;
       return sum + (o.cost || 0);
    }, 0);

    const totalOrders = orders.length;
    const successOrders = orders.filter(o => o.status === 'Success').length;
    
    // Group by month
    const monthlyStats = await ImeiOrder.aggregate([
      {
        $match: {
          status: { $nin: ['Rejected', 'Refunded', 'Canceled'] }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          spent: { $sum: "$cost" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ 
      success: true, 
      data: {
        totalSpent,
        totalOrders,
        successOrders,
        monthlyStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.autoSubmitImeiLab = async (deviceList) => {
  if (!deviceList || deviceList.length === 0) return;
  try {
    const api = getClient();
    
    for (const device of deviceList) {
      try {
        const imei = typeof device === 'string' ? device : device.imei;
        const brand = typeof device === 'string' ? '' : (device.brand || '').toLowerCase();
        const model = typeof device === 'string' ? '' : (device.model || '').toLowerCase();
        
        let serviceId = process.env.AUTO_IMEI_SERVICE_ID || '700'; 
        if (brand.includes('google') || model.includes('pixel')) {
          serviceId = '1320';
        } else if (brand.includes('samsung')) {
          serviceId = '99';
        } else if (brand.includes('apple') || brand.includes('iphone')) {
          serviceId = '700';
        }
        
        // Only skip if an order is actively pending or processing. 
        // If previous order succeeded, failed, or was canceled, we allow placing a new one.
        const existingOrder = await ImeiOrder.findOne({ 
           imei, 
           serviceId,
           status: { $in: ['Pending', 'In Process'] }
        });
        if (existingOrder) continue; 
        
        const data = await api.action('placeimeiorder', { ID: serviceId, IMEI: imei });
        if (data && data.SUCCESS && data.SUCCESS[0] && data.SUCCESS[0].ORDERID) {
          const createData = {
            apiOrderId: data.SUCCESS[0].ORDERID.toString(),
            referenceId: data.SUCCESS[0].REFERENCEID || '',
            imei: imei,
            serviceId: serviceId,
            serviceName: `Auto Lab Check #${serviceId}`,
            cost: 0,
            status: 'Pending',
            apiResponse: data.SUCCESS[0]
          };
          if (typeof device === 'object') {
             if (device.inventoryId) createData.inventoryId = device.inventoryId;
             if (device.brand) createData.brand = device.brand;
             if (device.model) createData.model = device.model;
          }
          await ImeiOrder.create(createData);
          console.log(`[IMEI Lab Auto] Submitted ${imei} for service ${serviceId}`);
        }
      } catch (err) {
        console.error(`[IMEI Lab Auto] Failed for ${device.imei || device}:`, err.message);
      }
    }
  } catch (error) {
    console.error(`[IMEI Lab Auto] Global error:`, error.message);
  }
};
