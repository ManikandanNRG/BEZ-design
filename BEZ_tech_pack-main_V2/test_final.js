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
  let r = parseInt(color.slice(1, 3), 16);
  let g = parseInt(color.slice(3, 5), 16);
  let b = parseInt(color.slice(5, 7), 16);
  
  const width = canvas.width;
  const height = canvas.height;
  const visited = new Uint8Array(width * height);
  const stack = [0, width - 1, (height - 1) * width, height * width - 1]; // Start from 4 corners
  
  const isBg = (idx) => data[idx+3] > 200 && data[idx] > 240 && data[idx+1] > 240 && data[idx+2] > 240;
  
  while(stack.length > 0) {
     const pos = stack.pop();
     if(visited[pos]) continue;
     visited[pos] = 1;
     
     const idx = pos * 4;
     data[idx+3] = 0; // make transparent
     
     const x = pos % width;
     const y = Math.floor(pos / width);
     
     if (x > 0 && !visited[pos - 1] && isBg((pos - 1) * 4)) stack.push(pos - 1);
     if (x < width - 1 && !visited[pos + 1] && isBg((pos + 1) * 4)) stack.push(pos + 1);
     if (y > 0 && !visited[pos - width] && isBg((pos - width) * 4)) stack.push(pos - width);
     if (y < height - 1 && !visited[pos + width] && isBg((pos + width) * 4)) stack.push(pos + width);
  }

  for (let i = 0; i < data.length; i += 4) {
      if (data[i+3] > 0) {
          const pr = data[i];
          const pg = data[i+1];
          const pb = data[i+2];
          const a = data[i+3] / 255;
          data[i] = Math.round(pr * a + r * (1 - a));
          data[i+1] = Math.round(pg * a + g * (1 - a));
          data[i+2] = Math.round(pb * a + b * (1 - a));
          data[i+3] = 255; // make fully opaque
      }
  }
  
  ctx.putImageData(imageData, 0, 0);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('output-final.png', buffer);
}
run();
