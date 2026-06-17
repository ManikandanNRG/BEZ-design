import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

async function run() {
  const img = await loadImage('output-composite.png');
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const width = canvas.width;
  
  const getPixel = (x, y) => {
    const i = (y * width + x) * 4;
    return `[${x},${y}] R:${data[i]} G:${data[i+1]} B:${data[i+2]} A:${data[i+3]}`;
  }
  
  console.log('Top Left BG:', getPixel(0, 0));
  console.log('Neck Tag:', getPixel(250, 90));
  console.log('Center:', getPixel(250, 250));
  console.log('Edge of shoulder:', getPixel(125, 140));
}
run();
