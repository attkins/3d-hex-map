import { Group, Object3D, Scene, Vector3 } from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"

enum FILES {
    TILE_FOREST = './models/hex_forest.gltf.glb',
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
    let house: Object3D;
    let tower: Object3D;
    let castle: Object3D;
    let forest: Object3D;
    let treeA: Object3D;
    let treeB: Object3D;
    let treeC: Object3D;


    const tile$ = loader.loadAsync(FILES.TILE_FOREST).then((result: GLTF) => { tile = result.scene.children[0]; });
    const house$ = loader.loadAsync(FILES.OBJ_HOUSE).then((result: GLTF) => { house = result.scene.children[0]; });
    const tower$ = loader.loadAsync(FILES.OBJ_TOWER).then((result: GLTF) => { tower = result.scene.children[0]; });
    const castle$ = loader.loadAsync(FILES.OBJ_CASTLE).then((result: GLTF) => { castle = result.scene.children[0]; });
    const forest$ = loader.loadAsync(FILES.OBJ_FOREST).then((result: GLTF) => { forest = result.scene.children[0]; });
    const treeA$ = loader.loadAsync(FILES.OBJ_TREE_A).then((result: GLTF) => { treeA = result.scene.children[0]; });
    const treeB$ = loader.loadAsync(FILES.OBJ_TREE_B).then((result: GLTF) => { treeB = result.scene.children[0]; });
    const treeC$ = loader.loadAsync(FILES.OBJ_TREE_C).then((result: GLTF) => { treeC = result.scene.children[0]; });

    return Promise.all([
        tile$,
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
                house,
                tower,
                castle,
                forest,
                treeA,
                treeB,
                treeC,
            };
            return Promise.resolve(models);

            // Tiles

            /*
            const tiles = new Group();
    
                const rows = 20;
                const cols = 10;
                const offsetX = 2;
                const offsetZ = 1.75;
    
                modelTile.castShadow = true;
                modelTile.receiveShadow = true;
    
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const tile = modelTile.clone();
                        tile.position.x = offsetX * c + (offsetX / 2 * (r % 2));
                        tile.position.z = offsetZ * r;
    
                        tile.castShadow = true;
                        tile.receiveShadow = true;
    
                        tiles.add(tile);
                    }
                }
                scene.add(tiles);
                */

        });

    /*
        const tiles = new Group();
    
        const rows = 3;
        const cols = 10;
    
        const offsetX = 2;
        const offsetZ = 1.75;
    
        loader.loadAsync(MODEL.TILE_FOREST, (xhr) => {
            console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
        }).then((gltf: GLTF) => {
    
            const baseTile = gltf.scene.traverse((baseTile: Object3D) => {
    
    
                baseTile.castShadow = true;
                baseTile.receiveShadow = true;
    
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const tile = baseTile.clone();
                        tile.position.x = offsetX * c + (offsetX / 2 * (r % 2) * r);
                        tile.position.z = offsetZ * r;
    
                        tile.castShadow = true;
                        tile.receiveShadow = true;
    
                        tiles.add(tile);
                    }
                }
    
    
                const s = 1;
                //tiles.scale.set(s, s, s);
                //tiles.position.y = 15;
                //tiles.rotation.y = - 1;
    
    
    
                scene.add(tiles);
            });
        });
    
        
        const tiles = new Group();
    loadModel(FILES.OBJ_CASTLE, scene, (model: Object3D) => {
        model.position.x = 2;
        model.position.z = 3;
        model.position.y = 2;
        
        
        model.castShadow = true;
        model.receiveShadow = true;
        
        scene.add(model);
    });
    
    loader.loadAsync(FILES.OBJ_HOUSE, (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
    }).then((gltf: GLTF) => {
        
        const hill = gltf.scene;
        
        hill.receiveShadow = true;
        hill.castShadow = true;
        
        hill.position.x = 3;
        hill.position.z = 2;
        hill.position.y = 2;
        
        tiles.add(hill);
    });
    
    */

};




/*

export const loadModel = (model: FILES, scene: Scene | Group, traversFn: (model: Object3D) => any): void => {
    loader.load(
        model,
        function (gltf) {
            gltf.scene.traverse(traversFn)
            scene.add(gltf.scene)
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
        },
        (error) => {
            console.log(error)
        }
    )
};
*/