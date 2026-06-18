const http = require('http');

async function run() {
  const { Client, handle_file } = await import('@gradio/client');
  const humanImg = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
  const garmImg = 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
  
  try {
     const client = await Client.connect("yisol/IDM-VTON");
     const result = await client.predict("/tryon", [
        { background: handle_file(humanImg), layers: [], composite: null },
        handle_file(garmImg),
        "A fashion apparel",
        true,
        true,
        30,
        42
     ]);
     console.log(result.data);
  } catch(err) {
     console.error(err.message);
  }
}
run();
