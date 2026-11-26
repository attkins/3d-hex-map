import { Group, Object3D, Scene } from 'three';
import { init as loadModels, models } from './model-loader';

export const init = (scene: Scene): void => {
  loadModels().then(() => {
    console.log('Models loaded');
    buildMap(scene);
  });
};

const buildMap = (scene: Scene): void => {
  const tiles = new Group();
  let hasCastle = false;

  const rows = 30;
  const cols = 20;

  const offsetX = 1.99;
  const offsetZ = 1.74;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tileGroup = new Group();
      let tile: Object3D;

      // Wasser vs Land
      if (Math.random() > 0.8) {
        tile = models.water.clone();
      } else {
        tile = models.tile.clone();

        const rand = Math.random();
        let decoration: Object3D | undefined;

        if (rand < 0.01 && !hasCastle) {
          decoration = models.castle.clone();
          hasCastle = true;
        } else if (rand < 0.03) {
          decoration = models.house.clone();
        } else if (rand < 0.15) {
          decoration = models.treeA.clone();
        } else if (rand < 0.2) {
          decoration = models.treeB.clone();
        } else if (rand < 0.25) {
          decoration = models.treeC.clone();
        } else if (rand < 0.4) {
          decoration = models.forest.clone();
        }

        if (decoration) {
          decoration.position.y = 1;
          tileGroup.add(decoration);
        }

        // leichte Höhenvariation
        tileGroup.position.y = Math.random() * 0.5;
      }

      tileGroup.add(tile);

      tileGroup.position.x = offsetX * c + (offsetX / 2) * (r % 2);
      tileGroup.position.z = offsetZ * r;

      tiles.add(tileGroup);
    }
  }

  // Grid zentrieren
  tiles.position.x = (rows / -2) * offsetX;
  tiles.position.z = (cols / -2) * offsetZ;

  scene.add(tiles);
};
