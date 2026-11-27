import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  Points,
  PointsMaterial,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { createRng } from '../game/rng';

const SKY_RADIUS = 600;

/** Gradient from a deep violet at the horizon to near black on top, painted on the inside of a big sphere. */
function skyDome(): Mesh {
  const material = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new Color(0x04050e) },
      middle: { value: new Color(0x141a4a) },
      bottom: { value: new Color(0x2c1a52) },
    },
    vertexShader: `
      varying float h;
      void main() {
        h = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 top;
      uniform vec3 middle;
      uniform vec3 bottom;
      varying float h;
      void main() {
        vec3 c = h > 0.0 ? mix(middle, top, pow(h, 0.6)) : mix(middle, bottom, pow(-h, 0.6));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const dome = new Mesh(new SphereGeometry(SKY_RADIUS, 32, 16), material);
  dome.renderOrder = -2;
  return dome;
}

/** Random stars on a sphere around the scene, in a few sizes and warm or cold tints. */
function stars(count: number, size: number, seed: number): Points {
  const rnd = createRng(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const tint = new Color();
  for (let i = 0; i < count; i++) {
    const y = rnd() * 2 - 1;
    const angle = rnd() * Math.PI * 2;
    const ring = Math.sqrt(1 - y * y);
    const r = SKY_RADIUS * 0.95;
    positions.set([Math.cos(angle) * ring * r, y * r, Math.sin(angle) * ring * r], i * 3);
    tint.setHSL(rnd() < 0.5 ? 0.6 : 0.1, 0.5 + rnd() * 0.4, 0.75 + rnd() * 0.25);
    colors.set([tint.r, tint.g, tint.b], i * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  const points = new Points(
    geometry,
    new PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, depthWrite: false, fog: false })
  );
  points.renderOrder = -1;
  return points;
}

const TRAIL_POINTS = 16;
const SHOOTING_STAR_LIFE = 1.1;

/** One shooting star: a short trail of points that glides over the sky and fades out. */
class ShootingStar {
  readonly points: Points;
  private readonly positions = new Float32Array(TRAIL_POINTS * 3);
  private readonly colors = new Float32Array(TRAIL_POINTS * 3);
  private readonly head = new Vector3();
  private readonly velocity = new Vector3();
  private age = Infinity;

  constructor() {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new BufferAttribute(this.colors, 3));
    this.points = new Points(
      geometry,
      new PointsMaterial({
        size: 3.5,
        sizeAttenuation: false,
        vertexColors: true,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      })
    );
    this.points.frustumCulled = false;
    this.points.visible = false;
    this.points.renderOrder = 0;
  }

  get active(): boolean {
    return this.age < SHOOTING_STAR_LIFE;
  }

  /** Starts somewhere in the upper sky and flies in a random direction along the sphere. */
  start(rnd: () => number): void {
    const y = 0.15 + rnd() * 0.75;
    const angle = rnd() * Math.PI * 2;
    const ring = Math.sqrt(1 - y * y);
    this.head.set(Math.cos(angle) * ring, y, Math.sin(angle) * ring).multiplyScalar(SKY_RADIUS * 0.9);
    const random = new Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5);
    const tangent = random.sub(this.head.clone().normalize().multiplyScalar(random.dot(this.head.clone().normalize())));
    this.velocity.copy(tangent.normalize().multiplyScalar(260 + rnd() * 140));
    this.age = 0;
    this.points.visible = true;
  }

  update(dt: number): void {
    if (!this.active) return;
    this.age += dt;
    this.head.add(this.velocity.clone().multiplyScalar(dt)).setLength(SKY_RADIUS * 0.9);
    const life = this.age / SHOOTING_STAR_LIFE;
    const envelope = Math.sin(Math.min(1, life) * Math.PI);
    const direction = this.velocity.clone().normalize();
    for (let i = 0; i < TRAIL_POINTS; i++) {
      const p = this.head
        .clone()
        .addScaledVector(direction, -i * 5)
        .setLength(SKY_RADIUS * 0.9);
      this.positions.set([p.x, p.y, p.z], i * 3);
      const k = (1 - i / TRAIL_POINTS) ** 2 * envelope;
      this.colors.set([k, k * 0.95, k * 0.85], i * 3);
    }
    this.points.geometry.attributes['position']!.needsUpdate = true;
    this.points.geometry.attributes['color']!.needsUpdate = true;
    if (!this.active) this.points.visible = false;
  }
}

/** A starry sky around the world, so it looks like it floats through space. It turns very slowly. */
export function createSpace(): { group: Group; update(seconds: number): void } {
  const group = new Group();
  group.add(skyDome(), stars(1800, 1.6, 11), stars(500, 2.8, 12), stars(60, 4.5, 13));

  const rnd = createRng(21);
  const shooting = [new ShootingStar(), new ShootingStar(), new ShootingStar()];
  for (const s of shooting) group.add(s.points);
  let last: number | undefined;
  let nextSpawn = 1.5;

  return {
    group,
    update(seconds) {
      const dt = last === undefined ? 0 : Math.min(0.1, seconds - last);
      last = seconds;
      group.rotation.y = seconds * 0.004;
      group.rotation.x = seconds * 0.0015;

      nextSpawn -= dt;
      if (nextSpawn <= 0) {
        shooting.find((s) => !s.active)?.start(rnd);
        nextSpawn = 2 + rnd() * 5;
      }
      for (const s of shooting) s.update(dt);
    },
  };
}
