require('dotenv').config();
const mongoose = require('mongoose');
const Inventory = require('./models/Inventory');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const codeText = 'Model: Pixel 10 Pro XL Porcelain 256GB (<span style="color: green">Unlocked</span>)<br>IMEI: 359489652886823<br>IMEI2: 359489652886831<br>Serial Number: 58141FDCQ004ZD<br>Part Number: GA10424-US';
  let imei2 = null;
  let serialNumber = null;
        
  const imei2Match = codeText.match(/IMEI2:\s*([A-Za-z0-9]+)/i);
  if (imei2Match) imei2 = imei2Match[1];
        
  const snMatch = codeText.match(/Serial Number:\s*([A-Za-z0-9]+)/i);
  if (snMatch) serialNumber = snMatch[1];

  console.log("Extracted:", imei2, serialNumber);

  await Inventory.updateMany(
    { 'devices.imei': '359489652886831' },
    { 
      $set: { 
        'devices.$[elem].imei2': imei2,
        'devices.$[elem].serialNumber': serialNumber
      }
    },
    { arrayFilters: [{ 'elem.imei': '359489652886831' }] }
  );
  console.log("Inventory updated with IMEI2 and SN!");
  process.exit(0);
});
