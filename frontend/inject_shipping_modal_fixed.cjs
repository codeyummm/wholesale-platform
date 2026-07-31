const fs = require('fs');

let content = fs.readFileSync('frontend/src/components/Listings/ListingEditor.jsx', 'utf8');

// 1. Add state variables AFTER formData
const insertTarget = /  useEffect\(\(\) => \{ if \(id\) fetchListing\(\); \}, \[id\]\);\n/;
const stateVarsReplacement = `  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [shippingRates, setShippingRates] = useState(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [shippingSearch, setShippingSearch] = useState('');
  const [tempSelectedService, setTempSelectedService] = useState(null);

  const fetchShippingRates = async () => {
    try {
      setLoadingRates(true);
      const ship = formData?.platformSettings?.ebay?.shipping || {};
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
    fetchShippingRates();
  }, [
    formData?.platformSettings?.ebay?.shipping?.packageWeightMajor,
    formData?.platformSettings?.ebay?.shipping?.packageWeightMinor,
    formData?.platformSettings?.ebay?.shipping?.packageLength,
    formData?.platformSettings?.ebay?.shipping?.packageWidth,
    formData?.platformSettings?.ebay?.shipping?.packageDepth
  ]);

  useEffect(() => {
    if (isShippingModalOpen && !shippingRates) {
      fetchShippingRates();
    }
  }, [isShippingModalOpen]);

  // Helper to find the current active service in rates
  let activeServiceObj = null;
  if (shippingRates) {
    const activeId = formData?.platformSettings?.ebay?.shipping?.shippingService || 'USPSGroundAdvantage';
    ['recommended', 'economy', 'standard'].forEach(cat => {
      if (shippingRates[cat]) {
        const found = shippingRates[cat].find(s => s.id === activeId);
        if (found) activeServiceObj = found;
      }
    });
  }

  useEffect(() => { if (id) fetchListing(); }, [id]);
`;

content = content.replace(insertTarget, stateVarsReplacement);

// 2. Add the modal UI before the final </div> in the component
// Since the modalUI is long, we can just grab it from the original script
const originalScript = fs.readFileSync('frontend/inject_shipping_modal.cjs', 'utf8');
const endOfComponentRegex = /<\/Dialog>\s*<\/div>\s*\);\s*\}/m;
const modalUIBlock = originalScript.split('const modalUI = `')[1].split('`;\n\ncontent = content.replace')[0];

content = content.replace(endOfComponentRegex, modalUIBlock + '`;\n\n    </div>\n  );\n}\n');
// Wait, the original regex replaced the whole ending! I'll just use the exact logic from the original script
content = content.replace(/<\/Dialog>\s*<\/div>\s*\);\s*\}/m, modalUIBlock + '\n    </div>\n  );\n}\n');

fs.writeFileSync('frontend/src/components/Listings/ListingEditor.jsx', content);
console.log('Fixed shipping modal injected successfully!');
