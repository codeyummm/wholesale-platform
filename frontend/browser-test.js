const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Login
  await page.goto('http://localhost:5177/login');
  await page.type('input[type="email"]', 'admin@example.com'); // We need the correct email!
  
  // Wait! Do I know the login credentials?
  // Let's just bypass login or check the db.
})();
