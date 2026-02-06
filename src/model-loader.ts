import { Object3D, Mesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

enum FILES {
  TILE_FOREST = './models/hex_forest_detail.gltf.glb',
  TILE_WATER = './models/hex_water_detail.gltf.glb',
  OBJ_HOUSE = './models/house.gltf.glb', // <-- hier
  OBJ_TOWER = './models/watchtower.gltf.glb',
  OBJ_CASTLE = './models/castle.gltf.glb',
  OBJ_FOREST = './models/forest.gltf.glb',
  OBJ_TREE_A = './models/detail_treeA.gltf.glb',
  OBJ_TREE_B = './models/detail_treeB.gltf.glb',
  OBJ_TREE_C = './models/detail_treeC.gltf.glb',
}

export type Models = {
  tile: Object3D;
  water: Object3D;
  house: Object3D;
  tower: Object3D;
  castle: Object3D;
  forest: Object3D;
  treeA: Object3D;
  treeB: Object3D;
  treeC: Object3D;
};

export let models: Models;

function setupShadows(object: Object3D, cast: boolean, receive: boolean) {
  object.traverse((child) => {
    if (!(child as any).isMesh) return;

    const mesh = child as Mesh;
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    for (const mat of materials) {
      if (!mat) continue;

      if ((mat as any).transparent === true) {
        (mat as any).alphaTest = 0.5;
        (mat as any).depthWrite = true;
      }
    }
  });
}

export const init = async (): Promise<Models> => {
  const loader = new GLTFLoader();

  const urls = {
    tile: new URL(FILES.TILE_FOREST, import.meta.url).href,
    water: new URL(FILES.TILE_WATER, import.meta.url).href,
    house: new URL(FILES.OBJ_HOUSE, import.meta.url).href,
    tower: new URL(FILES.OBJ_TOWER, import.meta.url).href,
    castle: new URL(FILES.OBJ_CASTLE, import.meta.url).href,
    forest: new URL(FILES.OBJ_FOREST, import.meta.url).href,
    treeA: new URL(FILES.OBJ_TREE_A, import.meta.url).href,
    treeB: new URL(FILES.OBJ_TREE_B, import.meta.url).href,
    treeC: new URL(FILES.OBJ_TREE_C, import.meta.url).href,
  };

  const [tileGLTF, waterGLTF, houseGLTF, towerGLTF, castleGLTF, forestGLTF, treeAGLTF, treeBGLTF, treeCGLTF] =
    await Promise.all([
      loader.loadAsync(urls.tile),
      loader.loadAsync(urls.water),
      loader.loadAsync(urls.house),
      loader.loadAsync(urls.tower),
      loader.loadAsync(urls.castle),
      loader.loadAsync(urls.forest),
      loader.loadAsync(urls.treeA),
      loader.loadAsync(urls.treeB),
      loader.loadAsync(urls.treeC),
    ]);

  models = {
    tile: tileGLTF.scene,
    water: waterGLTF.scene,
    house: houseGLTF.scene,
    tower: towerGLTF.scene,
    castle: castleGLTF.scene,
    forest: forestGLTF.scene,
    treeA: treeAGLTF.scene,
    treeB: treeBGLTF.scene,
    treeC: treeCGLTF.scene,
  };

  setupShadows(models.tile, false, true);
  setupShadows(models.water, false, false);
  setupShadows(models.house, true, false);
  setupShadows(models.tower, true, false);
  setupShadows(models.castle, true, false);
  setupShadows(models.forest, true, false);
  setupShadows(models.treeA, true, false);
  setupShadows(models.treeB, true, false);
  setupShadows(models.treeC, true, false);

  return models;
};
