export const WORLDS = [
  {
    id: 'world-1',
    num: 1,
    name: 'Dot Basics',
    nameTa: 'புள்ளி அடிப்படைகள்',
    description: 'Grid-based dot-snapping & single-stroke continuous line drawing',
    mechanics: ['dot_snapping', 'single_stroke'],
    gridConstraints: { minGrid: 3, maxGrid: 5, snapRadius: 18 },
    winCondition: 'Complete the loop cleanly without lifting the brush/finger',
    lossCondition: 'Lifted brush before completing loop or discontinuous path',
    tools: ['stroke_single']
  },
  {
    id: 'world-2',
    num: 2,
    name: 'Continuous Flow',
    nameTa: 'தொடர் ஓட்டம்',
    description: 'Over-under loop weaving around dots with dead-end penalty checks',
    mechanics: ['loop_weaving', 'dead_end_check'],
    gridConstraints: { minGrid: 5, maxGrid: 5, weaveOffset: 0.2 },
    winCondition: 'Weave around dots and cleanly close all interlaced loops',
    lossCondition: 'Dead-end penalty: trapping path resets stroke and deducts points',
    tools: ['stroke_weave', 'dead_end_validator']
  },
  {
    id: 'world-3',
    num: 3,
    name: 'Symmetry & Borders',
    nameTa: 'சமச்சீர் & எல்லைகள்',
    description: '4-way and 8-way radial/axial mirroring with Kaavi terracotta border flood fill',
    mechanics: ['mirror_4way', 'mirror_8way', 'kaavi_border_fill'],
    gridConstraints: { minGrid: 5, maxGrid: 7, symmetricAxes: ['axial', 'radial'] },
    winCondition: 'Complete symmetric mandala pattern and fill enclosed Kaavi border zones',
    lossCondition: null,
    tools: ['mirror4', 'mirror8', 'kaavi_fill']
  },
  {
    id: 'world-4',
    num: 4,
    name: 'Festival Masterpieces',
    nameTa: 'திருவிழா கோலங்கள்',
    description: 'Zoomable & pannable canvas with multi-layer Rangoli color powder fills',
    mechanics: ['zoom_pan', 'multi_layer_coloring', 'rangoli_powders'],
    gridConstraints: { minGrid: 7, maxGrid: 9, canvasSize: 'large', zoomable: true },
    winCondition: 'Complete the master structure and color with multi-layer powder fills',
    lossCondition: null,
    tools: ['mirror4', 'mirror8', 'kaavi_fill', 'rangoli_palette', 'zoom_pan']
  }
];

export function getWorlds() {
  return WORLDS;
}

export function getWorld(worldId) {
  if (typeof worldId === 'number') {
    return WORLDS.find(w => w.num === worldId) || null;
  }
  return WORLDS.find(w => w.id === worldId) || null;
}

export function getWorldForLevel(level) {
  if (!level) return null;
  if (level.worldId) {
    return getWorld(level.worldId);
  }
  if (level.world) {
    return getWorld(level.world);
  }
  return WORLDS[0];
}

export function getLevelsByWorld(levels, worldId) {
  const world = getWorld(worldId);
  if (!world) return [];
  return levels.filter(lvl => (lvl.worldId === world.id || lvl.world === world.num));
}

export function isWorldUnlocked(worldId, levels, completedMap = {}) {
  const world = getWorld(worldId);
  if (!world || world.num === 1) return true;
  const prevWorld = getWorld(world.num - 1);
  if (!prevWorld) return true;
  const prevLevels = getLevelsByWorld(levels, prevWorld.id);
  if (prevLevels.length === 0) return true;
  return prevLevels.every(lvl => Boolean(completedMap[lvl.id]));
}

export function isLevelUnlockedInProgression(levelId, levels, completedMap = {}) {
  const level = levels.find(l => l.id === levelId);
  if (!level) return false;
  const world = getWorldForLevel(level);
  if (world && !isWorldUnlocked(world.id, levels, completedMap)) {
    return false;
  }
  const worldLevels = world ? getLevelsByWorld(levels, world.id) : levels;
  const idx = worldLevels.findIndex(l => l.id === levelId);
  if (idx <= 0) return true;
  const prevLevel = worldLevels[idx - 1];
  return Boolean(completedMap[prevLevel.id]);
}

/**
 * World 1 Validation:
 * Validates whether the drawn edges form a single unbroken continuous loop.
 */
export function validateSingleStrokeLoop(edges, isClosedRequired = true) {
  if (!edges || edges.size === 0) {
    return { valid: false, reason: 'empty' };
  }
  const adj = new Map();
  for (const edge of edges) {
    const [u, v] = edge.split(':');
    if (!adj.has(u)) adj.set(u, []);
    if (!adj.has(v)) adj.set(v, []);
    adj.get(u).push(v);
    adj.get(v).push(u);
  }

  // In a clean closed single-stroke loop, every vertex must have degree exactly 2
  // and all vertices must be connected in a single cycle.
  if (isClosedRequired) {
    for (const [node, neighbors] of adj.entries()) {
      if (neighbors.length !== 2) {
        return { valid: false, reason: 'degree_mismatch', node, degree: neighbors.length };
      }
    }
  }

  // Check connectivity (single connected component)
  const startNode = Array.from(adj.keys())[0];
  const visited = new Set([startNode]);
  const queue = [startNode];
  while (queue.length > 0) {
    const cur = queue.shift();
    for (const nxt of adj.get(cur) || []) {
      if (!visited.has(nxt)) {
        visited.add(nxt);
        queue.push(nxt);
      }
    }
  }

  const isConnected = visited.size === adj.size;
  return {
    valid: isConnected,
    isLoop: isClosedRequired,
    nodeCount: adj.size,
    edgeCount: edges.size
  };
}

/**
 * World 2 Validation:
 * Path-validation check that triggers dead-end penalty if the player
 * traps a line with no further remaining solution moves or traps an unclosed loop.
 */
export function checkDeadEndPenalty(currentDot, drawnEdges, solutionEdges) {
  if (!currentDot) return { deadEnd: false };

  // Find remaining required solution edges incident to currentDot
  let remainingIncidentCount = 0;
  for (const edge of solutionEdges) {
    if (!drawnEdges.has(edge)) {
      const [u, v] = edge.split(':');
      if (u === currentDot || v === currentDot) {
        remainingIncidentCount++;
      }
    }
  }

  // If there are still solution edges left in total, but no valid moves leaving currentDot
  const isFullySolved = drawnEdges.size === solutionEdges.size;
  if (!isFullySolved && remainingIncidentCount === 0) {
    return {
      deadEnd: true,
      stuckAt: currentDot,
      penaltyPoints: 25,
      resetStroke: true
    };
  }

  return { deadEnd: false };
}

