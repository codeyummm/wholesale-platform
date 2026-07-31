const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/Listings/ListingEditor.jsx', 'utf8');

// Replace the Fulfillment section UI
const targetUiRegex = /<div className="space-y-4 border border-gray-100 rounded-lg p-4 bg-gray-50\/50">[\s\S]*?Package Details \(if not using calculated shipping policies\)/;

const newUi = `<div className="space-y-4 border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-sm text-gray-700">Fulfillment & Business Policies</h4>
                    <div className="flex items-center space-x-2">
                      <select onChange={handleLoadTemplate} className="h-7 text-xs border rounded-md px-2 bg-white">
                        <option value="">Load Template...</option>
                        {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                      </select>
                      <Button type="button" variant="ghost" size="sm" onClick={fetchTemplates} disabled={loadingTemplates} className="h-7 text-xs px-2">
                        <RefreshCw size={12} className={\`mr-1 \${loadingTemplates ? 'animate-spin' : ''}\`} />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-4 rounded border">
                    {/* Shipping */}
                    <div className="space-y-4">
                      <h5 className="text-xs font-semibold uppercase text-gray-500 border-b pb-1">Shipping</h5>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Handling Time (Days)</Label>
                          <Input type="number" min="0" className="h-8 text-sm" value={formData.platformSettings.ebay.handlingTime} onChange={e => handlePlatformChange('ebay', 'handlingTime', parseInt(e.target.value))} />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Shipping Service</Label>
                          <select value={formData.platformSettings.ebay.shippingService} onChange={e => handlePlatformChange('ebay', 'shippingService', e.target.value)} className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                            <option value="USPSPriority">USPS Priority Mail</option>
                            <option value="USPSFirstClass">USPS First Class</option>
                            <option value="USPSMedia">USPS Media Mail</option>
                            <option value="UPSGround">UPS Ground</option>
                            <option value="FedExHomeDelivery">FedEx Home Delivery</option>
                            <option value="FedExGround">FedEx Ground</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">Shipping Cost ($)</Label>
                        <Input type="number" step="0.01" min="0" className="h-8 text-sm" value={formData.platformSettings.ebay.shippingCost} onChange={e => handlePlatformChange('ebay', 'shippingCost', parseFloat(e.target.value))} />
                      </div>
                    </div>

                    {/* Returns & Payment */}
                    <div className="space-y-4">
                      <h5 className="text-xs font-semibold uppercase text-gray-500 border-b pb-1">Returns & Payment</h5>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="flex items-center space-x-2 mt-6">
                          <input type="checkbox" id="retAcc" checked={formData.platformSettings.ebay.returnsAccepted} onChange={e => handlePlatformChange('ebay', 'returnsAccepted', e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                          <Label htmlFor="retAcc" className="text-sm">Returns Accepted</Label>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Return Period</Label>
                          <select disabled={!formData.platformSettings.ebay.returnsAccepted} value={formData.platformSettings.ebay.returnPeriod} onChange={e => handlePlatformChange('ebay', 'returnPeriod', parseInt(e.target.value))} className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                            <option value="14">14 Days</option>
                            <option value="30">30 Days</option>
                            <option value="60">60 Days</option>
                          </select>
                        </div>
                      </div>
                      <div className="pt-2">
                        <Label className="text-xs text-gray-500 mb-1 block">Payment Method</Label>
                        <select value={formData.platformSettings.ebay.paymentMethod} onChange={e => handlePlatformChange('ebay', 'paymentMethod', e.target.value)} className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                          <option value="PAYPAL">PayPal</option>
                          <option value="CREDIT_CARD">Credit Card</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Template Saver */}
                  <div className="flex items-center justify-between border-t pt-4 mt-2">
                     <div className="flex items-center space-x-4 flex-1">
                        <Input placeholder="Template Name (e.g. Free USPS Priority)" value={templateName} onChange={e => setTemplateName(e.target.value)} className="h-8 text-sm max-w-[250px]" />
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="defTpl" checked={saveAsDefault} onChange={e => setSaveAsDefault(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                          <Label htmlFor="defTpl" className="text-xs text-gray-600">Auto-apply every time</Label>
                        </div>
                     </div>
                     <Button type="button" size="sm" onClick={handleSaveTemplate} disabled={savingTemplate || !templateName.trim()} className="h-8 text-xs">
                        {savingTemplate && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                        Save as Template
                     </Button>
                  </div>
                </div>

                <div className="pt-4">
                  <Label className="block text-xs font-semibold text-gray-500 uppercase mb-3">Package Details (if not using calculated shipping policies)`;

content = content.replace(targetUiRegex, newUi);

// Also remove the modal
const modalRegex = /{\/\* Create Native Profile Modal \*\/}[\s\S]*?<\/DialogContent>\n      <\/Dialog>/;
content = content.replace(modalRegex, '');

fs.writeFileSync('frontend/src/components/Listings/ListingEditor.jsx', content);
