import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';
async function run() {
  const img = await loadImage('crew.png');
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let maxYellow = 0;
  let yx = 0, yy = 0;
  for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
          if (r > 200 && g > 200 && b < 100) {
              const yellowScore = r + g - b;
              if (yellowScore > maxYellow) {
                  maxYellow = yellowScore;
                  yx = x;
                  yy = y;
              }
          }
      }
  }
  console.log(`Max yellow pixel at [${yx}, ${yy}]`);
  const i = (yy * canvas.width + yx) * 4;
  console.log('RGB:', data[i], data[i+1], data[i+2], 'A:', data[i+3]);
}
run();
