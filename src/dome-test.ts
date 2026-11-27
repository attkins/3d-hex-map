import type { Object3D } from 'three';
import { generateMap } from './game/generator';
import { createRng } from './game/rng';
import { unitKinds, unitStats } from './game/rules';
import { Session, type Highlight } from './game/session';
import { hexKey, type Axial } from './game/hex';
import { regionAt } from './game/regions';
import { regionOutline } from './view/outline';
import { createSpace } from './view/space';
import { createTurtleAnimation, type TurtleAnimation } from './view/turtle';
import { getTile, type GameState } from './game/state';
import { createGamePanel } from './ui/game-panel';
import { PLAYER_COLORS, playerColor } from './view/colors';
import {
  AmbientLight,
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
  CircleGeometry,
  DataTexture,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  MeshBasicMaterial,
  PerspectiveCamera,
  PointLight,
  Raycaster,
  Vector2,
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
scene.background = new Color(0x04050e);
const space = createSpace();

scene.add(space.group);

const camera = new PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 2000);
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

scene.add(new HemisphereLight(0xdcebff, 0x8a7a66, 0.6));
// Ambient light has no direction and lights everything equally, so shadowed sides stay readable.
const ambient = new AmbientLight(0xffffff, 0.6);
scene.add(ambient);
const sun = new DirectionalLight(0xfff4e0, 2.2);
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

// A lamp floating above the board. Intensity is in candela, so it falls off with the square of the distance.
const lamp = new PointLight(0xfff0d8, 2600, 0, 2);
lamp.position.set(0, 48, 0);
lamp.castShadow = true;
lamp.shadow.mapSize.set(2048, 2048);
lamp.shadow.camera.near = 1;
lamp.shadow.camera.far = 150;
lamp.shadow.bias = -0.0005;
lamp.shadow.normalBias = 0.05;
scene.add(lamp);

// Light directions to compare with key L.
interface LightPreset {
  name: string;
  dir: Vector3;
  /** Lamp above the board instead of the sun. */
  lamp?: boolean;
}
const defaultLight: LightPreset = { name: 'Lampe über dem Feld', dir: new Vector3(0, 1, 0), lamp: true };
const lightPresets: LightPreset[] = [
  defaultLight,
  { name: 'Sonne von oben', dir: new Vector3(0.12, 1, 0.08) },
  { name: 'schräg von oben', dir: new Vector3(0.45, 1, 0.3) },
  { name: 'dramatisch (flach)', dir: new Vector3(1, 0.55, 0.4) },
];
let lightIndex = 0;

function currentLight(): LightPreset {
  return lightPresets[lightIndex] ?? defaultLight;
}

function applyLight(): void {
  const useLamp = currentLight().lamp === true;
  lamp.visible = useLamp;
  sun.visible = !useLamp;
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

const SEA_COLOR = 0x3a8fc8;

const tileMaterials = new Map<number, MeshToonMaterial>();
/** Four hard light steps give the tiles a cartoon look. */
const toonSteps = new DataTexture(new Uint8Array([140, 185, 225, 255]), 4, 1, RedFormat);
toonSteps.minFilter = NearestFilter;
toonSteps.magFilter = NearestFilter;
toonSteps.needsUpdate = true;
const neutralTileMaterial = new MeshToonMaterial({ color: 0xc4c4c4, gradientMap: toonSteps });
/** Figures from blender/units.blend, one per unit level, loaded from src/models/units.glb. */
const unitModels = new Map<number, Object3D>();
const UNIT_SCALE = 0.85;
/** Buildings and trees are scaled down so the figures and the owner colors stay readable. */
const BUILDING_SCALE = 0.7;
const TREE_SCALE = 0.55;
const graveMaterial = new MeshStandardMaterial({ color: 0x8a8a8a, flatShading: true });

/** The whole tile gets the owner color, so connected territories are easy to see. */
function tileMaterial(owner: number | undefined): MeshToonMaterial {
  if (owner === undefined) return neutralTileMaterial;
  let m = tileMaterials.get(owner);
  if (!m) {
    m = new MeshToonMaterial({ color: playerColor(owner), gradientMap: toonSteps });
    tileMaterials.set(owner, m);
  }
  return m;
}

const highlightColors: Record<Highlight, number> = {
  selected: 0xffe066,
  move: 0xffffff,
  merge: 0x66e0ff,
  capture: 0xff5533,
  place: 0xaaff88,
};
const highlightMaterials = new Map<Highlight, MeshBasicMaterial>();
let highlightGeometry: CircleGeometry | undefined;

/** Flat translucent hexagon that lies on a tile to mark it. */
function highlightPlate(kind: Highlight): Mesh {
  highlightGeometry ??= new CircleGeometry(1.1547 * 0.9, 6).rotateX(-Math.PI / 2).rotateY(Math.PI / 6);
  let m = highlightMaterials.get(kind);
  if (!m) {
    m = new MeshBasicMaterial({
      color: highlightColors[kind],
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    highlightMaterials.set(kind, m);
  }
  const plate = new Mesh(highlightGeometry, m);
  plate.position.y = 0.08;
  plate.renderOrder = 2;
  return plate;
}

/** Builds the model for every hex from the game state, placed on the dome. */
function buildModels(proj: DomeProjection, session: Session, seedValue: number): Group {
  const game = session.state;
  const marks = session.highlights();
  const rnd = createRng(seedValue);
  const group = new Group();
  const scale = new Vector3(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE);

  for (const h of hexesInRadius(BOARD_RADIUS)) {
    const f = proj.frame(h);
    const tile = getTile(game, h);
    const cell = new Group();
    cell.userData['hex'] = h;

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
        deco.scale.setScalar(tile.structure === 'village' || tile.structure === 'castle' ? BUILDING_SCALE : TREE_SCALE);
        deco.rotation.y = Math.floor(rnd() * 6) * (Math.PI / 3);
        cell.add(deco);
      }

      const figure = tile.unit && unitModels.get(unitStats[tile.unit].level)?.clone(true);
      if (figure) {
        figure.scale.setScalar(UNIT_SCALE);
        figure.rotation.y = Math.floor(rnd() * 6) * (Math.PI / 3);
        if (tile.structure === 'castle' || tile.structure === 'village') figure.position.x = 0.5;
        cell.add(figure);
      }
    }

    const mark = marks.get(hexKey(h));
    if (mark) cell.add(highlightPlate(mark));

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

  if (session.selected) {
    const region = regionAt(game, session.selected);
    if (region) {
      const outline = regionOutline(proj, region.hexes);
      outline.raycast = () => undefined; // clicks go through to the tiles
      group.add(outline);
    }
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
let session = new Session(newGameState(), createRng(1));

/** Preview only: puts a few units of all levels on free hexes, so the figures can be judged. */
function newGameState(): GameState {
  const state = generateMap({ boardRadius: BOARD_RADIUS, players, seed });
  const rnd = createRng(seed + 1000);
  for (const tile of state.tiles.values()) {
    if (tile.owner === undefined || tile.structure || rnd() > 0.14) continue;
    tile.unit = unitKinds[Math.floor(rnd() * unitKinds.length)];
  }
  return state;
}

function newGame(): void {
  session = new Session(newGameState(), createRng(seed + 2000));
}

const panel = createGamePanel(
  document.body,
  () => session,
  () => showMode(modeIndex)
);

function showMode(index: number): void {
  modeIndex = index;
  if (domeMesh) {
    scene.remove(domeMesh);
    domeMesh.geometry.dispose();
  }
  const mode = modes[modeIndex] ?? 'conformal';
  domeMesh = buildDome(mode, session.state);
  domeMesh.visible = !(showModels && modelsReady);
  scene.add(domeMesh);

  if (modelGroup) scene.remove(modelGroup);
  modelGroup = undefined;
  if (modelsReady) {
    modelGroup = buildModels(new DomeProjection({ mode, boardRadius: BOARD_RADIUS, coverage }), session, seed);
    modelGroup.visible = showModels;
    scene.add(modelGroup);
  }
  hud.innerHTML =
    `<b>Hex-Kuppel</b> mit ${hexesInRadius(BOARD_RADIUS).length} Feldern<br>` +
    `Projektion: <b>${modeLabels[mode]}</b><br>` +
    `Wölbung (coverage): <b>${coverage.toFixed(2)}</b> (1 = volle Halbkugel)<br>` +
    `Licht: <b>${currentLight().name}</b>, Grundhelligkeit: <b>${ambient.intensity.toFixed(1)}</b>, Karte: <b>${showModels ? 'Modelle' : 'Farbfelder'}</b>, Zufall: <b>${seed}</b>, Spieler: <b>${players}</b><br>` +
    `Klick: auswählen und ziehen, Enter: Runde beenden, Esc: Auswahl aufheben<br>` +
    `1, 2, 3: Projektion, + und -: Wölbung, L: Licht, S: Schildkröte schwimmt, [ und ]: Grundhelligkeit, R: neue Karte, P: Spielerzahl, T: Modelle oder Farbfelder`;
  panel.update();
}

function pick(ev: PointerEvent): Axial | undefined {
  if (!modelGroup || !showModels) return undefined;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(modelGroup.children, true)[0];
  for (let o: Object3D | null = hit?.object ?? null; o; o = o.parent) {
    const h = o.userData['hex'] as Axial | undefined;
    if (h) return h;
  }
  return undefined;
}

// A click is a press and release that hardly moved, so dragging still rotates the camera.
const raycaster = new Raycaster();
const pointer = new Vector2();
let pressAt: { x: number; y: number } | undefined;
renderer.domElement.addEventListener('pointerdown', (e) => {
  pressAt = { x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener('pointerup', (e) => {
  const start = pressAt;
  pressAt = undefined;
  if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5) return;
  const h = pick(e);
  if (!h) return;
  session.click(h);
  showMode(modeIndex);
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    session.endTurn();
    showMode(modeIndex);
  }
  if (e.key === 'Escape') {
    session.selected = undefined;
    session.holding = undefined;
    showMode(modeIndex);
  }
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
  if ((e.key === 's' || e.key === 'S') && turtle) turtle.enabled = !turtle.enabled;
  if (e.key === '[' || e.key === ']') {
    ambient.intensity = Math.min(3, Math.max(0, ambient.intensity + (e.key === ']' ? 0.2 : -0.2)));
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

// Unit figures from Blender: one node per unit level, named Unit_<level>_<name>.
new GLTFLoader()
  .loadAsync(new URL('./models/units.glb', import.meta.url).href)
  .then((gltf) => {
    for (const node of gltf.scene.children) {
      const level = Number(/^Unit_(\d)_/.exec(node.name)?.[1]);
      if (!level) continue;
      node.position.set(0, 0, 0);
      node.traverse((o) => {
        if ((o as Mesh).isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      unitModels.set(level, node);
    }
    showMode(modeIndex);
  })
  .catch((err) => console.error('Could not load units.glb', err));

// World model from Blender: turtle, elephants and the earth slab.
let turtle: TurtleAnimation | undefined;
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
    turtle = createTurtleAnimation(gltf.scene);
  })
  .catch((err) => console.error('Could not load world.glb', err));

const animate = (): void => {
  requestAnimationFrame(animate);
  controls.update();
  space.update(performance.now() / 1000);
  turtle?.update(performance.now() / 1000);
  space.group.position.copy(camera.position);
  renderer.render(scene, camera);
};
animate();
