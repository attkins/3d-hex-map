import { DomeProjection, hexDistance, hexesInRadius } from '../src/world/dome-projection';

console.log('coverage  Kugelradius  Randhoehe  Rand-Skalierung  Kuppelhoehe/Breite');
for (const coverage of [0.4]) {
  const proj = new DomeProjection({ mode: 'conformal', coverage });
  const rim = hexesInRadius(9).find((h) => hexDistance(h, { q: 0, r: 0 }) === 9)!;
  const f = proj.frame(rim);
  const apex = proj.radius;
  const height = apex - Math.min(...hexesInRadius(9).map((h) => proj.frame(h).position.y));
  const width = 2 * Math.max(...hexesInRadius(9).map((h) => Math.hypot(proj.frame(h).position.x, proj.frame(h).position.z)));
  console.log(
    `${coverage.toFixed(1).padStart(8)}  ${proj.radius.toFixed(2).padStart(11)}  ${f.position.y.toFixed(2).padStart(9)}  ${f.scale.toFixed(2).padStart(15)}  ${(height / width).toFixed(2).padStart(18)}`
  );
}
