import { hexKey, hexNeighbors, type Axial } from './hex';
import { getTile, type GameState, type PlayerId } from './state';

export interface Region {
  owner: PlayerId;
  hexes: Axial[];
}

/** Finds all connected groups of hexes with the same owner (flood fill). */
export function findRegions(state: GameState): Region[] {
  const seen = new Set<string>();
  const regions: Region[] = [];
  for (const [key, tile] of state.tiles) {
    if (tile.owner === undefined || seen.has(key)) continue;
    const [q, r] = key.split(',').map(Number);
    if (q === undefined || r === undefined) continue;
    const hexes: Axial[] = [];
    const stack: Axial[] = [{ q, r }];
    seen.add(key);
    while (stack.length > 0) {
      const h = stack.pop();
      if (!h) break;
      hexes.push(h);
      for (const n of hexNeighbors(h)) {
        const k = hexKey(n);
        if (seen.has(k) || getTile(state, n)?.owner !== tile.owner) continue;
        seen.add(k);
        stack.push(n);
      }
    }
    regions.push({ owner: tile.owner, hexes });
  }
  return regions;
}
