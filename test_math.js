const fs = require('fs');
const svg = fs.readFileSync('test_output.svg', 'utf8');
const match = svg.match(/<path[^>]*marker-start="url\(#cutonfoldFrom\)"[^>]*>/g);
console.log(match);
