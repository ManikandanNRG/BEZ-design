const fs = require('fs');

let svg = `
<path marker-start="url(#cutonfoldFrom)" marker-end="url(#cutonfoldTo)" d="M 0,106.24 L 15,106.24 L 15,858.22 L 0,858.22" />
<path marker-start="url(#cutonfoldFrom)" marker-end="url(#cutonfoldTo)" d="M 200,106.24 L 185,106.24 L 185,858.22 L 200,858.22" />
<path marker-start="url(#grainlineFrom)" d="M 0,-175 L 0,-9" />
`;

svg = svg.replace(/<path[^>]*marker-start="url\(#grainlineFrom\)"[^>]*>/gi, (match) => {
  return match.replace(/d="M\s*([\d.-]+)\s*,\s*([\d.-]+)\s*L\s*([\d.-]+)\s*,\s*([\d.-]+)"/, (dMatch, x1, y1, x2, y2) => {
     const numY1 = parseFloat(y1);
     const numY2 = parseFloat(y2);
     const length = Math.abs(numY2 - numY1);
     
     let topY = Math.min(numY1, numY2);
     let bottomY = Math.max(numY1, numY2);
     
     let newTopY = topY + (length * 0.2); // Pull down from top by 20%
     let newBottomY = bottomY - (length * 0.4); // Pull up from bottom by 40%
     
     const newY1 = numY1 === topY ? newTopY : newBottomY;
     const newY2 = numY2 === bottomY ? newBottomY : newTopY;
     
     return `d="M ${x1},${newY1} L ${x2},${newY2}"`;
  });
});

svg = svg.replace(/<path[^>]*marker-start="url\(#cutonfoldFrom\)"[^>]*>/gi, (match) => {
  return match.replace(/d="M\s*([\d.-]+)\s*,\s*([\d.-]+)\s*L\s*([\d.-]+)\s*,\s*([\d.-]+)\s*L\s*([\d.-]+)\s*,\s*([\d.-]+)\s*L\s*([\d.-]+)\s*,\s*([\d.-]+)"/, 
  (dMatch, x1, y1, x2, y2, x3, y3, x4, y4) => {
     const numX1 = parseFloat(x1);
     const numX2 = parseFloat(x2);
     const numX4 = parseFloat(x4);
     
     // To avoid flipping the line direction, padding MUST be less than |x2 - x1|
     // FreeSewing's default cut-on-fold legs are 15mm long. 
     // We pull them in by 10mm, leaving a 5mm segment, which perfectly preserves direction!
     const padding = 10; 
     
     const newX1 = numX1 < numX2 ? numX1 + padding : numX1 - padding;
     const newX4 = numX4 < numX2 ? numX4 + padding : numX4 - padding;
     return `d="M ${newX1},${y1} L ${x2},${y2} L ${x3},${y3} L ${newX4},${y4}"`;
  });
});

console.log(svg);
