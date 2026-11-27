import { regionIncome, regionUpkeep, settleRegion } from './economy';
import { hexKey, hexNeighbors, parseHexKey } from './hex';
import { findRegions, villageOf } from './regions';
import type { Rng } from './rng';
import { treeSpreadChance } from './rules';
import { getTile, type GameState, type PlayerId } from './state';

/** Players that still own at least one hex. */
export function alivePlayers(state: GameState): PlayerId[] {
  const alive = new Set<PlayerId>();
  for (const tile of state.tiles.values()) {
    if (tile.owner !== undefined) alive.add(tile.owner);
  }
  return [...alive].sort((a, b) => a - b);
}

/** The winner is the last player standing. Undefined while several are alive. */
export function winner(state: GameState): PlayerId | undefined {
  const alive = alivePlayers(state);
  return state.players > 1 && alive.length === 1 ? alive[0] : undefined;
}

/** Once per round: graves turn into trees and trees may spread to free neighbours. */
function growNature(state: GameState, rng: Rng): void {
  const trees: string[] = [];
  for (const [key, tile] of state.tiles) {
    if (tile.structure === 'grave') tile.structure = 'tree';
    else if (tile.structure === 'tree') trees.push(key);
  }
  for (const key of trees) {
    if (rng() >= treeSpreadChance) continue;
    const h = parseHexKey(key);
    if (!h) continue;
    const free = hexNeighbors(h).filter((n) => {
      const t = getTile(state, n);
      return t && !t.structure && !t.unit;
    });
    const target = free[Math.floor(rng() * free.length)];
    const tile = target && getTile(state, target);
    if (tile) tile.structure = 'tree';
  }
}

/** Income and upkeep for every province of a player. A province that cannot pay loses all units. */
function startTurn(state: GameState, player: PlayerId): void {
  for (const region of findRegions(state)) {
    if (region.owner !== player) continue;
    const village = villageOf(state, region);
    if (!village) continue;
    const key = hexKey(village);
    const result = settleRegion(state.money.get(key) ?? 0, regionIncome(state, region), regionUpkeep(state, region));
    state.money.set(key, result.money);
    for (const h of region.hexes) {
      const tile = getTile(state, h);
      if (!tile) continue;
      tile.moved = false;
      if (result.starved && tile.unit) {
        delete tile.unit;
        if (!tile.structure) tile.structure = 'grave';
      }
    }
  }
}

/** Passes the turn to the next living player. Does nothing once somebody has won. */
export function endTurn(state: GameState, rng: Rng): void {
  if (winner(state) !== undefined) return;
  const alive = new Set(alivePlayers(state));
  let next = state.currentPlayer;
  for (let i = 0; i < state.players; i++) {
    const wrapped = next + 1 >= state.players;
    next = (next + 1) % state.players;
    if (wrapped) {
      state.turn++;
      growNature(state, rng);
    }
    if (alive.has(next)) break;
  }
  state.currentPlayer = next;
  startTurn(state, next);
}
