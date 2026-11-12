import { isLevelUnlockedInProgression } from './progression.js';

const STORAGE_KEY = 'kolam_puzzle_save';

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completed: {} };
    const data = JSON.parse(raw);
    return {
      completed: data.completed || {},
      dailyStreak: data.dailyStreak || 0,
      lastDaily: data.lastDaily || null,
      muted: !!data.muted,
      lang: data.lang || 'en'
    };
  } catch (e) {
    return { completed: {} };
  }
}

export function saveProgress(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // Gracefully handle storage disabled/quota issues
  }
}

export function markLevelCompleted(levelId, meta = {}) {
  const current = loadProgress();
  current.completed[levelId] = {
    time: meta.time ?? 0,
    hints: meta.hints ?? 0,
    completedAt: Date.now()
  };
  saveProgress(current);
  return current;
}

export function isLevelCompleted(levelId) {
  const current = loadProgress();
  return Boolean(current.completed && current.completed[levelId]);
}

export function isLevelUnlocked(levelId, levels) {
  const current = loadProgress();
  return isLevelUnlockedInProgression(levelId, levels, current.completed || {});
}

