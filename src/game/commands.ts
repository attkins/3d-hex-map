import { canCapture } from './defence';
import { hexKey, hexNeighbors, type Axial } from './hex';
import { normalizeProvinces } from './provinces';
import { regionAt, villageOf } from './regions';
import type { Rng } from './rng';
import { castleCost, mergeUnits, moveRange, unitStats, type UnitKind } from './rules';
import { getTile, type GameState, type Tile } from './state';

export type Failure = { ok: false; reason: string };
export type CommandResult = { ok: true } | Failure;

const ok: CommandResult = { ok: true };
const fail = (reason: string): Failure => ({ ok: false, reason });

/** All commands change the state in place. Clone it first if you need an undo. */

/** A unit that enters a hex destroys a tree or grave there. Buildings are never entered this way. */
function clearsOnEntry(tile: Tile): void {
  if (tile.structure === 'tree' || tile.structure === 'grave') delete tile.structure;
}

interface Placement {
  tile: Tile;
  villageKey: string;
}

function checkPlacement(state: GameState, target: Axial): Placement | Failure {
  const tile = getTile(state, target);
  if (tile?.owner !== state.currentPlayer) return fail('not your hex');
  if (tile.unit) return fail('hex is occupied');
  if (tile.structure === 'village' || tile.structure === 'castle') return fail('hex is occupied');
  const region = regionAt(state, target);
  const village = region && villageOf(state, region);
  if (!village) return fail('no province');
  return { tile, villageKey: hexKey(village) };
}

function isFail(p: Placement | Failure): p is Failure {
  return 'reason' in p;
}

/** Buys a unit for the province that contains `target`. */
export function buyUnit(state: GameState, kind: UnitKind, target: Axial): CommandResult {
  const p = checkPlacement(state, target);
  if (isFail(p)) return p;
  const money = state.money.get(p.villageKey) ?? 0;
  const cost = unitStats[kind].cost;
  if (money < cost) return fail('not enough money');
  state.money.set(p.villageKey, money - cost);
  clearsOnEntry(p.tile);
  p.tile.unit = kind;
  p.tile.moved = false;
  return ok;
}

/** Builds a castle on an empty own hex. */
export function buildCastle(state: GameState, target: Axial): CommandResult {
  const p = checkPlacement(state, target);
  if (isFail(p)) return p;
  if (p.tile.structure) return fail('hex is occupied');
  const money = state.money.get(p.villageKey) ?? 0;
  if (money < castleCost) return fail('not enough money');
  state.money.set(p.villageKey, money - castleCost);
  p.tile.structure = 'castle';
  return ok;
}

export type MoveKind = 'move' | 'merge' | 'capture';

/** Steps to every own hex that the unit can walk to, keyed by hex. The start hex has 0. */
function walkDistances(state: GameState, from: Axial): Map<string, number> {
  const owner = getTile(state, from)?.owner;
  const dist = new Map<string, number>([[hexKey(from), 0]]);
  let frontier: Axial[] = [from];
  for (let step = 1; step <= moveRange; step++) {
    const next: Axial[] = [];
    for (const h of frontier) {
      for (const n of hexNeighbors(h)) {
        const k = hexKey(n);
        if (dist.has(k) || getTile(state, n)?.owner !== owner) continue;
        dist.set(k, step);
        next.push(n);
      }
    }
    frontier = next;
  }
  return dist;
}

/** Checks a move without changing anything. */
export function checkMove(state: GameState, from: Axial, to: Axial): { ok: true; kind: MoveKind } | Failure {
  const src = getTile(state, from);
  if (!src?.unit || src.owner !== state.currentPlayer) return fail('no unit of yours there');
  if (src.moved) return fail('unit already moved');
  const dst = getTile(state, to);
  if (!dst) return fail('no land there');
  if (hexKey(from) === hexKey(to)) return fail('same hex');

  const dist = walkDistances(state, from);
  if (dst.owner === state.currentPlayer) {
    if (!dist.has(hexKey(to))) return fail('out of range');
    if (dst.structure === 'village' || dst.structure === 'castle') return fail('hex is occupied');
    if (!dst.unit) return { ok: true, kind: 'move' };
    return mergeUnits(src.unit, dst.unit) ? { ok: true, kind: 'merge' } : fail('units cannot be combined');
  }

  const reachable = hexNeighbors(to).some((n) => {
    const d = dist.get(hexKey(n));
    return d !== undefined && d < moveRange;
  });
  if (!reachable) return fail('out of range');
  if (!canCapture(state, unitStats[src.unit].level, to)) return fail('hex is defended');
  return { ok: true, kind: 'capture' };
}

/** All hexes the unit on `from` may move to right now. */
export function moveTargets(state: GameState, from: Axial): Axial[] {
  const result: Axial[] = [];
  const seen = new Set<string>();
  const consider = (h: Axial): void => {
    const k = hexKey(h);
    if (seen.has(k)) return;
    seen.add(k);
    if (checkMove(state, from, h).ok) result.push(h);
  };
  for (const k of walkDistances(state, from).keys()) {
    const [q, r] = k.split(',').map(Number);
    if (q === undefined || r === undefined) continue;
    consider({ q, r });
    for (const n of hexNeighbors({ q, r })) consider(n);
  }
  return result;
}

export function moveUnit(state: GameState, from: Axial, to: Axial, rng: Rng): CommandResult {
  const check = checkMove(state, from, to);
  if (!check.ok) return check;
  const src = getTile(state, from);
  const dst = getTile(state, to);
  if (!src?.unit || !dst) return fail('invalid hex');
  const unit = src.unit;

  if (check.kind === 'merge') {
    const merged = dst.unit && mergeUnits(unit, dst.unit);
    if (!merged) return fail('units cannot be combined');
    dst.unit = merged;
    dst.moved = Boolean(dst.moved) || Boolean(src.moved);
  } else {
    dst.unit = unit;
    dst.moved = true;
    if (check.kind === 'move') {
      clearsOnEntry(dst);
    } else {
      dst.owner = state.currentPlayer;
      delete dst.structure;
    }
  }
  delete src.unit;
  delete src.moved;
  if (check.kind === 'capture') normalizeProvinces(state, rng);
  return ok;
}

/** Hexes where a bought unit or a castle can be placed, in the province that contains `from`. */
export function placementTargets(state: GameState, from: Axial, castle: boolean): Axial[] {
  const region = regionAt(state, from);
  if (region?.owner !== state.currentPlayer) return [];
  return region.hexes.filter((h) => {
    const t = getTile(state, h);
    if (!t || t.unit || t.structure === 'village' || t.structure === 'castle') return false;
    return !castle || !t.structure;
  });
}
