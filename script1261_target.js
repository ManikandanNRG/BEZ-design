const fs = require('fs');
const lines = fs.readFileSync('C:\\Users\\nrgma\\.gemini\\antigravity-ide\\brain\\8217c3d8-10ce-4726-baa4-f7bcf6c55974\\.system_generated\\logs\\transcript.jsonl', 'utf8').split('\n');
const tools = lines.filter(l => l.includes('"step_index":1261') && l.includes('multi_replace'));
if (tools.length > 0) {
  const step = JSON.parse(tools[0]);
  const tc = step.tool_calls.find(t => t.name === 'multi_replace_file_content');
  const chunks = JSON.parse(tc.args.ReplacementChunks);
  fs.writeFileSync('scratch_1261_target.txt', chunks[0].TargetContent);
  console.log('Written to scratch_1261_target.txt');
}
