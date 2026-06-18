const fs = require('fs');
const lines = fs.readFileSync('C:\\Users\\nrgma\\.gemini\\antigravity-ide\\brain\\8217c3d8-10ce-4726-baa4-f7bcf6c55974\\.system_generated\\logs\\transcript.jsonl', 'utf8').split('\n');
const tools = lines.filter(l => l.includes('"step_index":1261') && l.includes('multi_replace'));
if (tools.length > 0) {
  const tc = JSON.parse(tools[0]).tool_calls[0];
  const chunks = JSON.parse(tc.args.ReplacementChunks);
  fs.writeFileSync('scratch_old.txt', chunks[0].TargetContent);
  console.log('Written to scratch_old.txt');
}
