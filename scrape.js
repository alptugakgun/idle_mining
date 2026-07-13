import https from 'https';

https.get('https://www.crazygames.com/game/idle-mining-empire', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Try to find the game URL in the response
    const match = data.match(/"gameUrl":"([^"]+)"/);
    if (match) {
      console.log('Game URL found:', match[1]);
    } else {
      console.log('Could not find gameUrl. Trying iframe...');
      const iframeMatch = data.match(/<iframe[^>]+src="([^"]+)"/i);
      if (iframeMatch) {
          console.log('Iframe URL found:', iframeMatch[1]);
      } else {
          console.log('Nothing found. Saving to page.html for manual inspection.');
          import('fs').then(fs => fs.writeFileSync('page.html', data));
      }
    }
  });
}).on('error', err => {
  console.error(err);
});
