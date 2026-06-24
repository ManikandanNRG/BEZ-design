export interface Point {
  x: number;
  y: number;
  seamAllowance?: number;
}

export interface DynamicPoint {
  x: string | number;
  y: string | number;
}

export interface PathOp {
  type: 'M' | 'L' | 'C' | 'Q' | 'Z';
  points: DynamicPoint[];
  seamAllowance?: string | number; // Formula or direct number for custom edge seam allowance
}

export interface ResolvedOp {
  type: string;
  points: Point[];
  seamAllowance?: number;
}

export interface DimensionLineTemplate {
  start: DynamicPoint;
  end: DynamicPoint;
  label: string; 
  offset?: number; // Vertical/Horizontal offset to push the line out for visibility
  axis?: 'x' | 'y' | 'aligned'; 
}

export interface DimensionLine {
  start: Point;
  end: Point;
  label: string;
  offset?: number;
  axis?: 'x' | 'y' | 'aligned';
}

export interface CADPiece {
  name: string;
  ops: PathOp[];
  dimensionLines?: DimensionLineTemplate[];
  color: string;
  offsetX: number;
  offsetY: number;
}

/**
 * Safely evaluates mathematical expressions referencing measurement variables.
 */
export function evaluateFormula(formula: string | number, variables: Record<string, number>): number {
  if (typeof formula === 'number') return formula;
  
  let processed = formula.toLowerCase();
  
  // 1. Inject pi constant
  processed = processed.replace(/\bpi\b/g, Math.PI.toString());

  // 2. Replace variable names with their numeric values
  for (const [key, val] of Object.entries(variables)) {
    const regex = new RegExp(`\\b${key.toLowerCase()}\\b`, 'g');
    processed = processed.replace(regex, val.toString());
  }

  // 3. Map math functions (e.g. sin, cos, tan, sqrt) to JavaScript Math methods
  const mathFunctions = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sqrt', 'pow', 'abs', 'min', 'max', 'round', 'floor', 'ceil'];
  for (const func of mathFunctions) {
    const regex = new RegExp(`\\b${func}\\(`, 'g');
    processed = processed.replace(regex, `Math.${func}(`);
  }

  // 4. Sanitize: Allow only numbers, operators, parentheses, commas, spaces, and the approved Math words
  processed = processed.replace(/[^0-9+\-*/().,\sMatha-z]/g, '');

  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${processed});`)();
    return typeof result === 'number' && !isNaN(result) ? result : 0;
  } catch (e) {
    console.error(`CADKernel: Failed to evaluate formula: "${formula}" -> "${processed}"`, e);
    return 0;
  }
}

/**
 * Resolves templated strings like "½ Chest: {halfChest}" to their values formatted in the requested unit.
 */
export function resolveLabel(labelTemplate: string, variables: Record<string, number>, isCm: boolean): string {
  return labelTemplate.replace(/{(\w+)}/g, (_, key) => {
    const val = variables[key];
    if (val === undefined) return '';
    // Format: If original was CM, divide by 10. If inches, divide by 25.4
    if (isCm) {
      return (val / 10).toFixed(1) + 'cm';
    } else {
      return (val / 25.4).toFixed(2) + '"';
    }
  });
}

/**
 * Evaluates dynamic path operations into absolute coordinate commands.
 */
export function resolveOps(ops: PathOp[], variables: Record<string, number>): ResolvedOp[] {
  return ops.map(op => ({
    type: op.type,
    points: op.points.map(pt => ({
      x: evaluateFormula(pt.x, variables),
      y: evaluateFormula(pt.y, variables)
    })),
    seamAllowance: op.seamAllowance !== undefined ? evaluateFormula(op.seamAllowance, variables) : undefined
  }));
}

/**
 * Resolves parametric dimension lines into absolute points and formatted text.
 */
export function resolveDimensions(
  dims: DimensionLineTemplate[], 
  variables: Record<string, number>, 
  isCm: boolean,
  rawVariables?: Record<string, number>
): DimensionLine[] {
  return dims.map(dim => ({
    start: {
      x: evaluateFormula(dim.start.x, variables),
      y: evaluateFormula(dim.start.y, variables)
    },
    end: {
      x: evaluateFormula(dim.end.x, variables),
      y: evaluateFormula(dim.end.y, variables)
    },
    label: resolveLabel(dim.label, rawVariables || variables, isCm),
    offset: dim.offset || 0,
    axis: dim.axis || 'aligned'
  }));
}

/**
 * Builds standard SVG path data ("d" attribute) from absolute resolved operations.
 */
export function buildSvgPathString(resolved: { type: string; points: Point[] }[]): string {
  return resolved.map(op => {
    if (op.type === 'Z') return 'Z';
    const ptsStr = op.points.map(p => `${Math.round(p.x * 10) / 10},${Math.round(p.y * 10) / 10}`).join(' ');
    return `${op.type} ${ptsStr}`;
  }).join(' ');
}

export function getCubicBezierLength(p0: Point, p1: Point, p2: Point, p3: Point, segments = 50): number {
  let length = 0;
  let prevX = p0.x;
  let prevY = p0.y;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    const x = mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x;
    const y = mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y;
    const dx = x - prevX;
    const dy = y - prevY;
    length += Math.sqrt(dx * dx + dy * dy);
    prevX = x;
    prevY = y;
  }
  return length;
}

/**
 * Pre-defined parametric pattern pieces. 
 * Advanced 100% Factory-Ready Math Kernel.
 */
export const basePieces: Record<string, CADPiece> = {
  bodiceFront: {
    name: 'Bodice Front (Cut 1 on Fold)',
    color: '#e0f2fe',
    offsetX: 50,
    offsetY: 50,
    ops: [
      { type: 'M', points: [{ x: 0, y: 'frontNeckDrop' }] },
      // Neckline Curve (Smooth Quarter-Ellipse)
      { 
        type: 'C', 
        points: [
          { x: 'halfNeck * 0.55', y: 'frontNeckDrop' }, 
          { x: 'halfNeck', y: 'frontNeckDrop * 0.45' }, 
          { x: 'halfNeck', y: 0 }
        ] 
      },
      // Shoulder Line
      { type: 'L', points: [{ x: 'halfShoulder', y: 'shoulderSlope' }] },
      
      // Multi-Segment Armhole (Industrial Standard)
      // Segment 1: Shoulder Tip to Across Front Point
      { 
        type: 'C', 
        points: [
          { x: 'halfShoulder', y: 'shoulderSlope + (armholeStraight - shoulderSlope) * 0.2' },
          { x: 'acrossFront', y: 'shoulderSlope + (armholeStraight - shoulderSlope) * 0.2' },
          { x: 'acrossFront', y: 'shoulderSlope + (armholeStraight - shoulderSlope) * 0.5' }
        ] 
      },
      // Segment 2: Across Front Point to Underarm (Chest)
      {
        type: 'C',
        points: [
          { x: 'acrossFront', y: 'armholeStraight - (armholeStraight - shoulderSlope) * 0.2' },
          { x: 'halfChest - (halfChest - acrossFront) * 0.5', y: 'armholeStraight' },
          { x: 'halfChest', y: 'armholeStraight' }
        ]
      },
      
      // Side Seam
      { type: 'L', points: [{ x: 'halfHem', y: 'bodyLength' }] },
      // Hem Bottom
      { type: 'L', points: [{ x: 0, y: 'bodyLength' }], seamAllowance: 'bottomHemAllowance' },
      // Center Front Fold
      { type: 'Z', points: [], seamAllowance: 0 }
    ],
    dimensionLines: [
      { start: { x: 0, y: 'armholeStraight' }, end: { x: 'halfChest', y: 'armholeStraight' }, label: "½ Chest: {halfChest}", axis: 'x', offset: -10 },
      { start: { x: 0, y: 'bodyLength' }, end: { x: 'halfHem', y: 'bodyLength' }, label: "½ Hem: {halfHem}", axis: 'x', offset: 15 },
      { start: { x: 0, y: 0 }, end: { x: 0, y: 'bodyLength' }, label: "Length: {bodyLength}", axis: 'y', offset: -25 },
      { start: { x: 0, y: 0 }, end: { x: 'halfShoulder', y: 0 }, label: "½ Shoulder: {halfShoulder}", axis: 'x', offset: -20 },
      { start: { x: 0, y: 'shoulderSlope + (armholeStraight - shoulderSlope) * 0.5' }, end: { x: 'acrossFront', y: 'shoulderSlope + (armholeStraight - shoulderSlope) * 0.5' }, label: "X-Front: {acrossFront}", axis: 'x', offset: 0 }
    ]
  },
  bodiceBack: {
    name: 'Bodice Back (Cut 1 on Fold)',
    color: '#f3e8ff',
    offsetX: 400,
    offsetY: 50,
    ops: [
      { type: 'M', points: [{ x: 0, y: 'backNeckDrop' }] },
      // Back Neckline Curve (Smooth Quarter-Ellipse)
      { 
        type: 'C', 
        points: [
          { x: 'halfNeck * 0.55', y: 'backNeckDrop' }, 
          { x: 'halfNeck', y: 'backNeckDrop * 0.45' }, 
          { x: 'halfNeck', y: 0 }
        ] 
      },
      // Shoulder Line
      { type: 'L', points: [{ x: 'halfShoulder', y: 'shoulderSlope' }] },
      
      // Multi-Segment Armhole (Industrial Standard)
      // Segment 1: Shoulder Tip to Across Back Point
      { 
        type: 'C', 
        points: [
          { x: 'halfShoulder', y: 'shoulderSlope + (armholeStraight - shoulderSlope) * 0.2' },
          { x: 'acrossBack', y: 'shoulderSlope + (armholeStraight - shoulderSlope) * 0.2' },
          { x: 'acrossBack', y: 'shoulderSlope + (armholeStraight - shoulderSlope) * 0.5' }
        ] 
      },
      // Segment 2: Across Back Point to Underarm (Chest)
      {
        type: 'C',
        points: [
          { x: 'acrossBack', y: 'armholeStraight - (armholeStraight - shoulderSlope) * 0.2' },
          { x: 'halfChest - (halfChest - acrossBack) * 0.5', y: 'armholeStraight' },
          { x: 'halfChest', y: 'armholeStraight' }
        ]
      },
      
      // Side Seam
      { type: 'L', points: [{ x: 'halfHem', y: 'bodyLength' }] },
      // Hem Bottom
      { type: 'L', points: [{ x: 0, y: 'bodyLength' }], seamAllowance: 'bottomHemAllowance' },
      // Center Back Fold
      { type: 'Z', points: [], seamAllowance: 0 }
    ],
    dimensionLines: [
      { start: { x: 0, y: 'armholeStraight' }, end: { x: 'halfChest', y: 'armholeStraight' }, label: "½ Chest: {halfChest}", axis: 'x', offset: -10 },
      { start: { x: 0, y: 'bodyLength' }, end: { x: 'halfHem', y: 'bodyLength' }, label: "½ Hem: {halfHem}", axis: 'x', offset: 15 },
      { start: { x: 0, y: 0 }, end: { x: 0, y: 'bodyLength' }, label: "Length: {bodyLength}", axis: 'y', offset: -25 },
      { start: { x: 0, y: 'shoulderSlope + (armholeStraight - shoulderSlope) * 0.5' }, end: { x: 'acrossBack', y: 'shoulderSlope + (armholeStraight - shoulderSlope) * 0.5' }, label: "X-Back: {acrossBack}", axis: 'x', offset: 0 }
    ]
  },
  sleeve: {
    name: 'Sleeve (Cut 2)',
    color: '#dcfce7',
    offsetX: 50,
    offsetY: 500,
    ops: [
      { type: 'M', points: [{ x: 0, y: 'adjustedSleeveCap' }] },
      // Sleeve Cap – Front curve
      {
        type: 'C',
        points: [
          { x: 'halfBicep * 0.2', y: 'adjustedSleeveCap' },
          { x: 'halfBicep * 0.6', y: 0 },
          { x: 'halfBicep', y: 0 }
        ]
      },
      // Sleeve Cap – Back curve (mirror)
      {
        type: 'C',
        points: [
          { x: 'halfBicep * 1.4', y: 0 },
          { x: 'halfBicep * 1.8', y: 'adjustedSleeveCap' },
          { x: 'halfBicep * 2', y: 'adjustedSleeveCap' }
        ]
      },
      // Right Underarm to Elbow
      { type: 'L', points: [{ x: 'halfBicep + halfElbow', y: 'elbowPosition' }] },
      // Right Elbow to Forearm
      { type: 'L', points: [{ x: 'halfBicep + halfForearm', y: 'forearmPosition' }] },
      // Right Forearm to Cuff
      { type: 'L', points: [{ x: 'halfBicep + halfWrist', y: 'sleeveLength' }] },
      // Sleeve Hem
      { type: 'L', points: [{ x: 'halfBicep - halfWrist', y: 'sleeveLength' }], seamAllowance: 'bottomHemAllowance' },
      // Left Cuff to Forearm
      { type: 'L', points: [{ x: 'halfBicep - halfForearm', y: 'forearmPosition' }] },
      // Left Forearm to Elbow
      { type: 'L', points: [{ x: 'halfBicep - halfElbow', y: 'elbowPosition' }] },
      // Close (Left Elbow to Underarm Seam)
      { type: 'Z', points: [] }
    ],
    dimensionLines: [
      { start: { x: 0, y: 'adjustedSleeveCap' }, end: { x: 'halfBicep * 2', y: 'adjustedSleeveCap' }, label: "Bicep: {bicepCirc}", axis: 'x', offset: 20 },
      { start: { x: 'halfBicep - halfElbow', y: 'elbowPosition' }, end: { x: 'halfBicep + halfElbow', y: 'elbowPosition' }, label: "Elbow: {elbowCirc}", axis: 'x', offset: 20 },
      { start: { x: 'halfBicep - halfForearm', y: 'forearmPosition' }, end: { x: 'halfBicep + halfForearm', y: 'forearmPosition' }, label: "Forearm: {forearmCirc}", axis: 'x', offset: 20 },
      { start: { x: 'halfBicep', y: 0 }, end: { x: 'halfBicep', y: 'sleeveLength' }, label: "Slv Len: {sleeveLength}", axis: 'y', offset: -20 },
      { start: { x: 'halfBicep - halfWrist', y: 'sleeveLength' }, end: { x: 'halfBicep + halfWrist', y: 'sleeveLength' }, label: "Opening: {wristCirc}", axis: 'x', offset: 20 }
    ]
  },
  hood: {
    name: 'Hood (Cut 2 Mirrored)',
    color: '#fef08a',
    offsetX: 750,
    offsetY: 200,
    ops: [
      { type: 'M', points: [{ x: 0, y: 'hoodHeight * 0.9' }] },
      // Bottom Curve matching neckline
      {
        type: 'C',
        points: [
          { x: 'hoodDepth * 0.3', y: 'hoodHeight' },
          { x: 'hoodDepth * 0.7', y: 'hoodHeight' },
          { x: 'hoodDepth', y: 'hoodHeight * 0.9' }
        ]
      },
      // Face Opening
      {
        type: 'C',
        points: [
          { x: 'hoodDepth', y: 'hoodHeight * 0.5' },
          { x: 'hoodDepth * 0.95', y: 'hoodHeight * 0.1' },
          { x: 'hoodDepth * 0.8', y: 0 }
        ]
      },
      // Top Crown
      { type: 'L', points: [{ x: 'hoodDepth * 0.4', y: 0 }] },
      // Back Curve
      {
        type: 'C',
        points: [
          { x: 'hoodDepth * 0.1', y: 'hoodHeight * 0.1' },
          { x: 0, y: 'hoodHeight * 0.4' },
          { x: 0, y: 'hoodHeight * 0.9' }
        ]
      },
      { type: 'Z', points: [] }
    ],
    dimensionLines: [
      { start: { x: 0, y: 0 }, end: { x: 'hoodDepth', y: 0 }, label: "Depth: {hoodDepth}", axis: 'x', offset: -20 },
      { start: { x: 0, y: 0 }, end: { x: 0, y: 'hoodHeight' }, label: "Height: {hoodHeight}", axis: 'y', offset: -20 }
    ]
  }
};

export function calculateArmholeLength(resolved: ResolvedOp[], isV2: boolean = false): number {
  try {
    if (isV2) {
      if (resolved[3] && resolved[3].type === 'C' && resolved[2] && resolved[2].points[0]) {
        const p0 = resolved[2].points[0];
        const [p1, p2, p3] = resolved[3].points;
        return getCubicBezierLength(p0, p1, p2, p3);
      }
    } else {
      if (
        resolved[3] && resolved[3].type === 'C' && resolved[2] && resolved[2].points[0] &&
        resolved[4] && resolved[4].type === 'C'
      ) {
        const p0_1 = resolved[2].points[0];
        const [p1_1, p2_1, p3_1] = resolved[3].points;
        const len1 = getCubicBezierLength(p0_1, p1_1, p2_1, p3_1);

        const p0_2 = p3_1;
        const [p1_2, p2_2, p3_2] = resolved[4].points;
        const len2 = getCubicBezierLength(p0_2, p1_2, p2_2, p3_2);

        return len1 + len2;
      }
    }
  } catch (e) {
    console.error("Failed to calculate armhole length", e);
  }
  return 0;
}

export function solveSleeveCapHeight(halfBicep: number, targetLength: number): number {
  if (targetLength <= halfBicep * 2) {
    return 0;
  }
  let low = 0;
  let high = targetLength;
  let H = 0;
  
  for (let iter = 0; iter < 40; iter++) {
    H = (low + high) / 2;
    const scFront = getCubicBezierLength(
      { x: 0, y: H },
      { x: halfBicep * 0.2, y: H },
      { x: halfBicep * 0.6, y: 0 },
      { x: halfBicep, y: 0 }
    );
    const scBack = getCubicBezierLength(
      { x: halfBicep, y: 0 },
      { x: halfBicep * 1.4, y: 0 },
      { x: halfBicep * 1.8, y: H },
      { x: halfBicep * 2, y: H }
    );
    const len = scFront + scBack;
    if (len < targetLength) {
      low = H;
    } else {
      high = H;
    }
  }
  return H;
}


