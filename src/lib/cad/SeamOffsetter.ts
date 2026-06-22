import { Point } from './CADKernel';

/**
 * Calculates the unit normal vector of a line segment.
 */
function getSegmentNormal(p1: Point, p2: Point): Point {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { x: 0, y: 0 };
  // Normal vector pointing to the "left" of the segment direction
  return { x: -dy / len, y: dx / len };
}

/**
 * Offsets a closed polygon path by a given distance.
 * Handles "Fold Line" boundaries: points lying along x = 0 are locked to x = 0 (no offset added on the fold).
 */
export function offsetPolygon(poly: Point[], distance: number, isOnFold = false): Point[] {
  if (poly.length < 3) return poly.map(p => ({ ...p }));

  const n = poly.length;
  const offsetPoly: Point[] = [];

  // Determine if the polygon is clockwise or counter-clockwise
  let area = 0;
  for (let i = 0; i < n; i++) {
    const curr = poly[i];
    const next = poly[(i + 1) % n];
    area += (curr.x * next.y) - (next.x * curr.y);
  }
  
  // If area is negative, the path direction is counter-clockwise.
  // We flip the distance sign to ensure the offset always goes "outward".
  const adjustedDistance = area < 0 ? -distance : distance;

  for (let i = 0; i < n; i++) {
    const prev = poly[(i - 1 + n) % n];
    const curr = poly[i];
    const next = poly[(i + 1) % n];

    // Lock center-fold lines at x = 0 to prevent offset distortions on folds
    if (isOnFold && Math.abs(curr.x) < 2) {
      // If we are at the fold line, keep X at 0, only shift Y if it matches the normals
      offsetPoly.push({ x: 0, y: curr.y });
      continue;
    }

    // Get segment normals
    const n1 = getSegmentNormal(prev, curr);
    const n2 = getSegmentNormal(curr, next);

    // Sum and normalize the vertex normal (bisector)
    let nx = n1.x + n2.x;
    let ny = n1.y + n2.y;
    const len = Math.sqrt(nx * nx + ny * ny);

    if (len === 0) {
      offsetPoly.push({
        x: curr.x + n1.x * adjustedDistance,
        y: curr.y + n1.y * adjustedDistance
      });
    } else {
      // Miter limit factor: scale offset based on corner angle
      const dot = n1.x * n2.x + n1.y * n2.y;
      const factor = 1 / Math.sqrt((1 + dot) / 2);
      
      // Limit extreme spikes in sharp corners
      const safeFactor = Math.min(factor, 2.0);

      offsetPoly.push({
        x: curr.x + (nx / len) * adjustedDistance * safeFactor,
        y: curr.y + (ny / len) * adjustedDistance * safeFactor
      });
    }
  }

  return offsetPoly;
}

/**
 * Discretizes a list of resolved path operations into a dense sequence of Point coordinates.
 */
export function discretizeOps(resolved: { type: string; points: Point[] }[], steps = 20): Point[] {
  const points: Point[] = [];
  let curr = { x: 0, y: 0 };

  for (const op of resolved) {
    if (op.type === 'M' && op.points[0]) {
      curr = op.points[0];
      points.push({ ...curr });
    } else if (op.type === 'L' && op.points[0]) {
      curr = op.points[0];
      points.push({ ...curr });
    } else if (op.type === 'C' && op.points.length === 3) {
      const p0 = { ...curr };
      const [p1, p2, p3] = op.points;
      
      // Interpolate bezier curve
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const mt = 1 - t;
        const x = mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x;
        const y = mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y;
        points.push({ x, y });
      }
      curr = p3;
    } else if (op.type === 'Q' && op.points.length === 2) {
      const p0 = { ...curr };
      const [p1, p2] = op.points;
      
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const mt = 1 - t;
        const x = mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x;
        const y = mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y;
        points.push({ x, y });
      }
      curr = p2;
    }
  }

  // Remove duplicates at transition points
  return points.filter((p, index) => {
    if (index === 0) return true;
    const prev = points[index - 1];
    const dist = Math.sqrt((p.x - prev.x) ** 2 + (p.y - prev.y) ** 2);
    return dist > 0.1;
  });
}

/**
 * Converts a list of coordinates back into a closed SVG path string.
 */
export function buildPolygonPathString(points: Point[]): string {
  if (points.length === 0) return '';
  const d = points.map((p, index) => `${index === 0 ? 'M' : 'L'} ${Math.round(p.x * 10) / 10},${Math.round(p.y * 10) / 10}`).join(' ');
  return d + ' Z';
}
