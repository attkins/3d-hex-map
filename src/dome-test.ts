import type { Object3D } from 'three';
import { generateMap } from './game/generator';
import { createRng } from './game/rng';
import { unitStats } from './game/rules';
import { getTile, type GameState } from './game/state';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
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
import { DomeProjection, flatCorner, hexesInRadius } from './world/dome-projection';

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

/** One color per player, shown as a ring around each owned hex. */
const PLAYER_COLORS = [0xd64545, 0x3f7fd9, 0xe6b93a, 0x4fa84f, 0x9a59c9, 0xe07b2e];
const SEA_COLOR = 0x2f6f9f;

function playerColor(player: number): number {
  return PLAYER_COLORS[player % PLAYER_COLORS.length] ?? 0xffffff;
}

const tileMaterials = new Map<number, MeshStandardMaterial>();
const neutralTileMaterial = new MeshStandardMaterial({ color: 0x8a8a8a, flatShading: true });
const unitMaterials = new Map<number, MeshStandardMaterial>();
const unitGeometries = new Map<number, CylinderGeometry>();
const graveMaterial = new MeshStandardMaterial({ color: 0x8a8a8a, flatShading: true });

/** The whole tile gets the owner color, so connected territories are easy to see. */
function tileMaterial(owner: number | undefined): MeshStandardMaterial {
  if (owner === undefined) return neutralTileMaterial;
  let m = tileMaterials.get(owner);
  if (!m) {
    m = new MeshStandardMaterial({ color: playerColor(owner), flatShading: true, roughness: 0.85 });
    tileMaterials.set(owner, m);
  }
  return m;
}

function unitMaterial(player: number): MeshStandardMaterial {
  let m = unitMaterials.get(player);
  if (!m) {
    m = new MeshStandardMaterial({
      color: new Color(playerColor(player)).lerp(new Color(0x000000), 0.5),
      flatShading: true,
    });
    unitMaterials.set(player, m);
  }
  return m;
}

/** Placeholder figure until real unit models exist: a taller pawn for a stronger unit. */
function unitGeometry(level: number): CylinderGeometry {
  let g = unitGeometries.get(level);
  if (!g) {
    const height = 0.4 + 0.3 * level;
    g = new CylinderGeometry(0.16, 0.3, height, 8).translate(0, height / 2, 0);
    unitGeometries.set(level, g);
  }
  return g;
}

/** Builds the model for every hex from the game state, placed on the dome. */
function buildModels(proj: DomeProjection, game: GameState, seedValue: number): Group {
  const rnd = createRng(seedValue);
  const group = new Group();
  const scale = new Vector3(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE);

  for (const h of hexesInRadius(BOARD_RADIUS)) {
    const f = proj.frame(h);
    const tile = getTile(game, h);
    const cell = new Group();

    // The tile top sits on the dome surface, water lies a little lower.
    const base = (tile ? models.tile : models.water).clone();
    base.position.y = -1;
    if (tile) {
      const material = tileMaterial(tile.owner);
      base.traverse((child) => {
        if ((child as Mesh).isMesh) (child as Mesh).material = material;
      });
    }
    cell.add(base);

    if (tile) {
      let deco: Object3D | undefined;
      if (tile.structure === 'village') deco = models.house.clone();
      else if (tile.structure === 'castle') deco = models.castle.clone();
      else if (tile.structure === 'tree') {
        const roll = rnd();
        deco = (
          roll < 0.5 ? models.forest : roll < 0.7 ? models.treeA : roll < 0.85 ? models.treeB : models.treeC
        ).clone();
      } else if (tile.structure === 'grave') {
        deco = new Mesh(new CylinderGeometry(0.1, 0.12, 0.45, 6).translate(0, 0.22, 0), graveMaterial);
      }
      if (deco) {
        deco.rotation.y = Math.floor(rnd() * 6) * (Math.PI / 3);
        cell.add(deco);
      }

      if (tile.unit && tile.owner !== undefined) {
        const unit = new Mesh(unitGeometry(unitStats[tile.unit].level), unitMaterial(tile.owner));
        unit.castShadow = true;
        if (tile.structure === 'castle' || tile.structure === 'village') unit.position.x = 0.6;
        cell.add(unit);
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

/** Plain colored hexes: owner color on land, blue for sea. */
function buildDome(mode: ProjectionMode, game: GameState): Mesh {
  const proj = new DomeProjection({ mode, boardRadius: BOARD_RADIUS, coverage });
  const hexes = hexesInRadius(BOARD_RADIUS);
  const positions: number[] = [];
  const colors: number[] = [];
  const color = new Color();

  for (const h of hexes) {
    const owner = getTile(game, h)?.owner;
    const land = getTile(game, h) !== undefined;
    color.set(land ? (owner === undefined ? 0x8a8a8a : playerColor(owner)) : SEA_COLOR);

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

let players = 4;
let game: GameState = generateMap({ boardRadius: BOARD_RADIUS, players, seed });

function newGame(): void {
  game = generateMap({ boardRadius: BOARD_RADIUS, players, seed });
}

function showMode(index: number): void {
  modeIndex = index;
  if (domeMesh) {
    scene.remove(domeMesh);
    domeMesh.geometry.dispose();
  }
  const mode = modes[modeIndex] ?? 'conformal';
  domeMesh = buildDome(mode, game);
  domeMesh.visible = !(showModels && modelsReady);
  scene.add(domeMesh);

  if (modelGroup) scene.remove(modelGroup);
  modelGroup = undefined;
  if (modelsReady) {
    modelGroup = buildModels(new DomeProjection({ mode, boardRadius: BOARD_RADIUS, coverage }), game, seed);
    modelGroup.visible = showModels;
    scene.add(modelGroup);
  }
  hud.innerHTML =
    `<b>Hex-Kuppel</b> mit ${hexesInRadius(BOARD_RADIUS).length} Feldern<br>` +
    `Projektion: <b>${modeLabels[mode]}</b><br>` +
    `Wölbung (coverage): <b>${coverage.toFixed(2)}</b> (1 = volle Halbkugel)<br>` +
    `Licht: <b>${currentLight().name}</b>, Karte: <b>${showModels ? 'Modelle' : 'Farbfelder'}</b>, Zufall: <b>${seed}</b>, Spieler: <b>${players}</b><br>` +
    `1, 2, 3: Projektion, + und -: Wölbung, L: Licht, R: neue Karte, P: Spielerzahl, T: Modelle oder Farbfelder`;
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
    newGame();
    showMode(modeIndex);
  }
  if (e.key === 'p' || e.key === 'P') {
    players = players >= PLAYER_COLORS.length ? 2 : players + 1;
    newGame();
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
