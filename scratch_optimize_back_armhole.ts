import { PrismaClient } from '@prisma/client';
import { MeasurementMapper } from './src/lib/cad/MeasurementMapper';
import { getCubicBezierLength, Point } from './src/lib/cad/CADKernel';

const prisma = new PrismaClient();

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
  return {
    hasInflection: uniqueSigns.length > 1,
    minCurvature: Math.min(...curvatureSigns),
    maxCurvature: Math.max(...curvatureSigns)
  };
}

async function main() {
  const tp = await prisma.techPack.findUnique({
    where: { id: "ccdc50cf-0ec1-4d0a-b75d-284624e0e9c7" }
  });
  if (!tp) return;
  const data = JSON.parse(tp.jsonData || "{}");
  const measurements = data.measurements || [];
  
  const { vars } = MeasurementMapper.extract(measurements, 'm');
  const S = 25.4;
  
  const halfShoulder = vars.halfShoulder;
  const halfNeck = vars.halfNeck;
  const shoulderSlope = vars.shoulderSlope;
  const halfChest = vars.halfChest;
  const acrossBack = vars.acrossBack;
  const acrossFront = vars.acrossFront;
  const armholeStraight = 8.5 * S;
  
  // Front armhole (fixed)
  const fp0 = { x: halfShoulder, y: shoulderSlope };
  const fp1 = { x: acrossFront - (halfChest - acrossFront) * 0.60, y: shoulderSlope + (armholeStraight - shoulderSlope) * 0.70 };
  const fp2 = { x: halfChest - (halfChest - acrossFront) * 0.37, y: armholeStraight - (halfChest - acrossFront) * 0.37 * Math.tan(8 * Math.PI / 180) };
  const fp3 = { x: halfChest, y: armholeStraight };
  const frontAH = getCubicBezierLength(fp0, fp1, fp2, fp3);
  
  // Back armhole base (bsr = 0)
  const bp0 = { x: halfShoulder, y: shoulderSlope };
  const bp3 = { x: halfChest, y: armholeStraight };
  
  const bp1_base = { x: halfShoulder - (halfShoulder - acrossBack) * 0.57, y: bp0.y + (armholeStraight - bp0.y) * 0.12 };
  const bp2_base = { x: acrossBack - (halfChest - acrossBack) * 0.50, y: armholeStraight - (halfChest - acrossBack) * 1.50 * Math.tan(5 * Math.PI / 180) };
  
  console.log("=== SCANNING SOLUTIONS FOR BSR = 0 ===");
  console.log(`Front AH Length: ${(frontAH/S).toFixed(4)}"`);
  console.log("");
  
  // We will find solutions in 3 different target differences:
  // 1. Minimum shift to enter the [0.08", 0.15"] range.
  // 2. Best shift that matches the original difference of ~0.13".
  // 3. Shift that only modifies x-coordinates (dy1 = 0, dy2 = 0) to preserve vertical coordinate behavior.
  
  const step = 0.01 * S;
  const maxShift = 1.2 * S;
  
  let bestMinRangeSol: any = null;
  let minCostMinRange = Infinity;
  
  let bestTargetSol: any = null;
  let minCostTarget = Infinity;
  
  let bestXOnlySol: any = null;
  let minCostXOnly = Infinity;

  for (let dx1 = -maxShift; dx1 <= maxShift; dx1 += step) {
    for (let dy1 = -maxShift; dy1 <= maxShift; dy1 += step) {
      for (let dx2 = -maxShift; dx2 <= maxShift; dx2 += step) {
        const dy2 = 0;
        
        const p1 = { x: bp1_base.x + dx1, y: bp1_base.y + dy1 };
        const p2 = { x: bp2_base.x + dx2, y: bp2_base.y + dy2 };
        
        const len = getCubicBezierLength(bp0, p1, p2, bp3);
        const diff = (len - frontAH) / S;
        
        if (diff >= 0.08 && diff <= 0.15) {
          const curv = checkBezierCurvature(bp0, p1, p2, bp3);
          if (!curv.hasInflection) {
            const cost = dx1*dx1 + dy1*dy1 + dx2*dx2 + dy2*dy2;
            
            // 1. Min shift to enter range
            if (cost < minCostMinRange) {
              minCostMinRange = cost;
              bestMinRangeSol = { dx1, dy1, dx2, dy2, len, diff, p1, p2 };
            }
            
            // 2. Best shift that targets ~0.13" difference (e.g. 0.125" to 0.135")
            if (diff >= 0.125 && diff <= 0.135) {
              if (cost < minCostTarget) {
                minCostTarget = cost;
                bestTargetSol = { dx1, dy1, dx2, dy2, len, diff, p1, p2 };
              }
            }
            
            // 3. Shift that only modifies x-coordinates (dy1 = 0)
            if (Math.abs(dy1) < 1e-5) {
              if (cost < minCostXOnly) {
                minCostXOnly = cost;
                bestXOnlySol = { dx1, dy1, dx2, dy2, len, diff, p1, p2 };
              }
            }
          }
        }
      }
    }
  }
  
  if (bestMinRangeSol) {
    console.log("Solution A: Minimum Shift to Enter Target Range (0.08\" - 0.15\")");
    console.log(`  Shift bp1 by: dx1 = ${(bestMinRangeSol.dx1/S).toFixed(4)}", dy1 = ${(bestMinRangeSol.dy1/S).toFixed(4)}"`);
    console.log(`  Shift bp2 by: dx2 = ${(bestMinRangeSol.dx2/S).toFixed(4)}", dy2 = ${(bestMinRangeSol.dy2/S).toFixed(4)}"`);
    console.log(`  New bp1: (${(bestMinRangeSol.p1.x/S).toFixed(4)}", ${(bestMinRangeSol.p1.y/S).toFixed(4)}")`);
    console.log(`  New bp2: (${(bestMinRangeSol.p2.x/S).toFixed(4)}", ${(bestMinRangeSol.p2.y/S).toFixed(4)}")`);
    console.log(`  New Back AH Length: ${(bestMinRangeSol.len/S).toFixed(4)}"`);
    console.log(`  Difference (Back - Front): ${bestMinRangeSol.diff.toFixed(4)}"`);
    console.log("");
  }
  
  if (bestTargetSol) {
    console.log("Solution B: Target Difference of ~0.13\" (Matches Original Difference)");
    console.log(`  Shift bp1 by: dx1 = ${(bestTargetSol.dx1/S).toFixed(4)}", dy1 = ${(bestTargetSol.dy1/S).toFixed(4)}"`);
    console.log(`  Shift bp2 by: dx2 = ${(bestTargetSol.dx2/S).toFixed(4)}", dy2 = ${(bestTargetSol.dy2/S).toFixed(4)}"`);
    console.log(`  New bp1: (${(bestTargetSol.p1.x/S).toFixed(4)}", ${(bestTargetSol.p1.y/S).toFixed(4)}")`);
    console.log(`  New bp2: (${(bestTargetSol.p2.x/S).toFixed(4)}", ${(bestTargetSol.p2.y/S).toFixed(4)}")`);
    console.log(`  New Back AH Length: ${(bestTargetSol.len/S).toFixed(4)}"`);
    console.log(`  Difference (Back - Front): ${bestTargetSol.diff.toFixed(4)}"`);
    console.log("");
  }
  
  if (bestXOnlySol) {
    console.log("Solution C: X-Only Coordinate Adjustment (dy1 = 0, dy2 = 0)");
    console.log(`  Shift bp1 by: dx1 = ${(bestXOnlySol.dx1/S).toFixed(4)}", dy1 = 0.0000"`);
    console.log(`  Shift bp2 by: dx2 = ${(bestXOnlySol.dx2/S).toFixed(4)}", dy2 = 0.0000"`);
    console.log(`  New bp1: (${(bestXOnlySol.p1.x/S).toFixed(4)}", ${(bestXOnlySol.p1.y/S).toFixed(4)}")`);
    console.log(`  New bp2: (${(bestXOnlySol.p2.x/S).toFixed(4)}", ${(bestXOnlySol.p2.y/S).toFixed(4)}")`);
    console.log(`  New Back AH Length: ${(bestXOnlySol.len/S).toFixed(4)}"`);
    console.log(`  Difference (Back - Front): ${bestXOnlySol.diff.toFixed(4)}"`);
    console.log("");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
