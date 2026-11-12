export function setupInput({
  svg,
  dots,
  isNeighbor,
  onAttemptEdge,
  onPreviewUpdate
}) {
  svg.style.touchAction = 'none';

  let dragging = false;
  let fromKey = null;
  let activePointerId = null;

  // Dot spacing approx
  const step = dots.length > 1 ? Math.abs(dots[1].x - dots[0].x || dots[1].y - dots[0].y) : 35;
  const defaultSnap = (step || 35) * 0.4;

  function toSvgCoords(e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    return pt.matrixTransform(ctm.inverse());
  }

  function nearestDot(point, maxRadius = Infinity) {
    let best = null;
    let bestDistSq = maxRadius * maxRadius;
    for (const d of dots) {
      const dx = d.x - point.x;
      const dy = d.y - point.y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= bestDistSq) {
        bestDistSq = distSq;
        best = d.key;
      }
    }
    return best;
  }

  function handlePointerDown(e) {
    if (dragging) return;
    dragging = true;
    activePointerId = e.pointerId;
    svg.setPointerCapture(e.pointerId);

    const pt = toSvgCoords(e);
    const snap = e.pointerType === 'touch' ? defaultSnap * 1.3 : defaultSnap;
    fromKey = nearestDot(pt, snap);
    onPreviewUpdate(fromKey, pt);
  }

  function handlePointerMove(e) {
    if (!dragging || e.pointerId !== activePointerId) return;
    const pt = toSvgCoords(e);
    const snap = e.pointerType === 'touch' ? defaultSnap * 1.3 : defaultSnap;

    if (!fromKey) {
      fromKey = nearestDot(pt, snap);
    }

    if (fromKey) {
      const toKey = nearestDot(pt, snap);
      if (toKey && toKey !== fromKey && isNeighbor(fromKey, toKey)) {
        onAttemptEdge(fromKey, toKey);
        fromKey = toKey;
      }
    }

    onPreviewUpdate(fromKey, pt);
  }

  function handlePointerUp(e) {
    if (!dragging || e.pointerId !== activePointerId) return;
    dragging = false;
    activePointerId = null;
    fromKey = null;
    try {
      svg.releasePointerCapture(e.pointerId);
    } catch (_) {}
    onPreviewUpdate(null, null);
  }

  svg.addEventListener('pointerdown', handlePointerDown);
  svg.addEventListener('pointermove', handlePointerMove);
  svg.addEventListener('pointerup', handlePointerUp);
  svg.addEventListener('pointercancel', handlePointerUp);

  return function cleanup() {
    svg.removeEventListener('pointerdown', handlePointerDown);
    svg.removeEventListener('pointermove', handlePointerMove);
    svg.removeEventListener('pointerup', handlePointerUp);
    svg.removeEventListener('pointercancel', handlePointerUp);
  };
}

