import { describe, expect, it } from 'vitest';
import { hexKey } from './hex';
import { createRng } from './rng';
import { Session } from './session';
import { createState, getTile, setTile, type GameState } from './state';

function board(): GameState {
  const s = createState(9, 2);
  for (let q = 0; q < 6; q++) setTile(s, { q, r: 0 }, { owner: 0 });
  setTile(s, { q: 0, r: 0 }, { owner: 0, structure: 'village' });
  setTile(s, { q: 2, r: 0 }, { owner: 0, unit: 'peasant' });
  setTile(s, { q: 6, r: 0 }, {});
  for (let q = 0; q < 3; q++) setTile(s, { q, r: 5 }, { owner: 1 });
  setTile(s, { q: 0, r: 5 }, { owner: 1, structure: 'village' });
  s.money.set('0,0', 30);
  s.money.set('0,5', 0);
  return s;
}

const session = (): Session => new Session(board(), createRng(1));

describe('Session', () => {
  it('selects a unit and marks where it can go', () => {
    const s = session();
    s.click({ q: 2, r: 0 });
    const marks = s.highlights();
    expect(marks.get('2,0')).toBe('selected');
    expect(marks.get('4,0')).toBe('move');
    expect(marks.get('6,0')).toBe('capture');
    expect(marks.has('0,5')).toBe(false);
  });

  it('moves the unit with a second click and ends with the target selected', () => {
    const s = session();
    s.click({ q: 2, r: 0 });
    s.click({ q: 6, r: 0 });
    expect(getTile(s.state, { q: 6, r: 0 })).toMatchObject({ owner: 0, unit: 'peasant' });
    expect(getTile(s.state, { q: 2, r: 0 })?.unit).toBeUndefined();
    expect(s.selected).toEqual({ q: 6, r: 0 });
  });

  it('selects a province and shows its numbers', () => {
    const s = session();
    s.click({ q: 1, r: 0 });
    expect(s.province()).toMatchObject({ owner: 0, money: 30, income: 6, upkeep: 2, size: 6 });
  });

  it('buys a unit: choose it, then click a free hex of the province', () => {
    const s = session();
    s.click({ q: 1, r: 0 });
    s.startPlacing('spearman');
    expect(s.highlights().get('3,0')).toBe('place');
    s.click({ q: 3, r: 0 });
    expect(getTile(s.state, { q: 3, r: 0 })?.unit).toBe('spearman');
    expect(s.state.money.get('0,0')).toBe(10);
    expect(s.holding).toBeUndefined();
  });

  it('refuses to buy without money or in a foreign province', () => {
    const s = session();
    s.click({ q: 1, r: 0 });
    s.startPlacing('baron');
    expect(s.error).toBe('not enough money');
    expect(s.holding).toBeUndefined();
    s.click({ q: 1, r: 5 });
    s.startPlacing('peasant');
    expect(s.error).toBe('select one of your provinces first');
  });

  it('cancels placing when a non-target hex is clicked', () => {
    const s = session();
    s.click({ q: 1, r: 0 });
    s.startPlacing('peasant');
    s.click({ q: 1, r: 5 });
    expect(s.holding).toBeUndefined();
    expect(s.selected).toEqual({ q: 1, r: 5 });
  });

  it('builds a castle', () => {
    const s = session();
    s.click({ q: 1, r: 0 });
    s.startPlacing('castle');
    s.click({ q: 4, r: 0 });
    expect(getTile(s.state, { q: 4, r: 0 })?.structure).toBe('castle');
  });

  it('clears the selection when the player clicks the sea, and on end of turn', () => {
    const s = session();
    s.click({ q: 1, r: 0 });
    s.click({ q: 9, r: 9 });
    expect(s.selected).toBeUndefined();
    s.click({ q: 1, r: 0 });
    s.endTurn();
    expect(s.selected).toBeUndefined();
    expect(s.state.currentPlayer).toBe(1);
  });

  it('does not let a player move the units of somebody else', () => {
    const s = session();
    setTile(s.state, { q: 1, r: 5 }, { owner: 1, unit: 'knight' });
    s.click({ q: 1, r: 5 });
    expect([...s.highlights().keys()]).toEqual([hexKey({ q: 1, r: 5 })]);
  });
});
