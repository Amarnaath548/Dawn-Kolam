import { getActiveDots, isNeighbor } from '../core/board.js';
import { createState, tryAddEdge, undo, restart } from '../core/state.js';
import { createRenderer } from '../view/renderer.js';
import { setupInput } from '../view/input.js';
import {
  markLevelCompleted,
  isLevelCompleted,
  isLevelUnlocked
} from '../core/storage.js';

const HINT_DELAY_MS = 20000;

export function createScreenManager(container, levels) {
  let currentScreen = null;
  let cleanupCurrent = null;

  function show(screenName, params = {}) {
    if (cleanupCurrent) {
      cleanupCurrent();
      cleanupCurrent = null;
    }
    currentScreen = screenName;
    container.innerHTML = '';

    if (screenName === 'menu') {
      renderMenu();
    } else if (screenName === 'select') {
      renderLevelSelect();
    } else if (screenName === 'play') {
      renderPlay(params.levelIndex ?? 0);
    } else if (screenName === 'complete') {
      renderLevelComplete(params.levelIndex ?? 0, params.meta ?? {});
    }
  }

  function renderMenu() {
    container.innerHTML = `
      <div class="screen menu-screen">
        <div class="header">
          <h1>Kolam Puzzle</h1>
          <p class="menu-subtitle">Traditional Indian dot grid puzzle</p>
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 220px;">
          <button id="menu-btn-play" class="btn-primary" type="button">Play</button>
          <button id="menu-btn-select" class="btn-secondary" type="button">Level Select</button>
        </div>
      </div>
    `;

    container.querySelector('#menu-btn-play').addEventListener('click', () => {
      const firstUncompleted = levels.findIndex(lvl => !isLevelCompleted(lvl.id));
      const targetIndex = firstUncompleted === -1 ? 0 : firstUncompleted;
      show('play', { levelIndex: targetIndex });
    });

    container.querySelector('#menu-btn-select').addEventListener('click', () => {
      show('select');
    });
  }

  function renderLevelSelect() {
    const listHtml = levels.map((lvl, index) => {
      const completed = isLevelCompleted(lvl.id);
      const unlocked = isLevelUnlocked(lvl.id, levels);
      const statusClass = completed ? 'completed' : unlocked ? 'available' : 'locked';
      const badgeText = completed ? '✓ Done' : unlocked ? 'Play' : '🔒 Locked';
      const badgeClass = completed ? 'badge-completed' : unlocked ? 'badge-play' : 'badge-locked';

      return `
        <div class="level-card ${statusClass}" data-index="${index}" role="button" tabindex="${unlocked ? 0 : -1}">
          <div class="level-info">
            <span class="level-card-title">${index + 1}. ${lvl.name}</span>
            <span class="level-card-sub">${lvl.nameTa || ''}</span>
          </div>
          <span class="level-badge ${badgeClass}">${badgeText}</span>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="screen level-select-screen">
        <div class="screen-header">
          <button id="select-btn-back" class="btn-icon" type="button">← Back</button>
          <h2>Select Level</h2>
          <div style="width: 48px;"></div>
        </div>
        <div class="level-list">
          ${listHtml}
        </div>
      </div>
    `;

    container.querySelector('#select-btn-back').addEventListener('click', () => {
      show('menu');
    });

    container.querySelectorAll('.level-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.index, 10);
        const lvl = levels[idx];
        if (lvl && isLevelUnlocked(lvl.id, levels)) {
          show('play', { levelIndex: idx });
        }
      });
    });
  }

  function renderPlay(levelIndex) {
    const level = levels[levelIndex];
    if (!level) {
      show('select');
      return;
    }

    const dots = getActiveDots(level);
    const activeKeys = new Set(dots.map(d => d.key));
    const state = createState(level);

    container.innerHTML = `
      <div class="screen play-screen">
        <div class="screen-header" style="margin-bottom: 8px;">
          <button id="play-btn-back" class="btn-icon" type="button">← Levels</button>
          <h2 style="font-size: 1.1rem;">${level.name} (${level.nameTa || ''})</h2>
          <div style="width: 48px;"></div>
        </div>
        <div class="header" style="margin-bottom: 8px;">
          <div id="status-text" class="status">${state.drawn.size} / ${state.solution.size} edges</div>
          <div class="controls">
            <button id="btn-undo" type="button">Undo</button>
            <button id="btn-restart" type="button">Restart</button>
          </div>
        </div>
        <div class="board-container">
          <svg id="kolam-board" viewBox="0 0 100 100"></svg>
        </div>
      </div>
    `;

    const svg = container.querySelector('#kolam-board');
    const statusEl = container.querySelector('#status-text');
    const btnUndo = container.querySelector('#btn-undo');
    const btnRestart = container.querySelector('#btn-restart');
    const btnBack = container.querySelector('#play-btn-back');

    btnBack.addEventListener('click', () => {
      show('select');
    });

    const renderer = createRenderer(svg, dots);
    if (level.guide) {
      renderer.renderGuide(state.solution);
    }

    function updateProgress(isDone = false) {
      if (isDone) {
        statusEl.textContent = 'Completed!';
      } else {
        statusEl.textContent = `${state.drawn.size} / ${state.solution.size} edges`;
      }
    }

    let hintTimer = null;
    let currentHint = null;

    function clearHintTimer() {
      if (hintTimer) {
        clearTimeout(hintTimer);
        hintTimer = null;
      }
      if (currentHint) {
        currentHint = null;
        renderer.clearHint();
      }
    }

    function resetHintTimer() {
      clearHintTimer();
      hintTimer = setTimeout(triggerHint, HINT_DELAY_MS);
    }

    function triggerHint() {
      const remaining = [];
      for (const edge of state.solution) {
        if (!state.drawn.has(edge)) {
          remaining.push(edge);
        }
      }
      if (remaining.length > 0) {
        currentHint = remaining[0];
        state.hintsUsed = (state.hintsUsed || 0) + 1;
        renderer.showHint(currentHint);
      }
    }

    resetHintTimer();

    btnUndo?.addEventListener('click', () => {
      undo(state);
      renderer.renderDrawn(state.drawn);
      updateProgress(false);
      resetHintTimer();
    });

    btnRestart?.addEventListener('click', () => {
      restart(state);
      renderer.renderDrawn(state.drawn);
      updateProgress(false);
      resetHintTimer();
    });

    let isFinished = false;

    const cleanupInput = setupInput({
      svg,
      dots,
      isNeighbor: (a, b) => isNeighbor(a, b, activeKeys),
      onAttemptEdge: (fromKey, toKey) => {
        if (isFinished) return;
        const result = tryAddEdge(state, fromKey, toKey);
        if (result.status === 'correct') {
          renderer.renderDrawn(state.drawn);
          if (result.complete) {
            isFinished = true;
            clearHintTimer();
            updateProgress(true);
            const elapsed = Math.max(1, Math.round((Date.now() - state.startedAt) / 1000));
            markLevelCompleted(level.id, {
              time: elapsed,
              hints: state.hintsUsed || 0
            });
            setTimeout(() => {
              renderer.playCompletion(state.drawn, () => {
                show('complete', {
                  levelIndex,
                  meta: { time: elapsed, hints: state.hintsUsed || 0 }
                });
              });
            }, 400);
          } else {
            updateProgress(false);
            resetHintTimer();
          }
        } else if (result.status === 'wrong') {
          renderer.showWrongFeedback(fromKey, toKey);
        }
      },
      onPreviewUpdate: (fromKey, pointerPt) => {
        if (isFinished) return;
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

    cleanupCurrent = () => {
      clearHintTimer();
      cleanupInput();
    };
  }

  function renderLevelComplete(levelIndex, meta) {
    const level = levels[levelIndex];
    const hasNext = levelIndex + 1 < levels.length;

    container.innerHTML = `
      <div class="screen level-complete-screen">
        <div class="modal-overlay">
          <div class="modal-card">
            <h2 class="modal-title">Level Complete!</h2>
            <p style="font-weight: 600; font-size: 1.1rem;">${level ? `${level.name} (${level.nameTa || ''})` : ''}</p>
            <p class="modal-meta">Time: ${meta.time ?? 0}s ${meta.hints ? `• Hints used: ${meta.hints}` : ''}</p>
            <div class="modal-actions">
              ${hasNext ? `<button id="btn-next-level" class="btn-primary" type="button">Next</button>` : ''}
              <button id="btn-select-levels" class="${hasNext ? 'btn-secondary' : 'btn-primary'}" type="button">Level Select</button>
              <button id="btn-replay" class="btn-secondary" type="button">Play Again</button>
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btn-next-level')?.addEventListener('click', () => {
      show('play', { levelIndex: levelIndex + 1 });
    });

    container.querySelector('#btn-select-levels')?.addEventListener('click', () => {
      show('select');
    });

    container.querySelector('#btn-replay')?.addEventListener('click', () => {
      show('play', { levelIndex });
    });
  }

  return {
    show,
    getCurrent: () => currentScreen
  };
}

