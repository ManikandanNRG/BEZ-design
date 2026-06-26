import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const prisma = new PrismaClient();

function parseMeasurement(val: any): string {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

async function main() {
  const filePath = 'd:/kilo/BEZ-TECH/WITS-1220  CREW  NECK HALFSLEEVE TEE.xlsx';
  if (!fs.existsSync(filePath)) {
    console.error("Excel file does not exist at:", filePath);
    return;
  }
  
  const buf = fs.readFileSync(filePath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const name = 'PPS';
  const ws = wb.Sheets[name];
  if (!ws) {
    console.error(`Sheet ${name} not found in Excel!`);
    return;
  }
  
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
  
  // Find header row
  let headerRowIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    let hasSr = false;
    let hasDesc = false;
    for (const cell of row) {
      const val = String(cell || '').toLowerCase().trim();
      if (val === 'sr no' || val === 'sr.no' || val === 'sr. no' || val === 'sr' || val === 'sr.') hasSr = true;
      if (val.includes('description') || val === 'desc' || val.includes('point of measurement') || val.includes('pom') || val.includes('point of measure')) hasDesc = true;
    }
    if (hasSr && hasDesc) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    console.error("Header row not found!");
    return;
  }

  const headers = rows[headerRowIndex];
  let colMap: Record<string, number> = {};
  let sizeColIndices: { name: string, index: number }[] = [];

  for (let c = 0; c < headers.length; c++) {
    const h = String(headers[c] || '').trim();
    if (!h) continue;
    const hl = h.toLowerCase();
    
    if (hl === 'sr no' || hl.includes('sr.') || hl === 'sr') colMap['srNo'] = c;
    else if (hl.includes('desc') || hl.includes('point of measurement') || hl.includes('pom') || hl.includes('point of measure')) colMap['description'] = c;
    else if (hl.includes('tol')) colMap['tol'] = c;
    else if (hl.includes('grade')) colMap['grade'] = c;
    else {
      // Don't include empty or SAMPLE columns as standard size columns
      if (hl !== 'sample' && hl !== '') {
        sizeColIndices.push({ name: hl, index: c });
      }
    }
  }

  const newMeasurements: any[] = [];
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    const srNo = colMap['srNo'] !== undefined ? String(row[colMap['srNo']] || '') : '';
    const description = colMap['description'] !== undefined ? String(row[colMap['description']] || '') : '';
    if (!srNo && !description) continue;
    
    // Skip comment lines
    if (description.includes("PP COMMENTED") || description.includes("APPROVED WITH COMMENTS")) {
      continue;
    }
    // Skip rows that are empty of size measurements
    let hasSizes = false;
    for (const sc of sizeColIndices) {
      if (row[sc.index] !== undefined && row[sc.index] !== null && String(row[sc.index]).trim() !== '') {
        hasSizes = true;
      }
    }
    if (!hasSizes) continue;

    const item: any = {
      id: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
      srNo,
      description,
      tol: colMap['tol'] !== undefined ? String(row[colMap['tol']] || '') : '',
      grade: colMap['grade'] !== undefined ? String(row[colMap['grade']] || '') : '',
    };
    
    for (const sc of sizeColIndices) {
      item[sc.name] = parseMeasurement(row[sc.index]);
    }
    
    newMeasurements.push(item);
  }

  console.log(`Successfully mapped ${newMeasurements.length} measurements.`);

  const techpackId = '63bf4bbc-8e53-46d6-98cd-e3cacb7ed1e3';
  const techPack = await prisma.techPack.findUnique({
    where: { id: techpackId }
  });

  if (techPack) {
    console.log("Found techpack in DB!");
    const currentData = JSON.parse(techPack.jsonData || '{}');
    
    // Update measurements, style details
    currentData.measurements = newMeasurements;
    currentData.styleNo = "WITS-1220";
    currentData.styleName = "CREW NECK HALFSLEEVE TEE";
    currentData.description = "CREW NECK HALF SLEEVE T-SHIRT";
    currentData.brand = "WROGN";
    currentData.sizeRange = "S - M - L - XL - XXL";
    currentData.sizeColumns = ["S", "M", "L", "XL", "XXL"];
    
    await prisma.techPack.update({
      where: { id: techpackId },
      data: {
        jsonData: JSON.stringify(currentData)
      }
    });
    console.log("Successfully updated techpack in database with the Excel measurements.");
  } else {
    console.error("Techpack not found in database for ID:", techpackId);
  }
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
