const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/Listings/ListingEditor.jsx', 'utf8');

// 1. Remove the old Best Offer block inside Pricing
const oldBestOfferRegex = /\{\/\* Best offer for FixedPrice only \*\/\}(.|\n)*?<\/div>\s*<\/div>\s*<\/>\s*\)}/;

const replacementOld = `</div>
                          </>
                        )}`;

content = content.replace(oldBestOfferRegex, replacementOld);


// 2. Inject the new Offers block right before Schedule Listing
const scheduleListingRegex = /\{\/\* Schedule Listing \*\/\}/;

const newOffersBlock = `{/* Offers */}
                <div className="space-y-4 border border-gray-100 rounded-lg p-4 bg-gray-50/50 mt-4 mb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-700">Allow offers <span className="font-normal text-gray-500">(optional)</span></h4>
                      <p className="text-xs text-gray-500 mt-1">Interested buyers can send an offer for this item. You can accept, counter, or decline.</p>
                    </div>
                    <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in mt-1">
                        <input 
                           type="checkbox" 
                           checked={formData.platformSettings.ebay.bestOfferEnabled || false} 
                           onChange={e => handlePlatformChange('ebay', 'bestOfferEnabled', e.target.checked)} 
                           className="absolute opacity-0 w-0 h-0"
                        />
                        <div 
                           onClick={() => handlePlatformChange('ebay', 'bestOfferEnabled', !formData.platformSettings.ebay.bestOfferEnabled)}
                           className={\`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out \${formData.platformSettings.ebay.bestOfferEnabled ? 'bg-blue-600' : 'bg-gray-300'}\`}
                        >
                           <div className={\`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out \${formData.platformSettings.ebay.bestOfferEnabled ? 'translate-x-5' : 'translate-x-0'}\`}></div>
                        </div>
                    </div>
                  </div>
                  
                  {formData.platformSettings.ebay.bestOfferEnabled && (
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 max-w-xl">
                      <div>
                        <Label className="block mb-1 text-sm font-semibold">Minimum offer</Label>
                        <div className="relative">
                           <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                           <Input type="number" step="0.01" className="pl-7 h-10" value={formData.platformSettings.ebay.bestOfferAutoDecline || ''} onChange={e => handlePlatformChange('ebay', 'bestOfferAutoDecline', parseFloat(e.target.value))} />
                        </div>
                      </div>
                      <div>
                        <Label className="block mb-1 text-sm font-semibold">Auto accept</Label>
                        <div className="relative">
                           <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                           <Input type="number" step="0.01" className="pl-7 h-10" value={formData.platformSettings.ebay.bestOfferAutoAccept || ''} onChange={e => handlePlatformChange('ebay', 'bestOfferAutoAccept', parseFloat(e.target.value))} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Schedule Listing */}`;

content = content.replace(scheduleListingRegex, newOffersBlock);

fs.writeFileSync('frontend/src/components/Listings/ListingEditor.jsx', content);
console.log('Successfully injected Offers block.');
