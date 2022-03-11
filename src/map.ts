import { Group, Object3D, Scene } from "three";

import { init as modelLoader, models } from './model-loader';

export const init = (scene: Scene): void => {

    modelLoader()
        .then((models) => {
            console.log('models loaded');

            initMap(scene);
        });
};

const initMap = (scene: Scene): void => {

    let hasCastle = false;

    const tiles = new Group();

    const rows = 30;
    const cols = 20;

    const offsetX = 2;
    const offsetZ = 1.75;

    const baseTile = models.tile.clone();
    baseTile.castShadow = true;
    baseTile.receiveShadow = true;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {

            if (Math.random() * 100 > 60) {
                continue;
            }

            const tileGroup = new Group();

            const tile = baseTile.clone();
            tile.castShadow = true;
            tile.receiveShadow = true;
            tileGroup.add(tile);


            const rand = Math.random() * 100;

            let decoration: Object3D | undefined = undefined;

            if (rand < 3 && !hasCastle) {
                hasCastle = true;
                decoration = models.castle.clone();
            } else if (rand < 6) {
                decoration = models.house.clone();
            } else if (rand < 20) {
                decoration = models.treeA.clone();
            } else if (rand < 30) {
                decoration = models.treeB.clone();
            } else if (rand < 40) {
                decoration = models.treeC.clone();
            } else if (rand < 50) {
                decoration = models.forest.clone();
            } else if (rand < 70) {
                decoration = models.forest.clone();
            }

            if (decoration) {
                decoration.castShadow = true;
                decoration.receiveShadow = true;
                decoration.position.y = 1;
                tileGroup.add(decoration);
            }

            tileGroup.castShadow = true;
            tileGroup.receiveShadow = true;

            tileGroup.position.x = offsetX * c + (offsetX / 2 * (r % 2));
            tileGroup.position.z = offsetZ * r;
            // elevation
            tileGroup.position.y = Math.random() * .5;

            tiles.add(tileGroup);
        }
    }

    // 

    tiles.position.z = (cols / -2) * offsetZ;
    tiles.position.x = (rows / -2) * offsetX;

    scene.add(tiles);

    /*
        
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
