import * as XLSX from 'xlsx';
import * as fs from 'fs';

function main() {
  const filePath = 'd:/kilo/BEZ-TECH/WITS-1220  CREW  NECK HALFSLEEVE TEE.xlsx';
  const buf = fs.readFileSync(filePath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  console.log("wb.Workbook:", JSON.stringify(wb.Workbook, null, 2));
}

main();
