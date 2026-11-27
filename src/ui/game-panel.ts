import { castleCost, unitKinds, unitStats, type UnitKind } from '../game/rules';
import type { Session } from '../game/session';
import { playerCss } from '../view/colors';

/** Display names, one per unit level. */
const unitNames: Record<UnitKind, string> = {
  peasant: 'Dolchkämpferin',
  spearman: 'Armbrustschützin',
  knight: 'Axtkämpfer',
  baron: 'Baron',
};

const errorTexts: Record<string, string> = {
  'not enough money': 'Nicht genug Geld in dieser Provinz.',
  'select one of your provinces first': 'Wähle zuerst eine Provinz von Dir aus.',
  'hex is defended': 'Das Feld ist zu stark verteidigt.',
  'hex is occupied': 'Auf Gebäuden kann keine Figur stehen.',
  'out of range': 'Zu weit entfernt.',
  'unit already moved': 'Diese Einheit hat sich schon bewegt.',
  'units cannot be combined': 'Diese Einheiten lassen sich nicht kombinieren.',
};

function button(label: string, disabled: boolean, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.disabled = disabled;
  b.style.cssText =
    'display:block;width:100%;margin:3px 0;padding:6px 8px;font:inherit;cursor:pointer;' +
    'border:1px solid #3a4470;border-radius:4px;background:#1b2240;color:#dfe6ff;text-align:left;';
  if (disabled) b.style.opacity = '0.45';
  b.addEventListener('click', onClick);
  return b;
}

/** The side panel with the buttons of the game. It redraws itself on every `update`. */
export function createGamePanel(
  parent: HTMLElement,
  getSession: () => Session,
  onChange: () => void
): { update(): void } {
  const panel = document.createElement('div');
  panel.style.cssText =
    'position:absolute;top:12px;right:16px;width:250px;padding:12px;z-index:2;' +
    'background:rgba(11,14,26,0.85);border:1px solid #2b3358;border-radius:6px;' +
    'color:#dfe6ff;font-size:14px;line-height:20px;user-select:none;';
  parent.appendChild(panel);

  function line(text: string, color?: string): HTMLDivElement {
    const d = document.createElement('div');
    d.textContent = text;
    if (color) d.style.color = color;
    panel.appendChild(d);
    return d;
  }

  function update(): void {
    const session = getSession();
    const state = session.state;
    panel.replaceChildren();

    const head = line(`Runde ${state.turn}: Spieler ${state.currentPlayer + 1} ist dran`);
    head.style.cssText = `font-weight:bold;border-left:10px solid ${playerCss(state.currentPlayer)};padding-left:8px;`;

    if (session.winner !== undefined) {
      line(`Spieler ${session.winner + 1} hat gewonnen!`, '#ffd166');
      return;
    }

    const province = session.province();
    const own = province?.owner === state.currentPlayer;
    if (province) {
      line(`Provinz von Spieler ${province.owner + 1}, ${province.size} Felder`);
      line(`Kasse ${province.money}, Einkommen +${province.income}, Unterhalt −${province.upkeep}`);
    } else {
      line('Klicke eine Einheit oder eine Provinz an.', '#9aa6d6');
    }

    const buy = document.createElement('div');
    buy.style.marginTop = '8px';
    panel.appendChild(buy);
    for (const kind of unitKinds) {
      const { cost, upkeep } = unitStats[kind];
      const label = `${unitNames[kind]}  ${cost} (Unterhalt ${upkeep})`;
      buy.appendChild(
        button(label, !own || (province?.money ?? 0) < cost, () => {
          session.startPlacing(kind);
          onChange();
        })
      );
    }
    buy.appendChild(
      button(`Burg  ${castleCost}`, !own || (province?.money ?? 0) < castleCost, () => {
        session.startPlacing('castle');
        onChange();
      })
    );

    if (session.holding) {
      const what = session.holding === 'castle' ? 'Burg' : unitNames[session.holding];
      line(`${what}: klicke ein grün markiertes Feld.`, '#aaff88').style.marginTop = '6px';
    }
    if (session.error) {
      line(errorTexts[session.error] ?? session.error, '#ff8a70').style.marginTop = '6px';
    }

    const end = button('Runde beenden (Enter)', false, () => {
      session.endTurn();
      onChange();
    });
    end.style.marginTop = '10px';
    end.style.textAlign = 'center';
    panel.appendChild(end);
  }

  return { update };
}
