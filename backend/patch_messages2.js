const fs = require('fs');
let code = fs.readFileSync('routes/ebay.js', 'utf8');

const regex2 = /\/\/ Limit to top 100 total to avoid too many body requests\n    rawHeaders = rawHeaders\.slice\(0, 100\);\n/g;

code = code.replace(regex2, '');

const regex3 = /res\.json\(\{ success: true, data: Object\.values\(conversationsMap\) \}\);/g;
code = code.replace(regex3, 'res.json({ success: true, data: Object.values(conversationsMap), hasMore: rawHeaders.length >= entriesPerPage });');

fs.writeFileSync('routes/ebay.js', code);
console.log('Patched middle part');
