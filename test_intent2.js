function detectIntent(text) {
  const lc = text.toLowerCase().trim();

  // 1. Trend / analytical — FIRST (catches "why", "dropping", "trend")
  if (/\b(why|how come|reason|explain|trend|growing|dropping|declining|slowing|increasing|getting better|getting worse|compare|week.?over.?week|month.?over.?month)\b/.test(lc))
    return 'trend_analysis';

  // 2. Specific order number or tracking number
  if (/\bSL[\w\d-]+\b/i.test(text)) return 'order_lookup';
  if (/\b(1Z[A-Z0-9]{16}|TBA\d{10,20})\b/i.test(text)) return 'order_lookup';
  if (/\b(\d{12}|\d{18}|\d{20}|\d{22})\b/.test(text)) return 'order_lookup'; // USPS, FedEx, etc.
  if (/\b(status|track|tracking)\b/i.test(text) && /\b\d{10,22}\b/.test(text)) return 'order_lookup';
  if (/\b(orders?|sales?|purchases?|transactions?)\b/.test(lc)) return 'orders';

  if (/\b(status of order|order status|find order|look up order|track order|where is order|show order)\b/.test(lc)) return 'order_lookup';

  // 7. Revenue / profit
  if (/\b(revenue|profit|earnings|income|money|sales total|how much|made)\b/.test(lc)) return 'revenue';

  // 8. Top selling
  if (/\b(top|best.?sell|popular|most sold|highest sell)\b/.test(lc)) return 'top_selling';

  // 9. Channel breakdown
  if (/\b(channel|breakdown|by channel|platform|distribution)\b/.test(lc)) return 'channel_breakdown';

  // 10. Pending
  if (/\b(pending|awaiting|not fulfilled|unfulfilled)\b/.test(lc)) return 'pending';

  // 11. IMEI lookup
  if (/\b\d{14,16}\b/.test(text)) return 'item_search';

  // 11.5 Specific model/item search — MUST have a product-like keyword
  if (/\b(do we have|is there|do you have|check if|find me|search for|look for|locate|i need|what is the imei|what is imei|imeis? for|imeis? of|show me|show|bring up)\b/.test(lc)) return 'item_search';

  // Check if there is a specific keyword first before matching generic 'all stock' intents
  const stripped = stripFiller(text);
  const hasSpecificKeyword = stripped && stripped.length > 1;

  // 12. All available / all stock queries  
  if (/\b(all available|all devices?|all items?|all products?|everything|full list|entire|complete list)\b/.test(lc)) {
    return hasSpecificKeyword ? 'item_search' : 'inventory_all';
  }
  if (/\b(low stock|out of stock|running out|running low)\b/.test(lc)) {
    return hasSpecificKeyword ? 'item_search' : 'inventory_all';
  }

  // 13. General inventory
  if (/\b(inventory|stock|items?|products?|units?|phones?|devices?)\b/.test(lc)) {
    if (hasSpecificKeyword) {
      return 'item_search'; // Contains a specific word like 'pixel'
    }
console.log(detectIntent('show me pixel 10 available'));
