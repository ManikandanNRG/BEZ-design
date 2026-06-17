import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

async function run() {
  const img = await loadImage('crew.png');
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height).data;
  
  const getPixel = (x, y) => {
    const idx = (y * img.width + x) * 4;
    return `R:${imageData[idx]} G:${imageData[idx+1]} B:${imageData[idx+2]} A:${imageData[idx+3]}`;
  }
  
  console.log('Top Left:', getPixel(0, 0));
  console.log('Top Right:', getPixel(img.width - 1, 0));
  console.log('Bottom Left:', getPixel(0, img.height - 1));
}

run().catch(console.error);
