import { Point, ResolvedOp } from './CADKernel';

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
 * Handles different seam allowances for each segment of the polygon.
 * Handles "Fold Line" boundaries: points lying along x = 0 are locked to x = 0.
 */
export function offsetPolygon(poly: Point[], defaultDistance: number, isOnFold = false): Point[] {
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
  const isCCW = area < 0;

  for (let i = 0; i < n; i++) {
    const prev = poly[(i - 1 + n) % n];
    const curr = poly[i];
    const next = poly[(i + 1) % n];

    // Lock center-fold lines at x = 0 to prevent offset distortions on folds
    if (isOnFold && Math.abs(curr.x) < 2) {
      offsetPoly.push({ x: 0, y: curr.y });
      continue;
    }

    // Seam allowance for incoming segment (prev -> curr)
    const distPrevRaw = prev.seamAllowance !== undefined ? prev.seamAllowance : defaultDistance;
    const distPrev = isCCW ? -distPrevRaw : distPrevRaw;

    // Seam allowance for outgoing segment (curr -> next)
    const distCurrRaw = curr.seamAllowance !== undefined ? curr.seamAllowance : defaultDistance;
    const distCurr = isCCW ? -distCurrRaw : distCurrRaw;

    // Get segment normals
    const n1 = getSegmentNormal(prev, curr);
    const n2 = getSegmentNormal(curr, next);

    // If one of the segment normals is 0 (zero-length segment), use the other one
    if ((n1.x === 0 && n1.y === 0) || (n2.x === 0 && n2.y === 0)) {
      const activeNormal = (n1.x === 0 && n1.y === 0) ? n2 : n1;
      const activeDist = (n1.x === 0 && n1.y === 0) ? distCurr : distPrev;
      offsetPoly.push({
        x: curr.x + activeNormal.x * activeDist,
        y: curr.y + activeNormal.y * activeDist
      });
      continue;
    }

    // Solve for the intersection of the two offset line segments:
    // Line 1: n1.x * x + n1.y * y = C1
    // Line 2: n2.x * x + n2.y * y = C2
    const C1 = n1.x * curr.x + n1.y * curr.y + distPrev;
    const C2 = n2.x * curr.x + n2.y * curr.y + distCurr;

    const D = n1.x * n2.y - n1.y * n2.x;

    if (Math.abs(D) < 1e-4) {
      // Parallel or collinear lines
      const avgDist = (distPrev + distCurr) / 2;
      offsetPoly.push({
        x: curr.x + n1.x * avgDist,
        y: curr.y + n1.y * avgDist
      });
    } else {
      // Cramer's rule
      const x = (C1 * n2.y - C2 * n1.y) / D;
      const y = (n1.x * C2 - n2.x * C1) / D;

      // Limit extreme spikes in sharp corners (miter limit)
      const dx = x - curr.x;
      const dy = y - curr.y;
      const distFromOriginal = Math.sqrt(dx * dx + dy * dy);
      const maxAllowedDist = Math.max(Math.abs(distPrev), Math.abs(distCurr)) * 2.0;

      if (distFromOriginal > maxAllowedDist) {
        let nx = n1.x + n2.x;
        let ny = n1.y + n2.y;
        const len = Math.sqrt(nx * nx + ny * ny);
        if (len === 0) {
          offsetPoly.push({
            x: curr.x + n1.x * distCurr,
            y: curr.y + n1.y * distCurr
          });
        } else {
          offsetPoly.push({
            x: curr.x + (nx / len) * maxAllowedDist,
            y: curr.y + (ny / len) * maxAllowedDist
          });
        }
      } else {
        offsetPoly.push({ x, y });
      }
    }
  }

  return offsetPoly;
}

/**
 * Discretizes a list of resolved path operations into a dense sequence of Point coordinates,
 * tagging each point with its outgoing segment's custom seam allowance.
 */
export function discretizeOps(resolved: ResolvedOp[], steps = 20): Point[] {
  const points: Point[] = [];
  let curr: Point = { x: 0, y: 0 };

  for (let opIdx = 0; opIdx < resolved.length; opIdx++) {
    const op = resolved[opIdx];
    const allowance = op.seamAllowance;

    if (op.type === 'M' && op.points[0]) {
      curr = { ...op.points[0] };
      points.push(curr);
    } else if (op.type === 'L' && op.points[0]) {
      if (points.length > 0) {
        points[points.length - 1].seamAllowance = allowance;
      }
      curr = { ...op.points[0] };
      points.push(curr);
    } else if (op.type === 'C' && op.points.length === 3) {
      const p0 = { ...curr };
      const [p1, p2, p3] = op.points;

      if (points.length > 0) {
        points[points.length - 1].seamAllowance = allowance;
      }

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const mt = 1 - t;
        const x = mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x;
        const y = mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y;
        
        const newPt: Point = { x, y };
        if (i < steps) {
          newPt.seamAllowance = allowance;
        }
        points.push(newPt);
      }
      curr = { ...p3 };
    } else if (op.type === 'Q' && op.points.length === 2) {
      const p0 = { ...curr };
      const [p1, p2] = op.points;

      if (points.length > 0) {
        points[points.length - 1].seamAllowance = allowance;
      }

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const mt = 1 - t;
        const x = mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x;
        const y = mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y;

        const newPt: Point = { x, y };
        if (i < steps) {
          newPt.seamAllowance = allowance;
        }
        points.push(newPt);
      }
      curr = { ...p2 };
    } else if (op.type === 'Z') {
      if (points.length > 0) {
        points[points.length - 1].seamAllowance = allowance;
      }
    }
  }

  // Remove duplicates at transition points
  return points.filter((p, index) => {
    if (index === 0) return true;
    const prev = points[index - 1];
    const dist = Math.sqrt((p.x - prev.x) ** 2 + (p.y - prev.y) ** 2);
    if (dist <= 0.1) {
      if (prev.seamAllowance === undefined) {
        prev.seamAllowance = p.seamAllowance;
      }
      return false;
    }
    return true;
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
