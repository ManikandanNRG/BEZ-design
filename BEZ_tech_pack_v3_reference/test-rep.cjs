const Replicate = require('replicate');
async function run() {
  try {
    const replicate = new Replicate({ auth: 'fake-token' });
    const output = await replicate.run(
      "cuiaxiom/idm-vton",
      {
        input: {
          crop: false,
          seed: 42,
          steps: 30,
          category: "upper_body",
          garm_img: "https://example.com/garm.png",
          human_img: "https://example.com/human.png",
          garment_des: "A fashion apparel"
        }
      }
    );
     console.log(output);
  } catch(e) {
     console.log(e.message);
  }
}
run();
