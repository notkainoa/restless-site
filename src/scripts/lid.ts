// The "what it does" demo: a laptop running a long build over SSH, plus a
// working copy of the Restless panel. It plays its own story once (close the
// lid, keep building, open it again) so nobody has to click to get the point.
// Visitors can still take over: click the laptop, or flip a switch. Turn off
// Lid Closed → Keep Awake and the Mac sleeps, the build pauses, and the SSH
// session drops, just like the real thing.
//
// The status card and menu bar glyph follow the app's own logic
// (Sources/Panel/PanelViews.swift).

type Lid = 'open' | 'closed';

interface Settings {
  lidOpenAwake: boolean;
  lidClosedAwake: boolean;
  sleepDisplay: boolean;
  lockScreen: boolean;
  battery: boolean;
}

const TICK_MS = 700;
const LID_MS = 1000;
// The story: wait a beat after the demo scrolls into view, close the lid,
// let the build run with it shut, then open it again.
const STORY_CLOSE_MS = 1400;
const STORY_OPEN_MS = 5600;
const MAX_LINES = 13;
const FILES = [
  'core/power.swift',
  'core/assertion.swift',
  'helper/xpc.swift',
  'panel/views.swift',
  'net/session.swift',
  'store/cache.swift',
  'agent/runner.swift',
  'ui/status.swift',
];

export function initLidDemo(root: HTMLElement) {
  const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const log = $<HTMLElement>('[data-log]');
  const fill = $<HTMLElement>('[data-job-fill]');
  const pct = $<HTMLElement>('[data-job-pct]');
  const jobState = $<HTMLElement>('[data-job-state]');
  const title = $<HTMLElement>('[data-status-title]');
  const sub = $<HTMLElement>('[data-status-sub]');
  const closedOn = $<HTMLElement>('[data-closed-on]');
  const toggle = $<HTMLButtonElement>('[data-lid-toggle]');
  const radios = [...root.querySelectorAll<HTMLButtonElement>('[data-lid-set]')];
  const switches = [...root.querySelectorAll<HTMLButtonElement>('[data-setting]')];
  const groups = [...root.querySelectorAll<HTMLElement>('[data-group]')];

  const settings: Settings = {
    lidOpenAwake: true,
    lidClosedAwake: true,
    sleepDisplay: true,
    lockScreen: true,
    battery: true,
  };

  let lid: Lid = 'open';
  let closedAt = 0;
  let running = true;
  let sleptWhileClosed = false;
  let reconnecting = false;
  // What the build did while the lid was shut, shown when it opens again.
  let percentAtClose = 0;
  let payoff = '';
  let percent = 0;
  let fileIndex = 0;
  let phase: 'connecting' | 'building' | 'done' = 'connecting';
  let phaseTimer = 0;
  let tickTimer = 0;
  let sleepTimer = 0;
  let inView = false;
  let interacted = false;

  // ---------------------------------------------------------------- log
  const line = (text: string, cls = '') => {
    const el = document.createElement('div');
    if (cls) el.className = cls;
    el.textContent = text;
    log.append(el);
    while (log.childElementCount > MAX_LINES) log.firstElementChild?.remove();
  };

  const setPercent = (value: number, animate = true) => {
    percent = value;
    fill.style.transition = animate ? '' : 'none';
    fill.style.transform = `scaleX(${value / 100})`;
    pct.textContent = `${value}%`;
    if (!animate) void fill.offsetWidth; // commit before re-enabling the transition
    fill.style.transition = '';
  };

  const connect = () => {
    phase = 'connecting';
    line('$ ssh dev@build-box', 'acc');
    window.clearTimeout(phaseTimer);
    phaseTimer = window.setTimeout(() => {
      if (!running) return;
      line('Welcome to build-box (Linux 6.14)', 'dim');
      line('dev@build-box:~$ make release');
      phase = 'building';
      setPercent(0, false);
    }, 900);
  };

  const tick = () => {
    if (!running || phase !== 'building') return;
    const next = Math.min(100, percent + 1);
    setPercent(next);
    if (next % 4 === 0 && next < 100) {
      line(`[${String(next).padStart(3)}%] Compiling ${FILES[fileIndex++ % FILES.length]}`);
    }
    if (next === 100) {
      phase = 'done';
      line('✓ Built release in 6m 12s', 'ok');
      phaseTimer = window.setTimeout(() => {
        if (!running) return;
        line('dev@build-box:~$ make release');
        phase = 'building';
        setPercent(0, false);
      }, 2600);
    }
  };

  const schedule = () => {
    window.clearInterval(tickTimer);
    tickTimer = 0;
    if (running && inView && !document.hidden) tickTimer = window.setInterval(tick, TICK_MS);
  };

  // ----------------------------------------------------------- rendering
  const render = () => {
    root.dataset.lid = lid;
    root.dataset.running = String(running);

    const glyph = settings.lidClosedAwake ? 'eye-fill' : settings.lidOpenAwake ? 'eye' : 'eye-slash';
    root.dataset.glyphState = glyph;

    if (settings.lidClosedAwake) {
      title.textContent = 'Awake with the lid closed';
      const screen = settings.sleepDisplay ? 'screen off' : 'screen on';
      const lock = settings.lockScreen ? 'locked' : 'unlocked';
      sub.textContent = `When shut: ${screen}, ${lock}`;
    } else if (settings.lidOpenAwake) {
      title.textContent = 'Awake';
      sub.textContent = 'Your Mac and screen stay on';
    } else {
      title.textContent = 'Sleep allowed';
      sub.textContent = 'Your Mac sleeps as usual';
    }
    closedOn.style.opacity = settings.lidClosedAwake ? '1' : '0';

    toggle.setAttribute('aria-label', lid === 'open' ? 'Close the lid' : 'Open the lid');
    for (const r of radios) {
      const on = r.dataset.lidSet === lid;
      r.setAttribute('aria-checked', String(on));
      r.tabIndex = on ? 0 : -1;
    }
    for (const g of groups) g.toggleAttribute('data-active', g.dataset.group === lid);
    for (const s of switches) {
      s.setAttribute('aria-checked', String(settings[s.dataset.setting as keyof Settings]));
    }
  };

  const setJobState = (text: string) => {
    if (jobState.textContent !== text) jobState.textContent = text;
  };

  const describe = () => {
    if (!running) {
      setJobState(`Asleep. Paused at ${percent}%.`);
    } else if (lid === 'closed') {
      setJobState('Still running with the lid closed');
    } else if (!reconnecting) {
      setJobState(payoff || 'Running');
    }
  };

  // --------------------------------------------------------------- sleep
  const sleep = () => {
    if (!running) return;
    running = false;
    // A session that was already dropped has nothing left to break.
    if (phase !== 'connecting') sleptWhileClosed = true;
    window.clearTimeout(phaseTimer);
    schedule();
    render();
    describe();
  };

  const wake = () => {
    if (running) return;
    running = true;
    render();
    schedule();
    if (sleptWhileClosed) {
      // What you actually come back to after a Mac sleeps mid-session.
      sleptWhileClosed = false;
      reconnecting = true;
      phase = 'connecting';
      line('client_loop: send disconnect: Broken pipe', 'err');
      line('Connection to build-box closed.', 'dim');
      setJobState('The Mac slept, so the SSH session dropped. Starting over.');
      setPercent(0, false);
      phaseTimer = window.setTimeout(() => {
        reconnecting = false;
        connect();
        describe();
      }, 1400);
    } else if (phase === 'connecting') {
      // Slept again before the session came back; pick up where it left off.
      reconnecting = false;
      connect();
    }
  };

  const update = () => {
    window.clearTimeout(sleepTimer);
    if (lid === 'closed' && !settings.lidClosedAwake) {
      // Sleep once the lid is actually down.
      const remaining = closedAt + LID_MS * 0.9 - performance.now();
      sleepTimer = window.setTimeout(sleep, Math.max(0, remaining));
    } else if (lid === 'open') {
      wake();
    }
    render();
    describe();
  };

  // ------------------------------------------------------------- inputs
  const setLid = (next: Lid) => {
    if (next === lid) return;
    lid = next;
    if (lid === 'closed') {
      closedAt = performance.now();
      percentAtClose = percent;
      payoff = '';
    } else if (running && phase === 'building' && percent > percentAtClose) {
      payoff = `The build kept going with the lid closed: ${percentAtClose}% → ${percent}%`;
    }
    update();
  };

  toggle.addEventListener('click', () => {
    interacted = true;
    setLid(lid === 'open' ? 'closed' : 'open');
  });

  radios.forEach((r, i) => {
    r.addEventListener('click', () => {
      interacted = true;
      setLid(r.dataset.lidSet as Lid);
    });
    r.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      e.preventDefault();
      const target = radios[(i + 1) % radios.length];
      interacted = true;
      setLid(target.dataset.lidSet as Lid);
      target.focus();
    });
  });

  for (const s of switches) {
    s.addEventListener('click', () => {
      interacted = true;
      const key = s.dataset.setting as keyof Settings;
      settings[key] = !settings[key];
      update();
    });
  }

  document.addEventListener('visibilitychange', schedule);

  // Play the story once. Any click hands control to the visitor.
  let autoplayed = false;
  new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      schedule();
      if (inView && !autoplayed) {
        autoplayed = true;
        window.setTimeout(() => !interacted && setLid('closed'), STORY_CLOSE_MS);
        window.setTimeout(() => !interacted && setLid('open'), STORY_OPEN_MS);
      }
    },
    { threshold: 0.35 },
  ).observe(root);

  // Start mid-build so the first glance already shows progress.
  line('$ ssh dev@build-box', 'acc');
  line('Welcome to build-box (Linux 6.14)', 'dim');
  line('dev@build-box:~$ make release');
  for (let p = 4; p <= 36; p += 4) {
    line(`[${String(p).padStart(3)}%] Compiling ${FILES[fileIndex++ % FILES.length]}`);
  }
  phase = 'building';
  setPercent(37, false);
  render();
  describe();
}
