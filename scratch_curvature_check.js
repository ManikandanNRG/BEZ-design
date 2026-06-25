// Curvature sign audit of the front sleeve cap bezier across H/B values
// to determine if inflections are structural or numerical artefacts of the flat crown tangent.

function bezierCurvatureProfile(p0, p1, p2, p3, steps = 100) {
  const ks = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, mt = 1 - t;
    const dx = 3*(mt**2*(p1.x-p0.x) + 2*mt*t*(p2.x-p1.x) + t**2*(p3.x-p2.x));
    const dy = 3*(mt**2*(p1.y-p0.y) + 2*mt*t*(p2.y-p1.y) + t**2*(p3.y-p2.y));
    const ddx = 6*(mt*(p2.x-2*p1.x+p0.x) + t*(p3.x-2*p2.x+p1.x));
    const ddy = 6*(mt*(p2.y-2*p1.y+p0.y) + t*(p3.y-2*p2.y+p1.y));
    const spd = (dx**2 + dy**2);
    const k = spd < 1e-12 ? 0 : (dx*ddy - dy*ddx) / spd**1.5;
    ks.push({ t: t.toFixed(3), k, dx, dy });
  }
  return ks;
}

// Test front cap at H/B = 0.601 (size M baseline)
const H = 113.812, B = 189.23; // mm values from size M

console.log(`Front sleeve cap curvature profile  H=${H.toFixed(2)}mm  B=${B.toFixed(2)}mm  H/B=${(H/B).toFixed(4)}`);
console.log(`Control points:`);
console.log(`  P0=(0, H)              = (0, ${H.toFixed(2)})`);
console.log(`  P1=(B*0.20, H)         = (${(B*0.20).toFixed(2)}, ${H.toFixed(2)})  ← HORIZONTAL TANGENT at crown`);
console.log(`  P2=(B*0.55, H*0.10)    = (${(B*0.55).toFixed(2)}, ${(H*0.10).toFixed(2)})`);
console.log(`  P3=(B, 0)              = (${B.toFixed(2)}, 0)\n`);

const profile = bezierCurvatureProfile(
  {x:0, y:H}, {x:B*0.20, y:H}, {x:B*0.55, y:H*0.10}, {x:B, y:0}
);

// Show where curvature goes negative
let signChanges = 0;
let prevSign = Math.sign(profile[1].k); // skip t=0 (singularity from horizontal tangent)
const THRESHOLD = 0.0005; // ignore near-zero curvature (numerical noise)

console.log('t       curvature (κ)     sign   note');
console.log('-'.repeat(60));
for (let i = 1; i < profile.length; i++) {
  const { t, k } = profile[i];
  const effSign = Math.abs(k) < THRESHOLD ? 0 : Math.sign(k);
  const sign = effSign === 1 ? '+' : effSign === -1 ? '-' : '~0';
  const changed = effSign !== 0 && effSign !== prevSign && prevSign !== 0;
  if (changed) signChanges++;
  const note = changed ? '← SIGN CHANGE' : '';
  if (i <= 10 || Math.abs(k) < THRESHOLD || changed || i % 10 === 0)
    console.log(`${t}   ${k.toFixed(8)}   ${sign}     ${note}`);
  if (effSign !== 0) prevSign = effSign;
}
console.log(`\nTotal sign changes (|κ| > ${THRESHOLD}): ${signChanges}`);

console.log(`\n─── Interpretation ─────────────────────────────────────────────────────────`);
console.log(`
At t=0, the crown of the sleeve cap has:
  P0 = P1 in Y (horizontal tangent) → first derivative dy=0, dx≠0
  This creates a degenerate curvature value at t≈0 (0/small = large or sign-sensitive).
  Near t=0, κ may spike or change sign purely from the horizontal tangent alignment.

  If the sign change occurs ONLY near t=0 (first 5–10% of curve):
  → It is a numerical artefact of the horizontal crown tangent, NOT a geometric inflection.
  → The visible curve is smooth and monotonic.
  → The inflection flag is a false positive.

  If the sign change occurs in the MIDDLE of the curve (t=0.2–0.8):
  → It is a real inflection point and must be fixed.
`);

// Check if all sign changes are near t=0
const BOUNDARY = 0.10; // within first 10% of curve
let signChangesNearZero = 0, signChangesMid = 0;
prevSign = Math.sign(profile[1].k);
for (let i = 2; i < profile.length; i++) {
  const { t, k } = profile[i];
  const effSign = Math.abs(k) < THRESHOLD ? 0 : Math.sign(k);
  if (effSign !== 0 && effSign !== prevSign && prevSign !== 0) {
    if (parseFloat(t) < BOUNDARY) signChangesNearZero++;
    else signChangesMid++;
  }
  if (effSign !== 0) prevSign = effSign;
}
console.log(`Sign changes near t=0 (t < ${BOUNDARY}):  ${signChangesNearZero}`);
console.log(`Sign changes in mid-curve (t >= ${BOUNDARY}): ${signChangesMid}`);
console.log(signChangesMid === 0 ? '\n✓ All inflections are near-t=0 boundary artefacts — curve is visually monotonic.' :
                                   '\n✗ True mid-curve inflection detected — requires correction.');
