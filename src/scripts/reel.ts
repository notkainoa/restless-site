// The hero reel: one night on a closed MacBook, passing through the headline
// as you scroll. The stage is sticky and the page scrolls natively; scroll
// position only chooses which frame sits in the window. Each step holds its
// frame for most of its run and moves for the rest, so a frame is always
// readable when the visitor stops.
//
// Reduced motion: no travel. The frames sit on top of each other and the
// active one fades in.

const HOLD = 0.55;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function initReel(hero: HTMLElement) {
  const reel = hero.querySelector<HTMLElement>('[data-reel]');
  if (!reel) return;
  const frames = [...reel.querySelectorAll<HTMLElement>('[data-frame]')];
  const captions = [...hero.querySelectorAll<HTMLElement>('[data-caption]')];
  const count = hero.querySelector<HTMLElement>('[data-count]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const n = frames.length;

  let pitch = 0;
  let active = -1;
  let ticking = false;

  const measure = () => {
    pitch = n > 1 ? frames[1].offsetTop - frames[0].offsetTop : 0;
  };

  const setActive = (i: number) => {
    if (i === active) return;
    active = i;
    frames.forEach((f, j) => f.classList.toggle('is-active', j === i));
    captions.forEach((c, j) => c.classList.toggle('is-active', j === i));
    if (count) count.textContent = `${i + 1} of ${n}`;
  };

  const update = () => {
    ticking = false;
    const run = hero.offsetHeight - window.innerHeight;
    const progress = run > 0 ? Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / run)) : 0;
    const p = progress * (n - 1);
    const step = Math.min(n - 2, Math.floor(p));
    const t = p - step;
    const moved = t < HOLD ? 0 : easeInOut((t - HOLD) / (1 - HOLD));
    const pos = Math.min(n - 1, step + moved);

    reel.style.transform = reduce.matches ? '' : `translate3d(0, ${(-pos * pitch).toFixed(1)}px, 0)`;
    setActive(Math.round(pos));
  };

  const request = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  measure();
  update();
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', () => {
    measure();
    request();
  });
  reduce.addEventListener('change', () => {
    measure();
    request();
  });
}
