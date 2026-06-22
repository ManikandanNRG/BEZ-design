export interface Point {
  x: number;
  y: number;
}

export interface AnchorPoints {
  neck: Point;
  shoulder: Point;
  armpit: Point;
  hem: Point;
}

export class MorphEngine {
  /**
   * Scales a coordinate point relative to an origin point.
   * This is the core algorithm for the Upload & Morph architecture.
   */
  static morphPoint(point: Point, origin: Point, scaleX: number, scaleY: number): Point {
    return {
      x: origin.x + (point.x - origin.x) * scaleX,
      y: origin.y + (point.y - origin.y) * scaleY
    };
  }

  /**
   * Calculates the affine scaling factor between a base uploaded pattern and a target measurement.
   */
  static getScaleFactor(baseLength: number, targetLength: number): number {
    if (baseLength === 0) return 1;
    return targetLength / baseLength;
  }

  /**
   * Parses an SVG path command (e.g. M 0,0 C 10,10 20,20 30,30)
   * Future implementation will map this to the morphPoint algorithm.
   */
  static parseSVGPath(pathStr: string) {
    // Basic stub for the morphing engine parser
    return pathStr.split(/(?=[MmLlHhVvCcSsQqTtAaZz])/);
  }
}
