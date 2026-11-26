import { Camera, Raycaster, Vector2 } from 'three';
import { HexTile } from '../map/hex-tile';

export class Input {
  private raycaster = new Raycaster();
  private mouse = new Vector2();

  constructor(
    private camera: Camera,
    private scene: any
  ) {}

  listen(canvas: HTMLCanvasElement, tiles: HexTile[], onClick: (tile: HexTile) => void) {
    canvas.addEventListener('click', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hits = this.raycaster.intersectObjects(tiles.map((t) => t.mesh));
      if (hits.length > 0) {
        const mesh = hits[0].object;
        const tile = tiles.find((t) => t.mesh === mesh);
        if (tile) onClick(tile);
      }
    });
  }
}
