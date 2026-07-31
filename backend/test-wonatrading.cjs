const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
  try {
    const url = 'https://www.wonatrading.com/product/wholesale-jewelry/wholesale-earrings/fashion/triple-rhinestone-pave-pumpkin-link-drop-dangle-earrings-708920';
    console.log('Fetching...');
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 10000
    });
    console.log('Fetched HTML length:', response.data.length);
    const $ = cheerio.load(response.data);
    const pageTitle = $('title').text();
    console.log('Title:', pageTitle);
    
    // Extract body text, max 4000 chars to avoid huge prompts
    const bodyText = $('body').text().replace(/\s+/g, ' ').substring(0, 4000);
    console.log('Body Text length:', bodyText.length);
    
    const images = [];
    $('img').each((i, el) => {
      let src = $(el).attr('src') || $(el).attr('data-src');
      if (src && !src.startsWith('http')) {
         if (src.startsWith('//')) src = 'https:' + src;
         else if (src.startsWith('/')) {
            try { src = new URL(src, url).href; } catch(e){}
         }
      }
      if (src && src.startsWith('http') && !src.includes('.svg') && !src.includes('logo') && !src.includes('icon')) {
        images.push(src);
      }
    });
    console.log('Found images:', images.length);
    console.log(images.slice(0, 3));
    
  } catch (err) {
    console.error('ERROR:', err.message);
  }
})();
