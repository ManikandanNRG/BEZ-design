import { PrismaClient } from '@prisma/client';
import { MeasurementMapper } from './src/lib/cad/MeasurementMapper';
import { getCubicBezierLength, Point } from './src/lib/cad/CADKernel';

const prisma = new PrismaClient();

// Curvature check
function checkBezierCurvature(p0: Point, p1: Point, p2: Point, p3: Point) {
  const curvatureSigns: number[] = [];
  const segments = 100;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    
    // First derivatives
    const dx = 3*mt*mt*(p1.x - p0.x) + 6*mt*t*(p2.x - p1.x) + 3*t*t*(p3.x - p2.x);
    const dy = 3*mt*mt*(p1.y - p0.y) + 6*mt*t*(p2.y - p1.y) + 3*t*t*(p3.y - p2.y);
    
    // Second derivatives
    const ddx = 6*mt*(p2.x - 2*p1.x + p0.x) + 6*t*(p3.x - 2*p2.x + p1.x);
    const ddy = 6*mt*(p2.y - 2*p1.y + p0.y) + 6*t*(p3.y - 2*p2.y + p1.y);
    
    const numerator = dx * ddy - dy * ddx;
    const denominator = Math.pow(dx * dx + dy * dy, 1.5);
    
    if (denominator > 1e-8) {
      const kappa = numerator / denominator;
      curvatureSigns.push(kappa);
    }
  }
  
  const signs = curvatureSigns.map(k => Math.sign(k));
  const uniqueSigns = [...new Set(signs.filter(s => s !== 0))];
  const hasInflection = uniqueSigns.length > 1;
  
  return {
    hasInflection,
    minCurvature: Math.min(...curvatureSigns),
    maxCurvature: Math.max(...curvatureSigns),
    uniqueSigns
  };
}

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
  
  // Size M
  const { vars } = MeasurementMapper.extract(measurements, 'm');
  const S = 25.4;
  
  const halfShoulder = vars.halfShoulder;
  const halfNeck = vars.halfNeck;
  const shoulderSlope = vars.shoulderSlope;
  const halfChest = vars.halfChest;
  const acrossFront = vars.acrossFront;
  const acrossBack = vars.acrossBack;
  const armholeStraight = 8.5 * S; // standard fallback armholeStraight in mm

  console.log("=== STUDY: REMOVING BACK SHOULDER RISE (SETTING BSR = 0) ===\n");

  // 1. Current reference with bsr
  const bsrVal = halfShoulder * 0.019 + (halfChest - halfShoulder) * 0.110;
  
  // Front armhole
  const fp0 = { x: halfShoulder, y: shoulderSlope };
  const fp1 = { x: acrossFront - (halfChest - acrossFront) * 0.60, y: shoulderSlope + (armholeStraight - shoulderSlope) * 0.70 };
  const fp2 = { x: halfChest - (halfChest - acrossFront) * 0.37, y: armholeStraight - (halfChest - acrossFront) * 0.37 * Math.tan(8 * Math.PI / 180) };
  const fp3 = { x: halfChest, y: armholeStraight };
  const frontAH = getCubicBezierLength(fp0, fp1, fp2, fp3);

  // Back armhole current (with bsr)
  const bp0_curr = { x: halfShoulder, y: shoulderSlope - bsrVal };
  const bp1_curr = { x: halfShoulder - (halfShoulder - acrossBack) * 0.57, y: bp0_curr.y + (armholeStraight - bp0_curr.y) * 0.12 };
  const bp2_curr = { x: acrossBack - (halfChest - acrossBack) * 0.50, y: armholeStraight - (halfChest - acrossBack) * 1.50 * Math.tan(5 * Math.PI / 180) };
  const bp3_curr = { x: halfChest, y: armholeStraight };
  const backAH_curr = getCubicBezierLength(bp0_curr, bp1_curr, bp2_curr, bp3_curr);

  console.log("Current (Reference):");
  console.log(`  Front AH: ${(frontAH/S).toFixed(4)}"`);
  console.log(`  Back AH:  ${(backAH_curr/S).toFixed(4)}"`);
  console.log(`  Diff (Back - Front): ${((backAH_curr - frontAH)/S).toFixed(4)}"`);
  console.log("");

  // 2. Scenario 1: bsr = 0, no other formula changes
  // In this case, bp0.y becomes shoulderSlope, and bp1.y is updated accordingly.
  const bp0_s1 = { x: halfShoulder, y: shoulderSlope };
  const bp1_s1 = { x: halfShoulder - (halfShoulder - acrossBack) * 0.57, y: bp0_s1.y + (armholeStraight - bp0_s1.y) * 0.12 };
  const bp2_s1 = bp2_curr; // bp2 doesn't depend on bsr
  const bp3_s1 = bp3_curr;
  
  const backAH_s1 = getCubicBezierLength(bp0_s1, bp1_s1, bp2_s1, bp3_s1);
  const diff_s1 = backAH_s1 - frontAH;
  const curv_s1 = checkBezierCurvature(bp0_s1, bp1_s1, bp2_s1, bp3_s1);

  console.log("Scenario 1: Set BSR = 0 (Unmodified Back AH Formulas):");
  console.log(`  Front Shoulder Length: ${(Math.hypot(halfShoulder - halfNeck, shoulderSlope)/S).toFixed(4)}"`);
  console.log(`  Back Shoulder Length:  ${(Math.hypot(halfShoulder - halfNeck, shoulderSlope)/S).toFixed(4)}" (Identical)`);
  console.log(`  Front AH: ${(frontAH/S).toFixed(4)}"`);
  console.log(`  Back AH:  ${(backAH_s1/S).toFixed(4)}"`);
  console.log(`  Diff (Back - Front): ${(diff_s1/S).toFixed(4)}"`);
  console.log(`  Monotonic / No Inflection: ${!curv_s1.hasInflection ? 'YES' : 'NO'}`);
  console.log("");

  // 3. Let's see: what if the difference is outside the 0.08" to 0.15" target?
  // The current diff is 0.1339" (within 0.08" to 0.15").
  // Let's see what the diff is in Scenario 1: diff_s1/S is 0.1060" or something? Let's check the run.
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
