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

svg = svg.replace(
  /(<marker[^>]*id="cutonfoldFrom"[^>]*>)([\s\S]*?)(<\/marker>)/gi,
  (match, open, inner, close) => {
    // Changed to L -5,-2 to point LEFT (towards the fold)
    const newInner = inner.replace(/d="[^"]+"/, 'd="M 0,0 L -5,-2 C -4,-1 -4,1 -5,2 z"');
    return open.replace(/markerWidth="\d+"/, 'markerWidth="5"') + newInner + close;
  }
);

svg = svg.replace(
  /(<marker[^>]*id="cutonfoldTo"[^>]*>)([\s\S]*?)(<\/marker>)/gi,
  (match, open, inner, close) => {
    const newInner = inner.replace(/d="[^"]+"/, 'd="M 0,0 L -5,-2 C -4,-1 -4,1 -5,2 z"');
    return open.replace(/markerWidth="\d+"/, 'markerWidth="5"') + newInner + close;
  }
);

// Also scale down grainline arrows
svg = svg.replace(
  /(<marker[^>]*id="grainlineFrom"[^>]*>)([\s\S]*?)(<\/marker>)/gi,
  (match, open, inner, close) => {
    const newInner = inner.replace(/d="[^"]+"/, 'd="M -5,0 L 1,-2 C 0,-1 0,1 1,2 z"');
    return open.replace(/markerWidth="\d+"/, 'markerWidth="6"') + newInner + close;
  }
);

svg = svg.replace(
  /(<marker[^>]*id="grainlineTo"[^>]*>)([\s\S]*?)(<\/marker>)/gi,
  (match, open, inner, close) => {
    const newInner = inner.replace(/d="[^"]+"/, 'd="M 5,0 L -1,-2 C 0,-1 0,1 -1,2 z"');
    return open.replace(/markerWidth="\d+"/, 'markerWidth="6"') + newInner + close;
  }
);

svg = svg.replace(/<svg\b[^>]*>/, (match) => match + '<style>.logo, [id*="logo"], [class*="logo"] { display: none !important; } path { fill: none !important; stroke: black !important; stroke-width: 2px !important; } text, tspan, textPath { fill: black !important; stroke: none !important; stroke-width: 0 !important; font-family: sans-serif; font-size: 5px !important; }</style>');

fs.writeFileSync('test_output.svg', svg);
console.log("Done");
