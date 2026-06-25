// Calculate curvature values for XXL Back armhole
const scale = 25.4;
const halfChest = (45.5 / 4 + 2.0 * 0.25) * scale;
const halfShoulder = (18.5 / 2) * scale;
const shoulderSlope = 1.75 * scale;
const acrossBack = (17.63 / 2) * scale;
const armholeStraight = 8.5 * scale;

const backShoulderRiseVal = halfShoulder * 0.019 + (halfChest - halfShoulder) * 0.110;

const bp0 = { x: halfShoulder, y: shoulderSlope - backShoulderRiseVal };
const bp1 = { x: halfShoulder - (halfShoulder - acrossBack) * 0.57, y: (shoulderSlope - backShoulderRiseVal) + (armholeStraight - (shoulderSlope - backShoulderRiseVal)) * 0.12 };
const bp2 = { x: acrossBack - (halfChest - acrossBack) * 0.50, y: armholeStraight - (halfChest - acrossBack) * 1.50 * Math.tan(5 * Math.PI / 180) };
const bp3 = { x: halfChest, y: armholeStraight };

console.log("Points:", { bp0, bp1, bp2, bp3 });

const curvatureSigns = [];
const segments = 100;
for (let i = 0; i <= segments; i++) {
  const t = i / segments;
  const mt = 1 - t;
  
  // First derivatives
  const dx = 3*mt*mt*(bp1.x - bp0.x) + 6*mt*t*(bp2.x - bp1.x) + 3*t*t*(bp3.x - bp2.x);
  const dy = 3*mt*mt*(bp1.y - bp0.y) + 6*mt*t*(bp2.y - bp1.y) + 3*t*t*(bp3.y - bp2.y);
  
  // Second derivatives
  const ddx = 6*mt*(bp2.x - 2*bp1.x + bp0.x) + 6*t*(bp3.x - 2*bp2.x + bp1.x);
  const ddy = 6*mt*(bp2.y - 2*bp1.y + bp0.y) + 6*t*(bp3.y - 2*bp2.y + bp1.y);
  
  const numerator = dx * ddy - dy * ddx;
  const denominator = Math.pow(dx * dx + dy * dy, 1.5);
  
  if (denominator > 1e-8) {
    const kappa = numerator / denominator;
    curvatureSigns.push({ t, kappa });
  }
}

const signChanges = [];
let lastSign = Math.sign(curvatureSigns[0].kappa);
for (let i = 1; i < curvatureSigns.length; i++) {
  const s = Math.sign(curvatureSigns[i].kappa);
  if (s !== 0 && s !== lastSign) {
    signChanges.push({ index: i, t: curvatureSigns[i].t, from: lastSign, to: s, val: curvatureSigns[i].kappa });
    lastSign = s;
  }
}

console.log("Sign changes:", signChanges);
console.log("First 10 kappa values:", curvatureSigns.slice(0, 10));
console.log("Last 10 kappa values:", curvatureSigns.slice(-10));
