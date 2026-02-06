import { Object3D, Mesh, Material } from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

enum FILES {
  TILE_FOREST = './models/hex_forest_detail.gltf.glb',
  TILE_WATER = './models/hex_water_detail.gltf.glb',
  OBJ_HOUSE = './models/house.gltf.glb',
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

/**
 * Aktiviert Shadows rekursiv auf allen Meshes
 */
function setupShadows(object: Object3D, cast: boolean, receive: boolean) {
  object.traverse((child) => {
    if (!(child as any).isMesh) return;

    const mesh = child as Mesh;
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    for (const mat of materials) {
      if (!mat) continue;

      // 🔑 Alpha-Shadow-Fix für Blätter
      if ((mat as any).transparent === true) {
        (mat as any).alphaTest = 0.5;
        (mat as any).depthWrite = true;
      }
    }
  });
}

export const init = async (): Promise<Models> => {
  const loader = new GLTFLoader();

  const [tileGLTF, waterGLTF, houseGLTF, towerGLTF, castleGLTF, forestGLTF, treeAGLTF, treeBGLTF, treeCGLTF] =
    await Promise.all([
      loader.loadAsync(FILES.TILE_FOREST),
      loader.loadAsync(FILES.TILE_WATER),
      loader.loadAsync(FILES.OBJ_HOUSE),
      loader.loadAsync(FILES.OBJ_TOWER),
      loader.loadAsync(FILES.OBJ_CASTLE),
      loader.loadAsync(FILES.OBJ_FOREST),
      loader.loadAsync(FILES.OBJ_TREE_A),
      loader.loadAsync(FILES.OBJ_TREE_B),
      loader.loadAsync(FILES.OBJ_TREE_C),
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

  // Shadow-Regeln
  setupShadows(models.tile, false, true); // Tile empfängt
  setupShadows(models.water, false, false); // Wasser nix
  setupShadows(models.house, true, false);
  setupShadows(models.tower, true, false);
  setupShadows(models.castle, true, false);
  setupShadows(models.forest, true, false);
  setupShadows(models.treeA, true, false);
  setupShadows(models.treeB, true, false);
  setupShadows(models.treeC, true, false);

  return models;
};
