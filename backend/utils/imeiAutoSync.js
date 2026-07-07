const ImeiOrder = require('../models/ImeiOrder');
const Inventory = require('../models/Inventory');
const DhruFusionAPI = require('./dhruApi');

const getClient = () => {
  const url = process.env.IMEI_API_URL || 'https://www.imeifree.com/api/index.php';
  const username = process.env.IMEI_API_USERNAME || 'Deep1920';
  const apiKey = process.env.IMEI_API_KEY || 'OVFPQ29-HP9Q902-CQWW1KP-5TKAQWE';
  return new DhruFusionAPI(url, username, apiKey);
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const syncPendingOrders = async () => {
  try {
    // Find all orders that are not in a final state
    const pendingOrders = await ImeiOrder.find({
      status: { $in: ['Pending', 'In Process', 'Unknown'] }
    });

    if (pendingOrders.length === 0) return;

    console.log(`[IMEI Auto-Sync] Found ${pendingOrders.length} pending orders. Starting sync...`);
    const api = getClient();

    for (const order of pendingOrders) {
      try {
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
          
          if (order.status !== newStatus) {
            console.log(`[IMEI Auto-Sync] Order ${apiId} changed status from ${order.status} to ${newStatus}`);
          }
          
          order.status = newStatus;
          order.apiResponse = { ...order.apiResponse, ...apiResult };
          await order.save();

          if (newStatus === 'Success') {
            const rawText = apiResult.CODE || apiResult.MESSAGE || '';
            const rawCode = rawText.toLowerCase();
            let unlockStatus = 'locked';
            if (rawCode.includes('unlocked')) unlockStatus = 'unlocked';
            else if (rawCode.includes('carrier locked')) unlockStatus = 'carrier_locked';

            const imei1Match = rawText.match(/IMEI:\s*(\d{15})/i) || rawText.match(/IMEI\s*1:\s*(\d{15})/i);
            const imei1 = imei1Match ? imei1Match[1] : null;

            const imei2Match = rawText.match(/IMEI2:\s*(\d{15})/i) || rawText.match(/IMEI\s*2:\s*(\d{15})/i) || rawText.match(/IMEI2\s*:\s*(\d{15})/i);
            const imei2 = imei2Match ? imei2Match[1] : null;

            const snMatch = rawText.match(/Serial Number:\s*([A-Z0-9]+)/i) || rawText.match(/SN:\s*([A-Z0-9]+)/i) || rawText.match(/Serial:\s*([A-Z0-9]+)/i);
            const serialNumber = snMatch ? snMatch[1] : null;

            const updateFields = { 
              'devices.$.labData': apiResult,
              'devices.$.unlockStatus': unlockStatus
            };

            if (imei1) {
               updateFields['devices.$.imei'] = imei1;
            }
            if (imei2) {
               updateFields['devices.$.imei2'] = imei2;
               order.imei2 = imei2;
            }
            if (serialNumber) {
               updateFields['devices.$.serialNumber'] = serialNumber;
               order.serialNumber = serialNumber;
            }
            
            await order.save();

            await Inventory.updateOne(
              { 'devices.imei': order.imei },
              { $set: updateFields }
            );
            console.log(`[IMEI Auto-Sync] Enriched Inventory device ${order.imei} with labData, SN: ${serialNumber || 'N/A'}, IMEI2: ${imei2 || 'N/A'}`);
          }
        }
      } catch (err) {
        console.error(`[IMEI Auto-Sync] Error syncing order ${order.apiOrderId}:`, err.message);
      }
      
      // Delay 2 seconds between API calls to prevent rate limiting
      await delay(2000);
    }
    console.log(`[IMEI Auto-Sync] Finished syncing ${pendingOrders.length} orders.`);
  } catch (error) {
    console.error('[IMEI Auto-Sync] Error during sync:', error.message);
  }
};

// Start the periodic sync (Runs every 2 minutes)
const startAutoSync = () => {
  const TWO_MINUTES = 2 * 60 * 1000;
  
  // Run immediately on startup after a small delay
  setTimeout(() => {
    syncPendingOrders();
  }, 10000);

  // Then run periodically
  setInterval(syncPendingOrders, TWO_MINUTES);
  console.log('[IMEI Auto-Sync] Background task started. Will check every 2 minutes.');
};

module.exports = { startAutoSync };
