import { Point } from './CADKernel';

export class DxfSerializer {
  /**
   * Serializes the garment pattern pieces into a standard DXF ASCII string.
   * Leverages DXF-AAMA layer standards:
   *  - Layer "CUT" (red, color 1) for the outer cut line (seam allowance boundary)
   *  - Layer "SEW" (green, color 3) for the inner stitch line
   */
  static serialize(pieces: { name: string; stitchLine: Point[]; cutLine: Point[] }[]): string {
    let dxf = '';

    // 1. Header Section
    dxf += '  0\nSECTION\n  2\nHEADER\n';
    dxf += '  9\n$ACADVER\n  1\nAC1009\n'; // AutoCAD R12 format for maximum compatibility
    dxf += '  0\nENDSEC\n';

    // 2. Tables Section (Layer configuration)
    dxf += '  0\nSECTION\n  2\nTABLES\n';
    dxf += '  0\nTABLE\n  2\nLAYER\n 70\n2\n';

    // Define CUT Layer (Color 1 = Red)
    dxf += '  0\nLAYER\n  2\nCUT\n 70\n0\n 62\n1\n  6\nCONTINUOUS\n';

    // Define SEW Layer (Color 3 = Green)
    dxf += '  0\nLAYER\n  2\nSEW\n 70\n0\n 62\n3\n  6\nCONTINUOUS\n';

    dxf += '  0\nENDTAB\n';
    dxf += '  0\nENDSEC\n';

    // 3. Entities Section (The paths)
    dxf += '  0\nSECTION\n  2\nENTITIES\n';

    let handle = 100;
    for (const piece of pieces) {
      // Write Stitch Line (Layer SEW)
      if (piece.stitchLine.length > 0) {
        dxf += '  0\nLWPOLYLINE\n';
        dxf += `  5\n${(handle++).toString(16)}\n`;
        dxf += '  8\nSEW\n'; // Layer name
        dxf += ` 90\n${piece.stitchLine.length}\n`; // Vertices count
        dxf += ' 70\n1\n'; // Closed polyline
        
        for (const pt of piece.stitchLine) {
          // Note: Web SVG Y increases downwards, while standard Cartesian CAD Y increases upwards.
          // Inverting the Y coordinate ensures the pattern exports upright in CAD software.
          dxf += ` 10\n${pt.x.toFixed(3)}\n`;
          dxf += ` 20\n${(-pt.y).toFixed(3)}\n`;
        }
      }

      // Write Cut Line (Layer CUT)
      if (piece.cutLine.length > 0) {
        dxf += '  0\nLWPOLYLINE\n';
        dxf += `  5\n${(handle++).toString(16)}\n`;
        dxf += '  8\nCUT\n'; // Layer name
        dxf += ` 90\n${piece.cutLine.length}\n`; // Vertices count
        dxf += ' 70\n1\n'; // Closed polyline
        
        for (const pt of piece.cutLine) {
          dxf += ` 10\n${pt.x.toFixed(3)}\n`;
          dxf += ` 20\n${(-pt.y).toFixed(3)}\n`;
        }
      }
    }

    dxf += '  0\nENDSEC\n';
    dxf += '  0\nEOF\n';

    return dxf;
  }
}
