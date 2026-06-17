import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';
async function run() {
  const img = await loadImage('crew.png');
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let maxDiff = 0;
  let px = 0, py = 0;
  for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
          if (a > 0 && a < 255) { // Inside the t-shirt
             const diff = Math.max(r,g,b) - Math.min(r,g,b);
             if (diff > maxDiff) {
                 maxDiff = diff;
                 px = x; py = y;
             }
          }
      }
  }
  console.log(`Max saturated pixel at [${px}, ${py}] Diff: ${maxDiff}`);
  const i = (py * canvas.width + px) * 4;
  console.log('RGB:', data[i], data[i+1], data[i+2], 'A:', data[i+3]);
}
run();
