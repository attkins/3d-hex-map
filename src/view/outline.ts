import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial } from 'three';
import { hexDirections, hexKey, type Axial } from '../game/hex';
import { axialToFlat, flatCorner, type DomeProjection } from '../world/dome-projection';

/** For every hex edge i (between corner i and i + 1) the direction index of the neighbour behind it. */
const edgeDirection: number[] = [0, 1, 2, 3, 4, 5].map((i) => {
  const angle = (Math.PI / 180) * 60 * i;
  let best = 0;
  let bestDot = -Infinity;
  hexDirections.forEach((d, index) => {
    const c = axialToFlat(d, 1);
    const dot = c.x * Math.cos(angle) + c.z * Math.sin(angle);
    if (dot > bestDot) {
      bestDot = dot;
      best = index;
    }
  });
  return best;
});

const material = new MeshBasicMaterial({
  color: 0xffffff,
  side: DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
});

const LIFT = 0.12;
const OUTER = 1;
const INNER = 0.85;

/** A white band along the outer border of a group of hexes, lying on the dome. */
export function regionOutline(proj: DomeProjection, hexes: readonly Axial[]): Mesh {
  const inside = new Set(hexes.map(hexKey));
  const positions: number[] = [];

  const point = (h: Axial, corner: number, shrink: number): [number, number, number] => {
    const f = flatCorner(h, corner, 1, shrink);
    const p = proj.project(f.x, f.z);
    const n = proj.frame(h).normal;
    return [p.x + n.x * LIFT, p.y + n.y * LIFT, p.z + n.z * LIFT];
  };

  for (const h of hexes) {
    for (let i = 0; i < 6; i++) {
      const d = hexDirections[edgeDirection[i] ?? 0];
      if (!d || inside.has(hexKey({ q: h.q + d.q, r: h.r + d.r }))) continue;
      const a1 = point(h, i, OUTER);
      const b1 = point(h, (i + 1) % 6, OUTER);
      const a2 = point(h, i, INNER);
      const b2 = point(h, (i + 1) % 6, INNER);
      positions.push(...a1, ...b1, ...b2, ...a1, ...b2, ...a2);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  const mesh = new Mesh(geometry, material);
  mesh.renderOrder = 3;
  return mesh;
}
