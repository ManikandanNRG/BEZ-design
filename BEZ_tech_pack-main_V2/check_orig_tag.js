import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';
async function run() {
  const img = await loadImage('crew.png');
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  console.log('Original Neck Tag A:', data[(90 * canvas.width + 250) * 4 + 3]);
  console.log('Original Neck Tag RGB:', data[(90 * canvas.width + 250) * 4], data[(90 * canvas.width + 250) * 4 + 1], data[(90 * canvas.width + 250) * 4 + 2]);
}
run();
