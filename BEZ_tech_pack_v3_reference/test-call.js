import { Client, handle_file } from "@gradio/client";

async function run() {
  const fileParams = handle_file("https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png");
  try {
    const client = await Client.connect("yisol/IDM-VTON");
    const result = await client.predict("/tryon", [
      fileParams, // instead of dict
      fileParams, // Garment
      "A fashion model", // garment label
      true,
      false, // is_checked_crop
      30, // denoise_steps
      42 // seed
    ]);
    console.log(result.data);
  } catch (e) {
    console.log("Error:", e);
  }
}
run();
