const SVG_NS = 'http://www.w3.org/2000/svg';

export function buildContinuousWalkPath(edges, dotMap, getControlPoint) {
  const remaining = Array.from(edges).map(e => e.split(':'));
  if (remaining.length === 0) return '';

  let d = '';
  let currentKey = null;

  while (remaining.length > 0) {
    let nextIndex = -1;
    let flip = false;

    if (currentKey !== null) {
      for (let i = 0; i < remaining.length; i++) {
        const [a, b] = remaining[i];
        if (a === currentKey) {
          nextIndex = i;
          flip = false;
          break;
        } else if (b === currentKey) {
          nextIndex = i;
          flip = true;
          break;
        }
      }
    }

    if (nextIndex === -1) {
      const [a, b] = remaining[0];
      const pA = dotMap.get(a);
      const pB = dotMap.get(b);
      const cp = getControlPoint(pA, pB);
      d += ` M ${pA.x} ${pA.y} Q ${cp.x} ${cp.y} ${pB.x} ${pB.y}`;
      currentKey = b;
      remaining.splice(0, 1);
    } else {
      const [a, b] = remaining[nextIndex];
      const from = flip ? b : a;
      const to = flip ? a : b;
      const pFrom = dotMap.get(from);
      const pTo = dotMap.get(to);
      const cp = getControlPoint(pFrom, pTo);
      d += ` Q ${cp.x} ${cp.y} ${pTo.x} ${pTo.y}`;
      currentKey = to;
      remaining.splice(nextIndex, 1);
    }
  }

  return d.trim();
}

export function pulseDots(dotsGroup) {
  const dots = dotsGroup.querySelectorAll('.kolam-dot');
  dots.forEach(dot => {
    dot.classList.remove('pulse');
    void dot.offsetWidth;
    dot.classList.add('pulse');
  });
}

export function playCompletionAnimation({
  drawnGroup,
  dotsGroup,
  dotMap,
  edges,
  getControlPoint,
  onComplete
}) {
  drawnGroup.innerHTML = '';

  const pathD = buildContinuousWalkPath(edges, dotMap, getControlPoint);
  if (!pathD) {
    if (onComplete) onComplete();
    return;
  }

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', pathD);
  path.setAttribute('class', 'completion-edge');
  drawnGroup.appendChild(path);

  const len = path.getTotalLength();
  path.style.strokeDasharray = `${len}`;
  path.style.strokeDashoffset = `${len}`;

  const anim = path.animate(
    [
      { strokeDashoffset: `${len}` },
      { strokeDashoffset: '0' }
    ],
    {
      duration: 2200,
      easing: 'ease-in-out',
      fill: 'forwards'
    }
  );

  anim.onfinish = () => {
    path.style.strokeDashoffset = '0';
    pulseDots(dotsGroup);
    if (onComplete) onComplete();
  };
}

