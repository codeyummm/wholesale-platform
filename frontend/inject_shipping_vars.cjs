const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/Listings/ListingEditor.jsx', 'utf8');

// 1. Delete Legacy block
const legacyStart = '{/* Fulfillment (Legacy Fields) */}';
const legacyEnd = '                </div>\n              </CardContent>';
const startIndex = content.indexOf(legacyStart);
const endIndex = content.indexOf(legacyEnd, startIndex);
if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + '              </CardContent>';
}

// 2. Rename state variables to match eBay API standard naming
// old: shipping: { weightLbs: '', weightOz: '', length: '', width: '', height: '', irregularPackage: false, costType: 'Flat: Same cost to all buyers', primaryService: 'USPS Ground Advantage', buyerPays: '12.00', freeShipping: false }
// new: shipping: { packageWeightMajor: '', packageWeightMinor: '', packageLength: '', packageWidth: '', packageDepth: '', packageType: 'PackageThickEnvelope', shippingType: 'Flat', shippingService: 'USPSGroundAdvantage', shippingCost: '12.00', freeShipping: false }

const oldInitState = "shipping: { weightLbs: '', weightOz: '', length: '', width: '', height: '', irregularPackage: false, costType: 'Flat: Same cost to all buyers', primaryService: 'USPS Ground Advantage', buyerPays: '12.00', freeShipping: false }";
const newInitState = "shipping: { packageWeightMajor: '', packageWeightMinor: '', packageLength: '', packageWidth: '', packageDepth: '', packageType: 'PackageThickEnvelope', shippingType: 'Flat', shippingService: 'USPSGroundAdvantage', shippingCost: '12.00', freeShipping: false }";
content = content.replace(oldInitState, newInitState);

// 3. Update the JSX inputs to use the new variable names
content = content.replace(/weightLbs/g, "packageWeightMajor");
content = content.replace(/weightOz/g, "packageWeightMinor");
content = content.replace(/\bshipping\?\.length\b/g, "shipping?.packageLength");
content = content.replace(/: e\.target\.value \};.*?length:/gs, ": e.target.value };\n                                handlePlatformChange('ebay', 'shipping', newShipping);\n                             }} />"); // careful with regex replacements
content = content.replace(/length: e\.target\.value/g, "packageLength: e.target.value");
content = content.replace(/\bshipping\?\.width\b/g, "shipping?.packageWidth");
content = content.replace(/width: e\.target\.value/g, "packageWidth: e.target.value");
content = content.replace(/\bshipping\?\.height\b/g, "shipping?.packageDepth");
content = content.replace(/height: e\.target\.value/g, "packageDepth: e.target.value");

content = content.replace(/costType/g, "shippingType");
content = content.replace(/primaryService/g, "shippingService");
content = content.replace(/buyerPays/g, "shippingCost");

// Handle the irregular package checkbox logic (maps to packageType)
content = content.replace(/shipping\?\.irregularPackage/g, "shipping?.packageType === 'Irregular'");
content = content.replace(/irregularPackage: e\.target\.checked/g, "packageType: e.target.checked ? 'Irregular' : 'PackageThickEnvelope'");

// Make the shippingType dropdown use actual eBay API values
content = content.replace(/value="Flat: Same cost to all buyers"/g, "value=\"Flat\"");
content = content.replace(/>Flat: Same cost to all buyers</g, ">Flat: Same cost to all buyers<"); // display text stays same
content = content.replace(/value="Calculated: Cost varies by buyer location"/g, "value=\"Calculated\"");

fs.writeFileSync('frontend/src/components/Listings/ListingEditor.jsx', content);
console.log('Successfully updated shipping variables and removed legacy block!');
