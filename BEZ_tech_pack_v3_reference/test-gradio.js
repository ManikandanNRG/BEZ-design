import { Client } from "@gradio/client";

async function testGradio() {
  try {
    const client = await Client.connect("yisol/IDM-VTON");
    const api = await client.view_api();
    console.log(JSON.stringify(api.named_endpoints['/tryon'].parameters, null, 2));
    console.log(JSON.stringify(api.named_endpoints['/tryon'].returns, null, 2));
  } catch (e) {
    console.error(e);
  }
}

testGradio();
