/** Axial hex coordinates (pointy-top). Pure helpers, no rendering involved. */

export interface Axial {
  q: number;
  r: number;
}

/** The six neighbour offsets, counter-clockwise starting at east. */
export const hexDirections: readonly Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function hexCount(boardRadius: number): number {
  return 3 * boardRadius * (boardRadius + 1) + 1;
}

export function hexesInRadius(boardRadius: number): Axial[] {
  const result: Axial[] = [];
  // Written as 0 - n instead of -n, so a radius of 0 yields +0 and never -0.
  for (let q = 0 - boardRadius; q <= boardRadius; q++) {
    const rMin = Math.max(0 - boardRadius, 0 - q - boardRadius);
    const rMax = Math.min(boardRadius, 0 - q + boardRadius);
    for (let r = rMin; r <= rMax; r++) result.push({ q, r });
  }
  return result;
}

export function hexDistance(a: Axial, b: Axial): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

export function hexKey(h: Axial): string {
  return `${h.q},${h.r}`;
}

export function hexNeighbors(h: Axial): Axial[] {
  return hexDirections.map((d) => ({ q: h.q + d.q, r: h.r + d.r }));
}

export function parseHexKey(key: string): Axial | undefined {
  const [q, r] = key.split(',').map(Number);
  return q === undefined || r === undefined || Number.isNaN(q) || Number.isNaN(r) ? undefined : { q, r };
}
