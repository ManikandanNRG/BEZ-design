import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

async function run() {
  const img = await loadImage('output.png');
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const width = canvas.width;
  
  const getPixel = (x, y) => {
    const i = (y * width + x) * 4;
    return `[${x},${y}] R:${data[i]} G:${data[i+1]} B:${data[i+2]} A:${data[i+3]}`;
  }
  
  // Background (0,0)
  console.log('Top Left BG:', getPixel(0, 0));
  
  // Neck Label (around x=250, y=90)
  console.log('Neck Tag:', getPixel(250, 90));

  // T-Shirt Center (250, 250)
  console.log('Center:', getPixel(250, 250));
  
  // T-Shirt Shoulder Edge (around x=120, y=140)
  console.log('Left Shoulder:', getPixel(120, 140));
  
  // Let's find some edge pixels that might be dark shadow halos
  for(let x=100; x<130; x++) {
      const i = (140 * width + x) * 4;
      if (data[i+3] > 0 && data[i+3] < 255) {
          console.log(`Semi-transparent Edge Halo at x=${x}:`, getPixel(x, 140));
      } else if (data[i+3] === 255 && data[i] < 251) { // 251 is my red color wait, orange #fb923c is 251, 146, 60
          // console.log(`Opaque shadow at x=${x}:`, getPixel(x, 140));
      }
  }
}
run();
