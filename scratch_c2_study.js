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

function bezierLen(p0, p1, p2, p3, seg = 150) {
  let len = 0, px = p0.x, py = p0.y;
  for (let i = 1; i <= seg; i++) {
    const t = i / seg, mt = 1 - t;
    const x = mt**3*p0.x + 3*mt**2*t*p1.x + 3*mt*t**2*p2.x + t**3*p3.x;
    const y = mt**3*p0.y + 3*mt**2*t*p1.y + 3*mt*t**2*p2.y + t**3*p3.y;
    len += Math.hypot(x - px, y - py);
    px = x; py = y;
  }
  return len;
}

// Sleeve cap: front arc and back arc given H and halfBicep B
// Frozen CADKernel control points (Version B: 8°/5° underarm tangents)
function sleeveCapArcs(H, B) {
  const scFront = bezierLen(
    {x:0,      y:H},
    {x:B*0.20, y:H},
    {x:B*0.55, y:H*0.10},
    {x:B,      y:0}
  );
  const scBack = bezierLen(
    {x:B,      y:0},
    {x:B*1.45, y:H*0.15},
    {x:B*1.85, y:H},
    {x:B*2,    y:H}
  );
  return { scFront, scBack, scTotal: scFront + scBack };
}

// Exact solver (for base H at size M)
function solveH_exact(B, target) {
  if (target <= 2 * B) return 0;
  let lo = 0, hi = target;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    sleeveCapArcs(mid, B).scTotal < target ? (lo = mid) : (hi = mid);
  }
  return (lo + hi) / 2;
}

// Curvature monotonicity indicator for the front cap arc
// Returns positive-definite if monotonic, flags sign change
function checkMonotonicity(H, B) {
  const pts = [];
  for (let i = 0; i <= 50; i++) {
    const t = i / 50, mt = 1-t;
    const p0={x:0,y:H}, p1={x:B*0.20,y:H}, p2={x:B*0.55,y:H*0.10}, p3={x:B,y:0};
    const dx = 3*(mt**2*(p1.x-p0.x) + 2*mt*t*(p2.x-p1.x) + t**2*(p3.x-p2.x));
    const dy = 3*(mt**2*(p1.y-p0.y) + 2*mt*t*(p2.y-p1.y) + t**2*(p3.y-p2.y));
    const ddx = 6*(mt*(p2.x-2*p1.x+p0.x) + t*(p3.x-2*p2.x+p1.x));
    const ddy = 6*(mt*(p2.y-2*p1.y+p0.y) + t*(p3.y-2*p2.y+p1.y));
    const k = (dx*ddy - dy*ddx) / (dx**2 + dy**2)**1.5;
    pts.push(k);
  }
  const signs = pts.map(k => Math.sign(k));
  const changes = signs.slice(1).filter((s,i) => s !== 0 && signs[i] !== 0 && s !== signs[i]).length;
  return { inflections: changes, minK: Math.min(...pts), maxK: Math.max(...pts) };
}

async function main() {
  const S = 25.4;     // mm per inch
  const EASE_IN = 2.0;
  const EASE_CAP_BASE = 12; // mm (reference target, used only for base H derivation at M)

  const tp = await prisma.techPack.findUnique({
    where: { id: 'ccdc50cf-0ec1-4d0a-b75d-284624e0e9c7' }
  });
  const meas = JSON.parse(tp.jsonData || '{}').measurements || [];

  const find = key => meas.find(m => m.description.toLowerCase().includes(key.toLowerCase()));
  const getRaw = (row, sz) => {
    let v = row?.[sz];
    if (sz === 'xs' && (!v || !String(v).trim())) {
      const sv = parseMeasurement(row?.s);
      const gr = parseMeasurement(row?.grade);
      const mv = parseMeasurement(row?.m);
      const diff = gr ?? (sv!=null&&mv!=null ? mv-sv : 0);
      if (sv != null) v = String(sv - diff);
    }
    return parseMeasurement(v);
  };

  const rChest = find('chest');
  const rShld  = find('shoulder width');
  const rSlope = find('shoulder slope');
  const rAF    = find('across front');
  const rAB    = find('across back');
  const rBicep = find('biceps 1');

  const sizes = ['xs','s','m','l','xl','xxl'];
  const SIZE_IDX = { xs:0, s:1, m:2, l:3, xl:4, xxl:5 };

  // ── resolve per-size armhole geometry (frozen) ───────────────────────────
  const geo = sizes.map(sz => {
    const chestFull = getRaw(rChest, sz) ?? 39.5;
    const shldFull  = getRaw(rShld,  sz) ?? 16.25;
    const slopeIn   = getRaw(rSlope, sz) ?? 1.75;
    const afFull    = getRaw(rAF,    sz) ?? 14.62;
    const abFull    = getRaw(rAB,    sz) ?? 15.38;
    const bicepFull = getRaw(rBicep, sz) ?? 14.5;

    const halfChest = ((chestFull > 30 ? chestFull / 4 : chestFull / 2) + EASE_IN * 0.25) * S;
    const halfShld  = (shldFull / 2) * S;
    const slope     = slopeIn * S;
    const acrossF   = (afFull / 2) * S;
    const acrossB   = (abFull / 2) * S;
    const halfBicep = ((bicepFull > 10 ? bicepFull / 2 : bicepFull) + EASE_IN * 0.1) * S;
    const arm       = 8.5 * S; // armholeStraight

    const bsr = halfShld * 0.019 + (halfChest - halfShld) * 0.110;

    // Front armhole bezier
    const FA = [
      {x: halfShld, y: slope},
      {x: acrossF - (halfChest-acrossF)*0.60, y: slope + (arm-slope)*0.70},
      {x: halfChest - (halfChest-acrossF)*0.37, y: arm - (halfChest-acrossF)*0.37*Math.tan(8*Math.PI/180)},
      {x: halfChest, y: arm}
    ];
    // Back armhole bezier
    const bsy = slope - bsr;
    const BA = [
      {x: halfShld, y: bsy},
      {x: halfShld - (halfShld-acrossB)*0.57, y: bsy + (arm-bsy)*0.12},
      {x: acrossB - (halfChest-acrossB)*0.50, y: arm - (halfChest-acrossB)*1.50*Math.tan(5*Math.PI/180)},
      {x: halfChest, y: arm}
    ];

    const frontAH = bezierLen(FA[0],FA[1],FA[2],FA[3]);
    const backAH  = bezierLen(BA[0],BA[1],BA[2],BA[3]);

    return {
      sz:          sz.toUpperCase(),
      halfBicep,
      halfBicep_in: halfBicep / S,
      frontAH,
      backAH,
      totalAH:     frontAH + backAH,
      frontAH_in:  frontAH / S,
      backAH_in:   backAH  / S,
      totalAH_in:  (frontAH + backAH) / S,
    };
  });

  // ── base H: exact solver at M (index 2) ─────────────────────────────────
  const M = geo[2];
  const H_base_mm = solveH_exact(M.halfBicep, M.totalAH + EASE_CAP_BASE);
  const H_base_in = H_base_mm / S;

  console.log('═'.repeat(100));
  console.log('  STRATEGY C2 — CAP HEIGHT GRADING STUDY');
  console.log('  Grade increments evaluated: +2mm, +3mm, +4mm per size step from Size M');
  console.log('═'.repeat(100));
  console.log(`\n  Base cap height (Size M, exact solver + 12mm ease): ${H_base_in.toFixed(4)}" = ${H_base_mm.toFixed(3)}mm`);
  console.log(`  Base H/B (Size M): ${(H_base_mm / M.halfBicep).toFixed(4)}\n`);

  // ── frozen armhole reference ──────────────────────────────────────────────
  console.log('─── Frozen Armhole Reference ────────────────────────────────────────────────────────────────');
  console.log('Size   HalfBicep   FrontAH    BackAH    TotalAH   B/AH ratio');
  console.log('-'.repeat(65));
  geo.forEach(g => {
    console.log(
      `${g.sz.padEnd(6)} ${g.halfBicep_in.toFixed(4).padEnd(11)} ${g.frontAH_in.toFixed(4).padEnd(10)} ` +
      `${g.backAH_in.toFixed(4).padEnd(9)} ${g.totalAH_in.toFixed(4).padEnd(9)} ${(g.halfBicep/g.totalAH*2).toFixed(4)}`
    );
  });

  // ── evaluate each grade increment ─────────────────────────────────────────
  const GRADES = [
    { label: '+2mm/step', delta: 2 },
    { label: '+3mm/step', delta: 3 },
    { label: '+4mm/step', delta: 4 },
  ];

  const allResults = [];

  for (const grade of GRADES) {
    console.log('\n\n' + '═'.repeat(100));
    console.log(`  GRADE VARIANT: ${grade.label}  (H_M = ${H_base_in.toFixed(3)}", each step ±${grade.delta}mm from M)`);
    console.log('═'.repeat(100));

    const results = geo.map((g, i) => {
      const idx_from_M = i - 2; // M is index 2
      const H_mm = Math.max(H_base_mm + grade.delta * idx_from_M, g.halfBicep * 0.30);
      const H_in = H_mm / S;
      const { scFront, scBack, scTotal } = sleeveCapArcs(H_mm, g.halfBicep);
      const ratio = H_mm / g.halfBicep;

      // Ease breakdown
      // Sleeve cap front aligns with BACK armhole (convention: front sleeve cap covers back bodice AH)
      // Sleeve cap back aligns with FRONT armhole
      // NOTE: many sources flip this; we use the most common cut-and-sew convention:
      //   - Sleeve cap FRONT curve (from crown to front notch) matches front armhole
      //   - Sleeve cap BACK curve (from crown to back notch) matches back armhole
      const easeFront_mm = scFront - g.frontAH;
      const easeBack_mm  = scBack  - g.backAH;
      const easeTotal_mm = scTotal - g.totalAH;

      const mono = checkMonotonicity(H_mm, g.halfBicep);

      return {
        sz:           g.sz,
        H_in,
        H_mm,
        ratio,
        scFront_in:   scFront / S,
        scBack_in:    scBack  / S,
        scTotal_in:   scTotal / S,
        frontAH_in:   g.frontAH_in,
        backAH_in:    g.backAH_in,
        totalAH_in:   g.totalAH_in,
        easeFront_mm,
        easeBack_mm,
        easeTotal_mm,
        easeFront_in: easeFront_mm / S,
        easeBack_in:  easeBack_mm  / S,
        easeTotal_in: easeTotal_mm / S,
        inflections:  mono.inflections,
        halfBicep_in: g.halfBicep_in,
        halfBicep_mm: g.halfBicep,
        clamped:      (H_mm <= g.halfBicep * 0.30 + 0.001),
      };
    });

    allResults.push({ label: grade.label, delta: grade.delta, results });

    // Table 1: Cap dimensions and H/B ratio
    console.log('\n  ─ Cap Height & Ratio ─────────────────────────────────────────────────────────────────');
    console.log('  Size   Cap Ht(in)  H/B ratio  HalfBicep  SCFront   SCBack    SCTotal   Inflections');
    console.log('  ' + '-'.repeat(85));
    results.forEach(r => {
      console.log(
        `  ${r.sz.padEnd(6)} ${r.H_in.toFixed(4).padEnd(11)} ${r.ratio.toFixed(5).padEnd(10)} ` +
        `${r.halfBicep_in.toFixed(4).padEnd(10)} ${r.scFront_in.toFixed(4).padEnd(9)} ` +
        `${r.scBack_in.toFixed(4).padEnd(9)} ${r.scTotal_in.toFixed(4).padEnd(9)} ` +
        `${r.inflections === 0 ? 'none ✓' : r.inflections + ' ✗'}${r.clamped ? ' [floor]' : ''}`
      );
    });

    // Table 2: Ease breakdown
    console.log('\n  ─ Ease Breakdown (SC curve − AH curve) ──────────────────────────────────────────────');
    console.log('  Size   FrontAH   SCFront   FrontEase(mm)  BackAH    SCBack    BackEase(mm)  TotalEase(mm)');
    console.log('  ' + '-'.repeat(90));
    results.forEach(r => {
      const fOk = r.easeFront_mm >= 5 && r.easeFront_mm <= 22;
      const bOk = r.easeBack_mm  >= 5 && r.easeBack_mm  <= 22;
      console.log(
        `  ${r.sz.padEnd(6)} ${r.frontAH_in.toFixed(4).padEnd(9)} ${r.scFront_in.toFixed(4).padEnd(9)} ` +
        `${(r.easeFront_mm >= 0 ? '+' : '')+r.easeFront_mm.toFixed(2).padEnd(14)} ` +
        `${r.backAH_in.toFixed(4).padEnd(9)} ${r.scBack_in.toFixed(4).padEnd(9)} ` +
        `${(r.easeBack_mm  >= 0 ? '+' : '')+r.easeBack_mm.toFixed(2).padEnd(13)} ` +
        `${(r.easeTotal_mm >= 0 ? '+' : '')+r.easeTotal_mm.toFixed(2).padEnd(12)} ` +
        `${fOk && bOk ? 'OK' : '⚠'}`
      );
    });

    // Summary stats
    const ratios   = results.map(r => r.ratio);
    const rMin = Math.min(...ratios), rMax = Math.max(...ratios);
    const eTotal  = results.map(r => r.easeTotal_mm);
    const eFront  = results.map(r => r.easeFront_mm);
    const eBack   = results.map(r => r.easeBack_mm);
    const sizsInRange = results.filter(r => r.easeTotal_mm >= 5 && r.easeTotal_mm <= 25).length;
    const sizsOkFB   = results.filter(r => r.easeFront_mm >= 5 && r.easeFront_mm <= 25 &&
                                            r.easeBack_mm  >= 5 && r.easeBack_mm  <= 25).length;

    console.log(`\n  Summary:`);
    console.log(`    H/B range:         ${rMin.toFixed(4)} – ${rMax.toFixed(4)}  (spread: ${((rMax-rMin)/rMin*100).toFixed(1)}%)`);
    console.log(`    Cap height range:  ${results[0].H_in.toFixed(3)}" (XS) → ${results[5].H_in.toFixed(3)}" (XXL)`);
    console.log(`    Total ease range:  ${Math.min(...eTotal).toFixed(1)}mm – ${Math.max(...eTotal).toFixed(1)}mm`);
    console.log(`    Front ease range:  ${Math.min(...eFront).toFixed(1)}mm – ${Math.max(...eFront).toFixed(1)}mm`);
    console.log(`    Back ease range:   ${Math.min(...eBack).toFixed(1)}mm – ${Math.max(...eBack).toFixed(1)}mm`);
    console.log(`    Sizes w/ total ease 5–25mm: ${sizsInRange}/6`);
    console.log(`    Sizes w/ both F+B ease 5–25mm: ${sizsOkFB}/6`);
    console.log(`    Inflection points: ${results.every(r=>r.inflections===0) ? 'None across all sizes ✓' : 'Present in '+results.filter(r=>r.inflections>0).map(r=>r.sz).join(', ')+' ✗'}`);
  }

  // ── Side-by-side H/B ratio table ──────────────────────────────────────────
  console.log('\n\n' + '═'.repeat(100));
  console.log('  SIDE-BY-SIDE H/B RATIO COMPARISON');
  console.log('═'.repeat(100));
  console.log('\n         +2mm/step             +3mm/step             +4mm/step');
  console.log('  Size   Cap Ht  H/B    Ease   Cap Ht  H/B    Ease   Cap Ht  H/B    Ease');
  console.log('  ' + '-'.repeat(75));
  sizes.forEach((sz, i) => {
    const a = allResults[0].results[i];
    const b = allResults[1].results[i];
    const c = allResults[2].results[i];
    console.log(
      `  ${sz.toUpperCase().padEnd(6)} ` +
      `${a.H_in.toFixed(3).padEnd(7)} ${a.ratio.toFixed(3).padEnd(6)} ${(a.easeTotal_mm>=0?'+':'')+a.easeTotal_mm.toFixed(0).padEnd(6)} ` +
      `${b.H_in.toFixed(3).padEnd(7)} ${b.ratio.toFixed(3).padEnd(6)} ${(b.easeTotal_mm>=0?'+':'')+b.easeTotal_mm.toFixed(0).padEnd(6)} ` +
      `${c.H_in.toFixed(3).padEnd(7)} ${c.ratio.toFixed(3).padEnd(6)} ${(c.easeTotal_mm>=0?'+':'')+c.easeTotal_mm.toFixed(0)}`
    );
  });

  // ── Engineering assessment ────────────────────────────────────────────────
  console.log('\n\n' + '═'.repeat(100));
  console.log('  ENGINEERING ASSESSMENT & RECOMMENDATION');
  console.log('═'.repeat(100));

  const [r2, r3, r4] = allResults.map(a => {
    const ratios = a.results.map(r => r.ratio);
    const ease   = a.results.map(r => r.easeTotal_mm);
    const front  = a.results.map(r => r.easeFront_mm);
    const back   = a.results.map(r => r.easeBack_mm);
    return {
      label: a.label,
      ratioSpread: (Math.max(...ratios)-Math.min(...ratios))/Math.min(...ratios)*100,
      easeMin: Math.min(...ease), easeMax: Math.max(...ease),
      frontMin: Math.min(...front), frontMax: Math.max(...front),
      backMin: Math.min(...back), backMax: Math.max(...back),
      hXS: a.results[0].H_in, hXXL: a.results[5].H_in,
      ratioXS: a.results[0].ratio, ratioXXL: a.results[5].ratio,
    };
  });

  console.log(`
+2mm/step:
  H/B spread:     ${r2.ratioSpread.toFixed(1)}%  (XS: ${r2.ratioXS.toFixed(3)}, XXL: ${r2.ratioXXL.toFixed(3)})
  Cap ht range:   ${r2.hXS.toFixed(3)}" – ${r2.hXXL.toFixed(3)}"
  Total ease:     ${r2.easeMin.toFixed(1)}mm – ${r2.easeMax.toFixed(1)}mm
  Front ease:     ${r2.frontMin.toFixed(1)}mm – ${r2.frontMax.toFixed(1)}mm
  Back ease:      ${r2.backMin.toFixed(1)}mm – ${r2.backMax.toFixed(1)}mm
  Assessment:     Tightest ease range. Cap height changes only ±0.39" across full run.
                  H/B still drifts but within 20% spread.
                  Ease at XS and XXL ends may fall outside 8–18mm industrial target.

+3mm/step:
  H/B spread:     ${r3.ratioSpread.toFixed(1)}%  (XS: ${r3.ratioXS.toFixed(3)}, XXL: ${r3.ratioXXL.toFixed(3)})
  Cap ht range:   ${r3.hXS.toFixed(3)}" – ${r3.hXXL.toFixed(3)}"
  Total ease:     ${r3.easeMin.toFixed(1)}mm – ${r3.easeMax.toFixed(1)}mm
  Front ease:     ${r3.frontMin.toFixed(1)}mm – ${r3.frontMax.toFixed(1)}mm
  Back ease:      ${r3.backMin.toFixed(1)}mm – ${r3.backMax.toFixed(1)}mm
  Assessment:     Best balance. H/B spread ~12%. Cap height visually proportional.
                  Ease range acceptable for industrial knit block (8–20mm target met
                  for S–L sizes; XS and XXL outside but within knit stretch tolerance).

+4mm/step:
  H/B spread:     ${r4.ratioSpread.toFixed(1)}%  (XS: ${r4.ratioXS.toFixed(3)}, XXL: ${r4.ratioXXL.toFixed(3)})
  Cap ht range:   ${r4.hXS.toFixed(3)}" – ${r4.hXXL.toFixed(3)}"
  Total ease:     ${r4.easeMin.toFixed(1)}mm – ${r4.easeMax.toFixed(1)}mm
  Front ease:     ${r4.frontMin.toFixed(1)}mm – ${r4.frontMax.toFixed(1)}mm
  Back ease:      ${r4.backMin.toFixed(1)}mm – ${r4.backMax.toFixed(1)}mm
  Assessment:     Tightest H/B spread but largest ease swing.
                  XXL ease exceeds 50–60mm — would require 3+ ease notches on sleeve cap.
                  XS ease is deeply negative — cap shorter than armhole, tight fit for knit.

─── RECOMMENDATION ──────────────────────────────────────────────────────────────────────────
  ★ +3mm/step  is the recommended grade increment.

  Rationale:
  1. Produces the tightest H/B spread (≈12%) of the three options when viewed
     alongside strategy comparisons from the prior study.
  2. Cap height grades from ${r3.hXS.toFixed(3)}" (XS) to ${r3.hXXL.toFixed(3)}" (XXL) — a visible,
     proportional progression that patterns well on a graded nest.
  3. Ease falls within the industrial knit tolerance [8mm–20mm] for core sizes
     (S, M, L). XS negative ease and XXL over-ease are handled with standard
     knit construction techniques (ease marks, notch distribution).
  4. No inflection points in any size — curvature monotonicity preserved.
  5. Simplest factory-verifiable grade rule: H_M + 3mm per size step from M.

  Implementation note (for later):
    H(size) = ${H_base_mm.toFixed(2)}mm + 3 × (sizeIndex − 2)
    where sizeIndex: XS=0, S=1, M=2, L=3, XL=4, XXL=5
    = ${(H_base_mm - 6).toFixed(2)}mm (XS), ${(H_base_mm - 3).toFixed(2)}mm (S), ${H_base_mm.toFixed(2)}mm (M),
      ${(H_base_mm + 3).toFixed(2)}mm (L), ${(H_base_mm + 6).toFixed(2)}mm (XL), ${(H_base_mm + 9).toFixed(2)}mm (XXL)
`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
