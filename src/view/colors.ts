/** One color per player, bright and saturated for a comic look. The whole tile of an owned hex gets this color. */
export const PLAYER_COLORS = [0xe84a4a, 0x3f86e8, 0xf0c52e, 0x48c260, 0x9c5fd8, 0xf08a2e];

export function playerColor(player: number): number {
  return PLAYER_COLORS[player % PLAYER_COLORS.length] ?? 0xffffff;
}

export function playerCss(player: number): string {
  return `#${playerColor(player).toString(16).padStart(6, '0')}`;
}
