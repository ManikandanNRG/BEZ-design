import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

async function run() {
  const img = await loadImage('crew.png');
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  let color = '#fb923c';
  let tr = parseInt(color.slice(1, 3), 16);
  let tg = parseInt(color.slice(3, 5), 16);
  let tb = parseInt(color.slice(5, 7), 16);
  
  for (let i = 0; i < data.length; i += 4) {
      if (data[i] === 255 && data[i+1] === 255 && data[i+2] === 255 && data[i+3] === 255) {
          // Background - make it transparent
          data[i+3] = 0;
      } else {
          // Inside the t-shirt (or the tag). Composite it OVER the target color.
          // Alpha blending formula:
          // Result = Foreground * (A) + Background * (1 - A)
          const a = data[i+3] / 255;
          data[i] = Math.round(data[i] * a + tr * (1 - a));
          data[i+1] = Math.round(data[i+1] * a + tg * (1 - a));
          data[i+2] = Math.round(data[i+2] * a + tb * (1 - a));
          data[i+3] = 255; // make fully opaque
      }
  }
  
  ctx.putImageData(imageData, 0, 0);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('output-composite.png', buffer);
}
run();
