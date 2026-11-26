import { Group, Scene } from 'three';
import { init as loadModels } from './model-loader';
import { buildHexSphere } from './hex-sphere';

export const init = async (scene: Scene): Promise<void> => {
  await loadModels();
  const tilesGroup = new Group();
  buildHexSphere(tilesGroup, 12); // 12 Hex-Radius (kannst du anpassen)
  scene.add(tilesGroup);
};
