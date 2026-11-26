/**
 * Maps a regular flat hex grid (axial coordinates, pointy-top) onto a spherical cap.
 *
 * The game logic keeps working on the flat grid. Only the view uses this module,
 * so the projection can be swapped without touching any rule code.
 * This file has no three.js dependency on purpose, so it can be tested in plain Node.
 */

import { type Axial } from '../game/hex';

export { hexCount, hexDistance, hexesInRadius, type Axial } from '../game/hex';

export type ProjectionMode = 'equidistant' | 'equal-area' | 'conformal';

export interface DomeParams {
  /** Circumradius of a hex in flat grid units. */
  hexSize: number;
  /** Number of rings around the center hex (9 gives 271 hexes). */
  boardRadius: number;
  mode: ProjectionMode;
  /** 1 = full hemisphere, smaller values give a flatter cap. */
  coverage: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface HexFrame {
  /** Hex center on the dome. */
  position: Vec3;
  /** Outward surface normal, use it as the up axis for models. */
  normal: Vec3;
  /** Unit tangent along the flat grid x axis, use it to orient models. */
  east: Vec3;
  /** Surface length per flat unit along x and z, 1 means undistorted. */
  scaleX: number;
  scaleZ: number;
  /** Uniform model scale for this hex. Exact for the conformal mode, where scaleX equals scaleZ. */
  scale: number;
}

const SQRT3 = Math.sqrt(3);

export const defaultParams: DomeParams = {
  hexSize: 1,
  boardRadius: 9,
  mode: 'conformal',
  coverage: 0.4,
};

/** Flat center of a hex (pointy-top layout). */
export function axialToFlat(h: Axial, hexSize: number): { x: number; z: number } {
  return { x: hexSize * SQRT3 * (h.q + h.r / 2), z: hexSize * 1.5 * h.r };
}

/** Flat position of corner i (0..5) of a hex, optionally shrunk towards the center. */
export function flatCorner(h: Axial, i: number, hexSize: number, shrink = 1): { x: number; z: number } {
  const c = axialToFlat(h, hexSize);
  const ang = (Math.PI / 180) * (60 * i - 30);
  return { x: c.x + hexSize * shrink * Math.cos(ang), z: c.z + hexSize * shrink * Math.sin(ang) };
}

export class DomeProjection {
  readonly radius: number;
  private readonly phiMax: number;
  private readonly p: DomeParams;

  constructor(params: Partial<DomeParams> = {}) {
    this.p = { ...defaultParams, ...params };
    this.phiMax = this.p.coverage * (Math.PI / 2);
    // Largest flat distance of any hex corner from the board center.
    const dMax = this.p.hexSize * (SQRT3 * this.p.boardRadius + 1);
    switch (this.p.mode) {
      case 'equidistant':
        this.radius = dMax / this.phiMax;
        break;
      case 'equal-area':
        this.radius = dMax / (2 * Math.sin(this.phiMax / 2));
        break;
      case 'conformal':
        this.radius = dMax / (2 * Math.tan(this.phiMax / 2));
        break;
    }
  }

  get params(): DomeParams {
    return this.p;
  }

  /** Polar angle from the dome apex for a flat distance d. */
  private phi(d: number): number {
    const R = this.radius;
    switch (this.p.mode) {
      case 'equidistant':
        return d / R;
      case 'equal-area':
        return 2 * Math.asin(Math.min(1, d / (2 * R)));
      case 'conformal':
        return 2 * Math.atan(d / (2 * R));
    }
  }

  /** Projects a flat point (x, z) onto the dome. The apex sits at y = R. */
  project(x: number, z: number): Vec3 {
    const d = Math.hypot(x, z);
    if (d < 1e-12) return { x: 0, y: this.radius, z: 0 };
    const phi = this.phi(d);
    const s = Math.sin(phi) * this.radius;
    return { x: (x / d) * s, y: Math.cos(phi) * this.radius, z: (z / d) * s };
  }

  frame(h: Axial): HexFrame {
    const c = axialToFlat(h, this.p.hexSize);
    const eps = this.p.hexSize * 1e-3;
    const px = this.project(c.x + eps, c.z);
    const mx = this.project(c.x - eps, c.z);
    const pz = this.project(c.x, c.z + eps);
    const mz = this.project(c.x, c.z - eps);
    const dx = sub(px, mx);
    const dz = sub(pz, mz);
    const position = this.project(c.x, c.z);
    return {
      position,
      normal: normalize(position),
      east: normalize(dx),
      scaleX: len(dx) / (2 * eps),
      scaleZ: len(dz) / (2 * eps),
      scale: (len(dx) + len(dz)) / (4 * eps),
    };
  }
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function len(a: Vec3): number {
  return Math.hypot(a.x, a.y, a.z);
}

function normalize(a: Vec3): Vec3 {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l, z: a.z / l };
}
