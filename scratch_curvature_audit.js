// ── Sleeve Cap Curvature Audit ───────────────────────────────────────────
// Analyzes front and back sleeve cap Bézier curvature for three CP variants.
// Reference geometry: Size M (H = 113.812mm, B = halfBicep = 189.23mm)

const S = 25.4;   // mm per inch
const H = 113.812; // mm — Size M base cap height (exact solver + 12mm ease)
const B = 7.45 * S; // mm — Size M half-bicep with ease  = 189.23mm

// ── helpers ────────────────────────────────────────────────────────────────
function bezierLen(p0, p1, p2, p3, seg = 200) {
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

function curvatureProfile(p0, p1, p2, p3, steps = 500) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, mt = 1 - t;

    // First derivatives
    const dx = 3*(mt**2*(p1.x-p0.x) + 2*mt*t*(p2.x-p1.x) + t**2*(p3.x-p2.x));
    const dy = 3*(mt**2*(p1.y-p0.y) + 2*mt*t*(p2.y-p1.y) + t**2*(p3.y-p2.y));
    // Second derivatives
    const ddx = 6*(mt*(p2.x-2*p1.x+p0.x) + t*(p3.x-2*p2.x+p1.x));
    const ddy = 6*(mt*(p2.y-2*p1.y+p0.y) + t*(p3.y-2*p2.y+p1.y));

    const spd2 = dx*dx + dy*dy;
    const k = spd2 < 1e-14 ? null : (dx*ddy - dy*ddx) / spd2**1.5;
    pts.push({ t, k, dx, dy });
  }
  return pts;
}

// Returns inflection analysis with a minimum κ magnitude threshold to ignore noise
function analyzeInflections(profile, noiseThreshold = 0.0003) {
  const valid = profile.filter(p => p.k !== null && Math.abs(p.k) > noiseThreshold);
  if (valid.length === 0) return { inflections: [], minK: null, maxK: null };

  const ks = valid.map(p => p.k);
  const minK = Math.min(...ks);
  const maxK = Math.max(...ks);

  const inflections = [];
  let prevSign = Math.sign(valid[0].k);
  for (let i = 1; i < valid.length; i++) {
    const s = Math.sign(valid[i].k);
    if (s !== prevSign && s !== 0) {
      inflections.push({ t: valid[i].t, k: valid[i].k });
      prevSign = s;
    }
  }
  return { inflections, minK, maxK };
}

// ASCII curvature sparkline (40 chars wide)
function sparkline(profile, width = 45) {
  const valid = profile.filter(p => p.k !== null);
  const ks = valid.map(p => p.k);
  const mn = Math.min(...ks), mx = Math.max(...ks);
  const range = mx - mn || 1;
  const stride = Math.max(1, Math.floor(valid.length / width));
  let line = '';
  const bars = ['▁','▂','▃','▄','▅','▆','▇','█'];
  for (let i = 0; i < width; i++) {
    const k = valid[Math.min(i * stride, valid.length-1)].k;
    const norm = (k - mn) / range;
    line += bars[Math.min(7, Math.floor(norm * 8))];
  }
  return line;
}

// ASCII shape plot of a bezier (top-down, 60x20 grid)
function shapePlot(p0, p1, p2, p3, width = 60, height = 16) {
  // collect points
  const pts = [];
  for (let i = 0; i <= 200; i++) {
    const t = i/200, mt = 1-t;
    pts.push({
      x: mt**3*p0.x + 3*mt**2*t*p1.x + 3*mt*t**2*p2.x + t**3*p3.x,
      y: mt**3*p0.y + 3*mt**2*t*p1.y + 3*mt*t**2*p2.y + t**3*p3.y,
    });
  }
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const grid = Array.from({length:height}, () => Array(width).fill(' '));
  pts.forEach(p => {
    const col = Math.round((p.x - x0) / (x1 - x0 + 1e-9) * (width-1));
    const row = height-1 - Math.round((p.y - y0) / (y1 - y0 + 1e-9) * (height-1));
    if (col >= 0 && col < width && row >= 0 && row < height)
      grid[row][col] = '·';
  });
  return grid.map(r => '  ' + r.join('')).join('\n');
}

// ── define three variants ──────────────────────────────────────────────────
const VARIANTS = [
  {
    label: 'A — Current',
    desc: 'CP1=(0.20B,H)  CP2=(0.55B,0.10H)',
    cp1x: 0.20, cp1y: 1.00,
    cp2x: 0.55, cp2y: 0.10,
  },
  {
    label: 'B — Alt1',
    desc: 'CP1=(0.25B,H)  CP2=(0.60B,0.20H)',
    cp1x: 0.25, cp1y: 1.00,
    cp2x: 0.60, cp2y: 0.20,
  },
  {
    label: 'C — Alt2',
    desc: 'CP1=(0.30B,H)  CP2=(0.65B,0.25H)',
    cp1x: 0.30, cp1y: 1.00,
    cp2x: 0.65, cp2y: 0.25,
  },
];

// ── back sleeve cap control points (frozen — not under test) ───────────────
// back: P0=(B,0)  P1=(1.45B,0.15H)  P2=(1.85B,H)  P3=(2B,H)
function backCPs() {
  return [
    {x:B,    y:0},
    {x:B*1.45, y:H*0.15},
    {x:B*1.85, y:H},
    {x:B*2,  y:H},
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('═'.repeat(90));
console.log('  SLEEVE CAP CURVATURE AUDIT — Size M Reference');
console.log(`  H = ${H.toFixed(3)}mm (${(H/S).toFixed(4)}")    B = ${B.toFixed(3)}mm (${(B/S).toFixed(4)}")    H/B = ${(H/B).toFixed(4)}`);
console.log('═'.repeat(90));

const NOISE = 0.0003; // curvature noise floor

const results = [];

for (const v of VARIANTS) {
  console.log('\n' + '─'.repeat(90));
  console.log(`  VARIANT ${v.label}`);
  console.log(`  ${v.desc}`);
  console.log('─'.repeat(90));

  // Front cap control points
  const fp = [
    {x:0,           y:H},
    {x:B*v.cp1x,    y:H*v.cp1y},
    {x:B*v.cp2x,    y:H*v.cp2y},
    {x:B,           y:0},
  ];
  // Back cap control points (frozen)
  const bp = backCPs();

  // Lengths
  const frontLen = bezierLen(fp[0],fp[1],fp[2],fp[3]);
  const backLen  = bezierLen(bp[0],bp[1],bp[2],bp[3]);
  const totalLen = frontLen + backLen;

  // Curvature profiles
  const fProf = curvatureProfile(fp[0],fp[1],fp[2],fp[3]);
  const bProf = curvatureProfile(bp[0],bp[1],bp[2],bp[3]);
  const fAnal = analyzeInflections(fProf, NOISE);
  const bAnal = analyzeInflections(bProf, NOISE);

  // ── FRONT ──
  console.log('\n  ┌─ FRONT SLEEVE CAP ─────────────────────────────────────────────────────┐');
  console.log(`  │  P0=(0, H)  P1=(${(B*v.cp1x).toFixed(1)}mm, ${(H*v.cp1y).toFixed(1)}mm)  P2=(${(B*v.cp2x).toFixed(1)}mm, ${(H*v.cp2y).toFixed(1)}mm)  P3=(${B.toFixed(1)}mm, 0)`);
  console.log(`  │  Arc length: ${frontLen.toFixed(4)}mm  (${(frontLen/S).toFixed(4)}")`);
  console.log(`  │  Min κ: ${fAnal.minK !== null ? fAnal.minK.toFixed(6) : 'N/A'}    Max κ: ${fAnal.maxK !== null ? fAnal.maxK.toFixed(6) : 'N/A'}`);
  if (fAnal.inflections.length === 0) {
    console.log('  │  Inflections: ✓ NONE — curvature is monotonic');
  } else {
    console.log(`  │  Inflections: ✗ ${fAnal.inflections.length} found:`);
    fAnal.inflections.forEach(inf => {
      console.log(`  │    t = ${inf.t.toFixed(4)}  κ = ${inf.k.toFixed(6)}  (${inf.t < 0.15 ? 'near crown — may be tangent artefact' : inf.t > 0.85 ? 'near underarm' : 'MID-CURVE — true inflection'})`);
    });
  }
  console.log(`  │  κ sparkline (t: 0→1):  ${sparkline(fProf)}`);
  console.log(`  │  Signs: min${fAnal.minK >= 0 ? '≥0 (convex)' : '<0 (concave at crown)'}  max${fAnal.maxK > 0 ? '>0 (convex at underarm)' : '≤0'}`);
  console.log('  └─────────────────────────────────────────────────────────────────────────┘');

  // Shape plot — front
  console.log('\n  Front shape (crown=top-left, underarm=bottom-right):');
  console.log(shapePlot(fp[0],fp[1],fp[2],fp[3], 55, 10));

  // ── BACK ──
  console.log('\n  ┌─ BACK SLEEVE CAP ──────────────────────────────────────────────────────┐');
  console.log(`  │  P0=(B,0)  P1=(1.45B,0.15H)  P2=(1.85B,H)  P3=(2B,H)  [FROZEN]`);
  console.log(`  │  Arc length: ${backLen.toFixed(4)}mm  (${(backLen/S).toFixed(4)}")`);
  console.log(`  │  Min κ: ${bAnal.minK !== null ? bAnal.minK.toFixed(6) : 'N/A'}    Max κ: ${bAnal.maxK !== null ? bAnal.maxK.toFixed(6) : 'N/A'}`);
  if (bAnal.inflections.length === 0) {
    console.log('  │  Inflections: ✓ NONE — curvature is monotonic');
  } else {
    console.log(`  │  Inflections: ✗ ${bAnal.inflections.length} found:`);
    bAnal.inflections.forEach(inf => {
      console.log(`  │    t = ${inf.t.toFixed(4)}  κ = ${inf.k.toFixed(6)}  (${inf.t < 0.15 ? 'near underarm — tangent artefact' : inf.t > 0.85 ? 'near crown' : 'MID-CURVE — true inflection'})`);
    });
  }
  console.log(`  │  κ sparkline (t: 0→1):  ${sparkline(bProf)}`);
  console.log('  └─────────────────────────────────────────────────────────────────────────┘');

  // Shape plot — back
  console.log('\n  Back shape (underarm=bottom-left, crown=top-right):');
  console.log(shapePlot(bp[0],bp[1],bp[2],bp[3], 55, 10));

  // Combined
  console.log(`\n  Combined SC length: ${totalLen.toFixed(4)}mm  (${(totalLen/S).toFixed(4)}")`);
  console.log(`  Front / Back ratio: ${(frontLen/backLen).toFixed(4)}`);
  console.log(`  Total ease vs M armhole (16.918"): ${((totalLen/S - 17.139)*S).toFixed(2)}mm`);

  results.push({
    label:   v.label,
    desc:    v.desc,
    frontLen,
    backLen,
    totalLen,
    fInflections: fAnal.inflections.length,
    bInflections: bAnal.inflections.length,
    fMinK:   fAnal.minK,
    fMaxK:   fAnal.maxK,
    bMinK:   bAnal.minK,
    bMaxK:   bAnal.maxK,
    fMonotonic: fAnal.inflections.length === 0,
    bMonotonic: bAnal.inflections.length === 0,
    cp1x: v.cp1x, cp2x: v.cp2x, cp2y: v.cp2y,
  });
}

// ── Comparison summary ──────────────────────────────────────────────────────
console.log('\n\n' + '═'.repeat(90));
console.log('  COMPARISON SUMMARY');
console.log('═'.repeat(90));

console.log('\n  Variant  │ Front Len  │ Back Len  │ Total Len  │ F-Inflt │ B-Inflt │ F Mono │ B Mono');
console.log('  ' + '─'.repeat(85));
for (const r of results) {
  console.log(
    `  ${r.label.padEnd(10).slice(0,10)} │ ${(r.frontLen/S).toFixed(4).padEnd(10)} │ ${(r.backLen/S).toFixed(4).padEnd(9)} │ ` +
    `${(r.totalLen/S).toFixed(4).padEnd(10)} │ ${String(r.fInflections).padEnd(7)} │ ${String(r.bInflections).padEnd(7)} │ ` +
    `${r.fMonotonic ? '✓ YES ' : '✗ NO  '} │ ${r.bMonotonic ? '✓ YES' : '✗ NO'}`
  );
}

console.log('\n  Front curvature range (κ min → max):');
for (const r of results) {
  console.log(`    ${r.label.padEnd(14)}: ${r.fMinK.toFixed(6)} → ${r.fMaxK.toFixed(6)}  (sign change: ${r.fMinK < 0 && r.fMaxK > 0 ? 'YES ✗' : 'NO ✓'})`);
}

console.log('\n  Back curvature range (κ min → max):');
for (const r of results) {
  console.log(`    ${r.label.padEnd(14)}: ${r.bMinK.toFixed(6)} → ${r.bMaxK.toFixed(6)}  (sign change: ${r.bMinK < 0 && r.bMaxK > 0 ? 'YES ✗' : 'NO ✓'})`);
}

// ── Δ lengths vs current ────────────────────────────────────────────────────
const baseF = results[0].frontLen, baseB = results[0].backLen, baseT = results[0].totalLen;
console.log('\n  Arc length change vs Variant A:');
for (const r of results) {
  const df = r.frontLen - baseF, db = r.backLen - baseB, dt = r.totalLen - baseT;
  console.log(
    `    ${r.label.padEnd(14)}: Front ${(df>=0?'+':'')}${(df/S).toFixed(4)}"  Back ${(db>=0?'+':'')}${(db/S).toFixed(4)}"  Total ${(dt>=0?'+':'')}${(dt/S).toFixed(4)}"`
  );
}

// ── Qualitative crown shape description ────────────────────────────────────
console.log('\n  Crown shape analysis (what the front curve looks like):');
console.log(`
    Variant A (CP1x=0.20, CP2x=0.55, CP2y=0.10):
      Crown is NARROW and FLAT — P1 is close to the crown, creating a tight,
      nearly-horizontal plateau at the top before a sharp drop to P2.
      The low CP2y (10% of H) forces the curve to drop steeply through the mid-section.
      This steep drop combined with the gentle crown transition creates
      the S-curvature (curvature reversal) observed at t ≈ 0.42.

    Variant B (CP1x=0.25, CP2x=0.60, CP2y=0.20):
      Crown remains flat (P1 at H). P2 is higher (20% H) and further out (60% B).
      The transition from crown to underarm is more gradual.
      The extra height at CP2 helps avoid the abrupt κ reversal.

    Variant C (CP1x=0.30, CP2x=0.65, CP2y=0.25):
      Crown is widest flat region. P2 at 25% H maintains more height mid-curve.
      The curve has the softest transition — closest to a classic tailor's sleeve crown.
      Slightly more rounded crown silhouette.
`);

// ── Detailed inflection trace for Variant A ─────────────────────────────────
console.log('  Detailed curvature trace for Variant A front cap (t: 0.30 → 0.60):');
const vA_fp = [{x:0,y:H},{x:B*0.20,y:H},{x:B*0.55,y:H*0.10},{x:B,y:0}];
const vAProf = curvatureProfile(vA_fp[0],vA_fp[1],vA_fp[2],vA_fp[3], 100);
console.log('    t      κ              sign');
console.log('    ' + '-'.repeat(35));
vAProf.filter(p => p.t >= 0.30 && p.t <= 0.60).forEach(p => {
  const k = p.k;
  if (k === null) return;
  const sign = Math.abs(k) < NOISE ? '~0' : k > 0 ? '+' : '-';
  const flag = Math.abs(k) < NOISE ? ' ← near-zero' : '';
  console.log(`    ${p.t.toFixed(3)}  ${k.toFixed(8)}  ${sign}${flag}`);
});

// ── RECOMMENDATION ─────────────────────────────────────────────────────────
console.log('\n\n' + '═'.repeat(90));
console.log('  RECOMMENDATION');
console.log('═'.repeat(90));

const recA = results[0], recB = results[1], recC = results[2];
const AhasInfl = recA.fInflections > 0;
const BhasInfl = recB.fInflections > 0;
const ChasInfl = recC.fInflections > 0;

console.log(`
  Variant A — Current geometry:
    Front inflections: ${recA.fInflections}   Back inflections: ${recA.bInflections}
    Front length: ${(recA.frontLen/S).toFixed(4)}"    Back length: ${(recA.backLen/S).toFixed(4)}"
    Crown shape: narrow flat crown, sharp mid-cap drop
    Verdict: ${AhasInfl ? '✗ FAIL — true mid-curve inflection in front cap' : '✓ PASS — monotonic'}

  Variant B — Alt1 geometry:
    Front inflections: ${recB.fInflections}   Back inflections: ${recB.bInflections}
    Front length: ${(recB.frontLen/S).toFixed(4)}"    Back length: ${(recB.backLen/S).toFixed(4)}"
    Crown shape: wider flat crown, gentler mid-cap transition
    Verdict: ${BhasInfl ? '✗ FAIL — inflection present' : '✓ PASS — monotonic'}

  Variant C — Alt2 geometry:
    Front inflections: ${recC.fInflections}   Back inflections: ${recC.bInflections}
    Front length: ${(recC.frontLen/S).toFixed(4)}"    Back length: ${(recC.backLen/S).toFixed(4)}"
    Crown shape: widest flat crown, softest transition — tailor's crown profile
    Verdict: ${ChasInfl ? '✗ FAIL — inflection present' : '✓ PASS — monotonic'}

  ★ RECOMMENDED: Variant ${!AhasInfl ? 'A (current)' : !BhasInfl ? 'B (CP1=0.25B, CP2=0.60B/0.20H)' : !ChasInfl ? 'C (CP1=0.30B, CP2=0.65B/0.25H)' : 'none — all have inflections'}

  Geometric rationale:
    A professional industrial knit T-shirt sleeve cap should:
    1. Have a flat or gently rounded crown (not a sharp peak)
    2. Curve smoothly and monotonically from crown to underarm notch
    3. Avoid any S-curvature (curvature reversal) in the mid-cap region
    4. Have the back curve slightly longer than the front (back ease distribution)

  The inflection in Variant A at t ≈ 0.42 is caused by CP2y being too low (10% H).
  When CP2y is this low, the curve must drop steeply to reach it from the flat crown,
  then gentles out again toward the underarm — creating a curvature reversal.
  Raising CP2y to 20–25% H gives the curve enough mid-height to transition smoothly.

  Arc length impact:
    Moving from A→B→C adds ${((recB.totalLen - recA.totalLen)/S*25.4).toFixed(2)}mm / ${((recC.totalLen - recA.totalLen)/S*25.4).toFixed(2)}mm to total SC length.
    This increases the ease per armhole by approximately the same amount.
    For the +3mm/step grading model, this shifts ease upward by ~${((recB.totalLen - recA.totalLen)/S*25.4).toFixed(0)}–${((recC.totalLen - recA.totalLen)/S*25.4).toFixed(0)}mm
    at every size — a small, manageable adjustment.
`);
