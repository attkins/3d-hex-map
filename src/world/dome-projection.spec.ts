import { describe, expect, it } from 'vitest';
import {
  DomeProjection,
  axialToFlat,
  flatCorner,
  hexCount,
  hexDistance,
  hexesInRadius,
  type ProjectionMode,
  type Vec3,
} from './dome-projection';

const modes: ProjectionMode[] = ['equidistant', 'equal-area', 'conformal'];
const origin = { q: 0, r: 0 };

const length = (v: Vec3): number => Math.hypot(v.x, v.y, v.z);
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

describe('hex helpers', () => {
  it('counts the hexes of a board', () => {
    expect(hexCount(0)).toBe(1);
    expect(hexCount(9)).toBe(271);
    expect(hexesInRadius(9)).toHaveLength(271);
    expect(hexesInRadius(0)).toEqual([origin]);
  });

  it('lists every hex only once', () => {
    const keys = new Set(hexesInRadius(9).map((h) => `${h.q},${h.r}`));
    expect(keys.size).toBe(271);
  });

  it('measures distances in steps', () => {
    expect(hexDistance(origin, origin)).toBe(0);
    expect(hexDistance(origin, { q: 3, r: 0 })).toBe(3);
    expect(hexDistance(origin, { q: 2, r: -1 })).toBe(2);
    expect(hexDistance({ q: 1, r: 1 }, { q: -1, r: -1 })).toBe(4);
  });

  it('places the east neighbour sqrt(3) * size away', () => {
    const flat = axialToFlat({ q: 1, r: 0 }, 2);
    expect(flat.x).toBeCloseTo(2 * Math.sqrt(3));
    expect(flat.z).toBeCloseTo(0);
  });

  it('shares the corners of neighbouring hexes', () => {
    const east = { q: 1, r: 0 };
    const pairs: [number, number][] = [
      [0, 4],
      [1, 3],
    ];
    for (const [a, b] of pairs) {
      const p = flatCorner(origin, a, 1);
      const q = flatCorner(east, b, 1);
      expect(p.x).toBeCloseTo(q.x);
      expect(p.z).toBeCloseTo(q.z);
    }
  });
});

describe.each(modes)('DomeProjection (%s)', (mode) => {
  const proj = new DomeProjection({ mode });
  const hexes = hexesInRadius(proj.params.boardRadius);

  it('puts the apex of the dome above the center', () => {
    expect(proj.project(0, 0)).toEqual({ x: 0, y: proj.radius, z: 0 });
  });

  it('keeps every projected point on the sphere', () => {
    for (const h of hexes) {
      for (let i = 0; i < 6; i++) {
        const c = flatCorner(h, i, proj.params.hexSize);
        expect(length(proj.project(c.x, c.z))).toBeCloseTo(proj.radius, 6);
      }
    }
  });

  it('ends at the rim angle of the cap', () => {
    const lowest = Math.min(
      ...hexes.flatMap((h) =>
        [0, 1, 2, 3, 4, 5].map((i) => {
          const c = flatCorner(h, i, proj.params.hexSize);
          return proj.project(c.x, c.z).y;
        })
      )
    );
    const rim = Math.cos(proj.params.coverage * (Math.PI / 2));
    expect(lowest / proj.radius).toBeGreaterThanOrEqual(rim - 1e-9);
    expect(lowest / proj.radius).toBeLessThan(rim + 0.05);
  });

  it('returns an orthonormal frame with the normal pointing away from the center', () => {
    for (const h of hexes) {
      const f = proj.frame(h);
      expect(length(f.normal)).toBeCloseTo(1, 6);
      expect(length(f.east)).toBeCloseTo(1, 6);
      expect(dot(f.normal, f.east)).toBeCloseTo(0, 3);
      expect(dot(f.normal, f.position)).toBeGreaterThan(0);
    }
  });

  it('points east along the grid x axis in the center', () => {
    const f = proj.frame(origin);
    expect(f.east.x).toBeCloseTo(1, 6);
    expect(f.normal.y).toBeCloseTo(1, 6);
  });
});

describe('conformal projection', () => {
  const proj = new DomeProjection({ mode: 'conformal' });
  const hexes = hexesInRadius(proj.params.boardRadius);

  it('keeps the full size in the center', () => {
    expect(proj.frame(origin).scale).toBeCloseTo(1, 3);
  });

  it('scales both axes equally, so hexes keep their shape', () => {
    for (const h of hexes) {
      const f = proj.frame(h);
      expect(f.scaleX).toBeCloseTo(f.scaleZ, 3);
    }
  });

  it('shrinks the hexes towards the rim, but only a little on a shallow cap', () => {
    const rim = hexes.filter((h) => hexDistance(h, origin) === proj.params.boardRadius);
    for (const h of rim) {
      const f = proj.frame(h);
      expect(f.scale).toBeLessThan(1);
      expect(f.scale).toBeGreaterThan(0.9);
    }
  });
});
