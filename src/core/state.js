export function normalizeEdge(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function createState(level) {
  const solution = new Set(level.edges.map(([a, b]) => normalizeEdge(a, b)));
  return {
    level,
    solution,
    drawn: new Set(),
    history: [],
    startedAt: Date.now(),
    hintsUsed: 0
  };
}

export function tryAddEdge(state, a, b) {
  const edge = normalizeEdge(a, b);
  if (state.drawn.has(edge)) {
    return { status: 'already_drawn', edge };
  }
  if (state.solution.has(edge)) {
    state.drawn.add(edge);
    state.history.push(edge);
    return {
      status: 'correct',
      edge,
      complete: isComplete(state)
    };
  }
  return { status: 'wrong', edge };
}

export function undo(state) {
  const edge = state.history.pop();
  if (edge) {
    state.drawn.delete(edge);
  }
  return edge;
}

export function isComplete(state) {
  return state.drawn.size === state.solution.size;
}

