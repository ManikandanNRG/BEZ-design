import { Design } from '@freesewing/core';
import { brian } from '@freesewing/brian';

try {
  const pattern = new brian({
    measurements: {
      chest: 1000,
      neck: 400,
      shoulderToShoulder: 450,
      hpsToWaistBack: 500,
      waistToHips: 200,
      hips: 900,
      shoulderToWrist: 600,
      biceps: 300,
      wrist: 180,
    }
  });

  pattern.draft();
  const svg = pattern.render();
  console.log("SVG output starts with:");
  console.log(svg.substring(0, 500));
} catch(e) {
  console.error("Error:", e);
}
