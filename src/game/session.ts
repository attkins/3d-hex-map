import { buildCastle, buyUnit, checkMove, moveTargets, moveUnit, placementTargets, type MoveKind } from './commands';
import { regionIncome, regionUpkeep } from './economy';
import { hexKey, type Axial } from './hex';
import { regionAt, villageOf } from './regions';
import type { Rng } from './rng';
import { castleCost, unitStats, type UnitKind } from './rules';
import { getTile, type GameState, type PlayerId } from './state';
import { endTurn, winner } from './turn';

export type Highlight = 'selected' | 'place' | MoveKind;
/** What the player has bought and is about to place. */
export type Holding = UnitKind | 'castle';

export interface ProvinceInfo {
  owner: PlayerId;
  village: Axial;
  money: number;
  income: number;
  upkeep: number;
  size: number;
}

/**
 * The state of one running game together with the current selection.
 * The view only calls `click`, `startPlacing` and `endTurn` and reads the getters,
 * so the whole interaction can be tested without a browser.
 */
export class Session {
  readonly state: GameState;
  selected: Axial | undefined;
  holding: Holding | undefined;
  error: string | undefined;
  private readonly rng: Rng;

  constructor(state: GameState, rng: Rng) {
    this.state = state;
    this.rng = rng;
  }

  get winner(): PlayerId | undefined {
    return winner(this.state);
  }

  /** The province of the selected hex, if it has one. */
  province(): ProvinceInfo | undefined {
    if (!this.selected) return undefined;
    const region = regionAt(this.state, this.selected);
    const village = region && villageOf(this.state, region);
    if (!region || !village) return undefined;
    return {
      owner: region.owner,
      village,
      money: this.state.money.get(hexKey(village)) ?? 0,
      income: regionIncome(this.state, region),
      upkeep: regionUpkeep(this.state, region),
      size: region.hexes.length,
    };
  }

  /** True when the selected hex holds a unit of the current player that can still move. */
  private unitSelected(): boolean {
    const tile = this.selected && getTile(this.state, this.selected);
    return Boolean(tile?.unit && tile.owner === this.state.currentPlayer && !tile.moved && this.winner === undefined);
  }

  click(h: Axial): void {
    this.error = undefined;
    if (this.winner !== undefined) return;

    if (this.holding && this.selected) {
      const isTarget = placementTargets(this.state, this.selected, this.holding === 'castle').some(
        (t) => hexKey(t) === hexKey(h)
      );
      if (isTarget) {
        const result = this.holding === 'castle' ? buildCastle(this.state, h) : buyUnit(this.state, this.holding, h);
        if (!result.ok) this.error = result.reason;
        this.holding = undefined;
        return;
      }
      this.holding = undefined;
    }

    if (this.selected && this.unitSelected() && checkMove(this.state, this.selected, h).ok) {
      const result = moveUnit(this.state, this.selected, h, this.rng);
      if (!result.ok) this.error = result.reason;
      this.selected = h;
      return;
    }

    const tile = getTile(this.state, h);
    this.selected = tile?.owner === undefined ? undefined : h;
  }

  /** Starts placing a bought unit or castle in the selected province. */
  startPlacing(what: Holding): void {
    this.error = undefined;
    const province = this.province();
    if (!province || province.owner !== this.state.currentPlayer) {
      this.error = 'select one of your provinces first';
      return;
    }
    const cost = what === 'castle' ? castleCost : unitStats[what].cost;
    if (province.money < cost) {
      this.error = 'not enough money';
      return;
    }
    this.holding = what;
  }

  endTurn(): void {
    this.selected = undefined;
    this.holding = undefined;
    this.error = undefined;
    endTurn(this.state, this.rng);
  }

  /** Hexes to mark on the board, keyed by `hexKey`. */
  highlights(): Map<string, Highlight> {
    const result = new Map<string, Highlight>();
    if (!this.selected) return result;
    result.set(hexKey(this.selected), 'selected');
    if (this.holding) {
      for (const h of placementTargets(this.state, this.selected, this.holding === 'castle')) {
        result.set(hexKey(h), 'place');
      }
    } else if (this.unitSelected()) {
      for (const h of moveTargets(this.state, this.selected)) {
        const check = checkMove(this.state, this.selected, h);
        if (check.ok) result.set(hexKey(h), check.kind);
      }
    }
    return result;
  }
}
