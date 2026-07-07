const fs = require('fs');
let code = fs.readFileSync('routes/ebay.js', 'utf8');

// Replace mapping logic to use rawHeaders for read status
const mappingTarget = `
    const formattedMessages = rawMessages.map(msg => {
      // eBay gives Text in Text, HTML in HTML. Sometimes just Text.
`;
const mappingReplacement = `
    const readStatusMap = {};
    rawHeaders.forEach(h => {
      readStatusMap[h.MessageID] = h.Read === 'true';
    });

    const formattedMessages = rawMessages.map(msg => {
      // eBay gives Text in Text, HTML in HTML. Sometimes just Text.
`;

const isReadTarget = `
        folderId: msg.Folder?.FolderID || '0',
        isRead: msg.Read === 'true',
        replies: []
`;
const isReadReplacement = `
        folderId: msg.Folder?.FolderID || '0',
        isRead: readStatusMap[msg.MessageID] !== undefined ? readStatusMap[msg.MessageID] : msg.Read === 'true',
        replies: []
`;

code = code.replace(mappingTarget, mappingReplacement);
code = code.replace(isReadTarget, isReadReplacement);

fs.writeFileSync('routes/ebay.js', code);
console.log('Patched routes/ebay.js');
