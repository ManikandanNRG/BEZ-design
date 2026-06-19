import fs from 'fs';
import { Brian } from '@freesewing/brian';

const sleeveLengthMm = 250;
const sleeveOpeningCirc = 350;
const sweepCirc = 1000;

const pattern = new Brian({
  measurements: {
    biceps: 350, chest: 1000, hpsToBust: 280, hpsToWaistBack: 700, neck: 400,
    shoulderSlope: 13, shoulderToShoulder: 400, waistToArmpit: 200, waistToHips: 200,
    waist: sweepCirc, hips: sweepCirc, shoulderToElbow: sleeveLengthMm * 0.6,
    shoulderToWrist: sleeveLengthMm, wrist: sleeveOpeningCirc,
  },
  options: { sa: 10 },
  locale: 'en'
});

let svg = pattern.draft().render();

// REPLACEMENTS
svg = svg.replace(/plugin-annotations:cut,1,plugin-annotations:onFold,plugin-annotations:from,plugin-annotations:fabric/gi, "Cut 1 on fold");
svg = svg.replace(/plugin-annotations:cut,2,plugin-annotations:mirrored,plugin-annotations:from,plugin-annotations:fabric/gi, "Cut 2 mirrored");
svg = svg.replace(/plugin-annotations:cutOnFoldAndGrainline/gi, "Cut on fold / Grainline");
svg = svg.replace(/plugin-annotations:[^\s<"]+/gi, ""); // Remove any leftover raw keys

svg = svg.replace(/<path[^>]*marker-start="url\(#grainlineFrom\)"[^>]*>/gi, (match) => {
  return match.replace(/d="M\s*([\d.-]+)\s*,\s*([\d.-]+)\s*L\s*([\d.-]+)\s*,\s*([\d.-]+)"/, (dMatch, x1, y1, x2, y2) => {
     const numY1 = parseFloat(y1);
     const numY2 = parseFloat(y2);
     const newY1 = numY1 < numY2 ? numY1 + 30 : numY1 - 30;
     const newY2 = numY2 > numY1 ? numY2 - 30 : numY2 + 30;
     return `d="M ${x1},${newY1} L ${x2},${newY2}"`;
  });
});

svg = svg.replace(/<path[^>]*marker-start="url\(#cutonfoldFrom\)"[^>]*>/gi, (match) => {
  return match.replace(/d="M\s*([\d.-]+)\s*,\s*([\d.-]+)\s*L\s*([\d.-]+)\s*,\s*([\d.-]+)\s*L\s*([\d.-]+)\s*,\s*([\d.-]+)\s*L\s*([\d.-]+)\s*,\s*([\d.-]+)"/, 
  (dMatch, x1, y1, x2, y2, x3, y3, x4, y4) => {
     const numX1 = parseFloat(x1);
     const numX2 = parseFloat(x2);
     const numX4 = parseFloat(x4);
     const newX1 = numX1 < numX2 ? numX1 + 5 : numX1 - 5;
     const newX4 = numX4 < numX2 ? numX4 + 5 : numX4 - 5;
     return `d="M ${newX1},${y1} L ${x2},${y2} L ${x3},${y3} L ${newX4},${y4}"`;
  });
});

svg = svg.replace(/<svg\b[^>]*>/, (match) => match + '<style>.logo, [id*="logo"], [class*="logo"] { display: none !important; } path { fill: none !important; stroke: black !important; stroke-width: 2px !important; } text, tspan, textPath { fill: black !important; stroke: none !important; stroke-width: 0 !important; font-family: sans-serif; font-size: 5px !important; }</style>');

fs.writeFileSync('test_output.svg', svg);
console.log("Done");
