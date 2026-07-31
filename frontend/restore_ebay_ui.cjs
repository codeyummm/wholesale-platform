const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/Listings/ListingEditor.jsx', 'utf8');

const startTag = '<CardTitle className="text-base flex items-center gap-2 mb-2"><PlatformLogo platform="ebay" size={16} /> eBay Settings</CardTitle>';
const endTag = '                </div>\n              </CardContent>';

const startIndex = content.indexOf(startTag);
if (startIndex === -1) {
  console.log("Start tag not found");
  process.exit(1);
}

const endIndex = content.indexOf(endTag, startIndex);
if (endIndex === -1) {
  console.log("End tag not found");
  process.exit(1);
}

const beforeBlock = content.substring(0, startIndex);
const afterBlock = content.substring(endIndex + endTag.length);

const fullEbayUI = `${startTag}
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-500 mb-6">Configure extensive options for your eBay listing to ensure accurate mapping and search visibility.</div>
                
                {/* Listing Details & Condition */}
                <div className="space-y-4 border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                  <h4 className="font-semibold text-sm text-gray-700">Listing Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="block mb-1 text-xs">Category ID</Label>
                      <Input type="text" className="h-9" value={formData.platformSettings.ebay.categoryId || ''} onChange={e => handlePlatformChange('ebay', 'categoryId', e.target.value)} />
                    </div>
                    <div>
                      <Label className="block mb-1 text-xs">Store Category ID</Label>
                      <Input type="text" className="h-9" value={formData.platformSettings.ebay.storeCategoryId || ''} onChange={e => handlePlatformChange('ebay', 'storeCategoryId', e.target.value)} />
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Label className="block mb-3 text-sm font-semibold text-gray-700">Item condition</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="block mb-1 text-xs">Condition ID</Label>
                        <select value={formData.platformSettings.ebay.conditionId || '1000'} onChange={e => handlePlatformChange('ebay', 'conditionId', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500">
                          <option value="1000">New</option>
                          <option value="2000">Manufacturer Refurbished</option>
                          <option value="2500">Seller Refurbished</option>
                          <option value="3000">Used</option>
                          <option value="4000">Very Good</option>
                          <option value="5000">Good</option>
                          <option value="6000">Acceptable</option>
                          <option value="7000">For parts or not working</option>
                        </select>
                      </div>
                      <div>
                        <Label className="block mb-1 text-xs">Condition Description (Optional)</Label>
                        <Input type="text" className="h-9" value={formData.platformSettings.ebay.conditionDescription || ''} onChange={e => handlePlatformChange('ebay', 'conditionDescription', e.target.value)} placeholder="e.g. Minor scratches on back" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pricing & Formats */}
                <div className="mt-6 space-y-4 border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                   <h4 className="font-semibold text-sm text-gray-700">Pricing & Formats</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <Label className="block mb-1 text-xs">Format</Label>
                       <select value={formData.platformSettings.ebay.format || 'FixedPrice'} onChange={e => {
                         handlePlatformChange('ebay', 'format', e.target.value);
                         if (e.target.value === 'Auction') {
                           handlePlatformChange('ebay', 'duration', 'Days_7');
                         } else {
                           handlePlatformChange('ebay', 'duration', 'GTC');
                         }
                       }} className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500">
                         <option value="FixedPrice">Buy It Now (FixedPrice)</option>
                         <option value="Auction">Auction</option>
                       </select>
                     </div>
                     <div>
                       <Label className="block mb-1 text-xs">Duration</Label>
                       <select value={formData.platformSettings.ebay.duration || 'GTC'} onChange={e => handlePlatformChange('ebay', 'duration', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500">
                         {formData.platformSettings.ebay.format === 'Auction' ? (
                           <>
                             <option value="Days_1">1 Day</option>
                             <option value="Days_3">3 Days</option>
                             <option value="Days_5">5 Days</option>
                             <option value="Days_7">7 Days</option>
                             <option value="Days_10">10 Days</option>
                           </>
                         ) : (
                           <option value="GTC">Good 'Til Cancelled</option>
                         )}
                       </select>
                     </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                     <div>
                       <Label className="block mb-1 text-xs">Item Price</Label>
                       <div className="relative">
                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                         <Input type="number" className="h-9 pl-7" value={formData.price || ''} onChange={e => handleInput({ target: { name: 'price', value: e.target.value } })} placeholder="0.00" />
                       </div>
                     </div>
                     {formData.platformSettings.ebay.format === 'Auction' ? (
                       <>
                         <div>
                           <Label className="block mb-1 text-xs">Buy It Now price</Label>
                           <div className="relative">
                             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                             <Input type="number" className="h-9 pl-7" value={formData.platformSettings.ebay.buyItNowPrice || ''} onChange={e => handlePlatformChange('ebay', 'buyItNowPrice', e.target.value)} placeholder="0.00" />
                           </div>
                         </div>
                         <div>
                           <Label className="block mb-1 text-xs">Reserve price</Label>
                           <div className="relative">
                             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                             <Input type="number" className="h-9 pl-7" value={formData.platformSettings.ebay.reservePrice || ''} onChange={e => handlePlatformChange('ebay', 'reservePrice', e.target.value)} placeholder="0.00" />
                           </div>
                         </div>
                       </>
                     ) : (
                       <div>
                         <Label className="block mb-1 text-xs">Cost (Internal)</Label>
                         <div className="relative">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                           <Input type="number" className="h-9 pl-7" value={formData.cost || ''} onChange={e => handleInput({ target: { name: 'cost', value: e.target.value } })} placeholder="0.00" />
                         </div>
                       </div>
                     )}
                   </div>
                   
                   {formData.platformSettings.ebay.format !== 'Auction' && (
                     <div className="pt-2">
                       <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                         <input type="checkbox" checked={formData.platformSettings.ebay.requireImmediatePayment || false} onChange={e => handlePlatformChange('ebay', 'requireImmediatePayment', e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                         <span>Require immediate payment when buyer uses Buy It Now</span>
                       </label>
                     </div>
                   )}
                </div>

                {/* Allow Offers (Standalone) */}
                <div className="mt-6 space-y-4 border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-700">Allow offers (optional)</h4>
                      <p className="text-xs text-gray-500 mt-1">Interested buyers can send an offer for this item. You can accept, counter, or decline.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={formData.platformSettings.ebay.bestOfferEnabled || false} 
                        onChange={e => handlePlatformChange('ebay', 'bestOfferEnabled', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {formData.platformSettings.ebay.bestOfferEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100 mt-3">
                      <div>
                        <Label className="block mb-1 text-xs">Minimum offer</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                          <Input type="number" className="h-9 pl-7" value={formData.platformSettings.ebay.bestOfferAutoDecline || ''} onChange={e => handlePlatformChange('ebay', 'bestOfferAutoDecline', e.target.value)} placeholder="0.00" />
                        </div>
                      </div>
                      <div>
                        <Label className="block mb-1 text-xs">Auto accept</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                          <Input type="number" className="h-9 pl-7" value={formData.platformSettings.ebay.bestOfferAutoAccept || ''} onChange={e => handlePlatformChange('ebay', 'bestOfferAutoAccept', e.target.value)} placeholder="0.00" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Item Specifics */}
                <div className="mt-6 border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                  <div className="flex justify-between items-center mb-4">
                     <div>
                       <Label className="block text-sm font-semibold text-gray-700 uppercase">Item Specifics</Label>
                     </div>
                     <div className="flex items-center space-x-2">
                       {/* eBay AutoFill Button */}
                       <button
                         type="button"
                         onClick={async () => {
                           if (!formData.title) {
                              alert('Please enter a title first to auto-fill specs.');
                              return;
                           }
                           try {
                              const btn = document.getElementById('autofill-btn');
                              if (btn) btn.innerHTML = '<span class="animate-spin inline-block mr-2">⟳</span> Fetching...';
                              
                              const res = await fetch(\`http://localhost:5000/api/ebay/catalog/search?q=\${encodeURIComponent(formData.title)}\`, {
                                headers: { 'Authorization': \`Bearer \${localStorage.getItem('token')}\` }
                              });
                              const data = await res.json();
                              
                              if (btn) btn.innerHTML = '<span class="mr-1">✨</span> Auto-Fill from eBay';
                              
                              if (data.success && data.itemSpecifics) {
                                 const currentSpecs = formData.platformSettings?.ebay?.itemSpecifics || {};
                                 const newSpecs = { ...currentSpecs };
                                 let addedCount = 0;
                                 
                                 for (const [k, v] of Object.entries(data.itemSpecifics)) {
                                   if (!newSpecs[k]) {
                                     newSpecs[k] = v;
                                     addedCount++;
                                   }
                                 }
                                 
                                 if (addedCount > 0) {
                                   handlePlatformChange('ebay', 'itemSpecifics', newSpecs);
                                   alert(\`Auto-filled \${addedCount} item specific(s) successfully!\`);
                                 } else {
                                   alert('No new specifics found or all fields were already filled.');
                                 }
                              } else {
                                 alert(data.message || 'Could not find matching device in catalog.');
                              }
                           } catch (err) {
                              console.error(err);
                              alert('Error fetching specs.');
                              const btn = document.getElementById('autofill-btn');
                              if (btn) btn.innerHTML = '<span class="mr-1">✨</span> Auto-Fill from eBay';
                           }
                         }}
                         id="autofill-btn"
                         className="flex items-center text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm"
                       >
                         <span className="mr-1">✨</span> Auto-Fill from eBay
                       </button>

                       {/* Gemini AI AutoFill Button */}
                       <button
                         type="button"
                         onClick={async () => {
                           if (!formData.title) {
                              alert('Please enter a title first to auto-fill specs.');
                              return;
                           }
                           try {
                              const btn = document.getElementById('gemini-btn');
                              if (btn) btn.innerHTML = '<span class="animate-spin inline-block mr-2">⟳</span> Analyzing...';
                              
                              const res = await fetch(\`http://localhost:5000/api/ai/extract-specs\`, {
                                method: 'POST',
                                headers: { 
                                  'Authorization': \`Bearer \${localStorage.getItem('token')}\`,
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ title: formData.title })
                              });
                              const data = await res.json();
                              
                              if (btn) btn.innerHTML = '<span class="mr-1">🤖</span> Auto-Fill with Gemini';
                              
                              if (data.success && data.itemSpecifics) {
                                 const currentSpecs = formData.platformSettings?.ebay?.itemSpecifics || {};
                                 const newSpecs = { ...currentSpecs };
                                 let addedCount = 0;
                                 
                                 for (const [k, v] of Object.entries(data.itemSpecifics)) {
                                   if (v && v.trim() !== '' && !newSpecs[k]) {
                                     newSpecs[k] = v;
                                     addedCount++;
                                   }
                                 }
                                 
                                 if (addedCount > 0) {
                                   handlePlatformChange('ebay', 'itemSpecifics', newSpecs);
                                   alert(\`Auto-filled \${addedCount} item specific(s) using Gemini AI!\`);
                                 } else {
                                   alert('No new specifics found or all fields were already filled.');
                                 }
                              } else {
                                 alert(data.message || 'Gemini could not extract specs.');
                              }
                           } catch (err) {
                              console.error(err);
                              alert('Error extracting specs with Gemini.');
                              const btn = document.getElementById('gemini-btn');
                              if (btn) btn.innerHTML = '<span class="mr-1">🤖</span> Auto-Fill with Gemini';
                           }
                         }}
                         id="gemini-btn"
                         className="flex items-center text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full hover:bg-purple-100 transition-colors border border-purple-200 shadow-sm"
                       >
                         <span className="mr-1">🤖</span> Auto-Fill with Gemini
                       </button>
                     </div>
                  </div>
                  
                  <div className="space-y-6 bg-white p-4 border rounded-md">
                    {/* Required Specifics */}
                    <div>
                      <div className="mb-3">
                         <h5 className="font-bold text-sm text-gray-800">Required</h5>
                         <p className="text-xs text-gray-500">Buyers need these details to find your item.</p>
                      </div>
                      <div className="space-y-3">
                        {[
                          'Brand', 'Model', 'Storage Capacity', 'Color'
                        ].map(spec => (
                          <div key={spec} className="grid grid-cols-1 md:grid-cols-3 items-center gap-2 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                             <Label className="text-sm font-medium text-gray-700 md:col-span-1">{spec}</Label>
                             <Input 
                               type="text" 
                               className="h-9 md:col-span-2 text-sm" 
                               placeholder={\`Enter \${spec}\`}
                               value={formData.platformSettings?.ebay?.itemSpecifics?.[spec] || ''} 
                               onChange={e => {
                                 const newSpecifics = { ...(formData.platformSettings.ebay.itemSpecifics || {}) };
                                 if (e.target.value) {
                                   newSpecifics[spec] = e.target.value;
                                 } else {
                                   delete newSpecifics[spec];
                                 }
                                 handlePlatformChange('ebay', 'itemSpecifics', newSpecifics);
                               }} 
                             />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Additional Specifics */}
                    <div className="pt-4 border-t border-gray-100">
                      <div className="mb-3">
                         <h5 className="font-bold text-sm text-gray-800">Additional</h5>
                         <p className="text-xs text-gray-500">Add more details to help buyers decide.</p>
                      </div>
                      <div className="space-y-3">
                        {[
                          'UPC', 'ePID', 'MPN', 'Network', 'Screen Size', 'RAM', 'Processor', 'Operating System', 'Features'
                        ].map(spec => (
                          <div key={spec} className="grid grid-cols-1 md:grid-cols-3 items-center gap-2 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                             <Label className="text-sm font-medium text-gray-700 md:col-span-1">{spec}</Label>
                             <Input 
                               type="text" 
                               className="h-9 md:col-span-2 text-sm" 
                               placeholder={\`Enter \${spec}\`}
                               value={formData.platformSettings?.ebay?.itemSpecifics?.[spec] || ''} 
                               onChange={e => {
                                 const newSpecifics = { ...(formData.platformSettings.ebay.itemSpecifics || {}) };
                                 if (e.target.value) {
                                   newSpecifics[spec] = e.target.value;
                                 } else {
                                   delete newSpecifics[spec];
                                 }
                                 handlePlatformChange('ebay', 'itemSpecifics', newSpecifics);
                               }} 
                             />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fulfillment */}
                <div className="mt-6 space-y-4 border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                  <h4 className="font-semibold text-sm text-gray-700">Fulfillment</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="block mb-1 text-xs">Return Profile ID</Label>
                      <Input type="text" className="h-9" value={formData.platformSettings.ebay.returnProfileId || ''} onChange={e => handlePlatformChange('ebay', 'returnProfileId', e.target.value)} placeholder="From eBay Seller Hub" />
                    </div>
                    <div>
                      <Label className="block mb-1 text-xs">Shipping Profile ID</Label>
                      <Input type="text" className="h-9" value={formData.platformSettings.ebay.shippingProfileId || ''} onChange={e => handlePlatformChange('ebay', 'shippingProfileId', e.target.value)} placeholder="From eBay Seller Hub" />
                    </div>
                    <div>
                      <Label className="block mb-1 text-xs">Payment Profile ID</Label>
                      <Input type="text" className="h-9" value={formData.platformSettings.ebay.paymentProfileId || ''} onChange={e => handlePlatformChange('ebay', 'paymentProfileId', e.target.value)} placeholder="From eBay Seller Hub" />
                    </div>
                  </div>
                </div>
              </CardContent>`;

content = beforeBlock + fullEbayUI + afterBlock;
fs.writeFileSync('frontend/src/components/Listings/ListingEditor.jsx', content);
console.log('Successfully restored eBay UI!');
