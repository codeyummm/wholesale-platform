const { fetchWithStealth } = require('./services/scraperService');

(async () => {
  try {
    console.log("Fetching eBay with Puppeteer...");
    const html = await fetchWithStealth('https://www.ebay.com/itm/157953204480');
    console.log("Success! HTML Length:", html.length);
    console.log("Snippet:", html.substring(0, 200));
  } catch (e) {
    console.error("Failed:", e.message);
  }
})();
