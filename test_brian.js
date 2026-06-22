const { Brian } = require('@freesewing/brian');
const fs = require('fs');

const lengthMm = 27.5 * 25.4; // 698.5
const chestCirc = 39.5 * 25.4; // 1003.3
const shoulderFlat = 16.25 * 25.4; // 412.75
const neckCirc = 8.5 * 25.4 * 2.2; // 475
const armholeCircMm = 19.375 * 25.4; // 492.125
const armholeDepthMm = (armholeCircMm / 2) * 0.85; // 209.15
const waistToArmpit = Math.max(100, lengthMm - armholeDepthMm); // 489.35
const sweepCirc = 37.75 * 25.4; // 958.85
const bicepCirc = 14.5 * 25.4; // 368.3
const sleeveLengthMm = 25.5 * 25.4; // 647.7
const sleeveOpeningCirc = 8.5 * 25.4; // 215.9

const pattern = new Brian({
  measurements: {
    biceps: bicepCirc,
    chest: chestCirc, 
    hpsToBust: lengthMm * 0.4, 
    hpsToWaistBack: lengthMm, 
    neck: neckCirc,
    shoulderSlope: 13, 
    shoulderToShoulder: shoulderFlat,
    waistToArmpit: waistToArmpit, 
    waistToHips: 200, 
    waist: sweepCirc,
    hips: sweepCirc,
    shoulderToElbow: sleeveLengthMm * 0.6, 
    shoulderToWrist: sleeveLengthMm, 
    wrist: sleeveOpeningCirc, 
  },
  options: {
     sa: 10, 
  },
  locale: 'en'
});

const rawSvg = pattern.draft().render();
fs.writeFileSync('test_output.svg', rawSvg);
console.log('Done');
