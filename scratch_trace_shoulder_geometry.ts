import { PrismaClient } from '@prisma/client';
import { MeasurementMapper } from './src/lib/cad/MeasurementMapper';
import { evaluateFormula } from './src/lib/cad/CADKernel';

const prisma = new PrismaClient();

async function main() {
  const tp = await prisma.techPack.findUnique({
    where: { id: "ccdc50cf-0ec1-4d0a-b75d-284624e0e9c7" }
  });
  if (!tp) {
    console.log("No tech pack found.");
    return;
  }
  const data = JSON.parse(tp.jsonData || "{}");
  const measurements = data.measurements || [];
  
  // Extract Size M variables
  const { vars } = MeasurementMapper.extract(measurements, 'm');
  
  const scaleToInches = 25.4;
  
  // Standard (Un-eased) values
  const halfShoulder = vars.halfShoulder;
  const halfNeck = vars.halfNeck;
  const shoulderSlope = vars.shoulderSlope;
  const halfChest = vars.halfChest; // 39.5" / 4 = 9.875" (in mm: 250.825)
  
  // Eased values
  const EASE_IN = 2.0; // 2 inches
  const halfChestE = halfChest + EASE_IN * scaleToInches * 0.25; // 10.375" (in mm: 263.525)

  const printCase = (caseName: string, hChest: number) => {
    const tempVars = { ...vars, halfChest: hChest };
    const backShoulderRiseFormula = '(halfShoulder * 0.019 + (halfChest - halfShoulder) * 0.110)';
    const riseVal = evaluateFormula(backShoulderRiseFormula, tempVars);
    
    // Front Neck point (end of front neck curve): (halfNeck, 0)
    const fNP = { x: halfNeck, y: 0 };
    // Front Shoulder tip: (halfShoulder, shoulderSlope)
    const fST = { x: halfShoulder, y: shoulderSlope };
    
    // Back Neck point (end of back neck curve): (halfNeck, 0)
    const bNP = { x: halfNeck, y: 0 };
    // Back Shoulder tip: (halfShoulder, shoulderSlope - riseVal)
    const bST = { x: halfShoulder, y: shoulderSlope - riseVal };
    
    // Lengths
    const fLen = Math.hypot(fST.x - fNP.x, fST.y - fNP.y);
    const bLen = Math.hypot(bST.x - bNP.x, bST.y - bNP.y);
    const diff = fLen - bLen;

    // With riseVal = 0
    const bST_noRise = { x: halfShoulder, y: shoulderSlope };
    const bLen_noRise = Math.hypot(bST_noRise.x - bNP.x, bST_noRise.y - bNP.y);
    
    console.log(`--- ${caseName} ---`);
    console.log(`  Variables (in inches):`);
    console.log(`    halfShoulder: ${(halfShoulder/scaleToInches).toFixed(4)}"`);
    console.log(`    halfNeck: ${(halfNeck/scaleToInches).toFixed(4)}"`);
    console.log(`    shoulderSlope: ${(shoulderSlope/scaleToInches).toFixed(4)}"`);
    console.log(`    halfChest: ${(hChest/scaleToInches).toFixed(4)}"`);
    console.log(`    backShoulderRise: ${(riseVal/scaleToInches).toFixed(4)}"`);
    console.log("");
    console.log(`  1. Front Neck Point:    (${ (fNP.x/scaleToInches).toFixed(4) }", ${ (fNP.y/scaleToInches).toFixed(4) }")  [${fNP.x.toFixed(2)} mm, ${fNP.y.toFixed(2)} mm]`);
    console.log(`  2. Front Shoulder Tip:  (${ (fST.x/scaleToInches).toFixed(4) }", ${ (fST.y/scaleToInches).toFixed(4) }")  [${fST.x.toFixed(2)} mm, ${fST.y.toFixed(2)} mm]`);
    console.log(`  3. Back Neck Point:     (${ (bNP.x/scaleToInches).toFixed(4) }", ${ (bNP.y/scaleToInches).toFixed(4) }")  [${bNP.x.toFixed(2)} mm, ${bNP.y.toFixed(2)} mm]`);
    console.log(`  4. Back Shoulder Tip:   (${ (bST.x/scaleToInches).toFixed(4) }", ${ (bST.y/scaleToInches).toFixed(4) }")  [${bST.x.toFixed(2)} mm, ${bST.y.toFixed(2)} mm]`);
    console.log("");
    console.log(`  5. Front Shoulder Seam Length: ${ (fLen/scaleToInches).toFixed(4) }" (${fLen.toFixed(2)} mm)`);
    console.log(`  6. Back Shoulder Seam Length:  ${ (bLen/scaleToInches).toFixed(4) }" (${bLen.toFixed(2)} mm)`);
    console.log(`     Difference (Front - Back):  ${ (diff/scaleToInches).toFixed(4) }" (${diff.toFixed(2)} mm)`);
    console.log("");
    console.log(`  If BackShoulderRise were removed entirely (BackShoulderRise = 0):`);
    console.log(`    Front Shoulder Seam Length: ${ (fLen/scaleToInches).toFixed(4) }" (${fLen.toFixed(2)} mm)`);
    console.log(`    Back Shoulder Seam Length:  ${ (bLen_noRise/scaleToInches).toFixed(4) }" (${bLen_noRise.toFixed(2)} mm)`);
    console.log(`    Difference:                 ${ ((fLen - bLen_noRise)/scaleToInches).toFixed(4) }" (0.00 mm)`);
    console.log("");
  };

  console.log("=== GEOMETRIC TRACE FOR SIZE M ===\n");
  printCase("CASE A: Un-eased (Pure Spec) Geometry", halfChest);
  printCase("CASE B: Eased Geometry (with 2.0\" chest ease)", halfChestE);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
