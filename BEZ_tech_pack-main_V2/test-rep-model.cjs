const Replicate = require('replicate');

async function testReplicate() {
  try {
    const replicate = new Replicate({
      auth: 'r8_dummy', // Since it's invalid, it should give 401 Unauthenticated instead of 404 if it exists!
    });
    const output = await replicate.run(
      "yisol/idm-vton:c02d9facd68f1618eb8ead2eb020101c5180cb95df5581b0aadb4ed990cc79bb",
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
testReplicate();
