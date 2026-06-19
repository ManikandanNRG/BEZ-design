const fs = require('fs');
const svg = fs.readFileSync('test_output.svg', 'utf8');
const match1 = svg.match(/<marker[^>]*id="cutonfoldFrom"[^>]*>/);
const match2 = svg.match(/<marker[^>]*id="cutonfoldTo"[^>]*>/);
console.log(match1 ? match1[0] : 'not found 1');
console.log(match2 ? match2[0] : 'not found 2');
