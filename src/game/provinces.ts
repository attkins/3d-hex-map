import { hexKey } from './hex';
import { findRegions } from './regions';
import type { Rng } from './rng';
import { getTile, type GameState } from './state';

/**
 * Brings villages and money back in line with the current ownership.
 * Call it after every change of ownership.
 *
 * - A region with a single hex has no village and no money.
 * - A region without a village gets a new one with 0 money (a split part).
 * - A region with several villages keeps the richest one and sums up the money (a merge).
 */
export function normalizeProvinces(state: GameState, rng: Rng): void {
  const oldMoney = state.money;
  const newMoney = new Map<string, number>();

  for (const region of findRegions(state)) {
    const villages = region.hexes.filter((h) => getTile(state, h)?.structure === 'village');

    if (region.hexes.length < 2) {
      for (const v of villages) delete getTile(state, v)?.structure;
      continue;
    }

    let total = 0;
    let keep = villages[0];
    for (const v of villages) {
      const m = oldMoney.get(hexKey(v)) ?? 0;
      total += m;
      if (keep && m > (oldMoney.get(hexKey(keep)) ?? 0)) keep = v;
    }
    for (const v of villages) {
      if (v !== keep) delete getTile(state, v)?.structure;
    }

    if (!keep) {
      const free = region.hexes.filter((h) => {
        const t = getTile(state, h);
        return t && !t.unit && !t.structure;
      });
      const fallback = region.hexes.filter((h) => {
        const t = getTile(state, h);
        return t && !t.unit && t.structure !== 'castle';
      });
      const pool = free.length > 0 ? free : fallback.length > 0 ? fallback : region.hexes;
      keep = pool[Math.floor(rng() * pool.length)];
      const tile = keep && getTile(state, keep);
      if (tile) tile.structure = 'village';
    }
    if (keep) newMoney.set(hexKey(keep), total);
  }
  state.money = newMoney;
}
