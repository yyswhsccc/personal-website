document.addEventListener('DOMContentLoaded', () => {

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ================= 8-BIT AUDIO SYNTHESIZER (Web Audio API) =================
  let soundEnabled = true;
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTone(freq, type, duration, delay = 0, volume = 0.08) {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

      gainNode.gain.setValueAtTime(volume, ctx.currentTime + delay);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + delay + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    } catch (e) {
      console.warn('Audio Context blocked or unsupported:', e);
    }
  }

  const playClickSound = () => playTone(784, 'triangle', 0.1);
  const playCloseSound = () => playTone(523, 'sawtooth', 0.15);

  function playStartupChime() {
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      playTone(freq, 'sine', 0.3, idx * 0.12);
    });
  }

  function playSparkleSound() {
    [587.33, 783.99, 987.77, 1174.66].forEach((freq, idx) => {
      playTone(freq, 'triangle', 0.25, idx * 0.08);
    });
  }

  function playComboSound(combo) {
    const freq = 620 * Math.pow(1.09, Math.min(combo, 12));
    playTone(freq, 'square', 0.09, 0, 0.05);
  }

  function playEatSound() {
    playTone(320, 'square', 0.08, 0, 0.06);
    playTone(240, 'square', 0.08, 0.09, 0.06);
    playTone(420, 'triangle', 0.12, 0.2, 0.06);
  }

  function playFanfare() {
    [659.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, idx) => {
      playTone(freq, 'triangle', 0.22, idx * 0.11);
    });
  }

  function playPickupSound() {
    playTone(880, 'sine', 0.09, 0, 0.05);
    playTone(1174, 'sine', 0.1, 0.07, 0.05);
  }

  function playDropSound() {
    playTone(340, 'triangle', 0.12, 0, 0.06);
    playTone(220, 'triangle', 0.14, 0.08, 0.05);
  }

  function playGlitchSound() {
    for (let i = 0; i < 6; i++) {
      playTone(200 + Math.random() * 900, 'sawtooth', 0.06, i * 0.06, 0.035);
    }
  }

  // Mute / Unmute Handler
  const btnSoundToggle = document.getElementById('btn-sound-toggle');
  if (btnSoundToggle) {
    btnSoundToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      soundEnabled = !soundEnabled;
      if (soundEnabled) {
        btnSoundToggle.textContent = '🔊';
        getAudioContext();
        playClickSound();
      } else {
        btnSoundToggle.textContent = '🔇';
      }
    });
  }

  // ================= LOADER SCREEN =================
  const loader = document.getElementById('loader');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('fade-out');
      document.documentElement.classList.remove('is-booting');
      setTimeout(() => playStartupChime(), 100);
      setTimeout(() => {
        loader.style.display = 'none';
      }, 500);
    }, 1800);
  } else {
    document.documentElement.classList.remove('is-booting');
  }

  // ================= TRAY CLOCK =================
  const trayClock = document.getElementById('tray-clock');
  function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    trayClock.textContent = `${hours}:${minutes} ${ampm}`;
  }
  updateClock();
  setInterval(updateClock, 60000);

  // ================= START MENU TOGGLE =================
  const startBtn = document.getElementById('start-btn');
  const startMenu = document.getElementById('start-menu-popup');

  function syncDanmakuSuppression() {
    const dm = document.getElementById('mini-danmaku');
    if (dm) dm.classList.toggle('dm-suppressed', startMenu.classList.contains('show'));
  }

  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    playClickSound();
    const isExpanded = startBtn.getAttribute('aria-expanded') === 'true';
    startBtn.setAttribute('aria-expanded', String(!isExpanded));
    startMenu.classList.toggle('show');
    syncDanmakuSuppression(); // :has() fallback for older Firefox
  });

  document.addEventListener('click', (e) => {
    if (!startMenu.contains(e.target) && e.target !== startBtn) {
      startMenu.classList.remove('show');
      startBtn.setAttribute('aria-expanded', 'false');
      syncDanmakuSuppression();
    }
  });

  // ================= WINDOW MANAGEMENT SYSTEM =================
  let highestZ = 500;
  const windows = document.querySelectorAll('.window');
  const taskbarApps = document.querySelector('.taskbar-apps');
  const desktopTaskbar = document.querySelector('.desktop-taskbar');

  function syncViewportChromeVars() {
    if (!desktopTaskbar) return;
    const taskbarRect = desktopTaskbar.getBoundingClientRect();
    const taskbarHeight = Math.ceil(taskbarRect.height);
    const taskbarBottomAvoid = Math.max(
      taskbarHeight + 12,
      Math.ceil(window.innerHeight - taskbarRect.top + 12)
    );

    document.documentElement.style.setProperty('--taskbar-height', `${taskbarHeight}px`);
    document.documentElement.style.setProperty('--taskbar-avoid-bottom', `${taskbarBottomAvoid}px`);
  }

  syncViewportChromeVars();
  window.addEventListener('resize', syncViewportChromeVars);
  window.addEventListener('scroll', syncViewportChromeVars, { passive: true });

  function focusWindow(win) {
    highestZ++;
    win.style.zIndex = highestZ;
    windows.forEach(w => w.classList.remove('window-active'));
    win.classList.remove('window-minimized');
    win.classList.add('window-active');
    updateTaskbarAppButtons();
  }

  function focusTopWindow() {
    const visibleWindows = [...windows].filter((w) => (
      !w.classList.contains('window-closed') &&
      !w.classList.contains('window-minimized')
    ));

    if (!visibleWindows.length) {
      updateTaskbarAppButtons();
      return;
    }

    const topWindow = visibleWindows.reduce((top, win) => {
      const winZ = Number(win.style.zIndex) || 100;
      const topZ = Number(top.style.zIndex) || 100;
      return winZ > topZ ? win : top;
    });

    focusWindow(topWindow);
  }

  const winOpeners = new Map(); // a11y: who opened each window, to restore focus

  function openWindow(winId, opts = {}) {
    const win = document.getElementById(winId);
    if (!win) return;

    if (!opts.fromHistory) yosPushNav(winId);

    const wasClosed = win.classList.contains('window-closed');
    if (wasClosed && document.activeElement && document.activeElement !== document.body) {
      winOpeners.set(winId, document.activeElement);
    }
    playClickSound();
    win.classList.remove('window-closed');
    win.classList.remove('window-minimized');
    focusWindow(win);

    if (wasClosed) {
      win.classList.add('window-pop');
      setTimeout(() => win.classList.remove('window-pop'), 260);
      slimeReactToWindow(win);
    }

    if (winId === 'win-chat' && typeof clearDanmaku === 'function') clearDanmaku();
    if (winId === 'win-skills' && typeof initEquipMarquee === 'function') {
      setTimeout(initEquipMarquee, 80); // names are measurable only once visible
    }
    if (winId === 'win-game') {
      setTimeout(() => { if (typeof gFitCanvas === 'function') gFitCanvas(); }, 120);
      if (typeof showGameHint === 'function') showGameHint();
      if (typeof dismissGameInvite === 'function') dismissGameInvite();
    }
    if (winId === 'win-interview' && typeof setupInterviewWindow === 'function') setupInterviewWindow();
    if (winId === 'win-live' && typeof liveEnter === 'function') {
      win.classList.add('window-maximized'); // the live room opens big, front and centre
      setTimeout(liveEnter, 120);
    }
    if (winId === 'win-leaderboard' && typeof renderLeaderboard === 'function') renderLeaderboard();

    // Fresh opens always land inside the CURRENT viewport, sized to fit the
    // space above the sticky taskbar — never guillotined by the bottom bar.
    if (wasClosed && !win.classList.contains('window-maximized') && window.innerWidth > 640) {
      const area = document.querySelector('.desktop-area');
      const areaRect = area ? area.getBoundingClientRect() : { top: 0 };
      const taskbarH = desktopTaskbar ? desktopTaskbar.offsetHeight : 48;
      const avail = window.innerHeight - taskbarH - 32;

      const cap = Math.max(260, Math.min(540, avail - 24));
      win.style.maxHeight = `${cap}px`;
      if (cap < 400) win.style.minHeight = '0'; // tiny viewports: let it shrink
      // viewport-top expressed in desktop-area coordinates
      const viewportTopInArea = Math.max(12, -areaRect.top + 14);
      win.style.top = `${viewportTopInArea + Math.random() * 24}px`;
      win.style.left = `${30 + Math.random() * 60}px`;
    }

    // keyboard users land inside the window they just opened
    if (wasClosed) {
      win.setAttribute('tabindex', '-1');
      setTimeout(() => win.focus({ preventScroll: true }), 60);
    }
  }

  function closeWindow(win) {
    if (win.id === 'win-live' && typeof liveExit === 'function') liveExit();
    playCloseSound();
    win.classList.add('window-closed');
    win.classList.remove('window-active');
    focusTopWindow();

    // hand focus back to whatever opened this window
    const opener = winOpeners.get(win.id);
    if (opener && document.contains(opener)) {
      opener.focus();
    } else {
      const main = document.getElementById('main-desktop');
      if (main) main.focus();
    }
  }

  function minimizeWindow(win) {
    if (win.id === 'win-live' && typeof liveExit === 'function') liveExit();
    playCloseSound();
    win.classList.add('window-minimized');
    win.classList.remove('window-active');
    focusTopWindow();
  }

  function toggleMaximizeWindow(win, btn) {
    playClickSound();
    syncViewportChromeVars();
    win.classList.toggle('window-maximized');
    if (win.classList.contains('window-maximized')) {
      btn.textContent = '❐';
      win.style.top = '';
      win.style.left = '';
    } else {
      btn.textContent = '⛶';
      win.style.top = '100px';
      win.style.left = '50px';
    }
  }

  windows.forEach((win) => {
    const btnClose = win.querySelector('.win-btn-close');
    const btnMinimize = win.querySelector('.win-btn-minimize');
    const btnMaximize = win.querySelector('.win-btn-maximize');
    const header = win.querySelector('.window-header');

    win.addEventListener('mousedown', () => {
      focusWindow(win);
    });

    if (btnClose) {
      btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        closeWindow(win);
      });
    }

    if (btnMinimize) {
      btnMinimize.addEventListener('click', (e) => {
        e.stopPropagation();
        minimizeWindow(win);
      });
    }

    if (btnMaximize) {
      btnMaximize.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMaximizeWindow(win, btnMaximize);
      });
    }

    if (header && btnMaximize) {
      header.addEventListener('dblclick', () => {
        toggleMaximizeWindow(win, btnMaximize);
      });
    }

    // Drag-and-Drop handling
    if (header) {
      let isDragging = false;
      let startX, startY, initialLeft, initialTop;

      header.addEventListener('mousedown', dragStart);
      document.addEventListener('mousemove', dragMove);
      document.addEventListener('mouseup', dragEnd);

      header.addEventListener('touchstart', dragStart, { passive: true });
      document.addEventListener('touchmove', dragMove, { passive: false });
      document.addEventListener('touchend', dragEnd);

      function dragStart(e) {
        if (win.classList.contains('window-maximized')) return;
        if (e.target.closest('.win-btn')) return;
        focusWindow(win);

        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        isDragging = true;
        startX = clientX;
        startY = clientY;

        const rect = win.getBoundingClientRect();
        const parentRect = win.offsetParent.getBoundingClientRect();

        initialLeft = rect.left - parentRect.left;
        initialTop = rect.top - parentRect.top;
      }

      function dragMove(e) {
        if (!isDragging) return;
        if (e.type === 'touchmove') e.preventDefault();

        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        win.style.left = `${initialLeft + (clientX - startX)}px`;
        win.style.top = `${initialTop + (clientY - startY)}px`;
      }

      function dragEnd() {
        isDragging = false;
      }
    }
  });

  // Desktop folder + quest triggers
  const goLiveBtn = document.getElementById('btn-go-live');
  if (goLiveBtn) goLiveBtn.addEventListener('click', () => openWindow('win-live'));

  document.querySelectorAll('.desktop-icon-btn, .quest-btn, .plugin-chip[data-window], .game-lb-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const winId = btn.getAttribute('data-window');
      if (winId) openWindow(winId);
    });
  });

  // Start Menu Links
  document.querySelectorAll('.start-menu-item').forEach((item) => {
    item.addEventListener('click', () => {
      const winId = item.getAttribute('data-target');
      if (winId) openWindow(winId);
      startMenu.classList.remove('show');
      startBtn.setAttribute('aria-expanded', 'false');
    });
  });

  // Sync Taskbar apps
  function updateTaskbarAppButtons() {
    if (!taskbarApps) return;
    taskbarApps.innerHTML = '';

    windows.forEach((win) => {
      if (win.classList.contains('window-closed')) return;

      const winTitle = win.querySelector('.window-title').textContent;
      const winIcon = win.querySelector('.window-icon').textContent;

      const appBtn = document.createElement('button');
      appBtn.className = 'taskbar-app-btn';
      if (win.classList.contains('window-active')) appBtn.classList.add('active');
      if (win.classList.contains('window-minimized')) appBtn.classList.add('window-minimized');

      const appIcon = document.createElement('span');
      appIcon.className = 'taskbar-app-icon';
      appIcon.textContent = winIcon;

      const appLabel = document.createElement('span');
      appLabel.className = 'taskbar-app-label';
      appLabel.textContent = winTitle.replace(/\.[^.]+$/, '');
      appBtn.title = winTitle;
      appBtn.append(appIcon, appLabel);

      appBtn.addEventListener('click', () => {
        if (win.classList.contains('window-active')) {
          minimizeWindow(win);
        } else {
          win.classList.remove('window-minimized');
          focusWindow(win);
        }
      });

      taskbarApps.appendChild(appBtn);
    });

    syncViewportChromeVars();
  }

  updateTaskbarAppButtons();

  // Default windows on boot — staggered cascade that adapts to viewport width
  setTimeout(() => {
    const isDesktop = window.innerWidth >= 992;
    const area = document.querySelector('.desktop-area');
    const areaW = area ? area.clientWidth : window.innerWidth;
    const sidebarW = 330 + 24;
    const chatLeft = Math.max(60, Math.min(330, areaW - sidebarW - 540));

    const bootWindows = isDesktop
      ? [
          { id: 'win-chat', left: `${Math.max(150, chatLeft + 60)}px`, top: '140px' },
          { id: 'win-start-here', left: '40px', top: '64px' }
        ]
      : [
          { id: 'win-start-here', left: '12px', top: '48px' }
        ];

    bootWindows.forEach(({ id, left, top }) => {
      const win = document.getElementById(id);
      if (!win) return;

      win.classList.remove('window-closed', 'window-minimized', 'window-maximized');
      win.style.left = left;
      win.style.top = top;
      focusWindow(win);
    });
  }, 1900);

  // ================= SLIME VIRTUAL PET =================
  const slimeBody = document.getElementById('slime-pet');
  const slimeHabitat = document.getElementById('slime-habitat');
  const speechBubble = document.getElementById('slime-speech-bubble');
  const slimeMoodText = document.getElementById('slime-mood-text');
  const slimeHeartsEl = document.getElementById('slime-hearts');
  const slimeFollowerCountEl = document.getElementById('slime-follower-count');
  const slimeFollowersWrap = document.querySelector('.slime-followers');
  const slimeEnergyFill = document.getElementById('slime-energy-fill');
  const trayFans = document.getElementById('tray-fans');
  const btnFeed = document.getElementById('btn-feed');
  const btnPlay = document.getElementById('btn-play');
  const btnSleep = document.getElementById('btn-sleep');

  // --- persistent pet state ---
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
    }
  };

  const pet = {
    affection: store.get('yos-affection', 55),   // 0..100
    energy: 100,                                  // always boot at full health — the bar starts green
    followers: store.get('yos-followers', 0),
    totalPets: store.get('yos-total-pets', 0),
    mood: 'curious',
    sleeping: false,
    busy: false,        // eating / playing sequence lock
    dizzy: false
  };

  const MILESTONES = [10, 25, 50, 100, 200, 500];

  /* =====================================================
     v6.0 — THE WARDROBE
     Outfits are composited pixel-by-pixel onto the sprite
     frames at runtime (offscreen canvas → data URL), so every
     hat and scarf is welded to the body and squashes with it.
     35 light looks + 35 night looks + seasonal specials,
     rotated randomly. Zero extra image files.
     ===================================================== */
  const SLIME_SRC = {
    base: 'assets/slime_pet_cutout.png',
    sleep: 'assets/slime_sleep.png',
    eat: 'assets/slime_eat.png'
  };
  const SLIME_IMGS = {};
  Object.keys(SLIME_SRC).forEach((k) => {
    const im = new Image();
    im.src = SLIME_SRC[k];
    SLIME_IMGS[k] = im;
  });

  const OB = 11; // sprite art cell ≈ 11px on the 535×466 sheet
  function oR(ctx, cx, cy, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(cx * OB), Math.round(cy * OB), Math.round(w * OB), Math.round(h * OB));
  }
  const INK = '#2a0a20';

  /* ---------- outfit part library (drawn in cell coordinates) ----------
     head top spans cols ~8-40, rows 0-8 · eyes rows 18-24 (cols 10-17 / 30-35)
     cheeks cols 5-9 / 38-42 · scarf line rows 32-35 */
  const PARTS = {
    beret(ctx, c) { oR(ctx,13,3,20,3,c); oR(ctx,16,1,14,2,c); oR(ctx,22,0,3,2,INK); },
    cone(ctx, c1, c2) { oR(ctx,20,0,6,2,c1); oR(ctx,18,2,10,2,c1); oR(ctx,16,4,14,2,c1); oR(ctx,14,6,18,2,c2); oR(ctx,21,-1,4,2,c2); },
    wizard(ctx, c1, c2) { PARTS.cone(ctx,c1,c1); oR(ctx,12,7,22,2,c2); oR(ctx,19,3,2,2,'#ffe98a'); oR(ctx,24,5,2,2,'#ffe98a'); },
    crown(ctx) { oR(ctx,16,2,14,3,'#ffd94a'); oR(ctx,16,0,3,3,'#ffd94a'); oR(ctx,21,0,3,3,'#ffd94a'); oR(ctx,27,0,3,3,'#ffd94a'); oR(ctx,20,3,2,2,'#ff5fb0'); oR(ctx,25,3,2,2,'#6cc4f5'); },
    catEars(ctx, c) { oR(ctx,11,0,6,4,c); oR(ctx,12,1,3,3,'#ffb3dd'); oR(ctx,30,0,6,4,c); oR(ctx,31,1,3,3,'#ffb3dd'); },
    bunnyEars(ctx, c) { oR(ctx,14,-3,4,8,c); oR(ctx,15,-2,2,6,'#ffd7ec'); oR(ctx,28,-3,4,8,c); oR(ctx,29,-2,2,6,'#ffd7ec'); },
    bearEars(ctx, c) { oR(ctx,11,0,5,5,c); oR(ctx,12,1,3,3,'#a8794e'); oR(ctx,30,0,5,5,c); oR(ctx,31,1,3,3,'#a8794e'); },
    halo(ctx) { oR(ctx,17,-2,12,1,'#ffe98a'); oR(ctx,16,-1,2,1,'#ffe98a'); oR(ctx,28,-1,2,1,'#ffe98a'); },
    bow(ctx, c) { oR(ctx,13,1,4,4,c); oR(ctx,19,1,4,4,c); oR(ctx,17,2,2,2,INK); },
    sideBow(ctx, c) { oR(ctx,30,3,4,3,c); oR(ctx,35,3,4,3,c); oR(ctx,34,4,1,1,INK); },
    flower(ctx, c) { oR(ctx,31,1,3,3,c); oR(ctx,28,2,3,3,c); oR(ctx,34,2,3,3,c); oR(ctx,31,4,3,3,c); oR(ctx,31.5,2.5,2,2,'#ffe98a'); },
    sprout(ctx) { oR(ctx,22,-1,2,4,'#4ea564'); oR(ctx,19,-3,4,3,'#7ee0a3'); oR(ctx,24,-3,4,3,'#7ee0a3'); },
    antenna(ctx, c) { oR(ctx,22,-2,2,5,INK); oR(ctx,20,-5,6,4,c); oR(ctx,21,-4,2,2,'#fff'); },
    santa(ctx) { oR(ctx,14,4,20,3,'#e34a5f'); oR(ctx,17,1,14,3,'#e34a5f'); oR(ctx,24,-1,6,3,'#e34a5f'); oR(ctx,29,-2,4,4,'#fff'); oR(ctx,13,6,22,2,'#fff'); },
    pumpkin(ctx) { oR(ctx,15,2,17,5,'#f2913d'); oR(ctx,18,1,11,2,'#f2913d'); oR(ctx,22,-1,3,3,'#4ea564'); oR(ctx,18,4,3,2,INK); oR(ctx,26,4,3,2,INK); },
    gradCap(ctx) { oR(ctx,12,3,22,2,INK); oR(ctx,17,1,12,3,INK); oR(ctx,33,3,1,4,'#ffd94a'); oR(ctx,32,7,3,2,'#ffd94a'); },
    headphones(ctx, c) { oR(ctx,10,4,3,6,c); oR(ctx,33,4,3,6,c); oR(ctx,12,0,22,2,c); oR(ctx,10.5,5,2,4,'#fff'); },
    earmuffs(ctx, c) { oR(ctx,9,8,4,4,c); oR(ctx,33,8,4,4,c); oR(ctx,12,1,22,2,c); },
    cowboy(ctx, c) { oR(ctx,10,6,26,2,c); oR(ctx,15,2,16,4,c); oR(ctx,15,4,16,1,INK); },
    mushroom(ctx, c) { oR(ctx,13,2,20,4,c); oR(ctx,16,0,14,3,c); oR(ctx,17,1,3,2,'#fff'); oR(ctx,26,2,3,2,'#fff'); },
    strawHat(ctx) { oR(ctx,10,6,26,2,'#e8cf7a'); oR(ctx,15,2,16,4,'#e8cf7a'); oR(ctx,15,4,16,1,'#e34a5f'); },
    propeller(ctx) { oR(ctx,22,-2,2,3,INK); oR(ctx,16,-4,6,2,'#6cc4f5'); oR(ctx,24,-4,6,2,'#ff8fc7'); oR(ctx,21,-4,4,2,'#ffe98a'); },
    chefHat(ctx) { oR(ctx,15,3,16,4,'#fff'); oR(ctx,13,0,7,4,'#fff'); oR(ctx,20,-1,7,4,'#fff'); oR(ctx,27,0,7,4,'#fff'); oR(ctx,15,6,16,1,'#dcd3e8'); },
    beanie(ctx, c) { oR(ctx,13,2,20,5,c); oR(ctx,13,5,20,2,'#fff'); oR(ctx,21,-1,4,4,c); },
    leafClip(ctx) { oR(ctx,30,2,4,3,'#e8853d'); oR(ctx,33,1,3,3,'#e34a5f'); },
    snowClip(ctx) { oR(ctx,31,1,2,5,'#cfe9ff'); oR(ctx,29.5,2.5,5,2,'#cfe9ff'); oR(ctx,30,1,4,4,'rgba(207,233,255,0.4)'); },
    moonClip(ctx) { oR(ctx,31,1,4,5,'#ffe98a'); oR(ctx,33,2,3,3,'#ffb3dd'); },
    starGarland(ctx) { [12,20,28,34].forEach((x,i)=>oR(ctx,x,3+(i%2),2,2,i%2?'#ffe98a':'#8fd4fa')); },
    sleepMaskUp(ctx, c) { oR(ctx,12,8,22,3,c); oR(ctx,15,9,4,1,'#fff'); oR(ctx,27,9,4,1,'#fff'); },
    scarf(ctx, c1, c2) { oR(ctx,10,33,26,3,c1); oR(ctx,30,35,4,6,c1); oR(ctx,30,39,4,1,c2); oR(ctx,10,34,26,1,c2); },
    bowtie(ctx, c) { oR(ctx,18,34,4,4,c); oR(ctx,24,34,4,4,c); oR(ctx,22,35,2,2,INK); },
    glassesRound(ctx, c) { oR(ctx,9,17,9,6,'rgba(255,255,255,0.35)'); oR(ctx,29,17,9,6,'rgba(255,255,255,0.35)'); [[9,17,9,1],[9,22,9,1],[9,17,1,6],[17,17,1,6],[29,17,9,1],[29,22,9,1],[29,17,1,6],[37,17,1,6],[18,19,11,1]].forEach(([x,y,w,h])=>oR(ctx,x,y,w,h,c)); },
    glassesStar(ctx, c) { oR(ctx,9,16,9,7,c); oR(ctx,29,16,9,7,c); oR(ctx,18,18,11,1,c); oR(ctx,11,18,5,3,'#fff8'); oR(ctx,31,18,5,3,'#fff8'); },
    monocle(ctx) { PARTS.glassesRound(ctx,'#ffd94a'); },
    mustache(ctx) { oR(ctx,16,26,6,2,INK); oR(ctx,25,26,6,2,INK); },
    necklace(ctx, c) { [14,20,26,32].forEach((x)=>oR(ctx,x,36,2,2,c)); },
    balloon(ctx, c) { oR(ctx,42,4,4,5,c); oR(ctx,43,5,1,2,'#fff'); oR(ctx,44,9,1,8,INK); },
    wand(ctx) { oR(ctx,42,14,1,8,'#e8cf7a'); oR(ctx,40,10,5,5,'#ff8fc7'); oR(ctx,41.5,11.5,2,2,'#fff'); },
    capeKnot(ctx, c) { oR(ctx,8,30,4,4,c); oR(ctx,34,30,4,4,c); oR(ctx,10,32,26,2,c); },
    freckles(ctx) { [[8,24],[10,25],[36,24],[38,25]].forEach(([x,y])=>oR(ctx,x,y,1,1,'#e8853d')); },
    lanternPair(ctx) { oR(ctx,4,10,4,5,'#e34a5f'); oR(ctx,5,9,2,1,'#ffd94a'); oR(ctx,5,15,2,2,'#ffd94a'); oR(ctx,38,10,4,5,'#e34a5f'); oR(ctx,39,9,2,1,'#ffd94a'); oR(ctx,39,15,2,2,'#ffd94a'); }
  };

  // grumpy add-on: slanted brows + a tiny anger mark (used for the woken-up face)
  function drawGrumpy(ctx) {
    oR(ctx,10,14,3,1.5,INK); oR(ctx,12.5,15,3,1.5,INK); oR(ctx,15,16,2,1.5,INK);
    oR(ctx,33,14,3,1.5,INK); oR(ctx,30.5,15,3,1.5,INK); oR(ctx,28.5,16,2,1.5,INK);
    oR(ctx,40,6,1.5,4,'#e34a5f'); oR(ctx,38.7,7.2,4,1.5,'#e34a5f');
  }

  /* ---------- 35 light looks ---------- */
  const P = { pink:'#ff8fc7', deep:'#f0509f', lilac:'#c9a7f5', purple:'#9a6fe0', sky:'#8fd4fa', mint:'#7ee0a3', gold:'#ffd94a', red:'#e34a5f', cream:'#fff5e8', brown:'#c99860' };
  const LIGHT_OUTFITS = [
    { n:['classic ♡','classique ♡'], parts:[] },
    { n:['pink beret','béret rose'], parts:[['beret',P.pink]] },
    { n:['artist beret','béret d\'artiste'], parts:[['beret',P.sky],['freckles']] },
    { n:['royal crown','couronne royale'], parts:[['crown']] },
    { n:['cat mode','mode chat'], parts:[['catEars',P.lilac]] },
    { n:['bunny mode','mode lapin'], parts:[['bunnyEars','#fff']] },
    { n:['bear cub','ourson'], parts:[['bearEars',P.brown]] },
    { n:['tiny halo','petite auréole'], parts:[['halo']] },
    { n:['double bow','double nœud'], parts:[['bow',P.deep]] },
    { n:['side ribbon','ruban de côté'], parts:[['sideBow',P.sky]] },
    { n:['garden flower','fleur du jardin'], parts:[['flower',P.deep]] },
    { n:['fresh sprout','jeune pousse'], parts:[['sprout']] },
    { n:['love antenna','antenne à amour'], parts:[['antenna',P.deep]] },
    { n:['party cone','cône de fête'], parts:[['cone',P.sky,P.gold]] },
    { n:['wizard of CSS','mage du CSS'], parts:[['wizard',P.purple,P.lilac]] },
    { n:['grad cap','toque de diplôme'], parts:[['gradCap']] },
    { n:['lofi headphones','casque lofi'], parts:[['headphones',P.purple]] },
    { n:['cowboy howdy','cowboy howdy'], parts:[['cowboy',P.brown]] },
    { n:['mushroom cap','chapeau champignon'], parts:[['mushroom',P.red]] },
    { n:['beach straw hat','chapeau de paille'], parts:[['strawHat']], season:'summer' },
    { n:['propeller kid','hélico-casquette'], parts:[['propeller']] },
    { n:['pastry chef','chef pâtissier'], parts:[['chefHat'],['bowtie',P.deep]] },
    { n:['cozy beanie','bonnet douillet'], parts:[['beanie',P.mint]], season:'winter' },
    { n:['round glasses','lunettes rondes'], parts:[['glassesRound',INK]] },
    { n:['star shades','lunettes étoilées'], parts:[['glassesStar',P.deep]] },
    { n:['gentle-slime','slime distingué'], parts:[['monocle'],['mustache'],['bowtie',INK]] },
    { n:['stripe scarf','écharpe rayée'], parts:[['scarf',P.pink,P.sky]], season:'autumn' },
    { n:['pearl necklace','collier de perles'], parts:[['necklace','#fff']] },
    { n:['balloon day','jour de ballon'], parts:[['balloon',P.red]] },
    { n:['fairy wand','baguette de fée'], parts:[['wand'],['halo']] },
    { n:['hero cape','cape de héros'], parts:[['capeKnot',P.red]] },
    { n:['maple clip','pince érable'], parts:[['leafClip']], season:'autumn' },
    { n:['santa slime','slime de Noël'], parts:[['santa'],['scarf',P.red,'#fff']], season:'xmas' },
    { n:['pumpkin captain','capitaine citrouille'], parts:[['pumpkin']], season:'halloween' },
    { n:['lunar lanterns','lanternes lunaires'], parts:[['lanternPair'],['bow',P.red]], season:'cny' }
  ];

  /* ---------- 35 night looks ---------- */
  const N = { plum:'#7d5ec4', navy:'#4a3f8c', mauve:'#b79ae0', gold:'#ffe98a', ice:'#cfe9ff', rose:'#ff8fc7' };
  const DARK_OUTFITS = [
    { n:['classic nightcap','bonnet de nuit classique'], parts:[['cone',N.plum,N.rose],['sleepMaskUp',N.plum]] },
    { n:['star garland','guirlande d\'étoiles'], parts:[['starGarland']] },
    { n:['moon clip','pince de lune'], parts:[['moonClip']] },
    { n:['midnight beret','béret de minuit'], parts:[['beret',N.navy]] },
    { n:['dream wizard','mage des rêves'], parts:[['wizard',N.navy,N.plum]] },
    { n:['night cat','chat de nuit'], parts:[['catEars',N.plum]] },
    { n:['dream bunny','lapin des rêves'], parts:[['bunnyEars',N.mauve]] },
    { n:['sleepy halo','auréole endormie'], parts:[['halo'],['sleepMaskUp',N.plum]] },
    { n:['navy bow','nœud marine'], parts:[['bow',N.navy]] },
    { n:['moonflower','fleur de lune'], parts:[['flower',N.mauve]] },
    { n:['star antenna','antenne étoilée'], parts:[['antenna',N.gold]] },
    { n:['pyjama cone','cône pyjama'], parts:[['cone',N.mauve,N.ice]] },
    { n:['night scholar','érudit nocturne'], parts:[['gradCap'],['glassesRound',N.ice]] },
    { n:['asmr headphones','casque asmr'], parts:[['headphones',N.navy]] },
    { n:['night ranger','ranger de nuit'], parts:[['cowboy',N.navy]] },
    { n:['glow mushroom','champignon luisant'], parts:[['mushroom',N.plum]] },
    { n:['dream propeller','hélice des rêves'], parts:[['propeller']] },
    { n:['midnight snack chef','chef du goûter de minuit'], parts:[['chefHat']] },
    { n:['winter night beanie','bonnet de nuit d\'hiver'], parts:[['beanie',N.navy]], season:'winter' },
    { n:['moon spectacles','bésicles de lune'], parts:[['glassesRound',N.gold]] },
    { n:['star shades (night)','lunettes étoilées (nuit)'], parts:[['glassesStar',N.plum]] },
    { n:['count slime','comte slime'], parts:[['monocle'],['capeKnot',N.navy]] },
    { n:['comet scarf','écharpe comète'], parts:[['scarf',N.plum,N.gold]] },
    { n:['star necklace','collier d\'étoiles'], parts:[['necklace',N.gold]] },
    { n:['moon balloon','ballon de lune'], parts:[['balloon',N.gold]] },
    { n:['sandman wand','baguette du marchand de sable'], parts:[['wand']] },
    { n:['dream cape','cape des rêves'], parts:[['capeKnot',N.plum]] },
    { n:['frost clip','pince de givre'], parts:[['snowClip']], season:'winter' },
    { n:['midnight santa','père noël de minuit'], parts:[['santa']], season:'xmas' },
    { n:['spooky pumpkin','citrouille spectrale'], parts:[['pumpkin']], season:'halloween' },
    { n:['bear of hibernation','ours en hibernation'], parts:[['bearEars',N.navy],['scarf',N.navy,N.ice]] },
    { n:['sleep mask up','masque relevé'], parts:[['sleepMaskUp',N.rose]] },
    { n:['night freckles','taches de rousseur nocturnes'], parts:[['freckles'],['moonClip']] },
    { n:['lantern night','nuit des lanternes'], parts:[['lanternPair']], season:'cny' },
    { n:['sidebow dreamer','rêveur au ruban'], parts:[['sideBow',N.mauve],['starGarland']] }
  ];

  function seasonTags() {
    const d = new Date(), m = d.getMonth() + 1, day = d.getDate();
    const tags = [];
    if (m === 12 || m <= 2) tags.push('winter');
    if (m >= 3 && m <= 5) tags.push('spring');
    if (m >= 6 && m <= 8) tags.push('summer');
    if (m >= 9 && m <= 11) tags.push('autumn');
    if (m === 12 && day >= 15) tags.push('xmas');
    if (m === 10 && day >= 20) tags.push('halloween');
    if ((m === 1 && day >= 18) || (m === 2 && day <= 12)) tags.push('cny');
    if (m === 2 && day >= 10 && day <= 15) tags.push('valentine');
    return tags;
  }

  var currentOutfit = null;
  var OUTFIT_FRAMES = null; // { base, sleep, eat, grumpy } data URLs
  const outfitCanvas = document.createElement('canvas');
  outfitCanvas.width = 535; outfitCanvas.height = 466;

  function composeOutfit(outfit) {
    const ctx = outfitCanvas.getContext('2d');
    const frames = {};
    let ok = true;
    ['base', 'sleep', 'eat'].forEach((k) => {
      const im = SLIME_IMGS[k];
      if (!im.complete || !im.naturalWidth) { ok = false; return; }
      ctx.clearRect(0, 0, 535, 466);
      ctx.drawImage(im, 0, 0);
      outfit.parts.forEach(([fn, ...args]) => { try { PARTS[fn](ctx, ...args); } catch (e) { /* a hat refused to fit */ } });
      frames[k] = outfitCanvas.toDataURL();
      if (k === 'base') {
        drawGrumpy(ctx);
        frames.grumpy = outfitCanvas.toDataURL();
      }
    });
    return ok ? frames : null;
  }

  function wardrobePool() {
    return (resolvedTheme() === 'dark') ? DARK_OUTFITS : LIGHT_OUTFITS;
  }

  function pickOutfit() {
    const pool = wardrobePool();
    const tags = seasonTags();
    const weighted = [];
    pool.forEach((o) => {
      if (o.season && !tags.includes(o.season)) return; // seasonal looks wait their turn
      const w = o.season ? 4 : 1;
      for (let i = 0; i < w; i++) weighted.push(o);
    });
    let o = weighted[Math.floor(Math.random() * weighted.length)] || pool[0];
    if (currentOutfit && o === currentOutfit && weighted.length > 1) {
      o = weighted[Math.floor(Math.random() * weighted.length)];
    }
    return o;
  }

  function wearOutfit(outfit, announce) {
    const frames = composeOutfit(outfit);
    if (!frames) { setTimeout(() => wearOutfit(outfit, announce), 600); return; }
    currentOutfit = outfit;
    OUTFIT_FRAMES = frames;
    setSlimeFrame(currentFrame, true);
    if (announce && !pet.sleeping && !pet.busy && typeof ghostHidden === 'function' && !ghostHidden()) {
      showBubble(trT(`today's fit: ${outfit.n[0]} ♡`, `tenue du jour : ${outfit.n[1]} ♡`), 2400);
    }
  }

  function rotateOutfit(announce) { wearOutfit(pickOutfit(), announce); }

  // fresh look every 50–90 seconds, plus on theme change
  (function outfitLoop() {
    setTimeout(() => {
      if (!document.hidden) rotateOutfit(Math.random() < 0.35);
      outfitLoop();
    }, 50000 + Math.random() * 40000);
  })();

  const slimeImg = slimeBody ? slimeBody.querySelector('img') : null;
  let currentFrame = 'base';

  function setSlimeFrame(name, force) {
    if (!slimeImg) return;
    if (!force && currentFrame === name) return;
    currentFrame = name;
    if (OUTFIT_FRAMES && OUTFIT_FRAMES[name]) slimeImg.src = OUTFIT_FRAMES[name];
    else if (SLIME_SRC[name]) slimeImg.src = SLIME_SRC[name];
  }

  // theme change = wardrobe change (the pool swaps day/night racks)
  function setSlimeSkin() { rotateOutfit(false); }

  const idlePhrases = [
    'Thanks for the follow!! ♡',
    'chat, be nice to the recruiter',
    'sudo pet me',
    'my code compiles AND I\'m cute',
    'combo me! click click click ♡',
    'deploying hugs to prod...',
    '404: snack not found',
    'I byte, but only softly',
    'CSS is my favorite side quest',
    'today\'s stream: petting simulator',
    'wanna see my quest log?',
    'I was hand-pixelled with love'
  ];

  const petPhrases = [
    'hehe ♡', 'more!! more!!', '+1 follower!!', 'so warm...',
    'you\'re hired as my mod ♡', 'boing boing!', 'my affection.exe is running'
  ];

  let speechTimeout = null;
  let slimeLoopTimer = null;
  const slimePosition = { x: 0, y: 0 };
  const slimeActionClasses = [
    'is-hop', 'is-happy', 'is-alert', 'is-nap', 'is-think',
    'is-forage', 'is-follow', 'is-flip', 'is-dizzy', 'is-eat', 'is-glitch'
  ];
  const slimeForagePoints = [
    { x: -0.72, y: -0.26 },
    { x: -0.46, y: 0.24 },
    { x: -0.12, y: -0.18 },
    { x: 0.34, y: 0.2 },
    { x: 0.68, y: -0.22 }
  ];

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // --- HUD ---
  function updateSlimeHud() {
    if (slimeMoodText) slimeMoodText.textContent = translateMood(pet.mood);

    if (slimeHeartsEl) {
      // house rule: the love meter never drops. ever.
      [...slimeHeartsEl.children].forEach((span) => {
        span.textContent = '♥';
        span.classList.remove('heart-empty');
      });
    }

    if (slimeFollowerCountEl) slimeFollowerCountEl.textContent = String(pet.followers);
    if (trayFans) trayFans.textContent = `★${pet.followers}`;

    if (slimeEnergyFill) {
      slimeEnergyFill.style.width = `${pet.energy}%`;
      slimeEnergyFill.classList.toggle('energy-low', pet.energy < 30);
      const bar = slimeEnergyFill.parentElement;
      if (bar) {
        bar.setAttribute('role', 'meter');
        bar.setAttribute('aria-valuemin', '0');
        bar.setAttribute('aria-valuemax', '100');
        bar.setAttribute('aria-valuenow', String(pet.energy));
        bar.setAttribute('aria-label', `slime energy ${pet.energy}%`);
      }
    }

    slimeBody.classList.toggle('is-angel', pet.affection >= 96);

    store.set('yos-affection', pet.affection);
    store.set('yos-energy', pet.energy);
    store.set('yos-followers', pet.followers);
    store.set('yos-total-pets', pet.totalPets);

    // health protocol: the bar is never allowed to stay red
    maybeAutoNap();
  }

  function gainFollowers(n) {
    const before = pet.followers;
    pet.followers += n;
    if (slimeFollowersWrap) {
      slimeFollowersWrap.classList.remove('fans-bump');
      void slimeFollowersWrap.offsetWidth;
      slimeFollowersWrap.classList.add('fans-bump');
    }
    const crossed = MILESTONES.find(m => before < m && pet.followers >= m);
    if (crossed) celebrateMilestone(crossed);
    updateSlimeHud();
  }

  function celebrateMilestone(milestone) {
    playFanfare();
    showBubble(`${milestone} FANS!! I'm gonna cry ♡`, 3200);
    pet.mood = 'euphoric';
    // confetti burst across the habitat
    for (let i = 0; i < 16; i++) {
      setTimeout(() => {
        const arena = petArena();
        const x = 12 + Math.random() * (arena.clientWidth - 24);
        const y = 20 + Math.random() * (arena.clientHeight - 50);
        spawnParticle(x, y, ['🎉', '♥', '✦', '★', '🎀'][i % 5]);
      }, i * 70);
    }
  }

  // --- speech bubble ---
  function showBubble(text, duration = 2500, allowWhileAway = false) {
    if (!speechBubble) return;
    // while the slime is in bed (dark mode), only sleep-talk may surface
    if (typeof ghostHidden === 'function' && ghostHidden() && !allowWhileAway) return;
    if (speechTimeout) clearTimeout(speechTimeout);

    speechBubble.textContent = text;
    speechBubble.classList.add('show-bubble');

    speechTimeout = setTimeout(() => {
      speechBubble.classList.remove('show-bubble');
    }, duration);
  }

  function randomPhrase(list = dynD().idle) {
    return list[Math.floor(Math.random() * list.length)];
  }

  // --- particles ---
  function spawnParticle(x, y, char, cls = '') {
    if (!petArena()) return;
    if (REDUCED_MOTION) return;
    const p = document.createElement('span');
    p.className = `pet-particle ${cls}`.trim();
    p.textContent = char;
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.setProperty('--px', `${Math.round((Math.random() - 0.5) * 36)}px`);
    p.style.setProperty('--pr', `${Math.round((Math.random() - 0.5) * 80)}deg`);
    petArena().appendChild(p);
    p.addEventListener('animationend', () => p.remove());
  }

  function slimeAnchor() {
    // slime's current center, in arena coordinates
    const habitatRect = petArena().getBoundingClientRect();
    const petRect = slimeBody.getBoundingClientRect();
    return {
      x: petRect.left - habitatRect.left + petRect.width / 2,
      y: petRect.top - habitatRect.top + petRect.height / 3
    };
  }

  function burstAtSlime(chars, count = 5) {
    const { x, y } = slimeAnchor();
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        spawnParticle(
          x + (Math.random() - 0.5) * 40,
          y + (Math.random() - 0.5) * 16,
          chars[Math.floor(Math.random() * chars.length)]
        );
      }, i * 60);
    }
  }

  // --- movement engine ---
  function petArena() {
    return (slimeBody && slimeBody.closest('.pet-arena')) || slimeHabitat;
  }

  function getSlimeBounds() {
    const habitat = petArena().getBoundingClientRect();
    const petRect = slimeBody.getBoundingClientRect();
    return {
      x: Math.max(18, Math.floor((habitat.width - petRect.width) / 2) - 12),
      y: Math.max(12, Math.floor((habitat.height - petRect.height) / 2) - 8)
    };
  }

  function setSlimeAction(actionClass) {
    slimeBody.classList.remove(...slimeActionClasses);
    if (actionClass) {
      void slimeBody.offsetWidth;
      slimeBody.classList.add(actionClass);
    }
  }

  function chooseForageTarget(bounds) {
    const point = slimeForagePoints[Math.floor(Math.random() * slimeForagePoints.length)];
    return {
      x: Math.round(bounds.x * point.x),
      y: Math.round(bounds.y * point.y)
    };
  }

  function applySlimeTransform(scale = 1, tilt = 0, duration = 900) {
    slimeBody.style.setProperty('--slime-x', `${slimePosition.x}px`);
    slimeBody.style.setProperty('--slime-y', `${slimePosition.y}px`);
    slimeBody.style.setProperty('--slime-scale', String(scale));
    slimeBody.style.setProperty('--slime-tilt', `${tilt}deg`);
    slimeBody.style.setProperty('--slime-step', `${Math.round(duration)}ms`);
  }

  function moveSlime({
    action = 'idle',
    mood = 'curious',
    phrase = '',
    duration = 1100,
    distance = 1,
    target = null,
    scheduleNext = true
  } = {}) {
    if (!slimeBody) return;

    const bounds = getSlimeBounds();
    let nextX = slimePosition.x;
    let nextY = slimePosition.y;
    let scale = 1;
    let tilt = 0;
    let actionClass = '';

    if (action === 'walk') {
      nextX = clamp(slimePosition.x + Math.round((Math.random() - 0.5) * 42 * distance), -bounds.x, bounds.x);
      nextY = clamp(slimePosition.y + Math.round((Math.random() - 0.5) * 20 * distance), -bounds.y, bounds.y);
      tilt = clamp((nextX - slimePosition.x) / 16, -3, 3);
      actionClass = 'is-forage';
    } else if (action === 'forage') {
      const forageTarget = target || chooseForageTarget(bounds);
      nextX = clamp(Math.round(slimePosition.x + (forageTarget.x - slimePosition.x) * 0.55), -bounds.x, bounds.x);
      nextY = clamp(Math.round(slimePosition.y + (forageTarget.y - slimePosition.y) * 0.55), -bounds.y, bounds.y);
      tilt = clamp((nextX - slimePosition.x) / 18, -3, 3);
      actionClass = 'is-forage';
    } else if (action === 'goto' && target) {
      nextX = clamp(target.x, -bounds.x, bounds.x);
      nextY = clamp(target.y, -bounds.y, bounds.y);
      tilt = clamp((nextX - slimePosition.x) / 18, -3, 3);
      actionClass = 'is-follow';
    } else if (action === 'hop' || action === 'happy') {
      nextX = clamp(slimePosition.x + Math.round((Math.random() - 0.5) * 42 * distance), -bounds.x, bounds.x);
      nextY = clamp(slimePosition.y + Math.round((Math.random() - 0.5) * 18 * distance), -bounds.y, bounds.y);
      scale = action === 'happy' ? 1.04 : 1;
      actionClass = action === 'happy' ? 'is-happy' : 'is-hop';
    } else if (action === 'nap') {
      nextY = clamp(slimePosition.y + 5, -bounds.y, bounds.y);
      scale = 0.98;
      actionClass = 'is-nap';
    } else if (action === 'alert') {
      tilt = Math.random() > 0.5 ? 3 : -3;
      actionClass = 'is-alert';
    } else if (action === 'think') {
      actionClass = 'is-think';
    } else if (action === 'flip') {
      actionClass = 'is-flip';
    } else if (action === 'dizzy') {
      actionClass = 'is-dizzy';
    } else if (action === 'eat') {
      actionClass = 'is-eat';
    }

    slimePosition.x = nextX;
    slimePosition.y = nextY;
    pet.mood = mood;

    // expression frame follows the action
    if (action === 'nap') setSlimeFrame('sleep');
    else if (action === 'eat') setSlimeFrame('eat');
    else setSlimeFrame('base');

    applySlimeTransform(scale, tilt, duration);
    setSlimeAction(actionClass);
    updateSlimeHud();

    if (phrase) {
      showBubble(phrase, action === 'nap' ? 1800 : 2400);
      if (action !== 'nap') playTone(987.77, 'sine', 0.08, 0, 0.05);
    }

    if (scheduleNext) {
      if (slimeLoopTimer) clearTimeout(slimeLoopTimer);
      slimeLoopTimer = setTimeout(runSlimeLoop, duration + 260 + Math.random() * 700);
    }
  }

  function pauseSlimeLoop(ms) {
    if (slimeLoopTimer) clearTimeout(slimeLoopTimer);
    slimeLoopTimer = setTimeout(runSlimeLoop, ms);
  }

  function runSlimeLoop() {
    if (!slimeBody || pet.sleeping || pet.busy || isGrabbing) {
      pauseSlimeLoop(1200);
      return;
    }

    // in bed (dark mode): no wandering, no awake chatter — only sleep-talk
    if (typeof ghostHidden === 'function' && ghostHidden()) {
      if (Math.random() < 0.78) dreamTalk();
      pauseSlimeLoop(3400 + Math.random() * 2200);
      return;
    }
    // announced bedtime, lights about to go out: move quietly, say nothing
    if (typeof nightRetireTimer !== 'undefined' && nightRetireTimer) {
      pauseSlimeLoop(2400);
      return;
    }

    const roll = Math.random();
    const tired = pet.energy < 25;

    if (tired && roll < 0.5) {
      moveSlime({ action: 'nap', mood: 'exhausted', phrase: roll < 0.2 ? trT('low battery... feed me?', 'batterie faible... tu me nourris ?') : '', duration: 1900 });
    } else if (roll < 0.30) {
      moveSlime({ action: 'idle', mood: 'curious', duration: 1200 + Math.random() * 1000 });
    } else if (roll < 0.58) {
      moveSlime({ action: 'forage', mood: 'foraging', duration: 1350 + Math.random() * 650 });
    } else if (roll < 0.72) {
      moveSlime({ action: 'walk', mood: 'wandering', duration: 1100 + Math.random() * 600 });
    } else if (roll < 0.82) {
      moveSlime({ action: 'hop', mood: 'bouncy', duration: 760 });
    } else if (roll < 0.93) {
      moveSlime({ action: 'think', mood: 'debugging', phrase: randomPhrase(), duration: 1400 });
    } else {
      moveSlime({ action: 'alert', mood: 'listening', phrase: trT('chat? you there?', 'le chat ? vous êtes là ?'), duration: 1000 });
    }
  }

  // --- petting: clicks, combos, dizziness, glitch easter egg ---
  let comboCount = 0;
  let comboTimer = null;
  let lastPetAt = 0;

  function showComboFloat(text) {
    if (REDUCED_MOTION) return;
    const { x, y } = slimeAnchor();
    const el = document.createElement('span');
    el.className = 'combo-float';
    el.textContent = text;
    const arena = petArena();
    el.style.left = `${clamp(x - 20, 4, arena.clientWidth - 60)}px`;
    el.style.top = `${clamp(y - 40, 4, arena.clientHeight - 30)}px`;
    arena.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  function triggerGlitchMode() {
    playGlitchSound();
    slimeHabitat.classList.add('glitch-mode');
    setSlimeAction('is-glitch');
    pet.mood = 'l0v3_0v3rfl0w';
    showBubble(trT('ERR0R: love_overflow ♡♡♡', 'ERREUR : débordement_d\'amour ♡♡♡'), 2600);
    updateSlimeHud();
    setTimeout(() => {
      slimeHabitat.classList.remove('glitch-mode');
      setSlimeAction('');
      pet.mood = 'recovered';
      showBubble(trT('...I\'m ok. that was the good kind of crash', '...ça va. c\'était le bon genre de plantage'), 2400);
      updateSlimeHud();
    }, 2100);
    pauseSlimeLoop(4800);
  }

  function petSlime() {
    if (pet.busy || isGrabbing) return;
    if (typeof ghostHidden === 'function' && ghostHidden()) {
      ghostAppear(0, awayLine('wake'));
      gainFollowers(1);
      return;
    }
    const now = Date.now();

    if (pet.sleeping) {
      wakeSlime(true);
      return;
    }

    if (pet.dizzy) return;

    // combo tracking
    if (now - lastPetAt < 900) {
      comboCount++;
    } else {
      comboCount = 1;
    }
    lastPetAt = now;
    if (comboTimer) clearTimeout(comboTimer);
    comboTimer = setTimeout(() => { comboCount = 0; }, 1100);

    pet.totalPets++;
    pet.affection = clamp(pet.affection + 2, 0, 100);
    gainFollowers(1);

    playComboSound(comboCount);
    burstAtSlime(['♥', '♡', '✦'], comboCount >= 3 ? 4 : 2);

    if (comboCount >= 3) {
      showComboFloat(`x${comboCount} ♡`);
    }

    // overload: too much attention
    if (comboCount >= 9) {
      comboCount = 0;
      pet.dizzy = true;
      moveSlime({ action: 'dizzy', mood: 'overstimulated', phrase: trT('T-TOO MUCH ATTENTION!!', 'T-TROP D\'ATTENTION !!'), duration: 1800, scheduleNext: false });
      setTimeout(() => {
        pet.dizzy = false;
        moveSlime({ action: 'idle', mood: 'recovering', duration: 900 });
      }, 2200);
      return;
    }

    // glitch easter egg at 30 pets, then every 60
    if (pet.totalPets === 30 || (pet.totalPets > 30 && (pet.totalPets - 30) % 60 === 0)) {
      triggerGlitchMode();
      return;
    }

    const isAngel = pet.affection >= 96;
    moveSlime({
      action: 'happy',
      mood: isAngel ? 'angelic' : 'loved',
      phrase: isAngel && Math.random() < 0.4 ? 'MAX AFFECTION!! I ascend ♡' : randomPhrase(dynD().pet),
      duration: 700,
      distance: 0.25
    });
  }

  // --- double-click trick ---
  function slimeTrick() {
    if (pet.busy || pet.sleeping || isGrabbing) return;
    playSparkleSound();
    gainFollowers(3);
    burstAtSlime(['★', '✦', '♥'], 6);
    moveSlime({ action: 'flip', mood: 'show-off', phrase: trT('FRONTEND FLIP!!', 'SALTO FRONTEND !!'), duration: 800 });
  }

  // --- drag & carry (pointer events) ---
  let isGrabbing = false;
  let grabMoved = false;
  let suppressNextClick = false;
  let grabPointerId = null;

  function habitatPointToSlimeCoords(clientX, clientY) {
    const habitat = petArena().getBoundingClientRect();
    const bounds = getSlimeBounds();
    return {
      x: clamp(Math.round(clientX - habitat.left - habitat.width / 2), -bounds.x, bounds.x),
      y: clamp(Math.round(clientY - habitat.top - 62 - 37), -bounds.y, bounds.y)
    };
  }

  slimeBody.addEventListener('pointerdown', (e) => {
    if (pet.busy) return;
    grabPointerId = e.pointerId;
    isGrabbing = true;
    grabMoved = false;
    slimeBody.setPointerCapture(e.pointerId);
  });

  slimeBody.addEventListener('pointermove', (e) => {
    if (!isGrabbing || e.pointerId !== grabPointerId) return;

    const { x, y } = habitatPointToSlimeCoords(e.clientX, e.clientY);
    const dx = x - slimePosition.x;
    const dy = y - slimePosition.y;

    if (!grabMoved && Math.hypot(dx, dy) > 7) {
      grabMoved = true;
      playPickupSound();
      setSlimeAction('');
      slimeBody.classList.add('is-grabbed');
      pet.mood = 'carried';
      showBubble(trT('whee!! I\'m flying', 'wiii !! je vole'), 1400);
      updateSlimeHud();
    }

    if (grabMoved) {
      slimePosition.x = x;
      slimePosition.y = y;
      applySlimeTransform(1, clamp(dx / 4, -8, 8), 60);
    }
  });

  function endGrab(e) {
    if (!isGrabbing || (e && e.pointerId !== grabPointerId)) return;
    isGrabbing = false;
    grabPointerId = null;

    if (grabMoved) {
      suppressNextClick = true;
      slimeBody.classList.remove('is-grabbed');
      playDropSound();
      burstAtSlime(['✦', '·', '˚'], 4);
      moveSlime({ action: 'hop', mood: 'bounced', phrase: Math.random() < 0.5 ? trT('safe landing!', 'atterrissage réussi !') : trT('do it again!!', 'encore une fois !!'), duration: 620, distance: 0.2 });
      gainFollowers(1);
      setTimeout(() => { suppressNextClick = false; }, 300);
    }
    grabMoved = false;
  }

  slimeBody.addEventListener('pointerup', endGrab);
  slimeBody.addEventListener('pointercancel', endGrab);

  slimeBody.addEventListener('click', (e) => {
    e.stopPropagation();
    if (suppressNextClick) return;
    petSlime();
  });

  slimeBody.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    if (suppressNextClick) return;
    slimeTrick();
  });

  slimeBody.addEventListener('focus', () => {
    if (!pet.sleeping && !pet.busy) {
      showBubble(trT('press Enter to pet me ♡', 'appuyez sur Entrée pour me caresser ♡'), 1800);
    }
  });

  // --- feeding ---
  const CANDY_CHARS = ['🍬', '🧁', '🍓', '🍡'];
  let activeCandy = null;

  function feedSlime() {
    if (pet.busy || activeCandy) return;
    if (typeof ghostHidden === 'function' && ghostHidden()) ghostAppear(0, false);
    if (pet.sleeping) { wakeSlime(false); }

    if (pet.energy >= 98) {
      showBubble(trT('I\'m full!! save it for stream snacks', 'je suis plein !! garde ça pour le goûter du stream'), 2200);
      moveSlime({ action: 'alert', mood: 'stuffed', duration: 900 });
      return;
    }

    playClickSound();
    pet.busy = true;

    const bounds = getSlimeBounds();
    const targetX = Math.round((Math.random() - 0.5) * 2 * bounds.x * 0.8);
    const targetY = Math.round((Math.random() - 0.5) * 2 * bounds.y * 0.7);

    // drop the candy into the habitat (habitat px coords)
    const candy = document.createElement('span');
    candy.className = 'pet-candy';
    candy.textContent = CANDY_CHARS[Math.floor(Math.random() * CANDY_CHARS.length)];
    const arena = petArena();
    candy.style.left = `${arena.clientWidth / 2 + targetX - 9}px`;
    candy.style.top = `${arena.clientHeight / 2 + targetY}px`;
    arena.appendChild(candy);
    activeCandy = candy;

    // slime notices, then waddles over
    moveSlime({ action: 'alert', mood: 'snack radar ON', phrase: trT('SNACK DETECTED', 'FRIANDISE DÉTECTÉE'), duration: 500, scheduleNext: false });

    setTimeout(() => {
      moveSlime({ action: 'goto', mood: 'hungry', target: { x: targetX, y: targetY }, duration: 950, scheduleNext: false });
    }, 550);

    // arrive + eat
    setTimeout(() => {
      if (activeCandy) { activeCandy.remove(); activeCandy = null; }
      playEatSound();
      pet.energy = clamp(pet.energy + 22, 0, 100);
      pet.affection = clamp(pet.affection + 4, 0, 100);
      burstAtSlime(['·', '✦', '♡'], 4);
      const { x, y } = slimeAnchor();
      spawnParticle(x - 8, y + 14, '·', 'p-crumb');
      spawnParticle(x + 10, y + 12, '·', 'p-crumb');
      moveSlime({ action: 'eat', mood: 'munching', phrase: trT('nom nom nom...', 'miam miam miam...'), duration: 1100, scheduleNext: false });
    }, 1650);

    // done
    setTimeout(() => {
      pet.busy = false;
      gainFollowers(2);
      moveSlime({ action: 'happy', mood: 'grateful', phrase: trT('+22 energy! ty chef ♡', '+22 énergie ! merci chef ♡'), duration: 800 });
    }, 2900);
  }

  // --- playing ---
  function playWithSlime() {
    if (pet.busy) return;
    if (typeof ghostHidden === 'function' && ghostHidden()) ghostAppear(0, false);
    if (pet.sleeping) { wakeSlime(false); }

    if (pet.energy < 18) {
      showBubble(trT('no energy... snack first? 🥺', 'plus d\'énergie... une friandise d\'abord ? 🥺'), 2200);
      moveSlime({ action: 'nap', mood: 'drained', duration: 1200 });
      return;
    }

    playSparkleSound();
    pet.busy = true;
    pet.energy = clamp(pet.energy - 14, 0, 100);
    pet.affection = clamp(pet.affection + 6, 0, 100);

    const hops = [0, 480, 960];
    hops.forEach((delay, i) => {
      setTimeout(() => {
        playTone(700 + i * 120, 'triangle', 0.1, 0, 0.05);
        burstAtSlime(['✦', '★'], 2);
        moveSlime({
          action: 'hop',
          mood: 'zoomies',
          phrase: i === 1 ? trT('ZOOMIES!!', 'ZOOMIES !!') : '',
          duration: 440,
          distance: 1.6,
          scheduleNext: false
        });
      }, delay);
    });

    setTimeout(() => {
      pet.busy = false;
      gainFollowers(2);
      moveSlime({ action: 'happy', mood: 'giddy', phrase: trT('best. stream. ever.', 'meilleur. stream. de tous les temps.'), duration: 800 });
    }, 1600);
  }

  // --- napping ---
  let sleepTimer = null;
  let sleepZzzTimer = null;

  function sleepSlime() {
    if (pet.busy || pet.sleeping) return;
    if (typeof ghostHidden === 'function' && ghostHidden()) ghostAppear(0, false);

    playCloseSound();
    pet.sleeping = true;
    pet.mood = 'sleeping';
    slimeHabitat.classList.add('night-mode');
    moveSlime({ action: 'nap', mood: 'sleeping', phrase: trT('sleep(4000)... zzz', 'sleep(4000)... zzz'), duration: 1400, scheduleNext: false });

    sleepZzzTimer = setInterval(() => {
      const { x, y } = slimeAnchor();
      spawnParticle(x + 18, y - 20, 'z', 'p-zzz');
    }, 900);

    sleepTimer = setTimeout(() => wakeSlime(false), 4200);
  }

  function wakeSlime(grumpy) {
    if (!pet.sleeping) return;
    pet.sleeping = false;
    if (sleepTimer) clearTimeout(sleepTimer);
    if (sleepZzzTimer) clearInterval(sleepZzzTimer);
    slimeHabitat.classList.remove('night-mode');

    // naps always refill to 100% — grumpy or not, the bar comes back green
    pet.energy = 100;

    if (grumpy) {
      playTone(220, 'sawtooth', 0.18, 0, 0.06);
      moveSlime({ action: 'alert', mood: 'grumpy', phrase: trT('I was DREAMING about shipping!!', 'je RÊVAIS qu\'on livrait en prod !!'), duration: 1100 });
      setSlimeFrame('grumpy', true);
      setTimeout(() => { if (currentFrame === 'grumpy') setSlimeFrame('base', true); }, 2600);
      pet.affection = clamp(pet.affection - 1, 0, 100);
    } else {
      playStartupChime();
      moveSlime({ action: 'happy', mood: 'refreshed', phrase: dynD().napDone, duration: 900 });
    }
    updateSlimeHud();
  }

  if (btnFeed) btnFeed.addEventListener('click', feedSlime);
  if (btnPlay) btnPlay.addEventListener('click', playWithSlime);
  if (btnSleep) btnSleep.addEventListener('click', sleepSlime);

  // --- idle blinking (uses the closed-eye frame for a couple of ticks) ---
  (function blinkLoop() {
    setTimeout(() => {
      if (!pet.sleeping && !pet.busy && !isGrabbing && currentFrame === 'base' && !document.hidden) {
        setSlimeFrame('sleep');
        setTimeout(() => {
          if (!pet.sleeping && currentFrame === 'sleep') setSlimeFrame('base');
        }, 150);
      }
      blinkLoop();
    }, 3200 + Math.random() * 4800);
  })();

  // --- slime notices opened windows ---
  const windowReactions = {
    'win-career': 'ooh, my quest log! the AWS arc is my fave',
    'win-skills': 'my inventory! don\'t touch the Python, it\'s equipped',
    'win-chat': 'chat\'s here!! everyone behave',
    'win-education': 'two degrees!! pat pat',
    'win-start-here': 'read the tips! there\'s a secret in there...',
    'win-ama': 'the bot knows everything about her. EVERYTHING.',
    'win-terminal': 'ooh, hacker mode!! type neofetch, trust me'
  };

  function slimeReactToWindow(win) {
    if (pet.sleeping || pet.busy || Math.random() < 0.45) return;
    const line = windowReactions[win.id];
    if (line) showBubble(line, 2600);
  }

  // --- passive stat drift ---
  setInterval(() => {
    if (pet.sleeping) return;
    pet.energy = clamp(pet.energy - 1, 8, 100);
    if (Math.random() < 0.3) pet.affection = clamp(pet.affection - 1, 20, 100);
    updateSlimeHud();
  }, 25000);

  updateSlimeHud();
  runSlimeLoop();

  // ================= STREAM CHAT SIMULATION =================
  const chatFeed = document.getElementById('chat-feed');
  const chatWindow = document.getElementById('win-chat');
  const chatViewerCount = document.getElementById('chat-viewer-count');

  const chatMessages = [
    { u: 'recruiter_chan', c: '#f0509f', t: 'wait. she hand-built this whole OS site? no framework???', f: 'attendez. elle a construit tout ce site-OS à la main ? sans framework ???' },
    { u: 'aws_wizard', c: '#6cc4f5', t: 'she ran a production Moodle on EC2 — auto-heal, S3 DR backups, the works 😭', f: 'elle fait tourner un Moodle de prod sur EC2 — auto-réparation, sauvegardes S3, tout le kit 😭' },
    { u: 'moodle_mod', c: '#9a6fe0', t: 'WCAG 2.1 AA, verified with WAVE + Accessibility Insights. a11y queen', f: 'WCAG 2.1 AA, vérifié avec WAVE + Accessibility Insights. la reine de l\'a11y' },
    { u: 'data_goblin', c: '#e8a13c', t: '200+ annotators coordinated in EN/中文/粤語… scheduling final boss defeated', f: '200+ annotateurs coordonnés en EN/中文/粤語… boss final de la planification : vaincu' },
    { u: 'ml_nerd', c: '#43b581', t: '>82% mAP50-95 with YOLOv8n. real-time. on actual industrial parts.', f: '>82 % mAP50-95 avec YOLOv8n. en temps réel. sur de vraies pièces industrielles.' },
    { u: 'r_stats_uncle', c: '#6cc4f5', t: 'ARIMA-GARCH walk-forward, 12-step RMSE < 2.8. respect.', f: 'ARIMA-GARCH en walk-forward, RMSE 12 pas < 2,8. respect.' },
    { u: 'oss_maintainer', c: '#f0509f', t: 'her agent pipeline replies to my review comments before I finish typing them', f: 'son pipeline d\'agents répond à mes reviews avant que je finisse de les taper' },
    { u: 'night_owl', c: '#9a6fe0', t: 'semi-supervised ResNet-18: recall 25%→52% with barely any labels. how', f: 'ResNet-18 semi-supervisé : rappel 25 %→52 % avec presque aucune étiquette. comment ??' },
    { u: 'pixel_fan', c: '#e8a13c', t: 'the slime has a COMBO SYSTEM?? this portfolio has gameplay', f: 'le slime a un SYSTÈME DE COMBO ?? ce portfolio a du gameplay' },
    { u: 'infra_cat', c: '#43b581', t: 'UFW + Fail2ban + least-privilege IAM… she hardens servers for fun', f: 'UFW + Fail2ban + IAM au moindre privilège… elle durcit des serveurs pour le plaisir' },
    { u: 'genai_lurker', c: '#6cc4f5', t: 'video pipeline quality +26% resolution +17% length at HyperGAI. numbers!!', f: 'pipeline vidéo : +26 % de résolution, +17 % de durée chez HyperGAI. des chiffres !!' },
    { u: 'brainwave_bro', c: '#9a6fe0', t: 'she turned EEG signals into images and hit >70% trend prediction 🧠', f: 'elle a transformé des signaux EEG en images : >70 % de prédiction de tendance 🧠' },
    { u: 'hr_bot', c: '#f0509f', t: '📧 yuyongshan573@gmail.com — literally hireable right now', f: '📧 yuyongshan573@gmail.com — littéralement recrutable tout de suite' },
    { u: 'sre_enjoyer', c: '#43b581', t: 'nightly snapshots, auto-clone, email alerts. a non-technical team runs it. THAT is design', f: 'snapshots nocturnes, auto-clonage, alertes mail. une équipe non technique gère tout. ÇA, c\'est du design' },
    { u: 'lurker_9000', c: '#e8a13c', t: 'top 5% of graduating class btw. she won\'t say it so I will', f: 'top 5 % de sa promo, au passage. elle ne le dira pas, alors je le dis' }
  ];

  const chatDonations = [
    { u: 'recruiter_chan', amt: '$50', t: 'PLEASE check your LinkedIn DMs', f: 'PITIÉ, regarde tes DM LinkedIn' },
    { u: 'startup_ceo', amt: '$100', t: 'can she start Monday?', f: 'elle peut commencer lundi ?' },
    { u: 'design_lead', amt: '$25', t: 'the window manager alone is a portfolio', f: 'le gestionnaire de fenêtres à lui seul est un portfolio' }
  ];

  let chatIndex = 0;
  let donationCooldown = 0;

  function appendChatMessage(node) {
    if (typeof liveMirror === 'function') liveMirror(node);
    if (!chatFeed) return;
    chatFeed.appendChild(node);
    while (chatFeed.children.length > 40) {
      chatFeed.removeChild(chatFeed.firstChild);
    }
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }

  function chatText(m) {
    return (yosLang === 'fr' && m.f) ? m.f : m.t;
  }

  function makeChatLine(m) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg';
    const user = document.createElement('span');
    user.className = 'chat-user';
    user.style.color = m.c || 'var(--purple-dark)';
    user.textContent = m.u + ':';
    msg.appendChild(user);
    msg.appendChild(document.createTextNode(' ' + chatText(m)));
    return msg;
  }

  function makeSystemLine(text) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg chat-system';
    msg.textContent = text;
    return msg;
  }

  function makeDonationLine(m) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg chat-donation';
    const user = document.createElement('span');
    user.className = 'chat-user';
    user.textContent = yosLang === 'fr' ? `★ ${m.u} a donné ${m.amt} :` : `★ ${m.u} donated ${m.amt}:`;
    msg.appendChild(user);
    msg.appendChild(document.createTextNode(' ' + chatText(m)));
    return msg;
  }

  function chatBootLine() {
    if (!chatFeed || chatFeed.children.length) return;
    appendChatMessage(makeSystemLine(yosLang === 'fr' ? '— chat_live connecté ♡ —' : '— stream_chat connected ♡ —'));
  }

  if (chatFeed) {

    setInterval(() => {
      const windowVisible = chatWindow &&
        !chatWindow.classList.contains('window-closed') &&
        !chatWindow.classList.contains('window-minimized');
      const lurkerMode = chatWindow && chatWindow.classList.contains('window-closed') &&
        !document.documentElement.classList.contains('is-booting');

      if (!windowVisible && !lurkerMode) return;

      donationCooldown++;
      const isDonation = donationCooldown >= 9;
      let payload;
      if (isDonation) {
        donationCooldown = 0;
        payload = chatDonations[Math.floor(Math.random() * chatDonations.length)];
      } else {
        payload = chatMessages[chatIndex % chatMessages.length];
        chatIndex++;
      }

      if (liveOpen && !windowVisible) {
        liveMirror(isDonation ? makeDonationLine(payload) : makeChatLine(payload));
      }
      if (windowVisible) {
        appendChatMessage(isDonation ? makeDonationLine(payload) : makeChatLine(payload));
        if (isDonation) {
          playTone(1046, 'triangle', 0.15, 0, 0.05);
          playTone(1318, 'triangle', 0.2, 0.12, 0.05);
        }
      } else {
        // lurker mode: the chat keeps whispering from the bottom-left corner
        pushDanmaku(payload, isDonation);
      }

      if (chatViewerCount && Math.random() < 0.4) {
        chatViewerCount.textContent = String(120 + Math.floor(Math.random() * 40) + pet.followers);
      }
    }, 2600);
  }

  // --- mini danmaku: low-key bullet chat once the window is closed ---
  const danmakuBox = document.getElementById('mini-danmaku');

  function pushDanmaku(payload, isDonation, force) {
    if (!danmakuBox) return;
    // slower cadence than the full chat: skip ~40% of regular messages
    if (!isDonation && !force && Math.random() < 0.4) return;

    const line = document.createElement('button');
    line.type = 'button';
    line.className = 'dm-line' + (isDonation ? ' dm-donation' : '');
    line.title = 'open stream_chat.log';
    const user = document.createElement('span');
    user.className = 'dm-user';
    user.textContent = (isDonation ? `★ ${payload.u}:` : `${payload.u}:`);
    if (!isDonation && payload.c) user.style.color = payload.c;
    line.appendChild(user);
    line.appendChild(document.createTextNode(' ' + chatText(payload)));
    line.addEventListener('click', () => {
      openWindow('win-chat');
      clearDanmaku();
    });

    danmakuBox.appendChild(line);
    while (danmakuBox.children.length > 3) danmakuBox.removeChild(danmakuBox.firstChild);

    setTimeout(() => {
      line.classList.add('dm-out');
      setTimeout(() => line.remove(), 550);
    }, 6200);
  }

  function clearDanmaku() {
    if (danmakuBox) danmakuBox.innerHTML = '';
  }

  // Chat command buttons
  const chatHireBtn = document.getElementById('chat-hire-btn');
  const chatLoveBtn = document.getElementById('chat-love-btn');

  if (chatHireBtn) {
    chatHireBtn.addEventListener('click', () => {
      copyEmail();
      appendChatMessage(makeChatLine({ u: 'you', c: '#f0509f', t: '!hire' }));
      appendChatMessage(makeSystemLine(yosLang === 'fr' ? 'courriel copié — allez lui dire bonjour ♡' : 'email copied to clipboard — go say hi ♡'));
    });
  }

  if (chatLoveBtn) {
    chatLoveBtn.addEventListener('click', () => {
      playSparkleSound();
      const msg = document.createElement('div');
      msg.className = 'chat-msg chat-self';
      msg.textContent = 'you: ♡♡♡♡♡';
      appendChatMessage(msg);
      gainFollowers(1);
      if (!pet.sleeping && !pet.busy) {
        showBubble(trT('chat is sending love!! ♡', 'le chat envoie de l\'amour !! ♡'), 2000);
        moveSlime({ action: 'happy', mood: 'adored', duration: 700, distance: 0.2 });
      }
    });
  }

  // ================= EMAIL COPY =================
  const btnEmail = document.getElementById('btn-copy-email');
  const emailToast = document.getElementById('email-toast');
  const emailVal = 'yuyongshan573@gmail.com';
  let toastTimer = null;

  function showToast(text) {
    if (!emailToast) return;
    emailToast.textContent = text;
    emailToast.classList.remove('toast-hidden');
    void emailToast.offsetWidth;
    emailToast.classList.add('toast-show');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      emailToast.classList.remove('toast-show');
      setTimeout(() => emailToast.classList.add('toast-hidden'), 300);
    }, 3000);
  }

  function copyEmail() {
    playClickSound();
    const finish = () => showToast(t('toast.email'));

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(emailVal).then(finish).catch(() => legacyCopy(finish));
    } else {
      legacyCopy(finish);
    }
  }

  function legacyCopy(done) {
    const el = document.createElement('textarea');
    el.value = emailVal;
    document.body.appendChild(el);
    el.select();
    try { document.execCommand('copy'); } catch { /* ignore */ }
    document.body.removeChild(el);
    done();
  }

  if (btnEmail) {
    btnEmail.addEventListener('click', (e) => {
      e.stopPropagation();
      copyEmail();
    });
  }

  // ================= SPARKLE MOUSE TRAIL =================
  let lastTrailAt = 0;
  let activeTrailCount = 0;

  if (!REDUCED_MOTION && window.matchMedia('(hover: hover)').matches) {
    document.addEventListener('mousemove', (e) => {
      const now = performance.now();
      if (now - lastTrailAt < 80 || activeTrailCount > 24) return;
      lastTrailAt = now;

      const s = document.createElement('span');
      s.className = 'trail-sparkle';
      s.textContent = Math.random() < 0.7 ? '✦' : '♡';
      s.style.left = `${e.clientX + 8}px`;
      s.style.top = `${e.clientY + 10}px`;
      s.style.color = ['#ff8fc7', '#c9a7f5', '#6cc4f5'][Math.floor(Math.random() * 3)];
      document.body.appendChild(s);
      activeTrailCount++;
      s.addEventListener('animationend', () => {
        s.remove();
        activeTrailCount--;
      });
    }, { passive: true });
  }

  // ================= DECORATIVE CLICK BURST =================
  const desktop = document.querySelector('.desktop-area');
  if (desktop) {
    desktop.addEventListener('click', (e) => {
      if (e.target.closest('.window') || e.target.closest('.desktop-taskbar') || e.target.closest('.desktop-sidebar')) {
        return;
      }

      playTone(Math.random() * 400 + 400, 'sine', 0.08, 0, 0.05);
      if (REDUCED_MOTION) return;

      const symbols = ['♡', '♥', '☆', '★', '🎀', '✦', '🌸'];
      const floatingEl = document.createElement('span');
      floatingEl.className = 'click-burst';
      floatingEl.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      floatingEl.style.left = `${e.clientX}px`;
      floatingEl.style.top = `${e.clientY}px`;
      floatingEl.style.color = Math.random() > 0.5 ? '#f0509f' : '#6cc4f5';

      document.body.appendChild(floatingEl);
      floatingEl.getBoundingClientRect();

      const travelX = (Math.random() - 0.5) * 60;
      const travelY = -80 - Math.random() * 40;
      floatingEl.style.transform = `translate(${travelX}px, ${travelY}px) scale(1.4) rotate(${Math.random() * 360}deg)`;
      floatingEl.style.opacity = '0';

      setTimeout(() => floatingEl.remove(), 1000);
    });
  }

  // ================= AMA BOT (ask_me.chat) — 100% client-side =================
  const amaFeed = document.getElementById('ama-feed');
  const amaForm = document.getElementById('ama-form');
  const amaInput = document.getElementById('ama-input');
  const amaChipsWrap = document.getElementById('ama-chips');

  const hasCJK = (s) => /[一-鿿]/.test(s);

  // Each topic: k = keywords (EN + 中文), a = answer, zh = answer used when the
  // question contains Chinese. Longer keyword hits score higher.
  const AMA_TOPICS = [
    {
      k: ['best at', 'superpower', 'strongest', 'strength', 'why hire', 'why should', 'stand out', 'standout', 'special about', 'highlight', 'top skill', 'killer', '最强', '最厉害', '亮点', '强在哪', '凭什么', '优势', 'points forts', 'meilleure', 'plus forte', 'atout', 'pourquoi elle'],
      a: 'Her three superpowers, with receipts:\n1️⃣ SHIPPING TO PRODUCTION — solo-built a WCAG 2.1 AA Moodle LMS on AWS that heals itself (auto-heal, S3 DR backups, nightly snapshots). A non-technical team has run it for months without touching a server. It\'s live — click the "M" icon.\n2️⃣ AI-AGENT ENGINEERING — she built Druid, her own framework where agents scan repos, write test-backed patches and answer reviewers: 47 merged PRs, 45 maintainer-reviewed, on money-path & security code.\n3️⃣ CRAFT × RIGOR — this whole OS (window manager, synth, this bot) is hand-written, framework-free… and she reads WAVE audit reports for fun. Full-stack head, designer\'s hands, SRE\'s paranoia.',
      zh: '她的三大杀手锏，全部有据可查：\n1️⃣ 真·生产落地——独立在 AWS 上建了通过 WCAG 2.1 AA 的 Moodle LMS，故障自愈、S3 容灾备份、每夜快照。一个完全不懂技术的团队运营了几个月，没碰过一次服务器。网站在线，点桌面"M"图标。\n2️⃣ AI 智能体工程——自研 Druid 框架：智能体扫仓库、写带回归测试的补丁、回复 reviewer：47 个合并 PR、45 个经维护者 review，全在资金路径和安全代码上。\n3️⃣ 手艺 × 严谨——这整个 OS（窗口管理器、合成器、这个机器人）纯手写零框架……而且她以读 WAVE 无障碍审计报告为乐。全栈的脑子、设计师的手、SRE 的谨慎。',
      fr: 'Ses trois super-pouvoirs, preuves à l\'appui :\n1️⃣ LIVRER EN PRODUCTION — elle a construit seule un LMS Moodle WCAG 2.1 AA sur AWS qui se répare tout seul (auto-réparation, sauvegardes S3 + reprise après sinistre, snapshots nocturnes). Une équipe non technique le fait tourner depuis des mois sans toucher un serveur. Il est en ligne — cliquez l\'icône « M ».\n2️⃣ INGÉNIERIE D\'AGENTS IA — elle a créé Druid, son propre framework : les agents scannent les dépôts, écrivent des correctifs testés et répondent aux reviewers. 47 PR fusionnées, 45 relues par les mainteneurs, sur du code financier et de sécurité.\n3️⃣ ARTISANAT × RIGUEUR — tout cet OS (gestionnaire de fenêtres, synthé, ce bot) est écrit à la main, sans framework… et elle lit des audits WAVE pour le plaisir. Tête de full-stack, mains de designer, prudence de SRE.'
    },
    {
      k: ['hello', 'hi ', 'hey', 'yo ', '你好', '哈喽', '嗨', 'salut', 'bonjour', 'coucou'],
      a: 'hi hi!! ♡ I\'m Yongshan\'s slime — her resume lives in my jelly. Ask me about her skills, Druid, the LMS she built, or anything really!',
      zh: '嗨嗨！！♡ 我是永杉的史莱姆，她的简历都存在我的果冻里～ 问我技能、Druid、她建的 LMS，什么都行！',
      fr: 'coucou !! ♡ je suis le slime de Yongshan — son CV vit dans ma gelée. Demandez-moi ses compétences, Druid, le LMS qu\'elle a construit… tout ce que vous voulez !'
    },
    {
      k: ['who are you', 'who is', 'about her', 'about yongshan', 'about me', 'about_me', 'introduce', 'intro', 'summary', 'bio', '介绍', '她是谁', '是谁', '简历', 'qui est-elle', 'qui es-tu', 'c\'est qui'],
      a: 'Yongshan Yu — Systems/LMS & Full-Stack Lead + AI/Data practitioner, 3+ years across platform engineering, data science and MLOps.\nWhat that means in practice: she takes things ALL the way to production — cloud-native stacks on AWS/Azure, hardened security (TLS/HSTS, UFW/Fail2ban, least-privilege IAM), and SRE automation: backups, disaster recovery, auto-heal, observability.\nThis site is her proof of craft: hand-written HTML/CSS/JS, a window manager, an 8-bit synth, and me. Zero frameworks.',
      zh: '于永杉——Systems/LMS 全栈负责人 + AI/数据工程师，3 年+ 横跨平台工程、数据科学和 MLOps。\n落到实处就是：她能把东西真正推到生产环境——AWS/Azure 云原生架构、安全加固（TLS/HSTS、UFW/Fail2ban、最小权限 IAM）、SRE 自动化：备份、容灾、故障自愈、可观测性。\n这个网站就是她的手艺证明：纯手写 HTML/CSS/JS、窗口管理器、8-bit 合成器，还有我。零框架。',
      fr: 'Yongshan Yu — Lead Systèmes/LMS & Full-Stack + praticienne IA/Data, 3 ans et plus en ingénierie de plateforme, data science et MLOps.\nConcrètement : elle amène les projets JUSQU\'EN production — stacks cloud natives AWS/Azure, sécurité durcie (TLS/HSTS, UFW/Fail2ban, IAM au moindre privilège) et automatisation SRE : sauvegardes, reprise après sinistre, auto-réparation, observabilité.\nCe site est sa preuve de savoir-faire : HTML/CSS/JS écrits à la main, un gestionnaire de fenêtres, un synthé 8-bit, et moi. Zéro framework.'
    },
    {
      k: ['skill', 'stack', 'tech', 'technology', 'programming', 'code', '技能', '技术栈', '会什么', '编程', 'compétence', 'compétences'],
      a: 'Her loadout:\n• Python (Pandas/NumPy/PyTorch/TF/HuggingFace), C/C++, SQL, R\n• AWS S3/EC2, Azure, Nginx, Redis, MariaDB\n• AgentOps: autonomous coding-agent orchestration\n• CV (YOLO), time series (ARIMA-GARCH), GenAI\n• SRE: CloudWatch, TLS/HSTS, UFW/Fail2ban, cron automation\n• WCAG 2.1 AA accessibility\nOpen inventory.sav for the full item box!',
      zh: '她的装备栏：\n• Python（Pandas/NumPy/PyTorch/TF/HuggingFace）、C/C++、SQL、R\n• AWS S3/EC2、Azure、Nginx、Redis、MariaDB\n• AgentOps：自主编码智能体编排\n• 计算机视觉（YOLO）、时间序列（ARIMA-GARCH）、生成式 AI\n• SRE：CloudWatch、TLS/HSTS、UFW/Fail2ban、cron 自动化\n• WCAG 2.1 AA 无障碍\n打开 inventory.sav 看完整道具箱！',
      fr: 'Son équipement :\n• Python (Pandas/NumPy/PyTorch/TF/HuggingFace), C/C++, SQL, R\n• AWS S3/EC2, Azure, Nginx, Redis, MariaDB\n• AgentOps : orchestration d\'agents de code autonomes\n• Vision (YOLO), séries temporelles (ARIMA-GARCH), IA générative\n• SRE : CloudWatch, TLS/HSTS, UFW/Fail2ban, automatisation cron\n• Accessibilité WCAG 2.1 AA\nOuvrez inventory.sav pour l\'inventaire complet !'
    },
    {
      k: ['druid', 'agent', 'ai agent', 'autonomous', 'rustchain', 'agentops', '智能体', '代理', 'druide'],
      a: 'Druid is her autonomous engineering framework — agents that scan repos, classify risk, write test-backed patches, open PRs, track reviews, and learn from outcomes (with stop-loss so they don\'t waste effort).\nReceipts: 47 merged PRs, 45 maintainer-reviewed in RustChain, 36 in active review, ~34 clean PRs/week. Focus: money-path, bridge, UTXO, payout & governance code. Humans keep the high-risk gates.',
      zh: 'Druid 是她的自主工程框架——智能体扫描仓库、划分风险等级、生成带回归测试的补丁、开 PR、跟踪 review、并从结果里学习（还有止损机制避免浪费算力）。\n战绩：47 个合并 PR，45 个经 RustChain 维护者 review，36 个在活跃审核队列，每周约 34 个干净 PR。专攻资金路径、跨链桥、UTXO、支付与治理代码，高风险操作保留人工把关。',
      fr: 'Druid est son framework d\'ingénierie autonome — des agents qui scannent les dépôts, classent le risque, écrivent des correctifs avec tests de régression, ouvrent des PR, suivent les reviews et apprennent des résultats (avec un stop-loss pour ne pas gaspiller d\'effort).\nLes chiffres : 47 PR fusionnées, 45 relues par les mainteneurs sur RustChain, 36 en review active, ~34 PR propres/semaine. Cible : code financier, bridges, UTXO, paiements & gouvernance. Les humains gardent les portes à haut risque.'
    },
    {
      k: ['moodle', 'lms', 'arc', 'website she built', 'production site', '网站', '在线学习', 'plateforme'],
      a: 'She solo-built a production Moodle LMS on AWS for ARC in Action (anti-harassment education, bilingual EN/FR): EC2 + Nginx + PHP-FPM + MariaDB + Redis, Let\'s Encrypt/HSTS, UFW/Fail2ban, S3 backups with DR replication, nightly snapshots, auto-heal — designed so a fully non-technical team never touches a server. WCAG 2.1 AA verified. It\'s live — the "M" icon on this desktop opens it.',
      zh: '她独立为 ARC in Action（反性骚扰教育项目，英法双语）在 AWS 上搭了生产级 Moodle LMS：EC2 + Nginx + PHP-FPM + MariaDB + Redis、Let\'s Encrypt/HSTS、UFW/Fail2ban、S3 备份 + 容灾复制、每夜快照、故障自愈——设计目标是让完全不懂技术的团队永远不用碰服务器。通过 WCAG 2.1 AA 无障碍验证。网站在线运行中，桌面上的"M"图标就能打开。',
      fr: 'Elle a construit seule un LMS Moodle de production sur AWS pour ARC in Action (éducation contre le harcèlement, bilingue EN/FR) : EC2 + Nginx + PHP-FPM + MariaDB + Redis, Let\'s Encrypt/HSTS, UFW/Fail2ban, sauvegardes S3 avec réplication DR, snapshots nocturnes, auto-réparation — pensé pour qu\'une équipe 100 % non technique n\'ait jamais à toucher un serveur. Vérifié WCAG 2.1 AA. Il est en ligne — l\'icône « M » du bureau l\'ouvre.'
    },
    {
      k: ['hypergai', 'data engineer', 'annotat', 'internship', 'singapore', '数据工程', '实习', 'stage', 'annotateurs'],
      a: 'At HyperGAI (Singapore) she ran data ops for multimodal GenAI: coordinated 200+ annotators across regions in English/Mandarin/Cantonese, built an S3 data warehouse, shipped Nginx microservices, and her pipeline work raised video dataset resolution +26% and length +17%.',
      fr: 'Chez HyperGAI (Singapour), elle gérait la data d\'un labo GenAI multimodal : coordination de 200+ annotateurs en anglais/mandarin/cantonais, entrepôt de données S3, microservices Nginx — et ses pipelines ont amélioré la résolution des vidéos de +26 % et leur durée de +17 %.'
    },
    {
      k: ['research', 'yolo', 'defect', 'arima', 'time series', 'resnet', 'coyote', 'eeg', 'paper', '研究', '科研', 'recherche', 'recherches'],
      a: 'Research highlights:\n• YOLOv8 real-time defect detection — >82% mAP50-95, +18% factory throughput (NTU)\n• ARIMA-GARCH/SARIMA with walk-forward validation — 12-step RMSE < 2.8, −70% tuning time\n• Semi-supervised ResNet-18 — recall 25%→52% with scarce labels (UofA)\n• EEG-to-image autoencoders — >70% trend prediction (UofA)\nFull logs in career_quest.exe!',
      fr: 'Ses travaux de recherche :\n• Détection de défauts temps réel YOLOv8 — >82 % mAP50-95, +18 % de débit usine (NTU)\n• ARIMA-GARCH/SARIMA en validation walk-forward — RMSE 12 pas < 2,8, −70 % de temps de réglage\n• ResNet-18 semi-supervisé — rappel 25 %→52 % avec très peu d\'étiquettes (UofA)\n• Autoencodeurs EEG→image — >70 % de prédiction de tendance (UofA)\nJournal complet dans career_quest.exe !'
    },
    {
      k: ['education', 'degree', 'university', 'school', 'gpa', 'master', 'study', '学历', '学校', '大学', '硕士', 'études', 'diplôme', 'école'],
      a: 'MSc in Artificial Intelligence, NTU Singapore (GPA 4.21/5.0) + BSc Computer Science with a Science Psychology minor, University of Alberta — graduated with Distinction, top 5% of class, with a 4-year international scholarship.',
      zh: '新加坡南洋理工大学 AI 硕士（GPA 4.21/5.0）+ 阿尔伯塔大学计算机科学学士（辅修科学心理学）——以 Distinction 毕业，全班前 5%，还拿了四年国际学生奖学金。',
      fr: 'MSc en Intelligence Artificielle, NTU Singapour (GPA 4,21/5,0) + BSc en informatique avec mineure en psychologie, University of Alberta — diplômée avec Distinction, top 5 % de la promotion, avec une bourse internationale de 4 ans.'
    },
    {
      k: ['contact', 'email', 'linkedin', 'github', 'reach', 'dm', '联系', '邮箱', '微信', 'contacter', 'joindre', 'courriel'],
      a: 'Reach her at:\n📧 yuyongshan573@gmail.com (click it in the sidebar to copy!)\n📞 +1 825-963-2725\n🔗 linkedin.com/in/yongshan-yu-b9a713227\n🐙 github.com/yyswhsccc',
      zh: '联系方式：\n📧 yuyongshan573@gmail.com（点侧边栏的邮箱可以直接复制！）\n📞 +1 825-963-2725\n🔗 linkedin.com/in/yongshan-yu-b9a713227\n🐙 github.com/yyswhsccc',
      fr: 'Pour la joindre :\n📧 yuyongshan573@gmail.com (cliquez l\'adresse dans la barre latérale pour copier !)\n📞 +1 825-963-2725\n🔗 linkedin.com/in/yongshan-yu-b9a713227\n🐙 github.com/yyswhsccc'
    },
    {
      k: ['hire', 'hiring', 'available', 'job', 'recruit', 'work with', 'open to work', 'open for work', 'looking for work', 'opportunit', 'position', 'role', 'freelance', 'employ', '招聘', '雇', '工作机会', '合作', '找工作', '求职', '招人', 'embauche', 'embaucher', 'recruter', 'disponible', 'poste'],
      a: 'YES. She\'s open to UI/UX + full-stack + AI systems roles. You\'ve seen the evidence: this whole site is hand-written, the LMS is in production, Druid has 47 merged PRs. Email yuyongshan573@gmail.com before someone else does — I need job security as her mascot!!',
      zh: '当然可以！她对 UI/UX、全栈、AI 系统方向的机会都开放。证据你都看到了：这个网站纯手写、LMS 在生产环境跑着、Druid 有 47 个合并 PR。快发邮件到 yuyongshan573@gmail.com——我这个吉祥物还指着她吃饭呢！！',
      fr: 'OUI. Elle est ouverte aux postes UI/UX, full-stack et systèmes IA. Vous avez vu les preuves : ce site est écrit à la main, le LMS tourne en production, Druid a 47 PR fusionnées. Écrivez à yuyongshan573@gmail.com avant que quelqu\'un d\'autre ne le fasse — mon poste de mascotte en dépend !!'
    },
    {
      k: ['this site', 'this website', 'how did', 'built this', 'portfolio', 'made this', '这个网站', '怎么做的', 'qui a fait', 'construit ce site'],
      a: 'Everything here is hand-written HTML/CSS/JS — zero frameworks, zero libraries. A draggable window manager, an 8-bit Web Audio synth, my sprite engine (my sleeping/eating faces are pixel-edited frames), a fake terminal, and me: a stateful virtual pet with a localStorage save file. Even this bot is a client-side keyword engine — no API, works offline.',
      zh: '这里的一切都是纯手写 HTML/CSS/JS——零框架、零库。可拖拽的窗口管理器、8-bit Web Audio 合成器、我的精灵引擎（睡觉/吃饭表情是逐像素改出来的帧）、伪终端，还有我：一只带 localStorage 存档的状态机宠物。连这个问答机器人都是纯前端关键词引擎——没有 API，断网也能用。',
      fr: 'Tout ici est écrit à la main en HTML/CSS/JS — zéro framework, zéro bibliothèque. Un gestionnaire de fenêtres déplaçables, un synthé 8-bit Web Audio, mon moteur de sprites (mes visages endormi/gourmand sont des frames retouchées pixel par pixel), un faux terminal, et moi : un familier virtuel à états avec sauvegarde localStorage. Même ce bot est un moteur de mots-clés 100 % côté client — sans API, il marche hors ligne.'
    },
    {
      k: ['language', 'speak', 'chinese', 'mandarin', 'cantonese', 'french', 'english', '会说', '语言', '中文', '粤语', '法语', 'langues', 'parle'],
      a: 'She speaks English (fluent), Mandarin (native), Cantonese (native), and is studying French — handy, since the LMS she built is bilingual EN/FR. She once coordinated 200+ annotators across all three Chinese/English channels at once.',
      zh: '她说英语（流利）、普通话（母语）、粤语（母语），正在学法语——正好她建的 LMS 就是英法双语的。在 HyperGAI 她试过同时用中英粤三语协调 200+ 标注员。',
      fr: 'Elle parle anglais (couramment), mandarin (langue maternelle), cantonais (langue maternelle) et apprend le français — pratique : le LMS qu\'elle a construit est bilingue EN/FR. Elle a déjà coordonné 200+ annotateurs sur les trois canaux à la fois.'
    },
    {
      k: ['slime', 'pet', 'you ', 'your name', 'cute', '史莱姆', '宠物', '可爱', 'mignon'],
      a: 'Me?? I\'m a production-grade virtual pet: state machine (mood/energy/affection), combo detection, drag physics, sprite frames, a persistent fan counter, and an overload failsafe. She wrote all of it. Also I\'m adorable, which is a separate skill.',
      zh: '我吗？？我可是生产级虚拟宠物：状态机（心情/能量/好感度）、连击检测、拖拽物理、表情帧、粉丝数存档，还有防过载保险丝。全是她写的。另外我很可爱，这是另一项独立技能。',
      fr: 'Moi ?? Je suis un familier virtuel de niveau production : machine à états (humeur/énergie/affection), détection de combos, physique de drag, frames de sprites, compteur de fans persistant et fusible anti-surcharge. Elle a tout écrit. En plus je suis adorable, ce qui est une compétence à part.'
    },
    {
      k: ['salary', 'pay', 'compensation', 'rate', '薪资', '工资', '报价', 'salaire'],
      a: 'A slime does not negotiate compensation!! That\'s between you and her inbox: yuyongshan573@gmail.com ♡',
      fr: 'Un slime ne négocie pas les salaires !! C\'est entre vous et sa boîte mail : yuyongshan573@gmail.com ♡'
    },
    {
      k: ['location', 'where', 'based', 'canada', 'timezone', '在哪', '哪里', '时区', 'basée', 'fuseau', 'habite'],
      a: 'She\'s based in Canada (that +1 825 number is Alberta!) and has worked across Canada 🇨🇦 and Singapore 🇸🇬 — comfortable with remote and cross-timezone teams.',
      fr: 'Elle est basée au Canada (le +1 825, c\'est l\'Alberta !) et a travaillé au Canada 🇨🇦 et à Singapour 🇸🇬 — très à l\'aise en télétravail et multi-fuseaux.'
    },
    {
      k: ['hobby', 'hobbies', 'fun', 'like to do', 'favorite', 'favourite', '爱好', '喜欢', 'loisir', 'loisirs', 'aime faire'],
      a: 'Judging by my existence: pixel art, cute-tech, rhythm-game-grade UI feedback, and teaching AI agents to do her chores. Also studying French. Her favorite color is statistically pink, I have receipts.',
      fr: 'À en juger par mon existence : pixel art, cute-tech, feedback d\'interface digne d\'un jeu de rythme, et dresser des agents IA à faire ses corvées. Elle apprend aussi le français. Sa couleur préférée est statistiquement le rose, j\'ai des preuves.'
    },
    {
      k: ['weakness', 'flaw', 'bad at', '缺点', 'défaut', 'faiblesse'],
      a: 'Her documented weakness: she keeps polishing pixel details at 2am. Her slime\'s documented weakness: snacks.',
      fr: 'Sa faiblesse documentée : polir des détails de pixels à 2 h du matin. Celle de son slime : les snacks.'
    },
    {
      k: ['awesome', 'amazing', 'impressive', 'incredible', 'so cool', 'very cool', 'love this', 'love it', 'wow', 'great', 'nice', 'insane', 'goated', '好牛', '牛逼', '太牛', '厉害', '太强', '好强', '绝了', '好棒', '太棒', '真棒', '优秀', 'nb', '666', '哇', 'bravo', 'incroyable', 'génial', 'trop fort', 'impressionnant'],
      a: 'hehehe stoppp I\'m gonna wobble off the screen 🥹 — but yes, agreed, she IS that good. Want proof to forward to your team? Ask me "research highlights" or "what is Druid", or just email her: yuyongshan573@gmail.com ♡',
      zh: '嘿嘿嘿别夸了，我要滚出屏幕了 🥹 ——不过你说得对，她确实很强。想要能转发给团队的证据吗？问我"研究亮点"或者"Druid 是什么"，或者直接发邮件：yuyongshan573@gmail.com ♡',
      fr: 'héhé arrêteeez je vais rouler hors de l\'écran 🥹 — mais oui, c\'est vrai, elle est TRÈS forte. Besoin de preuves pour votre équipe ? Demandez « ses points forts » ou « c\'est quoi Druid », ou écrivez-lui : yuyongshan573@gmail.com ♡'
    },
    {
      k: ['thank', 'thanks', 'thx', 'ty ', 'merci', '谢谢', '感谢', '辛苦'],
      a: 'no no, thank YOU for visiting the stream ♡ tip jar accepts: job offers, boba, and pixel hearts.',
      zh: '不不，是谢谢你来看直播 ♡ 打赏通道只收：工作机会、奶茶、和像素爱心。',
      fr: 'non non, MERCI d\'être passé·e sur le stream ♡ le pot à pourboires accepte : offres d\'emploi, bubble tea et cœurs en pixels.'
    },
    {
      k: ['really', 'seriously', 'for real', 'no way', 'sure?', '真的吗', '真的假的', '不会吧', '认真的', 'vraiment', 'sérieux'],
      a: 'REALLY really. Receipts: the ARC Moodle LMS is live in production (the "M" icon opens it), Druid has 47 merged PRs with maintainer reviews on record, and this entire OS is view-source-able hand-written code. I\'m a slime, I cannot legally lie.',
      zh: '真的不能再真了。证据链：ARC Moodle LMS 正在生产环境运行（桌面上"M"图标直接打开）、Druid 有 47 个带维护者 review 记录的合并 PR、这整个 OS 右键查看源码全是手写的。我是史莱姆，法律上不允许说谎。',
      fr: 'VRAIMENT vraiment. Les preuves : le LMS ARC Moodle est en production (l\'icône « M » l\'ouvre), Druid a 47 PR fusionnées avec reviews de mainteneurs, et tout cet OS se lit en « afficher la source ». Je suis un slime, je n\'ai légalement pas le droit de mentir.'
    },
    {
      k: ['how are you', 'how r u', 'how is it going', "how's it going", '你好吗', '最近怎么样', 'ça va', 'comment vas-tu'],
      a: 'living my best jelly life — energy bar green, fans climbing, zero production incidents. how are YOU? (if the answer is "hiring", I know a girl.)',
      zh: '果冻人生巅峰状态——能量条全绿、粉丝上涨、生产环境零事故。你呢？（如果答案是"在招人"，我认识一个很合适的人。）',
      fr: 'la belle vie de gelée — barre d\'énergie verte, fans en hausse, zéro incident de prod. Et VOUS ? (si la réponse est « on recrute », je connais quelqu\'un.)'
    },
    {
      k: ['bye', 'goodbye', 'see you', 'cya', 'gtg', '再见', '拜拜', '走了', 'au revoir', 'à plus'],
      a: 'byebye!! ♡ don\'t forget to ♥ like the site on your way out — and yuyongshan573@gmail.com is always open. *waves with entire body*',
      zh: '拜拜！！♡ 走之前记得点一下 ♥ like——邮箱 yuyongshan573@gmail.com 永远开放。*用整个身体挥手*',
      fr: 'au revoir !! ♡ n\'oubliez pas de ♥ liker le site en partant — et yuyongshan573@gmail.com est toujours ouvert. *salue avec tout son corps*'
    }
  ];

  const AMA_FALLBACKS = {
    en: [
      'hmm, that one\'s not in my jelly yet… try asking about her skills, Druid, the LMS, research, or how to hire her! Or email her directly: yuyongshan573@gmail.com ♡',
      'my slime brain returned 404 on that 🥺 — try "what is she best at?", "what is Druid?", or "is she open to work?"'
    ],
    fr: [
      'hmm, celle-là n\'est pas encore dans ma gelée… demandez-moi ses compétences, Druid, le LMS, ses recherches ou comment la recruter ! Ou écrivez-lui : yuyongshan573@gmail.com ♡',
      'mon cerveau de slime renvoie 404 🥺 — essayez « ses points forts ? », « c\'est quoi Druid ? » ou « est-elle disponible ? »'
    ],
    zh: [
      '呜，这个还没存进我的果冻里… 试试问她的技能、Druid、LMS、研究，或者怎么雇她！也可以直接写邮件：yuyongshan573@gmail.com ♡',
      '我的史莱姆脑袋返回了 404 🥺 —— 试试"她最强的是什么？""Druid 是什么？"或者"她找工作吗？"'
    ]
  };

  const AMA_CHIPS = {
    en: {
      featured: ['What is she best at?', 'What is Druid?', 'Is she open to work?'],
      pool: ['What is she best at?', 'What is Druid?', 'What\'s her tech stack?', 'Tell me about the LMS', 'Is she open to work?', '她会说中文吗？', 'Who built this site?', 'Research highlights?', 'How do I contact her?', '推荐个餐厅吧！']
    },
    fr: {
      featured: ['Ses points forts ?', 'C\'est quoi Druid ?', 'Est-elle disponible ?'],
      pool: ['Ses points forts ?', 'C\'est quoi Druid ?', 'Sa stack technique ?', 'Parlez-moi du LMS', 'Est-elle disponible ?', 'Elle parle quelles langues ?', 'Qui a fait ce site ?', 'Ses recherches ?', 'Comment la contacter ?', 'Un resto à conseiller ?']
    }
  };
  function amaChipSet() {
    return AMA_CHIPS[yosLang === 'fr' ? 'fr' : 'en'];
  }

  function amaScore(question, topic) {
    const q = question.toLowerCase();
    let score = 0;
    topic.k.forEach((kw) => {
      const k = kw.toLowerCase().trim();
      if (!k) return;
      let hit;
      if (hasCJK(k)) {
        hit = q.includes(k);
      } else {
        // word-boundary match so 'eat' can't fire inside "weather"
        // and 'yo' can't fire inside "tokyo"
        const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        hit = new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`).test(q);
      }
      if (hit) score += hasCJK(kw) ? kw.length * 4 : Math.max(3, k.length);
    });
    return score;
  }

  var amaLastTopic = null;
  var amaRepeatCount = 0;

  function amaLangOf(question) {
    if (hasCJK(question)) return 'zh';
    return yosLang === 'fr' ? 'fr' : 'en';
  }

  // core matcher: returns { answer, topic } — topic null when unknown
  function amaResolve(question) {
    const lang = amaLangOf(question);
    let best = null;
    let bestScore = 2; // threshold
    AMA_TOPICS.forEach((tp) => {
      const sc = amaScore(question, tp);
      if (sc > bestScore) { bestScore = sc; best = tp; }
    });

    if (!best) {
      amaLastTopic = null;
      const pool = AMA_FALLBACKS[lang] || AMA_FALLBACKS.en;
      return { answer: pool[Math.floor(Math.random() * pool.length)], topic: null };
    }

    let answer = (lang === 'zh' && best.zh) ? best.zh
      : (lang === 'fr' && best.fr) ? best.fr
      : best.a;

    // same topic again? acknowledge it instead of sounding like a broken record
    if (best === amaLastTopic) {
      amaRepeatCount++;
      const AGAIN = {
        en: ['(asking twice = extra important!! ok, once more:)', '(you REALLY like this topic ♡ recap:)', '(third time?? fine, tattooing it on my jelly:)'],
        fr: ['(deux fois = très important !! ok, encore une fois :)', '(vous adorez VRAIMENT ce sujet ♡ récap :)', '(troisième fois ?? bon, je le tatoue sur ma gelée :)'],
        zh: ['（问两遍=真的很重要！！那再说一次：）', '（你是真的喜欢这个话题 ♡ 复述如下：）', '（第三遍？？行，我把它纹在果冻上：）']
      };
      const pool = AGAIN[lang] || AGAIN.en;
      answer = pool[Math.min(amaRepeatCount - 1, pool.length - 1)] + '\n' + answer;
    } else {
      amaRepeatCount = 0;
    }
    amaLastTopic = best;
    return { answer, topic: best };
  }

  // kept for the terminal's `ask` pipe
  function amaAnswerFor(question) {
    return amaResolve(question).answer;
  }

  // hand the question to yongle_search (one connected pipeline)
  function amaOfferSearch(question) {
    if (!amaFeed) return;
    const wrap = document.createElement('div');
    wrap.className = 'ama-msg ama-msg-bot ama-msg-action';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ama-search-btn';
    const short = question.length > 26 ? question.slice(0, 26) + '…' : question;
    btn.textContent = yosLang === 'fr'
      ? `🔍 chercher « ${short} » sur yongle`
      : `🔍 search "${short}" on yongle`;
    btn.addEventListener('click', () => performSearch(question));
    wrap.appendChild(btn);
    amaAppend(wrap);
  }

  function amaAppend(node) {
    if (!amaFeed) return;
    amaFeed.appendChild(node);
    amaFeed.scrollTop = amaFeed.scrollHeight;
  }

  function amaAddUser(text) {
    const el = document.createElement('div');
    el.className = 'ama-msg ama-msg-user';
    el.textContent = text;
    amaAppend(el);
  }

  function amaAddBot(text) {
    const el = document.createElement('div');
    el.className = 'ama-msg ama-msg-bot';
    const author = document.createElement('span');
    author.className = 'ama-author';
    author.textContent = 'slime_bot ♡';
    el.appendChild(author);
    el.appendChild(document.createTextNode(text));
    amaAppend(el);
  }

  function amaRenderChips(featured) {
    if (!amaChipsWrap) return;
    amaChipsWrap.innerHTML = '';
    const set = amaChipSet();
    const picks = featured
      ? set.featured
      : [...set.pool].sort(() => Math.random() - 0.5).slice(0, 3);
    picks.forEach((q) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'ama-chip';
      chip.textContent = q;
      chip.addEventListener('click', () => amaAsk(q));
      amaChipsWrap.appendChild(chip);
    });
  }

  let amaBusy = false;

  function amaAsk(question) {
    const q = question.trim();
    if (!q || amaBusy || !amaFeed) return;
    amaBusy = true;

    playClickSound();
    amaAddUser(q);

    const typing = document.createElement('div');
    typing.className = 'ama-typing';
    typing.innerHTML = '<span>·</span><span>·</span><span>·</span>';
    amaAppend(typing);

    setTimeout(() => {
      typing.remove();
      const resolved = amaResolve(q);
      amaAddBot(resolved.answer);
      if (!resolved.topic || resolved.topic.web) amaOfferSearch(q);
      playTone(987.77, 'sine', 0.08, 0, 0.05);
      amaBusy = false;
      amaRenderChips();
      gainFollowers(1);
      if (!pet.sleeping && !pet.busy && Math.random() < 0.5) {
        showBubble(trT('someone\'s asking about her!! ♡', 'quelqu\'un pose des questions sur elle !! ♡'), 1800);
      }
    }, 550 + Math.random() * 650);
  }

  if (amaForm && amaInput) {
    amaForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = amaInput.value;
      amaInput.value = '';
      amaAsk(q);
    });
  }

  const AMA_GREETING = {
    en: 'hi!! I\'m slime_bot ♡ Yongshan\'s whole resume lives in my jelly — quick brag sheet before you ask:\n🤖 47 merged open-source PRs, shipped by Druid, the AI-agent framework she built herself\n☁️ a live production LMS on AWS (WCAG 2.1 AA) that she runs solo, with auto-heal + disaster recovery\n🎓 MSc in AI (NTU) + top-5% graduate — and this entire OS is hand-written, zero frameworks\nAsk me anything — EN/FR/中文 all fine. Try the chips below ♡',
    fr: 'coucou !! je suis slime_bot ♡ tout le CV de Yongshan vit dans ma gelée — petit palmarès avant vos questions :\n🤖 47 PR open-source fusionnées, livrées par Druid, le framework d\'agents IA qu\'elle a créé elle-même\n☁️ un LMS de production sur AWS (WCAG 2.1 AA) qu\'elle opère seule, avec auto-réparation + reprise après sinistre\n🎓 MSc en IA (NTU) + top 5 % de promo — et cet OS entier est écrit à la main, zéro framework\nDemandez-moi n\'importe quoi — EN/FR/中文. Essayez les puces ci-dessous ♡'
  };

  function amaBootGreeting() {
    if (!amaFeed || amaFeed.children.length) return;
    amaAddBot(AMA_GREETING[yosLang === 'fr' ? 'fr' : 'en']);
    amaRenderChips(true);
  }

  // ================= TERMINAL (terminal.exe) =================
  const termOut = document.getElementById('term-out');
  const termForm = document.getElementById('term-form');
  const termInput = document.getElementById('term-input');
  const termShell = document.getElementById('term-shell');
  const termWindow = document.getElementById('win-terminal');

  const termHistory = [];
  let termHistoryIdx = -1;

  function termLine(text = '', cls = '') {
    if (!termOut) return;
    const el = document.createElement('span');
    el.className = `t-line ${cls}`.trim();
    el.textContent = text;
    termOut.appendChild(el);
    termOut.scrollTop = termOut.scrollHeight;
  }

  function termLink(text, href) {
    if (!termOut) return;
    const wrap = document.createElement('span');
    wrap.className = 't-line';
    const a = document.createElement('a');
    a.className = 't-link';
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = text;
    wrap.appendChild(a);
    termOut.appendChild(wrap);
    termOut.scrollTop = termOut.scrollHeight;
  }

  const GITHUB_FALLBACK_REPOS = [
    ['druid-agentic-engineering-os', 'Engineering OS for repo risk discovery and test-backed PR generation'],
    ['yyswhsccc', 'GitHub profile — Druid docs, RustChain PR stats, ARC LMS notes']
  ];

  async function termCmdRepos() {
    termLine('fetching api.github.com/users/yyswhsccc …', 't-dim');
    try {
      const [userRes, repoRes] = await Promise.all([
        fetch('https://api.github.com/users/yyswhsccc'),
        fetch('https://api.github.com/users/yyswhsccc/repos?per_page=100&sort=updated')
      ]);
      if (!userRes.ok || !repoRes.ok) throw new Error('rate-limited');
      const user = await userRes.json();
      const repos = await repoRes.json();
      const own = repos.filter((r) => !r.fork);
      termLine(`✔ live from GitHub — ${user.public_repos} public repos`, 't-ok');
      termLine(`bio: ${user.bio || 'Agent framework builder'}`, 't-dim');
      own.slice(0, 6).forEach((r) => {
        termLine(`  ${r.name}${r.description ? ' — ' + r.description : ''}`, 't-accent');
      });
      termLink('  ↗ github.com/yyswhsccc', 'https://github.com/yyswhsccc');
    } catch {
      termLine('✘ GitHub API unreachable (rate limit?) — cached copy:', 't-err');
      GITHUB_FALLBACK_REPOS.forEach(([n, d]) => termLine(`  ${n} — ${d}`, 't-accent'));
      termLink('  ↗ github.com/yyswhsccc', 'https://github.com/yyswhsccc');
    }
  }

  const NEOFETCH_ART = [
    '      ▄▄▄▄▄▄▄▄      ',
    '   ▄▄█▓▓▓▓▓▓▓▓█▄▄   ',
    '  █▓▓▓ ██ ▓▓ ██ ▓█  ',
    ' █▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓█ ',
    ' █▓▓▓▓▓▓ ◡ ▓▓▓▓▓▓█ ',
    '  █▓▓▓▓▓▓▓▓▓▓▓▓▓▓█  ',
    '   ▀▀█▄▄▄▄▄▄▄▄█▀▀   '
  ];

  // --- tiny bilingual helper: the shell speaks EN and FR ---
  function trT(en, fr) {
    return (yosLang === 'fr' && fr) ? fr : en;
  }

  // --- virtual file system: `ls` + `cat` make the desktop feel like a real box ---
  const TERM_BOOT_TIME = Date.now();

  const TERM_FS = {
    'about_me.ini': {
      en: [
        ['[ABOUT_ME]', 't-accent'],
        ['role     = Systems/LMS & Full-Stack Lead · AI/Data practitioner'],
        ['years    = 3+ (platform engineering · data science · MLOps)'],
        ['ships    = production AWS stacks, hardened security, SRE automation'],
        ['proof    = this OS: hand-written HTML/CSS/JS, zero frameworks'],
        ['contact  = yuyongshan573@gmail.com', 't-ok']
      ],
      fr: [
        ['[A_PROPOS]', 't-accent'],
        ['rôle     = Lead Systèmes/LMS & Full-Stack · praticienne IA/Data'],
        ['années   = 3+ (ingénierie de plateforme · data science · MLOps)'],
        ['livre    = stacks AWS en production, sécurité durcie, automatisation SRE'],
        ['preuve   = cet OS : HTML/CSS/JS écrits à la main, zéro framework'],
        ['contact  = yuyongshan573@gmail.com', 't-ok']
      ]
    },
    'druid.log': {
      en: [
        ['DRUID — agentic engineering OS (built by yongshan)', 't-accent'],
        ['loop: scan → classify risk → patch+tests → PR → track review → learn → stop-loss'],
        ['  47 merged PRs total', 't-ok'],
        ['  45 maintainer-reviewed outcomes in RustChain', 't-ok'],
        ['  36 PRs in active review · ~34 clean PRs/week', 't-ok'],
        ['focus: money-path, bridge, UTXO, payout & governance surfaces'],
        ['humans keep the gates on high-risk changes.', 't-dim']
      ],
      fr: [
        ['DRUID — OS d’ingénierie agentique (créé par yongshan)', 't-accent'],
        ['boucle : scan → classement du risque → patch+tests → PR → suivi review → apprentissage → stop-loss'],
        ['  47 PR fusionnées au total', 't-ok'],
        ['  45 relues par les mainteneurs sur RustChain', 't-ok'],
        ['  36 PR en review active · ~34 PR propres/semaine', 't-ok'],
        ['cible : code financier, bridges, UTXO, paiements & gouvernance'],
        ['les humains gardent les décisions à haut risque.', 't-dim']
      ]
    },
    'skills.tree': {
      en: [
        ['~/skills', 't-dim'],
        ['├── python (pandas·numpy·pytorch·tf·huggingface)', 't-accent'],
        ['├── c/c++ · sql · r'],
        ['├── aws (s3·ec2) · azure · nginx · redis · mariadb'],
        ['├── agentops: coding-agent orchestration, CI-aware debugging'],
        ['├── ml: yolo · faster r-cnn · arima-garch · genAI'],
        ['├── sre: cloudwatch · tls/hsts · ufw/fail2ban · cron'],
        ['└── a11y: WCAG 2.1 AA (WAVE, Accessibility Insights)']
      ],
      fr: [
        ['~/compétences', 't-dim'],
        ['├── python (pandas·numpy·pytorch·tf·huggingface)', 't-accent'],
        ['├── c/c++ · sql · r'],
        ['├── aws (s3·ec2) · azure · nginx · redis · mariadb'],
        ['├── agentops : orchestration d’agents de code, débogage lié à la CI'],
        ['├── ml : yolo · faster r-cnn · arima-garch · IA générative'],
        ['├── sre : cloudwatch · tls/hsts · ufw/fail2ban · cron'],
        ['└── a11y : WCAG 2.1 AA (WAVE, Accessibility Insights)']
      ]
    },
    'README.md': {
      en: [
        ['# YongshanOS — how this thing is built', 't-accent'],
        ['* window manager: vanilla JS, drag/stack/minimize, focus-restoring for a11y'],
        ['* themes: light / midnight — CSS custom-property palettes + baked sprite skins'],
        ['* i18n: EN/FR dictionary, auto-detected from the browser'],
        ['* likes: shared counter on Abacus (every visitor sees the same wall)'],
        ['* audio: 8-bit synth on the Web Audio API, no samples'],
        ['* game: canvas runner @60fps, procedural pixel props, boss waves'],
        ['* frameworks used: 0. libraries used: 0.', 't-ok']
      ],
      fr: [
        ['# YongshanOS — comment c’est construit', 't-accent'],
        ['* gestionnaire de fenêtres : JS pur, drag/empilement/réduction, focus restauré (a11y)'],
        ['* thèmes : clair / minuit — palettes en variables CSS + skins de sprites'],
        ['* i18n : dictionnaire EN/FR, détecté depuis le navigateur'],
        ['* likes : compteur partagé sur Abacus (tout le monde voit le même mur)'],
        ['* audio : synthé 8-bit sur Web Audio API, sans samples'],
        ['* jeu : runner canvas à 60 fps, décors pixel procéduraux, vagues de boss'],
        ['* frameworks utilisés : 0. bibliothèques : 0.', 't-ok']
      ]
    },
    '.secrets': {
      en: [['cat: .secrets: permission denied (even spies have boundaries)', 't-err']],
      fr: [['cat: .secrets : permission refusée (même les espions ont des limites)', 't-err']]
    }
  };

  const TERM_APPS = {
    'career_quest.exe': 'win-career',
    'inventory.sav': 'win-skills',
    'stream_chat.log': 'win-chat',
    'ask_me.chat': 'win-ama',
    'slime_run.exe': 'win-game',
    'education_awards.txt': 'win-education',
    'start_here.txt': 'win-start-here',
    'slime_live.exe': 'win-live',
    'hall_of_slime.exe': 'win-leaderboard',
    'interview_scheduler.exe': 'win-interview',
    'terminal.exe': 'win-terminal'
  };

  const TERM_OPEN_MAP = {
    career: 'win-career', quest: 'win-career',
    skills: 'win-skills', inventory: 'win-skills',
    chat: 'win-chat', stream: 'win-chat',
    ama: 'win-ama', ask: 'win-ama', about: 'win-ama',
    game: 'win-game', run: 'win-game',
    lb: 'win-leaderboard', top: 'win-leaderboard', hall: 'win-leaderboard',
    interview: 'win-interview',
    edu: 'win-education', education: 'win-education',
    search: 'win-search', start: 'win-start-here', terminal: 'win-terminal'
  };

  function termCatFile(name) {
    if (!name) { termLine(trT('cat: which file? try `ls`', 'cat : quel fichier ? essayez `ls`'), 't-err'); return; }
    const key = Object.keys(TERM_FS).find((f) => f.toLowerCase() === name.toLowerCase());
    if (key) {
      const doc = TERM_FS[key][yosLang === 'fr' ? 'fr' : 'en'] || TERM_FS[key].en;
      doc.forEach(([text, cls]) => termLine(text, cls || ''));
      return;
    }
    const appKey = Object.keys(TERM_APPS).find((f) => f.toLowerCase() === name.toLowerCase());
    if (appKey) {
      termLine(trT(`cat: ${appKey}: binary file — opening it in a window instead`, `cat : ${appKey} : fichier binaire — ouverture dans une fenêtre`), 't-dim');
      openWindow(TERM_APPS[appKey]);
      return;
    }
    termLine(trT(`cat: ${name}: no such file — try \`ls\``, `cat : ${name} : fichier introuvable — essayez \`ls\``), 't-err');
  }

  const TERM_COMMANDS = {
    help() {
      termLine(trT('YongshanOS shell — everything on this desktop answers to it:', 'shell YongshanOS — tout ce bureau lui obéit :'), 't-dim');
      termLine(trT('FILES     ls · cat <file> · open <app>', 'FICHIERS  ls · cat <fichier> · open <app>'), 't-accent');
      termLine(trT('SYSTEM    ps · kill <app> · theme <light|dark> · lang <en|fr> · uptime · neofetch', 'SYSTÈME   ps · kill <app> · theme <light|dark> · lang <en|fr> · uptime · neofetch'));
      termLine(trT('PET OPS   pet · pet feed|play|nap · stats', 'FAMILIER  pet · pet feed|play|nap · stats'));
      termLine(trT('NETWORK   repos (live GitHub) · like · fans · lb · search <query>', 'RÉSEAU    repos (GitHub en direct) · like · fans · lb · search <requête>'));
      termLine(trT('TALK      ask <question> (pipes into slime_bot) · whoami · contact', 'PARLER    ask <question> (envoyée à slime_bot) · whoami · contact'));
      termLine(trT('CLASSIC   echo · history · man <cmd> · clear · exit', 'CLASSIQUE echo · history · man <cmd> · clear · exit'));
      termLine(trT('sudo hire yongshan — you know you want to', 'sudo hire yongshan — vous en mourez d’envie'), 't-accent');
    },
    ls() {
      const files = Object.keys(TERM_FS).filter((f) => !f.startsWith('.'));
      termLine(files.join('   '), 't-ok');
      termLine(Object.keys(TERM_APPS).join('   '), 't-accent');
      termLine('.secrets', 't-dim');
    },
    ps() {
      termLine(trT('  PID  NAME                 STATUS', '  PID  NOM                  ÉTAT'), 't-dim');
      let pid = 1;
      termLine(`  ${String(pid++).padStart(3)}  slime.pet            ${trT('mood', 'humeur')}=${translateMood(pet.mood)} ${trT('energy', 'énergie')}=${pet.energy}% fans=${pet.followers}`, 't-ok');
      windows.forEach((win) => {
        if (win.classList.contains('window-closed')) return;
        const title = win.querySelector('.window-title').textContent;
        const st = win.classList.contains('window-minimized') ? trT('minimized', 'réduit') : trT('running', 'actif');
        termLine(`  ${String(pid++).padStart(3)}  ${title.padEnd(20).slice(0, 20)} ${st}`, 't-accent');
      });
      termLine(`  ${String(pid++).padStart(3)}  danmaku.daemon       ${document.getElementById('win-chat').classList.contains('window-closed') ? trT('whispering', 'chuchote') : trT('idle', 'en veille')}`);
      termLine(`  ${String(pid++).padStart(3)}  abacus.sync          ${remoteLikes !== null ? trT('connected', 'connecté') : trT('offline-fallback', 'repli hors-ligne')}`);
    },
    uptime() {
      const secs = Math.floor((Date.now() - TERM_BOOT_TIME) / 1000);
      const m = Math.floor(secs / 60), sRem = secs % 60;
      termLine(trT(`up ${m}m ${sRem}s · 0 crashes · ${pet.followers} fans gained · vibes nominal`, `en ligne depuis ${m}m ${sRem}s · 0 plantage · ${pet.followers} fans gagnés · ambiance nominale`), 't-ok');
    },
    date() {
      termLine(new Date().toLocaleString(yosLang === 'fr' ? 'fr-CA' : 'en-CA'), 't-dim');
    },
    stats() {
      termLine(trT('slime.pet — live telemetry', 'slime.pet — télémétrie en direct'), 't-accent');
      termLine(`  ${trT('mood     ', 'humeur   ')} ${translateMood(pet.mood)}`);
      termLine(`  ${trT('energy   ', 'énergie  ')} ${'█'.repeat(Math.round(pet.energy / 10)).padEnd(10, '░')} ${pet.energy}%`, pet.energy < 30 ? 't-err' : 't-ok');
      termLine(`  ${trT('affection', 'affection')} ${'♥'.repeat(Math.round(pet.affection / 100 * 7)).padEnd(7, '♡')}`);
      termLine(`  fans      ★${pet.followers} · ${trT('total pets', 'caresses totales')} ${pet.totalPets}`);
    },
    fans() {
      termLine(trT(`site likes: ${likeTotal().toLocaleString()} ${remoteLikes !== null ? '(live shared counter)' : '(offline cache)'}`, `likes du site : ${likeTotal().toLocaleString()} ${remoteLikes !== null ? '(compteur partagé en direct)' : '(cache hors-ligne)'}`), 't-ok');
      termLine(trT(`slime fans: ★${pet.followers}`, `fans du slime : ★${pet.followers}`), 't-accent');
    },
    like() {
      if (siteLiked) { termLine(trT('already liked ♥ — it still counts in our hearts', 'déjà liké ♥ — ça compte quand même dans nos cœurs'), 't-dim'); return; }
      const btn = document.getElementById('btn-like-site');
      if (btn) btn.click();
      termLine(trT('♥ like registered on the shared wall. thank you!!', '♥ like enregistré sur le mur partagé. merci !!'), 't-ok');
    },
    whoami() {
      termLine(trT('yongshan yu — systems/LMS & full-stack lead, AI/data practitioner', 'yongshan yu — lead systèmes/LMS & full-stack, praticienne IA/data'), 't-accent');
      termLine(trT('deep dive: `cat about_me.ini` · `cat druid.log` · `ask <anything>`', 'pour creuser : `cat about_me.ini` · `cat druid.log` · `ask <question>`'), 't-dim');
    },
    contact() {
      termLine(trT('email:    yuyongshan573@gmail.com', 'courriel : yuyongshan573@gmail.com'), 't-accent');
      termLine(trT('phone:    +1 825-963-2725', 'tél :      +1 825-963-2725'));
      termLink('linkedin: linkedin.com/in/yongshan-yu-b9a713227', 'http://www.linkedin.com/in/yongshan-yu-b9a713227');
      termLink('github:   github.com/yyswhsccc', 'https://github.com/yyswhsccc');
    },
    neofetch() {
      NEOFETCH_ART.forEach((l) => termLine(l, 't-accent'));
      termLine('');
      termLine('yongshan@os', 't-ok');
      termLine('-----------', 't-dim');
      termLine(trT('OS:       YongshanOS v3 (Y2K pastel edition)', 'OS :      YongshanOS v3 (édition pastel Y2K)'));
      termLine(trT('Host:     hand-written HTML/CSS/JS — 0 frameworks', 'Hôte :    HTML/CSS/JS écrits à la main — 0 framework'));
      termLine(trT('Kernel:   window-manager 1.0 + 8-bit synth', 'Noyau :   window-manager 1.0 + synthé 8-bit'));
      termLine('Shell:    slime_sh');
      termLine(`${trT('Theme:   ', 'Thème :  ')} ${resolvedTheme()}`);
      termLine(trT('Pet:      1 slime (9 sprite frames, 2 outfits)', 'Familier : 1 slime (9 frames, 2 tenues)'));
      termLine(`Fans:     ${pet.followers} ★ · ${trT('site likes', 'likes du site')} ${likeTotal()}`);
      termLine(trT('Uptime:   coding since 2019, agents since 2025', 'Uptime :  code depuis 2019, agents depuis 2025'));
      const neoEgg = (DEVICE_EGGS[YOS_DEVICE.browser] || {}).neo || (OS_EGGS[YOS_DEVICE.os] || {}).neo || '';
      termLine(`Guest:    ${YOS_DEVICE.browser}/${YOS_DEVICE.os}/${YOS_DEVICE.device}${neoEgg ? ' — ' + neoEgg : ''}`, 't-accent');
    },
    pet() {
      petSlime();
      termLine(trT('*boing* the slime has been petted remotely. +1 fan', '*boing* le slime a été caressé à distance. +1 fan'), 't-ok');
    },
    clear() {
      if (termOut) termOut.innerHTML = '';
    },
    history() {
      termHistory.slice(-12).forEach((h, i) => termLine(`  ${i + 1}  ${h}`, 't-dim'));
    },
    repos: termCmdRepos,
    ad() {
      gInviteShownThisVisit = false;
      showGameInvite();
      termLine(trT('one artisanal popup, coming up', 'une popup artisanale, tout de suite'), 't-accent');
    },
    sleepwalk() {
      if (resolvedTheme() !== 'dark') { termLine(trT('sleepwalking requires the dark (try `theme dark`)', 'le somnambulisme exige la nuit (essayez `theme dark`)'), 't-err'); return; }
      if (slimeBody) slimeBody.classList.add('is-ghost-hidden');
      startSleepwalk();
      termLine(trT('💤 shhh… it rises…', '💤 chuuut… il se lève…'), 't-accent');
    },
    lb() {
      const board = store.get('yos-lb', []);
      termLine(trT('HALL OF SLIME — local top 10', 'PANTHÉON DU SLIME — top 10 local'), 't-accent');
      if (!board.length) termLine(trT('  (empty — go set a record)', '  (vide — va battre un record)'), 't-dim');
      board.forEach((e, i) => termLine(`  ${String(i + 1).padStart(2)}. ${e.n}  ${e.s}`, 't-ok'));
      openWindow('win-leaderboard');
    },
    skills() { termCatFile('skills.tree'); },
    druid() { termCatFile('druid.log'); }
  };

  const TERM_MAN = {
    ask: ['ask <question> — pipes your question into slime_bot (the AMA engine) and prints the answer here.', 'ask <question> — envoie votre question à slime_bot (le moteur AMA) et affiche la réponse ici.'],
    ps: ['ps — lists every running window plus the pet daemon. pair with `kill <name>`.', 'ps — liste chaque fenêtre ouverte plus le démon du familier. à combiner avec `kill <nom>`.'],
    kill: ['kill <app> — closes a window, e.g. `kill chat`. the slime is unkillable.', 'kill <app> — ferme une fenêtre, ex. `kill chat`. le slime est intuable.'],
    theme: ['theme <light|dark> — switches the OS palette (and the slime’s outfit).', 'theme <light|dark> — change la palette de l’OS (et la tenue du slime).'],
    like: ['like — registers a ♥ on the shared fan wall (Abacus counter, visible to every visitor).', 'like — ajoute un ♥ sur le mur partagé (compteur Abacus, visible par tous).'],
    search: ['search <query> — opens yongle_search with your query.', 'search <requête> — ouvre yongle_search avec votre requête.'],
    repos: ['repos — fetches yongshan’s repositories live from the GitHub API.', 'repos — récupère en direct les dépôts de yongshan via l’API GitHub.']
  };

  function runTermCommand(raw) {
    const input = raw.trim();
    if (!input) return;
    termLine(`yongshan@os:~$ ${input}`, 't-cmd');

    const lower = input.toLowerCase();
    const parts = input.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const rest = input.slice(parts[0].length).trim();
    const args = lower.split(/\s+/).slice(1);

    if (lower === 'sudo hire yongshan' || lower === 'hire' || lower === 'sudo hire') {
      termLine(trT('[sudo] password for recruiter: ********', '[sudo] mot de passe du recruteur : ********'), 't-dim');
      termLine(trT('✔ permission granted. everyone has permission for this one.', '✔ permission accordée. tout le monde a la permission pour celle-là.'), 't-ok');
      termLine(trT('→ email: yuyongshan573@gmail.com (copied to your heart)', '→ courriel : yuyongshan573@gmail.com (copié dans votre cœur)'), 't-accent');
      playFanfare();
      gainFollowers(3);
      return;
    }
    if (cmd === 'sudo') { termLine(trT('nice try. this slime respects the principle of least privilege.', 'bien tenté. ce slime respecte le principe du moindre privilège.'), 't-err'); return; }
    if (cmd === 'echo') { termLine(rest || ''); return; }
    if (cmd === 'cat') { termCatFile(rest); return; }
    if (cmd === 'man') {
      const man = TERM_MAN[args[0]];
      if (man) termLine(trT(man[0], man[1]), 't-dim');
      else termLine(trT(`man: no manual for "${args[0] || ''}" — \`help\` lists everything`, `man : pas de manuel pour « ${args[0] || ''} » — \`help\` liste tout`), 't-err');
      return;
    }
    if (cmd === 'ask') {
      if (!rest) { termLine(trT('ask: give me a question, e.g. `ask what is druid`', 'ask : posez une question, ex. `ask c\'est quoi druid`'), 't-err'); return; }
      termLine(trT('piping to slime_bot…', 'transmission à slime_bot…'), 't-dim');
      String(amaAnswerFor(rest)).split('\n').forEach((l) => termLine(l, 't-ok'));
      termLine(trT('(full chat UI: `open ama`)', '(interface complète : `open ama`)'), 't-dim');
      return;
    }
    if (cmd === 'search') {
      if (!rest) { termLine(trT('search: what are we looking for?', 'search : on cherche quoi ?'), 't-err'); return; }
      performSearch(rest);
      termLine(`→ yongle_search: "${rest}"`, 't-ok');
      return;
    }
    if (cmd === 'open') {
      const target = TERM_OPEN_MAP[args[0]] || TERM_APPS[args[0]];
      if (target) { openWindow(target); termLine(trT(`opening ${args[0]}…`, `ouverture de ${args[0]}…`), 't-ok'); }
      else termLine(trT(`open: unknown app "${args[0] || ''}" — try career/skills/chat/ama/game/edu`, `open : appli inconnue « ${args[0] || ''} » — essayez career/skills/chat/ama/game/edu`), 't-err');
      return;
    }
    if (cmd === 'kill') {
      if (args[0] === 'slime' || args[0] === 'slime.pet') { termLine(trT('kill: operation not permitted — the slime is pid 1 ♡', 'kill : opération interdite — le slime est le pid 1 ♡'), 't-err'); return; }
      const target = TERM_OPEN_MAP[args[0]] || TERM_APPS[args[0]];
      const win = target && document.getElementById(target);
      if (win && !win.classList.contains('window-closed')) {
        closeWindow(win);
        termLine(trT(`killed ${args[0]} (it’s fine, windows respawn)`, `${args[0]} terminé (pas de panique, les fenêtres réapparaissent)`), 't-ok');
      } else {
        termLine(trT(`kill: no running process "${args[0] || ''}" — see \`ps\``, `kill : aucun processus « ${args[0] || ''} » — voir \`ps\``), 't-err');
      }
      return;
    }
    if (cmd === 'theme') {
      const map = { light: 'light', dark: 'dark', auto: 'auto' };
      if (map[args[0]]) { setThemePref(map[args[0]]); termLine(`theme → ${args[0]}`, 't-ok'); }
      else termLine(trT('theme: usage `theme light|dark|auto`', 'theme : usage `theme light|dark|auto`'), 't-err');
      return;
    }
    if (cmd === 'lang') {
      if (args[0] === 'en' || args[0] === 'fr') { applyLang(args[0], true); termLine(`lang → ${args[0]}`, 't-ok'); }
      else termLine(trT('lang: usage `lang en|fr`', 'lang : usage `lang en|fr`'), 't-err');
      return;
    }
    if (cmd === 'pet' && args[0]) {
      if (args[0] === 'feed') { feedSlime(); termLine(trT('dropping a snack into the habitat…', 'une friandise tombe dans l\'habitat…'), 't-ok'); }
      else if (args[0] === 'play') { playWithSlime(); termLine(trT('ZOOMIES initiated.', 'ZOOMIES lancées.'), 't-ok'); }
      else if (args[0] === 'nap') { sleepSlime(); termLine(trT('tucking the slime in. shhh.', 'on borde le slime. chuuut.'), 't-ok'); }
      else termLine(trT('pet: usage `pet [feed|play|nap]`', 'pet : usage `pet [feed|play|nap]`'), 't-err');
      return;
    }
    if (cmd === 'rm') { termLine(trT('rm: refusing to delete cuteness (protected path)', 'rm : refus de supprimer la mignonnerie (chemin protégé)'), 't-err'); return; }
    if (cmd === 'exit') {
      termLine(trT('bye!! closing window ♡', 'bye !! fermeture de la fenêtre ♡'), 't-dim');
      setTimeout(() => closeWindow(termWindow), 400);
      return;
    }

    const handler = TERM_COMMANDS[cmd];
    if (handler) handler();
    else termLine(trT(`${cmd}: command not found — try \`help\``, `${cmd} : commande introuvable — essayez \`help\``), 't-err');
  }

  if (termForm && termInput) {
    termForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = termInput.value;
      termInput.value = '';
      if (value.trim()) {
        termHistory.push(value);
        termHistoryIdx = termHistory.length;
      }
      runTermCommand(value);
    });

    termInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (termHistoryIdx > 0) {
          termHistoryIdx--;
          termInput.value = termHistory[termHistoryIdx] || '';
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (termHistoryIdx < termHistory.length - 1) {
          termHistoryIdx++;
          termInput.value = termHistory[termHistoryIdx] || '';
        } else {
          termHistoryIdx = termHistory.length;
          termInput.value = '';
        }
      }
    });

    if (termShell) {
      termShell.addEventListener('click', () => termInput.focus());
    }
  }

  function termBootBanner() {
    if (!termOut || termOut.children.length) return;
    termLine(trT('YongshanOS terminal — hand-rolled, no libraries.', 'terminal YongshanOS — fait main, sans bibliothèques.'), 't-accent');
    termLine(trT('this shell drives the whole OS: windows, themes, the pet, even the fan wall.', 'ce shell pilote tout l\'OS : fenêtres, thèmes, le familier, même le mur de fans.'), 't-dim');
    termLine(trT('type `help` to see everything · `neofetch` to vibe · `ask <question>` to talk.', 'tapez `help` pour tout voir · `neofetch` pour l\'ambiance · `ask <question>` pour discuter.'), 't-dim');
    termLine('');
  }

  // Save bookmark click
  const btnSave = document.getElementById('btn-save-page');
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      playSparkleSound();
      showToast(t('toast.saved'));
      gainFollowers(1);
    });
  }

  /* =====================================================
     v3.0 — I18N ENGINE (EN/FR, auto-detected)
     ===================================================== */
  var yosLang; // resolved below; var so early hoisted callers fall back to EN safely

  function t(key) {
    const dict = window.YOS_I18N || {};
    return (dict[yosLang] && dict[yosLang][key]) || (dict.en && dict.en[key]) || key;
  }

  function dynD() {
    const d = window.YOS_DYN || {};
    return d[yosLang] || d.en || { idle: idlePhrases, pet: petPhrases, moods: {} };
  }

  function translateMood(mood) {
    const map = dynD().moods || {};
    return map[mood] || mood;
  }

  function detectBrowserLang() {
    const langs = navigator.languages || [navigator.language || 'en'];
    for (const l of langs) {
      const low = String(l).toLowerCase();
      if (low.startsWith('fr')) return 'fr';
      if (low.startsWith('en')) return 'en';
    }
    return 'en';
  }

  function applyLang(lang, persist) {
    yosLang = lang === 'fr' ? 'fr' : 'en';
    if (persist) store.set('yos-lang', yosLang);
    document.documentElement.lang = yosLang;

    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = t('meta.desc');

    const langBtn = document.getElementById('btn-lang-toggle');
    if (langBtn) langBtn.textContent = yosLang.toUpperCase();

    syncLikeBtn();
    updateSlimeHud();          // re-translate the mood word
    applyThemeChrome();        // tab title / document.title in the right language
    if (typeof amaRenderChips === 'function' && document.querySelector('.ama-chip')) {
      amaRenderChips();        // suggestion chips follow the language
    }
    if (typeof updateTaskbarAppButtons === 'function') updateTaskbarAppButtons();

    // the AMA feed follows too: re-greet if untouched, otherwise hand over politely
    if (typeof amaFeed !== 'undefined' && amaFeed && amaFeed.children.length) {
      if (!amaFeed.querySelector('.ama-msg-user')) {
        amaFeed.innerHTML = '';
        amaBootGreeting();
      } else {
        amaAddBot(yosLang === 'fr' ? 'on continue en français ! ♡' : "let's continue in English! ♡");
      }
    }
  }

  const langToggleBtn = document.getElementById('btn-lang-toggle');
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      playClickSound();
      const next = yosLang === 'fr' ? 'en' : 'fr';
      applyLang(next, true);
      showToast(t(next === 'fr' ? 'toast.lang.fr' : 'toast.lang.en'));
    });
  }

  /* =====================================================
     v3.0 — THEME MANAGER (light / midnight / spy mode)
     Follows the OS setting while pref is 'auto'.
     ===================================================== */
  var themePref = store.get('yos-theme', 'auto'); // 'auto' | 'light' | 'dark'
  if (themePref === 'incognito') themePref = 'dark'; // spy mode retired
  var nightSkyBuilt = false;
  const darkMQ = window.matchMedia('(prefers-color-scheme: dark)');

  function resolvedTheme() {
    if (themePref === 'auto') return darkMQ.matches ? 'dark' : 'light';
    return themePref === 'dark' ? 'dark' : 'light';
  }

  function applyThemeChrome() {
    const tabTitle = document.getElementById('tab-title');
    const tabIcon = document.getElementById('tab-icon');
    const secureIcon = document.getElementById('secure-icon');
    if (tabTitle) tabTitle.innerHTML = 'YongshanOS&nbsp;♡&nbsp;v2.0';
    if (tabIcon) tabIcon.textContent = '🌐';
    if (secureIcon) secureIcon.textContent = '🔒';
    document.title = t('meta.title');
  }


  function applyTheme() {
    const th = resolvedTheme();
    if (th === 'light') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', th);

    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) themeBtn.textContent = th === 'dark' ? '🌞' : '🌙';

    if (th === 'dark') buildNightSky();
    applyThemeChrome();
    gRefreshTheme();
    setSlimeSkin(th);
    syncGhostMode();
  }

  /* =====================================================
     v3.3 — NIGHT-AWAY ENGINE (dark mode)
     After dark the slime is a sleepy streamer: about half the
     time it announces bedtime and fades out for a while.
     Knocking on the habitat (or any pet action) wakes it up.
     ===================================================== */
  var nightLoopTimer = null;
  var nightRetireTimer = null;

  function awayLine(kind) {
    const fr = yosLang === 'fr';
    if (kind === 'retire') {
      return fr ? 'j\'ai sommeil… je vais me coucher 💤' : 'getting sleepy… going to bed 💤';
    }
    if (kind === 'return') {
      return fr ? 'me revoilàà !! je t\'ai manqué ? ♡' : 'I\'m baaack!! did you miss me ♡';
    }
    return fr ? 'ça va, ça va, je suis debout !! ♡' : 'okay okay, I\'m up!! ♡';
  }

  function ghostHidden() {
    return slimeBody && slimeBody.classList.contains('is-ghost-hidden');
  }

  function ghostVanish() {
    if (resolvedTheme() !== 'dark') return;
    if (pet.busy || pet.sleeping || isGrabbing) return;
    if (slimeBody) slimeBody.classList.add('is-ghost-hidden');
    // 70% of sleeps turn into a sleepwalking tour
    if (Math.random() < 0.7) {
      if (sleepwalkTimer) clearTimeout(sleepwalkTimer);
      sleepwalkTimer = setTimeout(() => startSleepwalk(), 5000 + Math.random() * 6000);
    }
  }

  // wake the slime up (summon); `line` false = silent
  function ghostAppear(duration, line) {
    if (!slimeBody) return;
    cancelSleepwalk();
    if (nightRetireTimer) { clearTimeout(nightRetireTimer); nightRetireTimer = null; }
    const wasAway = ghostHidden();
    slimeBody.classList.remove('is-ghost-hidden');
    if (line !== false && wasAway) {
      showBubble(typeof line === 'string' ? line : awayLine('wake'), 2400);
      playTone(659, 'sine', 0.18, 0, 0.05);
    }
  }

  const DREAM_LINES = {
    en: [
      'zzz… merge conflict… resolved with hugs…',
      'zzz… 99 little bugs in the code… 99 little bugs…',
      'mmh… five more minutes… the CI is still green…',
      'zzz… deploying dreams… straight to prod…',
      '*snore* …counting pixel sheep… 404 of them…',
      'zzz… boba… extra pearls… no ice…',
      'mmh… LGTM… approved… ♡',
      'zzz… the kanban board… is made of clouds…',
      '*mumble* …one more sprint… then snacks…',
      'zzz… my hitbox… is feelings…',
      'mmh… the recruiter… replied… in my dream…',
      'zzz… rebase… onto… my pillow…',
      'zzz… 404 sheep not found… counting anyway…',
      '*snore* …pixel-perfect… even asleep…',
      'mmh… production is quiet… too quiet… zzz'
    ],
    fr: [
      'zzz… conflit de merge… résolu avec des câlins…',
      'zzz… 99 petits bugs dans le code… 99 petits bugs…',
      'mmh… encore cinq minutes… la CI est toujours verte…',
      'zzz… je déploie des rêves… direct en prod…',
      '*ronfle* …je compte les moutons pixels… il y en a 404…',
      'zzz… bubble tea… double perles… sans glaçons…',
      'mmh… LGTM… approuvé… ♡',
      'zzz… le tableau kanban… est fait de nuages…',
      '*marmonne* …encore un sprint… puis le goûter…',
      'zzz… ma hitbox… c\'est des émotions…',
      'mmh… la recruteuse… a répondu… dans mon rêve…',
      'zzz… rebase… sur… mon oreiller…',
      'zzz… 404 moutons introuvables… je compte quand même…',
      '*ronfle* …pixel-perfect… même endormi…',
      'mmh… la prod est calme… trop calme… zzz'
    ]
  };

  function dreamTalk() {
    const pool = DREAM_LINES[yosLang === 'fr' ? 'fr' : 'en'];
    showBubble(pool[Math.floor(Math.random() * pool.length)], 2800, true);
    playTone(262, 'sine', 0.4, 0, 0.02); // the softest snore note
  }

  // sleep schedule: awake 9–13s, asleep 20–30s, retire chance 85%
  // → the slime spends 60%+ of dark mode in bed, as required by slime law
  function nightRetireNow() {
    if (resolvedTheme() !== 'dark' || ghostHidden()) return;
    showBubble(awayLine('retire'), 2200);
    nightRetireTimer = setTimeout(() => { nightRetireTimer = null; ghostVanish(); }, 1900);
  }

  function gameActive() {
    const gw = document.getElementById('win-game');
    return gw && !gw.classList.contains('window-closed') && !gw.classList.contains('window-minimized') && GAME.state === 'run';
  }

  const GAME_WAKE_LINES = [
    ["zzz… why are the bugs… stomping… huh?! WHO'S GAMING at this hour?!", "zzz… pourquoi les bugs… tapent des pieds… hein ?! QUI JOUE à cette heure-ci ?!"],
    ["mmh… the boss music… is in my dream… wait. it's REAL", "mmh… la musique du boss… est dans mon rêve… attends. c'est RÉEL"],
    ["zzz… five more minutes… is that… a GAME OVER I hear?!", "zzz… encore cinq minutes… c'est… un GAME OVER que j'entends ?!"],
    ["…dreaming of coins… clink… clink… CLINK?! I'm up!!", "…je rêvais de pièces… cling… cling… CLING ?! debout !!"]
  ];

  function nightWakeNarrated(grantEffect) {
    // dream-talk narrates the transition from asleep to awake
    showBubble(trT(...gPickWake()), 2400, true);
    setTimeout(() => {
      if (!ghostHidden()) return;
      slimeBody.classList.remove('is-ghost-hidden');
      if (grantEffect) {
        const good = gApplySleeperEffect();
        if (!good) {
          setSlimeFrame('grumpy', true);
          setTimeout(() => { if (currentFrame === 'grumpy') setSlimeFrame('base', true); }, 3000);
        }
        showBubble(good
          ? trT('…fine. take a blessing. now HUSH ♡', '…bon. prends une bénédiction. maintenant CHUT ♡')
          : trT('noise fine issued!! good night 💢💤', 'amende pour tapage !! bonne nuit 💢💤'), 2800);
        playTone(good ? 1046 : 220, good ? 'triangle' : 'sawtooth', 0.2, 0, 0.05);
      } else {
        showBubble(awayLine('return'), 2400);
        playStartupChime();
      }
    }, 1700);
  }

  function gPickWake() {
    return GAME_WAKE_LINES[Math.floor(Math.random() * GAME_WAKE_LINES.length)];
  }

  // game noise (boss horns, game-over jingles) can wake the sleeper —
  // and a woken slime always has opinions about your run
  function maybeWakeSleeper() {
    if (resolvedTheme() !== 'dark' || !ghostHidden()) return;
    if (GAME.muffled) return; // 🎧 the dream muffler absorbs the chaos
    if (Math.random() < 0.55) nightWakeNarrated(true);
  }

  function nightLoop() {
    if (nightLoopTimer) clearTimeout(nightLoopTimer);
    if (resolvedTheme() !== 'dark') return;
    const asleep = ghostHidden();
    const delay = asleep ? 34000 + Math.random() * 16000 : 7000 + Math.random() * 3500;
    nightLoopTimer = setTimeout(() => {
      if (resolvedTheme() === 'dark' && !pet.busy && !pet.sleeping && !isGrabbing && !sleepwalkActive) {
        if (ghostHidden()) {
          if (gameActive()) nightWakeNarrated(false); // dream narrates the wake-up
          else {
            slimeBody.classList.remove('is-ghost-hidden');
            showBubble(awayLine('return'), 2600);
            playStartupChime();
          }
        } else if (Math.random() < 0.9) {
          nightRetireNow();
        }
      }
      nightLoop();
    }, delay);
  }

  /* =====================================================
     v5.1 — THE SLEEPWALKER 💤
     70% of sleep cycles: the slime leaves its habitat with
     nightcap on and eyes closed, waddles across the screen
     to a random feature, opens it, and sleep-talks about it
     (a fully involuntary tour of Yongshan's strong points).
     70% of those walks end at slime_run — where it dives in
     and becomes a power-up.
     ===================================================== */
  var sleepwalkActive = false;
  var sleepwalkTimer = null;
  var swEl = null;

  const SW_TARGETS = [
    { sel: '[data-window="win-career"]', line: ["zzz… 47 merged PRs… all mine… well. hers…", "zzz… 47 PR fusionnées… toutes à moi… enfin. à elle…"] },
    { sel: '[data-window="win-skills"]', line: ["zzz… Python level five… so shiny…", "zzz… Python niveau cinq… ça brille…"] },
    { sel: '[data-window="win-ama"]', line: ["zzz… ask the bot… it knows… everything about her…", "zzz… demande au bot… il sait… tout sur elle…"] },
    { sel: '[data-window="win-terminal"]', line: ["zzz… sudo… hire… yongshan…", "zzz… sudo… hire… yongshan…"] },
    { sel: '#chip-fanwall', line: ["zzz… so many fans… need… more fans…", "zzz… tant de fans… il en faut… plus…"] },
    { sel: '[data-window="win-education"]', line: ["zzz… top five percent… of dreams…", "zzz… top cinq pour cent… des rêves…"] }
  ];
  const SW_GAME_LINE = ["zzz… I hear… an arcade… must… participate…", "zzz… j'entends… une borne d'arcade… je dois… participer…"];

  function swVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.top > 0 && r.bottom < window.innerHeight;
  }

  function startSleepwalk() {
    if (sleepwalkActive || resolvedTheme() !== 'dark' || !ghostHidden()) return;
    // choose destination: 70% the arcade, else a random visible feature
    let target, line, isGame = false;
    if (Math.random() < 0.7) {
      target = document.getElementById('chip-game');
      line = SW_GAME_LINE;
      isGame = true;
    } else {
      const options = SW_TARGETS.filter((t) => swVisible(document.querySelector(t.sel)));
      if (!options.length) { target = document.getElementById('chip-game'); line = SW_GAME_LINE; isGame = true; }
      else { const pickT = options[Math.floor(Math.random() * options.length)]; target = document.querySelector(pickT.sel); line = pickT.line; }
    }
    if (!swVisible(target)) return;
    sleepwalkActive = true;

    const habitatRect = slimeHabitat.getBoundingClientRect();
    swEl = document.createElement('div');
    swEl.className = 'sleepwalker';
    swEl.setAttribute('aria-hidden', 'true');
    const img = document.createElement('img');
    img.src = (OUTFIT_FRAMES && OUTFIT_FRAMES.sleep) || 'assets/slime_night_sleep.png'; // current fit, eyes closed
    img.alt = '';
    const bub = document.createElement('div');
    bub.className = 'sw-bubble';
    swEl.appendChild(img);
    swEl.appendChild(bub);
    document.body.appendChild(swEl);

    const from = { x: habitatRect.left + habitatRect.width / 2 - 36, y: habitatRect.top + habitatRect.height / 2 - 32 };
    const tr = target.getBoundingClientRect();
    const to = { x: tr.left + tr.width / 2 - 36, y: Math.max(8, tr.top - 46) };
    swEl.style.left = from.x + 'px';
    swEl.style.top = from.y + 'px';

    bub.textContent = trT(...line);
    swEl.classList.add('sw-talking');
    playTone(262, 'sine', 0.4, 0, 0.03);

    // time-based glide (background-tab safe)
    const t0 = Date.now();
    const walkMs = 3600;
    const glide = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / walkMs);
      const ease = p * p * (3 - 2 * p);
      swEl.style.left = (from.x + (to.x - from.x) * ease) + 'px';
      swEl.style.top = (from.y + (to.y - from.y) * ease + Math.sin(p * 14) * 5) + 'px';
      if (p >= 1) {
        clearInterval(glide);
        swArrive(target, isGame);
      }
    }, 40);
  }

  function swArrive(target, isGame) {
    // the sleepwalker "clicks" the feature open, still fast asleep
    try { target.click(); } catch { /* dream logic */ }
    playTone(392, 'sine', 0.25, 0, 0.04);

    if (isGame) {
      // dive into the canvas and transmute into a power-up
      setTimeout(() => {
        const cv = document.getElementById('game-canvas');
        const cr = cv ? cv.getBoundingClientRect() : null;
        if (cr && swEl) {
          const from = { x: parseFloat(swEl.style.left), y: parseFloat(swEl.style.top) };
          const to = { x: cr.left + cr.width * 0.3, y: cr.top + cr.height * 0.4 };
          const t0 = Date.now();
          const dive = setInterval(() => {
            const p = Math.min(1, (Date.now() - t0) / 1400);
            swEl.style.left = (from.x + (to.x - from.x) * p) + 'px';
            swEl.style.top = (from.y + (to.y - from.y) * p) + 'px';
            swEl.style.transform = `scale(${1 - p * 0.6}) rotate(${p * 340}deg)`;
            if (p >= 1) {
              clearInterval(dive);
              gSleepwalkerBlessing();
              swFinish(true);
            }
          }, 40);
        } else { swFinish(false); }
      }, 900);
    } else {
      // linger, sleep-brag, then dissolve back to bed
      setTimeout(() => swFinish(false), 3600);
    }
  }

  function swFinish(dove) {
    if (swEl) {
      swEl.classList.add('sw-fading');
      const el = swEl;
      setTimeout(() => el.remove(), 700);
      swEl = null;
    }
    if (dove) playSparkleSound();
    // it wanders back into bed off-screen; sleep continues
    setTimeout(() => { sleepwalkActive = false; }, 1200);
  }

  function cancelSleepwalk() {
    if (sleepwalkTimer) clearTimeout(sleepwalkTimer);
    if (swEl) { swEl.remove(); swEl = null; }
    sleepwalkActive = false;
  }

  var nightFirstTimer = null;

  function syncGhostMode() {
    if (!slimeBody) return;
    if (resolvedTheme() === 'dark') {
      // house rule: bedtime is announced within 5 seconds of nightfall
      if (nightFirstTimer) clearTimeout(nightFirstTimer);
      nightFirstTimer = setTimeout(nightRetireNow, 2100);
      nightLoop();
    } else {
      if (nightLoopTimer) clearTimeout(nightLoopTimer);
      if (nightRetireTimer) clearTimeout(nightRetireTimer);
      if (nightFirstTimer) clearTimeout(nightFirstTimer);
      cancelSleepwalk();
      slimeBody.classList.remove('is-ghost-hidden');
    }
  }

  // knocking on the empty habitat wakes the sleeping slime
  if (slimeHabitat) {
    slimeHabitat.addEventListener('click', (e) => {
      if (!ghostHidden()) return;
      if (e.target.closest('.slime-pet')) return;
      ghostAppear(0, awayLine('wake'));
      gainFollowers(1);
    });
  }

  function setThemePref(pref) {
    themePref = pref;
    store.set('yos-theme', pref);
    applyTheme();
  }

  const themeToggleBtn = document.getElementById('btn-theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      playSparkleSound();
      const goingDark = resolvedTheme() !== 'dark';
      setThemePref(goingDark ? 'dark' : 'light');
      showToast(t(goingDark ? 'toast.dark' : 'toast.light'));
      if (!pet.sleeping && !pet.busy) {
        showBubble(goingDark ? (yosLang === 'fr' ? 'mode minuit !! les néons ♡' : 'midnight mode!! neon time ♡') : (yosLang === 'fr' ? 'le soleil ! mes pixels bronzent' : 'sunlight! my pixels are tanning'), 2200);
      }
    });
  }

  // follow the OS when the user hasn't forced a theme
  const onSystemThemeChange = () => { if (themePref === 'auto') applyTheme(); };
  if (darkMQ.addEventListener) darkMQ.addEventListener('change', onSystemThemeChange);
  else if (darkMQ.addListener) darkMQ.addListener(onSystemThemeChange);

  // midnight starfield (stars + pixel moon + occasional shooting star)
  function buildNightSky() {
    if (nightSkyBuilt) return;
    nightSkyBuilt = true;
    const sky = document.getElementById('night-sky');
    if (!sky) return;

    const moon = document.createElement('div');
    moon.className = 'ns-moon';
    sky.appendChild(moon);

    for (let i = 0; i < 26; i++) {
      const star = document.createElement('span');
      const roll = Math.random();
      star.className = 'ns-star' + (roll < 0.33 ? ' ns-pink' : roll < 0.6 ? ' ns-blue' : '');
      star.textContent = Math.random() < 0.5 ? '✦' : '·';
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 68}%`;
      star.style.fontSize = `${7 + Math.random() * 9}px`;
      star.style.animationDelay = `${Math.random() * 3}s`;
      sky.appendChild(star);
    }

    setInterval(() => {
      if (REDUCED_MOTION) return;
      if (document.documentElement.getAttribute('data-theme') !== 'dark') return;
      if (Math.random() < 0.45) return;
      const shoot = document.createElement('span');
      shoot.className = 'ns-shoot';
      shoot.style.left = `${40 + Math.random() * 55}%`;
      shoot.style.top = `${5 + Math.random() * 40}%`;
      sky.appendChild(shoot);
      shoot.addEventListener('animationend', () => shoot.remove());
    }, 7000);
  }

  /* =====================================================
     v3.0 — REAL BROWSER NAVIGATION (back / forward / reload
     + editable address bar with internal routing)
     ===================================================== */
  const WIN_URLS = {
    'win-career': 'career_quest.exe',
    'win-skills': 'inventory.sav',
    'win-chat': 'stream_chat.log',
    'win-ama': 'ask_me.chat',
    'win-terminal': 'terminal.exe',
    'win-search': 'search',
    'win-game': 'slime_run.exe',
    'win-live': 'slime_live.exe',
    'win-leaderboard': 'hall_of_slime.exe',
    'win-interview': 'interview_scheduler.exe',
    'win-education': 'education_awards.txt',
    'win-start-here': 'start_here.txt'
  };
  const ADDR_ALIASES = {
    career: 'win-career', quest: 'win-career', skills: 'win-skills', inventory: 'win-skills',
    chat: 'win-chat', stream: 'win-chat', ama: 'win-ama', ask: 'win-ama',
    terminal: 'win-terminal', term: 'win-terminal', search: 'win-search',
    game: 'win-game', run: 'win-game', play: 'win-game',
    live: 'win-live',
    hiscore: 'win-leaderboard', top: 'win-leaderboard', leaderboard: 'win-leaderboard', hall: 'win-leaderboard',
    interview: 'win-interview', hire: 'win-interview',
    edu: 'win-education', education: 'win-education',
    about: 'win-ama', start: 'win-start-here', help: 'win-start-here'
  };
  const HOME_URL = 'https://yongshan.dev';

  var webNav = { stack: [{ type: 'home', url: HOME_URL }], idx: 0 };

  const addrInput = document.getElementById('address-input');
  const addrForm = document.getElementById('address-form');
  const navBackBtn = document.getElementById('nav-back');
  const navFwdBtn = document.getElementById('nav-forward');
  const navReloadBtn = document.getElementById('nav-reload');

  function navCurrent() { return webNav.stack[webNav.idx]; }

  function updateAddressBar() {
    if (addrInput && document.activeElement !== addrInput) addrInput.value = navCurrent().url;
    if (navBackBtn) navBackBtn.disabled = webNav.idx <= 0;
    if (navFwdBtn) navFwdBtn.disabled = webNav.idx >= webNav.stack.length - 1;
  }

  function pushNavEntry(entry) {
    if (navCurrent() && navCurrent().url === entry.url) { updateAddressBar(); return; }
    webNav.stack = webNav.stack.slice(0, webNav.idx + 1);
    webNav.stack.push(entry);
    webNav.idx++;
    updateAddressBar();
  }

  function yosPushNav(winId) {
    pushNavEntry({ type: 'win', id: winId, url: `${HOME_URL}/${WIN_URLS[winId] || winId}` });
  }

  function execNavEntry(entry) {
    if (entry.type === 'win') {
      openWindow(entry.id, { fromHistory: true });
    } else if (entry.type === 'search') {
      renderSearch(entry.q);
      openWindow('win-search', { fromHistory: true });
    }
    updateAddressBar();
  }

  if (navBackBtn) {
    navBackBtn.addEventListener('click', () => {
      if (webNav.idx <= 0) return;
      playCloseSound();
      webNav.idx--;
      execNavEntry(navCurrent());
    });
  }
  if (navFwdBtn) {
    navFwdBtn.addEventListener('click', () => {
      if (webNav.idx >= webNav.stack.length - 1) return;
      playClickSound();
      webNav.idx++;
      execNavEntry(navCurrent());
    });
  }
  if (navReloadBtn) {
    navReloadBtn.addEventListener('click', () => {
      playClickSound();
      navReloadBtn.classList.add('reload-spin');
      const frame = document.querySelector('.browser-frame');
      if (frame) frame.classList.add('crt-flash');
      setTimeout(() => window.location.reload(), 430);
    });
  }

  function handleAddressSubmit(raw) {
    const q = raw.trim();
    if (!q) return;
    playClickSound();

    const lower = q.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');

    if (lower === 'yongshan.dev' || lower === 'www.yongshan.dev' || lower === 'home') {
      pushNavEntry({ type: 'home', url: HOME_URL });
      return;
    }
    const path = lower.startsWith('yongshan.dev/') ? lower.slice('yongshan.dev/'.length) : lower;


    // konami spirit: whisper a cheat into the address bar, get coins next run
    if (path === 'cheat' || path === 'uwu' || path === 'iddqd') {
      store.set('yos-pending-coins', store.get('yos-pending-coins', 0) + 10);
      showToast(trT('cheat accepted. +10 coins next run. the slime saw nothing 👀', 'triche acceptée. +10 pièces à la prochaine run. le slime n\'a rien vu 👀'));
      playSparkleSound();
      updateAddressBar();
      return;
    }

    const winByPath = Object.keys(WIN_URLS).find((id) => WIN_URLS[id] === path);
    if (winByPath) { openWindow(winByPath); return; }
    if (ADDR_ALIASES[path]) { openWindow(ADDR_ALIASES[path]); return; }

    // looks like a real external URL → open it in a real tab
    if (!q.includes(' ') && /^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(lower)) {
      window.open(`https://${lower}`, '_blank', 'noopener');
      updateAddressBar();
      return;
    }

    performSearch(q);
  }

  if (addrForm && addrInput) {
    addrForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleAddressSubmit(addrInput.value);
      addrInput.blur();
    });
    addrInput.addEventListener('focus', () => addrInput.select());
    addrInput.addEventListener('blur', () => {
      setTimeout(() => { if (document.activeElement !== addrInput) updateAddressBar(); }, 150);
    });
  }

  /* =====================================================
     v3.0 — YONGLE SEARCH (top hits are always Yongshan ♡)
     ===================================================== */
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const searchMeta = document.getElementById('search-meta');
  const searchResults = document.getElementById('search-results');

  const SEARCH_PINNED = [
    {
      title: 'Yongshan Yu — AI/LMS Systems & Full-Stack Lead',
      url: 'yongshan.dev/ask_me.chat',
      desc: 'The person this entire operating system is about. 3+ years of platform engineering, data science and MLOps — ask the slime bot anything about her.',
      win: 'win-ama'
    },
    {
      title: 'Yongshan Yu | LinkedIn',
      url: 'linkedin.com/in/yongshan-yu-b9a713227',
      desc: 'Professional profile, endorsements, and the DM inbox recruiters keep mentioning in stream chat.',
      href: 'http://www.linkedin.com/in/yongshan-yu-b9a713227'
    },
    {
      title: 'yyswhsccc — GitHub',
      url: 'github.com/yyswhsccc',
      desc: 'Druid agent framework docs, RustChain PR history, and the source of the very site you are searching on.',
      href: 'https://github.com/yyswhsccc'
    },
    {
      title: 'ARC Moodle LMS — live production site',
      url: 'arc.attherootproject.ca',
      desc: 'A real WCAG 2.1 AA Moodle LMS on AWS, solo-built and self-healing. Yes, it is running right now.',
      href: 'https://arc.attherootproject.ca/login/index.php?loginredirect=1'
    }
  ];

  const SEARCH_LOCAL = [
    { title: 'career_quest.exe — 7 quests, 2 main story arcs', url: 'yongshan.dev/career_quest.exe', desc: 'RustChain agent engineering, the ARC Moodle LMS, HyperGAI data ops, and four research dungeons.', win: 'win-career', k: 'career job work experience resume cv quest rustchain druid agent moodle lms aws lead history emploi carrière' },
    { title: 'inventory.sav — skills & stats', url: 'yongshan.dev/inventory.sav', desc: 'Python, AWS, AgentOps, PyTorch/TF, Nginx, SQL/NoSQL, security, WCAG accessibility. Fully equipped.', win: 'win-skills', k: 'skills stack tech python aws ml ai pytorch tensorflow nginx sql security wcag a11y compétences' },
    { title: 'ask_me.chat — the slime knows everything', url: 'yongshan.dev/ask_me.chat', desc: 'A 100% client-side Q&A bot. Ask about Druid, the LMS, hiring, or restaurants. Works offline.', win: 'win-ama', k: 'ama ask question bot chat slime hire hiring recruit contact email restaurant food boba 餐厅 吃 美食 question embauche' },
    { title: 'stream_chat.log — live viewers', url: 'yongshan.dev/stream_chat.log', desc: 'The chat has opinions about her mAP50-95 scores. Donations keep coming in.', win: 'win-chat', k: 'chat stream live viewers twitch' },
    { title: 'terminal.exe — slime_sh', url: 'yongshan.dev/terminal.exe', desc: 'Type help, neofetch, druid, or sudo hire yongshan. A hand-rolled shell.', win: 'win-terminal', k: 'terminal shell cli console bash hacker neofetch sudo' },
    { title: 'slime_run.exe — the offline runner game', url: 'yongshan.dev/slime_run.exe', desc: 'A pixel runner starring the slime. Space to jump. Works with zero internet, unlike most of modern software.', win: 'win-game', k: 'game play runner dino offline jump fun jeu jouer 游戏' },
    { title: 'education_awards.txt', url: 'yongshan.dev/education_awards.txt', desc: 'MSc AI at NTU Singapore (GPA 4.21/5.0) + BSc CS at University of Alberta, with Distinction (top 5%).', win: 'win-education', k: 'education degree university school gpa msc bsc ntu alberta master scholarship distinction études diplôme' },
    { title: 'fan_wall.exe — people who ♥ this site', url: 'yongshan.dev/fan_wall.exe', desc: 'The avatar wall of everyone who clicked like. You could be on it in one click.', k: 'fan wall like heart love avatar popular 点赞 喜欢' },
    { title: 'the slime — a production-grade virtual pet', url: 'yongshan.dev/slime.pet', desc: 'State machine, combo detection, drag physics, sprite frames, auto-nap health protocol. Also: adorable.', win: 'win-start-here', k: 'slime pet cute tamagotchi mascot 史莱姆 宠物 mignon' },
    { title: 'hall_of_slime.exe — global leaderboard', url: 'yongshan.dev/hall_of_slime.exe', desc: 'Local arcade top-10 plus a worldwide tier census. Where does your run rank?', win: 'win-leaderboard', k: 'leaderboard hiscore high score rank top hall record classement 排行榜 排名' },
    { title: 'interview_scheduler.exe — book time with Yongshan', url: 'yongshan.dev/interview_scheduler.exe', desc: 'See her availability, pick a slot, both sides get emails. The HR fairy approves.', win: 'win-interview', k: 'interview hire schedule calendar meeting book entretien embauche 面试 日历 约' }
  ];

  function makeSearchResult({ title, url, desc, win, href, sponsored }) {
    const wrap = document.createElement('div');
    wrap.className = 'search-result' + (sponsored ? ' sr-sponsored' : '');

    if (sponsored) {
      const badge = document.createElement('span');
      badge.className = 'sr-badge';
      badge.textContent = t('search.sponsored');
      wrap.appendChild(badge);
    }

    let titleEl;
    if (href) {
      titleEl = document.createElement('a');
      titleEl.href = href;
      titleEl.target = '_blank';
      titleEl.rel = 'noopener noreferrer';
    } else {
      titleEl = document.createElement('button');
      titleEl.type = 'button';
      titleEl.addEventListener('click', () => { if (win) openWindow(win); });
    }
    titleEl.className = 'sr-title';
    titleEl.textContent = title;

    const urlEl = document.createElement('span');
    urlEl.className = 'sr-url';
    urlEl.textContent = (href ? '' : 'https://') + url;

    const descEl = document.createElement('div');
    descEl.className = 'sr-desc';
    descEl.textContent = desc;

    wrap.append(titleEl, urlEl, descEl);
    return wrap;
  }

  function renderSearch(q) {
    if (!searchResults) return;
    const query = (q || '').trim();
    if (searchInput && searchInput.value !== query) searchInput.value = query;
    searchResults.innerHTML = '';

    if (!query) {
      if (searchMeta) searchMeta.textContent = t('search.empty');
      SEARCH_PINNED.forEach((r) => searchResults.appendChild(makeSearchResult({ ...r, sponsored: true })));
      return;
    }

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored = SEARCH_LOCAL
      .map((r) => {
        const hay = (r.title + ' ' + r.desc + ' ' + r.k).toLowerCase();
        const score = terms.reduce((s, term) => s + (hay.includes(term) ? term.length : 0), 0);
        return { r, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    const fakeCount = 1000000 + Math.abs(hashStr(query)) % 8999999;
    if (searchMeta) searchMeta.textContent = t('search.meta').replace('{n}', fakeCount.toLocaleString(yosLang === 'fr' ? 'fr-FR' : 'en-US'));

    // her results always rank first. this is a feature, not a bug.
    SEARCH_PINNED.forEach((r) => searchResults.appendChild(makeSearchResult({ ...r, sponsored: true })));
    scored.forEach(({ r }) => searchResults.appendChild(makeSearchResult(r)));

    if (!scored.length) {
      const none = document.createElement('div');
      none.className = 'sr-desc';
      none.textContent = t('search.none');
      searchResults.appendChild(none);
    }

    const webline = document.createElement('div');
    webline.className = 'search-result sr-webline';
    const a = document.createElement('a');
    a.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = t('search.web').replace('{q}', query);
    webline.appendChild(a);
    searchResults.appendChild(webline);
  }

  function performSearch(q) {
    const query = q.trim();
    pushNavEntry({ type: 'search', q: query, url: `${HOME_URL}/search?q=${encodeURIComponent(query)}` });
    renderSearch(query);
    openWindow('win-search', { fromHistory: true });
    playTone(987.77, 'sine', 0.08, 0, 0.05);
  }

  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (searchInput.value.trim()) performSearch(searchInput.value);
    });
  }

  function hashStr(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return h;
  }

  /* =====================================================
     v3.0 — Y2K CONTEXT MENU (right-click, NSO flavored)
     ===================================================== */
  const ctxMenu = document.getElementById('ctx-menu');

  function hideCtxMenu() {
    if (ctxMenu && !ctxMenu.hidden) ctxMenu.hidden = true;
  }

  function ctxItem(label, fn, disabled) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ctx-item';
    btn.textContent = label;
    btn.disabled = !!disabled;
    btn.addEventListener('click', () => { hideCtxMenu(); fn(); });
    return btn;
  }

  function ctxSep() {
    const s = document.createElement('div');
    s.className = 'ctx-sep';
    return s;
  }

  function openCtxMenu(x, y, selection) {
    if (!ctxMenu) return;
    ctxMenu.innerHTML = '';

    const title = document.createElement('span');
    title.className = 'ctx-title';
    title.textContent = 'YongshanOS ♡';
    ctxMenu.appendChild(title);

    ctxMenu.appendChild(ctxItem(t('ctx.back'), () => navBackBtn && navBackBtn.click(), webNav.idx <= 0));
    ctxMenu.appendChild(ctxItem(t('ctx.forward'), () => navFwdBtn && navFwdBtn.click(), webNav.idx >= webNav.stack.length - 1));
    ctxMenu.appendChild(ctxItem(t('ctx.reload'), () => navReloadBtn && navReloadBtn.click()));
    ctxMenu.appendChild(ctxSep());

    if (selection) {
      const short = selection.length > 22 ? selection.slice(0, 22) + '…' : selection;
      ctxMenu.appendChild(ctxItem(t('ctx.search').replace('{q}', short), () => performSearch(selection)));
      ctxMenu.appendChild(ctxSep());
    }

    ctxMenu.appendChild(ctxItem(t('ctx.game'), () => openWindow('win-game')));
    ctxMenu.appendChild(ctxItem(t('ctx.terminal'), () => openWindow('win-terminal')));
    ctxMenu.appendChild(ctxItem(t('ctx.ama'), () => openWindow('win-ama')));
    ctxMenu.appendChild(ctxItem(t('ctx.pet'), () => petSlime()));
    ctxMenu.appendChild(ctxSep());

    const isDark = resolvedTheme() === 'dark';
    ctxMenu.appendChild(ctxItem(t(isDark ? 'ctx.theme.light' : 'ctx.theme.dark'), () => themeToggleBtn && themeToggleBtn.click()));
    ctxMenu.appendChild(ctxItem(t('ctx.lang'), () => langToggleBtn && langToggleBtn.click()));
    ctxMenu.appendChild(ctxSep());

    ctxMenu.appendChild(ctxItem(t('ctx.copyEmail'), () => copyEmail()));
    ctxMenu.appendChild(ctxItem(t('ctx.share'), () => shareSite()));
    ctxMenu.appendChild(ctxItem(t('ctx.viewSource'), () => window.open('https://github.com/yyswhsccc', '_blank', 'noopener')));

    ctxMenu.hidden = false;
    const rect = ctxMenu.getBoundingClientRect();
    ctxMenu.style.left = `${Math.min(x, window.innerWidth - rect.width - 8)}px`;
    ctxMenu.style.top = `${Math.min(y, window.innerHeight - rect.height - 8)}px`;
    playClickSound();
  }

  document.addEventListener('contextmenu', (e) => {
    // keep the native menu on text fields (paste etc.)
    if (e.target instanceof Element && e.target.closest('input, textarea, [contenteditable="true"]')) { hideCtxMenu(); return; }
    e.preventDefault();
    const selection = String(window.getSelection() || '').trim();
    openCtxMenu(e.clientX, e.clientY, selection);
  });
  document.addEventListener('click', (e) => {
    if (ctxMenu && !ctxMenu.hidden && !ctxMenu.contains(e.target)) hideCtxMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    hideCtxMenu();
    const active = [...windows].find((w) => w.classList.contains('window-active') &&
      !w.classList.contains('window-closed') && !w.classList.contains('window-minimized'));
    if (active) closeWindow(active);
  });
  window.addEventListener('resize', hideCtxMenu);
  window.addEventListener('scroll', hideCtxMenu, { passive: true });

  /* =====================================================
     v3.0 — FAN WALL (avatar wall + like button + share)
     ===================================================== */
  const fanWallGrid = document.getElementById('fan-wall-grid');
  const likeCountEl = document.getElementById('like-count');
  const likeBtn = document.getElementById('btn-like-site');
  const shareBtn = document.getElementById('btn-share-site');

  const FAN_NAMES = [
    'recruiter_chan', 'pixel_witch', 'aws_wizard', 'moodle_mod', 'data_goblin',
    'ml_nerd', 'oss_maintainer', 'night_owl', 'infra_cat', 'genai_lurker',
    'sre_enjoyer', 'boba_dev', 'y2k_angel', 'css_fairy', 'bug_hunter',
    'lofi_coder', 'kbd_gremlin', 'star_collector', 'jelly_lover', 'uptime_uncle',
    'pastel_punk', 'hr_bot'
  ];
  const BASE_LIKES = 317;
  const AVATAR_PALETTE = ['#ff8fc7', '#f0509f', '#c9a7f5', '#9a6fe0', '#6cc4f5', '#b8f4d1', '#ffe98a'];

  var siteLiked = store.get('yos-liked', false);

  function drawIdenticon(canvas, seed) {
    const size = 10;
    canvas.width = size;
    canvas.height = size;
    const c2 = canvas.getContext('2d');
    let h = Math.abs(hashStr(seed));
    const bg = '#fff0fa';
    const fg = AVATAR_PALETTE[h % AVATAR_PALETTE.length];
    const fg2 = AVATAR_PALETTE[(h >> 3) % AVATAR_PALETTE.length];
    c2.fillStyle = bg;
    c2.fillRect(0, 0, size, size);
    // 5 columns mirrored to 10 — classic identicon symmetry
    for (let yPix = 1; yPix < size - 1; yPix++) {
      for (let xPix = 1; xPix <= size / 2 - 1; xPix++) {
        h = (h * 1103515245 + 12345) & 0x7fffffff;
        if (h % 100 < 44) {
          c2.fillStyle = (h % 7 === 0) ? fg2 : fg;
          c2.fillRect(xPix, yPix, 1, 1);
          c2.fillRect(size - 1 - xPix, yPix, 1, 1);
        }
      }
    }
    return canvas;
  }

  function addFanAvatar(name, opts = {}) {
    if (!fanWallGrid) return;
    const cell = document.createElement('div');
    cell.className = 'fan-avatar' + (opts.you ? ' fan-you' : '') + (opts.fresh ? ' fan-new' : '');
    cell.title = opts.you ? t('wall.you') : `${name} ♥`;
    const cv = document.createElement('canvas');
    drawIdenticon(cv, opts.seed || name);
    cell.appendChild(cv);
    if (opts.prepend) fanWallGrid.prepend(cell);
    else fanWallGrid.appendChild(cell);
  }

  // --- shared like counter (Abacus — free, CORS-open key/value counter).
  //     Every visitor's like lands in the same bucket, so the wall shows a
  //     real global count. Falls back to the local-only count when offline.
  const LIKE_API = 'https://abacus.jasoncameron.dev';
  const LIKE_NS = 'yongshanos-yyswhsccc';
  const LIKE_KEY = 'site-likes';
  var remoteLikes = null; // null = API not reachable (yet)

  function likeTotal() {
    const dynamic = remoteLikes !== null ? remoteLikes : (siteLiked ? 1 : 0);
    return BASE_LIKES + FAN_NAMES.length + dynamic;
  }

  function syncLikeBtn() {
    if (likeBtn) {
      likeBtn.classList.toggle('is-liked', !!siteLiked);
      likeBtn.textContent = siteLiked ? t('wall.liked') : t('wall.like');
    }
    if (likeCountEl) likeCountEl.textContent = likeTotal().toLocaleString();
    const chipCount = document.getElementById('chip-like-count');
    if (chipCount) chipCount.textContent = likeTotal().toLocaleString();
  }

  // deterministic "anonymous fan" avatars for likes that came from other
  // visitors — everyone sees the same wall
  var anonFansShown = 0;
  function syncAnonFans() {
    if (!fanWallGrid || remoteLikes === null) return;
    const others = Math.max(0, remoteLikes - (siteLiked ? 1 : 0));
    const target = Math.min(others, 12);
    while (anonFansShown < target) {
      anonFansShown++;
      addFanAvatar(`anon_fan_${anonFansShown}`, { seed: `anon♡${anonFansShown}` });
    }
  }

  function fetchRemoteLikes() {
    fetch(`${LIKE_API}/get/${LIKE_NS}/${LIKE_KEY}`)
      .then((r) => (r.ok ? r.json() : { value: 0 }))
      .then((d) => {
        remoteLikes = Math.max(0, Number(d.value) || 0);
        // never show fewer likes than the visitor's own saved one
        if (siteLiked && remoteLikes === 0) remoteLikes = 1;
        syncLikeBtn();
        syncAnonFans();
      })
      .catch(() => { /* offline / blocked — local count still works */ });
  }

  function initFanWall() {
    if (!fanWallGrid) return;
    if (siteLiked) {
      addFanAvatar('you', { you: true, seed: store.get('yos-avatar-seed', 'you♡') });
    }
    FAN_NAMES.forEach((n) => addFanAvatar(n));
    syncLikeBtn();
    fetchRemoteLikes();
  }

  if (likeBtn) {
    likeBtn.addEventListener('click', () => {
      if (siteLiked) {
        playTone(987.77, 'sine', 0.08, 0, 0.05);
        showToast(t('toast.alreadyLiked'));
        burstAtSlime(['♥', '♡'], 3);
        return;
      }
      siteLiked = true;
      const seed = `you-${Date.now()}-${Math.random()}`;
      store.set('yos-liked', true);
      store.set('yos-avatar-seed', seed);
      addFanAvatar('you', { you: true, fresh: true, prepend: true, seed });

      // optimistic bump, then reconcile with the shared counter
      if (remoteLikes !== null) remoteLikes++;
      syncLikeBtn();
      fetch(`${LIKE_API}/hit/${LIKE_NS}/${LIKE_KEY}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && Number(d.value) > 0) {
            remoteLikes = Number(d.value);
            syncLikeBtn();
            syncAnonFans();
          }
        })
        .catch(() => { /* like stays local until they're back online */ });

      playFanfare();
      gainFollowers(5);
      showToast(t('toast.liked'));
      if (!pet.sleeping && !pet.busy) {
        showBubble(yosLang === 'fr' ? 'un nouveau fan !! je t\'aime aussi ♡' : 'a new fan!! I love you too ♡', 2600);
        moveSlime({ action: 'happy', mood: 'adored', duration: 800, distance: 0.3 });
      }
    });
  }

  // --- collapse to a taskbar chip (the wall is a plugin, not a resident) ---
  const fanWallEl = document.getElementById('fan-wall');
  const fanWallToggleBtn = document.getElementById('fan-wall-toggle');
  const fanChip = document.getElementById('chip-fanwall');
  var wallOpen = store.get('yos-wall-open', false);

  function applyWallState() {
    if (fanWallEl) fanWallEl.classList.toggle('is-collapsed', !wallOpen);
    if (fanChip) {
      fanChip.classList.toggle('is-open', wallOpen);
      fanChip.setAttribute('aria-expanded', String(wallOpen));
    }
    if (fanWallToggleBtn) fanWallToggleBtn.setAttribute('aria-expanded', String(wallOpen));
  }

  function toggleWall() {
    wallOpen = !wallOpen;
    store.set('yos-wall-open', wallOpen);
    playClickSound();
    applyWallState();
    if (wallOpen && fanWallEl) fanWallEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  if (fanChip) fanChip.addEventListener('click', toggleWall);
  if (fanWallToggleBtn) fanWallToggleBtn.addEventListener('click', toggleWall);
  applyWallState();
  // a gentle pulse invites first-time visitors to peek at the wall
  if (!wallOpen && fanChip && !siteLiked) {
    setTimeout(() => fanChip.classList.add('pulse-invite'), 3200);
  }

  function shareSite() {
    const shareData = {
      title: t('meta.title'),
      text: t('meta.desc'),
      url: window.location.href
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => { /* user closed the sheet */ });
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(window.location.href).then(() => showToast(t('toast.shared')));
    } else {
      showToast(window.location.href);
    }
  }

  if (shareBtn) shareBtn.addEventListener('click', () => { playSparkleSound(); shareSite(); });

  /* =====================================================
     v3.0 — SLIME RUNNER (offline mini game, canvas, no engine)
     ===================================================== */
  const gCanvas = document.getElementById('game-canvas');
  const gWin = document.getElementById('win-game');
  const gScoreEl = document.getElementById('game-score');
  const gHiEl = document.getElementById('game-hi');
  const gBanner = document.getElementById('game-offline-banner');

  var gTheme = { ink: '#5a3d6e', pink: '#f0509f', purple: '#9a6fe0', blue: '#6cc4f5', mint: '#43b581' };

  function gRefreshTheme() {
    const cs = getComputedStyle(document.documentElement);
    const grab = (v, fb) => (cs.getPropertyValue(v).trim() || fb);
    gTheme = {
      ink: grab('--text', '#5a3d6e'),
      pink: grab('--pink-deep', '#f0509f'),
      purple: grab('--purple-dark', '#9a6fe0'),
      blue: grab('--blue-dark', '#6cc4f5'),
      mint: '#43b581'
    };
  }

  const GAME = {
    state: 'idle',            // idle | run | over
    y: 0, vy: 0,              // slime height above ground
    obs: [], clouds: [],
    props: [],                // parallax pixel doodads (boba, cats, rainbows…)
    boss: null, pickup: null, shots: [], sparks: [],
    boba: [], fever: 0, toast: null, milestones: {},
    lives: 1, coins: 0, loot: [], weapon: null,
    mods: {}, decisions: [], runSeed: 0, event: null,
    nextEventSec: 24, invUntil: 0, hitRects: [], flash: 0,
    runStart: 0, mercyUsed: false, muffled: false, interviewChain: false, joyAt: -999,
    nextBossAt: 300,
    speed: 3.4, score: 0, spawnIn: 60, frame: 0,
    hi: store.get('yos-runner-hi', 0)
  };
  const G_W = 480, G_H = 160, G_GROUND = 132, G_SLIME_X = 46, G_SLIME_S = 34;

  const gSprite = new Image();
  gSprite.src = 'assets/slime_pet_cutout.png';

  // crisp pixels: back the canvas at devicePixelRatio × display size, draw in
  // logical 480×160 coordinates through a transform. Text stops being soup.
  var G_SCALE = 1;
  function gFitCanvas() {
    if (!gCanvas || !gCanvas.getBoundingClientRect) return;
    const rect = gCanvas.getBoundingClientRect();
    if (!rect.width) return;
    const scale = Math.max(1, Math.min(4, (rect.width * (window.devicePixelRatio || 1)) / G_W));
    if (Math.abs(scale - G_SCALE) < 0.02 && gCanvas.width === Math.round(G_W * scale)) return;
    G_SCALE = scale;
    gCanvas.width = Math.round(G_W * scale);
    gCanvas.height = Math.round(G_H * scale);
  }
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('resize', () => setTimeout(gFitCanvas, 120));
  }

  function gReset() {
    GAME.obs = [];
    GAME.speed = 3.4;
    GAME.score = 0;
    GAME.spawnIn = 60;
    GAME.y = 0;
    GAME.vy = 0;
    GAME.boss = null;
    GAME.pickup = null;
    GAME.shots = [];
    GAME.sparks = [];
    GAME.nextBossAt = 300;
    GAME.boba = [];
    GAME.fever = 0;
    GAME.toast = null;
    GAME.milestones = {};
    GAME.lives = 1;
    GAME.coins = 0;
    GAME.loot = [];
    GAME.weapon = null;
    GAME.mods = {};
    GAME.decisions = [];
    GAME.runSeed = Math.floor(Math.random() * 1e9);
    GAME.event = null;
    GAME.nextEventSec = 24 + Math.random() * 8;
    GAME.invUntil = 0;
    GAME.hitRects = [];
    GAME.runStart = GAME.frame;
    GAME.joyAt = -999;
    GAME.mercyUsed = false;
    GAME.muffled = false;
    GAME.interviewChain = false;
    // gifts left by past selves (cheat egg / offline keepsake)
    const pendingCoins = store.get('yos-pending-coins', 0);
    if (pendingCoins) { GAME.coins += pendingCoins; store.set('yos-pending-coins', 0); }
    const pendingWeapon = store.get('yos-pending-weapon', null);
    if (pendingWeapon) { gGiveWeapon(pendingWeapon, false); store.set('yos-pending-weapon', null);
      gToast(["your keepsake answers the call once more ⚔️", "ta relique répond une fois de plus à l'appel ⚔️"], 160); }
    if (gPendingBoost) {
      gPendingBoost = false;
      const b = REWARD_BUFFS[Math.floor(Math.random() * REWARD_BUFFS.length)];
      b.fx();
      gToast([`HYPE BONUS: ${b.t[0]}`, `BONUS HYPE : ${b.t[1]}`], 220);
      playFanfare();
    }
  }

  function gJump() {
    if (GAME.event) return; // world is frozen mid-encounter
    if (GAME.state === 'idle' || GAME.state === 'over') {
      GAME.state = 'run';
      gReset();
      playClickSound();
      return;
    }
    if (GAME.y <= 0) {
      GAME.vy = 9.6 * modVal('jump');
      playTone(880 * (modActive('uwu') ? 1.5 : 1), 'square', 0.09, 0, 0.05);
      if (modActive('uwu')) playTone(1568, 'sine', 0.12, 0.06, 0.05); // embarrassing squeak
    }
  }

  function gGameOver() {
    GAME.state = 'over';
    playGlitchSound();
    maybeWakeSleeper();
    const finalScore = Math.floor(GAME.score);
    const isRecord = finalScore > GAME.hi;
    if (isRecord) {
      GAME.hi = finalScore;
      store.set('yos-runner-hi', GAME.hi);
      playFanfare();
      chatShout(`NEW HIGH SCORE: ${finalScore}!! the slime is unstoppable`, `NOUVEAU RECORD : ${finalScore} !! le slime est inarrêtable`);
    }
    gFinalizeRun(finalScore);
    // two faceplants under 200 in a row → the slime intervenes personally
    if (finalScore < 200) {
      gLowStreak++;
      if (gLowStreak >= 2) {
        gLowStreak = 0;
        setTimeout(gTryCoach, 1200);
      }
    } else {
      gLowStreak = 0;
    }
    if (!pet.sleeping && Math.random() < 0.6) {
      showBubble(yosLang === 'fr' ? 'aïe!! le bug m\'a eu' : 'ouch!! the bug got me', 1800);
    }
  }

  // --- tiny pixel-matrix sprites: the background easter eggs ---
  const G_MATS = {
    boba: ['...Y....', '...Y....', 'WWWWWWWW', '.pppppp.', '.pppppp.', '.pKppKp.', '.pKpKKp.', '.ppKpKp.', '..pppp..', '..WWWW..'],
    cat: ['.u....u.', '.uu..uu.', 'uuuuuuuu', 'uKuuuuKu', 'uuuPPuuu', 'uuuuuuuu', '.uuuuuu.'],
    sakura: ['..P.P..', '.PPPPP.', 'PPYYYPP', '.PPPPP.', '..P.P..'],
    gift: ['..Y..Y..', '..YYYY..', 'PPPPPPPP', 'PPPYYPPP', 'PPPYYPPP', 'PPPYYPPP', 'PPPPPPPP'],
    wand: ['.PP.PP.', 'PPPPPPP', '.PPPPP.', '..PPP..', '...P...', '...Y...', '...Y...', '...Y...'],
    heart: ['PP.PP', 'PPPPP', '.PPP.', '..P..'],
    boss: [
      '..K.......K..',
      '...K.....K...',
      '..UUUUUUUUU..',
      '.UUWWUUUWWUU.',
      '.UUWKUUUKWUU.',
      'UUUUUUUUUUUUU',
      'UpppppppppppU',
      'UpppppppppppU',
      '.UUUUUUUUUUU.',
      '.K..K...K..K.'
    ]
  };

  function gPal(ch) {
    switch (ch) {
      case 'P': return gTheme.pink;
      case 'p': return '#ffb3dd';
      case 'U': return gTheme.purple;
      case 'u': return '#c9a7f5';
      case 'Y': return '#ffe98a';
      case 'W': return '#ffffff';
      case 'K': return gTheme.ink;
      default: return null;
    }
  }

  function gDrawMat(g2, mat, x, y, cell) {
    for (let r = 0; r < mat.length; r++) {
      for (let c = 0; c < mat[r].length; c++) {
        const col = gPal(mat[r][c]);
        if (!col) continue;
        g2.fillStyle = col;
        g2.fillRect(Math.round(x + c * cell), Math.round(y + r * cell), cell, cell);
      }
    }
  }

  function gDrawRainbow(g2, x, y) {
    const cols = [gTheme.pink, '#ffe98a', '#8fd4fa'];
    cols.forEach((col, ci) => {
      const r = 16 - ci * 4;
      g2.fillStyle = col;
      for (let tArc = 0; tArc <= 12; tArc++) {
        const ang = Math.PI + (tArc * Math.PI) / 12;
        g2.fillRect(Math.round(x + Math.cos(ang) * r), Math.round(y + Math.sin(ang) * r), 3, 3);
      }
    });
  }

  const G_PROP_TYPES = ['boba', 'cat', 'sakura', 'gift', 'rainbow'];

  function gSpawnProp() {
    const type = G_PROP_TYPES[Math.floor(Math.random() * G_PROP_TYPES.length)];
    const grounded = type === 'boba' || type === 'gift';
    GAME.props.push({
      type,
      x: G_W + 24,
      y: grounded ? G_GROUND + G_SLIME_S - 4 - (type === 'boba' ? 20 : 14) : 18 + Math.random() * 52,
      cell: 2
    });
  }

  function gDrawProp(g2, p) {
    g2.globalAlpha = 0.85;
    if (p.type === 'rainbow') gDrawRainbow(g2, p.x, p.y + 14);
    else gDrawMat(g2, G_MATS[p.type], p.x, p.y, p.cell);
    g2.globalAlpha = 1;
  }

  function gDrawSlime(g2) {
    if (GAME.frame < GAME.invUntil && GAME.frame % 8 < 4) return; // i-frame flicker
    const bob = GAME.state === 'run' && GAME.y <= 0 ? Math.sin(GAME.frame * 0.35) * 2 : 0;
    const squash = (GAME.y <= 0 ? 1 + Math.sin(GAME.frame * 0.35) * 0.04 : 0.94) * modVal('size');
    const h = G_SLIME_S * squash;
    const yTop = G_GROUND - h - GAME.y + bob;
    if (gSprite.complete && gSprite.naturalWidth) {
      g2.drawImage(gSprite, G_SLIME_X, yTop, G_SLIME_S, h);
    } else {
      g2.fillStyle = '#7ee0a3';
      g2.fillRect(G_SLIME_X + 4, yTop + 8, G_SLIME_S - 8, h - 8);
      g2.fillStyle = gTheme.ink;
      g2.fillRect(G_SLIME_X + 10, yTop + 14, 3, 3);
      g2.fillRect(G_SLIME_X + 20, yTop + 14, 3, 3);
    }
  }

  function gDrawObstacle(g2, o) {
    const yTop = o.fly ? G_GROUND - 58 : G_GROUND - o.h - (o.jy || 0);
    if (o.fly) {
      // a floating "404" gremlin
      g2.fillStyle = gTheme.purple;
      g2.fillRect(o.x, yTop, o.w, 16);
      g2.fillStyle = '#ffffff';
      g2.font = "11px 'Jersey 25', 'VT323', monospace";
      g2.fillText('404', o.x + 4, yTop + 12);
    } else {
      // a pixel bug with little legs
      g2.fillStyle = gTheme.pink;
      g2.fillRect(o.x, yTop, o.w, o.h);
      g2.fillStyle = gTheme.purple;
      g2.fillRect(o.x + 2, yTop + 3, o.w - 4, 3);
      g2.fillStyle = '#ffffff';
      g2.fillRect(o.x + 3, yTop + o.h * 0.35, 3, 3);
      g2.fillRect(o.x + o.w - 6, yTop + o.h * 0.35, 3, 3);
      g2.fillStyle = gTheme.ink;
      const legPhase = Math.floor(GAME.frame / 4) % 2;
      for (let i = 0; i < 3; i++) {
        g2.fillRect(o.x + 2 + i * ((o.w - 6) / 2), G_GROUND - (legPhase === i % 2 ? 3 : 1), 2, legPhase === i % 2 ? 3 : 1);
      }
    }
  }

  function gTick() {
    requestAnimationFrame(gTick);
    if (!gCanvas || !gWin) return;
    if (gWin.classList.contains('window-closed') || gWin.classList.contains('window-minimized')) return;

    if (GAME.frame % 90 === 0) gFitCanvas();
    const g2 = gCanvas.getContext('2d');
    g2.setTransform(G_SCALE, 0, 0, G_SCALE, 0, 0);
    g2.imageSmoothingEnabled = false;
    GAME.frame++;
    g2.clearRect(0, 0, G_W, G_H);

    // parallax hearts drifting in the sky
    if (GAME.clouds.length < 4 && Math.random() < 0.02) {
      GAME.clouds.push({ x: G_W + 20, y: 14 + Math.random() * 60, c: Math.random() < 0.5 ? '♡' : '✦' });
    }
    g2.font = "13px 'Jersey 25', 'VT323', monospace";
    GAME.clouds.forEach((cl) => {
      cl.x -= 0.6;
      g2.fillStyle = cl.c === '♡' ? gTheme.pink : gTheme.blue;
      g2.globalAlpha = 0.55;
      g2.fillText(cl.c, cl.x, cl.y);
      g2.globalAlpha = 1;
    });
    GAME.clouds = GAME.clouds.filter((cl) => cl.x > -20);

    // parallax pixel props — little smiles in the background
    if (GAME.props.length < 3 && Math.random() < 0.008) gSpawnProp();
    GAME.props.forEach((p) => { p.x -= (GAME.state === 'run' ? GAME.speed * 0.35 : 0.4); });
    GAME.props = GAME.props.filter((p) => p.x > -40);
    GAME.props.forEach((p) => gDrawProp(g2, p));

    // floating boba to collect (+15, pure serotonin)
    if (gLive()) {
      if (GAME.boba.length < 2 && Math.random() < 0.006) {
        GAME.boba.push({ x: G_W + 16, y: 48 + Math.random() * 46, t: 0 });
      }
      GAME.boba.forEach((b) => { b.x -= gSpeed(); b.t++; });
      const sTop = G_GROUND - G_SLIME_S - GAME.y;
      GAME.boba = GAME.boba.filter((b) => {
        if (b.x > G_SLIME_X - 12 && b.x < G_SLIME_X + G_SLIME_S && b.y + 20 > sTop && b.y < sTop + G_SLIME_S) {
          GAME.score += 15;
          playSparkleSound();
          for (let i = 0; i < 6; i++) GAME.sparks.push({ x: b.x + 8, y: b.y + 10, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.8) * 4, life: 22 });
          return false;
        }
        return b.x > -20;
      });
    }
    GAME.boba.forEach((b) => gDrawMat(g2, G_MATS.boba, b.x, b.y + Math.sin(b.t * 0.1) * 3, 2));

    // rainbow fever: rare, loud, double points
    if (gLive()) {
      if (GAME.fever > 0) GAME.fever--;
      else if (Math.random() < 0.0011 && GAME.score > 60) {
        GAME.fever = 360;
        GAME.toast = { text: trT('🌈 RAINBOW FEVER — double points!!', '🌈 FIÈVRE ARC-EN-CIEL — points doublés !!'), ttl: 120 };
        playFanfare();
      }
    }
    if (GAME.fever > 0) {
      // rainbow contrail behind the slime
      const trailY = G_GROUND - G_SLIME_S - GAME.y;
      [gTheme.pink, '#ffe98a', '#8fd4fa'].forEach((col, ci) => {
        g2.globalAlpha = 0.5;
        g2.fillStyle = col;
        g2.fillRect(G_SLIME_X - 26, trailY + 8 + ci * 8, 24 - ((GAME.frame * 2 + ci * 6) % 10), 5);
        g2.globalAlpha = 1;
      });
    }

    // milestone commentary — the real reason to keep running
    if (gLive()) {
      [[100, ['100: HR has noticed you', '100 : les RH vous ont repéré·e']],
       [300, ['300: promoted to senior jumper', '300 : promu·e senior du saut']],
       [500, ['500: the bugs fear you now', '500 : les bugs ont peur de vous']],
       [800, ['800: offer letter incoming…', '800 : la promesse d\'embauche arrive…']]].forEach(([m, lines]) => {
        if (GAME.score >= m && !GAME.milestones[m]) {
          GAME.milestones[m] = true;
          GAME.toast = { text: trT(lines[0], lines[1]), ttl: 130 };
          playTone(1046, 'triangle', 0.12, 0, 0.05);
          playTone(1318, 'triangle', 0.16, 0.1, 0.05);
          gSpectate('cheer');
        }
      });
      // surprise donation banners from the chat regulars
      if (!GAME.toast && Math.random() < 0.0008 && GAME.score > 40) {
        const dono = [
          ['★ recruiter_chan donated $5: RUN FASTER', '★ recruiter_chan a donné 5 $ : COURS PLUS VITE'],
          ['★ hr_bot donated $2: nice form!!', '★ hr_bot a donné 2 $ : belle foulée !!'],
          ['★ boba_dev donated $8: hydrate!!', '★ boba_dev a donné 8 $ : hydrate-toi !!']
        ][Math.floor(Math.random() * 3)];
        GAME.toast = { text: trT(dono[0], dono[1]), ttl: 120 };
        playTone(1174, 'triangle', 0.1, 0, 0.04);
      }
    }
    if (GAME.flash > 0) {
      g2.fillStyle = `rgba(255, 255, 255, ${GAME.flash / 14})`;
      g2.fillRect(0, 0, G_W, G_H);
      GAME.flash--;
    }
    if (GAME.toast) {
      g2.textAlign = 'center';
      g2.font = "12px 'Jersey 25', 'VT323', monospace";
      g2.fillStyle = GAME.toast.ttl % 12 < 6 ? gTheme.pink : gTheme.purple;
      g2.fillText(GAME.toast.text, G_W / 2, 22);
      g2.textAlign = 'left';
      if (--GAME.toast.ttl <= 0) GAME.toast = null;
    }

    // dashed pixel ground
    g2.fillStyle = gTheme.purple;
    const dashShift = GAME.state === 'run' ? (GAME.frame * GAME.speed) % 18 : 0;
    for (let x = -18; x < G_W + 18; x += 18) {
      g2.fillRect(x - dashShift, G_GROUND + G_SLIME_S - 4, 10, 3);
    }

    if (gLive()) {
      // physics
      if (GAME.y > 0 || GAME.vy > 0) {
        GAME.y += GAME.vy;
        GAME.vy -= 0.52;
        if (GAME.y <= 0) { GAME.y = 0; GAME.vy = 0; }
      }

      // spawn + move obstacles
      GAME.spawnIn--;
      if (GAME.spawnIn <= 0) {
        const fly = GAME.score > 220 && Math.random() < 0.24;
        const hopper = !fly && GAME.score > 120 && Math.random() < 0.28;
        GAME.obs.push({
          x: G_W + 10,
          w: fly ? 26 : 13 + Math.random() * 12,
          h: fly ? 16 : 16 + Math.random() * 14,
          fly, hopper, jy: 0, jvy: 0
        });
        GAME.spawnIn = Math.max(34, 58 + Math.random() * 52 - GAME.speed * 5);
      }
      GAME.obs.forEach((o) => {
        o.x -= gSpeed();
        if (o.hopper) {
          // little bug does little jumps — rude, honestly
          if (o.jy <= 0 && o.jvy <= 0 && Math.random() < 0.03) o.jvy = 5.4;
          if (o.jy > 0 || o.jvy > 0) { o.jy += o.jvy; o.jvy -= 0.5; if (o.jy < 0) { o.jy = 0; o.jvy = 0; } }
        }
      });
      GAME.obs = GAME.obs.filter((o) => o.x > -40);

      // collision (slightly forgiving hitboxes)
      const sz = modVal('size');
      const sx = G_SLIME_X + 5, sw = (G_SLIME_S - 10) * sz;
      const sy = G_GROUND - G_SLIME_S * sz - GAME.y + 6, sh = G_SLIME_S * sz - 8;
      if (GAME.frame >= GAME.invUntil) {
        for (const o of GAME.obs) {
          const oy = o.fly ? G_GROUND - 58 : G_GROUND - o.h - (o.jy || 0);
          const oh = o.fly ? 16 : o.h;
          if (sx < o.x + o.w - 3 && sx + sw > o.x + 3 && sy < oy + oh - 3 && sy + sh > oy + 2) {
            if (gHit(o)) break;
          }
        }
      }

      GAME.score += 0.16 * gSpeed() * (GAME.fever > 0 ? 2 : 1) * modVal('luck');
      GAME.speed = Math.min(9.5, GAME.speed + 0.0016);
    }

    // ---- BOSS WAVE: a 404 kaiju + a heart-wand power-up ----
    if (gLive()) {
      if (!GAME.boss && GAME.score >= GAME.nextBossAt) {
        const kinds = [
          { kind: 'kaiju', hp: 5, name: ['!! 404 KAIJU !!  grab the wand ♥', '!! KAIJU 404 !!  prends la baguette ♥'] },
          { kind: 'conflict', hp: 7, name: ['!! MERGE CONFLICT !!  resolve it ♥', '!! CONFLIT DE MERGE !!  résous-le ♥'] },
          { kind: 'cookie', hp: 4, name: ['!! COOKIE BANNER !!  reject all ♥', '!! BANDEAU COOKIES !!  tout refuser ♥'] }
        ];
        const pick = kinds[Math.floor(Math.random() * kinds.length)];
        GAME.boss = { x: G_W + 40, y: 30, hp: pick.hp, t: 0, flash: 0, leaving: false, kind: pick.kind, name: pick.name };
        GAME.pickup = { x: G_W + 120 };
        playTone(196, 'sawtooth', 0.3, 0, 0.05);
        maybeWakeSleeper();
      }

      if (GAME.pickup) {
        GAME.pickup.x -= gSpeed();
        const px = GAME.pickup.x, pw = 14;
        const sx = G_SLIME_X, sw = G_SLIME_S;
        const slimeTop = G_GROUND - G_SLIME_S - GAME.y;
        if (px < sx + sw && px + pw > sx && slimeTop + G_SLIME_S > G_GROUND - 24) {
          gGiveWeapon('heart_wand', true);
          GAME.pickup = null;
          playSparkleSound();
        } else if (px < -20) {
          GAME.pickup = null;
        }
      }

      if (GAME.boss) {
        const bs = GAME.boss;
        bs.t++;
        if (!bs.leaving && bs.x > G_W - 88) bs.x -= 1.3;
        if (bs.kind === 'conflict') bs.y = 26 + Math.sin(bs.t * 0.11) * 16;      // git rebase energy
        else if (bs.kind === 'cookie') bs.y = 32 + Math.sin(bs.t * 0.05) * 4;     // smug and stable
        else bs.y = 30 + Math.sin(bs.t * 0.07) * 7;
        if (bs.flash > 0) bs.flash--;
        if (!bs.leaving && bs.t > 60 * 13) bs.leaving = true; // got bored, flies away
        if (bs.leaving) {
          bs.x += 2.6;
          if (bs.x > G_W + 60) { GAME.boss = null; GAME.nextBossAt = GAME.score + 550 + Math.random() * 250; }
        }
      }

      // equipped weapon auto-fires: at bosses, and at street-level bugs too
      if (GAME.weapon && GAME.frame % (GAME.weapon.rate || 14) === 0) {
        const bossTarget = GAME.boss && !GAME.boss.leaving;
        const bugTarget = GAME.obs.some((o) => o.x > G_SLIME_X && o.x < G_SLIME_X + 240);
        if (bossTarget || bugTarget) {
          GAME.shots.push({ x: G_SLIME_X + G_SLIME_S - 4, y: G_GROUND - G_SLIME_S - GAME.y + 8 });
          playTone(modActive('uwu') ? 1760 : 1046, 'triangle', 0.06, 0, 0.04);
        }
      }

      GAME.shots.forEach((sh) => {
        sh.x += 6.5;
        if (GAME.boss) sh.y += ((GAME.boss.y + 15) - sh.y) * 0.09;
      });

      // shots also squash regular bugs (+5 each)
      GAME.shots = GAME.shots.filter((sh) => {
        for (let oi = 0; oi < GAME.obs.length; oi++) {
          const o = GAME.obs[oi];
          const oy = o.fly ? G_GROUND - 58 : G_GROUND - o.h - (o.jy || 0);
          const oh = o.fly ? 16 : o.h;
          if (sh.x > o.x && sh.x < o.x + o.w && sh.y > oy - 4 && sh.y < oy + oh + 4) {
            GAME.obs.splice(oi, 1);
            GAME.score += 5;
            for (let i = 0; i < 4; i++) GAME.sparks.push({ x: sh.x, y: sh.y, vx: (Math.random() - 0.3) * 3, vy: (Math.random() - 0.6) * 3, life: 16 });
            return false;
          }
        }
        return true;
      });
      GAME.shots = GAME.shots.filter((sh) => {
        if (!GAME.boss || GAME.boss.leaving) return sh.x < G_W + 10;
        const bs = GAME.boss;
        const bw = bs.kind === 'cookie' ? 66 : 39;
        if (sh.x > bs.x && sh.x < bs.x + bw && sh.y > bs.y && sh.y < bs.y + 30) {
          bs.hp--;
          bs.flash = 5;
          for (let i = 0; i < 4; i++) {
            GAME.sparks.push({ x: sh.x, y: sh.y, vx: (Math.random() - 0.2) * 3, vy: (Math.random() - 0.5) * 3, life: 18 });
          }
          if (bs.hp <= 0) {
            for (let i = 0; i < 18; i++) {
              GAME.sparks.push({ x: bs.x + 20, y: bs.y + 15, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.7) * 5, life: 30 });
            }
            GAME.score += 200;
            GAME.boss = null;
            GAME.nextBossAt = GAME.score + 650 + Math.random() * 300;
            playFanfare();
            gMarkJoy();
            gSpectate('bosskill');
            maybeWakeSleeper();
          }
          return false;
        }
        return sh.x < G_W + 10;
      });
    }

    // sparks (hit + explosion confetti)
    GAME.sparks.forEach((sp) => { sp.x += sp.vx; sp.y += sp.vy; sp.vy += 0.15; sp.life--; });
    GAME.sparks = GAME.sparks.filter((sp) => sp.life > 0);
    GAME.sparks.forEach((sp) => {
      g2.fillStyle = sp.life % 6 < 3 ? gTheme.pink : '#ffe98a';
      g2.fillRect(Math.round(sp.x), Math.round(sp.y), 3, 3);
    });

    GAME.obs.forEach((o) => gDrawObstacle(g2, o));

    if (GAME.pickup) gDrawMat(g2, G_MATS.wand, GAME.pickup.x, G_GROUND + G_SLIME_S - 4 - 18, 2);
    GAME.shots.forEach((sh) => gDrawMat(g2, G_MATS.heart, sh.x, sh.y, 2));
    if (GAME.boss) {
      const bs = GAME.boss;
      if (bs.flash % 2 === 0) {
        if (bs.kind === 'cookie') {
          // the most feared monster on the modern web
          g2.fillStyle = '#f2e2c4';
          g2.fillRect(bs.x, bs.y, 66, 30);
          g2.fillStyle = '#3a2412'; // cookie-brown ink, readable in every theme
          g2.strokeStyle = '#3a2412';
          g2.lineWidth = 2;
          g2.strokeRect(bs.x + 1, bs.y + 1, 64, 28);
          g2.font = "9px 'Jersey 25', 'VT323', monospace";
          g2.fillText('🍪 COOKIES?', bs.x + 5, bs.y + 12);
          g2.fillStyle = gTheme.pink;
          g2.fillRect(bs.x + 5, bs.y + 17, 20, 9);
          g2.fillStyle = '#ffffff';
          g2.fillText('OK', bs.x + 10, bs.y + 24);
        } else if (bs.kind === 'conflict') {
          // two kaiju halves that refuse to merge
          const off = Math.sin(bs.t * 0.2) * 3;
          gDrawMat(g2, G_MATS.boss, bs.x - 4, bs.y + off, 2);
          gDrawMat(g2, G_MATS.boss, bs.x + 18, bs.y - off, 2);
          g2.fillStyle = gTheme.pink;
          g2.font = "10px 'Jersey 25', 'VT323', monospace";
          g2.fillText('<<<<<<< HEAD', bs.x - 6, bs.y - 4);
        } else {
          gDrawMat(g2, G_MATS.boss, bs.x, bs.y, 3);
          g2.fillStyle = '#2a0a20'; // deep plum: readable on the pink belly in any theme
          g2.font = "10px 'Jersey 25', 'VT323', monospace";
          g2.fillText('404', bs.x + 13, bs.y + 24);
        }
        if (bs.t < 80 && !bs.leaving) {
          g2.fillStyle = gTheme.pink;
          g2.font = "12px 'Jersey 25', 'VT323', monospace";
          g2.fillText(trT(bs.name[0], bs.name[1]), bs.x - 132, bs.y - 8);
        }
      }
    }

    gDrawSlime(g2);
    if (GAME.weapon) {
      gDrawMat(g2, G_MATS.wand, G_SLIME_X + G_SLIME_S - 2, G_GROUND - G_SLIME_S - GAME.y - 8, 1.6);
    }
    // rogue layer: loot, HUD, encounter overlay
    gLootTick(g2);
    gDrawRogueHud(g2);
    if (GAME.event) gDrawEvent(g2);

    // overlay text
    g2.textAlign = 'center';
    g2.font = "16px 'Jersey 25', 'VT323', monospace";
    if (GAME.state === 'idle') {
      g2.fillStyle = gTheme.ink;
      g2.fillText(t('game.start'), G_W / 2, 58);
      g2.fillStyle = gTheme.pink;
      g2.fillText('♡', G_W / 2, 78);
    } else if (GAME.state === 'over') {
      g2.fillStyle = gTheme.pink;
      g2.fillText(t('game.over'), G_W / 2, 62);
    }
    g2.textAlign = 'left';

    if (GAME.frame % 6 === 0) {
      if (gScoreEl) gScoreEl.textContent = String(Math.floor(GAME.score));
      if (gHiEl) gHiEl.textContent = String(GAME.hi);
    }
  }

  /* =====================================================
     v4.0 — ROGUE LAYER
     coins · extra lives · weapons · cursed loot · gods ·
     tarot wizard · boba-cat shop · 130+ bilingual outcomes.
     Every resolution is seeded by the player's whole story:
     past decisions + coins + lives + weapon + score + run seed.
     ===================================================== */
  function L(pair) { return trT(pair[0], pair[1]); }
  function gPlaySecs() { return (GAME.frame - GAME.runStart) / 60; }
  // dopamine tracker: strong positive moments stamp the joy clock —
  // the HR fairy only knocks while the player is still glowing
  function gMarkJoy() { GAME.joyAt = gPlaySecs(); }
  var gInterviewOffered = false; // once per visit — scarcity keeps it special
  var gDeviceGagDone = false;    // one device-aware gag per visit
  function gLive() { return GAME.state === 'run' && !GAME.event; }
  function modVal(k) { const m = GAME.mods[k]; return (m && GAME.frame < m.until) ? m.v : 1; }
  function modActive(k) { const m = GAME.mods[k]; return !!(m && GAME.frame < m.until); }
  function setMod(k, v, secs) { GAME.mods[k] = { v, until: GAME.frame + Math.round(secs * 60) }; }
  function gSpeed() { return GAME.speed * modVal('speed'); }

  function gStateHash(salt) {
    return Math.abs(hashStr(
      salt + '|' + GAME.decisions.join(',') + '|' + GAME.coins + '|' + GAME.lives +
      '|' + (GAME.weapon ? GAME.weapon.id : '-') + '|' + Math.floor(GAME.score / 40) + '|' + GAME.runSeed
    ));
  }
  function gPick(arr, salt) { return arr[gStateHash(salt) % arr.length]; }

  function gToast(pair, ttl) {
    GAME.toast = { text: typeof pair === 'string' ? pair : L(pair), ttl: ttl || 170 };
  }

  // ---------- effect primitives ----------
  function fxCoins(n) { GAME.coins = Math.max(0, GAME.coins + n); }
  function fxLife(n) {
    const before = GAME.lives;
    GAME.lives = Math.max(0, Math.min(3, GAME.lives + n));
    if (GAME.lives > before) gMarkJoy();
    if (GAME.lives === 0) gGameOver();
  }
  function fxScore(n) { GAME.score = Math.max(0, GAME.score + n); }
  function fxInvincible(secs) { GAME.invUntil = GAME.frame + secs * 60; if (secs >= 6) gMarkJoy(); }
  function fxFever(secs) { GAME.fever = secs * 60; gMarkJoy(); }
  function fxClearBugs() {
    GAME.obs.forEach((o) => { for (let i = 0; i < 3; i++) GAME.sparks.push({ x: o.x + 5, y: G_GROUND - 12, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 4, life: 20 }); });
    GAME.obs = [];
  }
  function fxCoinRain(n) {
    for (let i = 0; i < n; i++) GAME.loot.push({ kind: 'coin', x: G_W + 20 + i * 18, y: 40 + Math.random() * 60, t: 0 });
    if (n >= 12) gMarkJoy();
  }

  // ---------- outcome pools (bless / prank / curse) ----------
  const P_BLESS = [
    { t: ["+18 coins rain from a passing cloud ☁️", "+18 pièces tombent d'un nuage qui passait ☁️"], fx: () => fxCoinRain(18) },
    { t: ["an extra life!! tucked inside a warm croissant ♥", "une vie en plus !! cachée dans un croissant tiède ♥"], fx: () => fxLife(1) },
    { t: ["RAINBOW FEVER descends. double points, free of charge", "la FIÈVRE ARC-EN-CIEL descend. points doublés, gratuit"], fx: () => fxFever(7) },
    { t: ["holy i-frames: nothing can touch you for 8s ✨", "i-frames sacrées : intouchable pendant 8 s ✨"], fx: () => fxInvincible(8) },
    { t: ["+150 score, notarized by heaven's CI pipeline", "+150 points, certifiés par la CI céleste"], fx: () => fxScore(150) },
    { t: ["all bugs on screen are politely uninstalled", "tous les bugs à l'écran sont poliment désinstallés"], fx: () => fxClearBugs() },
    { t: ["your jumps gain +30% fluff for 20s", "tes sauts gagnent +30 % de moelleux pendant 20 s"], fx: () => setMod('jump', 1.3, 20) },
    { t: ["the world slows 15% — main-character time", "le monde ralentit de 15 % — temps de protagoniste"], fx: () => setMod('speed', 0.85, 15) },
    { t: ["luck.exe installed: score flows 25% faster (25s)", "luck.exe installé : le score coule 25 % plus vite (25 s)"], fx: () => setMod('luck', 1.25, 25) },
    { t: ["a tiny halo appears. purely cosmetic. devastatingly cute", "une petite auréole apparaît. purement cosmétique. terriblement mignon"], fx: () => setMod('halo', 1, 30) },
    { t: ["+10 coins and a forehead kiss", "+10 pièces et un bisou sur le front"], fx: () => fxCoins(10) },
    { t: ["smol mode: 20% smaller hitbox for 15s", "mode mini : hitbox réduite de 20 % pendant 15 s"], fx: () => setMod('size', 0.8, 15) },
    { t: ["a free heart wand materializes. pew pew ♥", "une baguette-cœur gratuite se matérialise. piou piou ♥"], fx: () => gGiveWeapon('heart_wand', true) },
    { t: ["+60 score & your fans back home cheer (+2)", "+60 points & tes fans applaudissent à la maison (+2)"], fx: () => { fxScore(60); gainFollowers(2); } }
  ];
  const P_PRANK = [
    { t: ["…nothing happens. the silence is adorable", "…il ne se passe rien. le silence est adorable"], fx: () => {} },
    { t: ["you are now legally 'bug-adjacent'. +5 coins for the paperwork", "te voilà légalement « cousin·e des bugs ». +5 pièces pour la paperasse"], fx: () => fxCoins(5) },
    { t: ["BIG mode: 25% larger and 100% rounder for 12s", "mode MAXI : 25 % plus grand et 100 % plus rond pendant 12 s"], fx: () => setMod('size', 1.25, 12) },
    { t: ["the ground speeds up 15%. cardio arc begins (12s)", "le sol accélère de 15 %. l'arc cardio commence (12 s)"], fx: () => setMod('speed', 1.15, 12) },
    { t: ["your coins are taxed 30%. receipt: 'trust me'", "tes pièces sont taxées à 30 %. reçu : « fais-moi confiance »"], fx: () => fxCoins(-Math.ceil(GAME.coins * 0.3)) },
    { t: ["uwu mode: every action now squeaks (20s)", "mode uwu : chaque action couine désormais (20 s)"], fx: () => setMod('uwu', 1, 20) },
    { t: ["3 bugs spawn wearing party hats. they brought cake", "3 bugs apparaissent avec des chapeaux de fête. ils ont un gâteau"], fx: () => { GAME.spawnIn = 1; } },
    { t: ["score +40, but everyone saw you trip earlier", "+40 points, mais tout le monde t'a vu trébucher tout à l'heure"], fx: () => fxScore(40) },
    { t: ["your weapon takes a union break (if you had one)", "ton arme prend une pause syndicale (si tu en avais une)"], fx: () => { GAME.weapon = null; } },
    { t: ["floaty jumps for 12s. gravity filed a complaint", "sauts flottants pendant 12 s. la gravité a porté plainte"], fx: () => setMod('jump', 1.45, 12) },
    { t: ["-8 coins, +1 profound life lesson", "-8 pièces, +1 leçon de vie profonde"], fx: () => fxCoins(-8) },
    { t: ["a rubber duck now follows your cursor spiritually", "un canard en plastique suit désormais ton curseur spirituellement"], fx: () => setMod('halo', 1, 20) },
    { t: ["everything smells faintly of boba for 30s. no effect. lovely", "tout sent légèrement le bubble tea pendant 30 s. aucun effet. charmant"], fx: () => {} },
    { t: ["+1 coin. the universe is testing your gratitude", "+1 pièce. l'univers teste ta gratitude"], fx: () => fxCoins(1) }
  ];
  const P_CURSE = [
    { t: ["ow!! -1 ♥ (a comment said your kerning was off)", "aïe !! -1 ♥ (un commentaire a critiqué ton crénage)"], fx: () => gSoftHit() },
    { t: ["coin leak: -1 coin/sec for 12s. tiny hole in your pocket", "fuite de pièces : -1/s pendant 12 s. petit trou dans la poche"], fx: () => setMod('drain', 1, 12) },
    { t: ["speed +25% for 10s. the bugs heard you talking", "vitesse +25 % pendant 10 s. les bugs t'ont entendu parler"], fx: () => setMod('speed', 1.25, 10) },
    { t: ["-60 score. it went to a good home", "-60 points. ils sont partis dans une bonne famille"], fx: () => fxScore(-60) },
    { t: ["heavy jumps for 10s: -25% (your legs are sleepy)", "sauts lourds pendant 10 s : -25 % (tes jambes ont sommeil)"], fx: () => setMod('jump', 0.75, 10) },
    { t: ["half your coins roll away singing", "la moitié de tes pièces s'enfuient en chantant"], fx: () => fxCoins(-Math.ceil(GAME.coins / 2)) },
    { t: ["CHONK curse: +35% size for 10s. still adorable, sadly", "malédiction CHONK : +35 % pendant 10 s. toujours adorable, hélas"], fx: () => setMod('size', 1.35, 10) },
    { t: ["your weapon files for divorce and leaves", "ton arme demande le divorce et s'en va"], fx: () => { GAME.weapon = null; } },
    { t: ["score drips out: luck 0.7× for 15s", "le score s'égoutte : chance ×0,7 pendant 15 s"], fx: () => setMod('luck', 0.7, 15) },
    { t: ["a swarm RSVP'd yes. brace!!", "un essaim a répondu « présent ». accroche-toi !!"], fx: () => { GAME.spawnIn = 1; setMod('speed', 1.15, 8); } }
  ];

  function gSoftHit() {
    GAME.lives -= 1;
    if (GAME.lives <= 0) { GAME.lives = 0; gGameOver(); return; }
    fxInvincible(1.8);
    playGlitchSound();
  }

  function gApplyOutcome(pool, salt) {
    const o = gPick(pool, salt);
    o.fx();
    return o.t;
  }

  // ---------- gods of code (believe / refuse, story-seeded) ----------
  const GODS = [
    { icon: '🦆', name: ["the Duck of Debugging", "le Canard du Débogage"], pitch: ['tell me your bugs and they vanish. the bugs. usually the bugs.', 'confie-moi tes bugs et ils disparaissent. les bugs. en général.'], bf: ["the Duck nods slowly.", "le Canard hoche lentement la tête."], rf: ["the Duck squeaks in betrayal.", "le Canard couine, trahi."] },
    { icon: '🌿', name: ["the Merge Father", "le Père du Merge"], pitch: ['I resolve all conflicts. yours may be included in the release.', 'je résous tous les conflits. le tien est peut-être inclus dans la release.'], bf: ["your timeline is lovingly rebased.", "ta timeline est rebasée avec amour."], rf: ["he force-pushes a sigh.", "il force-push un soupir."] },
    { icon: '✨', name: ["the Linter Goddess", "la Déesse du Linter"], pitch: ['I fix everything that looks wrong. who defines wrong? I do ✨', 'je corrige tout ce qui semble faux. qui définit « faux » ? moi ✨'], bf: ["she formats your destiny on save.", "elle formate ton destin à la sauvegarde."], rf: ["she adds a warning to your soul.", "elle ajoute un warning à ton âme."] },
    { icon: '🕳️', name: ["404-sama, lord of lost things", "404-sama, seigneur des choses perdues"], pitch: ['god of all that is lost. devotees occasionally qualify.', 'dieu de tout ce qui se perd. les fidèles sont parfois éligibles.'], bf: ["you are found. how ironic.", "te voilà trouvé·e. quelle ironie."], rf: ["your refusal was... not found.", "ton refus est... introuvable."] },
    { icon: '🐙', name: ["CSS Cthulhu", "CSS Cthulhu"], pitch: ['I center all things. side effects: your margins may collapse.', 'je centre toutes choses. effet secondaire : tes marges peuvent fusionner.'], bf: ["your margins collapse in your favor.", "tes marges fusionnent en ta faveur."], rf: ["!important. he says only that.", "!important. il ne dit que ça."] },
    { icon: '🦁', name: ["the Regex Sphinx", "le Sphinx des Regex"], pitch: ['grant me one match, receive anything.* (*matching is greedy)', 'accorde-moi un match, reçois tout.* (*le matching est gourmand)'], bf: ["you match. greedily.", "tu matches. goulûment."], rf: ["^(?!you).*$ — harsh.", "^(?!toi).*$ — dur."] },
    { icon: '🗑️', name: ["the Great Garbage Collector", "le Grand Ramasse-Miettes"], pitch: ['I only take what nobody references anymore. still referenced, you?', 'je ne prends que ce que plus personne ne référence. toi, on te référence encore ?'], bf: ["your worries are freed from memory.", "tes soucis sont libérés de la mémoire."], rf: ["he marks you… and sweeps.", "il te marque… puis balaie."] },
    { icon: '🧋', name: ["the Boba Spirit", "l'Esprit du Bubble Tea"], pitch: ['fortune settles at the bottom. you must drink the whole cup first.', 'la fortune se dépose au fond. il faut d\'abord boire toute la tasse.'], bf: ["pearls of fortune settle at your bottom.", "des perles de fortune se déposent au fond de toi."], rf: ["your straw shall bend. today.", "ta paille pliera. aujourd'hui même."] }
  ];

  // ---------- tarot deck (traditional meaning → cute mechanics) ----------
  const TAROT = [
    { n: ["The Fool", "Le Mat"], up: { t: ["a fresh start! speed resets, +1 ♥ of optimism", "un nouveau départ ! vitesse réinitialisée, +1 ♥ d'optimisme"], fx: () => { GAME.speed = 3.4; fxLife(1); } }, dn: { t: ["you leap before looking: floaty jumps, -5 coins", "tu sautes sans regarder : sauts flottants, -5 pièces"], fx: () => { setMod('jump', 1.4, 12); fxCoins(-5); } } },
    { n: ["The Magician", "Le Bateleur"], up: { t: ["as above, so below: a wand appears ♥", "ce qui est en haut est en bas : une baguette apparaît ♥"], fx: () => gGiveWeapon('heart_wand', true) }, dn: { t: ["sleight of hand… your weapon vanishes", "tour de passe-passe… ton arme disparaît"], fx: () => { GAME.weapon = null; } } },
    { n: ["The Lovers", "L'Amoureux"], up: { t: ["union! +2 fans at home, +40 score", "union ! +2 fans à la maison, +40 points"], fx: () => { gainFollowers(2); fxScore(40); } }, dn: { t: ["it's complicated: coins split 50/50 in the divorce", "c'est compliqué : les pièces partent moitié-moitié au divorce"], fx: () => fxCoins(-Math.ceil(GAME.coins / 2)) } },
    { n: ["The Tower", "La Maison Dieu"], up: { t: ["glorious collapse: bugs wiped, +fever from the rubble", "effondrement glorieux : bugs balayés, +fièvre dans les gravats"], fx: () => { fxClearBugs(); fxFever(6); } }, dn: { t: ["the tower lands on your wallet: -12 coins", "la tour atterrit sur ton portefeuille : -12 pièces"], fx: () => fxCoins(-12) } },
    { n: ["Wheel of Fortune", "La Roue de Fortune"], up: { t: ["the wheel spins UP: +100 score, +8 coins", "la roue tourne VERS LE HAUT : +100 points, +8 pièces"], fx: () => { fxScore(100); fxCoins(8); } }, dn: { t: ["the wheel spins… into cardio: speed +20% (10s)", "la roue tourne… vers le cardio : vitesse +20 % (10 s)"], fx: () => setMod('speed', 1.2, 10) } },
    { n: ["The Star", "L'Étoile"], up: { t: ["hope glitters: invincible 8s ✨", "l'espoir scintille : invincible 8 s ✨"], fx: () => fxInvincible(8) }, dn: { t: ["you wished on a satellite: +3 coins, mild embarrassment", "tu as fait un vœu sur un satellite : +3 pièces, gêne légère"], fx: () => fxCoins(3) } },
    { n: ["The Moon", "La Lune"], up: { t: ["dreamy double-vision: luck ×1.4 for 18s", "double vision rêveuse : chance ×1,4 pendant 18 s"], fx: () => setMod('luck', 1.4, 18) }, dn: { t: ["night confusion: uwu mode, 15s", "confusion nocturne : mode uwu, 15 s"], fx: () => setMod('uwu', 1, 15) } },
    { n: ["The Sun", "Le Soleil"], up: { t: ["everything golden: +60 score, +6 coins, tiny halo", "tout est doré : +60 points, +6 pièces, petite auréole"], fx: () => { fxScore(60); fxCoins(6); setMod('halo', 1, 25) } }, dn: { t: ["sunburn: CHONK +30% for 8s", "coup de soleil : CHONK +30 % pendant 8 s"], fx: () => setMod('size', 1.3, 8) } },
    { n: ["Death", "L'Arcane sans nom"], up: { t: ["transformation: score composts into coins (+15)", "transformation : le score se composte en pièces (+15)"], fx: () => { fxScore(-80); fxCoins(15); } }, dn: { t: ["change resists you: -1 ♥, +1 dramatic gasp", "le changement te résiste : -1 ♥, +1 halètement dramatique"], fx: () => gSoftHit() } },
    { n: ["The Hermit", "L'Ermite"], up: { t: ["wise slowness: world -20% for 12s", "lenteur sage : le monde -20 % pendant 12 s"], fx: () => setMod('speed', 0.8, 12) }, dn: { t: ["too much alone time: your weapon ghosts you", "trop de solitude : ton arme te ghoste"], fx: () => { GAME.weapon = null; } } },
    { n: ["Strength", "La Force"], up: { t: ["gentle power: shots pierce hearts +bugs melt (+wand)", "puissance douce : une baguette, et les bugs fondent"], fx: () => gGiveWeapon('bubble_blaster', true) }, dn: { t: ["you flexed too hard: jumps -20% (10s)", "tu as trop forcé : sauts -20 % (10 s)"], fx: () => setMod('jump', 0.8, 10) } },
    { n: ["The Hanged Man", "Le Pendu"], up: { t: ["new perspective: +80 score for doing nothing", "nouvelle perspective : +80 points pour n'avoir rien fait"], fx: () => fxScore(80) }, dn: { t: ["upside-down wallet: coins drip out (10s)", "portefeuille à l'envers : les pièces gouttent (10 s)"], fx: () => setMod('drain', 1, 10) } },
    { n: ["Temperance", "Tempérance"], up: { t: ["perfect balance: coins and score equalize kindly (+30 both)", "équilibre parfait : +30 points et +5 pièces, en douceur"], fx: () => { fxScore(30); fxCoins(5); } }, dn: { t: ["you mixed boba with coffee: speed jitters ±15%", "tu as mélangé boba et café : vitesse qui tremble ±15 %"], fx: () => setMod('speed', 1.15, 8) } },
    { n: ["The Devil", "Le Diable"], up: { t: ["a deal: +200 score… for -1 ♥. he smiles.", "un pacte : +200 points… contre -1 ♥. il sourit."], fx: () => { fxScore(200); gSoftHit(); } }, dn: { t: ["you decline his contract: +20 dignity (score)", "tu refuses son contrat : +20 de dignité (points)"], fx: () => fxScore(20) } },
    { n: ["The World", "Le Monde"], up: { t: ["completion!! +120 score, +10 coins, fever ✨", "accomplissement !! +120 points, +10 pièces, fièvre ✨"], fx: () => { fxScore(120); fxCoins(10); fxFever(5); } }, dn: { t: ["the world is still loading… everything pauses politely (3s i-frames)", "le monde charge encore… tout s'arrête poliment (3 s d'i-frames)"], fx: () => fxInvincible(3) } }
  ];

  const WIZ_TAUNTS = [
    ["that one? interesting choice…", "celle-là ? choix intéressant…"],
    ["oohh… bold. very bold.", "oohh… audacieux. très audacieux."],
    ["the middle one is definitely (not) cursed", "celle du milieu est clairement (pas) maudite"],
    ["your hand is shaking, little jelly", "ta main tremble, petite gelée"],
    ["I knew you'd hover there. fascinating.", "je savais que tu hésiterais là. fascinant."],
    ["a card can smell fear, you know", "une carte sent la peur, tu sais"],
    ["take your time. the bugs will wait. probably.", "prends ton temps. les bugs attendront. sans doute."],
    ["mmm… fate is giggling right now", "mmm… le destin est en train de glousser"]
  ];
  const WIZ_CONFIRMS = [
    ["are you SURE about this card?", "tu es SÛR·E de cette carte ?"],
    ["really really sure? last chance…", "vraiment vraiment sûr·e ? dernière chance…"],
    ["I'd pick another one. but ok. confirm?", "moi, j'en prendrais une autre. mais bon. tu confirmes ?"]
  ];

  // ---------- weapons ----------
  const WEAPONS = {
    heart_wand: { id: 'heart_wand', clean: true, rate: 14, name: ["heart wand ♥", "baguette-cœur ♥"] },
    bubble_blaster: { id: 'bubble_blaster', clean: true, rate: 11, name: ["bubble blaster", "canon à bulles"] },
    baguette: { id: 'baguette', clean: true, rate: 16, name: ["baguette launcher", "lance-baguette"] },
    meow_cannon: { id: 'meow_cannon', clean: true, rate: 12, name: ["keyboard-cat cannon", "canon à chat-clavier"] }
  };
  const CURSED_WEAPONS = [
    { id: 'rgb_sword', rate: 8, name: ["✨ RGB Gamer Sword +9999 ✨", "✨ Épée Gamer RGB +9999 ✨"], reveal: ["it screams 'UWU' at every shot. your jumps shrink 15% from embarrassment", "elle hurle « UWU » à chaque tir. tes sauts rétrécissent de 15 % de honte"], fx: () => { setMod('uwu', 1, 45); setMod('jump', 0.85, 45); } },
    { id: 'gold_hammer', rate: 10, name: ["🔨 Golden Framework Hammer", "🔨 Marteau à Frameworks doré"], reveal: ["to a hammer, everything is a nail: bug spawns +40%", "pour un marteau, tout est un clou : bugs +40 %"], fx: () => { GAME.spawnIn = 1; setMod('speed', 1.12, 30) } },
    { id: 'boba_straw', rate: 9, name: ["🧋 Infinity Boba Straw", "🧋 Paille à Boba de l'Infini"], reveal: ["it's thirsty. it sips 1 coin/sec while equipped-ish (15s)", "elle a soif. elle sirote 1 pièce/s pendant 15 s"], fx: () => setMod('drain', 1, 15) },
    { id: 'legacy_blade', rate: 13, name: ["⚔️ Legacy Codebase Blade", "⚔️ Lame du Code Légataire"], reveal: ["nobody dares refactor it. it fires… comments. CHONK +25%", "personne n'ose la refactorer. elle tire… des commentaires. CHONK +25 %"], fx: () => setMod('size', 1.25, 25) },
    { id: 'ai_wand', rate: 7, name: ["🤖 Fully-Autonomous AI Wand", "🤖 Baguette IA 100 % autonome"], reveal: ["it hallucinates targets. sometimes it aims at your coins (-10)", "elle hallucine ses cibles. parfois elle vise tes pièces (-10)"], fx: () => fxCoins(-10) },
    { id: 'css_staff', rate: 12, name: ["🎨 Staff of !important", "🎨 Bâton de !important"], reveal: ["it overrides your walking animation. floaty jumps for 30s, like it or not", "il override ton animation de marche. sauts flottants 30 s, que tu le veuilles ou non"], fx: () => setMod('jump', 1.45, 30) },
    { id: 'vim_katana', rate: 10, name: ["🗡️ Vim Katana (unsheathed)", "🗡️ Katana Vim (dégainé)"], reveal: ["you cannot exit it. speed +20% until it feels like stopping (20s)", "impossible d'en sortir. vitesse +20 % jusqu'à ce qu'il en décide autrement (20 s)"], fx: () => setMod('speed', 1.2, 20) },
    { id: 'crypto_pickaxe', rate: 15, name: ["⛏️ Web3 Diamond Pickaxe", "⛏️ Pioche Diamant Web3"], reveal: ["it mines your OWN coins. -30% of your wallet. to the moon (without you)", "elle mine TES pièces. -30 % du portefeuille. to the moon (sans toi)"], fx: () => fxCoins(-Math.ceil(GAME.coins * 0.3)) }
  ];

  function gGiveWeapon(id, clean) {
    const w = WEAPONS[id] || WEAPONS.heart_wand;
    GAME.weapon = w;
    if (clean) {
      gToast([`equipped: ${w.name[0]}`, `équipé : ${w.name[1]}`], 130);
      gMarkJoy();
    }
  }

  // ---------- shop ----------
  const SHOP_ITEMS = [
    { icon: '🧪', price: 6, name: ["jump juice", "jus de saut"], out: { t: ["+35% jump for 25s. legs = springs", "+35 % de saut pendant 25 s. jambes = ressorts"], fx: () => setMod('jump', 1.35, 25) } },
    { icon: '💖', price: 14, name: ["spare heart (refurbished)", "cœur de rechange (reconditionné)"], out: { t: ["+1 ♥. lightly used, fully loving", "+1 ♥. peu servi, aime à fond"], fx: () => fxLife(1) } },
    { icon: '🛡️', price: 8, name: ["bubble shield", "bouclier à bulles"], out: { t: ["8s of invincibility. smells like soap", "8 s d'invincibilité. odeur de savon"], fx: () => fxInvincible(8) } },
    { icon: '🌈', price: 10, name: ["bottled fever", "fièvre en bouteille"], out: { t: ["rainbow fever, 8s. shake well", "fièvre arc-en-ciel, 8 s. bien agiter"], fx: () => fxFever(8) } },
    { icon: '🐱', price: 9, name: ["meow cannon", "canon à chat"], out: { t: ["equipped! it fires judgmental meows", "équipé ! il tire des miaulements réprobateurs"], fx: () => gGiveWeapon('meow_cannon', false) } },
    { icon: '🥖', price: 7, name: ["baguette launcher", "lance-baguette"], out: { t: ["equipped! très dangereuse", "équipé ! très dangereuse"], fx: () => gGiveWeapon('baguette', false) } },
    { icon: '⚡', price: 5, name: ["espresso shot", "shot d'expresso"], out: { t: ["speed +18% for 15s. you chose this", "vitesse +18 % pendant 15 s. tu l'as choisi"], fx: () => setMod('speed', 1.18, 15) } },
    { icon: '⭐', price: 4, name: ["lucky sticker", "autocollant porte-bonheur"], out: { t: ["luck ×1.2 for 30s. peel slowly", "chance ×1,2 pendant 30 s. décoller lentement"], fx: () => setMod('luck', 1.2, 30) } },
    // ---- the traps (gorgeous label, gremlin content) ----
    { icon: '👑', price: 12, name: ["CROWN OF INFINITE POWER", "COURONNE DU POUVOIR INFINI"], trap: true, out: { t: ["it's a paper crown. CHONK +30% (it's heavy paper). +10 score for style", "c'est une couronne en papier. CHONK +30 % (papier lourd). +10 points pour le style"], fx: () => { setMod('size', 1.3, 12); fxScore(10); } } },
    { icon: '🍷', price: 9, name: ["ELIXIR OF ULTIMATE SPEED", "ÉLIXIR DE VITESSE ULTIME"], trap: true, out: { t: ["it works!! on the BUGS. they got faster. oops", "il marche !! sur les BUGS. ils sont plus rapides. oups"], fx: () => setMod('speed', 1.22, 12) } },
    { icon: '💎', price: 11, name: ["100% REAL DIAMOND (trust)", "VRAI DIAMANT 100 % (promis)"], trap: true, out: { t: ["it's rock candy. delicious though: +6 coins refunded in sugar", "c'est du sucre candi. délicieux cela dit : +6 pièces remboursées en sucre"], fx: () => fxCoins(6) } },
    { icon: '📦', price: 3, name: ["mystery box (shop grade)", "boîte mystère (qualité boutique)"], trap: true, out: { t: ["inside: a smaller mystery box. inside THAT: 1 coin", "dedans : une boîte mystère plus petite. dedans : 1 pièce"], fx: () => fxCoins(1) } }
  ];

  // ---------- mystery box (field drop) ----------
  const MYSTERY = [
    { t: ["the box contains: 12 coins and a wink", "la boîte contient : 12 pièces et un clin d'œil"], fx: () => fxCoins(12) },
    { t: ["the box contains: a live bug. RUDE", "la boîte contient : un bug vivant. QUEL CULOT"], fx: () => { GAME.spawnIn = 1; } },
    { t: ["the box contains: bubble wrap. 5s of pure invincible joy", "la boîte contient : du papier bulle. 5 s de joie invincible"], fx: () => fxInvincible(5) },
    { t: ["the box contains: a coupon for +80 score, already validated", "la boîte contient : un bon de +80 points, déjà validé"], fx: () => fxScore(80) },
    { t: ["the box contains: an even smaller slime. it waves. +2 fans", "la boîte contient : un slime encore plus petit. il te salue. +2 fans"], fx: () => gainFollowers(2) },
    { t: ["the box contains: your motivation!! it escaped!! (fever 6s)", "la boîte contient : ta motivation !! elle s'était enfuie !! (fièvre 6 s)"], fx: () => fxFever(6) },
    { t: ["the box was a mimic. it apologizes and pays damages: +4 coins, -20 score", "la boîte était un mimic. elle s'excuse et paie des dommages : +4 pièces, -20 points"], fx: () => { fxCoins(4); fxScore(-20); } },
    { t: ["the box contains: silence. premium, artisanal silence", "la boîte contient : du silence. du silence artisanal premium"], fx: () => {} }
  ];

  // ---------- sleeper cross-over (dark mode) ----------
  const WAKE_FX = [
    { t: ["the sleepy slime blesses you: +15 coins from under its pillow", "le slime endormi te bénit : +15 pièces de sous son oreiller"], fx: () => fxCoinRain(15), good: true },
    { t: ["it yawns a protective bubble around you (6s invincible)", "il bâille une bulle protectrice autour de toi (6 s invincible)"], fx: () => fxInvincible(6), good: true },
    { t: ["half-asleep, it gifts you its dream wand ♥", "à moitié endormi, il t'offre sa baguette de rêve ♥"], fx: () => gGiveWeapon('heart_wand', true), good: true },
    { t: ["it sleep-casts RAINBOW FEVER and rolls back over", "il lance la FIÈVRE ARC-EN-CIEL en dormant et se rendort"], fx: () => fxFever(7), good: true },
    { t: ["grumpy hex: bugs +speed for 10s. you woke the baby", "sortilège grognon : bugs plus rapides 10 s. tu as réveillé le bébé"], fx: () => setMod('speed', 1.2, 10), good: false },
    { t: ["it confiscates 8 coins as a noise fine", "il confisque 8 pièces d'amende pour tapage", ], fx: () => fxCoins(-8), good: false },
    { t: ["sleepy static: uwu mode 15s. it thinks it's funny", "friture ensommeillée : mode uwu 15 s. il trouve ça drôle"], fx: () => setMod('uwu', 1, 15), good: false },
    { t: ["it dream-swaps your weapon for a pillow (weapon lost)", "il échange ton arme contre un oreiller, en rêve (arme perdue)"], fx: () => { GAME.weapon = null; }, good: false }
  ];

  function gApplySleeperEffect() {
    const o = gPick(WAKE_FX, 'wake' + GAME.frame);
    o.fx();
    gToast(o.t, 200);
    playTone(o.good ? 1046 : 220, o.good ? 'triangle' : 'sawtooth', 0.2, 0, 0.05);
    return o.good;
  }

  // the sleepwalker dove into the arcade — transmute into blessings
  function gSleepwalkerBlessing() {
    if (GAME.state === 'run') {
      fxFever(6);
      fxClearBugs();
      fxCoinRain(10);
      gToast(["💤 a sleepwalking slime dove in and became a power-up!!", "💤 un slime somnambule a plongé et s'est changé en power-up !!"], 240);
    } else {
      store.set('yos-pending-coins', store.get('yos-pending-coins', 0) + 5);
      gToast(["💤 a sleepwalker left 5 coins on the start line", "💤 un somnambule a laissé 5 pièces sur la ligne de départ"], 240);
    }
    playFanfare();
  }

  // ---------- hit handling ----------
  function gHit(o) {
    const idx = GAME.obs.indexOf(o);
    if (idx >= 0) GAME.obs.splice(idx, 1);
    GAME.lives -= 1;
    if (GAME.lives > 0) {
      fxInvincible(1.9);
      playTone(180, 'sawtooth', 0.15, 0, 0.06);
      gToast(["ouch!! -1 ♥ (the bug apologized, sort of)", "aïe !! -1 ♥ (le bug s'est excusé, en quelque sorte)"], 110);
      // the sidebar slime can't bear to watch a struggling run (light mode)
      if (GAME.lives === 1 && !GAME.mercyUsed && resolvedTheme() !== 'dark' && Math.random() < 0.6) {
        GAME.mercyUsed = true;
        gSpectate('mercy');
        setTimeout(() => {
          if (GAME.state === 'run' && !GAME.event) {
            gStartReward(["the slime paused the game: \"take something. PLEASE.\" 🥺", "le slime a mis pause : « prends quelque chose. PITIÉ. » 🥺"], null);
          }
        }, 900);
      }
      return false;
    }
    gGameOver();
    return true;
  }

  // ---------- loot: coins, 1UP, mystery boxes ----------
  function gLootTick(g2) {
    if (gLive()) {
      if (GAME.frame % 150 === 0 && Math.random() < 0.6) {
        const y = 52 + Math.random() * 52;
        for (let i = 0; i < 4 + Math.floor(Math.random() * 3); i++) {
          GAME.loot.push({ kind: 'coin', x: G_W + 16 + i * 16, y: y - Math.sin(i * 0.9) * 10, t: 0 });
        }
      }
      if (GAME.lives < 3 && Math.random() < 0.0007) GAME.loot.push({ kind: 'life', x: G_W + 16, y: 46 + Math.random() * 46, t: 0 });
      if (Math.random() < 0.0005) GAME.loot.push({ kind: 'box', x: G_W + 16, y: G_GROUND + G_SLIME_S - 22, t: 0 });

      GAME.loot.forEach((it) => { it.x -= gSpeed(); it.t++; });
      const sz = modVal('size');
      const sTop = G_GROUND - G_SLIME_S * sz - GAME.y;
      GAME.loot = GAME.loot.filter((it) => {
        const hit = it.x > G_SLIME_X - 12 && it.x < G_SLIME_X + G_SLIME_S * sz && it.y + 14 > sTop && it.y < sTop + G_SLIME_S * sz + 8;
        if (hit) {
          if (it.kind === 'coin') { GAME.coins++; GAME.score += 2; playTone(1318, 'square', 0.05, 0, 0.04); }
          else if (it.kind === 'life') { fxLife(1); playFanfare(); gToast(["+1 ♥ !! found in a warm croissant", "+1 ♥ !! trouvé dans un croissant tiède"], 130); }
          else {
            let m = gPick(MYSTERY, 'box' + GAME.frame);
            if (resolvedTheme() === 'dark' && !GAME.muffled && gStateHash('muff') % 4 === 0) m = MUFFLER_DROP;
            m.fx(); gToast(m.t, 180); playSparkleSound();
          }
          for (let i = 0; i < 4; i++) GAME.sparks.push({ x: it.x, y: it.y, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.8) * 3, life: 16 });
          return false;
        }
        return it.x > -20;
      });

      // curses that tick per-second
      if (modActive('drain') && GAME.frame % 60 === 0 && GAME.coins > 0) {
        GAME.coins--;
        playTone(196, 'sine', 0.08, 0, 0.03);
      }

      // a one-time device-aware gag early in the first run
      if (!gDeviceGagDone && GAME.score >= 60 && !GAME.toast) {
        gDeviceGagDone = true;
        const egg = deviceEgg('game');
        if (egg) { GAME.toast = { text: trT(egg[0], egg[1]), ttl: 150 }; playTone(1174, 'triangle', 0.1, 0, 0.04); }
      }

      // encounters follow a calm clock: first at ~24-32s, then every 38-60s
      if (!GAME.event && !GAME.boss && gPlaySecs() > GAME.nextEventSec) gStartEvent();
      // the HR fairy strikes while the iron is warm: 45s+ of play AND the
      // player just got something delicious (joy stamped < 9s ago)
      if (!GAME.event && !GAME.boss && !gInterviewOffered && gPlaySecs() > 45 &&
          gPlaySecs() - GAME.joyAt < 9 && Math.random() < 0.005) {
        gInterviewOffered = true;
        gStartInterview();
      }
    }

    GAME.loot.forEach((it) => {
      const bobY = it.y + Math.sin(it.t * 0.12) * 3;
      if (it.kind === 'coin') {
        g2.fillStyle = '#ffe98a';
        g2.fillRect(Math.round(it.x), Math.round(bobY), 8, 8);
        g2.fillStyle = gTheme.ink;
        g2.fillRect(Math.round(it.x) + 2, Math.round(bobY) + 2, 4, 4);
        g2.fillStyle = '#fff3c4';
        g2.fillRect(Math.round(it.x) + 1, Math.round(bobY) + 1, 2, 2);
      } else if (it.kind === 'life') {
        gDrawMat(g2, G_MATS.heart, it.x, bobY, 3);
      } else {
        g2.fillStyle = gTheme.purple;
        g2.fillRect(Math.round(it.x), Math.round(bobY), 12, 12);
        g2.fillStyle = '#ffffff';
        g2.font = "9px 'Jersey 25', 'VT323', monospace";
        g2.fillText('?', Math.round(it.x) + 4, Math.round(bobY) + 9);
      }
    });
  }

  // ---------- encounter engine ----------
  function gStartEvent() {
    const roll = gStateHash('evt') % 100;
    let type;
    if (GAME.coins >= 5 && roll < 25) type = 'shop';
    else if (roll < 50) type = 'god';
    else if (roll < 72) type = 'tarot';
    else type = 'offer';
    playTone(659, 'triangle', 0.18, 0, 0.05);
    playTone(880, 'triangle', 0.18, 0.12, 0.05);

    if (type === 'god') {
      const god = gPick(GODS, 'god');
      GAME.event = { type: 'god', god, sel: 0 };
    } else if (type === 'tarot') {
      GAME.event = { type: 'tarot', sel: 1, phase: 'pick', taunt: gPick(WIZ_TAUNTS, 'wt'), tauntT: 0, confirmsLeft: 1 + (gStateHash('cf') % 2), cards: null };
    } else if (type === 'shop') {
      const pool = [...SHOP_ITEMS];
      const items = [];
      for (let i = 0; i < 3; i++) items.push(pool.splice(gStateHash('shop' + i) % pool.length, 1)[0]);
      // dark-mode exclusive: the dream muffler, so the roommate sleeps through your run
      if (resolvedTheme() === 'dark' && !GAME.muffled) items[0] = MUFFLER_ITEM;
      GAME.event = { type: 'shop', items, sold: [false, false, false], sel: 0 };
    } else {
      const cursed = gStateHash('ofr') % 100 < 55;
      const w = cursed ? gPick(CURSED_WEAPONS, 'cw') : WEAPONS[gPick(['bubble_blaster', 'baguette', 'meow_cannon'], 'ow')];
      GAME.event = { type: 'offer', weapon: w, cursed, sel: 0 };
    }
  }

  function gEndEvent(outcomePair, decision) {
    if (decision) GAME.decisions.push(decision);
    if (outcomePair) gToast(outcomePair, 200);
    GAME.event = null;
    GAME.nextEventSec = gPlaySecs() + 38 + (gStateHash('nxt') % 22);
    GAME.hitRects = [];
  }

  function gEventKey(code) {
    const ev = GAME.event;
    if (!ev) return;
    const left = code === 'ArrowLeft';
    const right = code === 'ArrowRight';
    const confirm = code === 'Space' || code === 'Enter';
    const no = code === 'KeyN' || code === 'Escape';
    const yes = code === 'KeyY';
    if (code === 'Digit1') ev.sel = 0;
    if (code === 'Digit2') ev.sel = 1;
    if (code === 'Digit3') ev.sel = 2;

    if (ev.type === 'god' || ev.type === 'offer' || ev.type === 'interview') {
      if (left) ev.sel = 0;
      if (right) ev.sel = 1;
      if (yes) ev.sel = 0;
      if (no) ev.sel = 1;
      if (confirm || yes || no) {
        if (ev.type === 'interview') gResolveInterview(ev);
        else gResolveTwoChoice(ev);
      }
    } else if (ev.type === 'reward' || ev.type === 'coach') {
      if (left) ev.sel = (ev.sel + 2) % 3;
      if (right) ev.sel = (ev.sel + 1) % 3;
      if (confirm || yes) {
        const b = ev.opts[ev.sel];
        if (ev.type === 'coach') {
          // fresh run, then the gift — so the lesson actually sticks
          GAME.event = null;
          GAME.state = 'run';
          gReset();
          b.fx();
          gToast(ev.sel === ev.rec
            ? ["'good choice. I'm so proud.' — coach slime", "« bon choix. je suis si fier. » — coach slime"]
            : ["'…not my pick. but I respect the chaos.' — coach slime", "« …pas mon choix. mais je respecte le chaos. » — coach slime"], 210);
          GAME.decisions.push('coach:' + b.icon + (ev.sel === ev.rec ? ':obeyed' : ':rebelled'));
          if (typeof showBubble === 'function') showBubble(trT('you got this!! I believe!!', 'tu vas y arriver !! j\'y crois !!'), 2400);
          playFanfare();
          return;
        }
        b.fx();
        const chain = ev.chain;
        gEndEvent(b.t, 'reward:' + b.icon);
        if (chain === 'interview') setTimeout(() => { openWindow('win-interview'); }, 500);
      }
    } else if (ev.type === 'tarot') {
      if (ev.phase === 'pick') {
        if (left) { ev.sel = (ev.sel + 2) % 3; ev.taunt = gPick(WIZ_TAUNTS, 'wt' + GAME.frame); }
        if (right) { ev.sel = (ev.sel + 1) % 3; ev.taunt = gPick(WIZ_TAUNTS, 'wt' + GAME.frame); }
        if (confirm) { ev.phase = 'confirm'; ev.confirmQ = WIZ_CONFIRMS[0]; }
      } else if (ev.phase === 'confirm') {
        if (no) { ev.phase = 'pick'; ev.taunt = ["hah! doubt! delicious!", "hah ! le doute ! délicieux !"]; return; }
        if (confirm || yes) {
          ev.confirmsLeft--;
          if (ev.confirmsLeft > 0) { ev.confirmQ = WIZ_CONFIRMS[Math.min(2, 1 + (gStateHash('cq') % 2))]; return; }
          gResolveTarot(ev);
        }
      }
    } else if (ev.type === 'shop') {
      if (left) ev.sel = (ev.sel + 3) % 4;
      if (right) ev.sel = (ev.sel + 1) % 4;
      if (no) { gEndEvent(["the boba cat waves you goodbye ♡", "le chat-boba te fait coucou de la patte ♡"], 'shop:leave'); return; }
      if (confirm) {
        if (ev.sel === 3) { gEndEvent(["the boba cat waves you goodbye ♡", "le chat-boba te fait coucou de la patte ♡"], 'shop:leave'); return; }
        if (ev.sold[ev.sel]) return;
        const item = ev.items[ev.sel];
        if (GAME.coins < item.price) {
          gToast(["not enough coins!! the cat pretends not to judge", "pas assez de pièces !! le chat fait semblant de ne pas juger"], 90);
          playTone(180, 'sawtooth', 0.12, 0, 0.05);
          return;
        }
        GAME.coins -= item.price;
        ev.sold[ev.sel] = true;
        GAME.decisions.push('buy:' + item.icon);
        item.out.fx();
        gToast(item.out.t, 190);
        playTone(item.trap ? 233 : 1318, item.trap ? 'sawtooth' : 'triangle', 0.16, 0, 0.05);
      }
    }
  }

  function gResolveTwoChoice(ev) {
    if (ev.type === 'god') {
      const believe = ev.sel === 0;
      GAME.decisions.push('god:' + ev.god.icon + (believe ? ':yes' : ':no'));
      const tier = gStateHash('tier') % 100;
      let pool;
      if (believe) pool = tier < 45 ? P_BLESS : tier < 80 ? P_PRANK : P_CURSE;
      else pool = tier < 40 ? P_PRANK : tier < 70 ? P_BLESS : P_CURSE;
      const flavor = believe ? ev.god.bf : ev.god.rf;
      const t = gApplyOutcome(pool, 'god' + ev.god.icon);
      gEndEvent([flavor[0] + ' ' + t[0], flavor[1] + ' ' + t[1]]);
    } else {
      const take = ev.sel === 0;
      GAME.decisions.push('offer:' + (take ? 'take' : 'leave'));
      if (!take) {
        const consolation = gStateHash('cons') % 2 === 0;
        if (consolation) { fxCoins(5); gEndEvent(["the weapon sighs. +5 coins for emotional damage", "l'arme soupire. +5 pièces pour préjudice moral"]); }
        else gEndEvent(["you walk away. somewhere, a lore writer weeps", "tu passes ton chemin. quelque part, un scénariste pleure"]);
        return;
      }
      if (ev.cursed) {
        GAME.weapon = { id: ev.weapon.id, rate: ev.weapon.rate, name: ev.weapon.name };
        ev.weapon.fx();
        gEndEvent(ev.weapon.reveal);
      } else {
        gGiveWeapon(ev.weapon.id, false);
        gEndEvent([`equipped: ${ev.weapon.name[0]} — it purrs`, `équipé : ${ev.weapon.name[1]} — ça ronronne`]);
      }
    }
  }

  function gResolveInterview(ev) {
    if (ev.sel === 0) {
      GAME.decisions.push('interview:yes');
      gEndEvent(null, null);
      gStartReward(["the fairy beams: pick a parting gift — ZERO tricks, notarized ♡", "la fée rayonne : choisis un cadeau — ZÉRO piège, c'est notarié ♡"], 'interview');
    } else {
      GAME.decisions.push('interview:later');
      fxCoins(3);
      gEndEvent(["the fairy nods. +3 coins for honesty. the offer stands ♡", "la fée hoche la tête. +3 pièces pour ta franchise. l'offre tient toujours ♡"]);
    }
  }

  function gResolveTarot(ev) {
    const card = gPick(TAROT, 'card' + ev.sel);
    const upright = gStateHash('side' + ev.sel) % 100 < 55;
    GAME.decisions.push('tarot:' + card.n[0] + (upright ? ':up' : ':dn'));
    const o = upright ? card.up : card.dn;
    o.fx();
    gEndEvent([`${card.n[0]}${upright ? '' : ' (reversed)'} — ${o.t[0]}`, `${card.n[1]}${upright ? '' : ' (renversée)'} — ${o.t[1]}`]);
  }

  function gEventTap(x, y) {
    for (const r of GAME.hitRects) {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        if (GAME.event && r.sel !== undefined && GAME.event.sel !== r.sel) {
          GAME.event.sel = r.sel;
          if (GAME.event.type === 'tarot' && GAME.event.phase === 'pick') GAME.event.taunt = gPick(WIZ_TAUNTS, 'wt' + GAME.frame);
        } else {
          gEventKey(r.key || 'Enter');
        }
        return;
      }
    }
  }

  // ---------- pure-buff reward picker (no tricks, notarized) ----------
  const REWARD_BUFFS = [
    { icon: '💖', t: ["+1 ♥ (warm croissant included)", "+1 ♥ (croissant tiède inclus)"], fx: () => fxLife(1),
      lesson: ["extra heart = you may bonk ONE bug guilt-free. pick a cute one", "un cœur en plus = tu peux te cogner à UN bug sans culpabiliser. choisis-en un mignon"],
      why: ["the croissant smells amazing, ok?", "le croissant sent trop bon, ok ?"] },
    { icon: '🛡️', t: ["10s of invincibility, bubble-scented", "10 s d'invincibilité, parfum bulle de savon"], fx: () => fxInvincible(10),
      lesson: ["run THROUGH the bugs while whispering 'excuse me'", "traverse les bugs en chuchotant « pardon »"],
      why: ["bubbles. that is the entire reason.", "des bulles. c'est toute la raison."] },
    { icon: '🌈', t: ["rainbow fever 10s + a heart wand ♥", "fièvre arc-en-ciel 10 s + baguette-cœur ♥"], fx: () => { fxFever(10); gGiveWeapon('heart_wand', true); },
      lesson: ["double points AND pew pew. for main-character energy only", "points doublés ET piou piou. réservé aux protagonistes"],
      why: ["it's the PINKEST one. obviously.", "c'est le plus ROSE. évidemment."] },
    { icon: '💰', t: ["+25 coins, tax-free, gift-wrapped", "+25 pièces, hors taxes, emballage cadeau"], fx: () => fxCoinRain(25),
      lesson: ["money can't buy happiness but it CAN buy the muffler. and hearts", "l'argent ne fait pas le bonheur mais il achète le casque. et des cœurs"],
      why: ["shiny circles make my brain go brrr", "les ronds brillants font brrr dans ma tête"] },
    { icon: '🍀', t: ["luck ×1.5 for 40s — main character arc", "chance ×1,5 pendant 40 s — arc de protagoniste"], fx: () => setMod('luck', 1.5, 40),
      lesson: ["the universe will pretend your mistakes were intentional", "l'univers fera semblant que tes erreurs étaient voulues"],
      why: ["it matches my blush.", "il est assorti à mes joues."] }
  ];
  const COACH_RATIONAL = ["statistically optimal. boring, but correct.", "statistiquement optimal. ennuyeux, mais exact."];

  function gStartReward(titlePair, chain) {
    const pool = [...REWARD_BUFFS];
    const opts = [];
    for (let i = 0; i < 3; i++) opts.push(pool.splice(gStateHash('rw' + i) % pool.length, 1)[0]);
    GAME.event = { type: 'reward', title: titlePair, opts, sel: 0, chain: chain || null };
    playSparkleSound();
  }

  /* ---------- COACH MODE: two sub-200 deaths in a row = intervention ---------- */
  var gLowStreak = 0;
  var coachFlying = false;

  function gStartCoach() {
    const pool = [...REWARD_BUFFS];
    const opts = [];
    for (let i = 0; i < 3; i++) opts.push(pool.splice(gStateHash('co' + i) % pool.length, 1)[0]);
    const rec = gStateHash('rec') % 3;
    const rational = gStateHash('why') % 100 < 30;
    GAME.event = {
      type: 'coach', opts, sel: rec, rec,
      reason: rational ? COACH_RATIONAL : opts[rec].why
    };
    GAME.flash = 10;
    for (let i = 0; i < 26; i++) {
      GAME.sparks.push({ x: G_W * 0.5, y: G_H * 0.45, vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.7) * 7, life: 34 });
    }
    playFanfare();
    playSparkleSound();
  }

  function gTryCoach() {
    if (coachFlying || GAME.event || !gameWindowVisible()) return;
    coachFlying = true;
    if (typeof ghostHidden === 'function' && ghostHidden()) ghostAppear(0, false);
    showBubble(trT("that's IT. I'm coming in.", "bon. ÇA SUFFIT. j'arrive."), 1800);
    if (typeof moveSlime === 'function') moveSlime({ action: 'alert', mood: trT('coaching', 'coaching'), duration: 700, scheduleNext: false });

    setTimeout(() => {
      const habitatRect = slimeHabitat.getBoundingClientRect();
      const cv = document.getElementById('game-canvas');
      const cr = cv ? cv.getBoundingClientRect() : null;
      if (!cr) { coachFlying = false; return; }

      const flyer = document.createElement('div');
      flyer.className = 'slime-coach';
      flyer.setAttribute('aria-hidden', 'true');
      const img = document.createElement('img');
      img.src = slimeImg ? slimeImg.src : 'assets/slime_pet_cutout.png';
      img.alt = '';
      flyer.appendChild(img);
      document.body.appendChild(flyer);

      const from = { x: habitatRect.left + habitatRect.width / 2 - 32, y: habitatRect.top + habitatRect.height / 2 - 28 };
      const to = { x: cr.left + cr.width * 0.5 - 32, y: cr.top + cr.height * 0.45 - 28 };
      flyer.style.left = from.x + 'px';
      flyer.style.top = from.y + 'px';

      // hero leap: fast arc + sparkle contrail
      const t0 = Date.now();
      const flyMs = 1500;
      let lastTrail = 0;
      const arc = setInterval(() => {
        const p = Math.min(1, (Date.now() - t0) / flyMs);
        const ease = p * p * (3 - 2 * p);
        const x = from.x + (to.x - from.x) * ease;
        const y = from.y + (to.y - from.y) * ease - Math.sin(p * Math.PI) * 120;
        flyer.style.left = x + 'px';
        flyer.style.top = y + 'px';
        flyer.style.transform = `rotate(${p * 720}deg) scale(${1 + Math.sin(p * Math.PI) * 0.5})`;
        if (Date.now() - lastTrail > 70) {
          lastTrail = Date.now();
          const star = document.createElement('span');
          star.className = 'trail-sparkle';
          star.textContent = Math.random() < 0.5 ? '✦' : '♥';
          star.style.left = (x + 28) + 'px';
          star.style.top = (y + 28) + 'px';
          star.style.color = ['#ff8fc7', '#ffe98a', '#8fd4fa'][Math.floor(Math.random() * 3)];
          document.body.appendChild(star);
          star.addEventListener('animationend', () => star.remove());
        }
        if (p >= 1) {
          clearInterval(arc);
          flyer.remove();
          coachFlying = false;
          gStartCoach();
        }
      }, 30);
    }, 1100);
  }

  function gStartInterview() {
    GAME.event = { type: 'interview', sel: 0 };
    playTone(1046, 'triangle', 0.2, 0, 0.05);
    playTone(1318, 'triangle', 0.25, 0.15, 0.05);
  }

  // ---------- encounter + HUD drawing ----------
  function gPanel(g2, x, y, w, h) {
    g2.fillStyle = 'rgba(20, 10, 30, 0.88)';
    g2.fillRect(x, y, w, h);
    g2.strokeStyle = gTheme.pink;
    g2.lineWidth = 2;
    g2.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }

  function gOption(g2, x, y, w, h, label, selected, sel, key) {
    g2.fillStyle = selected ? gTheme.pink : 'rgba(255,255,255,0.12)';
    g2.fillRect(x, y, w, h);
    g2.strokeStyle = selected ? '#ffe98a' : gTheme.purple;
    g2.lineWidth = 2;
    g2.strokeRect(x + 1, y + 1, w - 2, h - 2);
    g2.fillStyle = selected ? '#2a0a20' : '#ffe6f4';
    g2.font = "11px 'Jersey 25', 'VT323', monospace";
    g2.textAlign = 'center';
    g2.fillText(label, x + w / 2, y + h / 2 + 4);
    g2.textAlign = 'left';
    GAME.hitRects.push({ x, y, w, h, sel, key });
  }

  function gDrawEvent(g2) {
    GAME.hitRects = [];
    const ev = GAME.event;
    gPanel(g2, 8, 6, G_W - 16, G_H - 12);
    g2.fillStyle = '#ffe6f4';
    g2.font = "12px 'Jersey 25', 'VT323', monospace";

    if (ev.type === 'god') {
      g2.fillText(`${ev.god.icon} ${L(ev.god.name)}`, 20, 24);
      g2.fillStyle = '#ffe98a';
      g2.font = "11px 'Jersey 25', 'VT323', monospace";
      g2.fillText('“' + L(ev.god.pitch) + '”', 20, 42);
      g2.fillStyle = gTheme.pink;
      g2.font = "12px 'Jersey 25', 'VT323', monospace";
      g2.fillText(L([`"will you devote yourself to ${ev.god.name[0]}?"`, `« te voueras-tu à ${ev.god.name[1]} ? »`]), 20, 62);
      g2.fillStyle = '#c3aee0';
      g2.font = "10px 'Jersey 25', 'VT323', monospace";
      g2.fillText(L(["(it eyes your " + GAME.coins + " coins and your " + GAME.lives + " ♥)", "(il lorgne tes " + GAME.coins + " pièces et tes " + GAME.lives + " ♥)"]), 20, 78);
      gOption(g2, 60, 96, 150, 26, L(["🙏 believe [1]", "🙏 croire [1]"]), ev.sel === 0, 0);
      gOption(g2, 270, 96, 150, 26, L(["🚫 refuse [2]", "🚫 refuser [2]"]), ev.sel === 1, 1);
    } else if (ev.type === 'offer') {
      g2.fillText(L(["a weapon lies on the road…", "une arme traîne sur la route…"]), 20, 24);
      g2.fillStyle = ev.cursed ? '#ffe98a' : gTheme.pink;
      g2.fillText(L(ev.weapon.name), 20, 44);
      if (ev.cursed) {
        g2.fillStyle = '#c3aee0';
        g2.font = "10px 'Jersey 25', 'VT323', monospace";
        g2.fillText(L(["it sparkles a little TOO hard…", "elle brille un peu TROP fort…"]), 20, 60);
      }
      gOption(g2, 60, 96, 150, 26, L(["🖐️ take it [1]", "🖐️ la prendre [1]"]), ev.sel === 0, 0);
      gOption(g2, 270, 96, 150, 26, L(["🚶 walk away [2]", "🚶 passer [2]"]), ev.sel === 1, 1);
    } else if (ev.type === 'tarot') {
      g2.fillText('🧙 ' + L(["the wizard spreads three cards…", "le mage étale trois cartes…"]), 20, 22);
      for (let i = 0; i < 3; i++) {
        const cx = 150 + i * 70, cy = ev.sel === i ? 32 : 38;
        g2.fillStyle = ev.sel === i ? gTheme.pink : gTheme.purple;
        g2.fillRect(cx, cy, 44, 58);
        g2.strokeStyle = ev.sel === i ? '#ffe98a' : gTheme.ink;
        g2.lineWidth = 2;
        g2.strokeRect(cx + 1, cy + 1, 42, 56);
        g2.fillStyle = '#ffe6f4';
        g2.font = "16px 'Jersey 25', 'VT323', monospace";
        g2.textAlign = 'center';
        g2.fillText('✦', cx + 22, cy + 34);
        g2.textAlign = 'left';
        GAME.hitRects.push({ x: cx, y: cy, w: 44, h: 58, sel: i });
      }
      g2.fillStyle = '#ffe98a';
      g2.font = "10px 'Jersey 25', 'VT323', monospace";
      if (ev.phase === 'confirm') {
        g2.fillText('🧙 ' + L(ev.confirmQ), 20, 112);
        gOption(g2, 250, 100, 90, 22, L(["yes!! [␣]", "oui !! [␣]"]), true, undefined, 'Enter');
        gOption(g2, 350, 100, 90, 22, L(["n-no [N]", "n-non [N]"]), false, undefined, 'KeyN');
      } else {
        g2.fillText('🧙 ' + L(ev.taunt) + '  ' + L(["(←/→ choose · ␣ pick)", "(←/→ choisir · ␣ tirer)"]), 20, 112);
      }
    } else if (ev.type === 'interview') {
      g2.fillText('🧚 ' + L(["a tiny HR fairy saw you smiling just now…", "une petite fée RH t'a vu sourire à l'instant…"]), 20, 22);
      g2.fillStyle = gTheme.pink;
      g2.fillText(L(['"the dev behind this game is job-hunting."', "« la dev derrière ce jeu cherche un poste. »"]), 20, 42);
      g2.fillText(L(['"want to interview Yongshan for real?"', "« un vrai entretien avec Yongshan, ça te dit ? »"]), 20, 58);
      g2.fillStyle = '#c3aee0';
      g2.font = "10px 'Jersey 25', 'VT323', monospace";
      g2.fillText(L(["(choosing yes = a free pick of the BEST buffs. zero downside. suspiciously generous.)", "(dire oui = un des MEILLEURS buffs au choix. aucun piège. générosité suspecte.)"]), 20, 74);
      gOption(g2, 40, 96, 190, 26, L(["📅 schedule interview [1]", "📅 planifier l'entretien [1]"]), ev.sel === 0, 0);
      gOption(g2, 260, 96, 170, 26, L(["🏃 keep running [2]", "🏃 continuer à courir [2]"]), ev.sel === 1, 1);
    } else if (ev.type === 'reward' || ev.type === 'coach') {
      g2.fillStyle = '#ffe98a';
      if (ev.type === 'coach') {
        g2.fillText('🍮 ' + L(["\"ENOUGH. coaching time. lessons below.\"", "« ÇA SUFFIT. séance de coaching. leçons ci-dessous. »"]), 20, 20);
        g2.fillStyle = '#ffc2e2';
        g2.font = "9px 'Jersey 25', 'VT323', monospace";
        g2.fillText(L([`my pick: #${ev.rec + 1} — "${ev.reason[0]}"`, `mon choix : #${ev.rec + 1} — « ${ev.reason[1]} »`]), 20, 32);
        g2.font = "12px 'Jersey 25', 'VT323', monospace";
      } else {
        g2.fillText(L(ev.title), 20, 24);
      }
      for (let i = 0; i < 3; i++) {
        const b = ev.opts[i];
        const bx = 24 + i * 146;
        const isSel = ev.sel === i;
        g2.fillStyle = isSel ? 'rgba(255,143,199,0.4)' : 'rgba(255,255,255,0.1)';
        g2.fillRect(bx, 36, 134, 52);
        g2.strokeStyle = isSel ? '#ffe98a' : gTheme.purple;
        g2.lineWidth = 2;
        g2.strokeRect(bx + 1, 37, 132, 50);
        g2.font = "14px 'Jersey 25', 'VT323', monospace";
        g2.fillStyle = '#ffe6f4';
        g2.fillText(b.icon, bx + 8, 54);
        g2.font = "9px 'Jersey 25', 'VT323', monospace";
        g2.fillStyle = '#ffc2e2';
        const words = L(b.t).split(' ');
        let line = '', ly = 68;
        for (const w of words) {
          if ((line + w).length > 24) { g2.fillText(line, bx + 8, ly); ly += 10; line = ''; }
          line += w + ' ';
        }
        g2.fillText(line, bx + 8, ly);
        if (ev.type === 'coach' && i === ev.rec) {
          g2.fillStyle = '#ffe98a';
          g2.font = "13px 'Jersey 25', 'VT323', monospace";
          g2.textAlign = 'center';
          g2.fillText('★', bx + 67, 34); // perched on the card's top edge
          g2.textAlign = 'left';
          g2.font = "12px 'Jersey 25', 'VT323', monospace";
        }
        GAME.hitRects.push({ x: bx, y: 36, w: 134, h: 52, sel: i });
      }
      g2.fillStyle = '#c3aee0';
      g2.font = "10px 'Jersey 25', 'VT323', monospace";
      if (ev.type === 'coach') {
        const lesson = ev.opts[ev.sel].lesson;
        g2.fillText('🍮 ' + L(lesson).slice(0, 84), 20, 103);
        g2.fillText(L(["←/→ hear each lesson · ␣ claim", "←/→ écouter chaque leçon · ␣ réclamer"]), 20, 114);
      } else {
        g2.fillText(L(["←/→ choose · ␣ claim", "←/→ choisir · ␣ réclamer"]), 20, 112);
      }
    } else if (ev.type === 'shop') {
      g2.fillText('🐱🧋 ' + L(["boba cat's roadside shop", "l'échoppe du chat-boba"]) + `   ⛁${GAME.coins}`, 20, 22);
      for (let i = 0; i < 3; i++) {
        const it = ev.items[i];
        const bx = 24 + i * 140;
        const isSel = ev.sel === i;
        g2.fillStyle = isSel ? 'rgba(255,143,199,0.35)' : 'rgba(255,255,255,0.08)';
        g2.fillRect(bx, 32, 128, 56);
        g2.strokeStyle = isSel ? '#ffe98a' : gTheme.purple;
        g2.strokeRect(bx + 1, 33, 126, 54);
        g2.fillStyle = '#ffe6f4';
        g2.font = "11px 'Jersey 25', 'VT323', monospace";
        g2.fillText(`${it.icon} ${ev.sold[i] ? L(["SOLD", "VENDU"]) : '⛁' + it.price}`, bx + 8, 48);
        g2.font = "9px 'Jersey 25', 'VT323', monospace";
        g2.fillStyle = ev.sold[i] ? '#8a7a9a' : '#ffc2e2';
        g2.fillText(L(it.name).slice(0, 22), bx + 8, 64);
        GAME.hitRects.push({ x: bx, y: 32, w: 128, h: 56, sel: i });
      }
      gOption(g2, 150, 96, 180, 24, L(["👋 leave shop [N]", "👋 quitter [N]"]), ev.sel === 3, 3);
    }
  }

  function gDrawRogueHud(g2) {
    if (GAME.state !== 'run' && !GAME.event) return;
    g2.font = "11px 'Jersey 25', 'VT323', monospace";
    // lives
    for (let i = 0; i < 3; i++) {
      g2.fillStyle = i < GAME.lives ? gTheme.pink : 'rgba(120,100,140,0.4)';
      g2.fillText('♥', 8 + i * 11, 14);
    }
    // coins
    g2.fillStyle = '#e8b93c';
    g2.fillText('⛁' + GAME.coins, 8, 27);
    // weapon
    if (GAME.weapon) {
      g2.fillStyle = gTheme.purple;
      g2.font = "9px 'Jersey 25', 'VT323', monospace";
      g2.fillText(L(GAME.weapon.name).slice(0, 20), 8, 39);
    }
    if (GAME.muffled) {
      g2.font = "10px 'Jersey 25', 'VT323', monospace";
      g2.fillText('🎧', 44, 14);
    }
    // cosmetic halo
    if (modActive('halo')) {
      g2.strokeStyle = '#ffe98a';
      g2.lineWidth = 2;
      const hy = G_GROUND - G_SLIME_S * modVal('size') - GAME.y - 8;
      g2.strokeRect(G_SLIME_X + 8, hy, G_SLIME_S - 16, 3);
    }
  }

  // ---------- spectator slime (light mode) ----------
  var gLastCheer = 0;
  const CHEER_LINES = [
    ["GO GO GO!! that's my player!!", "ALLEZ ALLEZ !! c'est mon joueur, ça !!"],
    ["did everyone SEE that jump?!", "tout le monde a VU ce saut ?!"],
    ["I taught them everything. everything!!", "je leur ai tout appris. TOUT !!"],
    ["new milestone!! I'm literally vibrating", "nouveau palier !! je vibre littéralement"],
    ["boss DELETED. crowd goes wild ♡", "boss SUPPRIMÉ. la foule est en délire ♡"],
    ["frame-perfect!! chef's kiss!!", "à la frame près !! chef d'œuvre !!"]
  ];

  function gSpectate(kind) {
    if (resolvedTheme() === 'dark') return;          // at night it's asleep (or grumpy)
    if (pet.sleeping || pet.busy || ghostHidden()) return;
    if (Date.now() - gLastCheer < 9000 && kind === 'cheer') return;
    gLastCheer = Date.now();
    if (kind === 'mercy') {
      showBubble(trT("I CAN'T WATCH!! take something, PLEASE 🥺", "JE NE PEUX PLUS REGARDER !! prends quelque chose, PITIÉ 🥺"), 2800);
      moveSlime({ action: 'alert', mood: trT('worried', 'inquiet'), duration: 1100 });
    } else {
      const l = CHEER_LINES[Math.floor(Math.random() * CHEER_LINES.length)];
      showBubble(trT(l[0], l[1]), 2200);
      moveSlime({ action: 'happy', mood: trT('hyped', 'surexcité'), duration: 800, distance: 0.3 });
    }
  }

  // ---------- dark-mode exclusive: the dream muffler ----------
  const MUFFLER_ITEM = { icon: '🎧', price: 7, name: ["dream muffler (roommate-safe gaming)", "casque anti-bruit des rêves (jeu sans réveil)"], out: { t: ["equipped!! your run is now whisper-quiet. the sleeper sleeps on 💤", "équipé !! ta partie est désormais silencieuse. le dormeur dort 💤"], fx: () => { GAME.muffled = true; } } };
  const MUFFLER_DROP = { t: ["inside: a dream muffler 🎧 !! game noise can't wake the sleeper now", "dedans : un casque anti-bruit des rêves 🎧 !! le bruit du jeu ne réveillera plus le dormeur"], fx: () => { GAME.muffled = true; } };

  // ---------- chat/danmaku shout (records, announcements) ----------
  function chatShout(en, fr) {
    const payload = { u: 'pixel_fan', c: '#e8a13c', t: en, f: fr };
    const cw = document.getElementById('win-chat');
    if (cw && !cw.classList.contains('window-closed') && !cw.classList.contains('window-minimized')) {
      appendChatMessage(makeChatLine(payload));
    } else {
      pushDanmaku(payload, false, true);
    }
  }

  // ---------- leaderboard: local arcade top-10 + global tier census ----------
  const LB_TIERS = [100, 300, 600, 1000, 1500, 2500];

  function lbTierIndex(score) {
    let idx = 0;
    LB_TIERS.forEach((t, i) => { if (score >= t) idx = i + 1; });
    return idx;
  }

  function gFinalizeRun(score) {
    if (score < 10) return;
    if (navigator.onLine) {
      fetch(`${LIKE_API}/hit/${LIKE_NS}/lb-t${lbTierIndex(score)}`).catch(() => {});
      const board = store.get('yos-lb', []);
      if (board.length < 10 || score > board[board.length - 1].s) {
        window.__lbPendingScore = score;
        gToast(["🏆 TOP-10 RUN!! open hall_of_slime.exe to sign it", "🏆 RUN TOP 10 !! ouvre hall_of_slime.exe pour la signer"], 240);
      }
    } else {
      // offline glory: preserve the run + the beloved weapon as a keepsake
      const best = store.get('yos-offline-best', 0);
      if (score > best) store.set('yos-offline-best', score);
      if (GAME.weapon) {
        store.set('yos-keepsake', { id: GAME.weapon.id, name: GAME.weapon.name, s: score, d: Date.now() });
        gToast(["📦 offline legend sealed: your weapon awaits your return online", "📦 légende hors-ligne scellée : ton arme attend ton retour en ligne"], 240);
      }
    }
  }

  function lbEsc(str) { return String(str).replace(/[^A-Za-z0-9♡]/g, '').slice(0, 3).toUpperCase() || 'YOU'; }

  function renderLeaderboard() {
    const listEl = document.getElementById('lb-local-list');
    const globalEl = document.getElementById('lb-global-line');
    const signEl = document.getElementById('lb-sign-row');
    const keepEl = document.getElementById('lb-keepsake');
    if (!listEl) return;

    const board = store.get('yos-lb', []);
    listEl.innerHTML = '';
    if (!board.length) {
      const li = document.createElement('li');
      li.textContent = trT('no runs signed yet — be the first ♡', 'aucune run signée — sois la première ♡');
      listEl.appendChild(li);
    }
    board.forEach((e, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="lb-rank">${i + 1}.</span> <strong>${e.n}</strong> <span class="lb-score">${e.s}</span>`;
      listEl.appendChild(li);
    });

    // signing a pending top-10 run
    if (signEl) {
      const pending = window.__lbPendingScore;
      signEl.hidden = !pending;
      if (pending) {
        document.getElementById('lb-pending-score').textContent = pending;
        const btn = document.getElementById('lb-sign-btn');
        btn.onclick = () => {
          const initials = lbEsc(document.getElementById('lb-initials').value);
          const b = store.get('yos-lb', []);
          b.push({ n: initials, s: pending });
          b.sort((a, c) => c.s - a.s);
          store.set('yos-lb', b.slice(0, 10));
          window.__lbPendingScore = null;
          playFanfare();
          renderLeaderboard();
        };
      }
    }

    // global census from the shared tier counters
    if (globalEl) {
      globalEl.textContent = trT('contacting the global hall…', 'contact du panthéon mondial…');
      const myBest = store.get('yos-runner-hi', 0);
      Promise.all(
        Array.from({ length: LB_TIERS.length + 1 }, (_, i) =>
          fetch(`${LIKE_API}/get/${LIKE_NS}/lb-t${i}`).then((r) => (r.ok ? r.json() : { value: 0 })).then((d) => Math.max(0, Number(d.value) || 0)).catch(() => 0)
        )
      ).then((counts) => {
        const total = counts.reduce((a, b) => a + b, 0);
        if (!total) { globalEl.textContent = trT('the global hall is empty — your run could be first!!', 'le panthéon mondial est vide — ta run pourrait être la première !!'); return; }
        const myTier = lbTierIndex(myBest);
        const below = counts.slice(0, myTier).reduce((a, b) => a + b, 0);
        const topPct = Math.max(1, Math.round(100 - (below / total) * 100));
        globalEl.textContent = trT(
          `${total} runs recorded worldwide · your best (${myBest}) sits around the top ${topPct}%`,
          `${total} runs enregistrées dans le monde · ton record (${myBest}) se situe dans le top ${topPct}% environ`
        );
      }).catch(() => { globalEl.textContent = trT('global hall unreachable (offline?)', 'panthéon mondial injoignable (hors-ligne ?)'); });
    }

    // the keepsake shelf
    if (keepEl) {
      const k = store.get('yos-keepsake', null);
      const offBest = store.get('yos-offline-best', 0);
      keepEl.innerHTML = '';
      if (!k && !offBest) { keepEl.hidden = true; return; }
      keepEl.hidden = false;
      const title = document.createElement('div');
      title.className = 'lb-keep-title';
      title.textContent = trT('📦 keepsake from the offline era', "📦 relique de l'ère hors-ligne");
      keepEl.appendChild(title);
      if (k) {
        const row = document.createElement('div');
        row.className = 'lb-keep-row';
        row.textContent = `${L(k.name)} — ${trT('score', 'score')} ${k.s}`;
        keepEl.appendChild(row);
        const btn = document.createElement('button');
        btn.className = 'lb-keep-btn';
        btn.textContent = trT('⚔️ equip it next run', "⚔️ l'équiper à la prochaine run");
        btn.onclick = () => {
          store.set('yos-pending-weapon', k.id);
          btn.textContent = trT('✔ waiting at the starting line ♡', '✔ elle t\'attend sur la ligne de départ ♡');
          playSparkleSound();
        };
        keepEl.appendChild(btn);
      }
      if (offBest && navigator.onLine) {
        const btn2 = document.createElement('button');
        btn2.className = 'lb-keep-btn';
        btn2.textContent = trT(`📡 sync offline best (${offBest}) to the global hall`, `📡 publier le record hors-ligne (${offBest}) au panthéon`);
        btn2.onclick = () => {
          fetch(`${LIKE_API}/hit/${LIKE_NS}/lb-t${lbTierIndex(offBest)}`).catch(() => {});
          if (offBest > store.get('yos-runner-hi', 0)) store.set('yos-runner-hi', offBest);
          window.__lbPendingScore = offBest;
          store.set('yos-offline-best', 0);
          playFanfare();
          renderLeaderboard();
        };
        keepEl.appendChild(btn2);
      }
    }
  }

  // ---------- first-open hint (3-second self-destruct) ----------
  function showGameHint() {
    if (store.get('yos-game-hint', false)) return;
    store.set('yos-game-hint', true);
    const shell = document.querySelector('.game-shell');
    if (!shell) return;
    const pop = document.createElement('div');
    pop.className = 'game-hint-pop';
    let n = 3;
    const text = () => trT(`tip: this game is best played MAXIMIZED ⛶ (${n})`, `astuce : ce jeu se joue de préférence AGRANDI ⛶ (${n})`);
    pop.textContent = text();
    shell.appendChild(pop);
    const iv = setInterval(() => {
      n--;
      if (n <= 0) { clearInterval(iv); pop.remove(); return; }
      pop.textContent = text();
    }, 1000);
  }

  // ---------- interview scheduler window ----------
  // Yongshan's Google Calendar appointment schedule.
  // BOOKING_EMBED (?gv=true) is Google's frameable variant for the iframe;
  // BOOKING_LINK is the share URL for the open-in-new-tab button.
  const INTERVIEW_BOOKING_URL = 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ0xMos0b7sLlv7UnIagKSQUJNc3UplO3mRfJ_PeCxjPKkaf4-bahe0_SPW1-uHrKcAUYlVX98vM?gv=true';
  const INTERVIEW_BOOKING_LINK = 'https://calendar.app.google/xFufZSTaTQuDycS67';

  function setupInterviewWindow() {
    const embed = document.getElementById('interview-embed');
    const mailBtn = document.getElementById('interview-mail');
    if (mailBtn) {
      const score = Math.max(Math.floor(GAME.score), store.get('yos-runner-hi', 0));
      const subject = encodeURIComponent(trT('Interview invitation (via slime_run ♡)', 'Invitation à un entretien (via slime_run ♡)'));
      const body = encodeURIComponent(trT(
        `Hi Yongshan,\n\nI just played slime_run on your portfolio (score: ${score}) and I'd love to schedule an interview / a chat about opportunities.\n\nProposed times:\n- \n- \n\nBest,\n`,
        `Bonjour Yongshan,\n\nJe viens de jouer à slime_run sur ton portfolio (score : ${score}) et j'aimerais planifier un entretien.\n\nCréneaux proposés :\n- \n- \n\nCordialement,\n`
      ));
      mailBtn.href = `mailto:yuyongshan573@gmail.com?subject=${subject}&body=${body}`;
    }
    if (!embed || embed.dataset.ready) return;
    embed.dataset.ready = '1';
    if (INTERVIEW_BOOKING_URL) {
      const frame = document.createElement('iframe');
      frame.src = INTERVIEW_BOOKING_URL;
      frame.className = 'interview-frame';
      frame.setAttribute('title', 'Yongshan availability calendar');
      frame.setAttribute('loading', 'lazy');
      embed.appendChild(frame);
      // belt & suspenders: a real-tab link in case any browser blocks the embed
      const openBtn = document.createElement('a');
      openBtn.className = 'interview-li-btn';
      openBtn.href = INTERVIEW_BOOKING_LINK;
      openBtn.target = '_blank';
      openBtn.rel = 'noopener noreferrer';
      openBtn.textContent = trT('📅 open booking page in a new tab ↗', '📅 ouvrir la page de réservation dans un onglet ↗');
      const actions = document.querySelector('.interview-actions');
      if (actions) actions.prepend(openBtn);
    } else {
      const note = document.createElement('div');
      note.className = 'interview-note';
      note.textContent = trT(
        '📅 live availability calendar loading soon — meanwhile, the email button below reaches her directly ♡',
        '📅 le calendrier de disponibilités arrive bientôt — en attendant, le bouton courriel ci-dessous la joint directement ♡'
      );
      embed.appendChild(note);
    }
  }

  /* =====================================================
     v5.4 — DEVICE ORACLE
     Feature-first, UA-second detection. Priorities:
     userAgentData (Chromium) > vendor checks > UA regex.
     iPadOS pretends to be a Mac — unmasked via touch points.
     ===================================================== */
  const YOS_DEVICE = (() => {
    const ua = navigator.userAgent || '';
    const uad = navigator.userAgentData;
    const plat = (uad && uad.platform) || navigator.platform || '';

    let browser = 'other';
    if (/Edg(e|A|iOS)?\//.test(ua)) browser = 'edge';
    else if (/OPR\/|Opera/.test(ua)) browser = 'opera';
    else if (/Firefox\/|FxiOS\//.test(ua)) browser = 'firefox';
    else if (/CriOS\//.test(ua)) browser = 'chrome';
    else if (uad && uad.brands && uad.brands.some((b) => /Chrom/.test(b.brand))) browser = 'chrome';
    else if (/Chrome\//.test(ua)) browser = 'chrome';
    else if (navigator.vendor === 'Apple Computer, Inc.' && /Safari\//.test(ua)) browser = 'safari';

    const iPadOS = plat === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1;
    let os = 'other';
    if (/CrOS/.test(ua)) os = 'chromeos';
    else if (/Android/i.test(ua)) os = 'android';
    else if (/iPhone|iPod/.test(ua)) os = 'ios';
    else if (/iPad/.test(ua) || iPadOS) os = 'ipados';
    else if (/Mac/i.test(plat) || /Macintosh/.test(ua)) os = 'macos';
    else if (/Win/i.test(plat) || /Windows/.test(ua)) os = 'windows';
    else if (/Linux/i.test(plat) || /Linux|X11/.test(ua)) os = 'linux';

    let device = 'desktop';
    if (os === 'ios') device = 'phone';
    else if (os === 'ipados') device = 'tablet';
    else if (os === 'android') device = /Mobile/.test(ua) ? 'phone' : 'tablet';
    return { browser, os, device };
  })();

  // easter-egg lines per browser / OS — [en, fr] pairs everywhere
  const DEVICE_EGGS = {
    safari: {
      hello: ["a Safari visitor!! I promise I'm not a WebKit bug… today ♡", "un·e visiteur·se Safari !! promis, je ne suis pas un bug WebKit… aujourd'hui ♡"],
      game: ["level tip: best played in any browser. yes, even this one ♡", "astuce : jouable dans n'importe quel navigateur. oui, même celui-ci ♡"],
      idle: [["no, YOU'RE asking permission to autoplay", "non, c'est TOI qui demandes la permission d'autoplay"], ["I feel very energy-efficient today", "je me sens très économe en énergie aujourd'hui"]],
      neo: "rendered lovingly by WebKit"
    },
    firefox: {
      hello: ["a fox friend!! 🦊 the slime salutes an independent engine", "un ami renard !! 🦊 le slime salue un moteur indépendant"],
      game: ["🦊 fox blessing: your jumps feel 3% more free", "🦊 bénédiction du renard : tes sauts semblent 3 % plus libres"],
      idle: [["you strike me as someone with a custom userChrome.css", "tu m'as l'air d'avoir un userChrome.css personnalisé"], ["foxes and slimes: natural allies", "renards et slimes : alliés naturels"]],
      neo: "powered by an actual fox"
    },
    chrome: {
      hello: ["Chrome, huh? I can hear your RAM from here ♡", "Chrome, hein ? j'entends ta RAM d'ici ♡"],
      game: ["each of your 47 open tabs is cheering for you", "tes 47 onglets ouverts t'encouragent en chœur"],
      idle: [["every tab is its own little slime, when you think about it", "chaque onglet est un petit slime, quand on y pense"], ["blink and you'll miss me. Blink. get it.", "un clin d'œil et tu me rates. Blink. tu l'as ?"]],
      neo: "one of your many, many tabs"
    },
    edge: {
      hello: ["you CHOSE Edge. bold. the slime respects it", "tu as CHOISI Edge. audacieux. le slime respecte"],
      game: ["Edge-run detected: +0 buffs, +100 respect", "run sous Edge détectée : +0 buff, +100 respect"],
      idle: [["not even Bing could find a cuter slime", "même Bing ne trouverait pas de slime plus mignon"]],
      neo: "living on the Edge"
    }
  };
  const OS_EGGS = {
    macos: {
      hello: ["your keyboard has a ⌘ and my heart has a ♡", "ton clavier a un ⌘ et mon cœur a un ♡"],
      game: ["⌘ + jump does nothing. but it FEELS premium", "⌘ + saut ne fait rien. mais ça FAIT premium"],
      idle: [["I'd look great in your dock, just saying", "je serais superbe dans ton dock, je dis ça je dis rien"]],
      neo: "on a Mac, obviously"
    },
    windows: {
      hello: ["welcome, Windows friend! no blue screens here — only pink ones", "bienvenue, ami·e Windows ! pas d'écran bleu ici — seulement des roses"],
      game: ["this run has not responded in 0 seconds. flawless.", "cette run ne répond plus depuis 0 seconde. impeccable."],
      idle: [["have you tried turning me off and on again? please don't", "as-tu essayé de m'éteindre et me rallumer ? s'il te plaît, non"]],
      neo: "ctrl+alt+delightful"
    },
    linux: {
      hello: ["a Linux user!! you've read more man pages than my whole résumé", "un·e utilisateur·rice Linux !! tu as lu plus de man pages que tout mon CV"],
      game: ["sudo apt-get install victory", "sudo apt-get install victoire"],
      idle: [["btw I use slime", "btw j'utilise slime"], ["my dotfiles are just heart emojis", "mes dotfiles ne sont que des cœurs"]],
      neo: "GNU/cute"
    },
    ios: {
      hello: ["tiny screen, full-size cuteness ♡", "petit écran, mignonnerie grand format ♡"],
      game: ["swipe up to jump. do NOT close me. rude.", "balaie vers le haut pour sauter. ne me ferme PAS. malpoli."],
      idle: [["I would make an excellent home-screen widget", "je ferais un excellent widget d'écran d'accueil"]],
      neo: "there's an app for this feeling"
    },
    ipados: {
      hello: ["an iPad?! I'm basically a Procreate brush now", "un iPad ?! je suis pratiquement un pinceau Procreate"],
      game: ["finger, pencil, or pure willpower — all valid controllers", "doigt, stylet ou volonté pure — toutes des manettes valables"],
      idle: [["I too pretend to be a computer sometimes", "moi aussi je me fais passer pour un ordinateur parfois"]],
      neo: "definitely not a Mac (wink)"
    },
    android: {
      hello: ["a green robot friend for a pink slime friend 🤖♡", "un ami robot vert pour un ami slime rose 🤖♡"],
      game: ["material you? more like material MEOW", "material you ? plutôt material MIAOU"],
      idle: [["your back button and I are best friends now", "ton bouton retour et moi sommes meilleurs amis maintenant"]],
      neo: "it's rolling, it's droid"
    },
    chromeos: {
      hello: ["a Chromebook! we are both, technically, a browser", "un Chromebook ! nous sommes tous deux, techniquement, un navigateur"],
      game: ["everything is a tab. even glory.", "tout est un onglet. même la gloire."],
      idle: [["I live in a tab too. cozy, right?", "moi aussi j'habite dans un onglet. douillet, non ?"]],
      neo: "browser-ception"
    }
  };

  function deviceEgg(kind) {
    const pools = [];
    if (DEVICE_EGGS[YOS_DEVICE.browser] && DEVICE_EGGS[YOS_DEVICE.browser][kind]) pools.push(DEVICE_EGGS[YOS_DEVICE.browser][kind]);
    if (OS_EGGS[YOS_DEVICE.os] && OS_EGGS[YOS_DEVICE.os][kind]) pools.push(OS_EGGS[YOS_DEVICE.os][kind]);
    if (!pools.length) return null;
    return pools[Math.floor(Math.random() * pools.length)];
  }

  // extra everyday chatter — variety is a love language
  const EXTRA_IDLE = [
    ["I reorganized my pixels today. very slimming", "j'ai réorganisé mes pixels aujourd'hui. très amincissant"],
    ["do you like my outfit? I have THIRTY-FIVE more", "tu aimes ma tenue ? j'en ai TRENTE-CINQ autres"],
    ["thinking about boba. as one does", "je pense au bubble tea. comme tout le monde"],
    ["I know 70 outfits and 0 pockets. tragic", "je connais 70 tenues et 0 poche. tragique"],
    ["today's mood: deployed and adorable", "humeur du jour : déployé et adorable"],
    ["I practiced my bounce. it's 2% bouncier", "j'ai travaillé mon rebond. il est 2 % plus rebondissant"],
    ["her commit messages? poetry.", "ses messages de commit ? de la poésie."],
    ["I'm not procrastinating, I'm buffering", "je ne procrastine pas, je bufferise"],
    ["somewhere, a recruiter is smiling. I can feel it", "quelque part, une recruteuse sourit. je le sens"],
    ["stretch break!! *does not stretch, is a slime*", "pause étirements !! *ne s'étire pas, est un slime*"]
  ];
  (function seedExtraIdle() {
    const dyn = window.YOS_DYN || {};
    EXTRA_IDLE.forEach(([en, fr]) => {
      if (dyn.en && dyn.en.idle) dyn.en.idle.push(en);
      if (dyn.fr && dyn.fr.idle) dyn.fr.idle.push(fr);
      idlePhrases.push(en);
    });
  })();

  // sprinkle device idle lines into the slime's vocabulary (both languages)
  (function seedDeviceIdleLines() {
    const packs = [];
    if (DEVICE_EGGS[YOS_DEVICE.browser]) packs.push(...(DEVICE_EGGS[YOS_DEVICE.browser].idle || []));
    if (OS_EGGS[YOS_DEVICE.os]) packs.push(...(OS_EGGS[YOS_DEVICE.os].idle || []));
    const dyn = window.YOS_DYN || {};
    packs.forEach(([en, fr]) => {
      if (dyn.en && dyn.en.idle) dyn.en.idle.push(en);
      if (dyn.fr && dyn.fr.idle) dyn.fr.idle.push(fr);
      idlePhrases.push(en);
    });
  })();

  // one warm, device-aware hello shortly after boot (once per visit)
  setTimeout(() => {
    const egg = deviceEgg('hello');
    if (egg && !pet.sleeping && !pet.busy && (typeof ghostHidden !== 'function' || !ghostHidden())) {
      showBubble(trT(egg[0], egg[1]), 3200);
    }
  }, 9000);

  /* =====================================================
     v5.3 — totally_not_an_ad.exe
     A wandering Y2K popup that lures light-mode visitors
     into slime_run. Both buttons start the game; the
     over-excited one starts it with a hype bonus.
     ===================================================== */
  var gPendingBoost = false;
  var gInviteShownThisVisit = false;
  var gInviteEl = null;

  function dismissGameInvite() {
    if (gInviteEl) { gInviteEl.remove(); gInviteEl = null; }
  }

  function launchGameFromInvite(hyped) {
    gPendingBoost = hyped;
    dismissGameInvite();
    playClickSound();
    openWindow('win-game');
    setTimeout(() => {
      if (GAME.state !== 'run') gJump(); // straight into the action
      if (gCanvas) { gCanvas.classList.add('ring-off'); gCanvas.focus({ preventScroll: true }); }
      if (hyped && !pet.sleeping && typeof showBubble === 'function') {
        showBubble(trT('THAT is the spirit!!', 'VOILÀ l\'état d\'esprit !!'), 2200);
      }
    }, 260);
  }

  function showGameInvite() {
    if (gInviteEl || gInviteShownThisVisit) return;
    gInviteShownThisVisit = true;

    const box = document.createElement('div');
    box.className = 'game-invite';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', trT('An invitation to play slime_run', 'Une invitation à jouer à slime_run'));

    const head = document.createElement('div');
    head.className = 'gi-head';
    const title = document.createElement('span');
    title.textContent = '🎮 totally_not_an_ad.exe';
    const close = document.createElement('button');
    close.className = 'gi-close';
    close.textContent = '♥';
    close.setAttribute('aria-label', trT('Close this popup', 'Fermer cette fenêtre'));
    close.addEventListener('click', () => { playCloseSound(); dismissGameInvite(); });
    head.appendChild(title);
    head.appendChild(close);

    const body = document.createElement('p');
    body.className = 'gi-body';
    body.textContent = trT(
      'drowning in bugs all day is no way to live. fancy something fun for a minute?',
      'se noyer dans les bugs toute la journée, ce n\'est pas une vie. un petit moment fun ?'
    );

    const row = document.createElement('div');
    row.className = 'gi-row';
    const yes = document.createElement('button');
    yes.className = 'gi-yes';
    yes.textContent = trT('yes', 'oui');
    yes.addEventListener('click', () => launchGameFromInvite(false));
    const hype = document.createElement('button');
    hype.className = 'gi-hype';
    const hypeLabel = document.createElement('span');
    hypeLabel.className = 'gi-hype-label';
    hypeLabel.textContent = trT('oooooof cooooourse yessssssss!!!!!', 'ooooh çaaaa ouiiiiii évidemmenttttt !!!!!');
    hype.appendChild(hypeLabel);
    // a tiny pixel firework garden: twinkling stars + drifting rainbows
    [['★', 'gi-star s1'], ['★', 'gi-star s2'], ['★', 'gi-star s3'], ['✦', 'gi-star s4'], ['★', 'gi-star s5']].forEach(([ch, cls]) => {
      const st = document.createElement('span');
      st.className = cls;
      st.textContent = ch;
      st.setAttribute('aria-hidden', 'true');
      hype.appendChild(st);
    });
    ['gi-rainbow r1', 'gi-rainbow r2'].forEach((cls) => {
      const rb = document.createElement('span');
      rb.className = cls;
      rb.setAttribute('aria-hidden', 'true');
      hype.appendChild(rb);
    });
    hype.addEventListener('click', () => launchGameFromInvite(true));
    row.appendChild(yes);
    row.appendChild(hype);

    box.appendChild(head);
    box.appendChild(body);
    box.appendChild(row);
    document.body.appendChild(box);
    gInviteEl = box;

    playSparkleSound();
    if (!pet.sleeping && typeof showBubble === 'function' && typeof ghostHidden === 'function' && !ghostHidden()) {
      showBubble(trT('say yes say yes say yes', 'dis oui dis oui dis oui'), 2600);
    }
  }

  function scheduleGameInvite() {
    // seasoned players already know the arcade — don't nag them
    if (store.get('yos-runner-hi', 0) > 0) return;
    setTimeout(function tryShow() {
      if (gInviteShownThisVisit) return;
      const gameOpen = !document.getElementById('win-game').classList.contains('window-closed');
      if (document.hidden || resolvedTheme() !== 'light' || gameOpen) {
        setTimeout(tryShow, 20000); // wrong moment — lurk and retry
        return;
      }
      showGameInvite();
    }, 30000 + Math.random() * 5000);
  }
  scheduleGameInvite();

  /* =====================================================
     v6.0 — SLIME LIVE ROOM 🔴
     The real pet node relocates onto a big stage; gifts fly,
     a local-only wave-cam reads gestures, and every chat
     message mirrors into the room. i18n + a11y throughout.
     ===================================================== */
  const liveStage = document.getElementById('live-stage');
  const liveFeed = document.getElementById('live-chat-feed');
  const liveComboEl = document.getElementById('live-combo');
  var liveOpen = false;

  function liveEnter() {
    if (liveOpen || !liveStage || !slimeBody) return;
    liveOpen = true;
    if (typeof ghostHidden === 'function' && ghostHidden()) ghostAppear(0, false);
    liveStage.appendChild(slimeBody);
    liveStage.appendChild(speechBubble);
    slimeHabitat.classList.add('on-air');
    slimePosition.x = 0; slimePosition.y = 0;
    applySlimeTransform(1, 0, 400);
    showBubble(trT("WE'RE LIVE!! hi chat ♡", 'ON EST EN DIRECT !! coucou le chat ♡'), 2600);
    if (typeof moveSlime === 'function') moveSlime({ action: 'happy', mood: trT('streaming', 'en direct'), duration: 800 });
    liveViewerTick();
  }

  function liveExit() {
    if (!liveOpen) return;
    liveOpen = false;
    camStop();
    slimeHabitat.appendChild(slimeBody);
    slimeHabitat.appendChild(speechBubble);
    slimeHabitat.classList.remove('on-air');
    slimePosition.x = 0; slimePosition.y = 0;
    applySlimeTransform(1, 0, 400);
  }

  function liveViewerTick() {
    const el = document.getElementById('live-viewers');
    if (el) el.textContent = String(38 + Math.floor(Math.random() * 30) + pet.followers);
    if (liveOpen) setTimeout(liveViewerTick, 4000);
  }

  // every chat line mirrors into the room
  function liveMirror(node) {
    if (!liveFeed || !liveOpen) return;
    liveFeed.appendChild(node.cloneNode(true));
    while (liveFeed.children.length > 40) liveFeed.removeChild(liveFeed.firstChild);
    liveFeed.scrollTop = liveFeed.scrollHeight;
  }

  /* ---------- gifts ---------- */
  const GIFTS = {
    candy:  { icon: '🍬', fans: 1, react: [["a candy!! crunch crunch ♡", "un bonbon !! cronch cronch ♡"], ["sugar rush initiated", "rush de sucre enclenché"]] },
    rose:   { icon: '🌹', fans: 2, react: [["a rose?? for ME?? *blushes in pixels*", "une rose ?? pour MOI ?? *rougit en pixels*"], ["I will water it with love", "je l'arroserai avec de l'amour"]] },
    boba:   { icon: '🧋', fans: 3, react: [["BOBA. you know me so well", "du BOBA. tu me connais si bien"], ["extra pearls?? marry me", "double perles ?? épouse-moi"]] },
    cake:   { icon: '🎂', fans: 5, react: [["cake!! is it my birthday? it is now", "un gâteau !! c'est mon anniversaire ? maintenant oui"], ["one slice for me, one slice for me", "une part pour moi, une part pour moi"]] },
    heart:  { icon: '💖', fans: 8, react: [["a SUPER heart!! I'm going to cry pixels", "un SUPER cœur !! je vais pleurer des pixels"], ["my affection meter just broke (it was already full)", "ma jauge d'affection vient de casser (elle était déjà pleine)"]] },
    rocket: { icon: '🚀', fans: 15, react: [["A ROCKET?!! TO THE MOON!! (I live there)", "UNE FUSÉE ?!! TO THE MOON !! (j'y habite)"], ["biggest gift of the stream!! I'm SCREAMING", "le plus gros cadeau du stream !! je HURLE"]] }
  };
  var giftComboId = null, giftComboN = 0, giftComboTimer = null;

  function sendGift(id, btn) {
    const g = GIFTS[id];
    if (!g || !liveOpen) return;
    // combo bookkeeping
    if (giftComboId === id) giftComboN++;
    else { giftComboId = id; giftComboN = 1; }
    if (giftComboTimer) clearTimeout(giftComboTimer);
    giftComboTimer = setTimeout(() => { giftComboId = null; giftComboN = 0; if (liveComboEl) liveComboEl.textContent = ''; }, 2600);
    if (liveComboEl && giftComboN > 1) liveComboEl.textContent = `${g.icon} ×${giftComboN}!!`;

    // the gift flies from the button to the stage
    const fly = document.createElement('span');
    fly.className = 'gift-fly';
    fly.textContent = g.icon;
    const br = btn.getBoundingClientRect();
    const sr = liveStage.getBoundingClientRect();
    fly.style.left = br.left + br.width / 2 + 'px';
    fly.style.top = br.top + 'px';
    document.body.appendChild(fly);
    requestAnimationFrame(() => {
      fly.style.transform = `translate(${sr.left + sr.width / 2 - br.left}px, ${sr.top + sr.height / 2 - br.top}px) scale(1.6)`;
      fly.style.opacity = '0';
    });
    setTimeout(() => fly.remove(), 900);

    gainFollowers(g.fans);
    playTone(880 + g.fans * 40, 'triangle', 0.12, 0, 0.05);
    const line = makeChatLine({ u: trT('you', 'toi'), c: '#f0509f', t: `${g.icon} ${trT('sent a gift', 'a envoyé un cadeau')}${giftComboN > 1 ? ' ×' + giftComboN : ''}!!` });
    appendChatMessage(line);
    setTimeout(() => {
      const r = g.react[Math.floor(Math.random() * g.react.length)];
      showBubble(trT(r[0], r[1]), 2600);
      if (typeof moveSlime === 'function') moveSlime({ action: 'happy', mood: trT('spoiled', 'gâté'), duration: 760, distance: 0.4 });
      burstAtSlime(['♥', '✦', g.icon], id === 'rocket' ? 12 : 5);
      if (id === 'rocket') { playFanfare(); GAME.flash = 8; }
    }, 650);
  }

  document.querySelectorAll('.live-gift').forEach((btn) => {
    btn.addEventListener('click', () => sendGift(btn.dataset.gift, btn));
  });

  /* ---------- quick interactions ---------- */
  const lw = document.getElementById('live-wave');
  if (lw) lw.addEventListener('click', () => {
    showBubble(trT('hiii chat!!! ♡', 'salut le chaaat !!! ♡'), 2200);
    if (typeof moveSlime === 'function') moveSlime({ action: 'alert', mood: trT('waving', 'coucou'), duration: 900 });
    burstAtSlime(['👋', '♡'], 4);
  });
  const lh = document.getElementById('live-hype');
  if (lh) lh.addEventListener('click', () => playWithSlime());
  const ll = document.getElementById('live-lullaby');
  if (ll) ll.addEventListener('click', () => sleepSlime());

  /* ---------- wave-cam: motion-based gestures, 100% local ---------- */
  var camStream = null, camTimer = null, camPrev = null, camCentroids = [], camDarkFrames = 0, camLastTrigger = 0;
  const camVideo = document.getElementById('live-video');
  const camCanvas = document.createElement('canvas');
  camCanvas.width = 32; camCanvas.height = 24;

  function camStop() {
    if (camTimer) { clearInterval(camTimer); camTimer = null; }
    if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; }
    camPrev = null;
    const btn = document.getElementById('live-cam');
    if (btn) { btn.setAttribute('aria-pressed', 'false'); btn.textContent = t('live.cam'); btn.classList.remove('cam-on'); }
    const note = document.getElementById('live-cam-note');
    if (note) note.hidden = true;
  }

  function camAnalyse() {
    if (!camStream || !camVideo.videoWidth) return;
    const c2 = camCanvas.getContext('2d', { willReadFrequently: true });
    c2.drawImage(camVideo, 0, 0, 32, 24);
    const data = c2.getImageData(0, 0, 32, 24).data;
    let lum = 0, motion = 0, mx = 0, mcount = 0;
    for (let i = 0; i < data.length; i += 4) {
      const l = (data[i] + data[i + 1] + data[i + 2]) / 3;
      lum += l;
      if (camPrev) {
        const d = Math.abs(l - camPrev[i / 4]);
        if (d > 26) { motion++; mx += (i / 4) % 32; mcount++; }
      }
      if (!camPrev) continue;
    }
    const cur = new Float32Array(data.length / 4);
    for (let i = 0; i < data.length; i += 4) cur[i / 4] = (data[i] + data[i + 1] + data[i + 2]) / 3;
    camPrev = cur;
    lum /= (data.length / 4);
    const now = Date.now();

    // peek-a-boo: lens covered then revealed
    if (lum < 26) camDarkFrames++;
    else {
      if (camDarkFrames >= 3 && now - camLastTrigger > 4000) {
        camLastTrigger = now;
        showBubble(trT('PEEKABOO!! I SAW that ♡', 'COUCOU-CACHÉ !! je t\'ai VU ♡'), 2600);
        if (typeof moveSlime === 'function') moveSlime({ action: 'alert', mood: trT('surprised', 'surpris'), duration: 900 });
        burstAtSlime(['✦', '♡'], 6);
        playSparkleSound();
      }
      camDarkFrames = 0;
    }

    // wave: the motion centroid swings left-right-left
    if (mcount > 6) {
      camCentroids.push({ x: mx / mcount, t: now });
      camCentroids = camCentroids.filter((p) => now - p.t < 1400);
      let flips = 0;
      for (let i = 2; i < camCentroids.length; i++) {
        const a = camCentroids[i - 1].x - camCentroids[i - 2].x;
        const b = camCentroids[i].x - camCentroids[i - 1].x;
        if (a * b < 0 && Math.abs(a) > 1.4 && Math.abs(b) > 1.4) flips++;
      }
      if (flips >= 3 && now - camLastTrigger > 4000) {
        camLastTrigger = now;
        camCentroids = [];
        showBubble(trT('!!! you WAVED!! hi hi hi ♡', '!!! tu as fait COUCOU !! salut salut ♡'), 2800);
        if (typeof moveSlime === 'function') moveSlime({ action: 'happy', mood: trT('waving back', 're-coucou'), duration: 900, distance: 0.3 });
        burstAtSlime(['👋', '♥', '✦'], 8);
        playSparkleSound();
        gainFollowers(2);
      }
    }
  }

  const camBtn = document.getElementById('live-cam');
  if (camBtn) {
    camBtn.addEventListener('click', () => {
      if (camStream) { camStop(); return; }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast(trT('camera not available in this browser', 'caméra indisponible dans ce navigateur'));
        return;
      }
      navigator.mediaDevices.getUserMedia({ video: { width: 160, height: 120 }, audio: false }).then((stream) => {
        camStream = stream;
        camVideo.srcObject = stream;
        camVideo.play().catch(() => {});
        camTimer = setInterval(camAnalyse, 140);
        camBtn.setAttribute('aria-pressed', 'true');
        camBtn.textContent = t('live.cam.on');
        camBtn.classList.add('cam-on');
        const note = document.getElementById('live-cam-note');
        if (note) note.hidden = false;
        showBubble(trT('I can see you!! wave at me ♡', 'je te vois !! fais-moi coucou ♡'), 2600);
      }).catch(() => {
        showToast(trT('camera permission declined — no worries ♡', 'permission caméra refusée — pas de souci ♡'));
      });
    });
  }

  function gameWindowVisible() {
    return gWin && !gWin.classList.contains('window-closed') && !gWin.classList.contains('window-minimized');
  }

  if (gCanvas) {
    gCanvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      // preventDefault blocks the automatic focus — take it explicitly so
      // Space talks to the canvas, not to whatever button opened the game.
      // ring-off: gameplay-driven focus shouldn't paint the focus ring
      // (Tab-driven focus still does — the class clears on blur).
      gCanvas.classList.add('ring-off');
      gCanvas.focus({ preventScroll: true });
      if (GAME.event) {
        const r = gCanvas.getBoundingClientRect();
        gEventTap((e.clientX - r.left) * (G_W / r.width), (e.clientY - r.top) * (G_H / r.height));
        return;
      }
      gJump();
    });
    gCanvas.addEventListener('blur', () => gCanvas.classList.remove('ring-on'));
    // the ring lights up ONLY when Tab genuinely lands focus on the canvas
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Tab' && document.activeElement === gCanvas) gCanvas.classList.add('ring-on');
    });
    document.addEventListener('keydown', (e) => {
      if (!gameWindowVisible()) return;
      if (e.target instanceof Element && e.target.closest('input, textarea')) return;
      if (GAME.event) {
        const eventKeys = ['Space', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyY', 'KeyN', 'Digit1', 'Digit2', 'Digit3', 'Escape'];
        if (eventKeys.includes(e.code)) {
          e.preventDefault();
          gEventKey(e.code);
        }
        return;
      }
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') {
        // if focus is still parked on a button (taskbar chip, app button…),
        // Space would "click" it on keyup and minimize the game — defuse it
        const ae = document.activeElement;
        if (ae && ae !== gCanvas && (ae.tagName === 'BUTTON' || ae.tagName === 'A')) {
          ae.blur();
          gCanvas.classList.add('ring-off');
          gCanvas.focus({ preventScroll: true });
        }
        e.preventDefault();
        gJump();
      }
    });
    if (gHiEl) gHiEl.textContent = String(GAME.hi);
    requestAnimationFrame(gTick);
  }

  // offline detection: the slime runner is our dino game
  function setOfflineUI(offline) {
    if (gBanner) gBanner.hidden = !offline;
  }
  window.addEventListener('offline', () => {
    setOfflineUI(true);
    showToast(t('toast.offline'));
    openWindow('win-game');
  });
  window.addEventListener('online', () => {
    setOfflineUI(false);
    showToast(t('toast.online'));
  });

  /* =====================================================
     v3.0 — SLIME HEALTH PROTOCOL (auto-nap, never stay red)
     ===================================================== */
  var autoNapArmed = true;

  function maybeAutoNap() {
    if (pet.energy >= 30 || pet.sleeping || pet.busy || isGrabbing || !autoNapArmed) return;
    autoNapArmed = false;
    setTimeout(() => { autoNapArmed = true; }, 2500);
    sleepSlime();
    showBubble(dynD().autoNap, 2200);
  }

  /* =====================================================
     v3.0 — bonus wiring: slime reactions, AMA food topic
     ===================================================== */
  windowReactions['win-search'] = 'searching?? the top results are all about her, just saying';
  windowReactions['win-game'] = 'that runner slime? my stunt double. we\'re both adorable';

  AMA_TOPICS.push({
    web: true,
    k: ['restaurant', 'food', 'eat', 'hungry', 'dinner', 'lunch', 'boba', 'snack', 'manger', 'restau', '餐厅', '吃什么', '美食', '奶茶', '推荐', 'resto', 'conseiller un resto'],
    a: 'slime\'s totally unbiased restaurant algorithm ♡\n1. anywhere with boba — weight 0.9\n2. hotpot — the distributed system of food: many nodes, one broth\n3. dim sum — microservices, but delicious\n4. a good poutine (she\'s in Alberta, it\'s the law)\ntip: she coordinated 200+ annotators in EN/中文/粤語 — ordering for the table is a solved problem.',
    zh: '史莱姆的公正餐厅推荐算法 ♡\n1. 有奶茶的地方——权重 0.9\n2. 火锅——食物界的分布式系统：节点多，汤底只有一个\n3. 早茶点心——微服务架构，但是好吃\n4. 加拿大 poutine（她在阿尔伯塔，这是法律规定）\n小贴士：她管理过 200+ 中英粤三语标注员——帮全桌点菜属于已解决问题。',
    fr: 'l\'algorithme resto 100 % impartial du slime ♡\n1. partout où il y a du bubble tea — poids 0,9\n2. la fondue chinoise — le système distribué de la gastronomie : plein de nœuds, un seul bouillon\n3. les dim sum — des microservices, mais délicieux\n4. une bonne poutine (elle vit en Alberta, c\'est la loi)\nastuce : elle a coordonné 200+ annotateurs en EN/中文/粤語 — commander pour toute la table est un problème résolu.'
  });

  /* =====================================================
     v3.0 — BOOT SEQUENCE for the new modules
     ===================================================== */
  const storedLang = store.get('yos-lang', null);
  applyLang(storedLang === 'fr' || storedLang === 'en' ? storedLang : detectBrowserLang(), false);
  applyTheme();
  rotateOutfit(false); // first fit of the day
  initFanWall();
  amaBootGreeting();
  termBootBanner();
  chatBootLine();
  renderSearch('');
  updateAddressBar();

  // equipped-item names: marquee instead of "AWS S3/…" truncation
  function initEquipMarquee() {
    document.querySelectorAll('.equip-name').forEach((el) => {
      if (!el.querySelector('.marquee-inner')) {
        const span = document.createElement('span');
        span.className = 'marquee-inner';
        span.textContent = el.textContent;
        el.textContent = '';
        el.appendChild(span);
      }
      const inner = el.querySelector('.marquee-inner');
      const overflow = inner.scrollWidth - el.clientWidth;
      if (overflow > 4) {
        inner.style.setProperty('--marquee-shift', `-${overflow + 6}px`);
        inner.style.animationPlayState = 'running';
      } else {
        inner.style.animation = 'none';
      }
    });
  }
  initEquipMarquee();
  setTimeout(initEquipMarquee, 1800);           // re-measure once pixel fonts land
  window.addEventListener('resize', () => setTimeout(initEquipMarquee, 200));

  if (!navigator.onLine) {
    setOfflineUI(true);
    setTimeout(() => openWindow('win-game', { fromHistory: true }), 2400);
  }
});
