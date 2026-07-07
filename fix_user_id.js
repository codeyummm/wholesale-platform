const fs = require('fs');
const path = '/Users/deepakmalik/Downloads/wholesale-platform1/frontend/src/components/Settings/EmailSettings.jsx';

let code = fs.readFileSync(path, 'utf8');

code = code.replace(/user\.id/g, '(user.id || user._id)');

fs.writeFileSync(path, code);
console.log('done');
