import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Go to login page and login
  await page.goto('http://localhost:5177/login');
  await page.type('input[type="email"]', 'admin@example.com'); // We will just use the first user in DB if we need to, but let's see what happens.
  
  // Actually let's fetch the first user email
  console.log("Started puppeteer");
})();
