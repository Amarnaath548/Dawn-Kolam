import { expand, expandEdge } from './symmetry.js';
import { checkDeadEndPenalty, validateSingleStrokeLoop } from './progression.js';

export function normalizeEdge(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function createState(level) {
  const solution = expand(level.edges, level.symmetry || 'none', level.grid);
  return {
    level,
    solution,
    drawn: new Set(),
    history: [], // each entry is an array of edges added in that move
    startedAt: Date.now(),
    hintsUsed: 0,
    penalties: 0,
    lastVertex: null
  };
}

export function tryAddEdge(state, a, b) {
  const edge = normalizeEdge(a, b);
  if (state.drawn.has(edge)) {
    return { status: 'already_drawn', edge };
  }
  if (state.solution.has(edge)) {
    const group = expandEdge([a, b], state.level.symmetry || 'none', state.level.grid);
    const added = [];
    for (const e of group) {
      if (!state.drawn.has(e)) {
        state.drawn.add(e);
        added.push(e);
      }
    }
    state.history.push(added);
    state.lastVertex = b;

    const complete = isComplete(state);

    // World 2 mechanic: Dead-end penalty check
    if (!complete && state.level.mechanics && state.level.mechanics.includes('dead_end_check')) {
      const deadEnd = checkDeadEndPenalty(b, state.drawn, state.solution);
      if (deadEnd.deadEnd) {
        state.penalties += 1;
        return {
          status: 'dead_end',
          edge,
          added,
          stuckAt: b,
          complete: false
        };
      }
    }

    // World 1 mechanic: Single-stroke continuous loop check
    let strokeValid = true;
    if (complete && state.level.mechanics && state.level.mechanics.includes('single_stroke')) {
      const loopCheck = validateSingleStrokeLoop(state.drawn, true);
      strokeValid = loopCheck.valid;
    }

    return {
      status: 'correct',
      edge,
      added,
      strokeValid,
      complete
    };
  }
  return { status: 'wrong', edge };
}

export function undo(state) {
  const edges = state.history.pop();
  if (edges) {
    for (const edge of edges) {
      state.drawn.delete(edge);
    }
  }
  return edges;
}

export function restart(state) {
  state.drawn.clear();
  state.history = [];
}

export function isComplete(state) {
  return state.drawn.size === state.solution.size;
}


