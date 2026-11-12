import { playCompletionAnimation, pulseDots } from './animate.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function getControlPoint(p1, p2, cx = 50, cy = 50, push = 3.5) {
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  let vx = mx - cx;
  let vy = my - cy;
  let len = Math.hypot(vx, vy);

  if (len < 0.001) {
    const [a, b] = (p1.x < p2.x || (p1.x === p2.x && p1.y < p2.y)) ? [p1, p2] : [p2, p1];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const elen = Math.hypot(ex, ey) || 1;
    vx = -ey / elen;
    vy = ex / elen;
    len = 1;
  }

  return {
    x: mx + (vx / len) * push,
    y: my + (vy / len) * push
  };
}

export function getEdgePathD(p1, p2) {
  const cp = getControlPoint(p1, p2);
  return `M ${p1.x} ${p1.y} Q ${cp.x} ${cp.y} ${p2.x} ${p2.y}`;
}

export function createRenderer(svgElement, dots) {
  svgElement.innerHTML = '';
  svgElement.setAttribute('viewBox', '0 0 100 100');

  const dotMap = new Map(dots.map(d => [d.key, d]));

  // Defs with single blur glow filter
  const defs = document.createElementNS(SVG_NS, 'defs');
  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.setAttribute('id', 'kolam-glow');
  filter.setAttribute('x', '-25%');
  filter.setAttribute('y', '-25%');
  filter.setAttribute('width', '150%');
  filter.setAttribute('height', '150%');

  const blur = document.createElementNS(SVG_NS, 'feGaussianBlur');
  blur.setAttribute('in', 'SourceGraphic');
  blur.setAttribute('stdDeviation', '1.6');
  blur.setAttribute('result', 'blur');

  const merge = document.createElementNS(SVG_NS, 'feMerge');
  const m1 = document.createElementNS(SVG_NS, 'feMergeNode');
  m1.setAttribute('in', 'blur');
  const m2 = document.createElementNS(SVG_NS, 'feMergeNode');
  m2.setAttribute('in', 'SourceGraphic');
  merge.appendChild(m1);
  merge.appendChild(m2);

  filter.appendChild(blur);
  filter.appendChild(merge);
  defs.appendChild(filter);
  svgElement.appendChild(defs);

  // Layers bottom to top: guide, drawn edges, dots, preview line
  const guideGroup = document.createElementNS(SVG_NS, 'g');
  guideGroup.setAttribute('class', 'layer-guide');

  const drawnGroup = document.createElementNS(SVG_NS, 'g');
  drawnGroup.setAttribute('class', 'layer-drawn');
  drawnGroup.setAttribute('filter', 'url(#kolam-glow)');

  const dotsGroup = document.createElementNS(SVG_NS, 'g');
  dotsGroup.setAttribute('class', 'layer-dots');

  const previewGroup = document.createElementNS(SVG_NS, 'g');
  previewGroup.setAttribute('class', 'layer-preview');

  svgElement.appendChild(guideGroup);
  svgElement.appendChild(drawnGroup);
  svgElement.appendChild(dotsGroup);
  svgElement.appendChild(previewGroup);

  // Render dots
  dots.forEach(d => {
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', d.x);
    circle.setAttribute('cy', d.y);
    circle.setAttribute('r', '2.2');
    circle.setAttribute('class', 'kolam-dot');
    circle.dataset.key = d.key;

    circle.addEventListener('pointerenter', () => {
      circle.classList.add('pulse-touch');
    });
    circle.addEventListener('pointerleave', () => {
      circle.classList.remove('pulse-touch');
    });

    dotsGroup.appendChild(circle);
  });

  const previewPath = document.createElementNS(SVG_NS, 'path');
  previewPath.setAttribute('class', 'preview-line');
  previewPath.style.display = 'none';
  previewGroup.appendChild(previewPath);

  function renderGuide(solutionEdges) {
    guideGroup.innerHTML = '';
    solutionEdges.forEach(edgeKey => {
      const [k1, k2] = edgeKey.split(':');
      const p1 = dotMap.get(k1);
      const p2 = dotMap.get(k2);
      if (!p1 || !p2) return;
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', getEdgePathD(p1, p2));
      path.setAttribute('class', 'guide-edge');
      guideGroup.appendChild(path);
    });
  }

  function renderDrawn(drawnEdges) {
    drawnGroup.innerHTML = '';
    drawnEdges.forEach(edgeKey => {
      const [k1, k2] = edgeKey.split(':');
      const p1 = dotMap.get(k1);
      const p2 = dotMap.get(k2);
      if (!p1 || !p2) return;
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', getEdgePathD(p1, p2));
      path.setAttribute('class', 'drawn-edge');
      drawnGroup.appendChild(path);
    });
  }

  function setPreview(p1, p2) {
    if (!p1 || !p2) {
      previewPath.style.display = 'none';
      return;
    }
    previewPath.setAttribute('d', getEdgePathD(p1, p2));
    previewPath.style.display = '';
  }

  function showWrongFeedback(keyA, keyB) {
    const p1 = dotMap.get(keyA);
    const p2 = dotMap.get(keyB);
    if (!p1 || !p2) return;

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', getEdgePathD(p1, p2));
    path.setAttribute('class', 'wrong-edge-pulse');
    previewGroup.appendChild(path);

    svgElement.classList.remove('shake');
    void svgElement.offsetWidth;
    svgElement.classList.add('shake');

    setTimeout(() => {
      path.remove();
      svgElement.classList.remove('shake');
    }, 400);
  }

  function highlightDot(key, active = true) {
    const el = dotsGroup.querySelector(`[data-key="${key}"]`);
    if (el) {
      el.classList.toggle('active', active);
    }
  }

  function playCompletion(edges, onComplete) {
    playCompletionAnimation({
      drawnGroup,
      dotsGroup,
      dotMap,
      edges,
      getControlPoint,
      onComplete
    });
  }

  return {
    dotMap,
    renderGuide,
    renderDrawn,
    setPreview,
    showWrongFeedback,
    highlightDot,
    playCompletion,
    pulseDots: () => pulseDots(dotsGroup)
  };
}
