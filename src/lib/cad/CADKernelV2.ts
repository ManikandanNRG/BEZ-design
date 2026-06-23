/**
 * CADKernelV2.ts — Experimental "Smooth Curve" Engine
 * 
 * Uses updated Bezier control points for smoother S-curves on armholes,
 * sleeves, and a redesigned hood shape. This is an ALTERNATIVE engine
 * that can be selected separately from the proven Native Engine (CADKernel.ts).
 */
import { CADPiece } from './CADKernel';

// Re-export shared utilities from the main kernel
export { evaluateFormula, resolveOps, buildSvgPathString, getCubicBezierLength } from './CADKernel';

/**
 * V2 parametric pattern pieces with smoother/experimental Bezier curves.
 */
export const basePiecesV2: Record<string, CADPiece> = {
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
      // Armhole Curve (Smoother S-like bend from shoulder to underarm)
      { 
        type: 'C', 
        points: [
          { x: 'halfShoulder', y: 'shoulderSlope + (armholeDepth - shoulderSlope) * 0.6' },
          { x: 'halfChest * 0.8', y: 'armholeDepth' },
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
      // Back Armhole Curve (Flatter bend than front)
      { 
        type: 'C', 
        points: [
          { x: 'halfShoulder', y: 'shoulderSlope + (armholeDepth - shoulderSlope) * 0.4' },
          { x: 'halfChest * 0.85', y: 'armholeDepth' },
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
      // Sleeve Cap – Front curve (S-Curve)
      {
        type: 'C',
        points: [
          { x: 'halfBicep * 0.15', y: 'capHeight * 0.6' },
          { x: 'halfBicep * 0.5', y: 0 },
          { x: 'halfBicep', y: 0 }
        ]
      },
      // Sleeve Cap – Back curve (S-Curve mirror)
      {
        type: 'C',
        points: [
          { x: 'halfBicep * 1.5', y: 0 },
          { x: 'halfBicep * 1.85', y: 'capHeight * 0.6' },
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
      { type: 'M', points: [{ x: 'hoodDepth * 0.1', y: 'hoodHeight * 0.95' }] },
      // Neckline Curve (attaches to body)
      {
        type: 'C',
        points: [
          { x: 'hoodDepth * 0.4', y: 'hoodHeight' },
          { x: 'hoodDepth * 0.7', y: 'hoodHeight' },
          { x: 'hoodDepth', y: 'hoodHeight * 0.9' }
        ]
      },
      // Back of Head Curve (Large sweeping round curve)
      {
        type: 'C',
        points: [
          { x: 'hoodDepth * 1.25', y: 'hoodHeight * 0.5' },
          { x: 'hoodDepth * 0.8', y: 0 },
          { x: 'hoodDepth * 0.4', y: 0 }
        ]
      },
      // Top of Head Curve
      {
        type: 'C',
        points: [
          { x: 'hoodDepth * 0.1', y: 0 },
          { x: 0, y: 'hoodHeight * 0.1' },
          { x: 0, y: 'hoodHeight * 0.2' }
        ]
      },
      // Face Opening (straight down to front neck)
      { type: 'L', points: [{ x: 'hoodDepth * 0.1', y: 'hoodHeight * 0.95' }] },
      { type: 'Z', points: [] }
    ]
  }
};
