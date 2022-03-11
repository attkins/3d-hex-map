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

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {

            /*
            if (Math.random() * 100 > 80) {
                continue;
            }
            */

            const tileGroup = new Group();
            let tile: Object3D;

            if (Math.random() * 100 > 80) {
                tile = models.water.clone();
            } else {
                tile = models.tile.clone();


                const rand = Math.random() * 100;

                let decoration: Object3D | undefined = undefined;

                if (rand < 1) {
                    decoration = !hasCastle ? models.castle.clone() : models.tower.clone();
                    hasCastle = true;
                } else if (rand < 3) {
                    decoration = models.house.clone();
                } else if (rand < 15) {
                    decoration = models.treeA.clone();
                } else if (rand < 20) {
                    decoration = models.treeB.clone();
                } else if (rand < 25) {
                    decoration = models.treeC.clone();
                } else if (rand < 40) {
                    decoration = models.forest.clone();
                }

                if (decoration) {
                    decoration.castShadow = true;
                    decoration.receiveShadow = true;
                    decoration.position.y = 1;
                    tileGroup.add(decoration);
                }


                // elevation
                tileGroup.position.y = Math.random() * .5;

            }

            tile.castShadow = true;
            tile.receiveShadow = true;
            tileGroup.add(tile);



            tileGroup.castShadow = true;
            tileGroup.receiveShadow = true;

            tileGroup.position.x = offsetX * c + (offsetX / 2 * (r % 2));
            tileGroup.position.z = offsetZ * r;

            tiles.add(tileGroup);
        }
    }

    // 

    tiles.position.z = (cols / -2) * offsetZ;
    tiles.position.x = (rows / -2) * offsetX;

    scene.add(tiles);
};
