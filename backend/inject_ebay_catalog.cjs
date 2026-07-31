const fs = require('fs');
let content = fs.readFileSync('backend/routes/ebay.js', 'utf8');

const newRoute = `
// @route   GET /api/ebay/catalog/search
// @desc    Search eBay Catalog for item specifics
router.get('/catalog/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: 'Query string is required' });
    }

    const accessToken = await getEbayToken();
    const apiUrl = process.env.EBAY_ENV !== 'production' 
      ? \`https://api.sandbox.ebay.com/commerce/catalog/v1_beta/product_summary/search?q=\${encodeURIComponent(q)}\` 
      : \`https://api.ebay.com/commerce/catalog/v1_beta/product_summary/search?q=\${encodeURIComponent(q)}\`;

    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': \`Bearer \${accessToken}\`,
        'Accept': 'application/json',
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      }
    });

    const products = response.data.productSummaries || [];
    if (products.length === 0) {
      return res.json({ success: true, itemSpecifics: null, message: 'No exact matches found' });
    }

    // Take the best match (first product)
    const product = products[0];
    
    // We want to map standard product attributes to eBay Item Specifics names
    const itemSpecifics = {};
    if (product.brand) itemSpecifics['Brand'] = product.brand;
    if (product.title) itemSpecifics['Model'] = product.title;
    if (product.mpn) itemSpecifics['MPN'] = product.mpn;
    if (product.gtin) itemSpecifics['UPC'] = product.gtin;

    // Sometimes they pass deeper specs in additionalAttributes or something similar, but the catalog API might just return the basic fields in summary.
    // Full product details are in /product/{epid} but the summary often has enough.
    // If not, we still return the basics.
    if (product.epid) itemSpecifics['ePID'] = product.epid;

    res.json({ success: true, itemSpecifics, rawProduct: product });
  } catch (error) {
    console.error('eBay Catalog API Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Failed to search eBay Catalog' });
  }
});

module.exports = router;`;

content = content.replace('module.exports = router;', newRoute);

fs.writeFileSync('backend/routes/ebay.js', content);
console.log('Injected /api/ebay/catalog/search');
