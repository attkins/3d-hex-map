import { hexKey, type Axial } from './hex';
import type { StructureKind, UnitKind } from './rules';

export type PlayerId = number;

export interface Tile {
  /** Undefined means sea or unowned land that nobody has claimed. */
  owner?: PlayerId;
  structure?: StructureKind;
  unit?: UnitKind;
  /** Set once a unit moved or acted this turn. */
  moved?: boolean;
}

export interface GameState {
  boardRadius: number;
  /** Land tiles only, keyed by `hexKey`. Sea has no entry. */
  tiles: Map<string, Tile>;
  /** Money per province, keyed by the `hexKey` of its village hex. */
  money: Map<string, number>;
  players: number;
  currentPlayer: PlayerId;
  turn: number;
}

export function createState(boardRadius: number, players: number): GameState {
  return {
    boardRadius,
    tiles: new Map(),
    money: new Map(),
    players,
    currentPlayer: 0,
    turn: 1,
  };
}

export function getTile(state: GameState, h: Axial): Tile | undefined {
  return state.tiles.get(hexKey(h));
}

export function setTile(state: GameState, h: Axial, tile: Tile): void {
  state.tiles.set(hexKey(h), tile);
}
