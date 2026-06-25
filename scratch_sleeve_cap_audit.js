const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── helpers ────────────────────────────────────────────────────────────────
function parseMeasurement(val) {
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
    const [a, b] = val.split('/');
    result += parseFloat(a) / parseFloat(b);
  } else {
    const n = parseFloat(val);
    if (!isNaN(n)) result += n;
  }
  return result > 0 ? result : null;
}

function getCubicBezierLength(p0, p1, p2, p3, seg = 100) {
  let len = 0, px = p0.x, py = p0.y;
  for (let i = 1; i <= seg; i++) {
    const t = i / seg, mt = 1 - t;
    const x = mt*mt*mt*p0.x + 3*mt*mt*t*p1.x + 3*mt*t*t*p2.x + t*t*t*p3.x;
    const y = mt*mt*mt*p0.y + 3*mt*mt*t*p1.y + 3*mt*t*t*p2.y + t*t*t*p3.y;
    len += Math.hypot(x - px, y - py);
    px = x; py = y;
  }
  return len;
}

function solveSleeveCapHeight(halfBicep, targetLen) {
  if (targetLen <= halfBicep * 2) return 0;
  let lo = 0, hi = targetLen, H = 0;
  for (let i = 0; i < 60; i++) {
    H = (lo + hi) / 2;
    const fLen = getCubicBezierLength(
      {x:0,           y:H},
      {x:halfBicep*.20, y:H},
      {x:halfBicep*.55, y:H*.10},
      {x:halfBicep,   y:0}
    );
    const bLen = getCubicBezierLength(
      {x:halfBicep,   y:0},
      {x:halfBicep*1.45, y:H*.15},
      {x:halfBicep*1.85, y:H},
      {x:halfBicep*2, y:H}
    );
    (fLen + bLen < targetLen) ? (lo = H) : (hi = H);
  }
  return H;
}

// Replicate CADKernel formula evaluation for the two armhole curves
function evaluateFormula(expr, v) {
  let s = String(expr).toLowerCase();
  s = s.replace(/\bpi\b/g, String(Math.PI));
  for (const [k, val] of Object.entries(v)) {
    s = s.replace(new RegExp(`\\b${k.toLowerCase()}\\b`, 'g'), String(val));
  }
  ['sin','cos','tan','atan','sqrt','pow','abs'].forEach(fn => {
    s = s.replace(new RegExp(`\\b${fn}\\(`, 'g'), `Math.${fn}(`);
  });
  // eslint-disable-next-line no-new-func
  return new Function(`return (${s});`)();
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  const tp = await prisma.techPack.findUnique({
    where: { id: 'ccdc50cf-0ec1-4d0a-b75d-284624e0e9c7' }
  });
  const meas = JSON.parse(tp.jsonData || '{}').measurements || [];

  const EASE_IN  = 2.0;   // inch ease allowance (UI default)
  const SLEEVE_EASE_MM = 12; // industrial cap ease target

  const findRow = key => meas.find(m =>
    m.description.toLowerCase().includes(key.toLowerCase()));

  const getRaw = (row, size) => {
    let v = row?.[size];
    if (size === 'xs' && (!v || !v.trim())) {
      const s  = parseMeasurement(row?.s);
      const m  = parseMeasurement(row?.m);
      const gr = parseMeasurement(row?.grade);
      const diff = gr ?? (s != null && m != null ? m - s : 0);
      if (s != null) v = String(s - diff);
    }
    return parseMeasurement(v);
  };

  // rows
  const rNeck     = findRow('neck width');
  const rShld     = findRow('shoulder width');
  const rSlope    = findRow('shoulder slope');
  const rAF       = findRow('across front');
  const rAB       = findRow('across back');
  const rChest    = findRow('chest');
  const rBicep    = findRow('biceps 1');          // "Biceps 1'' below A/H"
  const rAHDepth  = findRow('armhole curve all'); // "Armhole Curve all round"

  const sizes = ['xs','s','m','l','xl','xxl'];
  const S = 25.4; // scale factor inch→mm

  const rows = [];
  for (const sz of sizes) {
    // raw inch values
    const neckFull     = getRaw(rNeck,    sz) ?? 8.5;
    const shldFull     = getRaw(rShld,    sz) ?? 16.25;
    const slopeIn      = getRaw(rSlope,   sz) ?? 1.75;
    const afFull       = getRaw(rAF,      sz) ?? 14.62;
    const abFull       = getRaw(rAB,      sz) ?? 15.38;
    const chestFull    = getRaw(rChest,   sz) ?? 39.5;
    const bicepFull    = getRaw(rBicep,   sz) ?? 14.5;  // circ measurement
    const ahCurveAll   = getRaw(rAHDepth, sz) ?? 19.375; // full armhole curve

    // Convert to CADKernel mm vars (matching MeasurementMapper.ts)
    const halfChest    = (chestFull > 30 ? chestFull / 4 : chestFull / 2) * S;
    const halfShoulder = (shldFull  / 2) * S;
    const shoulderSlope = slopeIn * S;
    const acrossFront  = (afFull  / 2) * S;
    const acrossBack   = (abFull  / 2) * S;
    // Bicep is listed as full circumference (> 10") → divide by 2 for flat
    const halfBicep    = (bicepFull > 10 ? bicepFull / 2 : bicepFull) * S;
    // Add ease
    const halfChestE   = halfChest   + EASE_IN * S * 0.25;
    const halfBicepE   = halfBicep   + EASE_IN * S * 0.1;

    // Back shoulder rise (frozen formula)
    const bsr = halfShoulder * 0.019 + (halfChestE - halfShoulder) * 0.110;

    // Front armhole Bézier (single segment, CADKernel)
    const fp0 = { x: halfShoulder, y: shoulderSlope };
    const fp1 = {
      x: acrossFront - (halfChestE - acrossFront) * 0.60,
      y: shoulderSlope + (halfChestE*0 + evaluateFormula(
          'shoulderSlope + (armholeStraight - shoulderSlope) * 0.70',
          { shoulderSlope, armholeStraight: 8.5*S })),
    };
    // Use evaluateFormula to replicate exactly what CADKernel does
    const arm = 8.5 * S;  // armholeStraight fallback; spec doesn't have "armhole straight"
    // --- exact replication of CADKernel formulas ---
    const v = {
      halfShoulder, halfChest: halfChestE, halfBicep: halfBicepE,
      shoulderSlope, acrossFront, acrossBack,
      armholeStraight: arm,
      backShoulderRise: bsr,
      pi: Math.PI
    };
    // Front armhole Bézier
    const FA_p0 = { x: halfShoulder, y: shoulderSlope };
    const FA_p1 = {
      x: acrossFront - (halfChestE - acrossFront) * 0.60,
      y: shoulderSlope + (arm - shoulderSlope) * 0.70
    };
    const FA_p2 = {
      x: halfChestE - (halfChestE - acrossFront) * 0.37,
      y: arm - (halfChestE - acrossFront) * 0.37 * Math.tan(8 * Math.PI / 180)
    };
    const FA_p3 = { x: halfChestE, y: arm };

    // Back armhole Bézier
    const backShoulderY = shoulderSlope - bsr;
    const BA_p0 = { x: halfShoulder, y: backShoulderY };
    const BA_p1 = {
      x: halfShoulder - (halfShoulder - acrossBack) * 0.57,
      y: backShoulderY + (arm - backShoulderY) * 0.12
    };
    const BA_p2 = {
      x: acrossBack - (halfChestE - acrossBack) * 0.50,
      y: arm - (halfChestE - acrossBack) * 1.50 * Math.tan(5 * Math.PI / 180)
    };
    const BA_p3 = { x: halfChestE, y: arm };

    const frontAH = getCubicBezierLength(FA_p0, FA_p1, FA_p2, FA_p3);
    const backAH  = getCubicBezierLength(BA_p0, BA_p1, BA_p2, BA_p3);
    const totalAH = frontAH + backAH;

    // Sleeve cap solver
    const capH = solveSleeveCapHeight(halfBicepE, totalAH + SLEEVE_EASE_MM);

    // Sleeve cap curve lengths
    const SC_f0 = {x: 0,          y: capH};
    const SC_f1 = {x: halfBicepE*.20, y: capH};
    const SC_f2 = {x: halfBicepE*.55, y: capH*.10};
    const SC_f3 = {x: halfBicepE,  y: 0};
    const SC_b0 = {x: halfBicepE,  y: 0};
    const SC_b1 = {x: halfBicepE*1.45, y: capH*.15};
    const SC_b2 = {x: halfBicepE*1.85, y: capH};
    const SC_b3 = {x: halfBicepE*2, y: capH};

    const scFront = getCubicBezierLength(SC_f0, SC_f1, SC_f2, SC_f3);
    const scBack  = getCubicBezierLength(SC_b0, SC_b1, SC_b2, SC_b3);

    // Armhole depth from spec (half of all-round curve) — sanity reference
    const ahDepthSpec = ahCurveAll * S / 2;  // half-circ as depth proxy

    rows.push({
      sz: sz.toUpperCase(),
      capH_in:    capH    / S,
      halfBicepSpec: bicepFull / 2,           // spec flat half-bicep inches
      halfBicepE_in: halfBicepE / S,           // after ease
      ahDepth_in: arm     / S,                 // armhole depth (used in kernel)
      ahDepthSpec_in: ahDepthSpec / S,         // from spec (half of curve)
      frontAH_in: frontAH / S,
      backAH_in:  backAH  / S,
      scFront_in: scFront / S,
      scBack_in:  scBack  / S,
      totalAH_in: totalAH / S,
      totalSC_in: (scFront + scBack) / S,
      ratio:      capH / halfBicepE,           // cap-height : half-bicep (pure ratio)
      ratioSpec:  capH / (bicepFull / 2 * S),  // vs spec (no-ease) half bicep
    });
  }

  // ── print ──────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('  SLEEVE CAP GRADING AUDIT — XS to XXL');
  console.log('═══════════════════════════════════════════════════════════════════════════');

  console.log('\n─── 1. Core Dimensions ──────────────────────────────────────────────────');
  console.log(
    'Size  │ Cap Ht  │ HalfBicep│ AH Depth │ FrontAH  │ BackAH   │ SCFront  │ SCBack   │ TotalAH  │ TotalSC'
  );
  console.log('──────┼─────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼─────────');
  for (const r of rows) {
    console.log(
      `${r.sz.padEnd(5)} │ ${r.capH_in.toFixed(3).padEnd(7)} │ ${r.halfBicepE_in.toFixed(3).padEnd(8)} │ ` +
      `${r.ahDepth_in.toFixed(3).padEnd(8)} │ ${r.frontAH_in.toFixed(3).padEnd(8)} │ ${r.backAH_in.toFixed(3).padEnd(8)} │ ` +
      `${r.scFront_in.toFixed(3).padEnd(8)} │ ${r.scBack_in.toFixed(3).padEnd(8)} │ ` +
      `${r.totalAH_in.toFixed(3).padEnd(8)} │ ${r.totalSC_in.toFixed(3)}`
    );
  }

  console.log('\n─── 2. CapHeight / HalfBicep Ratio ─────────────────────────────────────');
  console.log('Size  │ Cap Ht (in) │ HalfBicep+ease │ Ratio (H/B) │ Δ from XS ratio');
  console.log('──────┼─────────────┼────────────────┼─────────────┼────────────────');
  const baseRatio = rows[0].ratio;
  for (const r of rows) {
    const delta = r.ratio - baseRatio;
    console.log(
      `${r.sz.padEnd(5)} │ ${r.capH_in.toFixed(4).padEnd(11)} │ ${r.halfBicepE_in.toFixed(4).padEnd(14)} │ ` +
      `${r.ratio.toFixed(5).padEnd(11)} │ ${delta >= 0 ? '+' : ''}${delta.toFixed(5)}`
    );
  }

  console.log('\n─── 3. Grade Deltas (vs previous size) ──────────────────────────────────');
  console.log('Size  │ ΔCapHt (in) │ ΔHalfBicep │ ΔFrontAH  │ ΔBackAH   │ ΔTotalAH  │ ΔCapHt/ΔBicep');
  console.log('──────┼─────────────┼────────────┼───────────┼───────────┼───────────┼──────────────');
  for (let i = 1; i < rows.length; i++) {
    const c = rows[i], p = rows[i-1];
    const dH  = c.capH_in - p.capH_in;
    const dB  = c.halfBicepE_in - p.halfBicepE_in;
    const dFA = c.frontAH_in - p.frontAH_in;
    const dBA = c.backAH_in  - p.backAH_in;
    const dTA = c.totalAH_in - p.totalAH_in;
    console.log(
      `${c.sz.padEnd(5)} │ ${('+'+dH.toFixed(4)).padEnd(11)} │ ${('+'+dB.toFixed(4)).padEnd(10)} │ ` +
      `${('+'+dFA.toFixed(4)).padEnd(9)} │ ${('+'+dBA.toFixed(4)).padEnd(9)} │ ${('+'+dTA.toFixed(4)).padEnd(9)} │ ${(dH/dB).toFixed(4)}`
    );
  }

  console.log('\n─── 4. Industry Ratio Benchmark ─────────────────────────────────────────');
  const minR = Math.min(...rows.map(r => r.ratio));
  const maxR = Math.max(...rows.map(r => r.ratio));
  const spread = maxR - minR;
  console.log(`  CapHeight/HalfBicep range: ${minR.toFixed(5)} – ${maxR.toFixed(5)}`);
  console.log(`  Spread across grading:     ${spread.toFixed(5)} (${(spread/minR*100).toFixed(2)}% variation)`);
  console.log(`  ΔCapHt / ΔBicep range:     see table above`);
  console.log('');
  console.log('  Industry reference (AAMA knit tee block):');
  console.log('    • CapHeight/HalfBicep typically 0.50–0.65 for fitted/standard fit');
  console.log('    • Ratio should stay within ±5% across the full grade run');
  console.log('    • ΔCapHt per size should track ≈ 0.6–0.8× ΔBicep for proportional grading');
  console.log('');
  const allInRange = rows.every(r => r.ratio >= 0.50 && r.ratio <= 0.72);
  const spreadOk   = spread < 0.025;
  console.log(`  This run: ratio range in 0.50–0.72 band?  ${allInRange ? 'YES ✓' : 'NO ✗'}`);
  console.log(`  This run: spread < 0.025?                 ${spreadOk   ? 'YES ✓' : 'NO ✗ — DISPROPORTION DETECTED'}`);
  console.log('');

  // Per-size ΔH/ΔB
  const ratios_HB = [];
  for (let i = 1; i < rows.length; i++) {
    const dH = rows[i].capH_in - rows[i-1].capH_in;
    const dB = rows[i].halfBicepE_in - rows[i-1].halfBicepE_in;
    ratios_HB.push(dH/dB);
  }
  const avgHB = ratios_HB.reduce((a,b)=>a+b,0)/ratios_HB.length;
  console.log(`  Avg ΔCapHt/ΔBicep per step: ${avgHB.toFixed(4)}`);
  console.log(`  Expected (industry):         ~0.60–0.80`);
  if (avgHB > 0.80) {
    console.log('  ► Cap height growing FASTER than bicep — solver is increasing cap height');
    console.log('    disproportionately to compensate for armhole curve growth.');
  } else if (avgHB < 0.60) {
    console.log('  ► Cap height growing SLOWER than bicep — cap may become too flat at large sizes.');
  } else {
    console.log('  ► Ratio within acceptable proportional band.');
  }

  console.log('\n─── 5. Verdict ──────────────────────────────────────────────────────────');
  console.log(`
  The solver targets totalArmhole + 12mm for every size.
  As the garment grades up, both the armhole curve length AND the bicep
  width grow — but the armhole curve length grows faster than the bicep
  width because it is driven by both chest and shoulder grading, while the
  bicep only grades by its own increment.

  If ΔCapHt/ΔBicep > 1.0 at any step, the solver is increasing cap height
  faster than the bicep widens, which means the cap becomes proportionally
  taller at larger sizes. This is detectable as:
    • Rising H/B ratio across sizes
    • Cap height growing faster than expected

  See the table above for exact per-step values.
`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
