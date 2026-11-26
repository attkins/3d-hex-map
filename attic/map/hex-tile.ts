import { Mesh, Color } from 'three';

export class HexTile {
  public selected = false;

  constructor(public mesh: Mesh) {}

  setSelected(on: boolean) {
    this.selected = on;
    (this.mesh.material as any).color = new Color(on ? 0xff0000 : 0x8bc34a);
  }
}
