import { describe, expect, it } from 'vitest';
import { defenceAt, canCapture } from './defence';
import { regionIncome, regionUpkeep, settleRegion } from './economy';
import { hexCount, hexDistance, hexesInRadius, hexNeighbors } from './hex';
import { findRegions } from './regions';
import { createRng } from './rng';
import { mergeUnits, unitStats } from './rules';
import { createState, setTile } from './state';

describe('hex', () => {
  it('has six neighbours at distance 1', () => {
    const n = hexNeighbors({ q: 2, r: -1 });
    expect(n).toHaveLength(6);
    for (const h of n) expect(hexDistance({ q: 2, r: -1 }, h)).toBe(1);
  });
  it('counts hexes of a radius', () => {
    expect(hexesInRadius(9)).toHaveLength(hexCount(9));
  });
});

describe('rng', () => {
  it('is reproducible', () => {
    expect(createRng(7)()).toBe(createRng(7)());
    expect(createRng(7)()).not.toBe(createRng(8)());
  });
});

describe('rules', () => {
  it('uses the original prices and upkeep', () => {
    expect(unitStats.peasant).toMatchObject({ cost: 10, upkeep: 2 });
    expect(unitStats.spearman).toMatchObject({ cost: 20, upkeep: 6 });
    expect(unitStats.knight).toMatchObject({ cost: 30, upkeep: 18 });
    expect(unitStats.baron).toMatchObject({ cost: 40, upkeep: 54 });
  });
  it('merges units by level', () => {
    expect(mergeUnits('peasant', 'peasant')).toBe('spearman');
    expect(mergeUnits('spearman', 'peasant')).toBe('knight');
    expect(mergeUnits('knight', 'peasant')).toBe('baron');
    expect(mergeUnits('spearman', 'spearman')).toBe('baron');
    expect(mergeUnits('baron', 'peasant')).toBeUndefined();
  });
});

describe('regions and economy', () => {
  function board() {
    const s = createState(3, 2);
    setTile(s, { q: 0, r: 0 }, { owner: 0, structure: 'village' });
    setTile(s, { q: 1, r: 0 }, { owner: 0, unit: 'spearman' });
    setTile(s, { q: 2, r: 0 }, { owner: 0, structure: 'tree' });
    setTile(s, { q: -2, r: 0 }, { owner: 0 });
    setTile(s, { q: 0, r: 1 }, { owner: 1, structure: 'village' });
    return s;
  }
  it('splits by owner and connectivity', () => {
    const regions = findRegions(board());
    expect(regions).toHaveLength(3);
    expect(regions.map((r) => r.hexes.length).sort()).toEqual([1, 1, 3]);
  });
  it('counts income without trees and upkeep of units', () => {
    const s = board();
    const main = findRegions(s).find((r) => r.hexes.length === 3);
    expect(main).toBeDefined();
    if (!main) return;
    expect(regionIncome(s, main)).toBe(2);
    expect(regionUpkeep(s, main)).toBe(6);
  });
  it('starves when money cannot cover upkeep', () => {
    expect(settleRegion(10, 2, 6)).toEqual({ money: 6, starved: false });
    expect(settleRegion(3, 2, 6)).toEqual({ money: 0, starved: true });
  });
});

describe('defence', () => {
  it('shares defence with same-owner neighbours', () => {
    const s = createState(3, 2);
    setTile(s, { q: 0, r: 0 }, { owner: 0, unit: 'knight' });
    setTile(s, { q: 1, r: 0 }, { owner: 0 });
    setTile(s, { q: 0, r: 1 }, { owner: 1 });
    expect(defenceAt(s, { q: 1, r: 0 })).toBe(3);
    expect(defenceAt(s, { q: 0, r: 1 })).toBe(0);
    expect(canCapture(s, 3, { q: 1, r: 0 })).toBe(false);
    expect(canCapture(s, 4, { q: 1, r: 0 })).toBe(true);
  });
  it('gives villages 1 and castles 2', () => {
    const s = createState(3, 1);
    setTile(s, { q: 0, r: 0 }, { owner: 0, structure: 'village' });
    setTile(s, { q: 3, r: 0 }, { owner: 0, structure: 'castle' });
    expect(defenceAt(s, { q: 0, r: 0 })).toBe(1);
    expect(defenceAt(s, { q: 3, r: 0 })).toBe(2);
  });
});
