const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'agentController.js');
let code = fs.readFileSync(file, 'utf8');

// Fix the order lookup logic to be more robust against LLM extracting just the id
code = code.replace(
  `func: async (input) => {
          if (/start(?:ing|s)?\\s+with/i.test(input)) {
             return await handleOrderLookup(input);
          }`,
  `func: async (input) => {
          // If input is just "eb id" or similar, append "starting with" to force fallback matching to try both
          let q = input;
          if (q.length < 15 && !/start(?:ing|s)?\\s+with/i.test(q)) {
             q = "starting with " + q;
          }
          if (/start(?:ing|s)?\\s+with/i.test(q)) {
             return await handleOrderLookup(q);
          }`
);

fs.writeFileSync(file, code);
