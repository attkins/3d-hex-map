export type Hex = {
  q: number;
  r: number;
  s: number;
};

export function cube(q: number, r: number): Hex {
  return { q, r, s: -q - r };
}

export function neighbors(hex: Hex): Hex[] {
  const dirs = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ];
  return dirs.map((d) => cube(hex.q + d.q, hex.r + d.r));
}
