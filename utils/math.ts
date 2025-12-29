export interface Vector2 {
  x: number;
  y: number;
}

export const Vec2 = {
  zero: (): Vector2 => ({ x: 0, y: 0 }),
  add: (a: Vector2, b: Vector2): Vector2 => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a: Vector2, b: Vector2): Vector2 => ({ x: a.x - b.x, y: a.y - b.y }),
  scale: (v: Vector2, s: number): Vector2 => ({ x: v.x * s, y: v.y * s }),
  mag: (v: Vector2): number => Math.sqrt(v.x * v.x + v.y * v.y),
  normalize: (v: Vector2): Vector2 => {
    const m = Vec2.mag(v);
    return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
  },
  dist: (a: Vector2, b: Vector2): number => Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2)),
  distSq: (a: Vector2, b: Vector2): number => Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2),
  
  /**
   * Calculates the squared distance from point p to line segment vw.
   */
  distToSegmentSq: (p: Vector2, v: Vector2, w: Vector2): number => {
    const l2 = Math.pow(w.x - v.x, 2) + Math.pow(w.y - v.y, 2);
    if (l2 === 0) return Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = v.x + t * (w.x - v.x);
    const projY = v.y + t * (w.y - v.y);
    return Math.pow(p.x - projX, 2) + Math.pow(p.y - projY, 2);
  },
  
  /**
   * Calculates the distance from point p to line segment vw.
   */
  distToSegment: (p: Vector2, v: Vector2, w: Vector2): number => {
    const l2 = Math.pow(w.x - v.x, 2) + Math.pow(w.y - v.y, 2);
    if (l2 === 0) return Math.sqrt(Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2));
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = v.x + t * (w.x - v.x);
    const projY = v.y + t * (w.y - v.y);
    return Math.sqrt(Math.pow(p.x - projX, 2) + Math.pow(p.y - projY, 2));
  }
};