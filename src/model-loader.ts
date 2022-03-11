import { Group, Object3D, Scene, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"

export enum HEX_MODEL {
    TILE_FOREST = './models/hex_forest.gltf.glb',
    OBJ_HILL = './models/detail_hill.gltf.glb',
    OBJ_CASTLE = './models/castle.gltf.glb',
};

export const loader = new GLTFLoader()

export const loadModels = (scene: Scene): void => {
    const tiles = new Group();

    const rows = 10;
    const cols = 10;

    const offsetX = 1.5;
    const offsetY = .5;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            loadModel(HEX_MODEL.TILE_FOREST, tiles, (model: Object3D) => {
                model.position.x = offsetX * c + (offsetX / 2 * (c % 2));
                model.position.z = offsetY * r;

                model.castShadow = true;
                model.receiveShadow = true;

                tiles.add(model);

            });
        }
    }

    const s = 1;
    //tiles.scale.set(s, s, s);
    //tiles.position.y = 15;
    //tiles.rotation.y = - 1;


    scene.add(tiles);
};

export const loadModel = (model: HEX_MODEL, scene: Scene | Group, traversFn: (model: Object3D) => any): void => {
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
