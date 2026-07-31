import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    
    // Inject fake auth to bypass login
    await page.goto('http://localhost:5177');
    await page.evaluate(() => {
      localStorage.setItem('token', 'fake-token');
      localStorage.setItem('user', JSON.stringify({ _id: '123', role: 'admin' }));
    });
    
    // Also we need to mock the backend /auth/me call so PrivateRoute doesn't fail if it verifies token
    // Actually, PrivateRoute just checks the token in context... wait, useAuth() fetches from API!
  } catch(e) { console.error(e); }
  await browser.close();
})();
