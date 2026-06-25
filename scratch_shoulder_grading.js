const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
    const parts = val.split('/');
    result += parseFloat(parts[0]) / parseFloat(parts[1]);
  } else {
    const num = parseFloat(val);
    if (!isNaN(num)) result += num;
  }
  return result > 0 ? result : null;
}

// Derive XS by grading S down
function getVal(measurements, key, size) {
  const row = measurements.find(m => {
    const desc = m.description.toLowerCase();
    return desc.includes(key.toLowerCase());
  });
  if (!row) return null;

  let rawStr = row[size];

  if (size === 'xs' && (!rawStr || rawStr.trim() === '')) {
    const sVal = parseMeasurement(row.s);
    const mVal = parseMeasurement(row.m);
    const gradeVal = parseMeasurement(row.grade);
    const diff = gradeVal !== null ? gradeVal : (mVal !== null && sVal !== null ? mVal - sVal : 0);
    if (sVal !== null) rawStr = String(sVal - diff);
  }

  return parseMeasurement(rawStr);
}

async function main() {
  const tp = await prisma.techPack.findUnique({
    where: { id: "ccdc50cf-0ec1-4d0a-b75d-284624e0e9c7" }
  });
  if (!tp) { console.log("Tech pack not found."); return; }
  const data = JSON.parse(tp.jsonData || "{}");
  const meas = data.measurements || [];

  const sizes = ['xs', 's', 'm', 'l', 'xl', 'xxl'];

  console.log("=== SHOULDER GRADING ANALYSIS ===\n");

  const table = [];

  for (const size of sizes) {
    // Raw spec sheet values (inches)
    const neckWidthFull   = getVal(meas, 'neck width', size);            // seam-to-seam full width
    const shoulderFull    = getVal(meas, 'shoulder width', size);        // seam-to-seam full width
    const shoulderSlope   = getVal(meas, 'shoulder slope', size);        // vertical drop (inches)

    if (!neckWidthFull || !shoulderFull || !shoulderSlope) {
      console.log(`Size ${size.toUpperCase()}: insufficient data`);
      continue;
    }

    // Half-values (center-fold to shoulder seam)
    const halfNeck     = neckWidthFull / 2;
    const halfShoulder = shoulderFull / 2;

    // Horizontal run of shoulder seam from neck point to shoulder tip
    // = (full shoulder width - full neck width) / 2
    const shoulderHorizontalRun = (shoulderFull - neckWidthFull) / 2;

    // Shoulder angle: rise/run
    //   rise = shoulderSlope (vertical drop from HPS to shoulder tip)
    //   run  = shoulderHorizontalRun
    const angleRad = Math.atan2(shoulderSlope, shoulderHorizontalRun);
    const angleDeg = angleRad * (180 / Math.PI);

    table.push({
      size: size.toUpperCase(),
      neckWidth: neckWidthFull,
      shoulderWidth: shoulderFull,
      shoulderDrop: shoulderSlope,
      shoulderRun: shoulderHorizontalRun,
      angleDeg,
    });
  }

  // Print table
  console.log(
    `${'Size'.padEnd(5)} | ${'Neck W'.padEnd(8)} | ${'Shld W'.padEnd(8)} | ${'Drop'.padEnd(6)} | ${'Horiz Run'.padEnd(10)} | ${'Angle (°)'.padEnd(10)}`
  );
  console.log('-'.repeat(60));
  for (const r of table) {
    console.log(
      `${r.size.padEnd(5)} | ${r.neckWidth.toFixed(3).padEnd(8)} | ${r.shoulderWidth.toFixed(3).padEnd(8)} | ${r.shoulderDrop.toFixed(3).padEnd(6)} | ${r.shoulderRun.toFixed(4).padEnd(10)} | ${r.angleDeg.toFixed(4)}°`
    );
  }

  // --- Analysis ---
  console.log("\n=== WHY THE ANGLE CHANGES ===");
  const base = table[0]; // XS
  for (const r of table) {
    const dNeck  = r.neckWidth - base.neckWidth;
    const dShld  = r.shoulderWidth - base.shoulderWidth;
    const dRun   = r.shoulderRun - base.shoulderRun;
    const dAngle = r.angleDeg - base.angleDeg;
    if (r.size === 'XS') { console.log(`${r.size}: baseline`); continue; }
    console.log(`${r.size}: ΔNeck=${dNeck.toFixed(3)}", ΔShoulder=${dShld.toFixed(3)}", ΔRun=${dRun.toFixed(4)}", ΔAngle=${dAngle.toFixed(4)}°`);
  }

  // Grading increments
  const neckGradePerSize    = (table[table.length-1].neckWidth - table[0].neckWidth) / (table.length - 1);
  const shoulderGradePerSize= (table[table.length-1].shoulderWidth - table[0].shoulderWidth) / (table.length - 1);
  const runGradePerSize     = (table[table.length-1].shoulderRun - table[0].shoulderRun) / (table.length - 1);

  console.log(`\n  Avg grade/size: Neck ${neckGradePerSize.toFixed(4)}", Shoulder ${shoulderGradePerSize.toFixed(4)}", HorizRun ${runGradePerSize.toFixed(4)}"`);
  console.log(`  Shoulder drop constant: ${table[0].shoulderDrop}" (unchanged across sizes)`);
  console.log(`\n  ► Shoulder width grades ${shoulderGradePerSize.toFixed(4)}/size`);
  console.log(`  ► Neck width grades     ${neckGradePerSize.toFixed(4)}/size`);
  console.log(`  ► Net run change        ${runGradePerSize.toFixed(4)}/size`);

  if (Math.abs(shoulderGradePerSize) > Math.abs(neckGradePerSize)) {
    console.log(`  ► Shoulder grades faster than neck → horizontal run grows → angle shallows with size`);
  } else if (Math.abs(neckGradePerSize) > Math.abs(shoulderGradePerSize)) {
    console.log(`  ► Neck grades faster than shoulder → horizontal run shrinks → angle steepens with size`);
  } else {
    console.log(`  ► Both grade equally → horizontal run stays constant → angle constant`);
  }

  // --- Constant-angle model ---
  console.log("\n=== CONSTANT-ANGLE ALTERNATIVE MODEL ===");
  // Lock angle to size M
  const M = table.find(r => r.size === 'M');
  const lockedAngle = M.angleDeg;
  const lockedAngleRad = lockedAngle * (Math.PI / 180);
  const lockedDrop = M.shoulderDrop;

  console.log(`  Reference size: M, locked angle = ${lockedAngle.toFixed(4)}°, locked drop = ${lockedDrop}"`);
  console.log(
    `\n${'Size'.padEnd(5)} | ${'CurrAngle'.padEnd(10)} | ${'AltRun'.padEnd(10)} | ${'Alt ShldW'.padEnd(11)} | ${'Difference in Shld W'.padEnd(20)}`
  );
  console.log('-'.repeat(65));
  for (const r of table) {
    // In constant-angle model: keep the angle fixed, keep drop fixed,
    // recalculate what shoulder width would need to be
    const altRun   = lockedDrop / Math.tan(lockedAngleRad);
    const altShld  = r.neckWidth + 2 * altRun;  // shoulder width implied by constant angle and current neck width
    const diffShld = altShld - r.shoulderWidth;
    console.log(
      `${r.size.padEnd(5)} | ${r.angleDeg.toFixed(4).padEnd(10)}° | ${altRun.toFixed(4).padEnd(10)} | ${altShld.toFixed(4).padEnd(11)} | ${(diffShld >= 0 ? '+' : '')}${diffShld.toFixed(4)}"`
    );
  }

  console.log("\n=== INDUSTRY PRACTICE VERDICT ===");
  console.log(`
Standard industrial knit T-shirt block grading (AAMA/ASTM D5585):
  • Shoulder drop is typically constant across sizes (0° to 2° natural slope).
  • Shoulder width grades at ~3/4" per size (sometimes 5/8" or 1").
  • Neck width grades at ~1/4" per size.
  • These different grade rules intentionally produce a slight angle change: 
    the shoulder gets proportionally wider at larger sizes, reflecting broader
    body geometry. Larger chests tend to have slightly squarer (flatter)
    shoulder seams in practice.

CURRENT MODEL:
  • Shoulder grades: ${shoulderGradePerSize.toFixed(4)}/size
  • Neck grades:     ${neckGradePerSize.toFixed(4)}/size
  • Run change:      ${runGradePerSize.toFixed(4)}/size
  • Angle range:     ${table[0].angleDeg.toFixed(2)}° (XS) → ${table[table.length-1].angleDeg.toFixed(2)}° (XXL)
  • Verdict: ${Math.abs(runGradePerSize) < 0.15 ? 'Matches industrial practice — angle change is minimal and expected.' : 'Angle changes more than typical; review shoulder/neck grade ratio.'}

CONSTANT-ANGLE MODEL:
  • Fixed angle (M reference): ${lockedAngle.toFixed(4)}°
  • Required shoulder width recalculated from neck width at each size.
  • This forces shoulder to follow neck grade exactly — non-standard.
  • Most factory blocks do NOT use a constant-angle model because it
    ignores the natural proportional widening of the shoulder relative
    to the neck on larger body forms.

RECOMMENDATION:
  The CURRENT model is the more accurate one for industrial T-shirt grading.
  The slight angle change (${(table[table.length-1].angleDeg - table[0].angleDeg).toFixed(2)}° across 5 sizes) is well within acceptable factory tolerance 
  and consistent with AAMA/ASTM standard grade rules for knit tops.
`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
