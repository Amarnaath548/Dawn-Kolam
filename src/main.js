import levels from './levels/levels.json';
import { getActiveDots, isNeighbor } from './core/board.js';
import { createState, tryAddEdge, isComplete } from './core/state.js';
import { createRenderer } from './view/renderer.js';
import { setupInput } from './view/input.js';

const level = levels[0];
const dots = getActiveDots(level);
const activeKeys = new Set(dots.map(d => d.key));
const state = createState(level);

const svg = document.getElementById('kolam-board');
const titleEl = document.getElementById('level-title');
const statusEl = document.getElementById('status-text');

titleEl.textContent = `${level.name} (${level.nameTa})`;

const renderer = createRenderer(svg, dots);
if (level.guide) {
  renderer.renderGuide(state.solution);
}

setupInput({
  svg,
  dots,
  isNeighbor: (a, b) => isNeighbor(a, b, activeKeys),
  onAttemptEdge: (fromKey, toKey) => {
    const result = tryAddEdge(state, fromKey, toKey);
    if (result.status === 'correct') {
      renderer.renderDrawn(state.drawn);
      if (result.complete) {
        statusEl.textContent = 'Completed!';
      } else {
        statusEl.textContent = `${state.drawn.size} / ${state.solution.size} edges`;
      }
    } else if (result.status === 'wrong') {
      renderer.showWrongFeedback(fromKey, toKey);
    }
  },
  onPreviewUpdate: (fromKey, pointerPt) => {
    if (!fromKey || !pointerPt) {
      renderer.setPreview(null, null);
      dots.forEach(d => renderer.highlightDot(d.key, false));
      return;
    }
    const fromDot = renderer.dotMap.get(fromKey);
    renderer.setPreview(fromDot, pointerPt);
    dots.forEach(d => renderer.highlightDot(d.key, d.key === fromKey));
  }
});

