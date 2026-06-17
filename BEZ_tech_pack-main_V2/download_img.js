import fs from 'fs';
import https from 'https';

https.get('https://raw.githubusercontent.com/luciferreeves/TShirtDesigner/master/old/img/crew_front.png', res => {
  const chunks = [];
  res.on('data', chunk => chunks.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    fs.writeFileSync('crew.png', buffer);
    console.log('Saved crew.png, size:', buffer.length);
  });
});
