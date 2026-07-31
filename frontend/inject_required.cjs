const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/Listings/ListingEditor.jsx', 'utf8');

const regex = /\{\/\* Item Specifics \*\/\}(.|\n)*?\{\/\* Custom Item Specifics \*\/\}/;

const replacement = `{/* Item Specifics */}
                  <div className="pt-4 mt-4 border-t">
                    <div className="flex justify-between items-center mb-4">
                       <div>
                         <Label className="block text-sm font-semibold text-gray-700 uppercase">Item Specifics</Label>
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
                                 value={formData.platformSettings.ebay.itemSpecifics?.[spec] || ''} 
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
                            'UPC', 'Network', 'Screen Size', 'Lock Status', 'Connectivity',
                            'Processor', 'RAM', 'Features', 'SIM Card Slot', 'Operating System'
                          ].map(spec => (
                            <div key={spec} className="grid grid-cols-1 md:grid-cols-3 items-center gap-2 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                               <Label className="text-sm font-medium text-gray-700 md:col-span-1">{spec}</Label>
                               <Input 
                                 type="text" 
                                 className="h-9 md:col-span-2 text-sm" 
                                 placeholder={\`Enter \${spec}\`}
                                 value={formData.platformSettings.ebay.itemSpecifics?.[spec] || ''} 
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
                      
                      {/* Custom Item Specifics */}`;

if (regex.test(content)) {
   content = content.replace(regex, replacement);
   fs.writeFileSync('frontend/src/components/Listings/ListingEditor.jsx', content);
   console.log('Successfully injected Required/Additional item specifics.');
} else {
   console.log('Failed to match Item Specifics block.');
}
