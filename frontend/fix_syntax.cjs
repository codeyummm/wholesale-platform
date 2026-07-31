const fs = require('fs');

let content = fs.readFileSync('frontend/src/components/Listings/ListingEditor.jsx', 'utf8');

// 1. Remove the broken half-block (lines 80-113 approx)
const badBlockRegex = /      \} catch \(err\) \{[\s\S]*?  \}\n/m;
content = content.replace(badBlockRegex, '');

// 2. We also moved `blockToMove` to the bottom in the previous script. Let's find it and replace it with the correct full block.
const injectedBlockRegex = /const \[isShippingModalOpen, setIsShippingModalOpen\] = useState\(false\);[\s\S]*?  \}\n/;
// Actually wait, let's just find the `platformDescriptions` part and replace everything after it up to `const predictedBrand`
const fullReplacementRegex = /    platformDescriptions: \{ ebay: '', etsy: '', shopify: '', amazon: '', tiktok: '' \},\n  \}\);\n[\s\S]*?const predictedBrand/m;

const correctBlock = `    platformDescriptions: { ebay: '', etsy: '', shopify: '', amazon: '', tiktok: '' },
  });

  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
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

  const predictedBrand`;

content = content.replace(fullReplacementRegex, correctBlock);

fs.writeFileSync('frontend/src/components/Listings/ListingEditor.jsx', content);
console.log('Fixed syntax and hook order!');
