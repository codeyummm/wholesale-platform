const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/Listings/ListingEditor.jsx', 'utf8');

// 1. Add fields to formData initial state
const defaultSettingsRegex = /handlingTime: 1,/;
const newDefaultSettings = `scheduleListing: false,
        scheduleDate: '',
        scheduleTime: '12:00',
        scheduleAmPm: 'PM',
        shippingOptions: {
          autofill: true,
          irregularPackage: false,
          internationalShipping: false,
          otherShippingServices: false,
          localPickup: false,
          excludedLocations: false
        },
        handlingTime: 1,`;
content = content.replace(defaultSettingsRegex, newDefaultSettings);

// 2. Add the UI blocks before Fulfillment
const injectionRegex = /\{\/\* General Settings \*\/\}/;
const newUiBlocks = `{/* Listing Details & Condition */}
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
                    <div className="space-y-3 bg-white p-4 border rounded-md">
                      {[
                        { id: '1000', label: 'New', desc: 'A brand-new, unused, unopened, undamaged item in its original packaging.' },
                        { id: '1500', label: 'Open box', desc: 'An item in excellent, new condition with no wear.' },
                        { id: '3000', label: 'Used', desc: 'An item that has been used previously. The item may have some signs of cosmetic wear.' },
                        { id: '7000', label: 'For parts or not working', desc: 'An item that does not function as intended and is not fully operational.' }
                      ].map(cond => (
                        <div key={cond.id} className="flex items-start space-x-3">
                          <input type="radio" id={\`cond-\${cond.id}\`} name="condition" value={cond.id} checked={formData.platformSettings.ebay.conditionId === cond.id} onChange={e => handlePlatformChange('ebay', 'conditionId', e.target.value)} className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                          <div>
                            <Label htmlFor={\`cond-\${cond.id}\`} className="font-medium text-sm text-gray-900 cursor-pointer">{cond.label}</Label>
                            <p className="text-xs text-gray-500">{cond.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {formData.platformSettings.ebay.conditionId !== '1000' && (
                      <div className="mt-3">
                        <Label className="block mb-1 text-xs">Condition Description</Label>
                        <textarea className="w-full h-16 rounded-md border border-gray-300 p-2 text-sm" value={formData.platformSettings.ebay.conditionDescription || ''} onChange={e => handlePlatformChange('ebay', 'conditionDescription', e.target.value)} placeholder="Describe any flaws or missing parts..."></textarea>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing & Formats */}
                <div className="space-y-4 border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                   <h4 className="font-semibold text-sm text-gray-700">Pricing & Format</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-4 border rounded-md">
                      <div className="space-y-4">
                        <div>
                          <Label className="block mb-1 text-xs">Format</Label>
                          <select value={formData.platformSettings.ebay.format || 'FixedPrice'} onChange={e => handlePlatformChange('ebay', 'format', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                            <option value="FixedPrice">Fixed Price (Buy It Now)</option>
                            <option value="Auction">Auction</option>
                          </select>
                        </div>
                        <div>
                          <Label className="block mb-1 text-xs">Duration</Label>
                          <select value={formData.platformSettings.ebay.duration || 'GTC'} onChange={e => handlePlatformChange('ebay', 'duration', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                            <option value="GTC">Good 'Til Cancelled</option>
                            <option value="Days_7">7 Days</option>
                            <option value="Days_10">10 Days</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2 mt-2">
                           <input type="checkbox" id="bestOff" checked={formData.platformSettings.ebay.bestOfferEnabled || false} onChange={e => handlePlatformChange('ebay', 'bestOfferEnabled', e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                           <Label htmlFor="bestOff" className="text-sm font-semibold">Allow Best Offer</Label>
                        </div>
                        {formData.platformSettings.ebay.bestOfferEnabled && (
                           <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-gray-100 mt-2">
                             <div>
                               <Label className="block mb-1 text-xs">Auto-Accept ($)</Label>
                               <Input type="number" step="0.01" className="h-8 text-sm" value={formData.platformSettings.ebay.bestOfferAutoAccept || ''} onChange={e => handlePlatformChange('ebay', 'bestOfferAutoAccept', parseFloat(e.target.value))} />
                             </div>
                             <div>
                               <Label className="block mb-1 text-xs">Auto-Decline ($)</Label>
                               <Input type="number" step="0.01" className="h-8 text-sm" value={formData.platformSettings.ebay.bestOfferAutoDecline || ''} onChange={e => handlePlatformChange('ebay', 'bestOfferAutoDecline', parseFloat(e.target.value))} />
                             </div>
                           </div>
                        )}
                      </div>
                   </div>
                </div>

                {/* Schedule Listing */}
                <div className="space-y-4 border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-700">Schedule your listing</h4>
                      <p className="text-xs text-gray-500 mt-1">Your listing goes live immediately, unless you select a time and date you want it to start.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={formData.platformSettings.ebay.scheduleListing || false} onChange={e => handlePlatformChange('ebay', 'scheduleListing', e.target.checked)} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  {formData.platformSettings.ebay.scheduleListing && (
                    <div className="flex items-center gap-4 mt-3 bg-white p-3 border rounded-md">
                      <div>
                        <Label className="block text-xs mb-1">Day</Label>
                        <Input type="date" className="h-9 w-40 text-sm" value={formData.platformSettings.ebay.scheduleDate || ''} onChange={e => handlePlatformChange('ebay', 'scheduleDate', e.target.value)} />
                      </div>
                      <div className="flex items-end gap-2">
                         <div>
                            <Label className="block text-xs mb-1">Time</Label>
                            <Input type="time" className="h-9 w-32 text-sm" value={formData.platformSettings.ebay.scheduleTime || '12:00'} onChange={e => handlePlatformChange('ebay', 'scheduleTime', e.target.value)} />
                         </div>
                         <select className="h-9 border border-gray-300 rounded-md text-sm px-2 bg-white" value={formData.platformSettings.ebay.scheduleAmPm || 'PM'} onChange={e => handlePlatformChange('ebay', 'scheduleAmPm', e.target.value)}>
                            <option>AM</option>
                            <option>PM</option>
                         </select>
                         <span className="text-sm text-gray-500 mb-2 ml-1">PDT</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Shipping Options Dropdown */}
                <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                  <h4 className="font-semibold text-sm text-gray-700 mb-3">Additional Shipping Options</h4>
                  <div className="bg-white border rounded-md p-4 space-y-4">
                     {[
                       { id: 'autofill', label: 'Autofill shipping details', desc: 'Allow details such as the package weight/dimensions and carrier to be autofilled based on similar or matching listings.' },
                       { id: 'irregularPackage', label: 'Irregular package', desc: 'Carriers may charge extra for items not shipped in standard packages.' },
                       { id: 'internationalShipping', label: 'International shipping', desc: 'Ship globally.' },
                       { id: 'otherShippingServices', label: 'Other shipping services', desc: "You'll manage the export process yourself, including customs paperwork and returns." },
                       { id: 'localPickup', label: 'Local pickup', desc: 'Offer local pickup for nearby buyers.' },
                       { id: 'excludedLocations', label: 'Excluded locations', desc: "Set specific locations that you don't want to ship to." }
                     ].map(opt => (
                        <div key={opt.id} className="flex items-start justify-between py-2 border-b last:border-0">
                           <div className="pr-4">
                             <Label className="font-semibold text-sm text-gray-800">{opt.label}</Label>
                             <p className="text-xs text-gray-500">{opt.desc}</p>
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                             <input type="checkbox" className="sr-only peer" checked={formData.platformSettings.ebay.shippingOptions?.[opt.id] || false} onChange={e => {
                                const newOptions = { ...(formData.platformSettings.ebay.shippingOptions || {}) };
                                newOptions[opt.id] = e.target.checked;
                                handlePlatformChange('ebay', 'shippingOptions', newOptions);
                             }} />
                             <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                           </label>
                        </div>
                     ))}
                  </div>
                </div>

                {/* General Settings */}`;

content = content.replace(injectionRegex, newUiBlocks);

fs.writeFileSync('frontend/src/components/Listings/ListingEditor.jsx', content);
