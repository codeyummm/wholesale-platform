const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  await page.goto('http://localhost:5177/login');
  
  // Set local storage for auth if needed
  await page.evaluate(() => {
    localStorage.setItem('token', 'fake_token');
    localStorage.setItem('user', JSON.stringify({ name: 'Admin' }));
  });
  
  await page.goto('http://localhost:5177/sales-channels/listings', { waitUntil: 'networkidle0' });
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
