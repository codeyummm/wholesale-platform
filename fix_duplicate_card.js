const fs = require('fs');
const path = '/Users/deepakmalik/Downloads/wholesale-platform1/frontend/src/components/Settings/EmailSettings.jsx';

let lines = fs.readFileSync(path, 'utf8').split('\n');

// Find the first "Third Card: Connect Existing Mailbox"
const firstIndex = lines.findIndex(l => l.includes('{/* Third Card: Connect Existing Mailbox */}'));

// Find the second "Third Card: Connect Existing Mailbox"
const secondIndex = lines.findIndex((l, i) => i > firstIndex && l.includes('{/* Third Card: Connect Existing Mailbox */}'));

if (firstIndex !== -1 && secondIndex !== -1) {
    // Delete lines from firstIndex up to (but not including) secondIndex
    lines.splice(firstIndex, secondIndex - firstIndex);
    fs.writeFileSync(path, lines.join('\n'));
    console.log(`Deleted lines ${firstIndex + 1} to ${secondIndex}`);
} else {
    console.log("Could not find both Third Cards");
}
