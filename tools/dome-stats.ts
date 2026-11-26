import type { ProjectionMode } from '../src/world/dome-projection.ts';
import { DomeProjection, flatCorner, hexDistance, hexesInRadius } from '../src/world/dome-projection.ts';

const modes: ProjectionMode[] = ['equidistant', 'equal-area', 'conformal'];
const N = 9;

function dist(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

for (const mode of modes) {
  const proj = new DomeProjection({ mode, boardRadius: N, coverage: 1 });
  const hexes = hexesInRadius(N);
  const byRing = new Map<number, { edge: number; aniso: number; count: number; height: number }>();

  for (const h of hexes) {
    const pts = [0, 1, 2, 3, 4, 5].map((i) => {
      const f = flatCorner(h, i, 1);
      return proj.project(f.x, f.z);
    });
    const edges = pts.map((p, i) => dist(p, pts[(i + 1) % 6] ?? p));
    const ring = hexDistance(h, { q: 0, r: 0 });
    const f = proj.frame(h);
    const acc = byRing.get(ring) ?? { edge: 0, aniso: 0, count: 0, height: 0 };
    acc.edge += edges.reduce((a, b) => a + b, 0) / 6;
    acc.aniso += Math.max(...edges) / Math.min(...edges);
    acc.height += f.position.y;
    acc.count += 1;
    byRing.set(ring, acc);
  }

  console.log(`\n== ${mode}  (Kugelradius ${proj.radius.toFixed(2)}, ${hexes.length} Felder)`);
  console.log('Ring  Kantenlaenge  Verzerrung(max/min)  Hoehe');
  for (const ring of [0, 2, 4, 6, 8, 9]) {
    const a = byRing.get(ring)!;
    console.log(
      `${String(ring).padStart(4)}  ${(a.edge / a.count).toFixed(3).padStart(12)}  ${(a.aniso / a.count).toFixed(3).padStart(19)}  ${(a.height / a.count).toFixed(2).padStart(5)}`
    );
  }
}
