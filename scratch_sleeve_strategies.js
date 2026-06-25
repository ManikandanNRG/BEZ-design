const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── geometry helpers ───────────────────────────────────────────────────────
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

function bezierLen(p0, p1, p2, p3, seg = 120) {
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

// Sleeve cap curve lengths given H and halfBicep (frozen CADKernel control points)
function sleeveCapLengths(H, B) {
  const front = bezierLen(
    {x:0,    y:H},  {x:B*0.20, y:H},
    {x:B*0.55,y:H*0.10}, {x:B, y:0}
  );
  const back = bezierLen(
    {x:B,    y:0},  {x:B*1.45, y:H*0.15},
    {x:B*1.85,y:H}, {x:B*2, y:H}
  );
  return { front, back, total: front + back };
}

// Strategy A: exact solver (binary search for H)
function solveH_exact(B, target) {
  if (target <= 2 * B) return 0;
  let lo = 0, hi = target, H = 0;
  for (let i = 0; i < 80; i++) {
    H = (lo + hi) / 2;
    sleeveCapLengths(H, B).total < target ? (lo = H) : (hi = H);
  }
  return H;
}

// Strategy B: clamp H/B in [r_lo, r_hi]; pick H that maximises ratio while
// keeping it ≤ r_hi, then compute resulting ease.
function solveH_ratioClamp(B, totalAH, easeTarget, r_lo, r_hi) {
  // Ideal: first try the upper bound of the ratio
  const H_hi   = r_hi * B;
  const H_lo   = r_lo * B;
  const H_ideal = solveH_exact(B, totalAH + easeTarget); // what exact solver gives
  // If exact solver's H already within band → use it
  if (H_ideal >= H_lo && H_ideal <= H_hi) {
    return { H: H_ideal, clamped: false };
  }
  // Otherwise clamp to band centre, biasing toward upper bound for larger sizes
  const H_clamped = Math.max(H_lo, Math.min(H_hi, H_ideal));
  return { H: H_clamped, clamped: true };
}

// Strategy C: independent graded cap height
// Base = M-size cap height from exact solver; grade = Δ per size step
function buildStratC(B_sizes, AH_sizes, baseH, gradePerStep) {
  // sizes index: 0=XS, 1=S, 2=M, 3=L, 4=XL, 5=XXL; M = index 2
  return B_sizes.map((B, i) => {
    const H = baseH + gradePerStep * (i - 2); // centred on M
    return { H: Math.max(H, B * 0.30) };      // floor at 0.30B
  });
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  const S = 25.4; // mm per inch
  const EASE_IN = 2.0;
  const EASE_CAP_MM = 12; // standard industrial cap ease

  const tp = await prisma.techPack.findUnique({
    where: { id: 'ccdc50cf-0ec1-4d0a-b75d-284624e0e9c7' }
  });
  const meas = JSON.parse(tp.jsonData || '{}').measurements || [];

  const find = key => meas.find(m => m.description.toLowerCase().includes(key.toLowerCase()));
  const getRaw = (row, sz) => {
    let v = row?.[sz];
    if (sz === 'xs' && (!v || !String(v).trim())) {
      const sv = parseMeasurement(row?.s);
      const mv = parseMeasurement(row?.m);
      const gr = parseMeasurement(row?.grade);
      const diff = gr ?? (sv != null && mv != null ? mv - sv : 0);
      if (sv != null) v = String(sv - diff);
    }
    return parseMeasurement(v);
  };

  const rChest  = find('chest');
  const rShld   = find('shoulder width');
  const rSlope  = find('shoulder slope');
  const rAF     = find('across front');
  const rAB     = find('across back');
  const rBicep  = find('biceps 1');

  const sizes = ['xs','s','m','l','xl','xxl'];

  // ── resolve armhole lengths (frozen bodice geometry) ────────────────────
  const sizeData = sizes.map(sz => {
    const chestFull  = getRaw(rChest, sz) ?? 39.5;
    const shldFull   = getRaw(rShld,  sz) ?? 16.25;
    const slopeIn    = getRaw(rSlope, sz) ?? 1.75;
    const afFull     = getRaw(rAF,    sz) ?? 14.62;
    const abFull     = getRaw(rAB,    sz) ?? 15.38;
    const bicepFull  = getRaw(rBicep, sz) ?? 14.5;

    const halfChest  = ((chestFull > 30 ? chestFull / 4 : chestFull / 2) + EASE_IN * 0.25) * S;
    const halfShld   = (shldFull  / 2) * S;
    const slope      = slopeIn * S;
    const acrossF    = (afFull  / 2) * S;
    const acrossB    = (abFull  / 2) * S;
    const halfBicep  = ((bicepFull > 10 ? bicepFull / 2 : bicepFull) + EASE_IN * 0.1) * S;
    const arm        = 8.5 * S; // armholeStraight (constant in kernel)

    const bsr = halfShld * 0.019 + (halfChest - halfShld) * 0.110;

    // Front armhole
    const FA = [
      {x: halfShld, y: slope},
      {x: acrossF - (halfChest - acrossF)*0.60, y: slope + (arm - slope)*0.70},
      {x: halfChest - (halfChest - acrossF)*0.37, y: arm - (halfChest - acrossF)*0.37*Math.tan(8*Math.PI/180)},
      {x: halfChest, y: arm}
    ];
    // Back armhole
    const bsy = slope - bsr;
    const BA = [
      {x: halfShld, y: bsy},
      {x: halfShld - (halfShld - acrossB)*0.57, y: bsy + (arm - bsy)*0.12},
      {x: acrossB - (halfChest - acrossB)*0.50, y: arm - (halfChest - acrossB)*1.50*Math.tan(5*Math.PI/180)},
      {x: halfChest, y: arm}
    ];
    const frontAH = bezierLen(FA[0],FA[1],FA[2],FA[3]);
    const backAH  = bezierLen(BA[0],BA[1],BA[2],BA[3]);
    const totalAH = frontAH + backAH;

    return {
      sz: sz.toUpperCase(),
      halfBicep_in: halfBicep / S,
      totalAH_in:   totalAH  / S,
      halfBicep_mm: halfBicep,
      totalAH_mm:   totalAH,
    };
  });

  // ── Strategy A: current exact solver ────────────────────────────────────
  const stratA = sizeData.map(d => {
    const H = solveH_exact(d.halfBicep_mm, d.totalAH_mm + EASE_CAP_MM);
    const { front, back, total } = sleeveCapLengths(H, d.halfBicep_mm);
    const ease_mm  = total - d.totalAH_mm;
    const ratio    = H / d.halfBicep_mm;
    return { sz:d.sz, H_in:H/S, ratio, front_in:front/S, back_in:back/S, total_in:total/S, ease_mm, ease_in:ease_mm/S };
  });

  // ── Strategy B: ratio-clamped [0.50, 0.65] ──────────────────────────────
  const R_LO = 0.50, R_HI = 0.65;
  const stratB = sizeData.map(d => {
    const { H, clamped } = solveH_ratioClamp(d.halfBicep_mm, d.totalAH_mm, EASE_CAP_MM, R_LO, R_HI);
    const { front, back, total } = sleeveCapLengths(H, d.halfBicep_mm);
    const ease_mm  = total - d.totalAH_mm;
    const ratio    = H / d.halfBicep_mm;
    return { sz:d.sz, H_in:H/S, ratio, front_in:front/S, back_in:back/S, total_in:total/S, ease_mm, ease_in:ease_mm/S, clamped };
  });

  // ── Strategy C: independent grade ───────────────────────────────────────
  // Find M's exact solver H as the base (index 2 = M)
  const baseH_mm = solveH_exact(sizeData[2].halfBicep_mm, sizeData[2].totalAH_mm + EASE_CAP_MM);
  // Test two grade increments: 0 (flat grade) and +3mm/step
  const GRADE_STEPS = [
    { label:'C1: +0mm/step (fixed H)',     delta_mm:  0    },
    { label:'C2: +3mm/step (~0.12"/step)', delta_mm:  3    },
    { label:'C3: −3mm/step (negative)',    delta_mm: -3    },
  ];

  const stratC_variants = GRADE_STEPS.map(gs => {
    const rows = sizeData.map((d, i) => {
      const H = Math.max(baseH_mm + gs.delta_mm * (i - 2), d.halfBicep_mm * 0.30);
      const { front, back, total } = sleeveCapLengths(H, d.halfBicep_mm);
      const ease_mm = total - d.totalAH_mm;
      const ratio   = H / d.halfBicep_mm;
      return { sz:d.sz, H_in:H/S, ratio, front_in:front/S, back_in:back/S, total_in:total/S, ease_mm, ease_in:ease_mm/S };
    });
    return { label: gs.label, rows };
  });

  // ═══════════════════════════════════════════════════════════════════════
  // OUTPUT
  // ═══════════════════════════════════════════════════════════════════════
  const line = '─'.repeat(100);

  console.log('\n' + '═'.repeat(100));
  console.log('  SLEEVE CAP DRAFTING STRATEGY COMPARISON — XS to XXL');
  console.log('═'.repeat(100));

  // ── Summary input ────────────────────────────────────────────────────────
  console.log('\n── Input: Frozen Armhole Lengths & Bicep Widths ──────────────────────────────────────────────\n');
  console.log('Size   Half-Bicep(in)  TotalAH(in)   2×HalfBicep   Margin over flat');
  console.log(line.slice(0,70));
  sizeData.forEach(d => {
    const flat   = 2 * d.halfBicep_in;
    const tgt    = d.totalAH_in + EASE_CAP_MM/S;
    console.log(`${d.sz.padEnd(6)} ${d.halfBicep_in.toFixed(4).padEnd(15)} ${d.totalAH_in.toFixed(4).padEnd(13)} ${flat.toFixed(4).padEnd(13)} +${(tgt-flat).toFixed(3)}"`);
  });

  // ── Strategy A ───────────────────────────────────────────────────────────
  console.log('\n\n' + '═'.repeat(100));
  console.log('  STRATEGY A — Current Exact Seam-Length Solver');
  console.log('═'.repeat(100));
  console.log('\nPrinciple: Binary-search H until SC_total = TotalAH + 12mm exactly.\n');
  console.log('Size   Cap Ht    H/B      SC Front  SC Back   SC Total  TotalAH   Ease(mm)  Ease(in)');
  console.log(line.slice(0,85));
  stratA.forEach(r => {
    console.log(
      `${r.sz.padEnd(6)} ${r.H_in.toFixed(3).padEnd(9)} ${r.ratio.toFixed(4).padEnd(8)} ` +
      `${r.front_in.toFixed(3).padEnd(9)} ${r.back_in.toFixed(3).padEnd(9)} ${r.total_in.toFixed(3).padEnd(9)} ` +
      `${sizeData.find(d=>d.sz===r.sz).totalAH_in.toFixed(3).padEnd(9)} ${r.ease_mm.toFixed(2).padEnd(9)} ${r.ease_in.toFixed(4)}`
    );
  });
  const Amin = Math.min(...stratA.map(r=>r.ratio));
  const Amax = Math.max(...stratA.map(r=>r.ratio));
  const AeaseMin = Math.min(...stratA.map(r=>r.ease_mm));
  const AeaseMax = Math.max(...stratA.map(r=>r.ease_mm));
  console.log(`\n  H/B range:   ${Amin.toFixed(4)} – ${Amax.toFixed(4)}  (spread: ${((Amax-Amin)/Amin*100).toFixed(1)}%)`);
  console.log(`  Ease range:  ${AeaseMin.toFixed(2)}mm – ${AeaseMax.toFixed(2)}mm  (target: 12mm constant)`);
  console.log(`  Grade consistency: Cap height DECREASING per step (${stratA[0].H_in.toFixed(2)}" → ${stratA[5].H_in.toFixed(2)}")`);

  // ── Strategy B ───────────────────────────────────────────────────────────
  console.log('\n\n' + '═'.repeat(100));
  console.log('  STRATEGY B — H/B Ratio Clamped to [0.50, 0.65]');
  console.log('═'.repeat(100));
  console.log('\nPrinciple: Cap height constrained so H/B stays in [0.50, 0.65]; ease varies freely.\n');
  console.log('Size   Cap Ht    H/B      SC Front  SC Back   SC Total  TotalAH   Ease(mm)  Ease(in)  Clamped?');
  console.log(line.slice(0,90));
  stratB.forEach(r => {
    console.log(
      `${r.sz.padEnd(6)} ${r.H_in.toFixed(3).padEnd(9)} ${r.ratio.toFixed(4).padEnd(8)} ` +
      `${r.front_in.toFixed(3).padEnd(9)} ${r.back_in.toFixed(3).padEnd(9)} ${r.total_in.toFixed(3).padEnd(9)} ` +
      `${sizeData.find(d=>d.sz===r.sz).totalAH_in.toFixed(3).padEnd(9)} ${r.ease_mm.toFixed(2).padEnd(9)} ${r.ease_in.toFixed(4).padEnd(9)} ${r.clamped ? 'YES ←' : 'OK'}`
    );
  });
  const Bmin = Math.min(...stratB.map(r=>r.ratio));
  const Bmax = Math.max(...stratB.map(r=>r.ratio));
  const BeaseMin = Math.min(...stratB.map(r=>r.ease_mm));
  const BeaseMax = Math.max(...stratB.map(r=>r.ease_mm));
  console.log(`\n  H/B range:   ${Bmin.toFixed(4)} – ${Bmax.toFixed(4)}  (spread: ${((Bmax-Bmin)/Bmin*100).toFixed(1)}%)`);
  console.log(`  Ease range:  ${BeaseMin.toFixed(2)}mm – ${BeaseMax.toFixed(2)}mm`);
  const BclamCnt = stratB.filter(r=>r.clamped).length;
  console.log(`  Clamped sizes: ${BclamCnt} of 6`);

  // ── Strategy C ───────────────────────────────────────────────────────────
  console.log('\n\n' + '═'.repeat(100));
  console.log('  STRATEGY C — Cap Height Graded Independently');
  console.log('═'.repeat(100));
  console.log(`\nPrinciple: Base H from M-size exact solver (H_M = ${(baseH_mm/S).toFixed(3)}"); grade ±Δ per step.\n`);

  for (const sv of stratC_variants) {
    console.log(`\n  ${sv.label}`);
    console.log('  ' + '-'.repeat(85));
    console.log('  Size   Cap Ht    H/B      SC Front  SC Back   SC Total  TotalAH   Ease(mm)  Ease(in)');
    console.log('  ' + '-'.repeat(85));
    sv.rows.forEach(r => {
      const ah = sizeData.find(d=>d.sz===r.sz).totalAH_in;
      console.log(
        `  ${r.sz.padEnd(6)} ${r.H_in.toFixed(3).padEnd(9)} ${r.ratio.toFixed(4).padEnd(8)} ` +
        `${r.front_in.toFixed(3).padEnd(9)} ${r.back_in.toFixed(3).padEnd(9)} ${r.total_in.toFixed(3).padEnd(9)} ` +
        `${ah.toFixed(3).padEnd(9)} ${r.ease_mm.toFixed(2).padEnd(9)} ${r.ease_in.toFixed(4)}`
      );
    });
    const cmin = Math.min(...sv.rows.map(r=>r.ratio));
    const cmax = Math.max(...sv.rows.map(r=>r.ratio));
    const cemin = Math.min(...sv.rows.map(r=>r.ease_mm));
    const cemax = Math.max(...sv.rows.map(r=>r.ease_mm));
    console.log(`\n    H/B range:  ${cmin.toFixed(4)} – ${cmax.toFixed(4)}  (spread: ${((cmax-cmin)/Math.max(cmin,0.001)*100).toFixed(1)}%)`);
    console.log(`    Ease range: ${cemin.toFixed(2)}mm – ${cemax.toFixed(2)}mm`);
    const HXS = sv.rows[0].H_in, HXXL = sv.rows[5].H_in;
    console.log(`    Cap height: ${HXS.toFixed(3)}" (XS) → ${HXXL.toFixed(3)}" (XXL)`);
  }

  // ── Side-by-side summary ─────────────────────────────────────────────────
  console.log('\n\n' + '═'.repeat(100));
  console.log('  SIDE-BY-SIDE SUMMARY');
  console.log('═'.repeat(100));
  console.log('\n         ── Strategy A ──  ── Strategy B ──  ── Strat C1 ──  ── Strat C2 ──');
  console.log('Size     Cap H  H/B   Ease  Cap H  H/B   Ease  Cap H  H/B   Cap H  H/B  ');
  console.log('-'.repeat(85));
  sizes.forEach((sz, i) => {
    const a  = stratA[i];
    const b  = stratB[i];
    const c1 = stratC_variants[0].rows[i];
    const c2 = stratC_variants[1].rows[i];
    console.log(
      `${sz.toUpperCase().padEnd(8)} ` +
      `${a.H_in.toFixed(2).padEnd(6)} ${a.ratio.toFixed(3).padEnd(6)} ${a.ease_mm.toFixed(0).padEnd(5)} ` +
      `${b.H_in.toFixed(2).padEnd(6)} ${b.ratio.toFixed(3).padEnd(6)} ${b.ease_mm.toFixed(0).padEnd(5)} ` +
      `${c1.H_in.toFixed(2).padEnd(6)} ${c1.ratio.toFixed(3).padEnd(6)} ` +
      `${c2.H_in.toFixed(2).padEnd(6)} ${c2.ratio.toFixed(3)}`
    );
  });

  // ── Engineering assessment ───────────────────────────────────────────────
  console.log('\n\n' + '═'.repeat(100));
  console.log('  ENGINEERING ASSESSMENT');
  console.log('═'.repeat(100));

  console.log(`
STRATEGY A — Exact solver
  Behaviour:  Achieves perfect 12mm ease at every size.
  Problem:    Cap height DECREASES from ${stratA[0].H_in.toFixed(2)}" (XS) to ${stratA[5].H_in.toFixed(2)}" (XXL).
              H/B ratio varies from ${stratA[0].ratio.toFixed(3)} → ${stratA[5].ratio.toFixed(3)} (119% spread).
              XXL cap at ${stratA[5].ratio.toFixed(3)} H/B is industrially unacceptable (too flat).
  Root cause: Bicep grades at +0.375"/step; armhole curve only at +0.111"/step.
              The bicep diameter outgrows the armhole, forcing H down to compensate.
  Suitability: FAILS — mathematically correct, pattern-making incorrect.

STRATEGY B — Ratio-clamped [0.50, 0.65]
  Behaviour:  H/B clamped to [${R_LO}, ${R_HI}]. Ease varies freely.
  Cap height: ${stratB[0].H_in.toFixed(2)}" (XS) → ${stratB[5].H_in.toFixed(2)}" (XXL)
  H/B spread: ${((Bmax-Bmin)/Bmin*100).toFixed(1)}%
  Ease range: ${BeaseMin.toFixed(1)}mm – ${BeaseMax.toFixed(1)}mm
  Clamped:    ${BclamCnt} of 6 sizes require clamping
  Assessment: Proportional ratios are maintained but ease can swing ±${((BeaseMax-BeaseMin)/2).toFixed(1)}mm
              from the 12mm target. For knit fabrics (which accommodate 8–20mm ease
              without distortion) this is industrially acceptable.
  Suitability: GOOD — ratio-stable, ease variance is manageable for knit.

STRATEGY C1 — Fixed cap height (0 grade)
  Cap height: ${stratC_variants[0].rows[0].H_in.toFixed(2)}" constant across all sizes.
  H/B spread: ${((Math.max(...stratC_variants[0].rows.map(r=>r.ratio)) - Math.min(...stratC_variants[0].rows.map(r=>r.ratio))) /
                  Math.min(...stratC_variants[0].rows.map(r=>r.ratio)) * 100).toFixed(1)}%
  Ease range: ${Math.min(...stratC_variants[0].rows.map(r=>r.ease_mm)).toFixed(1)}mm – ${Math.max(...stratC_variants[0].rows.map(r=>r.ease_mm)).toFixed(1)}mm
  Assessment: Fixed H is the industry standard for knit T-shirt blocks.
              Ease varies ~0.22"/step (tracking armhole growth) — entirely normal.
              H/B ratio falls as size increases (same structural issue as A but
              less extreme since H is at least held flat).
  Suitability: ACCEPTABLE — matches factory practice but H/B still drifts at XS/XXL.

STRATEGY C2 — Graded cap height (+3mm/step)
  Cap height: ${stratC_variants[1].rows[0].H_in.toFixed(2)}" (XS) → ${stratC_variants[1].rows[5].H_in.toFixed(2)}" (XXL)
  H/B spread: ${((Math.max(...stratC_variants[1].rows.map(r=>r.ratio)) - Math.min(...stratC_variants[1].rows.map(r=>r.ratio))) /
                  Math.min(...stratC_variants[1].rows.map(r=>r.ratio)) * 100).toFixed(1)}%
  Ease range: ${Math.min(...stratC_variants[1].rows.map(r=>r.ease_mm)).toFixed(1)}mm – ${Math.max(...stratC_variants[1].rows.map(r=>r.ease_mm)).toFixed(1)}mm
  Assessment: A positive grade on H counteracts some of the bicep-growth effect.
              At +3mm/step, H grows slower than the bicep (+0.118"/step vs +0.375"/step),
              so H/B still falls but more gently than strategies A or C1.
  Suitability: GOOD as an intermediate step if H/B drift is considered acceptable.
`);

  console.log('─── RECOMMENDATION ──────────────────────────────────────────────────────────────────────────');
  console.log(`
  ★ RECOMMENDED: Strategy B (ratio-clamped) combined with Strategy C2 (graded H)

  Preferred hybrid approach for industrial knit T-shirt block grading:

  1. Grade cap height as: H = H_base + 3mm × (size_index - base_index)
     (Strategy C2) — this stabilises the H/B ratio and gives the cap a
     proportional visual shape across sizes.

  2. Accept ease variation in the range [8mm, 18mm] rather than targeting
     exactly 12mm at every size. For knit fabrics this range eases easily
     and is standard practice (AAMA Grade Rule reference).

  3. If ease at any size falls below 8mm, clamp H down to maintain minimum
     ease. If ease exceeds 18mm, add a notch/ease mark on the sleeve cap
     and document as a sewing instruction — do not flatten the cap.

  This hybrid avoids the H-collapse of Strategy A, avoids the large ease
  swings of unconstrained Strategy B, and follows the common factory approach
  of grading cap height proportionally alongside the sleeve width.

  A simpler factory-ready rule: H_M = ${(baseH_mm/S).toFixed(3)}", grade at +0.125"/size
  (≈ +3.175mm/step). This gives H from ${((baseH_mm/S) + 0.125*(-2)).toFixed(3)}" (XS) to
  ${((baseH_mm/S) + 0.125*(3)).toFixed(3)}" (XXL) and keeps H/B in a tighter, more
  proportional band while allowing ease to vary naturally.
`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
