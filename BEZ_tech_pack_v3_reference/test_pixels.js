import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

async function run() {
  const img = await loadImage('crew.png');
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  
  let opaqueWhite = 0;
  let opaqueNotWhite = 0;
  let transparentPixels = 0;
  
  for (let i = 0; i < data.length; i += 4) {
     if (data[i+3] === 255) {
         if (data[i] === 255 && data[i+1] === 255 && data[i+2] === 255) {
             opaqueWhite++;
         } else {
             opaqueNotWhite++;
         }
     } else {
         transparentPixels++;
     }
  }
  
  console.log({ opaqueWhite, opaqueNotWhite, transparentPixels });
}
run();
