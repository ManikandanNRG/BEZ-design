import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

async function run() {
  const img = await loadImage('crew.png');
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  const width = canvas.width;
  const height = canvas.height;
  const visited = new Uint8Array(width * height);
  const stack = [0]; 
  
  const isBg = (idx) => data[idx] > 245 && data[idx+1] > 245 && data[idx+2] > 245;
  
  while(stack.length > 0) {
     const pos = stack.pop();
     if(visited[pos]) continue;
     visited[pos] = 1;
     
     const idx = pos * 4;
     data[idx+3] = 0;
     
     const x = pos % width;
     const y = Math.floor(pos / width);
     
     if (x > 0 && !visited[pos - 1] && isBg((pos - 1) * 4)) stack.push(pos - 1);
     if (x < width - 1 && !visited[pos + 1] && isBg((pos + 1) * 4)) stack.push(pos + 1);
     if (y > 0 && !visited[pos - width] && isBg((pos - width) * 4)) stack.push(pos - width);
     if (y < height - 1 && !visited[pos + width] && isBg((pos + width) * 4)) stack.push(pos + width);
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  // Count transparent pixels
  let trans = 0;
  for(let i=0; i<data.length; i+=4) if(data[i+3]===0) trans++;
  console.log("Transparent pixels after flood fill:", trans);
}
run();
