const http = require('http');

async function run() {
  const data = JSON.stringify({ imageBase64: 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', mimeType: 'image/jpeg', prompt: 'test', provider: 'huggingface' });
  const req = http.request('http://localhost:3000/api/generate-try-on', { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
    let str = '';
    res.on('data', d => str += d);
    res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', str));
  });
  req.write(data);
  req.end();
}
run();
