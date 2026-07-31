const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/Listings/ListingEditor.jsx', 'utf8');

// 1. Add shipping variables to initial state
content = content.replace(
  /paymentMethod: 'PAYPAL',/,
  `paymentMethod: 'PAYPAL',
        shipping: { packageWeightMajor: '', packageWeightMinor: '', packageLength: '', packageWidth: '', packageDepth: '', packageType: 'PackageThickEnvelope', shippingType: 'Flat', shippingService: 'USPSGroundAdvantage', shippingCost: '12.00', freeShipping: false },`
);

// 2. Replace the Fulfillment block with the new Shipping UI
const fulfillmentRegex = /\{\/\* Fulfillment \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/m;

const newShippingUI = `{/* Shipping & Fulfillment */}
                <div className="mt-6 space-y-6">
                  {/* Package Details */}
                  <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                     <h4 className="font-semibold text-sm text-gray-700 mb-3">Package Details</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                         <Label className="block mb-2 text-xs font-semibold text-gray-800">Package weight <span className="text-gray-500 font-normal">(optional)</span></Label>
                         <div className="flex items-center space-x-2">
                           <div className="relative w-24">
                             <Input type="number" className="h-9 pr-8" placeholder="0" value={formData.platformSettings.ebay.shipping?.packageWeightMajor || ''} onChange={e => {
                                const newShipping = { ...(formData.platformSettings.ebay.shipping || {}), packageWeightMajor: e.target.value };
                                handlePlatformChange('ebay', 'shipping', newShipping);
                             }} />
                             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">lbs.</span>
                           </div>
                           <div className="relative w-24">
                             <Input type="number" className="h-9 pr-8" placeholder="0" value={formData.platformSettings.ebay.shipping?.packageWeightMinor || ''} onChange={e => {
                                const newShipping = { ...(formData.platformSettings.ebay.shipping || {}), packageWeightMinor: e.target.value };
                                handlePlatformChange('ebay', 'shipping', newShipping);
                             }} />
                             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">oz.</span>
                           </div>
                         </div>
                       </div>
                       
                       <div>
                         <Label className="block mb-2 text-xs font-semibold text-gray-800">Package dimensions <span className="text-gray-500 font-normal">(optional)</span></Label>
                         <div className="flex items-center space-x-2">
                           <div className="relative w-20">
                             <Input type="number" className="h-9 pr-6" placeholder="L" value={formData.platformSettings.ebay.shipping?.packageLength || ''} onChange={e => {
                                const newShipping = { ...(formData.platformSettings.ebay.shipping || {}), packageLength: e.target.value };
                                handlePlatformChange('ebay', 'shipping', newShipping);
                             }} />
                             <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">in.</span>
                           </div>
                           <span className="text-gray-400 text-sm">x</span>
                           <div className="relative w-20">
                             <Input type="number" className="h-9 pr-6" placeholder="W" value={formData.platformSettings.ebay.shipping?.packageWidth || ''} onChange={e => {
                                const newShipping = { ...(formData.platformSettings.ebay.shipping || {}), packageWidth: e.target.value };
                                handlePlatformChange('ebay', 'shipping', newShipping);
                             }} />
                             <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">in.</span>
                           </div>
                           <span className="text-gray-400 text-sm">x</span>
                           <div className="relative w-20">
                             <Input type="number" className="h-9 pr-6" placeholder="H" value={formData.platformSettings.ebay.shipping?.packageDepth || ''} onChange={e => {
                                const newShipping = { ...(formData.platformSettings.ebay.shipping || {}), packageDepth: e.target.value };
                                handlePlatformChange('ebay', 'shipping', newShipping);
                             }} />
                             <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">in.</span>
                           </div>
                         </div>
                       </div>
                     </div>
                     <p className="text-xs text-gray-500 mt-2 mb-4">These details are an estimate based on listings like yours: 2 lbs 0 oz, 10.0 x 8.0 x 4.0 in.</p>
                     
                     <label className="flex items-start space-x-2 text-sm text-gray-800 cursor-pointer">
                       <input type="checkbox" className="rounded border-gray-400 text-blue-600 focus:ring-blue-500 mt-0.5" checked={formData.platformSettings.ebay.shipping?.packageType === 'Irregular'} onChange={e => {
                          const newShipping = { ...(formData.platformSettings.ebay.shipping || {}), packageType: e.target.checked ? 'Irregular' : 'PackageThickEnvelope' };
                          handlePlatformChange('ebay', 'shipping', newShipping);
                       }} />
                       <div>
                         <span className="font-semibold block">Irregular package</span>
                         <span className="text-gray-500 text-xs">Carriers may charge extra for items not shipped in standard packages. <a href="#" className="underline">Learn more</a></span>
                       </div>
                     </label>
                  </div>

                  {/* Domestic Shipping */}
                  <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                     <h4 className="font-semibold text-sm text-gray-700 mb-4">Domestic shipping</h4>
                     
                     <div className="mb-6 w-full md:w-1/2">
                       <Label className="block mb-2 text-xs text-gray-800">Cost type</Label>
                       <select value={formData.platformSettings.ebay.shipping?.shippingType || 'Flat'} onChange={e => {
                          const newShipping = { ...(formData.platformSettings.ebay.shipping || {}), shippingType: e.target.value };
                          handlePlatformChange('ebay', 'shipping', newShipping);
                       }} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500">
                         <option value="Flat">Flat: Same cost to all buyers</option>
                         <option value="Calculated">Calculated: Cost varies by buyer location</option>
                       </select>
                     </div>

                     <div className="mb-4">
                       <Label className="block mb-2 text-xs font-semibold text-gray-800">Primary service</Label>
                       <div className="border border-gray-200 bg-white rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center relative">
                         <div className="flex items-start gap-4">
                           <div className="w-16 h-12 flex items-center justify-center bg-gray-50 rounded">
                             <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/USPS_logo_with_wordmark.svg/320px-USPS_logo_with_wordmark.svg.png" alt="USPS" className="max-h-full max-w-full object-contain" />
                           </div>
                           <div className="text-sm">
                             <div className="font-semibold text-gray-800">USPS Ground Advantage</div>
                             <div className="text-gray-600">2 - 5 business days</div>
                             <div className="text-gray-600">Insurance $100.00</div>
                             <div className="text-gray-600">Tracking included: Yes</div>
                             <div className="text-gray-600">Max. 70 lb</div>
                             <div className="mt-1 font-semibold">
                               $6.57 - $11.84 <span className="line-through text-gray-400 font-normal ml-1">$10.80 - $19.05</span>
                             </div>
                             <div className="text-green-700 font-medium mt-0.5">Save when you buy a label on eBay</div>
                           </div>
                         </div>
                         
                         <div className="mt-4 md:mt-0 flex items-center gap-3 border-l border-gray-100 pl-4 ml-4">
                           <div>
                             <Label className="block text-[11px] text-gray-500 mb-1">Buyer pays</Label>
                             <div className="relative w-32">
                               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-800 font-medium">$</span>
                               <Input type="number" className="h-10 pl-7 text-sm font-medium" placeholder="0.00" value={formData.platformSettings.ebay.shipping?.shippingCost || ''} onChange={e => {
                                  const newShipping = { ...(formData.platformSettings.ebay.shipping || {}), shippingCost: e.target.value };
                                  handlePlatformChange('ebay', 'shipping', newShipping);
                               }} />
                             </div>
                           </div>
                           
                           <button className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                           </button>
                         </div>
                       </div>
                     </div>

                     <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                       <label className="flex items-start space-x-3 text-sm text-gray-800 cursor-pointer">
                         <input type="checkbox" className="rounded border-gray-400 text-blue-600 focus:ring-blue-500 mt-1 w-4 h-4" checked={formData.platformSettings.ebay.shipping?.freeShipping || false} onChange={e => {
                            const newShipping = { ...(formData.platformSettings.ebay.shipping || {}), freeShipping: e.target.checked };
                            handlePlatformChange('ebay', 'shipping', newShipping);
                         }} />
                         <div>
                           <span className="font-bold block">Offer free shipping</span>
                           <span className="text-gray-600 text-xs block mt-0.5">Entice buyers by offering free shipping for your primary shipping service.</span>
                         </div>
                       </label>
                     </div>
                  </div>
                </div>`;

content = content.replace(fulfillmentRegex, newShippingUI);
fs.writeFileSync('frontend/src/components/Listings/ListingEditor.jsx', content);
console.log('Successfully injected final shipping UI with API variables!');
