import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

(async () => {
  const assetsDir = path.join(process.cwd(), 'public', 'assets');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('response', async (response) => {
    const url = response.url();
    if (url.endsWith('.png') || url.endsWith('.jpg') || url.includes('.png') || url.endsWith('.json')) {
      try {
        const buffer = await response.buffer();
        // try to extract filename from URL, ignoring query params
        const urlObj = new URL(url);
        let filename = path.basename(urlObj.pathname);
        if (filename.includes('.png') || filename.includes('.jpg') || filename.includes('.json')) {
           fs.writeFileSync(path.join(assetsDir, filename), buffer);
           console.log('Downloaded', filename);
        }
      } catch (e) {}
    }
  });

  console.log('Navigating to game page...');
  await page.goto('https://www.crazygames.com/game/idle-mining-empire', { waitUntil: 'networkidle2' });
  console.log('Waiting 10 seconds for game to load and fetch assets...');
  await new Promise(r => setTimeout(r, 10000));
  
  // Also try to simulate a click to bypass guest screen if needed
  try {
      await page.mouse.click(500, 500);
      await new Promise(r => setTimeout(r, 5000));
  } catch(e) {}

  await browser.close();
  console.log('Finished downloading assets.');
})();
