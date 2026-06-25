import { PrismaClient } from '@prisma/client';
import { MeasurementMapper } from './src/lib/cad/MeasurementMapper';
import { getCubicBezierLength, solveSleeveCapHeight, Point } from './src/lib/cad/CADKernel';

const prisma = new PrismaClient();

// Curvature check
function checkBezierCurvature(p0: Point, p1: Point, p2: Point, p3: Point) {
  const curvatureSigns: number[] = [];
  const segments = 100;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    const dx = 3*mt*mt*(p1.x - p0.x) + 6*mt*t*(p2.x - p1.x) + 3*t*t*(p3.x - p2.x);
    const dy = 3*mt*mt*(p1.y - p0.y) + 6*mt*t*(p2.y - p1.y) + 3*t*t*(p3.y - p2.y);
    const ddx = 6*mt*(p2.x - 2*p1.x + p0.x) + 6*t*(p3.x - 2*p2.x + p1.x);
    const ddy = 6*mt*(p2.y - 2*p1.y + p0.y) + 6*t*(p3.y - 2*p2.y + p1.y);
    const numerator = dx * ddy - dy * ddx;
    const denominator = Math.pow(dx * dx + dy * dy, 1.5);
    if (denominator > 1e-8) {
      curvatureSigns.push(numerator / denominator);
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

function parseMeasurement(val: any): number | null {
  if (!val) return null;
  val = String(val).trim();
  let result = 0;
  if (val.includes(' ')) {
    const parts = val.split(' ');
    if (parts.length === 2 && parts[1].includes('/')) {
      result += parseFloat(parts[0]);
      val = parts[1];
    }
  }
  if (val.includes('/')) {
    const parts = val.split('/');
    result += parseFloat(parts[0]) / parseFloat(parts[1]);
  } else {
    const num = parseFloat(val);
    if (!isNaN(num)) result += num;
  }
  return result > 0 ? result : null;
}

async function runValidation(useEase: boolean) {
  const tp = await prisma.techPack.findUnique({
    where: { id: "ccdc50cf-0ec1-4d0a-b75d-284624e0e9c7" }
  });
  if (!tp) return;
  const data = JSON.parse(tp.jsonData || "{}");
  const measurements = data.measurements || [];
  
  const sizes = ['xs', 's', 'm', 'l', 'xl', 'xxl'];
  const S = 25.4;
  
  // Hand-grade XS in measurements array
  const gradedMeasurements = measurements.map((m: any) => {
    const item = { ...m };
    if (!item.xs || String(item.xs).trim() === '') {
      const sVal = parseMeasurement(item.s);
      const mVal = parseMeasurement(item.m);
      const gradeVal = parseMeasurement(item.grade);
      const diff = gradeVal !== null ? gradeVal : (mVal !== null && sVal !== null ? mVal - sVal : 0);
      if (sVal !== null) {
        item.xs = String(sVal - diff);
      }
    }
    return item;
  });
  
  console.log(`================================================================`);
  console.log(`VALIDATION STUDY: BSR = 0 & Option 2 Shifts (Ease: ${useEase ? '2.0" Added' : 'None'})`);
  console.log(`================================================================`);
  
  let allPassed = true;

  for (const size of sizes) {
    const { vars } = MeasurementMapper.extract(gradedMeasurements, size);
    
    let halfChest = vars.halfChest;
    let halfBicep = vars.halfBicep;
    
    if (useEase) {
      halfChest += 2.0 * S * 0.25; // 0.5 inches added to halfChest
      halfBicep += 2.0 * S * 0.1;  // 0.2 inches added to halfBicep
    }
    
    const halfShoulder = vars.halfShoulder;
    const halfNeck = vars.halfNeck;
    const shoulderSlope = vars.shoulderSlope;
    const acrossFront = vars.acrossFront;
    const acrossBack = vars.acrossBack;
    const armholeStraight = 8.5 * S;
    
    // Front Shoulder Length
    const frontDX = halfShoulder - halfNeck;
    const frontDY = shoulderSlope;
    const fShldLen = Math.sqrt(frontDX * frontDX + frontDY * frontDY);
    
    // Back Shoulder Length (BSR = 0)
    const backDX = halfShoulder - halfNeck;
    const backDY = shoulderSlope; // BSR = 0
    const bShldLen = Math.sqrt(backDX * backDX + backDY * backDY);
    
    // Front Armhole Points
    const fp0 = { x: halfShoulder, y: shoulderSlope };
    const fp1 = { x: acrossFront - (halfChest - acrossFront) * 0.60, y: shoulderSlope + (armholeStraight - shoulderSlope) * 0.70 };
    const fp2 = { x: halfChest - (halfChest - acrossFront) * 0.37, y: armholeStraight - (halfChest - acrossFront) * 0.37 * Math.tan(8 * Math.PI / 180) };
    const fp3 = { x: halfChest, y: armholeStraight };
    const frontAH = getCubicBezierLength(fp0, fp1, fp2, fp3);
    
    // Back Armhole Points with Option 2 Shifts (dx1 = -0.33", dx2 = -0.40")
    const bp0 = { x: halfShoulder, y: shoulderSlope }; // BSR = 0
    const bp1_base_x = halfShoulder - (halfShoulder - acrossBack) * 0.57;
    const bp1_base_y = bp0.y + (armholeStraight - bp0.y) * 0.12;
    const bp1 = { x: bp1_base_x - 0.33 * S, y: bp1_base_y };
    
    const bp2_base_x = acrossBack - (halfChest - acrossBack) * 0.50;
    const bp2_base_y = armholeStraight - (halfChest - acrossBack) * 1.50 * Math.tan(5 * Math.PI / 180);
    const bp2 = { x: bp2_base_x - 0.40 * S, y: bp2_base_y };
    
    const bp3 = { x: halfChest, y: armholeStraight };
    const backAH = getCubicBezierLength(bp0, bp1, bp2, bp3);
    
    const ahDiff = backAH - frontAH;
    
    // Sleeve Cap Solver (12mm ease)
    const targetLength = (frontAH + backAH) + 12;
    const H = solveSleeveCapHeight(halfBicep, targetLength);
    
    // Sleeve Cap Curves (from production CADKernel.ts)
    const scp0_f = { x: 0, y: H };
    const scp1_f = { x: halfBicep * 0.25, y: H };
    const scp2_f = { x: halfBicep * 0.75, y: H * 0.40 };
    const scp3_f = { x: halfBicep, y: 0 };
    
    const scp0_b = { x: halfBicep, y: 0 };
    const scp1_b = { x: halfBicep * 1.25, y: H * 0.45 };
    const scp2_b = { x: halfBicep * 1.80, y: H };
    const scp3_b = { x: halfBicep * 2, y: H };
    
    const scFrontLen = getCubicBezierLength(scp0_f, scp1_f, scp2_f, scp3_f);
    const scBackLen = getCubicBezierLength(scp0_b, scp1_b, scp2_b, scp3_b);
    
    // Curvature checks
    const frontAHCurv = checkBezierCurvature(fp0, fp1, fp2, fp3);
    const backAHCurv  = checkBezierCurvature(bp0, bp1, bp2, bp3);
    const scFrontCurv = checkBezierCurvature(scp0_f, scp1_f, scp2_f, scp3_f);
    const scBackCurv  = checkBezierCurvature(scp0_b, scp1_b, scp2_b, scp3_b);
    
    const shldEqual = Math.abs(fShldLen - bShldLen) < 1e-4;
    const diffInches = ahDiff / S;
    const diffOk = diffInches >= 0.08 && diffInches <= 0.15;
    const solverConverged = H > 1.0; // cap height solved successfully
    const noInflections = !frontAHCurv.hasInflection && !backAHCurv.hasInflection && !scFrontCurv.hasInflection && !scBackCurv.hasInflection;
    
    const sizePassed = shldEqual && diffOk && solverConverged && noInflections;
    if (!sizePassed) allPassed = false;
    
    console.log(`Size: ${size.toUpperCase()}`);
    console.log(`  1. Front Shoulder Length:  ${(fShldLen/S).toFixed(4)}"`);
    console.log(`  2. Back Shoulder Length:   ${(bShldLen/S).toFixed(4)}" (Equal: ${shldEqual})`);
    console.log(`  3. Front Armhole Length:   ${(frontAH/S).toFixed(4)}"`);
    console.log(`  4. Back Armhole Length:    ${(backAH/S).toFixed(4)}"`);
    console.log(`  5. Difference (Back-Front): ${(ahDiff/S).toFixed(4)}" (Pass: ${diffOk})`);
    console.log(`  6. Front Sleeve Cap Length: ${(scFrontLen/S).toFixed(4)}"`);
    console.log(`  7. Back Sleeve Cap Length:  ${(scBackLen/S).toFixed(4)}"`);
    console.log(`  8. Solver Cap Height (H):   ${(H/S).toFixed(4)}" (Solved: ${solverConverged})`);
    console.log(`  9. Inflection Count:       FrontAH=${frontAHCurv.hasInflection ? 1 : 0}, BackAH=${backAHCurv.hasInflection ? 1 : 0}, SlvF=${scFrontCurv.hasInflection ? 1 : 0}, SlvB=${scBackCurv.hasInflection ? 1 : 0} (Pass: ${noInflections})`);
    console.log(`  Status: ${sizePassed ? 'PASS' : 'FAIL'}`);
    console.log(`----------------------------------------------------------------`);
  }
  
  console.log(`ALL SIZES VALIDATION PASSED: ${allPassed ? "YES" : "NO"}`);
  console.log("");
}

async function main() {
  await runValidation(false);
  await runValidation(true);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
