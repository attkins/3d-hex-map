import {
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  Object3D,
  ShaderMaterial,
  Vector2,
  type Texture,
} from 'three';
import { createRng } from '../game/rng';
import type { DomeProjection } from '../world/dome-projection';

/** Outer radius of the earth slab in blender/world.blend, the water curtain hangs just outside of it. */
const RIM_RADIUS = 16.7;
/** Top of the earth slab. The water surface lies a little above it. */
const SLAB_TOP_Y = 12.3;
const WATER_Y = SLAB_TOP_Y + 0.1;
/** The tile bottoms reach 0.87 below the dome surface, the water cap stays just under the tile tops. */
const CAP_DEPTH = 0.4;
/** Length of the curtain below the water surface. */
const CURTAIN_HEIGHT = 4.5;

const WATER_COLOR = 0x3a8fc8;

/**
 * Solid water body under the hex tiles. It fills the hollow space between the tiles and the slab,
 * so no gap is visible from the side, and it runs on as a flat rim to the edge of the disc.
 */
export function createWaterCap(proj: DomeProjection, apexY: number, gradientMap?: Texture): Mesh {
  const R = proj.radius - CAP_DEPTH;
  const centerY = apexY - proj.radius;
  const edge = proj.project(proj.params.hexSize * (Math.sqrt(3) * proj.params.boardRadius + 1), 0);
  const phiEdge = Math.atan2(edge.x, edge.y);

  const points: Vector2[] = [];
  const steps = 28;
  for (let i = 0; i <= steps; i++) {
    const a = (phiEdge * i) / steps;
    points.push(new Vector2(R * Math.sin(a), centerY + R * Math.cos(a)));
  }
  const last = points[points.length - 1] ?? new Vector2(0, WATER_Y);
  // Flat rim, rounded lip and a short wall that disappears behind the curtain.
  points.push(
    new Vector2(last.x + 0.5, last.y + (WATER_Y - last.y) * 0.8),
    new Vector2(last.x + 1, WATER_Y),
    new Vector2(RIM_RADIUS - 0.7, WATER_Y),
    new Vector2(RIM_RADIUS - 0.25, WATER_Y - 0.06),
    new Vector2(RIM_RADIUS, WATER_Y - 0.3),
    new Vector2(RIM_RADIUS, WATER_Y - 0.9)
  );

  const material = new MeshToonMaterial({ color: WATER_COLOR, side: DoubleSide });
  if (gradientMap) material.gradientMap = gradientMap;
  const mesh = new Mesh(new LatheGeometry(points, 96), material);
  mesh.receiveShadow = true;
  return mesh;
}

export interface Waterfall {
  group: Group;
  /** Call every frame with the time in seconds. */
  update(seconds: number): void;
}

const curtainVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const curtainFragment = /* glsl */ `
  uniform float uTime;
  uniform float uBright;
  varying vec2 vUv;
  float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
  void main() {
    const float STREAKS = 150.0;
    float id = floor(vUv.x * STREAKS);
    float x = fract(vUv.x * STREAKS);
    float y = 1.0 - vUv.y; // 0 at the water surface, 1 at the lower end
    float len = 0.3 + 0.7 * hash(id);
    float speed = 0.35 + 0.65 * hash(id + 7.0);
    float band = smoothstep(0.0, 0.3, x) * smoothstep(1.0, 0.7, x);
    float flow = fract(y * 2.5 - uTime * speed + hash(id + 3.0));
    float fade = 1.0 - smoothstep(len * 0.55, len, y);
    float foam = 1.0 - smoothstep(0.0, 0.06, y);
    float alpha = clamp(band * fade * (0.45 + 0.55 * flow) + foam * 0.7, 0.0, 1.0);
    vec3 col = mix(vec3(0.9, 0.97, 1.0), vec3(0.22, 0.58, 0.92), smoothstep(0.0, 0.7, y + 0.2 * flow));
    gl_FragColor = vec4(col * uBright, alpha * 0.55);
  }
`;

const DROPS = 110;
const GRAVITY = 2;

/**
 * Water that runs over the edge of the disc: a curtain of streaks and drops that fall into space.
 * Colors are unlit on purpose, the glistening water stays visible although the world below is dark.
 */
export function createWaterfall(brightness = 0.45): Waterfall {
  const group = new Group();

  const curtainMaterial = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uBright: { value: brightness } },
    vertexShader: curtainVertex,
    fragmentShader: curtainFragment,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
  const curtain = new Mesh(
    new CylinderGeometry(RIM_RADIUS + 0.05, RIM_RADIUS - 0.2, CURTAIN_HEIGHT, 192, 1, true),
    curtainMaterial
  );
  curtain.position.y = WATER_Y - 0.2 - CURTAIN_HEIGHT / 2;
  curtain.raycast = () => undefined;
  group.add(curtain);

  const rnd = createRng(77);
  const drops = Array.from({ length: DROPS }, () => ({
    angle: rnd() * Math.PI * 2,
    radius: RIM_RADIUS + 0.1 + rnd() * 0.5,
    y0: WATER_Y - 0.5 - rnd() * (CURTAIN_HEIGHT - 1),
    life: 1 + rnd() * 1.2,
    phase: rnd() * 6,
    size: 0.04 + rnd() * 0.06,
  }));
  const dropMaterial = new MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.6 });
  dropMaterial.color.multiplyScalar(brightness + 0.1);
  const mesh = new InstancedMesh(new IcosahedronGeometry(1, 0), dropMaterial, DROPS);
  mesh.frustumCulled = false;
  mesh.raycast = () => undefined;
  group.add(mesh);

  const dummy = new Object3D();
  const update = (seconds: number): void => {
    curtainMaterial.uniforms['uTime'] = { value: seconds };
    for (const [i, d] of drops.entries()) {
      const t = (seconds + d.phase) % d.life;
      const k = t / d.life;
      dummy.position.set(
        Math.cos(d.angle) * (d.radius + t * 0.15),
        d.y0 - 0.5 * GRAVITY * t * t,
        Math.sin(d.angle) * (d.radius + t * 0.15)
      );
      const s = d.size * Math.max(0, 1 - k) ** 0.6;
      // Drops stretch a little while they speed up and shrink away, as if they evaporate.
      dummy.scale.set(s, s * (1 + t * 0.6), s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return { group, update };
}
