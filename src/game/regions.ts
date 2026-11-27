import { hexKey, hexNeighbors, parseHexKey, type Axial } from './hex';
import { getTile, type GameState, type PlayerId } from './state';

export interface Region {
  owner: PlayerId;
  hexes: Axial[];
}

function flood(state: GameState, start: Axial, owner: PlayerId, seen: Set<string>): Region {
  const hexes: Axial[] = [];
  const stack: Axial[] = [start];
  seen.add(hexKey(start));
  for (let h = stack.pop(); h; h = stack.pop()) {
    hexes.push(h);
    for (const n of hexNeighbors(h)) {
      const k = hexKey(n);
      if (seen.has(k) || getTile(state, n)?.owner !== owner) continue;
      seen.add(k);
      stack.push(n);
    }
  }
  return { owner, hexes };
}

/** Finds all connected groups of hexes with the same owner (flood fill). */
export function findRegions(state: GameState): Region[] {
  const seen = new Set<string>();
  const regions: Region[] = [];
  for (const [key, tile] of state.tiles) {
    if (tile.owner === undefined || seen.has(key)) continue;
    const start = parseHexKey(key);
    if (start) regions.push(flood(state, start, tile.owner, seen));
  }
  return regions;
}

/** The region that contains the given hex, or undefined for sea and unowned land. */
export function regionAt(state: GameState, h: Axial): Region | undefined {
  const owner = getTile(state, h)?.owner;
  return owner === undefined ? undefined : flood(state, h, owner, new Set());
}

/** The hex of the village of a region, if it has one. */
export function villageOf(state: GameState, region: Region): Axial | undefined {
  return region.hexes.find((h) => getTile(state, h)?.structure === 'village');
}
