const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

(async () => {
  await mongoose.connect('mongodb://localhost:27017/wholesale_db');
  const User = require('./models/User');
  const user = await User.findOne();
  if(!user) { console.log('No user found'); process.exit(1); }
  
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1d' });
  
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Set token in localStorage on localhost:5177
  await page.goto('http://localhost:5177');
  await page.evaluate((t) => { localStorage.setItem('token', t); }, token);
  
  // Go to listings
  await page.goto('http://localhost:5177/sales-channels/listings');
  await page.waitForSelector('table', { timeout: 10000 });
  
  // Find first edit button
  await page.click('button[title="Edit"]');
  await page.waitForSelector('select', { timeout: 10000 });
  
  console.log('Navigated to edit page.');
  
  // Wait for fetchListing to complete
  await new Promise(r => setTimeout(r, 2000));
  
  // Find "Cost type" select
  // We need to target the correct select. It has value "Flat" or "Calculated".
  await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    const costTypeSelect = selects.find(s => s.innerHTML.includes('Calculated: Cost varies'));
    if(costTypeSelect) {
      costTypeSelect.value = 'Calculated';
      costTypeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  
  console.log('Changed cost type to Calculated.');
  
  // Find weight input
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="number"]'));
    // Find the one with next element sibling span "lbs."
    const major = inputs.find(i => i.nextElementSibling && i.nextElementSibling.innerText.includes('lbs.'));
    if(major) {
      major.value = '15';
      // React 16+ requires setting value natively before dispatching event
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      nativeInputValueSetter.call(major, '15');
      major.dispatchEvent(new Event('input', { bubbles: true }));
      major.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  
  console.log('Changed weight to 15 lbs.');
  
  // Click "Save Draft"
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const saveBtn = buttons.find(b => b.innerText.includes('Save Draft') || b.innerText.includes('Update'));
    if(saveBtn) saveBtn.click();
  });
  
  console.log('Clicked Save. Waiting for navigation...');
  await new Promise(r => setTimeout(r, 3000));
  
  // Go back to the listing
  await page.goto('http://localhost:5177/sales-channels/listings');
  await page.waitForSelector('table', { timeout: 10000 });
  await page.click('button[title="Edit"]');
  await page.waitForSelector('select', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 2000));
  
  // Check the value
  const values = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    const costTypeSelect = selects.find(s => s.innerHTML.includes('Calculated: Cost varies'));
    
    const inputs = Array.from(document.querySelectorAll('input[type="number"]'));
    const major = inputs.find(i => i.nextElementSibling && i.nextElementSibling.innerText.includes('lbs.'));
    
    return {
      costType: costTypeSelect ? costTypeSelect.value : null,
      weight: major ? major.value : null
    };
  });
  
  console.log('Final values on reload:', values);
  
  await browser.close();
  process.exit(0);
})();
