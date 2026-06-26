import * as XLSX from 'xlsx';
import * as fs from 'fs';

function main() {
  const filePath = 'd:/kilo/BEZ-TECH/WITS-1220  CREW  NECK HALFSLEEVE TEE.xlsx';
  const buf = fs.readFileSync(filePath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const name = 'PPS';
  console.log(`--- Sheet: ${name} ---`);
  const ws = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row && row.length > 0) {
      console.log(`Row ${i}:`, JSON.stringify(row));
    }
  }
}

main();
