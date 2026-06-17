import https from 'https';

https.get('https://raw.githubusercontent.com/luciferreeves/TShirtDesigner/master/index.html', res => {
  const chunks = [];
  res.on('data', chunk => chunks.push(chunk));
  res.on('end', () => {
    console.log(Buffer.concat(chunks).toString().slice(0, 5000));
  });
});
