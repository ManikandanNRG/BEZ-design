import fetch from 'node-fetch';

async function run() {
  const garmStr = 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80';
  const humanStr = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80';
  
  // Convert URLs to data URLs
  const garmRes = await fetch(garmStr);
  const garmBuffer = await garmRes.arrayBuffer();
  const garmBase64 = 'data:image/jpeg;base64,' + Buffer.from(garmBuffer).toString('base64');

  const humanRes = await fetch(humanStr);
  const humanBuffer = await humanRes.arrayBuffer();
  const humanBase64 = 'data:image/jpeg;base64,' + Buffer.from(humanBuffer).toString('base64');

  const data = JSON.stringify({ 
    imageBase64: garmBase64, 
    personImageBase64: humanBase64, 
    mimeType: 'image/jpeg', 
    prompt: 'test', 
    provider: 'gemini' 
  });
  
  try {
    const res = await fetch('http://localhost:3000/api/generate-try-on', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data
    });
    console.log(res.status);
    const text = await res.text();
    console.log(text);
  } catch (err) {
      console.error(err);
  }
}
run();
