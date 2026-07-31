const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/Listings/ListingEditor.jsx', 'utf8');

// 1. Change the useEffect logic
const oldUseEffect = `useEffect(() => {
    if (isShippingModalOpen && !shippingRates) {
      fetchShippingRates();
    }
  }, [isShippingModalOpen]);`;

const newUseEffect = `useEffect(() => {
    fetchShippingRates();
  }, [
    formData.platformSettings.ebay.shipping?.packageWeightMajor,
    formData.platformSettings.ebay.shipping?.packageWeightMinor,
    formData.platformSettings.ebay.shipping?.packageLength,
    formData.platformSettings.ebay.shipping?.packageWidth,
    formData.platformSettings.ebay.shipping?.packageDepth
  ]);

  useEffect(() => {
    if (isShippingModalOpen && !shippingRates) {
      fetchShippingRates();
    }
  }, [isShippingModalOpen]);

  // Helper to find the current active service in rates
  let activeServiceObj = null;
  if (shippingRates) {
    const activeId = formData.platformSettings.ebay.shipping?.shippingService || 'USPSGroundAdvantage';
    ['recommended', 'economy', 'standard'].forEach(cat => {
      if (shippingRates[cat]) {
        const found = shippingRates[cat].find(s => s.id === activeId);
        if (found) activeServiceObj = found;
      }
    });
  }`;

content = content.replace(oldUseEffect, newUseEffect);


// 2. Replace the hardcoded primary service card
const oldCardRegex = /<div className="flex items-start gap-4">\s*<div className="w-16 h-12 flex items-center justify-center bg-gray-50 rounded">\s*<img src="https:\/\/upload.wikimedia.org\/wikipedia\/commons\/thumb\/c\/ca\/USPS_logo_with_wordmark.svg\/320px-USPS_logo_with_wordmark.svg.png" alt="USPS" className="max-h-full max-w-full object-contain" \/>\s*<\/div>\s*<div className="text-sm">\s*<div className="font-semibold text-gray-800">USPS Ground Advantage<\/div>\s*<div className="text-gray-600">2 - 5 business days<\/div>\s*<div className="text-gray-600">Insurance \$100.00<\/div>\s*<div className="text-gray-600">Tracking included: Yes<\/div>\s*<div className="text-gray-600">Max. 70 lb<\/div>\s*<div className="mt-1 font-semibold">\s*\$6.57 - \$11.84 <span className="line-through text-gray-400 font-normal ml-1">\$10.80 - \$19.05<\/span>\s*<\/div>\s*<div className="text-green-700 font-medium mt-0.5">Save when you buy a label on eBay<\/div>\s*<\/div>\s*<\/div>/g;

const newCard = `<div className="flex items-start gap-4">
                           <div className="w-16 h-12 flex items-center justify-center bg-gray-50 rounded">
                             <img src={activeServiceObj ? activeServiceObj.logo : "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/USPS_logo_with_wordmark.svg/320px-USPS_logo_with_wordmark.svg.png"} alt="Carrier" className="max-h-full max-w-full object-contain" />
                           </div>
                           <div className="text-sm">
                             <div className="font-semibold text-gray-800">{activeServiceObj ? activeServiceObj.name : 'USPS Ground Advantage'}</div>
                             <div className="text-gray-600">{activeServiceObj ? activeServiceObj.transit : '2 - 5 business days'}</div>
                             <div className="text-gray-600">Insurance {activeServiceObj ? activeServiceObj.insurance : '$100.00'}</div>
                             <div className="text-gray-600">Tracking included: {activeServiceObj ? (activeServiceObj.tracking ? 'Yes' : 'No') : 'Yes'}</div>
                             <div className="text-gray-600">Max. {activeServiceObj ? activeServiceObj.maxWeight : '70 lb'}</div>
                             <div className="mt-1 font-semibold">
                               \${activeServiceObj ? activeServiceObj.minPrice.toFixed(2) : '6.57'} - \${activeServiceObj ? activeServiceObj.maxPrice.toFixed(2) : '11.84'} 
                               <span className="line-through text-gray-400 font-normal ml-1">\${activeServiceObj ? (activeServiceObj.minPrice * 1.5).toFixed(2) : '10.80'} - \${activeServiceObj ? (activeServiceObj.maxPrice * 1.5).toFixed(2) : '19.05'}</span>
                             </div>
                             <div className="text-green-700 font-medium mt-0.5">Save when you buy a label on eBay</div>
                           </div>
                         </div>`;

content = content.replace(oldCardRegex, newCard);

fs.writeFileSync('frontend/src/components/Listings/ListingEditor.jsx', content);
console.log('Fixed primary service card UI!');
