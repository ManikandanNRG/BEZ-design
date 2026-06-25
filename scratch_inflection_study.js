// Deeper investigation:
// 1. Find minimum CP2y that eliminates front inflection
// 2. Analyze back curve inflection in depth
// 3. Determine if back inflection at t=0.624 is structural or near-zero noise

const S = 25.4;
const H = 113.812;
const B = 7.45 * S; // 189.23mm

function curvatureAt(p0,p1,p2,p3, t) {
  const mt = 1-t;
  const dx = 3*(mt**2*(p1.x-p0.x)+2*mt*t*(p2.x-p1.x)+t**2*(p3.x-p2.x));
  const dy = 3*(mt**2*(p1.y-p0.y)+2*mt*t*(p2.y-p1.y)+t**2*(p3.y-p2.y));
  const ddx = 6*(mt*(p2.x-2*p1.x+p0.x)+t*(p3.x-2*p2.x+p1.x));
  const ddy = 6*(mt*(p2.y-2*p1.y+p0.y)+t*(p3.y-2*p2.y+p1.y));
  const spd2 = dx*dx+dy*dy;
  return spd2 < 1e-14 ? null : (dx*ddy-dy*ddx)/spd2**1.5;
}

function hasInflection(p0,p1,p2,p3, steps=1000, noise=0.0003) {
  let prevSign = null;
  for (let i=0; i<=steps; i++) {
    const k = curvatureAt(p0,p1,p2,p3, i/steps);
    if (k === null || Math.abs(k) < noise) continue;
    const s = Math.sign(k);
    if (prevSign !== null && s !== prevSign) return true;
    prevSign = s;
  }
  return false;
}

function inflectionT(p0,p1,p2,p3, steps=2000, noise=0.0003) {
  let prevSign = null, prevT = null;
  for (let i=0; i<=steps; i++) {
    const t = i/steps;
    const k = curvatureAt(p0,p1,p2,p3, t);
    if (k === null || Math.abs(k) < noise) continue;
    const s = Math.sign(k);
    if (prevSign !== null && s !== prevSign) return { t, prevT, k };
    prevSign = s; prevT = t;
  }
  return null;
}

console.log('═'.repeat(80));
console.log('  CURVATURE INFLECTION ROOT CAUSE STUDY');
console.log('═'.repeat(80));

// ── Part 1: Sweep CP2y to find threshold for front inflection ──────────────
console.log('\n── Part 1: Front cap — sweep CP2y (CP1x=0.25, CP2x=0.60) ──────────────────\n');
console.log('CP2y    κ at t=0.1  κ at t=0.5  κ at t=0.9  Inflection?  Inflection t');
console.log('-'.repeat(75));

const cp1x = 0.25, cp2x = 0.60;
for (let cp2y_pct = 5; cp2y_pct <= 50; cp2y_pct += 5) {
  const cp2y = cp2y_pct / 100;
  const p = [
    {x:0,       y:H},
    {x:B*cp1x,  y:H},
    {x:B*cp2x,  y:H*cp2y},
    {x:B,       y:0}
  ];
  const k1 = curvatureAt(p[0],p[1],p[2],p[3], 0.1);
  const k5 = curvatureAt(p[0],p[1],p[2],p[3], 0.5);
  const k9 = curvatureAt(p[0],p[1],p[2],p[3], 0.9);
  const inf = inflectionT(p[0],p[1],p[2],p[3]);
  const hasInf = inf !== null;
  console.log(
    `${String(cp2y_pct+'%').padEnd(7)} ${(k1??0).toFixed(6).padEnd(11)} ${(k5??0).toFixed(6).padEnd(11)} ${(k9??0).toFixed(6).padEnd(11)} ` +
    `${hasInf ? 'YES ✗ ' : 'NO  ✓ '} ${inf ? inf.t.toFixed(4) : 'n/a'}`
  );
}

// ── Part 2: CP1x sweep with optimal CP2y ──────────────────────────────────
console.log('\n── Part 2: Front cap — sweep CP1x at CP2y=0.35 ─────────────────────────────\n');
console.log('CP1x    κ at t=0.1  κ at t=0.5  κ at t=0.9  Inflection?');
console.log('-'.repeat(65));
for (let cp1x_pct = 10; cp1x_pct <= 50; cp1x_pct += 5) {
  const cp1xv = cp1x_pct / 100;
  const p = [
    {x:0,        y:H},
    {x:B*cp1xv,  y:H},
    {x:B*0.60,   y:H*0.35},
    {x:B,        y:0}
  ];
  const k1 = curvatureAt(p[0],p[1],p[2],p[3], 0.1);
  const k5 = curvatureAt(p[0],p[1],p[2],p[3], 0.5);
  const k9 = curvatureAt(p[0],p[1],p[2],p[3], 0.9);
  const hasInf = hasInflection(p[0],p[1],p[2],p[3]);
  console.log(
    `${String(cp1x_pct+'%').padEnd(7)} ${(k1??0).toFixed(6).padEnd(11)} ${(k5??0).toFixed(6).padEnd(11)} ${(k9??0).toFixed(6).padEnd(11)} ` +
    `${hasInf ? 'YES ✗' : 'NO  ✓'}`
  );
}

// ── Part 3: Back curve inflection analysis ────────────────────────────────
console.log('\n── Part 3: Back cap inflection — curvature trace around t=0.60–0.70 ─────────\n');
const bp = [{x:B,y:0},{x:B*1.45,y:H*0.15},{x:B*1.85,y:H},{x:B*2,y:H}];
console.log('  Back control points: P0=(B,0)  P1=(1.45B,0.15H)  P2=(1.85B,H)  P3=(2B,H)');
console.log('  [The back curve goes from underarm (P0) to crown (P3)]\n');
console.log('  t      κ                 |κ|         sign     note');
console.log('  ' + '-'.repeat(60));
for (let i = 50; i <= 80; i++) {
  const t = i / 100;
  const k = curvatureAt(bp[0],bp[1],bp[2],bp[3], t);
  if (k === null) continue;
  const sign = Math.abs(k) < 0.0003 ? '~0' : k > 0 ? '+' : '-';
  const note = Math.abs(k) < 0.0003 ? '← near-zero (noise threshold)' : '';
  console.log(`  ${t.toFixed(2)}   ${k.toFixed(10).padEnd(17)} ${Math.abs(k).toFixed(8)}  ${sign.padEnd(7)} ${note}`);
}

// Alternative back CPs — test if monotonic back is achievable
console.log('\n── Part 4: Alternative back cap — sweep P1y to eliminate back inflection ────\n');
console.log('P1y(×H)  P2y(×H)  κ@0.1    κ@0.5    κ@0.9    Inflection?');
console.log('-'.repeat(65));
for (let p1y_pct of [0.10,0.15,0.20,0.25,0.30]) {
  for (let p2y_pct of [0.75, 0.85, 0.95, 1.00]) {
    const bp2 = [
      {x:B,       y:0},
      {x:B*1.45,  y:H*p1y_pct},
      {x:B*1.85,  y:H*p2y_pct},
      {x:B*2,     y:H}
    ];
    const k1 = curvatureAt(bp2[0],bp2[1],bp2[2],bp2[3], 0.1);
    const k5 = curvatureAt(bp2[0],bp2[1],bp2[2],bp2[3], 0.5);
    const k9 = curvatureAt(bp2[0],bp2[1],bp2[2],bp2[3], 0.9);
    const hasInf = hasInflection(bp2[0],bp2[1],bp2[2],bp2[3]);
    if (!hasInf) {
      console.log(
        `${String(p1y_pct).padEnd(8)} ${String(p2y_pct).padEnd(8)} ${(k1??0).toFixed(5).padEnd(8)} ${(k5??0).toFixed(5).padEnd(8)} ${(k9??0).toFixed(5).padEnd(8)} ` +
        `NO ✓ ← monotonic`
      );
    }
  }
}

// ── Part 5: Find optimal CPs that achieve monotonic curvature for both curves
console.log('\n── Part 5: Identify monotonic CP configurations ─────────────────────────────\n');
console.log('Testing front CP configurations (CP1x from 0.10–0.45, CP2x from 0.50–0.75):\n');
console.log('CP1x  CP2x  CP2y   Front monotonic?  ArcLen(in)');
console.log('-'.repeat(55));
const candidates = [];
for (let c1x = 0.15; c1x <= 0.45; c1x += 0.05) {
  for (let c2x = 0.50; c2x <= 0.80; c2x += 0.05) {
    for (let c2y = 0.20; c2y <= 0.50; c2y += 0.05) {
      const p = [{x:0,y:H},{x:B*c1x,y:H},{x:B*c2x,y:H*c2y},{x:B,y:0}];
      if (!hasInflection(p[0],p[1],p[2],p[3])) {
        const len = (() => {
          let l=0,px=p[0].x,py=p[0].y;
          for(let i=1;i<=200;i++){const t=i/200,mt=1-t;const x=mt**3*p[0].x+3*mt**2*t*p[1].x+3*mt*t**2*p[2].x+t**3*p[3].x;const y=mt**3*p[0].y+3*mt**2*t*p[1].y+3*mt*t**2*p[2].y+t**3*p[3].y;l+=Math.hypot(x-px,y-py);px=x;py=y;}
          return l;
        })();
        candidates.push({c1x,c2x,c2y,len});
      }
    }
  }
}

// Sort by arc length closest to current A (8.8250")
const targetLen = 8.8250 * S;
candidates.sort((a,b) => Math.abs(a.len - targetLen) - Math.abs(b.len - targetLen));
candidates.slice(0, 20).forEach(c => {
  console.log(
    `${c.c1x.toFixed(2).padEnd(5)} ${c.c2x.toFixed(2).padEnd(5)} ${c.c2y.toFixed(2).padEnd(6)} YES ✓               ${(c.len/S).toFixed(4)}"`
  );
});

console.log(`\nTotal monotonic configurations found: ${candidates.length}`);
console.log('\nBest candidates (monotonic + closest to current 8.8250" arc length):');
console.log(candidates.slice(0,5).map(c =>
  `  CP1=(${c.c1x.toFixed(2)}B, H)  CP2=(${c.c2x.toFixed(2)}B, ${c.c2y.toFixed(2)}H)  ArcLen=${(c.len/S).toFixed(4)}"`
).join('\n'));
