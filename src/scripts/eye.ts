// The hero eye watches the pointer. When nothing moves for a while (or on a
// touch screen, where there's no pointer to watch) it glances around on its
// own. Restless, after all.
//
// Motion: one critically damped spring per axis, so the iris starts from
// wherever it is, keeps its velocity when the target changes, and settles
// without overshoot.

const STIFFNESS = 170;
const DAMPING = 2 * Math.sqrt(STIFFNESS); // damping ratio 1.0
// How far the iris can travel, in icon units (the icon is 1024 wide). The
// opening is wide and short, so the reach is an ellipse; at the edges the
// moon tucks a little under the lids.
const REACH_X = 92;
const REACH_Y = 40;
const IDLE_AFTER_MS = 3200;

interface Axis {
  x: number;
  v: number;
  target: number;
}

export function initEye(svg: SVGSVGElement) {
  const iris = svg.querySelector<SVGGElement>('[data-eye-iris]');
  if (!iris) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  const ax: Axis = { x: 0, v: 0, target: 0 };
  const ay: Axis = { x: 0, v: 0, target: 0 };

  let frame = 0;
  let last = 0;
  let visible = true;
  let lastPointer = -Infinity;
  let wanderTimer = 0;

  const setTarget = (nx: number, ny: number) => {
    // nx, ny are a direction in [-1, 1]; keep it inside the unit circle.
    const len = Math.hypot(nx, ny);
    if (len > 1) {
      nx /= len;
      ny /= len;
    }
    ax.target = nx * REACH_X;
    ay.target = ny * REACH_Y;
    wake();
  };

  const step = (axis: Axis, dt: number) => {
    const force = -STIFFNESS * (axis.x - axis.target) - DAMPING * axis.v;
    axis.v += force * dt;
    axis.x += axis.v * dt;
  };

  const tick = (now: number) => {
    // Clamp dt so a backgrounded tab doesn't fling the iris on return.
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    // Two half steps keep the integration stable at low frame rates.
    for (let i = 0; i < 2; i++) {
      step(ax, dt / 2);
      step(ay, dt / 2);
    }
    iris.style.transform = `translate(${ax.x.toFixed(2)}px, ${ay.x.toFixed(2)}px)`;

    const settled =
      Math.abs(ax.x - ax.target) < 0.05 &&
      Math.abs(ay.x - ay.target) < 0.05 &&
      Math.abs(ax.v) < 0.05 &&
      Math.abs(ay.v) < 0.05;
    frame = settled ? 0 : requestAnimationFrame(tick);
  };

  const wake = () => {
    if (frame || !visible || reduce.matches) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    lastPointer = performance.now();
    const r = svg.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height * 0.51;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    // Full deflection once the pointer is ~half a viewport away; softer nearby.
    const range = Math.max(window.innerWidth, window.innerHeight) * 0.45;
    setTarget(dx / range, dy / (range * 0.6));
  };

  // Idle glances: short saccades to a new spot, now and then back to center.
  const wander = () => {
    const idle = performance.now() - lastPointer > IDLE_AFTER_MS || !finePointer.matches;
    if (idle && visible && !document.hidden) {
      if (Math.random() < 0.3) {
        setTarget(0, 0);
      } else {
        const angle = Math.random() * Math.PI * 2;
        const dist = 0.45 + Math.random() * 0.5;
        setTarget(Math.cos(angle) * dist, Math.sin(angle) * dist);
      }
    }
    wanderTimer = window.setTimeout(wander, 1400 + Math.random() * 2200);
  };

  const start = () => {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    // Let the opening animation finish before the eye starts wandering.
    wanderTimer = window.setTimeout(wander, 1600);
  };

  const stop = () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.clearTimeout(wanderTimer);
    cancelAnimationFrame(frame);
    frame = 0;
    ax.x = ax.v = ax.target = 0;
    ay.x = ay.v = ay.target = 0;
    iris.style.transform = '';
  };

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
  }).observe(svg);

  reduce.addEventListener('change', () => (reduce.matches ? stop() : start()));
  if (!reduce.matches) start();
}
