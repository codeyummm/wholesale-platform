const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/Listings/ListingEditor.jsx', 'utf8');

const regex = /<\/Dialog>\n    <\/div>\n  \);\n\}\n[\s\S]*/m;
content = content.replace(regex, '</Dialog>\n    </div>\n  );\n}\n');

fs.writeFileSync('frontend/src/components/Listings/ListingEditor.jsx', content);
console.log('Fixed EOF');
