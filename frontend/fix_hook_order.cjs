const fs = require('fs');

let content = fs.readFileSync('frontend/src/components/Listings/ListingEditor.jsx', 'utf8');

// The block to extract starts at `const [isShippingModalOpen` and ends at `}); }`
const blockRegex = /const \[isShippingModalOpen, setIsShippingModalOpen\] = useState\(false\);[\s\S]*?  \}\n/;
const match = content.match(blockRegex);
if (!match) {
  console.log('Block not found');
  process.exit(1);
}

const blockToMove = match[0];
content = content.replace(blockToMove, '');

// The target is right after the `useState` for formData
const targetRegex = /    platformDescriptions: \{ ebay: '', etsy: '', shopify: '', amazon: '', tiktok: '' \},\n  \}\);\n/;
content = content.replace(targetRegex, `    platformDescriptions: { ebay: '', etsy: '', shopify: '', amazon: '', tiktok: '' },\n  });\n\n${blockToMove}`);

fs.writeFileSync('frontend/src/components/Listings/ListingEditor.jsx', content);
console.log('Fixed hook order successfully!');
