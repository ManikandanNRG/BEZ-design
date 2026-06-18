import https from 'https';

https.get('https://api.github.com/repos/luciferreeves/TShirtDesigner/contents/old/img', {
  headers: {
    'User-Agent': 'Node.js'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        console.log(parsed.map(f => f.name).join('\n'));
      } else {
        console.log('Error:', parsed);
      }
    } catch (e) {
      console.log('Parse error', e);
    }
  });
}).on('error', err => {
  console.log('Request error', err);
});
