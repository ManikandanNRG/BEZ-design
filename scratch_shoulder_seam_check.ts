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
  
  const sizes = ['s', 'm', 'l', 'xl', 'xxl'];
  
  console.log("=== SHOULDER SEAM COMPATIBILITY CHECK ===\n");
  
  for (const size of sizes) {
    // Extract variables for size
    const { vars, scale } = MeasurementMapper.extract(measurements, size);
    
    // Calculate backShoulderRise
    const backShoulderRiseFormula = '(halfShoulder * 0.019 + (halfChest - halfShoulder) * 0.110)';
    const riseVal = evaluateFormula(backShoulderRiseFormula, vars);
    
    const halfShoulder = vars.halfShoulder;
    const halfNeck = vars.halfNeck;
    const shoulderSlope = vars.shoulderSlope;
    
    // Front shoulder endpoints: (halfNeck, 0) to (halfShoulder, shoulderSlope)
    const frontDX = halfShoulder - halfNeck;
    const frontDY = shoulderSlope;
    const frontLen = Math.sqrt(frontDX * frontDX + frontDY * frontDY);
    
    // Back shoulder endpoints: (halfNeck, 0) to (halfShoulder, shoulderSlope - riseVal)
    const backDX = halfShoulder - halfNeck;
    const backDY = shoulderSlope - riseVal;
    const backLen = Math.sqrt(backDX * backDX + backDY * backDY);
    
    const diff = frontLen - backLen;
    
    // Convert to inches for display
    const scaleToInches = 25.4;
    const halfShoulderIn = halfShoulder / scaleToInches;
    const halfNeckIn = halfNeck / scaleToInches;
    const shoulderSlopeIn = shoulderSlope / scaleToInches;
    const riseIn = riseVal / scaleToInches;
    const frontLenIn = frontLen / scaleToInches;
    const backLenIn = backLen / scaleToInches;
    const diffIn = diff / scaleToInches;
    
    console.log(`Size ${size.toUpperCase()}:`);
    console.log(`  Scale: ${scale === 25.4 ? 'Inches' : 'CM'}`);
    console.log(`  halfShoulder: ${halfShoulderIn.toFixed(4)}" (${halfShoulder.toFixed(2)} mm)`);
    console.log(`  halfNeck: ${halfNeckIn.toFixed(4)}" (${halfNeck.toFixed(2)} mm)`);
    console.log(`  shoulderSlope: ${shoulderSlopeIn.toFixed(4)}" (${shoulderSlope.toFixed(2)} mm)`);
    console.log(`  backShoulderRise: ${riseIn.toFixed(4)}" (${riseVal.toFixed(2)} mm)`);
    console.log(`  Front Shoulder Seam Length: ${frontLenIn.toFixed(4)}" (${frontLen.toFixed(2)} mm)`);
    console.log(`  Back Shoulder Seam Length: ${backLenIn.toFixed(4)}" (${backLen.toFixed(2)} mm)`);
    console.log(`  Difference (Front - Back): ${diffIn.toFixed(4)}" (${diff.toFixed(2)} mm)`);
    console.log("");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
