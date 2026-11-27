/** Numbers taken over from the original Slay. Change them here only. */

export type UnitKind = 'peasant' | 'spearman' | 'knight' | 'baron';
export type StructureKind = 'village' | 'castle' | 'tree' | 'grave';

export const unitKinds: readonly UnitKind[] = ['peasant', 'spearman', 'knight', 'baron'];

export interface UnitStats {
  /** Strength level, also the defence this unit gives to its own and neighbouring hexes. */
  level: number;
  cost: number;
  upkeep: number;
}

export const unitStats: Readonly<Record<UnitKind, UnitStats>> = {
  peasant: { level: 1, cost: 10, upkeep: 2 },
  spearman: { level: 2, cost: 20, upkeep: 6 },
  knight: { level: 3, cost: 30, upkeep: 18 },
  baron: { level: 4, cost: 40, upkeep: 54 },
};

export const castleCost = 15;
export const castleDefence = 2;
export const villageDefence = 1;

/** Income per owned hex and turn. Hexes with a tree or a grave yield nothing. */
export const incomePerHex = 1;

/** Smallest unit that can be bought from a province's money. */
export const buyableUnits: readonly UnitKind[] = ['peasant', 'spearman', 'knight', 'baron'];

export function structureYieldsIncome(structure: StructureKind | undefined): boolean {
  return structure !== 'tree' && structure !== 'grave';
}

/** Level of the unit that results from merging two units, or undefined if it would exceed a baron. */
export function mergeUnits(a: UnitKind, b: UnitKind): UnitKind | undefined {
  const level = unitStats[a].level + unitStats[b].level;
  return unitKinds.find((k) => unitStats[k].level === level);
}

/** How many steps a unit may walk through its own territory. It may then take one more hex beyond. */
export const moveRange = 4;

/** Chance per tree and round that it spreads to one random free neighbouring hex. */
export const treeSpreadChance = 0.1;
