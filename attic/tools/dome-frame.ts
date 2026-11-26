import { DomeProjection, hexDistance, hexesInRadius } from '../src/world/dome-projection';
const proj = new DomeProjection();
console.log('mode', proj.params.mode, 'radius', proj.radius.toFixed(2));
for (const ring of [0, 3, 6, 9]) {
  const h = hexesInRadius(9).find((x) => hexDistance(x, { q: 0, r: 0 }) === ring)!;
  const f = proj.frame(h);
  console.log(`ring ${ring}: scale ${f.scale.toFixed(3)} (x ${f.scaleX.toFixed(3)}, z ${f.scaleZ.toFixed(3)}), height ${f.position.y.toFixed(2)}`);
}
