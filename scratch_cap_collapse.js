// Deep-dive: understand why cap height DECREASES as size increases.
// The solver finds H such that: scFront(H,B) + scBack(H,B) = totalAH + 12mm
// As size goes up, totalAH grows ~0.22"/step but halfBicep also grows 0.375"/step.
// At some point the bicep is wide enough that even a FLAT cap (H=0) would be too long.
// Let's trace this explicitly.

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

// At H=0 (flat cap), what is the sleeve cap length?
// Front bezier: (0,0)→(B*0.2, 0)→(B*0.55, 0)→(B,0)  = straight line, len = B
// Back bezier:  (B,0)→(B*1.45,0)→(B*1.85,0)→(2B,0) = straight line, len = B
// So flatCapLength = 2*B (diameter of the bicep circle)
// The solver only activates when targetLen > 2*B.
// If targetLen <= 2*B, solver returns H=0.

// Check: at each size, is targetLen > 2*halfBicep?
const S = 25.4;
const EASE_IN = 2.0;

const data = [
  // [halfBicepSpec_in, totalAH_in]  (from previous run)
  { sz:'XS',  hb: 6.700, ah: 16.700 },
  { sz:'S',   hb: 7.075, ah: 16.918 },
  { sz:'M',   hb: 7.450, ah: 17.139 },
  { sz:'L',   hb: 7.825, ah: 17.362 },
  { sz:'XL',  hb: 8.200, ah: 17.589 },
  { sz:'XXL', hb: 8.575, ah: 17.818 },
];

console.log('─── Flat-cap threshold analysis ────────────────────────────────────────');
console.log('Size  │ HalfBicep │ 2×HalfBicep │ TargetLen(AH+12mm) │ Margin (tgt - 2B)  │ H feasible?');
console.log('──────┼───────────┼─────────────┼────────────────────┼────────────────────┼────────────');
for (const d of data) {
  const flat  = 2 * d.hb;                     // minimum achievable sleeve cap length
  const tgt   = d.ah + 12/S;                  // target = totalAH + 12mm converted to inches
  const margin= tgt - flat;
  console.log(
    `${d.sz.padEnd(5)} │ ${d.hb.toFixed(3).padEnd(9)} │ ${flat.toFixed(3).padEnd(11)} │ ${tgt.toFixed(4).padEnd(18)} │ ${margin.toFixed(4).padEnd(18)} │ ${margin > 0 ? 'YES' : 'NO — flat already too long!'}`
  );
}

console.log('\n─── Key insight ────────────────────────────────────────────────────────');
console.log(`
The sleeve cap length at H=0 (flat) = 2 × halfBicep.

The SOLVER target = totalArmhole + 12mm.

If  2×halfBicep  >  totalArmhole + 12mm
→  Even a FLAT cap is already longer than the target.
→  The solver cannot reduce cap length further — it would need a NEGATIVE height.
→  In this situation the solver returns H≈0, not a meaningful cap curve.

When 2×halfBicep approaches or exceeds the target:
→  The solver forces H → 0 (flat cap).
→  The H/B ratio collapses toward zero.
→  The sleeve cap becomes progressively flatter as size increases.

This is NOT a bug in the solver arithmetic — it is a STRUCTURAL PROBLEM:
The bicep grades faster than the armhole curve, so the sleeve "outgrows"
the armhole geometrically before the cap can compensate.

The root cause is the bicep-to-armhole grade ratio:
  ΔHalfBicep / step = 0.375"  (from spec)
  ΔTotalAH   / step ≈ 0.22"   (from geometry)

Net change per step: 2×0.375 = 0.750" growth in 2×halfBicep
                     0.22"    growth in total armhole
  → bicep diameter grows 3.4× faster than the armhole curve.
`);

console.log('─── At what size does the cap become critically flat? ───────────────────');
for (const d of data) {
  const flat  = 2 * d.hb;
  const tgt   = d.ah + 12/S;
  const pct   = ((tgt - flat) / tgt * 100);
  console.log(`  ${d.sz}: margin = ${(tgt-flat).toFixed(3)}" (${pct.toFixed(1)}% of target remaining as cap headroom)`);
}

console.log('\n─── Industrial context ─────────────────────────────────────────────────');
console.log(`
Standard practice for knit T-shirt blocks:
  • Sleeve cap height is typically FIXED or graded very slightly (e.g., by 0.0–0.125"/size).
  • For relaxed-fit knits: H ≈ 3.5"–4.5" is standard across ALL sizes.
  • The armhole-to-sleeve-cap matching is done via EASE DISTRIBUTION, not by
    drastically changing cap height.

The current solver is behaving as a pure length-matching solver:
  → It treats cap height as a free variable to achieve seam length parity.
  → It does NOT impose a proportionality constraint on H/B.
  → This causes H to COLLAPSE at larger sizes (bicep outgrows armhole).

Correct industrial approach:
  Option A: Grade cap height gently (+0"/size to +0.125"/size) and control
            armhole ease by adjusting the sleeve cap control point tensions,
            not by changing H dramatically.
  Option B: Clamp H/B to a target ratio (e.g., 0.55) and allow a small
            ease tolerance (±0.3") instead of forcing exact match.
`);
