const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/Listings/ListingEditor.jsx', 'utf8');

const targetRegex = /\{\/\* Pricing & Formats \*\/\}(.|\n)*?\{\/\* Schedule Listing \*\/\}/;

const replacement = `{/* Pricing & Formats */}
                <div className="space-y-4 border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                   <div className="flex justify-between items-center mb-4">
                     <h4 className="font-semibold text-sm text-gray-700">Pricing</h4>
                   </div>
                   
                   <div className="bg-white p-4 border rounded-md">
                     <div className="max-w-xl space-y-6">
                        <div>
                          <Label className="block mb-1 text-sm font-semibold">Format</Label>
                          <select 
                            value={formData.platformSettings.ebay.format || 'FixedPrice'} 
                            onChange={e => {
                               handlePlatformChange('ebay', 'format', e.target.value);
                               if (e.target.value === 'FixedPrice') {
                                  handlePlatformChange('ebay', 'duration', 'GTC');
                               } else if (formData.platformSettings.ebay.duration === 'GTC') {
                                  handlePlatformChange('ebay', 'duration', 'Days_7');
                               }
                            }} 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="FixedPrice">Buy It Now</option>
                            <option value="Auction">Auction</option>
                          </select>
                        </div>
                        
                        {(formData.platformSettings.ebay.format === 'Auction') ? (
                          <>
                            <div>
                              <Label className="block mb-1 text-sm font-semibold">Auction duration</Label>
                              <select 
                                value={formData.platformSettings.ebay.duration || 'Days_7'} 
                                onChange={e => handlePlatformChange('ebay', 'duration', e.target.value)} 
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-1"
                              >
                                <option value="Days_1">1 day</option>
                                <option value="Days_3">3 days</option>
                                <option value="Days_5">5 days</option>
                                <option value="Days_7">7 days</option>
                                <option value="Days_10">10 days</option>
                              </select>
                              <p className="text-xs text-gray-500">If your item doesn't sell, we'll relist it up to 8 times for free.</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="block mb-1 text-sm font-semibold">Starting bid</Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                  <Input type="number" step="0.01" className="pl-7 h-10" value={formData.price || ''} onChange={e => setFormData({...formData, price: e.target.value ? parseFloat(e.target.value) : 0})} />
                                </div>
                              </div>
                              <div>
                                <Label className="block mb-1 text-sm font-semibold">Buy It Now <span className="text-gray-500 font-normal">(optional)</span></Label>
                                <div className="relative mb-1">
                                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                  <Input type="number" step="0.01" className="pl-7 h-10" value={formData.platformSettings.ebay.buyItNowPrice || ''} onChange={e => handlePlatformChange('ebay', 'buyItNowPrice', e.target.value ? parseFloat(e.target.value) : undefined)} />
                                </div>
                                <p className="text-[10px] text-gray-500">Minimum: 30% more than starting bid</p>
                              </div>
                            </div>
                            
                            <div>
                               <Label className="block mb-1 text-sm font-semibold">Reserve price <span className="text-gray-500 font-normal">(optional) — fees apply</span></Label>
                               <div className="relative">
                                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                  <Input type="number" step="0.01" className="pl-7 h-10" value={formData.platformSettings.ebay.reservePrice || ''} onChange={e => handlePlatformChange('ebay', 'reservePrice', e.target.value ? parseFloat(e.target.value) : undefined)} />
                               </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                               <Label className="block mb-1 text-sm font-semibold">Item price</Label>
                               <div className="relative">
                                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                  <Input type="number" step="0.01" className="pl-7 h-10" value={formData.price || ''} onChange={e => setFormData({...formData, price: e.target.value ? parseFloat(e.target.value) : 0})} />
                               </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 pt-1 pb-1">
                               <input type="checkbox" id="immPay" checked={formData.platformSettings.ebay.requireImmediatePayment || false} onChange={e => handlePlatformChange('ebay', 'requireImmediatePayment', e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                               <Label htmlFor="immPay" className="text-sm font-semibold">Require immediate payment when buyer uses Buy It Now</Label>
                            </div>
                            
                            <div>
                               <Label className="block mb-1 text-sm font-semibold">Your cost <span className="text-gray-500 font-normal">(optional)</span></Label>
                               <div className="relative mb-1">
                                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                  <Input type="number" step="0.01" className="pl-7 h-10" value={formData.platformSettings.ebay.cost || ''} onChange={e => handlePlatformChange('ebay', 'cost', e.target.value ? parseFloat(e.target.value) : undefined)} />
                               </div>
                               <p className="text-xs text-gray-500">Not visible to buyers</p>
                            </div>
                            
                            <div>
                               <Label className="block mb-1 text-sm font-semibold text-gray-700">Quantity</Label>
                               <Input type="number" className="h-10 bg-white" value={formData.quantity || ''} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})} />
                            </div>
                            
                            {/* Best offer for FixedPrice only */}
                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex items-center space-x-2">
                                   <input type="checkbox" id="bestOff" checked={formData.platformSettings.ebay.bestOfferEnabled || false} onChange={e => handlePlatformChange('ebay', 'bestOfferEnabled', e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                                   <Label htmlFor="bestOff" className="text-sm font-semibold">Allow Best Offer</Label>
                                </div>
                                {formData.platformSettings.ebay.bestOfferEnabled && (
                                   <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-gray-100 mt-3">
                                     <div>
                                       <Label className="block mb-1 text-xs">Auto-Accept ($)</Label>
                                       <Input type="number" step="0.01" className="h-9 text-sm" value={formData.platformSettings.ebay.bestOfferAutoAccept || ''} onChange={e => handlePlatformChange('ebay', 'bestOfferAutoAccept', parseFloat(e.target.value))} />
                                     </div>
                                     <div>
                                       <Label className="block mb-1 text-xs">Auto-Decline ($)</Label>
                                       <Input type="number" step="0.01" className="h-9 text-sm" value={formData.platformSettings.ebay.bestOfferAutoDecline || ''} onChange={e => handlePlatformChange('ebay', 'bestOfferAutoDecline', parseFloat(e.target.value))} />
                                     </div>
                                   </div>
                                )}
                            </div>
                          </>
                        )}
                     </div>
                   </div>
                </div>

                {/* Schedule Listing */}`;

if (targetRegex.test(content)) {
   content = content.replace(targetRegex, replacement);
   fs.writeFileSync('frontend/src/components/Listings/ListingEditor.jsx', content);
   console.log('Successfully injected pricing options.');
} else {
   console.log('Target block not found. Regex did not match.');
}
