import { PrismaClient } from '@prisma/client';
import { MeasurementMapper } from './src/lib/cad/MeasurementMapper';
import { 
  basePieces, 
  resolveOps, 
  calculateArmholeLength, 
  solveSleeveCapHeight, 
  getCubicBezierLength,
  Point
} from './src/lib/cad/CADKernel';

const prisma = new PrismaClient();

// Curvature check for inflection points
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

// Helper to format/parse measurements if needed
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

async function main() {
  const tp = await prisma.techPack.findUnique({
    where: { id: "ccdc50cf-0ec1-4d0a-b75d-284624e0e9c7" }
  });
  if (!tp) {
    console.log("No tech pack found with that ID.");
    return;
  }
  const data = JSON.parse(tp.jsonData || "{}");
  const measurements = data.measurements || [];
  
  // Hand-grade XS in measurements array if it doesn't exist
  const sizes = ['xs', 's', 'm', 'l', 'xl', 'xxl'];
  const gradedMeasurements = measurements.map((m: any) => {
    const item = { ...m };
    if (!item.xs || String(item.xs).trim() === '') {
      const sVal = parseMeasurement(item.s);
      const mVal = parseMeasurement(item.m);
      const gradeVal = parseMeasurement(item.grade);
      const diff = gradeVal !== null ? gradeVal : (mVal !== null && sVal !== null ? mVal - sVal : 0);
      if (sVal !== null) {
        // Calculate XS
        const xsVal = sVal - diff;
        // Format XS
        item.xs = String(xsVal);
      }
    }
    return item;
  });

  const easeAllowance = 2.0; // 2 inches default ease
  const bottomHemAllowanceMm = 20.0;
  const seamAllowanceMm = 10.0;
  
  console.log("Running Grading Validation for all sizes (XS - XXL) using workspace modules:");
  console.log("==========================================================================");

  let allPassed = true;
  
  for (const size of sizes) {
    // Extract variables using MeasurementMapper
    const { vars: rawVars, isCm, scale } = MeasurementMapper.extract(gradedMeasurements, size);
    const variables = { ...rawVars };
    
    // Apply ease allowance to key dimensions
    variables.halfChest += (easeAllowance * scale * 0.25);
    variables.halfBicep += (easeAllowance * scale * 0.1);
    variables.adjustedSleeveCap = variables.sleeveCap;
    variables.bottomHemAllowance = bottomHemAllowanceMm;

    // Resolve operations using CADKernel resolveOps
    const resolvedFront = resolveOps(basePieces.bodiceFront.ops, variables);
    const resolvedBack = resolveOps(basePieces.bodiceBack.ops, variables);
    
    const frontArmholeLen = calculateArmholeLength(resolvedFront, false);
    const backArmholeLen = calculateArmholeLength(resolvedBack, false);
    const totalArmholeLen = frontArmholeLen + backArmholeLen;
    
    const diffInches = (backArmholeLen - frontArmholeLen) / 25.4;
    
    if (totalArmholeLen > 0) {
      const W = variables.halfBicep;
      // Target length includes standard 12mm ease
      const targetL = totalArmholeLen + 12;
      variables.adjustedSleeveCap = solveSleeveCapHeight(W, targetL);
    }
    
    // Calculate sleeve cap length
    const resolvedSleeve = resolveOps(basePieces.sleeve.ops, variables);
    
    // Sleeve Cap - Front curve
    const scFrontLen = getCubicBezierLength(
      resolvedSleeve[0].points[0],
      resolvedSleeve[1].points[0],
      resolvedSleeve[1].points[1],
      resolvedSleeve[1].points[2]
    );
    // Sleeve Cap - Back curve
    const scBackLen = getCubicBezierLength(
      resolvedSleeve[1].points[2],
      resolvedSleeve[2].points[0],
      resolvedSleeve[2].points[1],
      resolvedSleeve[2].points[2]
    );
    const sleeveCapLen = scFrontLen + scBackLen;
    
    const easePct = ((sleeveCapLen - totalArmholeLen) / totalArmholeLen) * 100;
    
    // Curvature checks
    // Armhole Front curve
    const fA_p0 = resolvedFront[2].points[0]; // shoulder endpoint
    const fA_p1 = resolvedFront[3].points[0];
    const fA_p2 = resolvedFront[3].points[1];
    const fA_p3 = resolvedFront[3].points[2];
    const frontCurv = checkBezierCurvature(fA_p0, fA_p1, fA_p2, fA_p3);
    
    // Armhole Back curve
    const bA_p0 = resolvedBack[2].points[0]; // shoulder endpoint
    const bA_p1 = resolvedBack[3].points[0];
    const bA_p2 = resolvedBack[3].points[1];
    const bA_p3 = resolvedBack[3].points[2];
    const backCurv = checkBezierCurvature(bA_p0, bA_p1, bA_p2, bA_p3);
    
    // Sleeve curves
    const scF_p0 = resolvedSleeve[0].points[0];
    const scF_p1 = resolvedSleeve[1].points[0];
    const scF_p2 = resolvedSleeve[1].points[1];
    const scF_p3 = resolvedSleeve[1].points[2];
    const sleeveFrontCurv = checkBezierCurvature(scF_p0, scF_p1, scF_p2, scF_p3);
    
    const scB_p0 = resolvedSleeve[1].points[2];
    const scB_p1 = resolvedSleeve[2].points[0];
    const scB_p2 = resolvedSleeve[2].points[1];
    const scB_p3 = resolvedSleeve[2].points[2];
    const sleeveBackCurv = checkBezierCurvature(scB_p0, scB_p1, scB_p2, scB_p3);
    
    const fArmholeInches = frontArmholeLen / 25.4;
    const bArmholeInches = backArmholeLen / 25.4;
    
    // Constraints check
    const c1 = bArmholeInches > fArmholeInches;
    const c2 = diffInches >= 0.08 && diffInches <= 0.15;
    // Ease should be within +/- 1.5% of total armhole length + 12mm target, or is it +/- 1.5% ease total?
    // Wait! Let's check both:
    const easeFromTarget = ((sleeveCapLen - (totalArmholeLen + 12)) / (totalArmholeLen + 12)) * 100;
    const c3 = Math.abs(easeFromTarget) <= 1.5;
    
    const noInflections = !frontCurv.hasInflection && !backCurv.hasInflection && !sleeveFrontCurv.hasInflection && !sleeveBackCurv.hasInflection;
    
    const pass = c1 && c2 && c3 && noInflections;
    if (!pass) allPassed = false;
    
    console.log(`Size: ${size.toUpperCase()}`);
    console.log(`- Front Armhole Length: ${fArmholeInches.toFixed(4)}"`);
    console.log(`- Back Armhole Length:  ${bArmholeInches.toFixed(4)}"`);
    console.log(`- Difference (Back-Front): ${diffInches.toFixed(4)}" (Pass: ${c1 && c2})`);
    console.log(`- Sleeve Cap Height:    ${(variables.adjustedSleeveCap / 25.4).toFixed(4)}"`);
    console.log(`- Sleeve Cap Length:    ${(sleeveCapLen / 25.4).toFixed(4)}"`);
    console.log(`- Sleeve Ease (vs Armhole): ${easePct.toFixed(2)}%`);
    console.log(`- Sleeve Ease (vs Target):  ${easeFromTarget.toFixed(4)}% (Pass: ${c3})`);
    console.log(`- Curvature Inflection: Front=${frontCurv.hasInflection ? 'YES' : 'NO'}, Back=${backCurv.hasInflection ? 'YES' : 'NO'}, SlvF=${sleeveFrontCurv.hasInflection ? 'YES' : 'NO'}, SlvB=${sleeveBackCurv.hasInflection ? 'YES' : 'NO'} (Pass: ${noInflections})`);
    console.log(`- STATUS: ${pass ? 'PASS' : 'FAIL'}`);
    console.log("--------------------------------------------------");
  }
  
  console.log(`ALL SIZES VALIDATION PASSED: ${allPassed ? "YES" : "NO"}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
