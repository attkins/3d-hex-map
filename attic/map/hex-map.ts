import { Group, Mesh, MeshStandardMaterial, Vector3, BufferGeometry, Float32BufferAttribute, Color } from 'three';
import { HexTile } from './hex-tile';

export class HexMap {
  public group = new Group();
  public tiles: HexTile[] = [];

  constructor(
    private radius: number,
    private hexSize: number, // "Radius" eines Hex
    private latSteps: number // Anzahl von Nordpol bis Äquator
  ) {}

  build() {
    const material = new MeshStandardMaterial({ color: 0x8bc34a });

    for (let latIndex = 0; latIndex <= this.latSteps; latIndex++) {
      const v = latIndex / this.latSteps;
      const phi = v * (Math.PI / 2);

      const ringRadius = Math.sin(phi) * this.radius;
      const y = Math.cos(phi) * this.radius;

      const cols = Math.max(6, Math.round((2 * Math.PI * ringRadius) / (this.hexSize * 1.8)));

      // 🔥 **Hex-Größe abhängig vom Ring-Radius**
      const localHexSize = this.hexSize * (ringRadius / this.radius);

      for (let lonIndex = 0; lonIndex < cols; lonIndex++) {
        const theta = (lonIndex / cols) * Math.PI * 2;

        const center = new Vector3(ringRadius * Math.cos(theta), y, ringRadius * Math.sin(theta))
          .normalize()
          .multiplyScalar(this.radius);

        const tile = this.createHexTileOnSphere(center, localHexSize, material);
        this.tiles.push(tile);
        this.group.add(tile.mesh);
      }
    }
  }

  private createHexTileOnSphere(center: Vector3, size: number, material: MeshStandardMaterial): HexTile {
    const normal = center.clone().normalize();

    // Basis für Tangentialebene
    const tangent1 = new Vector3(0, 1, 0).cross(normal).normalize();
    const tangent2 = normal.clone().cross(tangent1).normalize();

    const vertices: number[] = [];
    const indices: number[] = [];

    // Mittelpunkt auf der Kugel (Center)
    vertices.push(center.x, center.y, center.z);

    // 6 Ecken, aber auf der Kugeloberfläche
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const local = tangent1
        .clone()
        .multiplyScalar(Math.cos(ang) * size)
        .add(tangent2.clone().multiplyScalar(Math.sin(ang) * size));

      const point = center.clone().add(local).normalize().multiplyScalar(this.radius);
      vertices.push(point.x, point.y, point.z);
    }

    // Fan: 0 -> 1..6
    for (let i = 1; i <= 6; i++) {
      const next = i === 6 ? 1 : i + 1;
      indices.push(0, i, next);
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new Mesh(geo, material.clone());
    const tile = new HexTile(mesh);
    return tile;
  }
}
