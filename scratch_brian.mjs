import { Brian } from '@freesewing/brian';
import fs from 'fs';

const pattern = new Brian({
  measurements: {
    biceps: 350,
    chest: 1000, 
    hpsToBust: 280, 
    hpsToWaistBack: 700, 
    neck: 400,
    shoulderSlope: 13, 
    shoulderToShoulder: 400,
    waistToArmpit: 200, 
    waistToHips: 200,
    waist: 1000,
    hips: 1000,
    shoulderToElbow: 300,
    shoulderToWrist: 600,
    wrist: 200,
  },
  options: {
     sa: 10,
  },
  locale: 'en'
});

const svg = pattern.draft().render();
fs.writeFileSync('scratch_brian.svg', svg);
console.log("Done");
