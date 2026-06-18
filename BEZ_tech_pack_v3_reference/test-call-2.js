const { Client, handle_file } = require("@gradio/client");

async function run() {
  const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const buffer = Buffer.from(base64Data, 'base64');
  const blob = new Blob([buffer], { type: 'image/png' });

  try {
    const client = await Client.connect("yisol/IDM-VTON");
    const file1 = handle_file(blob);
    console.log(file1);
  } catch (e) {
    console.log("Error:", e.message);
  }
}
run();
