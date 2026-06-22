export interface Point {
  x: number;
  y: number;
}

export interface DynamicPoint {
  x: string | number;
  y: string | number;
}

export interface PathOp {
  type: 'M' | 'L' | 'C' | 'Q' | 'Z';
  points: DynamicPoint[];
}

export interface CADPiece {
  name: string;
  ops: PathOp[];
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
  
  // Replace variable names with their numeric values
  for (const [key, val] of Object.entries(variables)) {
    const regex = new RegExp(`\\b${key.toLowerCase()}\\b`, 'g');
    processed = processed.replace(regex, val.toString());
  }
  
  // Strip anything that is not a number, basic math operator, parentheses, or spaces
  processed = processed.replace(/[^0-9+\-*/().\s]/g, '');

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
 * Numerically integrates a Cubic Bezier curve to find its exact arc length.
 */
export function getCubicBezierLength(p0: Point, p1: Point, p2: Point, p3: Point, segments = 50): number {
  let length = 0;
  let prevX = p0.x;
  let prevY = p0.y;
  
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    
    // Bezier curve formula
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
 * Evaluates dynamic path operations into absolute coordinate commands.
 */
export function resolveOps(ops: PathOp[], variables: Record<string, number>): { type: string; points: Point[] }[] {
  return ops.map(op => ({
    type: op.type,
    points: op.points.map(pt => ({
      x: evaluateFormula(pt.x, variables),
      y: evaluateFormula(pt.y, variables)
    }))
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

/**
 * Pre-defined parametric pattern pieces based on industrial drafting rules.
 */
export const basePieces: Record<string, CADPiece> = {
  bodiceFront: {
    name: 'Bodice Front (Cut 1 on Fold)',
    color: '#e0f2fe',
    offsetX: 50,
    offsetY: 50,
    ops: [
      { type: 'M', points: [{ x: 0, y: 'frontNeckDrop' }] },
      // Neckline Curve
      { 
        type: 'C', 
        points: [
          { x: 'halfNeck * 0.5', y: 'frontNeckDrop' }, 
          { x: 'halfNeck * 0.95', y: 'frontNeckDrop * 0.1' }, 
          { x: 'halfNeck', y: 0 }
        ] 
      },
      // Shoulder Line
      { type: 'L', points: [{ x: 'halfShoulder', y: 'shoulderSlope' }] },
      // Armhole Curve (Single Bezier)
      { 
        type: 'C', 
        points: [
          { x: 'acrossFront / 2', y: 'shoulderSlope + (armholeDepth - shoulderSlope) * 0.4' },
          { x: 'acrossFront / 2 + (halfChest - acrossFront / 2) * 0.4', y: 'armholeDepth' },
          { x: 'halfChest', y: 'armholeDepth' }
        ] 
      },
      // Side Seam
      { type: 'L', points: [{ x: 'halfChest', y: 'bodyLength' }] },
      // Hem Bottom
      { type: 'L', points: [{ x: 0, y: 'bodyLength' }] },
      // Center Front Fold
      { type: 'Z', points: [] }
    ]
  },
  bodiceBack: {
    name: 'Bodice Back (Cut 1 on Fold)',
    color: '#f3e8ff',
    offsetX: 400,
    offsetY: 50,
    ops: [
      { type: 'M', points: [{ x: 0, y: 'backNeckDrop' }] },
      // Back Neckline Curve (Flatter)
      { 
        type: 'C', 
        points: [
          { x: 'halfNeck * 0.5', y: 'backNeckDrop' }, 
          { x: 'halfNeck * 0.95', y: 'backNeckDrop * 0.2' }, 
          { x: 'halfNeck * 1.05', y: 0 }
        ] 
      },
      // Shoulder Line
      { type: 'L', points: [{ x: 'halfShoulder', y: 'shoulderSlope' }] },
      // Back Armhole Curve (Single Bezier)
      { 
        type: 'C', 
        points: [
          { x: 'acrossBack / 2', y: 'shoulderSlope + (armholeDepth - shoulderSlope) * 0.4' },
          { x: 'acrossBack / 2 + (halfChest - acrossBack / 2) * 0.4', y: 'armholeDepth' },
          { x: 'halfChest', y: 'armholeDepth' }
        ] 
      },
      // Side Seam
      { type: 'L', points: [{ x: 'halfChest', y: 'bodyLength' }] },
      // Hem Bottom
      { type: 'L', points: [{ x: 0, y: 'bodyLength' }] },
      // Center Back Fold
      { type: 'Z', points: [] }
    ]
  },
  sleeve: {
    name: 'Sleeve (Cut 2)',
    color: '#dcfce7',
    offsetX: 50,
    offsetY: 500,
    ops: [
      { type: 'M', points: [{ x: 0, y: 'capHeight' }] },
      // Sleeve Cap – Front curve (smooth horizontal tangent at crown)
      {
        type: 'C',
        points: [
          { x: 'halfBicep * 0.25', y: 'capHeight * 0.85' },
          { x: 'halfBicep * 0.72', y: 0 },
          { x: 'halfBicep', y: 0 }
        ]
      },
      // Sleeve Cap – Back curve (mirror, smooth horizontal tangent at crown)
      {
        type: 'C',
        points: [
          { x: 'halfBicep * 1.28', y: 0 },
          { x: 'halfBicep * 1.75', y: 'capHeight * 0.85' },
          { x: 'halfBicep * 2', y: 'capHeight' }
        ]
      },
      // Right Underarm Seam
      { type: 'L', points: [{ x: 'halfBicep + halfWrist', y: 'sleeveLength' }] },
      // Sleeve Hem
      { type: 'L', points: [{ x: 'halfBicep - halfWrist', y: 'sleeveLength' }] },
      // Close (Left Underarm Seam)
      { type: 'Z', points: [] }
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
    ]
  }
};
