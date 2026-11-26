import { hexNeighbors, type Axial } from './hex';
import { castleDefence, unitStats, villageDefence } from './rules';
import { getTile, type GameState, type Tile } from './state';

function ownDefence(tile: Tile): number {
  let d = 0;
  if (tile.unit) d = Math.max(d, unitStats[tile.unit].level);
  if (tile.structure === 'castle') d = Math.max(d, castleDefence);
  if (tile.structure === 'village') d = Math.max(d, villageDefence);
  return d;
}

/** Defence of a hex: the best of its own content and its same-owner neighbours. 0 for sea. */
export function defenceAt(state: GameState, h: Axial): number {
  const tile = getTile(state, h);
  if (!tile) return 0;
  let d = ownDefence(tile);
  if (tile.owner === undefined) return d;
  for (const n of hexNeighbors(h)) {
    const nt = getTile(state, n);
    if (nt?.owner === tile.owner) d = Math.max(d, ownDefence(nt));
  }
  return d;
}

/** A unit can take a hex if its level is higher than the hex's defence. */
export function canCapture(state: GameState, attackerLevel: number, target: Axial): boolean {
  return attackerLevel > defenceAt(state, target);
}
