import type { Object3D } from 'three';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Matrix4,
  Vector3,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { init as loadModels, models } from './model-loader';
import type { ProjectionMode } from './world/dome-projection';
import { DomeProjection, flatCorner, hexDistance, hexesInRadius } from './world/dome-projection';

const BOARD_RADIUS = 9;
// Apex of the smooth dome in blender/world.blend. The hex tiles are shifted so their apex lands here.
const BLENDER_DOME_APEX_Y = 17.216;
const modes: ProjectionMode[] = ['equidistant', 'equal-area', 'conformal'];
const modeLabels: Record<ProjectionMode, string> = {
  equidistant: 'equidistant (Abstand vom Zentrum bleibt)',
  'equal-area': 'flächentreu (Felder gleich groß)',
  conformal: 'winkeltreu (Felder bleiben Sechsecke)',
};

const container = document.getElementById('container') as HTMLElement;
const hud = document.getElementById('hud') as HTMLElement;

const scene = new Scene();
scene.background = new Color(0x0b0e1a);

const camera = new PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 40, 66);

const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 8, 0);

scene.add(new HemisphereLight(0xbfd8ff, 0x3a2f24, 0.35));
const sun = new DirectionalLight(0xfff1d6, 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.camera.left = -45;
sun.shadow.camera.right = 45;
sun.shadow.camera.top = 45;
sun.shadow.camera.bottom = -45;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 250;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.05;
sun.target.position.set(0, 5, 0);
scene.add(sun, sun.target);

// Light directions to compare with key L.
interface LightPreset {
  name: string;
  dir: Vector3;
}
const defaultLight: LightPreset = { name: 'von oben', dir: new Vector3(0.12, 1, 0.08) };
const lightPresets: LightPreset[] = [
  defaultLight,
  { name: 'schräg von oben', dir: new Vector3(0.45, 1, 0.3) },
  { name: 'dramatisch (flach)', dir: new Vector3(1, 0.55, 0.4) },
];
let lightIndex = 0;

function currentLight(): LightPreset {
  return lightPresets[lightIndex] ?? defaultLight;
}

function applyLight(): void {
  sun.position.copy(currentLight().dir).normalize().multiplyScalar(100).add(sun.target.position);
}
applyLight();

const material = new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
let domeMesh: Mesh | undefined;
let modeIndex = modes.indexOf('conformal');
let coverage = 0.4;
let seed = 1;
let showModels = true;
let modelsReady = false;
let modelGroup: Group | undefined;

// The Kay Lousberg tile has a circumradius of 1.1547 (2 across the flats), the grid hex has a circumradius of 1.
const MODEL_SCALE = 1 / 1.1547;

function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fills every hex with a random tile model (water or land plus decoration), placed on the dome. */
function buildModels(proj: DomeProjection, seedValue: number): Group {
  const rnd = mulberry32(seedValue);
  const hexes = hexesInRadius(BOARD_RADIUS);
  const inner = hexes.filter((h) => hexDistance(h, { q: 0, r: 0 }) <= 6);
  const islands = Array.from({ length: 6 }, () => ({
    center: inner[Math.floor(rnd() * inner.length)] ?? { q: 0, r: 0 },
    radius: 2.5 + rnd() * 2,
  }));

  const group = new Group();
  const scale = new Vector3(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE);
  let castles = 0;

  for (const h of hexes) {
    const f = proj.frame(h);
    const land = islands.some((i) => hexDistance(h, i.center) < i.radius + (rnd() - 0.5) * 1.5);
    const cell = new Group();

    // The tile top sits on the dome surface, water lies a little lower.
    const base = (land ? models.tile : models.water).clone();
    base.position.y = -1;
    cell.add(base);

    if (land) {
      const roll = rnd();
      let deco: Object3D | undefined;
      if (roll < 0.025 && castles < 4) {
        deco = models.castle.clone();
        castles++;
      } else if (roll < 0.04) deco = models.tower.clone();
      else if (roll < 0.1) deco = models.house.clone();
      else if (roll < 0.3) deco = models.forest.clone();
      else if (roll < 0.4) deco = models.treeA.clone();
      else if (roll < 0.47) deco = models.treeB.clone();
      else if (roll < 0.54) deco = models.treeC.clone();
      if (deco) {
        deco.rotation.y = Math.floor(rnd() * 6) * (Math.PI / 3);
        cell.add(deco);
      }
    }

    // Local frame: x along the flat grid x axis, y along the dome normal.
    const x = new Vector3(f.east.x, f.east.y, f.east.z);
    const up = new Vector3(f.normal.x, f.normal.y, f.normal.z);
    const z = new Vector3().crossVectors(x, up);
    new Matrix4()
      .makeBasis(x, up, z)
      .scale(scale)
      .setPosition(f.position.x, f.position.y, f.position.z)
      .decompose(cell.position, cell.quaternion, cell.scale);
    group.add(cell);
  }

  group.position.y = BLENDER_DOME_APEX_Y - proj.radius;
  return group;
}

function buildDome(mode: ProjectionMode): Mesh {
  const proj = new DomeProjection({ mode, boardRadius: BOARD_RADIUS, coverage });
  const hexes = hexesInRadius(BOARD_RADIUS);
  const positions: number[] = [];
  const colors: number[] = [];
  const color = new Color();

  for (const h of hexes) {
    const ring = hexDistance(h, { q: 0, r: 0 });
    // Small checker variation so single hexes stay visible
    const light = 0.42 + ((0.06 * (((h.q - h.r) % 3) + 3)) % 3);
    color.setHSL(0.32 - (ring / BOARD_RADIUS) * 0.22, 0.55, light);

    const c = proj.frame(h).position;
    const corners = [0, 1, 2, 3, 4, 5].map((i) => {
      const f = flatCorner(h, i, 1, 0.94);
      return proj.project(f.x, f.z);
    });
    for (const [i, a] of corners.entries()) {
      const b = corners[(i + 1) % 6] ?? a;
      positions.push(c.x, c.y, c.z, b.x, b.y, b.z, a.x, a.y, a.z);
      for (let k = 0; k < 3; k++) colors.push(color.r, color.g, color.b);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  geo.computeVertexNormals();
  const mesh = new Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.y = BLENDER_DOME_APEX_Y - proj.radius;
  return mesh;
}

function showMode(index: number): void {
  modeIndex = index;
  if (domeMesh) {
    scene.remove(domeMesh);
    domeMesh.geometry.dispose();
  }
  const mode = modes[modeIndex] ?? 'conformal';
  domeMesh = buildDome(mode);
  domeMesh.visible = !(showModels && modelsReady);
  scene.add(domeMesh);

  if (modelGroup) scene.remove(modelGroup);
  modelGroup = undefined;
  if (modelsReady) {
    modelGroup = buildModels(new DomeProjection({ mode, boardRadius: BOARD_RADIUS, coverage }), seed);
    modelGroup.visible = showModels;
    scene.add(modelGroup);
  }
  hud.innerHTML =
    `<b>Hex-Kuppel</b> mit ${hexesInRadius(BOARD_RADIUS).length} Feldern<br>` +
    `Projektion: <b>${modeLabels[mode]}</b><br>` +
    `Wölbung (coverage): <b>${coverage.toFixed(2)}</b> (1 = volle Halbkugel)<br>` +
    `Licht: <b>${currentLight().name}</b>, Karte: <b>${showModels ? 'Modelle' : 'Farbfelder'}</b>, Zufall: <b>${seed}</b><br>` +
    `1, 2, 3: Projektion, + und -: Wölbung, L: Licht, R: neu würfeln, T: Modelle oder Farbfelder`;
}

window.addEventListener('keydown', (e) => {
  const n = Number(e.key);
  if (n >= 1 && n <= modes.length) showMode(n - 1);
  if (e.key === 'l' || e.key === 'L') {
    lightIndex = (lightIndex + 1) % lightPresets.length;
    applyLight();
    showMode(modeIndex);
  }
  if (e.key === 'r' || e.key === 'R') {
    seed += 1;
    showMode(modeIndex);
  }
  if (e.key === 't' || e.key === 'T') {
    showModels = !showModels;
    showMode(modeIndex);
  }
  if (e.key === '+' || e.key === '-') {
    coverage = Math.min(1, Math.max(0.3, coverage + (e.key === '+' ? 0.05 : -0.05)));
    showMode(modeIndex);
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

showMode(modeIndex);

// Existing tile models (Kay Lousberg pack) for the random preview map.
loadModels()
  .then(() => {
    modelsReady = true;
    showMode(modeIndex);
  })
  .catch((err) => console.error('Could not load tile models', err));

// World model from Blender: turtle, elephants and the earth slab.
new GLTFLoader()
  .loadAsync(new URL('./models/world.glb', import.meta.url).href)
  .then((gltf) => {
    // The hex tiles replace the smooth blockout dome.
    const smoothDome = gltf.scene.getObjectByName('World_Dome');
    smoothDome?.removeFromParent();
    gltf.scene.traverse((o) => {
      if ((o as Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    scene.add(gltf.scene);
  })
  .catch((err) => console.error('Could not load world.glb', err));

const animate = (): void => {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
};
animate();
