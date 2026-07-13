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
    if (url.includes('.js')) {
      try {
        const text = await response.text();
        const filename = path.basename(new URL(url).pathname);
        if (text.includes('texture-0.png')) {
           fs.writeFileSync(path.join(assetsDir, 'game_bundle.js'), text);
           console.log('Downloaded game bundle JS containing texture-0.png');
        }
      } catch (e) {}
    }
  });

  await page.goto('https://www.crazygames.com/game/idle-mining-empire', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 10000));
  await browser.close();
  console.log('Finished downloading js.');
})();
