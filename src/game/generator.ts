import { hexDistance, hexesInRadius, hexKey, hexNeighbors, type Axial } from './hex';
import { normalizeProvinces } from './provinces';
import { createRng, type Rng } from './rng';
import { createState, getTile, setTile, type GameState } from './state';

export interface MapOptions {
  boardRadius: number;
  players: number;
  seed: number;
  /** Share of the board that is land, 0 to 1. */
  landRatio?: number;
  /** Number of separate land masses to start with. They may merge while growing. */
  islands?: number;
  /** Chance that a free land hex carries a tree. */
  treeChance?: number;
  /** Gold in each province at the start. */
  startMoney?: number;
}

function pick<T>(items: readonly T[], rng: Rng): T | undefined {
  return items[Math.floor(rng() * items.length)];
}

/** Grows blobs of land by repeatedly adding a random free neighbour of a random land hex. */
function growLand(radius: number, target: number, islands: number, rng: Rng): Axial[] {
  const all = hexesInRadius(radius);
  const board = new Set(all.map(hexKey));
  const land = new Set<string>();
  const list: Axial[] = [];
  const add = (h: Axial): void => {
    land.add(hexKey(h));
    list.push(h);
  };

  for (let i = 0; i < islands && list.length < target; i++) {
    const h = pick(all, rng);
    if (h && !land.has(hexKey(h))) add(h);
  }
  for (let tries = 0; list.length < target && tries < target * 400; tries++) {
    const from = pick(list, rng);
    const next = from && pick(hexNeighbors(from), rng);
    if (next && board.has(hexKey(next)) && !land.has(hexKey(next))) add(next);
  }
  return list;
}

/** Picks one start hex per player, as far apart as possible. */
function startHexes(land: readonly Axial[], players: number, rng: Rng): Axial[] {
  const first = pick(land, rng);
  const starts: Axial[] = first ? [first] : [];
  while (starts.length < Math.min(players, land.length)) {
    let best: Axial | undefined;
    let bestDist = -1;
    for (const h of land) {
      const d = Math.min(...starts.map((s) => hexDistance(h, s)));
      if (d > bestDist) {
        best = h;
        bestDist = d;
      }
    }
    if (!best) break;
    starts.push(best);
  }
  return starts;
}

/**
 * Builds a ready-to-play state: land, an even split between the players, one village per
 * province and a few trees. The same seed always gives the same map.
 */
export function generateMap(options: MapOptions): GameState {
  const { boardRadius, players, seed, landRatio = 0.6, islands = 3, treeChance = 0.1, startMoney = 10 } = options;
  const rng = createRng(seed);
  const state = createState(boardRadius, players);

  const total = hexesInRadius(boardRadius).length;
  const land = growLand(boardRadius, Math.round(total * landRatio), islands, rng);
  const free = new Map(land.map((h) => [hexKey(h), h]));
  for (const h of land) setTile(state, h, {});

  const claim = (h: Axial, owned: Axial[], player: number): void => {
    free.delete(hexKey(h));
    owned.push(h);
    const tile = getTile(state, h);
    if (tile) tile.owner = player;
  };

  // Each player claims one neighbouring hex per round, so everybody ends up with the same size.
  const starts = startHexes(land, players, rng);
  const owned: Axial[][] = starts.map(() => []);
  for (const [p, start] of starts.entries()) {
    const list = owned[p];
    if (list) claim(start, list, p);
  }
  while (free.size > 0) {
    for (const [p, list] of owned.entries()) {
      if (free.size === 0) break;
      const candidates = list.flatMap(hexNeighbors).filter((n) => free.has(hexKey(n)));
      const next = pick(candidates, rng) ?? pick([...free.values()], rng);
      if (next) claim(next, list, p);
    }
  }

  normalizeProvinces(state, rng);
  for (const key of state.money.keys()) state.money.set(key, startMoney);
  for (const tile of state.tiles.values()) {
    if (!tile.structure && rng() < treeChance) tile.structure = 'tree';
  }
  return state;
}
