function stripFiller(text) {
  return text
    .toLowerCase()
    .replace(/\b(find|show|get|list|give|tell|what|which|are|me|all|the|a|an|any|for|of|in|on|to|is|do|we|have|you|can|i|please|nova|our|my|their|how many|how much|check|look up|search|fetch|pull|display)\b/gi, ' ')
    .replace(/\b(devices?|items?|products?|units?|stock|inventory|available|unavailable|sold|unsold|phones?|models?|brands?|orders?|sales?|customers?|suppliers?|invoices?|records?)\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

console.log(stripFiller("how many pixel phones we have in stock"));
console.log(stripFiller("pixel stock"));
console.log(stripFiller("do we have any pixel in stock"));
