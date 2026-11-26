import { type Region } from './regions';
import { incomePerHex, structureYieldsIncome, unitStats } from './rules';
import { getTile, type GameState } from './state';

export function regionIncome(state: GameState, region: Region): number {
  let sum = 0;
  for (const h of region.hexes) {
    if (structureYieldsIncome(getTile(state, h)?.structure)) sum += incomePerHex;
  }
  return sum;
}

export function regionUpkeep(state: GameState, region: Region): number {
  let sum = 0;
  for (const h of region.hexes) {
    const unit = getTile(state, h)?.unit;
    if (unit) sum += unitStats[unit].upkeep;
  }
  return sum;
}

/**
 * Result of one turn change for a region: income is added, then upkeep paid.
 * If the money cannot cover the upkeep, all units of the region die and the balance drops to 0.
 */
export function settleRegion(money: number, income: number, upkeep: number): { money: number; starved: boolean } {
  const balance = money + income - upkeep;
  return balance < 0 ? { money: 0, starved: true } : { money: balance, starved: false };
}
