import { Group, Object3D, Scene, Vector3 } from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"

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
};

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

export const init = async (): Promise<Models> => {
    const loader = new GLTFLoader();

    let tile: Object3D;
    let water: Object3D;
    let house: Object3D;
    let tower: Object3D;
    let castle: Object3D;
    let forest: Object3D;
    let treeA: Object3D;
    let treeB: Object3D;
    let treeC: Object3D;

    const tile$ = loader.loadAsync(FILES.TILE_FOREST).then((result: GLTF) => { tile = result.scene.children[0]; });
    const water$ = loader.loadAsync(FILES.TILE_WATER).then((result: GLTF) => { water = result.scene.children[0]; });
    const house$ = loader.loadAsync(FILES.OBJ_HOUSE).then((result: GLTF) => { house = result.scene.children[0]; });
    const tower$ = loader.loadAsync(FILES.OBJ_TOWER).then((result: GLTF) => { tower = result.scene.children[0]; });
    const castle$ = loader.loadAsync(FILES.OBJ_CASTLE).then((result: GLTF) => { castle = result.scene.children[0]; });
    const forest$ = loader.loadAsync(FILES.OBJ_FOREST).then((result: GLTF) => { forest = result.scene.children[0]; });
    const treeA$ = loader.loadAsync(FILES.OBJ_TREE_A).then((result: GLTF) => { treeA = result.scene.children[0]; });
    const treeB$ = loader.loadAsync(FILES.OBJ_TREE_B).then((result: GLTF) => { treeB = result.scene.children[0]; });
    const treeC$ = loader.loadAsync(FILES.OBJ_TREE_C).then((result: GLTF) => { treeC = result.scene.children[0]; });

    return Promise.all([
        tile$,
        water$,
        house$,
        tower$,
        castle$,
        forest$,
        treeA$,
        treeB$,
        treeC$,
    ])
        .then(() => {
            models = {
                tile,
                water,
                house,
                tower,
                castle,
                forest,
                treeA,
                treeB,
                treeC,
            };
            return Promise.resolve(models);
        });
};
