const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/Listings/ListingEditor.jsx', 'utf8');

// The block to inject after: Category ID and Store Category ID grid.
const targetRegex = /<\/div>\s*<\/div>\s*<div className="pt-2">\s*<Label className="block mb-3 text-sm font-semibold text-gray-700">Item condition<\/Label>/;

const itemSpecificsBlock = `</div>
                  </div>

                  {/* Item Specifics */}
                  <div className="pt-4 mt-4 border-t">
                    <div className="flex justify-between items-center mb-4">
                       <div>
                         <Label className="block text-sm font-semibold text-gray-700">Item Specifics</Label>
                         <p className="text-xs text-gray-500">Buyers need these details to find your item.</p>
                       </div>
                    </div>
                    
                    <div className="space-y-3 bg-white p-4 border rounded-md">
                      {[
                        'Brand', 'Model', 'Storage Capacity', 'Color', 'UPC', 
                        'Network', 'Screen Size', 'Lock Status', 'Connectivity',
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
                      
                      {/* Custom Item Specifics */}
                      {Object.keys(formData.platformSettings.ebay.itemSpecifics || {}).filter(k => ![
                        'Brand', 'Model', 'Storage Capacity', 'Color', 'UPC', 
                        'Network', 'Screen Size', 'Lock Status', 'Connectivity',
                        'Processor', 'RAM', 'Features', 'SIM Card Slot', 'Operating System'
                      ].includes(k)).map(customKey => (
                         <div key={customKey} className="grid grid-cols-1 md:grid-cols-3 items-center gap-2 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                           <Label className="text-sm font-medium text-gray-700 md:col-span-1 flex items-center justify-between">
                             {customKey}
                             <button type="button" onClick={() => {
                                const newSpecifics = { ...(formData.platformSettings.ebay.itemSpecifics || {}) };
                                delete newSpecifics[customKey];
                                handlePlatformChange('ebay', 'itemSpecifics', newSpecifics);
                             }} className="text-red-500 hover:text-red-700 ml-2">
                               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                             </button>
                           </Label>
                           <Input 
                             type="text" 
                             className="h-9 md:col-span-2 text-sm" 
                             value={formData.platformSettings.ebay.itemSpecifics?.[customKey] || ''} 
                             onChange={e => {
                               const newSpecifics = { ...(formData.platformSettings.ebay.itemSpecifics || {}) };
                               if (e.target.value) {
                                 newSpecifics[customKey] = e.target.value;
                               } else {
                                 delete newSpecifics[customKey];
                               }
                               handlePlatformChange('ebay', 'itemSpecifics', newSpecifics);
                             }} 
                           />
                        </div>
                      ))}

                      <div className="pt-2">
                         <Button type="button" variant="outline" size="sm" onClick={() => {
                            const key = window.prompt("Enter new item specific name (e.g. Model Number):");
                            if (key && key.trim()) {
                               const newSpecifics = { ...(formData.platformSettings.ebay.itemSpecifics || {}) };
                               newSpecifics[key.trim()] = '';
                               handlePlatformChange('ebay', 'itemSpecifics', newSpecifics);
                            }
                         }} className="text-xs">
                           + Add custom item specific
                         </Button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 mt-4">
                    <Label className="block mb-3 text-sm font-semibold text-gray-700">Item condition</Label>`;

content = content.replace(targetRegex, itemSpecificsBlock);
fs.writeFileSync('frontend/src/components/Listings/ListingEditor.jsx', content);
