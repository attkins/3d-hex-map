import { describe, expect, it } from 'vitest';
import { generateMap } from './generator';
import { findRegions } from './regions';
import { alivePlayers } from './turn';

const options = { boardRadius: 9, players: 4, seed: 42 };

function ownedBy(state: ReturnType<typeof generateMap>, player: number): number {
  return [...state.tiles.values()].filter((t) => t.owner === player).length;
}

describe('generateMap', () => {
  it('is reproducible and varies with the seed', () => {
    const a = generateMap(options);
    const b = generateMap(options);
    const c = generateMap({ ...options, seed: 43 });
    expect([...a.tiles.entries()]).toEqual([...b.tiles.entries()]);
    expect([...a.tiles.keys()]).not.toEqual([...c.tiles.keys()]);
  });

  it('creates the requested share of land', () => {
    const s = generateMap({ ...options, landRatio: 0.5 });
    expect(s.tiles.size).toBe(Math.round(271 * 0.5));
  });

  it('splits the land evenly between all players', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = generateMap({ ...options, seed });
      expect(alivePlayers(s)).toEqual([0, 1, 2, 3]);
      const sizes = [0, 1, 2, 3].map((p) => ownedBy(s, p));
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    }
  });

  it('gives every province of two or more hexes one village and the start money', () => {
    const s = generateMap({ ...options, startMoney: 12 });
    for (const region of findRegions(s)) {
      const villages = region.hexes.filter((h) => s.tiles.get(`${h.q},${h.r}`)?.structure === 'village');
      expect(villages).toHaveLength(region.hexes.length >= 2 ? 1 : 0);
      const [v] = villages;
      if (v) expect(s.money.get(`${v.q},${v.r}`)).toBe(12);
    }
  });

  it('keeps all hexes inside the board and works for two players', () => {
    const s = generateMap({ boardRadius: 4, players: 2, seed: 5 });
    for (const key of s.tiles.keys()) {
      const [q = 0, r = 0] = key.split(',').map(Number);
      expect(Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r))).toBeLessThanOrEqual(4);
    }
    expect(alivePlayers(s)).toEqual([0, 1]);
  });
});
