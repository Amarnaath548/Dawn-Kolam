import { normalizeEdge } from './state.js';

export function mirrorX(dotKey, grid) {
  const [r, c] = dotKey.split(',').map(Number);
  return `${r},${grid - 1 - c}`;
}

export function mirrorY(dotKey, grid) {
  const [r, c] = dotKey.split(',').map(Number);
  return `${grid - 1 - r},${c}`;
}

export function expandEdge(edge, mode, grid) {
  const [a, b] = Array.isArray(edge) ? edge : edge.split(':');
  const set = new Set();
  set.add(normalizeEdge(a, b));

  if (mode === 'mirror' || mode === 'mirrorX') {
    set.add(normalizeEdge(mirrorX(a, grid), mirrorX(b, grid)));
  } else if (mode === 'mirrorY') {
    set.add(normalizeEdge(mirrorY(a, grid), mirrorY(b, grid)));
  } else if (mode === 'mirror4') {
    const aX = mirrorX(a, grid), bX = mirrorX(b, grid);
    const aY = mirrorY(a, grid), bY = mirrorY(b, grid);
    const aXY = mirrorY(aX, grid), bXY = mirrorY(bX, grid);

    set.add(normalizeEdge(aX, bX));
    set.add(normalizeEdge(aY, bY));
    set.add(normalizeEdge(aXY, bXY));
  }

  return Array.from(set);
}

export function expand(edges, mode, grid) {
  const result = new Set();
  for (const edge of edges) {
    const expanded = expandEdge(edge, mode, grid);
    for (const e of expanded) {
      result.add(e);
    }
  }
  return result;
}
