import { describe, expect, it } from 'vitest';
import { buildCastle, buyUnit, checkMove, moveTargets, moveUnit } from './commands';
import { hexKey } from './hex';
import { findRegions } from './regions';
import { createRng } from './rng';
import { createState, getTile, setTile, type GameState } from './state';
import { alivePlayers, endTurn, winner } from './turn';

const rng = createRng(1);

/** Player 0 owns a row of `length` hexes starting at (0,0) with a village and `money`. */
function row(length = 6, money = 40): GameState {
  const s = createState(9, 2);
  for (let q = 0; q < length; q++) setTile(s, { q, r: 0 }, { owner: 0 });
  setTile(s, { q: 0, r: 0 }, { owner: 0, structure: 'village' });
  s.money.set('0,0', money);
  return s;
}

describe('buying', () => {
  it('buys a unit and pays for it', () => {
    const s = row();
    expect(buyUnit(s, 'knight', { q: 2, r: 0 })).toEqual({ ok: true });
    expect(getTile(s, { q: 2, r: 0 })?.unit).toBe('knight');
    expect(s.money.get('0,0')).toBe(10);
  });
  it('refuses without money, on occupied hexes and on foreign hexes', () => {
    const s = row(6, 25);
    expect(buyUnit(s, 'knight', { q: 2, r: 0 })).toMatchObject({ ok: false });
    expect(buyUnit(s, 'peasant', { q: 0, r: 0 })).toMatchObject({ ok: false });
    buyUnit(s, 'peasant', { q: 2, r: 0 });
    expect(buyUnit(s, 'peasant', { q: 2, r: 0 })).toMatchObject({ ok: false });
    expect(buyUnit(s, 'peasant', { q: 9, r: 0 })).toMatchObject({ ok: false });
  });
  it('clears a tree when a unit is placed on it', () => {
    const s = row();
    setTile(s, { q: 1, r: 0 }, { owner: 0, structure: 'tree' });
    buyUnit(s, 'peasant', { q: 1, r: 0 });
    expect(getTile(s, { q: 1, r: 0 })).toMatchObject({ unit: 'peasant' });
    expect(getTile(s, { q: 1, r: 0 })?.structure).toBeUndefined();
  });
  it('builds a castle for 15', () => {
    const s = row();
    expect(buildCastle(s, { q: 3, r: 0 })).toEqual({ ok: true });
    expect(getTile(s, { q: 3, r: 0 })?.structure).toBe('castle');
    expect(s.money.get('0,0')).toBe(25);
  });
});

describe('moving', () => {
  it('walks four steps inside the own region, not five', () => {
    const s = row(7);
    setTile(s, { q: 0, r: 0 }, { owner: 0, structure: 'village', unit: 'peasant' });
    expect(checkMove(s, { q: 0, r: 0 }, { q: 4, r: 0 })).toMatchObject({ ok: true });
    expect(checkMove(s, { q: 0, r: 0 }, { q: 5, r: 0 })).toMatchObject({ ok: false });
  });
  it('lets a unit move only once per turn', () => {
    const s = row();
    buyUnit(s, 'peasant', { q: 1, r: 0 });
    expect(moveUnit(s, { q: 1, r: 0 }, { q: 2, r: 0 }, rng)).toEqual({ ok: true });
    expect(moveUnit(s, { q: 2, r: 0 }, { q: 3, r: 0 }, rng)).toMatchObject({ ok: false });
  });
  it('combines units and refuses to exceed a baron', () => {
    const s = row();
    buyUnit(s, 'peasant', { q: 1, r: 0 });
    buyUnit(s, 'peasant', { q: 2, r: 0 });
    moveUnit(s, { q: 1, r: 0 }, { q: 2, r: 0 }, rng);
    expect(getTile(s, { q: 2, r: 0 })?.unit).toBe('spearman');
    const b = row();
    setTile(b, { q: 1, r: 0 }, { owner: 0, unit: 'baron' });
    setTile(b, { q: 2, r: 0 }, { owner: 0, unit: 'peasant' });
    expect(checkMove(b, { q: 2, r: 0 }, { q: 1, r: 0 })).toMatchObject({ ok: false });
  });
  it('lists the targets, including the hex beyond the border', () => {
    const s = row(3);
    setTile(s, { q: 3, r: 0 }, {});
    setTile(s, { q: 2, r: 0 }, { owner: 0, unit: 'peasant' });
    const keys = moveTargets(s, { q: 2, r: 0 }).map(hexKey);
    expect(keys).toContain('3,0');
    expect(keys).toContain('0,0');
  });
});

describe('capturing', () => {
  it('takes a neutral hex and removes trees on it', () => {
    const s = row();
    setTile(s, { q: 6, r: 0 }, { structure: 'tree' });
    setTile(s, { q: 5, r: 0 }, { owner: 0, unit: 'peasant' });
    expect(moveUnit(s, { q: 5, r: 0 }, { q: 6, r: 0 }, rng)).toEqual({ ok: true });
    expect(getTile(s, { q: 6, r: 0 })).toMatchObject({ owner: 0, unit: 'peasant' });
    expect(getTile(s, { q: 6, r: 0 })?.structure).toBeUndefined();
  });
  it('is blocked by a stronger neighbour', () => {
    const s = row();
    setTile(s, { q: 6, r: 0 }, { owner: 1 });
    setTile(s, { q: 7, r: 0 }, { owner: 1, unit: 'spearman' });
    setTile(s, { q: 5, r: 0 }, { owner: 0, unit: 'peasant' });
    expect(checkMove(s, { q: 5, r: 0 }, { q: 6, r: 0 })).toMatchObject({ ok: false });
    setTile(s, { q: 5, r: 0 }, { owner: 0, unit: 'knight' });
    expect(checkMove(s, { q: 5, r: 0 }, { q: 6, r: 0 })).toMatchObject({ ok: true });
  });
  it('splits an enemy province, the new part gets a village without money', () => {
    const s = createState(9, 2);
    for (let q = 0; q <= 6; q++) setTile(s, { q, r: 0 }, { owner: 1 });
    setTile(s, { q: 0, r: 0 }, { owner: 1, structure: 'village' });
    s.money.set('0,0', 30);
    for (let q = 1; q <= 4; q++) setTile(s, { q, r: 1 }, { owner: 0 });
    setTile(s, { q: 1, r: 1 }, { owner: 0, structure: 'village' });
    setTile(s, { q: 3, r: 1 }, { owner: 0, unit: 'knight' });
    expect(moveUnit(s, { q: 3, r: 1 }, { q: 3, r: 0 }, rng)).toEqual({ ok: true });

    const enemy = findRegions(s).filter((r) => r.owner === 1);
    expect(enemy).toHaveLength(2);
    expect([...s.money.values()].sort((a, b) => a - b)).toEqual([0, 0, 30]);
    expect(s.money.get('0,0')).toBe(30);
  });
  it('merges own provinces and adds up the money', () => {
    const s = createState(9, 2);
    setTile(s, { q: 0, r: 0 }, { owner: 0, structure: 'village' });
    setTile(s, { q: 1, r: 0 }, { owner: 0, unit: 'knight' });
    setTile(s, { q: 2, r: 0 }, { owner: 1 });
    setTile(s, { q: 3, r: 0 }, { owner: 0 });
    setTile(s, { q: 4, r: 0 }, { owner: 0, structure: 'village' });
    s.money.set('0,0', 10);
    s.money.set('4,0', 5);
    expect(moveUnit(s, { q: 1, r: 0 }, { q: 2, r: 0 }, rng)).toEqual({ ok: true });
    expect([...s.money.entries()]).toEqual([['0,0', 15]]);
    expect(getTile(s, { q: 4, r: 0 })?.structure).toBeUndefined();
  });
  it('destroys a captured village and castle', () => {
    const s = row();
    setTile(s, { q: 6, r: 0 }, { owner: 1, structure: 'castle' });
    setTile(s, { q: 7, r: 0 }, { owner: 1 });
    setTile(s, { q: 5, r: 0 }, { owner: 0, unit: 'baron' });
    moveUnit(s, { q: 5, r: 0 }, { q: 6, r: 0 }, rng);
    expect(getTile(s, { q: 6, r: 0 })?.structure).toBeUndefined();
    expect(getTile(s, { q: 7, r: 0 })?.structure).toBeUndefined();
  });
});

describe('turns', () => {
  function duel(): GameState {
    const s = row(4, 10);
    setTile(s, { q: 0, r: 5 }, { owner: 1, structure: 'village' });
    setTile(s, { q: 1, r: 5 }, { owner: 1 });
    s.money.set('0,5', 0);
    return s;
  }
  it('passes the turn, pays income when the player comes back', () => {
    const s = duel();
    endTurn(s, rng);
    expect(s.currentPlayer).toBe(1);
    expect(s.money.get('0,5')).toBe(2);
    endTurn(s, rng);
    expect(s.currentPlayer).toBe(0);
    expect(s.turn).toBe(2);
    expect(s.money.get('0,0')).toBe(14);
  });
  it('pays upkeep, and kills all units of a province that cannot pay', () => {
    const s = duel();
    setTile(s, { q: 2, r: 0 }, { owner: 0, unit: 'knight' });
    s.money.set('0,0', 3);
    endTurn(s, rng);
    endTurn(s, rng);
    expect(getTile(s, { q: 2, r: 0 })?.unit).toBeUndefined();
    expect(getTile(s, { q: 2, r: 0 })?.structure).toBe('grave');
    expect(s.money.get('0,0')).toBe(0);
  });
  it('lets graves grow into trees once per round', () => {
    const s = duel();
    setTile(s, { q: 2, r: 0 }, { owner: 0, structure: 'grave' });
    endTurn(s, rng);
    expect(getTile(s, { q: 2, r: 0 })?.structure).toBe('grave');
    endTurn(s, rng);
    expect(getTile(s, { q: 2, r: 0 })?.structure).toBe('tree');
  });
  it('resets the moved flag and finds the winner', () => {
    const s = duel();
    buyUnit(s, 'peasant', { q: 1, r: 0 });
    moveUnit(s, { q: 1, r: 0 }, { q: 2, r: 0 }, rng);
    expect(getTile(s, { q: 2, r: 0 })?.moved).toBe(true);
    endTurn(s, rng);
    endTurn(s, rng);
    expect(getTile(s, { q: 2, r: 0 })?.moved).toBe(false);
    expect(winner(s)).toBeUndefined();
    for (const key of ['0,5', '1,5']) s.tiles.delete(key);
    expect(alivePlayers(s)).toEqual([0]);
    expect(winner(s)).toBe(0);
  });
});
