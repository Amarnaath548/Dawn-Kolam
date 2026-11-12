export function getActiveDots(level) {
  const { grid, mask } = level;
  const dots = [];
  const pad = 15;
  const step = grid > 1 ? (100 - 2 * pad) / (grid - 1) : 0;
  const c0 = (grid - 1) / 2;
  const maxDist = c0;

  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      if (mask === 'diamond') {
        const dist = Math.abs(r - c0) + Math.abs(c - c0);
        if (dist > maxDist) continue;
      }
      const key = `${r},${c}`;
      dots.push({
        key,
        row: r,
        col: c,
        x: pad + c * step,
        y: pad + r * step
      });
    }
  }
  return dots;
}

export function isNeighbor(keyA, keyB, activeKeys) {
  if (!keyA || !keyB || keyA === keyB) return false;
  if (activeKeys && (!activeKeys.has(keyA) || !activeKeys.has(keyB))) return false;
  const [r1, c1] = keyA.split(',').map(Number);
  const [r2, c2] = keyB.split(',').map(Number);
  const dr = Math.abs(r1 - r2);
  const dc = Math.abs(c1 - c2);
  // Allow immediate neighbors and connecting across an intermediate/middle dot
  return dr <= 3 && dc <= 3 && (dr + dc > 0);
}

