const SVG_NS = 'http://www.w3.org/2000/svg';

export function createRenderer(svgElement, dots) {
  svgElement.innerHTML = '';
  svgElement.setAttribute('viewBox', '0 0 100 100');

  const dotMap = new Map(dots.map(d => [d.key, d]));

  const guideGroup = document.createElementNS(SVG_NS, 'g');
  guideGroup.setAttribute('class', 'layer-guide');

  const drawnGroup = document.createElementNS(SVG_NS, 'g');
  drawnGroup.setAttribute('class', 'layer-drawn');

  const dotsGroup = document.createElementNS(SVG_NS, 'g');
  dotsGroup.setAttribute('class', 'layer-dots');

  const previewGroup = document.createElementNS(SVG_NS, 'g');
  previewGroup.setAttribute('class', 'layer-preview');

  const feedbackGroup = document.createElementNS(SVG_NS, 'g');
  feedbackGroup.setAttribute('class', 'layer-feedback');

  svgElement.appendChild(guideGroup);
  svgElement.appendChild(drawnGroup);
  svgElement.appendChild(dotsGroup);
  svgElement.appendChild(previewGroup);
  svgElement.appendChild(feedbackGroup);

  // Render dots
  dots.forEach(d => {
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', d.x);
    circle.setAttribute('cy', d.y);
    circle.setAttribute('r', '2.2');
    circle.setAttribute('class', 'kolam-dot');
    circle.dataset.key = d.key;
    dotsGroup.appendChild(circle);
  });

  const previewLine = document.createElementNS(SVG_NS, 'line');
  previewLine.setAttribute('class', 'preview-line');
  previewLine.style.display = 'none';
  previewGroup.appendChild(previewLine);

  function renderGuide(solutionEdges) {
    guideGroup.innerHTML = '';
    solutionEdges.forEach(edgeKey => {
      const [k1, k2] = edgeKey.split(':');
      const p1 = dotMap.get(k1);
      const p2 = dotMap.get(k2);
      if (!p1 || !p2) return;
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', p1.x);
      line.setAttribute('y1', p1.y);
      line.setAttribute('x2', p2.x);
      line.setAttribute('y2', p2.y);
      line.setAttribute('class', 'guide-edge');
      guideGroup.appendChild(line);
    });
  }

  function renderDrawn(drawnEdges) {
    drawnGroup.innerHTML = '';
    drawnEdges.forEach(edgeKey => {
      const [k1, k2] = edgeKey.split(':');
      const p1 = dotMap.get(k1);
      const p2 = dotMap.get(k2);
      if (!p1 || !p2) return;
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', p1.x);
      line.setAttribute('y1', p1.y);
      line.setAttribute('x2', p2.x);
      line.setAttribute('y2', p2.y);
      line.setAttribute('class', 'drawn-edge');
      drawnGroup.appendChild(line);
    });
  }

  function setPreview(p1, p2) {
    if (!p1 || !p2) {
      previewLine.style.display = 'none';
      return;
    }
    previewLine.setAttribute('x1', p1.x);
    previewLine.setAttribute('y1', p1.y);
    previewLine.setAttribute('x2', p2.x);
    previewLine.setAttribute('y2', p2.y);
    previewLine.style.display = '';
  }

  function showWrongFeedback(keyA, keyB) {
    const p1 = dotMap.get(keyA);
    const p2 = dotMap.get(keyB);
    if (!p1 || !p2) return;

    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', p1.x);
    line.setAttribute('y1', p1.y);
    line.setAttribute('x2', p2.x);
    line.setAttribute('y2', p2.y);
    line.setAttribute('class', 'wrong-edge-pulse');
    feedbackGroup.appendChild(line);

    svgElement.classList.remove('shake');
    // Force reflow for retriggering animation
    void svgElement.offsetWidth;
    svgElement.classList.add('shake');

    setTimeout(() => {
      line.remove();
      svgElement.classList.remove('shake');
    }, 400);
  }

  function highlightDot(key, active = true) {
    const el = dotsGroup.querySelector(`[data-key="${key}"]`);
    if (el) {
      el.classList.toggle('active', active);
    }
  }

  return {
    dotMap,
    renderGuide,
    renderDrawn,
    setPreview,
    showWrongFeedback,
    highlightDot
  };
}

