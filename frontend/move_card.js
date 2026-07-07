const fs = require('fs');
const path = '/Users/deepakmalik/Downloads/wholesale-platform1/frontend/src/components/Settings/EmailSettings.jsx';
let content = fs.readFileSync(path, 'utf8');

const startMarker = "        {/* Third Card: Connect Existing Mailbox */}";
const endMarker = "          </div>\n        </div>";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker, startIndex) + endMarker.length;

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find markers.");
  process.exit(1);
}

const cardContent = content.substring(startIndex, endIndex);

// Remove the card from its original location
content = content.substring(0, startIndex) + content.substring(endIndex);

// Add marginBottom to the card so it spaces out from the grid below
const cardWithMargin = cardContent.replace(
  "padding: '32px' }}",
  "padding: '32px', marginBottom: '24px' }}"
);

// Find the insertion point: just before the grid container
const insertionMarker = "<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px', alignItems: 'start' }}>";
const insertionIndex = content.indexOf(insertionMarker);

if (insertionIndex === -1) {
  console.log("Could not find insertion point.");
  process.exit(1);
}

content = content.substring(0, insertionIndex) + cardWithMargin + "\n\n      " + content.substring(insertionIndex);

fs.writeFileSync(path, content);
console.log("Successfully moved the card!");
