const fs = require('fs');

let content = fs.readFileSync('frontend/src/components/Listings/ListingEditor.jsx', 'utf8');

// 1. Add state variables
const stateVarsRegex = /const \[formData, setFormData\] = useState\(\{/;
const stateVarsReplacement = `const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [shippingRates, setShippingRates] = useState(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [shippingSearch, setShippingSearch] = useState('');
  const [tempSelectedService, setTempSelectedService] = useState(null);

  const fetchShippingRates = async () => {
    try {
      setLoadingRates(true);
      const ship = formData.platformSettings.ebay.shipping || {};
      const res = await api.post('/ebay/shipping-rates', {
        weightMajor: ship.packageWeightMajor,
        weightMinor: ship.packageWeightMinor,
        length: ship.packageLength,
        width: ship.packageWidth,
        depth: ship.packageDepth
      });
      if (res.data.success) {
        setShippingRates(res.data.rates);
        setTempSelectedService(ship.shippingService || 'USPSGroundAdvantage');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRates(false);
    }
  };

  useEffect(() => {
    if (isShippingModalOpen && !shippingRates) {
      fetchShippingRates();
    }
  }, [isShippingModalOpen]);

  const const_formData_setFormData = useState({`;

content = content.replace(stateVarsRegex, stateVarsReplacement);
content = content.replace(/const_formData_setFormData/, 'const [formData, setFormData]');

// 2. Add the modal UI before the final </div> in the component
const endOfComponentRegex = /<\/Dialog>\s*<\/div>\s*\);\s*\}/m;
const modalUI = `</Dialog>

      {/* Change Shipping Service Modal */}
      <Dialog open={isShippingModalOpen} onOpenChange={setIsShippingModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b relative">
            <DialogTitle className="text-center text-lg font-bold">Change service</DialogTitle>
            <button onClick={() => setIsShippingModalOpen(false)} className="absolute right-4 top-4 text-blue-600 hover:text-blue-800 text-sm font-semibold">Done</button>
          </DialogHeader>
          
          <div className="px-6 py-4 border-b bg-gray-50/50">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <Input 
                type="text" 
                placeholder="Find a shipping service" 
                className="pl-9 h-10"
                value={shippingSearch}
                onChange={e => setShippingSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8">
            {loadingRates ? (
              <div className="flex justify-center items-center h-32 text-gray-500">Loading rates...</div>
            ) : shippingRates ? (
              <>
                {/* Selected / Recommended */}
                {shippingRates.recommended && shippingRates.recommended.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4 text-lg">Selected</h3>
                    <div className="space-y-4">
                      {shippingRates.recommended.map(service => (
                        <label key={service.id} className="flex items-start gap-3 cursor-pointer group">
                          <input 
                            type="radio" 
                            name="shippingService"
                            value={service.id}
                            checked={tempSelectedService === service.id}
                            onChange={() => setTempSelectedService(service.id)}
                            className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-200">RECOMMENDED</span>
                            </div>
                            <div className="font-semibold text-gray-900 mt-1 group-hover:text-blue-600 transition-colors">{service.name}</div>
                            <div className="text-gray-500 text-sm mt-0.5">{service.transit}</div>
                            <div className="text-gray-500 text-sm">Insurance {service.insurance}</div>
                            <div className="text-gray-500 text-sm">Tracking included: {service.tracking ? 'Yes' : 'No'}</div>
                            <div className="text-gray-500 text-sm">Max. {service.maxWeight}</div>
                            <div className="font-semibold text-gray-900 mt-1">
                              $\\{service.minPrice.toFixed(2)} - $\\{service.maxPrice.toFixed(2)}
                            </div>
                            <div className="text-green-700 text-sm font-medium mt-0.5">Save when you buy a label on eBay</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Economy Services */}
                {shippingRates.economy && shippingRates.economy.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4 text-lg">Economy services</h3>
                    <div className="space-y-6">
                      {shippingRates.economy.map(service => (
                        <label key={service.id} className="flex items-start gap-3 cursor-pointer group">
                          <input 
                            type="radio" 
                            name="shippingService"
                            value={service.id}
                            checked={tempSelectedService === service.id}
                            onChange={() => setTempSelectedService(service.id)}
                            className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{service.name}</div>
                            <div className="text-gray-500 text-sm mt-0.5">{service.transit}</div>
                            <div className="text-gray-500 text-sm">Insurance {service.insurance}</div>
                            <div className="text-gray-500 text-sm">Tracking included: {service.tracking ? 'Yes' : 'No'}</div>
                            <div className="text-gray-500 text-sm">Max. {service.maxWeight}</div>
                            <div className="font-semibold text-gray-900 mt-1">
                              $\\{service.minPrice.toFixed(2)} - $\\{service.maxPrice.toFixed(2)}
                            </div>
                            <div className="text-green-700 text-sm font-medium mt-0.5">Save when you buy a label on eBay</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Standard Services */}
                {shippingRates.standard && shippingRates.standard.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4 text-lg">Standard services</h3>
                    <div className="space-y-6">
                      {shippingRates.standard.map(service => (
                        <label key={service.id} className="flex items-start gap-3 cursor-pointer group">
                          <input 
                            type="radio" 
                            name="shippingService"
                            value={service.id}
                            checked={tempSelectedService === service.id}
                            onChange={() => setTempSelectedService(service.id)}
                            className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{service.name}</div>
                            <div className="text-gray-500 text-sm mt-0.5">{service.transit}</div>
                            <div className="text-gray-500 text-sm">Insurance {service.insurance}</div>
                            <div className="text-gray-500 text-sm">Tracking included: {service.tracking ? 'Yes' : 'No'}</div>
                            <div className="text-gray-500 text-sm">Max. {service.maxWeight}</div>
                            <div className="font-semibold text-gray-900 mt-1">
                              $\\{service.minPrice.toFixed(2)} - $\\{service.maxPrice.toFixed(2)}
                            </div>
                            <div className="text-green-700 text-sm font-medium mt-0.5">Save when you buy a label on eBay</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center items-center h-32 text-gray-500">No rates available.</div>
            )}
          </div>
          
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsShippingModalOpen(false)}>Cancel</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white" 
              onClick={() => {
                if (tempSelectedService && shippingRates) {
                  // Find the service in any category to get its price
                  let selectedServiceObj = null;
                  ['recommended', 'economy', 'standard'].forEach(cat => {
                    if (shippingRates[cat]) {
                      const found = shippingRates[cat].find(s => s.id === tempSelectedService);
                      if (found) selectedServiceObj = found;
                    }
                  });
                  
                  const newShipping = { ...(formData.platformSettings.ebay.shipping || {}), shippingService: tempSelectedService };
                  if (selectedServiceObj) {
                     newShipping.shippingCost = selectedServiceObj.maxPrice.toFixed(2);
                  }
                  handlePlatformChange('ebay', 'shipping', newShipping);
                }
                setIsShippingModalOpen(false);
              }}
            >
              Apply Selection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}`;

content = content.replace(endOfComponentRegex, modalUI);

// 3. Update the 3-dots button to open the modal
const threeDotsRegex = /<button className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">/;
const threeDotsReplacement = `<button onClick={() => setIsShippingModalOpen(true)} className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">`;

content = content.replace(threeDotsRegex, threeDotsReplacement);

fs.writeFileSync('frontend/src/components/Listings/ListingEditor.jsx', content);
console.log('Successfully injected Shipping Modal!');
