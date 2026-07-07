document.addEventListener('DOMContentLoaded', () => {

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ================= 8-BIT AUDIO SYNTHESIZER (Web Audio API) =================
  let soundEnabled = true;
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended' && !document.hidden && document.hasFocus()) {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // tab away → the whole OS goes silent. tab back → sound returns.
  // nobody gets serenaded by a hidden window.
  function yosAutoMute() {
    const away = document.hidden || !document.hasFocus();
    try {
      if (audioCtx) {
        if (away && audioCtx.state === 'running') audioCtx.suspend();
        else if (!away && audioCtx.state === 'suspended') audioCtx.resume();
      }
    } catch (e) { /* audio is a luxury, not a right */ }
    // HTMLAudio loops (weather ambience) follow the same rule
    try {
      if (typeof wxAudioEl !== 'undefined' && wxAudioEl && wxAudioEl.src) {
        if (away) wxAudioEl.pause();
        else if (typeof liveOpen !== 'undefined' && liveOpen) wxAudioEl.play().catch(() => {});
      }
    } catch (e) { /* silence is fine */ }
  }
  document.addEventListener('visibilitychange', yosAutoMute);
  window.addEventListener('blur', () => setTimeout(yosAutoMute, 40));
  window.addEventListener('focus', () => setTimeout(yosAutoMute, 40));

  function playTone(freq, type, duration, delay = 0, volume = 0.08) {
    if (!soundEnabled) return;
    if (document.hidden || !document.hasFocus()) return; // muted while away
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
  // the boot screen is ALIVE: it shows YOUR saved slime + squad, and
  // booping the slime stalls the boot a little (a soft deadline, not a
  // fixed timer). loaderDecorate() dresses it from localStorage.
  const loader = document.getElementById('loader');
  if (loader) {
    window.__loaderHideAt = Date.now() + 1800;
    setTimeout(() => { try { loaderDecorate(); } catch (e) { /* boots plain, still cute */ } }, 0);
    const loaderTick = setInterval(() => {
      if (Date.now() < window.__loaderHideAt) return;
      clearInterval(loaderTick);
      loader.classList.add('fade-out');
      document.documentElement.classList.remove('is-booting');
      setTimeout(() => playStartupChime(), 100);
      setTimeout(() => {
        loader.style.display = 'none';
      }, 500);
    }, 120);
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
    if (highestZ > 1800) {
      // re-deal the stack: same order, lower numbers — windows must stay
      // below the taskbar (z 2000) no matter how many times they're focused
      const stack = [...document.querySelectorAll('.window')]
        .sort((a, b) => (Number(a.style.zIndex) || 100) - (Number(b.style.zIndex) || 100));
      highestZ = 500;
      stack.forEach((w) => { if (w.style.zIndex) w.style.zIndex = String(++highestZ); });
      highestZ++;
    }
    win.style.zIndex = highestZ;
    windows.forEach(w => w.classList.remove('window-active'));
    win.classList.remove('window-minimized');
    win.classList.add('window-active');
    updateTaskbarAppButtons();
    if (typeof applyPikFloat === 'function') applyPikFloat(); // the squad re-checks its altitude
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
      win.classList.add('window-game-big'); // fills the whole desktop
      // launching the game ends the live show first — otherwise the
      // slime would be stuck on stage and the reaction cam stays empty
      const liveWin = document.getElementById('win-live');
      if (liveWin && !liveWin.classList.contains('window-closed')) closeWindow(liveWin);
      if (typeof gameFitBig === 'function') gameFitBig();
      if (typeof gameConsoleEnter === 'function') gameConsoleEnter(win);
      if (typeof gameMaybeRotate === 'function') gameMaybeRotate(win);
      if (typeof gameCamEnter === 'function') gameCamEnter();
      setTimeout(() => { if (typeof gFitCanvas === 'function') gFitCanvas(); }, 120);
      if (typeof showGameHint === 'function') showGameHint();
      if (typeof dismissGameInvite === 'function') dismissGameInvite();
    }
    if (winId === 'win-interview' && typeof setupInterviewWindow === 'function') {
      setupInterviewWindow();
      // the scheduler is a proper standalone modal: centered, on top
      // of EVERYTHING, with a dimming veil — no more ad soup behind it.
      // The node moves to <body> so no ancestor stacking context can
      // trap it UNDER the veil (the freeze bug of legend).
      if (!win._homeParent) {
        win._homeParent = win.parentNode;
        win._homeNext = win.nextSibling;
      }
      document.body.appendChild(win);
      win.classList.add('window-itv-modal');
      if (!document.getElementById('itv-backdrop')) {
        const veil = document.createElement('div');
        veil.id = 'itv-backdrop';
        veil.className = 'itv-backdrop';
        document.body.appendChild(veil);
      }
      // booking time = sacred time: the run pauses itself and rolls
      // in-house ads so nobody dies mid-calendar
      try {
        if (GAME && GAME.state === 'run') {
          GAME.itvPause = true;
          GAME.adT = 0;
          GAME.adSkit = Math.floor(Math.random() * 4);
        }
      } catch (e) { /* game not booted yet */ }
    }
    if (winId === 'win-live' && typeof liveEnter === 'function') {
      win.classList.add('window-maximized'); // the live room opens big, front and centre
      setTimeout(liveEnter, 120);
    }
    if (winId === 'win-leaderboard' && typeof renderLeaderboard === 'function') renderLeaderboard();
    if (winId === 'win-leaderboard' && typeof renderAchievements === 'function') renderAchievements();
    if (winId === 'win-pikdex' && typeof renderPikdex === 'function') renderPikdex();
    if (winId === 'win-watch' && typeof renderWatchWin === 'function') renderWatchWin();
    if (winId === 'win-album' && typeof renderAlbum === 'function') renderAlbum();
    if (typeof applyPikFloat === 'function') applyPikFloat(); // live/game open → desktop twins tuck away

    // Fresh opens always land inside the CURRENT viewport, sized to fit the
    // space above the sticky taskbar — never guillotined by the bottom bar.
    if (wasClosed && !win.classList.contains('window-maximized') && !win.classList.contains('window-game-big') && window.innerWidth > 640) {
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
    if (win.id === 'win-terminal' && document.body.classList.contains('terminal-only')) {
      // in door mode the shell is the only thing on screen — closing it
      // must never leave a void. leaving the shell = waking the whole OS.
      document.body.classList.remove('terminal-only');
      const g = document.getElementById('matrix-greeter');
      if (g) g.remove();
      if (window.__matrixGreetTimer) { clearInterval(window.__matrixGreetTimer); window.__matrixGreetTimer = null; }
      win.classList.remove('terminal-door-win');
      try { history.replaceState(null, '', location.pathname); } catch (e) { /* hash stays */ }
      showToast(trT('the rest of the OS woke up anyway ♡ (the name still works in the terminal)', 'le reste de l\'OS s\'est réveillé quand même ♡ (le nom marche toujours dans le terminal)'));
    }
    if (win.id === 'win-live' && typeof liveExit === 'function') {
      liveExit();
      // stage recruits + bloom-ups walk home to the desktop with you
      if (typeof deskPikResync === 'function') deskPikResync();
    }
    if (win.id === 'win-interview') {
      win.classList.remove('window-itv-modal');
      if (win._homeParent) win._homeParent.insertBefore(win, win._homeNext || null);
      const veil = document.getElementById('itv-backdrop');
      if (veil) veil.remove();
      try {
        if (GAME && GAME.itvPause) {
          GAME.itvPause = false;
          if (typeof fxInvincible === 'function') fxInvincible(2.5); // gentle re-entry
          if (typeof gToast === 'function') gToast(['▶ resumed!! good luck with the interview ♡', '▶ reprise !! bonne chance pour l\'entretien ♡'], 170);
        }
      } catch (e) { /* game not booted */ }
    }
    if (win.id === 'win-game' && typeof gameCamExit === 'function') gameCamExit();
    if (win.id === 'win-game' && typeof gameUnrotate === 'function') gameUnrotate();
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
    if (typeof applyPikFloat === 'function') applyPikFloat(); // squad altitude re-check
  }

  function minimizeWindow(win) {
    if (win.id === 'win-live' && typeof liveExit === 'function') {
      liveExit();
      if (typeof deskPikResync === 'function') deskPikResync(); // squad walks home
    }
    if (win.id === 'win-game' && typeof gameCamExit === 'function') gameCamExit();
    if (win.id === 'win-game' && typeof gameUnrotate === 'function') gameUnrotate();
    if (win.id === 'win-interview') {
      win.classList.remove('window-itv-modal');
      if (win._homeParent) win._homeParent.insertBefore(win, win._homeNext || null);
      const veil = document.getElementById('itv-backdrop');
      if (veil) veil.remove();
    }
    playCloseSound();
    win.classList.add('window-minimized');
    win.classList.remove('window-active');
    focusTopWindow();
    if (typeof applyPikFloat === 'function') applyPikFloat(); // squad altitude re-check
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

        // clamp: at least 40px of width and the top 48px (the title bar)
        // always stay reachable — no window ever escapes the desk
        const parent = win.offsetParent;
        const pw = parent ? parent.clientWidth : window.innerWidth;
        const ph = parent ? parent.clientHeight : window.innerHeight;
        let nl = initialLeft + (clientX - startX);
        let nt = initialTop + (clientY - startY);
        nl = Math.max(40 - win.offsetWidth, Math.min(nl, pw - 40));
        nt = Math.max(0, Math.min(nt, ph - 48));
        win.style.left = `${nl}px`;
        win.style.top = `${nt}px`;
      }

      function dragEnd() {
        isDragging = false;
      }
    }
  });

  // Desktop folder + quest triggers
  const goLiveBtn = document.getElementById('btn-go-live');
  if (goLiveBtn) goLiveBtn.addEventListener('click', () => openWindow('win-live'));
  const liveTabBtn = document.getElementById('live-tab');
  if (liveTabBtn) liveTabBtn.addEventListener('click', () => openWindow('win-live'));

  // the live tab's title grows with the visitor's story: plucked a
  // pikmin? sent a gift? the tab brags about it (and persists)
  function updateLiveTab() {
    const el = document.getElementById('live-tab-label');
    if (!el) return;
    const pik = store.get('yos-pik-plucked', false);
    const gift = store.get('yos-live-gifted', false);
    const key = pik && gift ? 'live.tab.both' : pik ? 'live.tab.pik' : gift ? 'live.tab.gift' : 'live.tab.base';
    el.dataset.i18n = key; // applyLang re-translates it on language switch
    el.textContent = t(key);
  }
  // (first call happens in the boot sequence — store/t aren't ready yet here)

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
          // the live room sent the pet home on minimize — bring it back on stage
          if (win.id === 'win-live' && typeof liveEnter === 'function') setTimeout(liveEnter, 120);
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
      // phones: the welcome note opens FULL SCREEN — applied HERE, after the
      // classList.remove above, so the cascade can never strip it again
      if (!isDesktop && id === 'win-start-here') win.classList.add('window-maximized');
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
    sprout(ctx) {
      // v3: THE head-plant — hats are retired, every look grows one of
      // the 35 nursery styles instead. seeded once per outfit so all
      // three frames (base/sleep/eat) wear the exact same bloom.
      if (typeof PIK_PLANT_TPLS === 'undefined') { oR(ctx,22,1,2,4,'#4ea564'); oR(ctx,19,0,4,3,'#7ee0a3'); return; }
      const seed = PARTS._plantSeed != null ? PARTS._plantSeed : Math.random();
      const style = PIK_PLANT_TPLS[Math.floor(seed * 9973) % PIK_PLANT_TPLS.length];
      const rows = style[Math.floor(seed * 331) % 3];
      const tint = hueColor(5 + Math.floor(seed * 355));
      const pal = { S: '#57c689', L: '#7ddba4', Y: '#ffd400', P: '#ff8fc7', w: '#ffffff', D: tint.dark, B: tint.body, W: 'rgba(255,255,255,0.6)', e: INK, u: '#ffb3dd' };
      // the same soft halo the pikmin wear, baked in behind the plant
      const glow = ctx.createRadialGradient(253, 38, 8, 253, 38, 96);
      glow.addColorStop(0, 'rgba(255,255,255,0.85)');
      glow.addColorStop(0.45, 'rgba(255,255,255,0.32)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(155, 0, 196, 136);
      // 2× pixel scale, perched ON the crown — pikmin-proud, visible from
      // across the room, stem rooted right in the head apex
      rows.forEach((row, ty) => {
        for (let tx = 0; tx < row.length; tx++) {
          const ch = row[tx];
          if (ch === '.') continue;
          oR(ctx, 11.5 + tx * 2, ty * 2, 2, 2, pal[ch] || pal.S);
        }
      });
    },
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

  // headwear gets drawn 1.45× bigger and extra-saturated so hats actually
  // read as hats from across the room; face/body accessories stay 1:1
  const HEAD_PARTS = new Set([
    'beret', 'cone', 'wizard', 'crown', 'catEars', 'bunnyEars', 'bearEars',
    'halo', 'bow', 'sideBow', 'flower', 'antenna', 'santa',
    'pumpkin', 'gradCap', 'headphones', 'earmuffs', 'cowboy', 'mushroom',
    'strawHat', 'propeller', 'chefHat', 'beanie', 'leafClip', 'snowClip',
    'moonClip', 'starGarland', 'sleepMaskUp'
  ]); // 'sprout' left out on purpose: the head-plant draws 1:1, no hat scaling
  const HAT_SCALE = 1.45;

  function drawOutfitPart(ctx, fn, args) {
    if (HEAD_PARTS.has(fn)) {
      ctx.save();
      // scale from the top-centre of the head so the hat grows outward and
      // down onto the crown instead of clipping off the sheet's top edge
      ctx.translate(23.5 * OB, 0);
      ctx.scale(HAT_SCALE, HAT_SCALE);
      ctx.translate(-23.5 * OB, 0);
      if ('filter' in ctx) ctx.filter = 'saturate(1.5) contrast(1.12)';
      PARTS[fn](ctx, ...args);
      ctx.restore();
    } else {
      PARTS[fn](ctx, ...args);
    }
  }

  // file:// visits taint the canvas, so toDataURL throws. Plan B keeps
  // the wardrobe alive: frames become live canvases and the pet <img>
  // swaps for a <canvas> we repaint directly. Outfits survive anywhere.
  var WARDROBE_CANVAS_MODE = false;
  function frameSnapshot() {
    const c = document.createElement('canvas');
    c.width = 535; c.height = 466;
    c.getContext('2d').drawImage(outfitCanvas, 0, 0);
    return c;
  }
  function frameCapture() {
    if (WARDROBE_CANVAS_MODE) return frameSnapshot();
    try { return outfitCanvas.toDataURL(); }
    catch (e) { WARDROBE_CANVAS_MODE = true; return frameSnapshot(); } // tainted (file://)
  }

  function composeOutfit(outfit) {
    const ctx = outfitCanvas.getContext('2d');
    const frames = {};
    let ok = true;
    PARTS._plantSeed = Math.random(); // one plant per look — no flicker across frames
    ['base', 'sleep', 'eat'].forEach((k) => {
      const im = SLIME_IMGS[k];
      if (!im.complete || !im.naturalWidth) { ok = false; return; }
      ctx.clearRect(0, 0, 535, 466);
      ctx.drawImage(im, 0, 0);
      // hats retired by decree: every look keeps its body accessories but
      // wears a pikmin head-plant instead — one random pick per outfit,
      // shared across all three frames so the plant doesn't flicker
      outfit.parts.filter(([fn]) => !HEAD_PARTS.has(fn))
        .forEach(([fn, ...args]) => { try { drawOutfitPart(ctx, fn, args); } catch (e) { /* an accessory refused to fit */ } });
      try { drawOutfitPart(ctx, 'sprout', []); } catch (e) { /* the nursery was closed */ }
      frames[k] = frameCapture();
      if (k === 'base') {
        drawGrumpy(ctx);
        frames.grumpy = frameCapture();
      }
    });
    return ok ? frames : null;
  }

  function wardrobePool() {
    return (resolvedTheme() === 'dark') ? DARK_OUTFITS : LIGHT_OUTFITS;
  }

  // achievement-limited looks: these hang in the closet until earned
  // (closest stand-ins: propeller cap ≈ goose aviator gear, mushroom
  // cap ≈ storm umbrella, nightcap ≈ certified night owl uniform)
  const OUTFIT_LOCKS = {
    'propeller kid': 'goose', 'dream propeller': 'goose',
    'mushroom cap': 'stormchaser', 'glow mushroom': 'stormchaser',
    'classic nightcap': 'nightowl', 'sleep mask up': 'nightowl'
  };
  function outfitUnlocked(o) {
    const need = OUTFIT_LOCKS[o.n[0]];
    return !need || !!store.get('yos-achv', {})[need];
  }

  function pickOutfit() {
    const pool = wardrobePool();
    const tags = seasonTags();
    const weighted = [];
    pool.forEach((o) => {
      if (o.season && !tags.includes(o.season)) return; // seasonal looks wait their turn
      if (!outfitUnlocked(o)) return; // achievement-limited merch
      const w = o.season ? 4 : 1;
      for (let i = 0; i < w; i++) weighted.push(o);
    });
    let o = weighted[Math.floor(Math.random() * weighted.length)] || pool[0];
    if (currentOutfit && o === currentOutfit && weighted.length > 1) {
      o = weighted[Math.floor(Math.random() * weighted.length)];
    }
    return o;
  }

  function wearOutfit(outfit, announce, tries = 0) {
    let frames = null;
    // toDataURL can throw on tainted canvases (e.g. file:// image loads) —
    // never let a wardrobe hiccup escape into whatever called us
    try { frames = composeOutfit(outfit); } catch (e) { frames = null; tries += 7; }
    if (!frames) {
      if (tries < 21) setTimeout(() => wearOutfit(outfit, announce, tries + 1), 600);
      return; // give up gracefully — the bare base sprite still works
    }
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
  var slimeCanvasEl = null;

  // canvas-mode pet: the <img> hides, a live canvas takes its place
  function petCanvas() {
    if (slimeCanvasEl) return slimeCanvasEl;
    slimeCanvasEl = document.createElement('canvas');
    slimeCanvasEl.width = 535;
    slimeCanvasEl.height = 466;
    slimeCanvasEl.className = 'slime-pet-canvas';
    slimeCanvasEl.setAttribute('aria-hidden', 'true');
    slimeImg.style.display = 'none';
    slimeImg.parentNode.insertBefore(slimeCanvasEl, slimeImg);
    return slimeCanvasEl;
  }

  function setSlimeFrame(name, force) {
    if (!slimeImg) return;
    if (!force && currentFrame === name) return;
    currentFrame = name;
    const f = OUTFIT_FRAMES && OUTFIT_FRAMES[name];
    if (typeof f === 'string') { slimeImg.src = f; return; }
    if (f) { // live-canvas frame (tainted-canvas fallback)
      const cx = petCanvas().getContext('2d');
      cx.clearRect(0, 0, 535, 466);
      cx.drawImage(f, 0, 0);
      return;
    }
    if (!SLIME_SRC[name]) return;
    if (slimeCanvasEl) { // stay in canvas mode: paint the bare sprite
      const im = SLIME_IMGS[name];
      const cx = slimeCanvasEl.getContext('2d');
      cx.clearRect(0, 0, 535, 466);
      if (im && im.complete && im.naturalWidth) cx.drawImage(im, 0, 0);
    } else {
      slimeImg.src = SLIME_SRC[name];
    }
  }

  // theme change = wardrobe change (the pool swaps day/night racks);
  // the stage sky also re-dresses (sun ↔ moon, star chart, cloud tints)
  function setSlimeSkin() {
    rotateOutfit(false);
    setTimeout(() => {
      if (typeof wxDecor === 'function' && typeof wxCurrent !== 'undefined' && wxCurrent && liveOpen) wxDecor(wxCurrent);
    }, 50);
  }

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
    if (slimeMoodText) {
      // while asleep the HUD always shows a sleepy mood, whatever else happens
      slimeMoodText.textContent = pet.sleeping
        ? `😴 ${translateMood('sleeping')} zZz`
        : translateMood(pet.mood);
    }

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
    cloudQueueSync();
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
  function bubbleHide() {
    if (!speechBubble) return;
    speechBubble.classList.remove('show-bubble');
    if (speechBubble._marquee) { clearInterval(speechBubble._marquee); speechBubble._marquee = null; }
    speechBubble._busy = false;
    const q = speechBubble._queued;
    speechBubble._queued = null;
    if (q) showBubble(q.text, q.duration, q.allow); // the waiter takes the mic
  }
  function showBubble(text, duration = 2500, allowWhileAway = false) {
    if (!speechBubble) return;
    // while the slime is in bed (dark mode), only sleep-talk may surface
    if (typeof ghostHidden === 'function' && ghostHidden() && !allowWhileAway) return;
    // a long line that is STILL SCROLLING may not be interrupted: the new
    // line waits in the wings instead (one seat — the latest waiter wins)
    if (speechBubble._busy && speechBubble._marquee && speechBubble.classList.contains('show-bubble')) {
      speechBubble._queued = { text, duration, allow: allowWhileAway };
      return;
    }
    if (speechTimeout) clearTimeout(speechTimeout);
    if (speechBubble._marquee) { clearInterval(speechBubble._marquee); speechBubble._marquee = null; }
    speechBubble._busy = false;
    speechBubble._queued = null; // a direct replacement supersedes any waiter

    speechBubble.textContent = text;
    speechBubble.scrollLeft = 0;
    speechBubble.classList.add('show-bubble');

    // long lines read THEMSELVES: one slow, single pass — and the bubble
    // bows out only when the scroll has ACTUALLY reached the end. (the old
    // clock-based hide drifted under load and cut long lines mid-scroll.)
    requestAnimationFrame(() => {
      if (speechBubble.textContent !== text) return; // a newer line took the mic
      const over = speechBubble.scrollWidth - speechBubble.clientWidth;
      if (over > 8) {
        speechBubble._busy = true;
        const pxPerTick = 0.55;                 // ≈23px/s: an actual reading pace
        const lead = 1400, linger = 1200;
        let pauseUntil = Date.now() + lead;
        // iOS floors fractional scrollLeft (0.55 could read back as 0 forever),
        // so we keep our own float position and only WRITE rounded values
        let pos = 0;
        speechBubble._marquee = setInterval(() => {
          if (Date.now() < pauseUntil) return;
          pos += pxPerTick;
          speechBubble.scrollLeft = Math.round(pos);
          if (pos >= over - 1) { // the TRUE end of the line (tracked, not read back)
            clearInterval(speechBubble._marquee);
            speechBubble._marquee = null;
            if (speechTimeout) clearTimeout(speechTimeout);
            speechTimeout = setTimeout(bubbleHide, linger);
          }
        }, 24);
        // safety net only (hidden tab / stalled timers) — generous, never early
        if (speechTimeout) clearTimeout(speechTimeout);
        speechTimeout = setTimeout(bubbleHide, lead + (over / pxPerTick) * 24 * 2 + linger + 4000);
      } else {
        if (speechTimeout) clearTimeout(speechTimeout);
        speechTimeout = setTimeout(bubbleHide, duration);
      }
    });

    speechTimeout = setTimeout(bubbleHide, duration + 4000); // pre-rAF fallback (hidden tab)
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
    // Asymmetric bounds anchored on the slime's UNTRANSFORMED layout spot
    // (offsetLeft/Top ignore the translate), so the pet can never slip out of
    // the arena — the live stage parks it near the floor, the habitat near the
    // top, and the old symmetric maths let it escape through the closest edge.
    const arena = petArena();
    const m = 4;
    const bl = slimeBody.offsetLeft, bt = slimeBody.offsetTop;
    const bw = slimeBody.offsetWidth || 85, bh = slimeBody.offsetHeight || 75;
    const minX = Math.min(-(bl - m), 0), maxX = Math.max(arena.clientWidth - bw - bl - m, 0);
    // the top ~58px belong to the speech bubble: the pet may wander, but its
    // head-plant must NEVER climb into the bubble's airspace
    const topReserve = 58;
    const minY = Math.min(-(bt - topReserve), 0), maxY = Math.max(arena.clientHeight - bh - bt - m, 0);
    return {
      minX, maxX, minY, maxY,
      // legacy symmetric half-ranges for wander/forage targets
      x: Math.max(12, Math.min(-minX, maxX)),
      y: Math.max(4, Math.min(-minY, maxY))
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
    if (speechBubble) {
      // the speech bubble rides the same offsets so it stays glued to the pet
      speechBubble.style.setProperty('--slime-x', `${slimePosition.x}px`);
      speechBubble.style.setProperty('--slime-y', `${slimePosition.y}px`);
      speechBubble.style.setProperty('--slime-step', `${Math.round(duration)}ms`);
    }
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
      nextX = clamp(slimePosition.x + Math.round((Math.random() - 0.5) * 42 * distance), bounds.minX, bounds.maxX);
      nextY = clamp(slimePosition.y + Math.round((Math.random() - 0.5) * 20 * distance), bounds.minY, bounds.maxY);
      tilt = clamp((nextX - slimePosition.x) / 16, -3, 3);
      actionClass = 'is-forage';
    } else if (action === 'forage') {
      const forageTarget = target || chooseForageTarget(bounds);
      nextX = clamp(Math.round(slimePosition.x + (forageTarget.x - slimePosition.x) * 0.55), bounds.minX, bounds.maxX);
      nextY = clamp(Math.round(slimePosition.y + (forageTarget.y - slimePosition.y) * 0.55), bounds.minY, bounds.maxY);
      tilt = clamp((nextX - slimePosition.x) / 18, -3, 3);
      actionClass = 'is-forage';
    } else if (action === 'goto' && target) {
      nextX = clamp(target.x, bounds.minX, bounds.maxX);
      nextY = clamp(target.y, bounds.minY, bounds.maxY);
      tilt = clamp((nextX - slimePosition.x) / 18, -3, 3);
      actionClass = 'is-follow';
    } else if (action === 'hop' || action === 'happy') {
      nextX = clamp(slimePosition.x + Math.round((Math.random() - 0.5) * 42 * distance), bounds.minX, bounds.maxX);
      nextY = clamp(slimePosition.y + Math.round((Math.random() - 0.5) * 18 * distance), bounds.minY, bounds.maxY);
      scale = action === 'happy' ? 1.04 : 1;
      actionClass = action === 'happy' ? 'is-happy' : 'is-hop';
    } else if (action === 'nap') {
      nextY = clamp(slimePosition.y + 5, bounds.minY, bounds.maxY);
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
    achvUnlock('loveoverflow');
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
      achvUnlock('overstim');
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
    // pointer → offset from the slime's untransformed centre, clamped inside
    // whichever arena it currently lives in (habitat or live stage)
    const rect = petArena().getBoundingClientRect();
    const bounds = getSlimeBounds();
    const baseCx = slimeBody.offsetLeft + (slimeBody.offsetWidth || 85) / 2;
    const baseCy = slimeBody.offsetTop + (slimeBody.offsetHeight || 75) / 2;
    return {
      x: clamp(Math.round(clientX - rect.left - baseCx), bounds.minX, bounds.maxX),
      y: clamp(Math.round(clientY - rect.top - baseCy), bounds.minY, bounds.maxY)
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

    const fedCount = store.get('yos-fed-count', 0) + 1;
    store.set('yos-fed-count', fedCount);
    if (fedCount >= 10) achvUnlock('sugarparent');

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
    moveSlime({ action: 'nap', mood: 'sleeping', phrase: trT('sleep(14000)... zzz', 'sleep(14000)... zzz'), duration: 1400, scheduleNext: false });

    sleepZzzTimer = setInterval(() => {
      const { x, y } = slimeAnchor();
      spawnParticle(x + 18, y - 20, 'z', 'p-zzz');
    }, 900);

    sleepTimer = setTimeout(() => wakeSlime(false), 14700); // a proper nap — 3.5× the old catnap
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
    // hearts are free; fan counts have an 8s cooldown (anti-mash union rule)
    let loveFanAt = 0, loveMash = 0;
    chatLoveBtn.addEventListener('click', () => {
      playSparkleSound();
      const msg = document.createElement('div');
      msg.className = 'chat-msg chat-self';
      msg.textContent = 'you: ♡♡♡♡♡';
      appendChatMessage(msg);
      const now = Date.now();
      if (now - loveFanAt > 8000) {
        loveFanAt = now;
        loveMash = 0;
        gainFollowers(1);
        if (!pet.sleeping && !pet.busy) {
          showBubble(trT('chat is sending love!! ♡', 'le chat envoie de l\'amour !! ♡'), 2000);
          moveSlime({ action: 'happy', mood: 'adored', duration: 700, distance: 0.2 });
        }
      } else if (!pet.sleeping && !pet.busy) {
        loveMash++;
        const lines = [
          ['one heart at a time, chat ♡', 'un cœur à la fois, le chat ♡'],
          ['the love meter needs a lil breather', 'le compteur d\'amour reprend son souffle'],
          ['I FEEL it. counting resumes in a sec ♡', 'je le SENS. le comptage reprend dans une seconde ♡']
        ][Math.min(loveMash - 1, 2)];
        showBubble(trT(lines[0], lines[1]), 1800);
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
      zh: '嗨嗨！！♡ 我是 yongshan 的史莱姆，她的简历都存在我的果冻里～ 问我技能、Druid、她建的 LMS，什么都行！',
      fr: 'coucou !! ♡ je suis le slime de Yongshan — son CV vit dans ma gelée. Demandez-moi ses compétences, Druid, le LMS qu\'elle a construit… tout ce que vous voulez !'
    },
    {
      k: ['who are you', 'who is', 'about her', 'about yongshan', 'about me', 'about_me', 'introduce', 'intro', 'summary', 'bio', '介绍', '她是谁', '是谁', '简历', 'qui est-elle', 'qui es-tu', 'c\'est qui'],
      a: 'Yongshan Yu — Systems/LMS & Full-Stack Lead + AI/Data practitioner, 3+ years across platform engineering, data science and MLOps.\nWhat that means in practice: she takes things ALL the way to production — cloud-native stacks on AWS/Azure, hardened security (TLS/HSTS, UFW/Fail2ban, least-privilege IAM), and SRE automation: backups, disaster recovery, auto-heal, observability.\nThis site is her proof of craft: hand-written HTML/CSS/JS, a window manager, an 8-bit synth, and me. Zero frameworks.',
      zh: 'yongshan——Systems/LMS 全栈负责人 + AI/数据工程师，3 年+ 横跨平台工程、数据科学和 MLOps。\n落到实处就是：她能把东西真正推到生产环境——AWS/Azure 云原生架构、安全加固（TLS/HSTS、UFW/Fail2ban、最小权限 IAM）、SRE 自动化：备份、容灾、故障自愈、可观测性。\n这个网站就是她的手艺证明：纯手写 HTML/CSS/JS、窗口管理器、8-bit 合成器，还有我。零框架。',
      fr: 'Yongshan Yu — Lead Systèmes/LMS & Full-Stack + praticienne IA/Data, 3 ans et plus en ingénierie de plateforme, data science et MLOps.\nConcrètement : elle amène les projets JUSQU\'EN production — stacks cloud natives AWS/Azure, sécurité durcie (TLS/HSTS, UFW/Fail2ban, IAM au moindre privilège) et automatisation SRE : sauvegardes, reprise après sinistre, auto-réparation, observabilité.\nCe site est sa preuve de savoir-faire : HTML/CSS/JS écrits à la main, un gestionnaire de fenêtres, un synthé 8-bit, et moi. Zéro framework.'
    },
    {
      k: ['skill', 'skills', 'stack', 'tech stack', 'tech', 'technology', 'technologies', 'programming', 'code', '技能', '技术栈', '会什么', '编程', 'compétence', 'compétences'],
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
      zh: '史莱姆不谈薪资！！这种事归你和她的邮箱管：yuyongshan573@gmail.com ♡',
      fr: 'Un slime ne négocie pas les salaires !! C\'est entre vous et sa boîte mail : yuyongshan573@gmail.com ♡'
    },
    {
      k: ['resume', 'cv', 'curriculum'],
      a: 'The full quest log is in career_quest.exe — open it from the desktop, or type `resume` in the terminal! (spoiler: 3+ years, a production LMS, 47 merged agent PRs.)',
      zh: '完整履历都在 career_quest.exe 里——双击桌面图标打开，或者在终端输入 `resume`！（剧透：3 年+ 经验、生产级 LMS、47 个合并的智能体 PR。）',
      fr: 'Le journal de quêtes complet vit dans career_quest.exe — ouvrez-le depuis le bureau, ou tapez `resume` dans le terminal ! (spoiler : 3+ ans, un LMS en production, 47 PR d\'agents fusionnées.)'
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
      featured: ['What is she best at?', 'What is Druid?', 'Is she open to work?', 'Recommend a restaurant!!'],
      pool: ['What is she best at?', 'What is Druid?', 'What\'s her tech stack?', 'Tell me about the LMS', 'Is she open to work?', '她会说中文吗？', 'Who built this site?', 'Research highlights?', 'How do I contact her?', 'Recommend a restaurant!!', '推荐个餐厅吧！']
    },
    fr: {
      featured: ['Ses points forts ?', 'C\'est quoi Druid ?', 'Est-elle disponible ?', 'Un resto à conseiller ?'],
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
  let amaFanAt = 0; // fans grow at most once per 30s — no farming the bot

  function amaAsk(question) {
    try { achvBump('asks'); } catch (e) { /* pre-achv boot */ }
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
      if (Date.now() - amaFanAt > 30000) {
        amaFanAt = Date.now();
        gainFollowers(1);
      }
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

  var termCapture = null; // when a pipeline runs, stdout lines pool here instead of the DOM
  function termLine(text = '', cls = '') {
    if (termCapture) { termCapture.push(String(text)); return; }
    if (!termOut) return;
    const el = document.createElement('span');
    el.className = `t-line ${cls}`.trim();
    el.textContent = text;
    termOut.appendChild(el);
    // scrollback budget: 350 lines, the oldest quietly retire
    while (termOut.children.length > 350) termOut.removeChild(termOut.firstChild);
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
    while (termOut.children.length > 350) termOut.removeChild(termOut.firstChild);
    termOut.scrollTop = termOut.scrollHeight;
  }

  const GITHUB_FALLBACK_REPOS = [
    ['druid-agentic-engineering-os', 'Engineering OS for repo risk discovery and test-backed PR generation'],
    ['yyswhsccc', 'GitHub profile — Druid docs, RustChain PR stats, ARC LMS notes']
  ];

  async function termCmdRepos() {
    termLine('fetching api.github.com/users/yyswhsccc …', 't-dim');
    // 8s deadline — "fetching…" is a status line, not a lifestyle
    const ctl = new AbortController();
    const deadline = setTimeout(() => ctl.abort(), 8000);
    try {
      const [userRes, repoRes] = await Promise.all([
        fetch('https://api.github.com/users/yyswhsccc', { signal: ctl.signal }),
        fetch('https://api.github.com/users/yyswhsccc/repos?per_page=100&sort=updated', { signal: ctl.signal })
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
    } catch (e) {
      const timedOut = e && e.name === 'AbortError';
      termLine(timedOut
        ? trT('✘ GitHub took longer than 8s — giving up politely. cached copy:', '✘ GitHub a dépassé 8 s — on abandonne poliment. copie en cache :')
        : '✘ GitHub API unreachable (rate limit?) — cached copy:', 't-err');
      GITHUB_FALLBACK_REPOS.forEach(([n, d]) => termLine(`  ${n} — ${d}`, 't-accent'));
      termLink('  ↗ github.com/yyswhsccc', 'https://github.com/yyswhsccc');
    } finally {
      clearTimeout(deadline);
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
    'pikdex.exe': 'win-pikdex',
    'terminal.exe': 'win-terminal'
  };

  const TERM_OPEN_MAP = {
    career: 'win-career', quest: 'win-career',
    skills: 'win-skills', inventory: 'win-skills',
    chat: 'win-chat', stream: 'win-chat',
    ama: 'win-ama', ask: 'win-ama', about: 'win-ama',
    game: 'win-game', run: 'win-game',
    lb: 'win-leaderboard', top: 'win-leaderboard', hall: 'win-leaderboard',
    pikdex: 'win-pikdex', dex: 'win-pikdex', pikmin: 'win-pikdex',
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
      termLine(trT('SQUAD     squad (parade!) · pikmin · weather · fortune · slimesay <text>', 'ESCOUADE  squad (parade !) · pikmin · weather · fortune · slimesay <texte>'));
      termLine(trT('4TH WALL  say <text> · title <text> · notify <text> · copy <text> · fullscreen · boss · reboot · battery · screen · vibrate · invert · flip · gravity', '4E MUR    say <texte> · title <texte> · notify <texte> · copy <texte> · fullscreen · boss · reboot · battery · screen · vibrate · invert · flip · gravity'));
      termLine(trT('SHELL     pipes work: `help | grep pet` · `fortune | say` — and Tab completes commands', 'SHELL     les tuyaux marchent : `help | grep pet` · `fortune | say` — et Tab complète les commandes'), 't-dim');
      termLine(trT('EDITORS   vim (enter at your own risk) · nano · emacs', 'ÉDITEURS  vim (entrez à vos risques) · nano · emacs'));
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
    druid() { termCatFile('druid.log'); },

    /* ---------- dispatch centre v2: the shell runs the WHOLE show ---------- */
    fortune() {
      const j = LOADER_JOKES[Math.floor(Math.random() * LOADER_JOKES.length)];
      termLine(trT(j[0], j[1]), 't-accent');
    },
    date() { termLine(new Date().toString(), 't-ok'); },
    cal() {
      const now = new Date();
      const y = now.getFullYear(), m = now.getMonth();
      termLine(`     ${now.toLocaleString(yosLang === 'fr' ? 'fr' : 'en', { month: 'long' })} ${y}`, 't-accent');
      termLine('Su Mo Tu We Th Fr Sa', 't-dim');
      const first = new Date(y, m, 1).getDay();
      const days = new Date(y, m + 1, 0).getDate();
      let line = '   '.repeat(first);
      for (let d = 1; d <= days; d++) {
        line += (d === now.getDate() ? `♥${String(d).padStart(1)}` : String(d).padStart(2)) + ' ';
        if ((first + d) % 7 === 0) { termLine(line, 't-ok'); line = ''; }
      }
      if (line.trim()) termLine(line, 't-ok');
    },
    df() {
      termLine('Filesystem      Size  Used Avail Use%', 't-dim');
      termLine('/dev/heart      100G  100G     0 100%  ♡', 't-ok');
      termLine('/dev/pixels      64K   62K    2K  97%  /desktop', 't-ok');
      termLine('/dev/frameworks    0     0     0    -  (none. as always.)', 't-accent');
    },
    free() {
      termLine('              total   used   free', 't-dim');
      termLine(trT('Mem:           1 heart  1 heart  0 (it\'s yours now)', 'Mém :          1 cœur  1 cœur  0 (il est à vous)'), 't-ok');
      termLine(trT('Swap:          0 (this OS never swaps you for anyone)', 'Swap :         0 (cet OS ne vous échange contre personne)'), 't-accent');
    },
    uname() { termLine('YongshanOS 3.0-pixel #1 SMP PREEMPT_CUTE aarch♡ GNU/slime', 't-ok'); },
    sl() {
      // you typed ls wrong. enjoy the slime express.
      const train = ['   ____', ' _|[]|_.____', '(  SLIME  |_|', ' `-00--00-\'♡'];
      train.forEach((l) => termLine(l, 't-accent'));
      termLine(trT('(the slime express only stops for people who type `ls` correctly)', '(le slime express ne s\'arrête que pour ceux qui tapent `ls` correctement)'), 't-dim');
      if (typeof pikParade === 'function') pikParade(); // the passengers wave
    },
    fullscreen() {
      if (typeof dotFullscreen === 'function') { dotFullscreen(); termLine(trT('⛶ toggling fullscreen — the browser chrome bows out', '⛶ bascule plein écran — le chrome du navigateur s\'efface'), 't-ok'); }
      else termLine(trT('fullscreen: the green dot does this too ♡', 'fullscreen : le point vert fait pareil ♡'), 't-dim');
    },
    boss() {
      if (typeof dotTuckToggle === 'function') { dotTuckToggle(); termLine(trT('🗂 boss key engaged — everything tucked (run it again to restore)', '🗂 touche patron — tout est rangé (relancez pour restaurer)'), 't-ok'); }
      else termLine(trT('boss: press the yellow dot ♡', 'boss : appuyez sur le point jaune ♡'), 't-dim');
    },
    bsod() {
      if (typeof bsodShow === 'function') { termLine(trT('☠ deploying the pink screen of death. any key revives.', '☠ déploiement de l\'écran rose de la mort. toute touche ranime.'), 't-err'); setTimeout(bsodShow, 400); }
      else termLine(trT('bsod: press the red dot if you dare', 'bsod : le point rouge, si vous osez'), 't-dim');
    },
    reboot() {
      termLine(trT('rebooting YongshanOS… your save is safe. see you in 2 seconds ♡', 'redémarrage de YongshanOS… votre sauvegarde est en lieu sûr. à dans 2 secondes ♡'), 't-accent');
      document.body.classList.add('crt-off');
      setTimeout(() => location.reload(), 1200);
    },
    shutdown() {
      termLine(trT('this OS refuses to shut down while a slime lives in it.', 'cet OS refuse de s\'éteindre tant qu\'un slime y habite.'), 't-err');
      termLine(trT('(try `reboot` — or the red dot for drama)', '(essayez `reboot` — ou le point rouge pour le drame)'), 't-dim');
    },
    battery() {
      if (!navigator.getBattery) { termLine(trT('battery: this browser keeps its charge level private. respect.', 'battery : ce navigateur garde son niveau de charge privé. respect.'), 't-dim'); return; }
      navigator.getBattery().then((b) => {
        const pct = Math.round(b.level * 100);
        termLine(`🔋 ${pct}% ${b.charging ? trT('(charging — the wall feeds you)', '(en charge — la prise vous nourrit)') : ''}`, 't-ok');
        termLine(trT(pct < 20 ? 'the Low Batt pikmin sends solidarity.' : 'plenty of juice for one more run of slime_run.exe.', pct < 20 ? 'le pikmin Batterie Faible envoie sa solidarité.' : 'assez de jus pour une partie de slime_run.exe.'), 't-dim');
      }).catch(() => termLine('battery: unreadable — assume 100% cute', 't-dim'));
    },
    net() {
      const c = navigator.connection;
      termLine(`online: ${navigator.onLine ? 'yes ♡' : 'no (offline mode is still cute)'}`, 't-ok');
      if (c && c.effectiveType) termLine(`link:   ~${c.effectiveType}${c.rtt ? ' · rtt ' + c.rtt + 'ms' : ''} (the Signal pikmin approves)`, 't-dim');
    },
    screen() {
      termLine(`viewport: ${window.innerWidth}×${window.innerHeight} @ ${window.devicePixelRatio}x`, 't-ok');
      termLine(trT(`scheme: ${matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-leaning' : 'light-leaning'} · motion: ${REDUCED_MOTION ? 'reduced (respected ♡)' : 'full'}`, `schéma : ${matchMedia('(prefers-color-scheme: dark)').matches ? 'plutôt sombre' : 'plutôt clair'} · animations : ${REDUCED_MOTION ? 'réduites (respectées ♡)' : 'complètes'}`), 't-dim');
    },
    weather() {
      if (typeof wxCurrent !== 'undefined' && wxCurrent && wxCurrent.k) {
        termLine(trT(`Edmonton right now: ${wxCurrent.k} — the live stage is wearing it`, `Edmonton en ce moment : ${wxCurrent.k} — la scène live l'a déjà enfilé`), 't-ok');
      } else {
        termLine(trT('the sky is still buffering — open slime_live.exe to wake the forecast', 'le ciel charge encore — ouvrez slime_live.exe pour réveiller la météo'), 't-dim');
      }
    },
    squad() {
      const dex = pikdexGet();
      const actives = pikdexActives(dex);
      if (!dex.length) termLine(trT('no pikmin yet — but watch this…', 'aucun pikmin — mais regardez ça…'), 't-dim');
      else {
        termLine(trT(`SQUAD ROSTER (${actives.length}/${PIK_MAX} on duty · ${dex.filter((p) => !p.ch).length}/${PIKDEX_CAP} collected)`, `ESCOUADE (${actives.length}/${PIK_MAX} en service · ${dex.filter((p) => !p.ch).length}/${PIKDEX_CAP} au total)`), 't-accent');
        actives.slice(0, PIK_MAX).forEach((p) => {
          const ix = dex.indexOf(p);
          const sp = p.sp ? pikSpecies(p.sp) : null;
          termLine(`  ${sp ? sp.hat : '🌱'} ${pikNameOf(dex, ix)}.pik  ${['sprout', 'bud', 'BLOOM'][Math.min(p.s || 0, 2)]}${p.loan ? trT('  (loaner!)', '  (prêt !)') : ''}`, 't-ok');
        });
      }
      if (typeof pikParade === 'function') pikParade();
      termLine(trT('→ full dossiers in pikdex.exe', '→ dossiers complets dans pikdex.exe'), 't-dim');
    },
    vim() {
      termVimActive = true;
      const promptEl = document.querySelector('.term-prompt');
      if (promptEl) { promptEl.dataset.old = promptEl.textContent; promptEl.textContent = '-- INSERT --'; }
      termLine('VIM - Vi IMproved ~ version ♡.∞', 't-accent');
      termLine(trT('you are now inside vim. yes, really. good luck.', 'vous êtes maintenant dans vim. oui, vraiment. bonne chance.'), 't-dim');
      termLine(trT('(the ancients speak of an exit rune…)', '(les anciens parlent d\'une rune de sortie…)'), 't-dim');
    },
    vi() { TERM_COMMANDS.vim(); },
    emacs() { termLine(trT('emacs: a fine operating system. this OS already has one. try `vim` (bring snacks).', 'emacs : un bel OS. celui-ci en a déjà un. essayez `vim` (prévoyez des snacks).'), 't-dim'); },
    nano() { termLine(trT('nano: opens instantly, exits honestly. the hero we don\'t deserve.', 'nano : s\'ouvre direct, se ferme honnêtement. le héros qu\'on ne mérite pas.'), 't-ok'); },
    hack() {
      const lines = ['> initializing l33t mode…', '> bypassing mainframe (pink)…', '> downloading the heart folder…', '> ACCESS GRANTED ♡'];
      lines.forEach((l, i) => setTimeout(() => termLine(l, i === 3 ? 't-ok' : 't-accent'), i * 420));
      setTimeout(() => termLine(trT('just kidding. the only thing hacked here is my sleep schedule.', 'je plaisante. la seule chose piratée ici, c\'est mon sommeil.'), 't-dim'), 2000);
    },
    invert() {
      document.documentElement.style.filter = 'invert(1) hue-rotate(180deg)';
      termLine(trT('🙃 reality inverted for 8 seconds. blink twice if you like it.', '🙃 réalité inversée pendant 8 secondes. clignez deux fois si ça vous plaît.'), 't-ok');
      setTimeout(() => { document.documentElement.style.filter = ''; }, 8000);
    },
    flip() {
      document.documentElement.style.transition = 'transform 0.8s';
      document.documentElement.style.transform = 'rotate(180deg)';
      termLine(trT('🙃 australia mode. 6 seconds.', '🙃 mode australie. 6 secondes.'), 't-ok');
      setTimeout(() => { document.documentElement.style.transform = ''; setTimeout(() => { document.documentElement.style.transition = ''; }, 900); }, 6000);
    },
    gravity() {
      const wins = [...document.querySelectorAll('.window')].filter((w) => !w.classList.contains('window-closed') && !w.classList.contains('window-minimized'));
      if (!wins.length) { termLine(trT('gravity: nothing to drop — open some windows first', 'gravity : rien à faire tomber — ouvrez des fenêtres'), 't-dim'); return; }
      wins.forEach((w) => { w.style.transition = 'transform 0.9s cubic-bezier(0.5, 0, 1, 1)'; w.style.transform = 'translateY(120vh) rotate(6deg)'; });
      termLine(trT(`🍎 newton mode: ${wins.length} window(s) dropped. restoring in 3s…`, `🍎 mode newton : ${wins.length} fenêtre(s) au sol. restauration dans 3 s…`), 't-ok');
      setTimeout(() => { wins.forEach((w) => { w.style.transform = ''; setTimeout(() => { w.style.transition = ''; }, 1000); }); }, 3000);
    }
  };
  TERM_COMMANDS.pikmin = TERM_COMMANDS.squad;
  TERM_COMMANDS.piks = TERM_COMMANDS.squad;
  TERM_COMMANDS.online = TERM_COMMANDS.net;
  var termVimActive = false;
  function termVimHandle(input) {
    termLine(input, 't-dim');
    const s = input.trim();
    if (s === ':q!' || s === ':wq' || s === ':x' || s === 'ZZ') {
      termVimActive = false;
      const promptEl = document.querySelector('.term-prompt');
      if (promptEl && promptEl.dataset.old) promptEl.textContent = promptEl.dataset.old;
      termLine(trT('you ESCAPED vim. the shell erects a statue in your honour.', 'vous êtes SORTI·E de vim. le shell vous érige une statue.'), 't-ok');
      achvUnlock('vimescape');
      if (typeof pikParade === 'function') pikParade(); // the squad celebrates survivors
    } else if (s === ':q') {
      termLine('E37: No write since last change (add ! to override)', 't-err');
    } else if (s === ':help' || s === 'help') {
      termLine(trT('there is no help inside vim. only the exit rune: `:q!`', 'aucune aide dans vim. seulement la rune de sortie : `:q!`'), 't-dim');
    } else {
      termLine(trT('-- INSERT -- (psst: the exit rune is `:q!`)', '-- INSERT -- (psst : la rune de sortie est `:q!`)'), 't-dim');
    }
  }

  const TERM_MAN = {
    ask: ['ask <question> — pipes your question into slime_bot (the AMA engine) and prints the answer here.', 'ask <question> — envoie votre question à slime_bot (le moteur AMA) et affiche la réponse ici.'],
    ps: ['ps — lists every running window plus the pet daemon. pair with `kill <name>`.', 'ps — liste chaque fenêtre ouverte plus le démon du familier. à combiner avec `kill <nom>`.'],
    kill: ['kill <app> — closes a window, e.g. `kill chat`. the slime is unkillable.', 'kill <app> — ferme une fenêtre, ex. `kill chat`. le slime est intuable.'],
    theme: ['theme <light|dark> — switches the OS palette (and the slime’s outfit).', 'theme <light|dark> — change la palette de l’OS (et la tenue du slime).'],
    like: ['like — registers a ♥ on the shared fan wall (Abacus counter, visible to every visitor).', 'like — ajoute un ♥ sur le mur partagé (compteur Abacus, visible par tous).'],
    search: ['search <query> — opens yongle_search with your query.', 'search <requête> — ouvre yongle_search avec votre requête.'],
    repos: ['repos — fetches yongshan’s repositories live from the GitHub API.', 'repos — récupère en direct les dépôts de yongshan via l’API GitHub.']
  };

  /* =====================================================
     THE 100 SECRET CODES — StarCraft-style, never listed.
     Each entry: [reply-EN, reply-FR, fx-key]. Effects range
     from next-run game cheats to geese on demand. `hint`
     drops cryptic clues; `cheats` counts your finds.
     ===================================================== */
  function cheatFall(chars, n) {
    // confetti budget: never more than 200 falling glyphs alive at once
    const alive = document.querySelectorAll('.cheat-fall').length;
    n = Math.max(0, Math.min(n, 200 - alive));
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'cheat-fall';
      s.textContent = chars[i % chars.length];
      s.style.left = Math.random() * 96 + 'vw';
      s.style.animationDuration = (2.2 + Math.random() * 2) + 's';
      s.style.animationDelay = (Math.random() * 0.9) + 's';
      s.setAttribute('aria-hidden', 'true');
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 5200);
    }
  }
  function cheatZerg() {
    for (let i = 0; i < 12; i++) {
      const s = document.createElement('span');
      s.className = 'cheat-bug';
      s.textContent = '🐛';
      s.style.bottom = (54 + Math.random() * 40) + 'px';
      s.style.animationDuration = (3 + Math.random() * 3) + 's';
      s.style.animationDelay = (Math.random() * 1.4) + 's';
      s.setAttribute('aria-hidden', 'true');
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 8000);
    }
  }
  function cheatBarrel() {
    document.body.classList.add('barrel-roll');
    setTimeout(() => document.body.classList.remove('barrel-roll'), 1700);
  }
  function cheatMatrix() {
    const glyphs = 'ｱｲｳｴｵｶｷｸｹｺ01♥✦ﾈﾎﾏﾑ';
    for (let i = 0; i < 10; i++) {
      let ln = '';
      for (let k = 0; k < 34; k++) ln += glyphs[Math.floor(Math.random() * glyphs.length)];
      termLine(ln, 't-accent');
    }
    termLine(trT('…there is no spoon. only slime.', '…il n\'y a pas de cuillère. seulement du slime.'), 't-dim');
  }
  function cheatWx(k) {
    store.set('yos-wx', { t: Date.now(), k });
    applyWx(k);
    if (document.getElementById('win-live').classList.contains('window-closed')) {
      termLine(trT('(the sky changed. open slime_live.exe to see it)', '(le ciel a changé. ouvre slime_live.exe pour le voir)'), 't-dim');
    }
  }
  var honkLive = 0; // concurrent goose honks in flight
  function cheatFx(key) {
    const pend = (k) => { store.set('yos-cheat-next', k); termLine(trT('…armed for your NEXT run of slime_run.exe ♡', '…armé pour ta PROCHAINE run de slime_run.exe ♡'), 't-dim'); };
    switch (key) {
      // pending run-buffs still throw a party RIGHT NOW
      case 'god': pend('god'); cheatFall(['😇', '✨', '♡'], 30); if (!pet.sleeping) showBubble(trT('divine i-frames queued ♡', 'i-frames divines en file ♡'), 2400); break;
      case 'fast': pend('fast'); cheatFall(['💨', '⚡'], 24); break;
      case 'fever': pend('fever'); cheatFall(['🌈', '⭐', '♥'], 34); break;
      case 'big': pend('big'); cheatFall(['🍰', '🧁'], 20); if (!pet.sleeping) showBubble(trT('CHONK loading…', 'CHONK en chargement…'), 2200); break;
      case 'tiny': pend('tiny'); cheatFall(['🫧'], 18); break;
      case 'float': pend('float'); cheatFall(['🎈', '☁️'], 22); break;
      case 'luck': pend('luck'); cheatFall(['🍀', '⭐'], 26); break;
      case 'boss': pend('boss'); playGlitchSound(); cheatFall(['💀', '⚠️'], 20); break;
      case 'life': pend('life'); cheatFall(['💖', '♥'], 26); break;
      case 'rich5': pend('rich5'); cheatFall(['🪙'], 26); break;
      case 'rich20': pend('rich20'); cheatFall(['🪙', '💰'], 50); break;
      case 'rich50': pend('rich50'); cheatFall(['🪙', '💰', '💎'], 84); if (!pet.sleeping) showBubble(trT("*muffled, from under the coins* I'm RICH!!", '*étouffé, sous les pièces* je suis RICHE !!'), 2600); break;
      case 'muffin': gPendingBoost = true; termLine(trT('…a hype bonus waits at the start line ♡', '…un bonus hype attend sur la ligne de départ ♡'), 't-dim'); break;
      case 'hearts': cheatFall(['♥', '♡', '✦'], 22); break;
      case 'konami': cheatFall(['♥', '🌈', '⭐'], 26); gainFollowers(10); playFanfare(); break;
      case 'barrel': cheatBarrel(); achvUnlock('barrel'); break;
      case 'zerg': cheatZerg(); achvUnlock('zergling'); break;
      case 'matrix': cheatMatrix(); achvUnlock('neo'); break;
      case 'wxsnow': cheatWx('snow'); break;
      case 'wxrain': cheatWx('rain'); break;
      case 'wxsun': cheatWx('clear'); break;
      case 'wxthunder': cheatWx('thunder'); break;
      case 'wxfog': cheatWx('fog'); break;
      case 'rainmoney': cheatWx('rain'); pend('rich5'); break;
      case 'geese': openWindow('win-live'); achvUnlock('goose'); setTimeout(() => { if (typeof spawnGeese === 'function') spawnGeese(); }, 1300); break;
      case 'yongshanfx': // her name is a spell — the whole squad answers it
        if (typeof pikParade === 'function') pikParade();
        achvUnlock('truefan');
        gainFollowers(5);
        store.set('yos-pending-coins', store.get('yos-pending-coins', 0) + 15);
        termLine(trT('💰 +15 coins armed for your next run · +5 fans · the squad is SO proud', '💰 +15 pièces armées pour ta prochaine partie · +5 fans · l\'escouade est TROP fière'), 't-ok');
        break;
      case 'nihaofx': // 你好 — a greeting the whole meadow understands
        if (typeof pikParade === 'function') pikParade();
        achvUnlock('nihao');
        gainFollowers(5);
        store.set('yos-pending-coins', store.get('yos-pending-coins', 0) + 12);
        termLine(trT('💰 +12 coins armed for your next run · +5 fans · 你好你好!!', '💰 +12 pièces armées pour ta prochaine partie · +5 fans · 你好你好 !!'), 't-ok');
        break;
      case 'pikmin': openWindow('win-live'); setTimeout(() => { for (let i = 0; i < 3; i++) gardenSpawnSprout(); }, 1100); break;
      case 'boba': feedSlime(); break;
      case 'nap': sleepSlime(); break;
      case 'wake': if (typeof playWithSlime === 'function') playWithSlime(); break;
      case 'fit': rotateOutfit(true); break;
      case 'grumpy': setSlimeFrame('grumpy', true); setTimeout(() => setSlimeFrame('base', true), 2600); break;
      case 'spooky': showBubble(trT('boo!! (did I scare you? be honest)', 'bouh !! (je t\'ai fait peur ? sois honnête)'), 2400); playGlitchSound(); break;
      case 'fans5': gainFollowers(5); break;
      case 'fans25': gainFollowers(25); playFanfare(); break;
      case 'fanfare': playFanfare(); break;
      case 'honk': {
        // the `honk` spell is a purist: ALWAYS jasonlee's honk. no lottery.
        // (max 3 honks in flight — this is a stream, not an airport)
        if (soundEnabled && !document.hidden && document.hasFocus() && honkLive < 3) {
          honkLive++;
          const hk = new Audio('assets/goose_c.mp3');
          hk.volume = (resolvedTheme() === 'dark') ? 0.08 : 0.55;
          const honkDone = () => { honkLive = Math.max(0, honkLive - 1); };
          hk.addEventListener('ended', honkDone);
          hk.addEventListener('error', honkDone);
          hk.play().catch(honkDone);
        }
        break;
      }
      case 'meow': playTone(880, 'sine', 0.12, 0, 0.04); playTone(660, 'sine', 0.16, 0.1, 0.04); break;
      case 'loop': for (let i = 0; i < 3; i++) termLine(trT('while (cute) { keep_running(); }', 'while (mignon) { continue_de_courir(); }'), 't-dim'); break;
      case 'credits': ['YONGSHAN OS — a hand-built production', 'starring: one (1) slime', 'pikmin wrangling: the garden dept.', 'weather: Edmonton, unpaid intern', 'goose vocals: SoundBible, the Pixabay community & xeno-canto XC388771/XC62259/XC178135 (CC BY-SA 3.0). honks are real.', 'frameworks used: zero. as always.'].forEach((l, i) => setTimeout(() => termLine(l, i ? 't-dim' : 't-accent'), i * 260)); break;
      default: playTone(990, 'triangle', 0.08, 0, 0.03);
    }
  }

  const TERM_CHEATS = {
    /* — north-american politics, lovingly bipartisan, 35 gags — */
    'build the wall':        ['🧱 a wall of pink pixels rises. the bugs simply jump over it. +stars anyway.', '🧱 un mur de pixels roses s\'élève. les bugs sautent par-dessus. +étoiles quand même.', 'hearts'],
    'drain the swamp':       ['🚿 swamp drained. found: 3 lobbyists, 1 boba straw, your luck buff.', '🚿 marais vidé. trouvé : 3 lobbyistes, 1 paille à boba, ton buff de chance.', 'luck'],
    'make slimes great again':['🧢 slimes were always great. free fans for the rally.', '🧢 les slimes ont toujours été super. fans gratuits pour le meeting.', 'fans25'],
    'yes we can':            ['🌅 hope-based buff dispensed. si se puede, lil jelly.', '🌅 buff à base d\'espoir distribué. si se puede, petit slime.', 'fever'],
    'i approve this message':['📢 this cheat was paid for by the Committee To Re-Elect The Slime.', '📢 ce code est financé par le Comité pour la Réélection du Slime.', 'fanfare'],
    'filibuster':            ['🗣 the slime begins reading the dictionary aloud. time slows. so do you.', '🗣 le slime lit le dictionnaire à voix haute. le temps ralentit. toi aussi.', 'tiny'],
    'supreme court':         ['⚖️ 9 slimes in tiny robes reviewed your case: adorable. case dismissed.', '⚖️ 9 slimes en petites robes ont étudié ton cas : adorable. affaire classée.', 'hearts'],
    'electoral college':     ['🗳 you won the popular vote (the fans). the coins remain undecided.', '🗳 tu as gagné le vote populaire (les fans). les pièces restent indécises.', 'fans5'],
    'swing state':           ['🎯 you are the swing state now. both parties send you snacks.', '🎯 tu es l\'État pivot maintenant. les deux partis t\'envoient des snacks.', 'rich5'],
    'recount':               ['🔢 recount complete: you had MORE coins than reported. corrected.', '🔢 recomptage terminé : tu avais PLUS de pièces qu\'annoncé. corrigé.', 'rich20'],
    'gerrymander':           ['🗺 your district is now shaped like a boba cup. legally binding.', '🗺 ta circonscription a désormais la forme d\'un boba. juridiquement contraignant.', 'boba'],
    'lame duck':             ['🦆 a duck appears. it is not lame. it is MAGNIFICENT. it fixes a bug.', '🦆 un canard apparaît. pas boiteux. MAGNIFIQUE. il corrige un bug.', 'honk'],
    'pork barrel':           ['🥓 earmarked funds approved: 20 coins for "infrastructure" (snacks).', '🥓 fonds fléchés approuvés : 20 pièces pour « l\'infrastructure » (des snacks).', 'rich20'],
    'red tape':              ['📕 cutting red tape… it was a 🎀 ribbon. we kept it. +style.', '📕 on coupe la paperasse… c\'était un 🎀 ruban. on l\'a gardé. +style.', 'hearts'],
    'deep state':            ['🕳 the deep state is just the slime, deeper than usual. spooky nap.', '🕳 l\'État profond, c\'est juste le slime, plus profond que d\'habitude. sieste inquiétante.', 'nap'],
    'term limits':           ['⏳ the slime has served 9999 consecutive terms. the law waves back.', '⏳ le slime en est à 9999 mandats consécutifs. la loi lui fait coucou.', 'fanfare'],
    'super pac':             ['💼 an anonymous donor (the slime) funds your next run. attack ads incoming.', '💼 un donateur anonyme (le slime) finance ta prochaine run. pubs d\'attaque en approche.', 'muffin'],
    'attack ad':             ['📺 "my opponent has NEVER petted the slime." — devastating. unverified.', '📺 « mon adversaire n\'a JAMAIS caressé le slime. » — dévastateur. non vérifié.', 'spooky'],
    'exit poll':             ['📊 exit polls say 100% of visitors love the slime. margin of error: 0.', '📊 les sondages sortie des urnes : 100 % des visiteurs aiment le slime. marge d\'erreur : 0.', 'fans5'],
    'grassroots':            ['🌱 a genuine grassroots movement sprouts. literally. in the garden.', '🌱 un vrai mouvement de terrain pousse. littéralement. dans le jardin.', 'pikmin'],
    'october surprise':      ['🎃 the october surprise is a pumpkin costume. devastating cuteness.', '🎃 la surprise d\'octobre est un costume de citrouille. mignonnerie dévastatrice.', 'fit'],
    'lobbyist':              ['🥐 the croissant lobby has reached the slime. policy: more croissants.', '🥐 le lobby du croissant a atteint le slime. politique : plus de croissants.', 'boba'],
    'bipartisan':            ['🤝 both parties agree on exactly one thing: this slime. history made.', '🤝 les deux partis d\'accord sur UNE chose : ce slime. historique.', 'hearts'],
    'commander in chief':    ['🫡 the slime salutes. it now outranks you. respectfully.', '🫡 le slime fait le salut. il te dépasse en grade. respectueusement.', 'fanfare'],
    'first amendment':       ['🗽 free speech confirmed: the slime may say "pik" at any volume.', '🗽 liberté d\'expression confirmée : le slime peut dire « pik » à tout volume.', 'meow'],
    'audit the fed':         ['🏦 audit complete: the fed is 3 pikmin in a trench coat. coins printed.', '🏦 audit terminé : la Fed, c\'est 3 pikmin dans un imperméable. pièces imprimées.', 'rich20'],
    'debt ceiling':          ['📈 debt ceiling raised!! (it was a pixel. we moved it up one pixel.)', '📈 plafond de la dette relevé !! (c\'était un pixel. on l\'a monté d\'un pixel.)', 'rich5'],
    'inflation':             ['🎈 inflation strikes: the slime is now 50% bigger. purchasing power: cuter.', '🎈 l\'inflation frappe : le slime est 50 % plus gros. pouvoir d\'achat : plus mignon.', 'big'],
    'carbon tax':            ['🌿 carbon neutral since forever: the slime runs on vibes and boba.', '🌿 neutre en carbone depuis toujours : le slime carbure aux vibes et au boba.', 'wxsun'],
    'universal healthcare':  ['🏥 in THIS country (Canada), your ♥ is covered. take one, eh.', '🏥 dans CE pays (le Canada), ton ♥ est couvert. prends-en un, eh.', 'life'],
    'sorry eh':              ['🇨🇦 apology accepted. apology returned. apology exchange complete, eh.', '🇨🇦 excuses acceptées. excuses retournées. échange d\'excuses complet, eh.', 'hearts'],
    'maple syrup please':    ['🍁 the strategic maple syrup reserve opens for you. sticky buff.', '🍁 la réserve stratégique de sirop d\'érable s\'ouvre pour toi. buff collant.', 'boba'],
    'poutine party':         ['🍟 the Poutine Party wins in a landslide. gravy for everyone.', '🍟 le Parti Poutine gagne haut la main. sauce pour tout le monde.', 'rich5'],
    'question period':       ['🏛 ORDER!! the honourable slime yields the floor to NO ONE.', '🏛 À L\'ORDRE !! l\'honorable slime ne cède la parole à PERSONNE.', 'zerg'],
    'moose lobby':           ['🫎 the moose lobby endorses you. geese furious. drama at 6.', '🫎 le lobby des orignaux te soutient. les bernaches furieuses. drame à 18 h.', 'geese'],

    /* — the classics, 1-30 — */
    'power overwhelming': ['⚡ POWER OVERWHELMING. the bugs already fear your next run.', '⚡ POWER OVERWHELMING. les bugs craignent déjà ta prochaine run.', 'god'],
    'operation cwal':     ['🏃 operation CWAL: next run runs on espresso.', '🏃 opération CWAL : la prochaine run carbure à l\'expresso.', 'fast'],
    'show me the money':  ['💰 50 coins wired to your next run. do not tell the tax slime.', '💰 50 pièces virées vers ta prochaine run. pas un mot au slime des impôts.', 'rich50'],
    'the gathering':      ['🌈 mana… gathered. rainbow fever awaits at the start line.', '🌈 mana… rassemblé. la fièvre arc-en-ciel t\'attend au départ.', 'fever'],
    'game on':            ['🍔 CHONK MODE armed. next run: extra thicc.', '🍔 MODE CHONK armé. prochaine run : extra épaisse.', 'big'],
    'black sheep wall':   ['👁 map revealed. it was hearts all along. luck boosted.', '👁 carte révélée. ce n\'étaient que des cœurs. chance boostée.', 'luck'],
    'medieval man':       ['🪶 gravity has been informed of your medieval opinions. floaty jumps armed.', '🪶 la gravité a reçu tes doléances médiévales. sauts flottants armés.', 'float'],
    'food for thought':   ['🎈 thoughts: lighter. jumps: floatier. next run.', '🎈 pensées : plus légères. sauts : plus flottants. prochaine run.', 'float'],
    'modify the phase variance': ['🔧 phase variance modified. whatever that is, your luck likes it.', '🔧 variance de phase modifiée. quoi que ce soit, ta chance apprécie.', 'luck'],
    'whats mine is mine': ['⛏ 20 coins claimed. the mine sends its regards.', '⛏ 20 pièces réclamées. la mine te salue.', 'rich20'],
    'breathe deep':       ['😮‍💨 deep breath in… RAINBOW FEVER armed.', '😮‍💨 grande inspiration… FIÈVRE ARC-EN-CIEL armée.', 'fever'],
    'something for nothing': ['🎁 the void tossed you a hype bonus. it says hi.', '🎁 le néant t\'a lancé un bonus hype. il te dit coucou.', 'muffin'],
    'staying alive':      ['🕺 ah ah ah ah — an extra ♥ waits in your next run.', '🕺 ah ah ah ah — un ♥ en plus t\'attend dans la prochaine run.', 'life'],
    'there is no cow level': ['🐄 correct. there is, however, an early boss. good luck.', '🐄 exact. il y a par contre un boss précoce. bonne chance.', 'boss'],
    'war aint what it used to be': ['🌫 the fog rolls in, philosophically.', '🌫 le brouillard arrive, avec philosophie.', 'wxfog'],
    'radio free zerg':    ['📻 the broadcast worked. they are HERE.', '📻 la transmission a marché. ils sont LÀ.', 'zerg'],
    'iddqd':              ['😇 degreelessness mode. your next run is immortal (for a while).', '😇 mode immortel. ta prochaine run ne craint (presque) rien.', 'god'],
    'idkfa':              ['🔑 all keys, all coins. well, 50 of them.', '🔑 toutes les clés, toutes les pièces. enfin, 50.', 'rich50'],
    'idspispopd':         ['👻 walls are a suggestion now. floaty jumps armed.', '👻 les murs sont devenus une suggestion. sauts flottants armés.', 'float'],
    'noclip':             ['🚁 collision politely disabled-ish. next run floats.', '🚁 collisions poliment désactivées-ish. la prochaine run flotte.', 'float'],
    'rosebud':            ['🌹 +5 coins. it was a sled, by the way.', '🌹 +5 pièces. c\'était une luge, au passage.', 'rich5'],
    'motherlode':         ['🤑 §50,000!! …converted to 50 coins at today\'s rate.', '🤑 §50 000 !! …convertis en 50 pièces au taux du jour.', 'rich50'],
    'how do you turn this on': ['🚗 vroom. the cheat car arrives for your next run.', '🚗 vroum. la voiture à cheat arrive pour ta prochaine run.', 'fast'],
    'bigdaddy':           ['👹 a boss has been summoned early. you did this.', '👹 un boss a été invoqué en avance. c\'est ta faute.', 'boss'],
    'hesoyam':            ['🚑 health, armor, respect… translated: +1 ♥ next run.', '🚑 vie, armure, respect… traduction : +1 ♥ prochaine run.', 'life'],
    'there is no spoon':  ['🥄 confirmed. luck bends instead.', '🥄 confirmé. c\'est la chance qui plie.', 'luck'],
    'all your base are belong to us': ['🚀 how are you gentlemen. +25 fans for the culture.', '🚀 how are you gentlemen. +25 fans pour la culture.', 'fans25'],
    'justin bailey':      ['👗 wardrobe protocol activated.', '👗 protocole garde-robe activé.', 'fit'],
    'konami':             ['🎮 ↑↑↓↓←→←→BA — the classic. take everything.', '🎮 ↑↑↓↓←→←→BA — le classique. prends tout.', 'konami'],
    'up up down down left right left right b a': ['🎮 you typed the WHOLE thing. legend. take everything.', '🎮 tu as TOUT tapé. légende. prends tout.', 'konami'],
    /* — internet physics, 31-42 — */
    'do a barrel roll':   ['🛩 aileron roll, technically.', '🛩 tonneau barriqué, techniquement.', 'barrel'],
    'barrel roll':        ['🛢 fine. one roll.', '🛢 bon. un seul tonneau.', 'barrel'],
    'flip':               ['🤸 wheee.', '🤸 wouiii.', 'barrel'],
    'matrix':             ['🐇 follow the pink rabbit.', '🐇 suis le lapin rose.', 'matrix'],
    'red pill':           ['💊 you chose truth. it is written in katakana.', '💊 tu as choisi la vérité. elle est écrite en katakana.', 'matrix'],
    'blue pill':          ['💊 you wake up in your bed and believe whatever the slime wants you to believe.', '💊 tu te réveilles dans ton lit et crois ce que le slime veut.', 'none'],
    'wake up neo':        ['📟 knock knock.', '📟 toc toc.', 'matrix'],
    'let it snow':        ['❄ the stage remembers Edmonton winters.', '❄ la scène se souvient des hivers d\'Edmonton.', 'wxsnow'],
    'make it rain':       ['🌧💸 rain AND riches. double meaning honoured.', '🌧💸 pluie ET richesse. double sens honoré.', 'rainmoney'],
    'here comes the sun': ['🌞 doo-doo-doo-doo.', '🌞 dou-dou-dou-dou.', 'wxsun'],
    'thunderstruck':      ['⚡ nanananana THUNDER.', '⚡ nanananana TONNERRE.', 'wxthunder'],
    'fog machine':        ['🌫 atmospheric. very indie album cover.', '🌫 atmosphérique. très pochette d\'album indé.', 'wxfog'],
    /* — Canadian affairs, 43-52 — */
    'winter is coming':   ['❄ in Edmonton? it never left.', '❄ à Edmonton ? il n\'est jamais parti.', 'wxsnow'],
    'honk':               ['📣 HONK. HONK HONK.', '📣 HONK. HONK HONK.', 'honk'],
    'goose':              ['🪿 deploying the squadron.', '🪿 déploiement de l\'escadrille.', 'geese'],
    'yongshan':           ['♡ you know her NAME. the entire squad reports for the parade!!', '♡ tu connais son NOM. toute l\'escouade se présente pour la parade !!', 'yongshanfx'],
    '你好':               ['你好!! the whole meadow heard you — full squad parade!!', '你好 !! toute la prairie t\'a entendu — parade complète !!', 'nihaofx'],
    'geese':              ['🪿 they were already on their way.', '🪿 elles étaient déjà en route.', 'geese'],
    'oh canada':          ['🍁 standing at attention. sending geese.', '🍁 au garde-à-vous. envoi des bernaches.', 'geese'],
    'eh':                 ['🇨🇦 eh.', '🇨🇦 eh.', 'honk'],
    'sorry':              ['🇨🇦 apology accepted. +5 fans, no further questions.', '🇨🇦 excuses acceptées. +5 fans, sans autre question.', 'fans5'],
    'poutine':            ['🍟 curds delivered to the habitat.', '🍟 fromage en grains livré à l\'habitat.', 'boba'],
    'timbits':            ['🍩 a box of 5 (coins).', '🍩 une boîte de 5 (pièces).', 'rich5'],
    'maple syrup':        ['🍁 the slime is now 4% sweeter.', '🍁 le slime est maintenant 4 % plus sucré.', 'boba'],
    /* — slime care, 53-68 — */
    'boba time':          ['🧋 always. it is always boba time.', '🧋 toujours. c\'est toujours l\'heure du boba.', 'boba'],
    'feed me':            ['🍬 feeding YOU is not supported. feeding the slime: done.', '🍬 te nourrir TOI n\'est pas supporté. le slime : c\'est fait.', 'boba'],
    'bubble tea':         ['🧋 with pearls. obviously.', '🧋 avec perles. évidemment.', 'boba'],
    'nap time':           ['😴 tucking in the streamer.', '😴 on borde le streamer.', 'nap'],
    'goodnight':          ['🌙 goodnight ♡ (the slime, not you. you stay.)', '🌙 bonne nuit ♡ (le slime, pas toi. toi tu restes.)', 'nap'],
    'sweet dreams':       ['💤 dreams: sweetened.', '💤 rêves : sucrés.', 'nap'],
    'wake up':            ['⏰ ZOOMIES DEPLOYED.', '⏰ ZOOMIES DÉPLOYÉES.', 'wake'],
    'zoomies':            ['🌀 initiating maximum zoom.', '🌀 zoom maximal enclenché.', 'wake'],
    'good boy':           ['🥹 the slime is neither, but it accepts.', '🥹 le slime n\'est ni l\'un ni l\'autre, mais il accepte.', 'fans5'],
    'good slime':         ['🥹 it heard you. it will never forget this.', '🥹 il t\'a entendu. il ne l\'oubliera jamais.', 'fans5'],
    'i love you':         ['💘 the slime says it back. LOUDLY.', '💘 le slime te le dit aussi. FORT.', 'hearts'],
    'marry me':           ['💍 the slime is flattered but married to the grind.', '💍 le slime est flatté mais marié au taf.', 'hearts'],
    'notice me senpai':   ['👀 senpai has noticed. +5 fans.', '👀 senpai t\'a remarqué. +5 fans.', 'fans5'],
    'uwu':                ['🥺 uwu detected. deploying hearts.', '🥺 uwu détecté. déploiement de cœurs.', 'hearts'],
    'owo':                ["👀 what's this? hearts. it's hearts.", "👀 c'est quoi ça ? des cœurs. ce sont des cœurs.", 'hearts'],
    'kawaii':             ['🎀 correct assessment.', '🎀 diagnostic correct.', 'hearts'],
    /* — fashion & mood, 69-75 — */
    'slay':               ['💅 the slime heard. the slime slays.', '💅 le slime a entendu. le slime slay.', 'fit'],
    'fashion week':       ['👗 runway mode. new fit incoming.', '👗 mode défilé. nouvelle tenue en approche.', 'fit'],
    'new fit':            ['🧢 wardrobe spinning…', '🧢 la garde-robe tourne…', 'fit'],
    'mirror mirror':      ['🪞 the cutest of them all? checking… it\'s the slime.', '🪞 le plus mignon de tous ? vérification… c\'est le slime.', 'fit'],
    'grumpy':             ['😾 mood applied. temporarily. probably.', '😾 humeur appliquée. temporairement. sans doute.', 'grumpy'],
    'boo':                ['👻 EEK. ok that was cute.', '👻 IIIK. bon, c\'était mignon.', 'spooky'],
    'ghost':              ['👻 the habitat is haunted by exactly one (1) cutie.', '👻 l\'habitat est hanté par exactement un (1) mignon.', 'spooky'],
    /* — garden ops, 76-78 — */
    'pikmin':             ['🌸 sprout express dispatched to the live room.', '🌸 express à pousses envoyé vers le direct.', 'pikmin'],
    'petal squad':        ['🌸 SQUAD REQUESTED. sprouting reinforcements.', '🌸 ESCOUADE DEMANDÉE. renforts en germination.', 'pikmin'],
    'pluck':              ['🌱 grow first, pluck second. sprouts incoming.', '🌱 pousser d\'abord, cueillir ensuite. pousses en route.', 'pikmin'],
    /* — the soundboard, 79-81 — */
    'freebird':           ['🎸 *air guitar solo, 9 minutes, condensed to one fanfare*', '🎸 *solo de air guitar, 9 minutes, condensé en une fanfare*', 'fanfare'],
    'encore':             ['🎤 ENCORE! ENCORE!', '🎤 ENCORE ! ENCORE !', 'fanfare'],
    'drop the beat':      ['🎧 beat: dropped. floor: checked.', '🎧 beat : lâché. sol : vérifié.', 'fanfare'],
    /* — dev folklore, 82-97 — */
    'hello world':        ['🌍 hello, you. +5 fans for tradition.', '🌍 salut, toi. +5 fans pour la tradition.', 'fans5'],
    'foo':                ['bar.', 'bar.', 'none'],
    'bar':                ['foo. obviously.', 'foo. évidemment.', 'none'],
    'foobar':             ['baz. we can do this all day.', 'baz. on peut y passer la journée.', 'none'],
    'segfault':           ['💥 core dumped (emotionally).', '💥 core dumpé (émotionnellement).', 'grumpy'],
    'rm -rf /':           ['🛑 ABSOLUTELY not. this OS contains a slime.', '🛑 ABSOLUMENT pas. cet OS contient un slime.', 'none'],
    'git push --force':   ['😱 …you MONSTER. the bugs are coming for you.', '😱 …espèce de MONSTRE. les bugs arrivent.', 'zerg'],
    'merge conflict':     ['⚔ <<<<<<< HEAD of the bug army', '⚔ <<<<<<< HEAD de l\'armée des bugs', 'zerg'],
    'stack overflow':     ['📚 closed as duplicate of: being awesome.', '📚 fermé pour doublon de : être génial·e.', 'none'],
    'infinite loop':      ['🔁 see: infinite loop.', '🔁 voir : boucle infinie.', 'loop'],
    'recursion':          ['🪆 did you mean: recursion?', '🪆 vouliez-vous dire : récursion ?', 'none'],
    'coffee':             ['☕ speed buff brewing for your next run.', '☕ buff de vitesse en cours d\'infusion pour ta prochaine run.', 'fast'],
    'espresso':           ['☕☕ DOUBLE shot. next run will vibrate.', '☕☕ DOUBLE dose. la prochaine run va vibrer.', 'fast'],
    'sudo make me a sandwich': ['🥪 okay. (you had the audacity. respect.)', '🥪 d\'accord. (tu as osé. respect.)', 'boba'],
    '42':                 ['🌌 correct. but what was the question?', '🌌 exact. mais quelle était la question ?', 'none'],
    'meow':               ['🐱 the keyboard-cat approves.', '🐱 le chat-clavier approuve.', 'meow'],
    /* — finale, 98-100 — */
    'to the moon':        ['🚀 20 coins strapped to a rocket. next run. no refunds.', '🚀 20 pièces sanglées à une fusée. prochaine run. non remboursable.', 'rich20'],
    'i am the danger':    ['🔥 a boss knocks. you answer. next run.', '🔥 un boss frappe à la porte. tu réponds. prochaine run.', 'boss'],
    'roll credits':       ['🎬 rolling…', '🎬 ça tourne…', 'credits']
  };
  // the banner never lies: count the grimoire instead of hardcoding it
  const CHEAT_COUNT = Object.keys(TERM_CHEATS).length;

  /* =====================================================
     FUZZY SPELLCASTING — close guesses count. The slime god
     then REWRITES the spellbook so your wording becomes the
     real command (persisted, old words stop working).
     ===================================================== */
  var spellBusy = false;

  function fireCheat(canonical, isCustom) {
    const c = TERM_CHEATS[canonical];
    if (!c) return;
    termLine(trT(c[0], c[1]), 't-accent');
    cheatFx(c[2]);
    const found = store.get('yos-cheats-found', []);
    if (found.indexOf(canonical) === -1) {
      found.push(canonical);
      store.set('yos-cheats-found', found);
      cloudQueueSync();
      [[5, 'c5'], [10, 'c10'], [25, 'c25'], [50, 'c50'], [75, 'c75'], [100, 'c100']]
        .forEach(([v, id]) => { if (found.length >= v) achvUnlock(id); });
    }
    playSparkleSound();
    achvUnlock('spellcaster');
    if (isCustom) {
      // personalized spells always land with a little extra glitter
      cheatFall(['✨', '♥', '⭐'], 12);
      gainFollowers(2);
      termLine(trT('✨ personal-spell buff: +2 fans, +100% style, +1 smug', '✨ buff de sort personnel : +2 fans, +100 % de style, +1 fierté'), 't-ok');
    }
  }

  function levDist(a, b) {
    if (Math.abs(a.length - b.length) > 3) return 99;
    const m = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) m[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return m[a.length][b.length];
  }

  // famous spells from OTHER games are honoured as near-guesses too
  const CHEAT_SYNONYMS = {
    'greedisgood': 'show me the money',
    'greed is good': 'show me the money',
    'whosyourdaddy': 'iddqd',
    'who is your daddy': 'iddqd',
    'god mode': 'iddqd',
    'godmode': 'iddqd',
    'kaching': 'motherlode',
    'ka ching': 'motherlode',
    'big money': 'motherlode',
    'canada goose': 'goose',
    'honk honk': 'honk',
    'allyourbase': 'all your base are belong to us',
    'itshappening': 'to the moon',
    'hodl': 'to the moon'
  };

  const SPELL_STOPWORDS = new Set(['the', 'a', 'an', 'of', 'to', 'is', 'it', 'for', 'in', 'on', 'at', 'me', 'my', 'are', 'and', 'do', 'this', 'that', 'there', 'no', 'us', 'be', 'le', 'la', 'les', 'de', 'du', 'un', 'une', 'et']);
  const SPELL_RESERVED = ['open', 'kill', 'theme', 'lang', 'cat', 'man', 'ask', 'search', 'echo', 'sudo', 'pet', 'rm', 'exit', 'hint', 'cheats', 'secrets', 'help', 'clear', 'ls', 'whoami', 'neofetch', 'repos', 'contact', 'like', 'ps', 'top', 'hall', 'sleepwalk'];

  function spellNorm(s) { return String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function spellToks(s) { return spellNorm(s).split(' ').filter((w) => w && !SPELL_STOPWORDS.has(w)); }

  // fuzzy has BOUNDARIES now: a guess must genuinely share the spell's
  // key words (or be a near-typo of the whole thing). Nothing else.
  function fuzzyCheatMatch(rawInput) {
    const input = spellNorm(rawInput);
    if (!input || input.length < 3) return null;

    const it = spellToks(input);
    const squishedIn = input.replace(/\s/g, '');
    let best = null;
    let bestScore = 0;

    Object.keys(TERM_CHEATS).forEach((key) => {
      const kt = spellToks(key);
      if (!kt.length) return;
      if (it.length > kt.length + 2) return; // rambling ≠ guessing
      let shared = 0;
      let sharedLong = false;
      kt.forEach((k) => {
        // exact word, or a 1-letter typo on a word of 5+ letters
        if (it.some((w) => w === k || (k.length >= 5 && w.length >= 5 && levDist(w, k) <= 1))) {
          shared++;
          if (k.length >= 4) sharedLong = true;
        }
      });
      let score = shared / kt.length;
      // squished / typo'd whole-spell compare: "moterload", "doabarrelroll"…
      const squishedKey = key.replace(/[^a-z0-9]/g, '');
      if (squishedKey.length >= 6 && Math.abs(squishedIn.length - squishedKey.length) <= 2 && levDist(squishedIn, squishedKey) <= 2) {
        score = 1; sharedLong = true;
      }
      if (score >= 0.6 && sharedLong && score > bestScore) { bestScore = score; best = key; }
    });
    return best;
  }

  function tryFuzzyCheat(rawInput) {
    if (spellBusy) return false;
    const phrase = spellNorm(rawInput);
    // classic codes from OTHER games are honored as-is: recognized
    // dialect, full effect, NO rewrite (iddqd stays iddqd, thanks)
    if (CHEAT_SYNONYMS[phrase] && TERM_CHEATS[CHEAT_SYNONYMS[phrase]]) {
      const canon = CHEAT_SYNONYMS[phrase];
      termLine(trT(`🗝️ ancient dialect recognized. translating to \`${canon}\` — the spellbook honors the classics as-is.`, `🗝️ dialecte ancien reconnu. traduction : \`${canon}\` — le grimoire honore les classiques tels quels.`), 't-ok');
      fireCheat(canon, false);
      return true;
    }
    const canonical = fuzzyCheatMatch(rawInput);
    if (!canonical || phrase === spellNorm(canonical)) return false;
    if (TERM_CHEATS[phrase]) return false; // that IS another spell — no stealing

    // sacred words can't be overwritten — fire the spell, skip the rename
    if (SPELL_RESERVED.indexOf(phrase.split(' ')[0]) !== -1 || SPELL_RESERVED.indexOf(phrase) !== -1) {
      termLine(trT(`🎉 close enough — the true incantation is \`${canonical}\`. (yours starts with a sacred word, so the spellbook stays.)`, `🎉 presque — la vraie incantation est \`${canonical}\`. (la tienne commence par un mot sacré, le grimoire reste intact.)`), 't-ok');
      fireCheat(canonical, false);
      return true;
    }

    spellRenameCeremony(canonical, phrase);
    return true;
  }

  function spellRenameCeremony(canonical, phrase) {
    spellBusy = true;
    const already = store.get('yos-cheat-renames', {});
    termLine(trT(`🎉 CLOSE ENOUGH!! the true incantation was \`${canonical}\`…`, `🎉 PRESQUE !! la vraie incantation était \`${canonical}\`…`), 't-ok');
    termLine(trT('…but the slime god likes YOUR version better. hold still—', '…mais le dieu slime préfère TA version. bouge pas—'), 't-accent');
    playSparkleSound();

    slimeSpellCast(() => {
      const renames = store.get('yos-cheat-renames', {});
      renames[canonical] = phrase;
      store.set('yos-cheat-renames', renames);
      cloudQueueSync(); // renamed spells travel to the cloud too
      termLine(trT(`✔ SPELLBOOK REWRITTEN: \`${phrase}\` is now a real command on this OS. the old words have been deleted from reality.`, `✔ GRIMOIRE RÉÉCRIT : \`${phrase}\` est désormais une vraie commande de cet OS. les anciens mots ont été effacés de la réalité.`), 't-ok');
      termLine(trT(already[canonical] ? '(the slime god sighs and updates it AGAIN. you\'re lucky you\'re cute.)' : 'type it again — personalized spells come with a buff ♡', already[canonical] ? '(le dieu slime soupire et met à jour ENCORE. heureusement que tu es mignon·ne.)' : 'retape-le — les sorts personnalisés ont un buff ♡'), 't-dim');
      achvUnlock('spellsmith');
      playFanfare();
      spellBusy = false;
    });
  }

  // the slime hops out of the sidebar and casts, Y2K fireworks included
  function slimeSpellCast(onDone) {
    const habitatRect = slimeHabitat ? slimeHabitat.getBoundingClientRect() : { left: 40, top: 120, width: 80, height: 80 };
    const termWinEl = document.getElementById('win-terminal');
    const tRect = termWinEl && !termWinEl.classList.contains('window-closed')
      ? termWinEl.getBoundingClientRect()
      : { left: window.innerWidth / 2 - 120, top: window.innerHeight / 2, width: 240 };

    const caster = document.createElement('div');
    caster.className = 'spellcaster';
    caster.setAttribute('aria-hidden', 'true');
    const img = document.createElement('img');
    img.src = (typeof OUTFIT_FRAMES === 'object' && OUTFIT_FRAMES && typeof OUTFIT_FRAMES.base === 'string' && OUTFIT_FRAMES.base) || 'assets/slime_pet_cutout.png';
    img.alt = '';
    const circle = document.createElement('div');
    circle.className = 'spell-circle';
    circle.innerHTML = '<span>♥</span><span>✦</span><span>★</span><span>🎀</span><span>♡</span><span>✧</span>';
    const bub = document.createElement('div');
    bub.className = 'spell-bubble';
    bub.textContent = trT('✨ rewriting the spellbook…', '✨ réécriture du grimoire…');
    caster.append(circle, img, bub);
    document.body.appendChild(caster);

    const from = { x: habitatRect.left + habitatRect.width / 2 - 40, y: habitatRect.top + habitatRect.height / 2 - 36 };
    const to = { x: Math.min(window.innerWidth - 96, Math.max(12, tRect.left + tRect.width / 2 - 40)), y: Math.max(64, tRect.top - 28) };
    caster.style.left = from.x + 'px';
    caster.style.top = from.y + 'px';
    playTone(523.25, 'triangle', 0.14, 0, 0.05);
    playTone(659.25, 'triangle', 0.14, 0.12, 0.05);

    const t0 = Date.now();
    const walkMs = REDUCED_MOTION ? 60 : 1400;
    const glide = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / walkMs);
      const e = p * p * (3 - 2 * p);
      caster.style.left = (from.x + (to.x - from.x) * e) + 'px';
      caster.style.top = (from.y + (to.y - from.y) * e - Math.sin(p * Math.PI) * 46) + 'px';
      if (p >= 1) { clearInterval(glide); castNow(); }
    }, 30);

    function castNow() {
      caster.classList.add('is-casting');
      document.body.classList.add('spell-flash');
      cheatFall(['✨', '♥', '⭐', '🎀', '✦'], 30);
      [659.25, 783.99, 987.77, 1318.51, 1567.98].forEach((f, i) => playTone(f, 'triangle', 0.2, i * 0.09, 0.06));
      setTimeout(() => {
        document.body.classList.remove('spell-flash');
        caster.classList.add('sw-fading');
        setTimeout(() => caster.remove(), 700);
        onDone();
      }, REDUCED_MOTION ? 300 : 1900);
    }
  }

  /* =====================================================
     ACHIEVEMENTS — the hall_of_slime trophy shelf.
     Unlocks persist locally; each unlock also bumps a shared
     Abacus counter so everyone sees worldwide unlock counts.
     ===================================================== */
  const ACHV_API = 'https://abacus.jasoncameron.dev';
  const ACHV_NS = 'yongshanos-yyswhsccc';

  var ACHV = [
    { id: 'spellcaster', icon: '🔮', n: ['First Words of Power', 'Premiers Mots de Pouvoir'], d: ['cast a hidden cheat code. totally didn\'t google it.', 'a lancé un code secret. sans googler, évidemment.'], t: ['the terminal keeps its secrets. all of them.', 'le terminal garde ses secrets. tous.'] },
    { id: 'spellsmith', icon: '✍️', n: ['The Slime God\'s Co-Author', 'Co-auteur·rice du Dieu Slime'], d: ['guessed a cheat SO wrong it became the official spelling.', 'a si mal deviné un code qu\'il est devenu l\'orthographe officielle.'], t: ['guess a cheat badly. with confidence.', 'devine un code mal. avec assurance.'] },
    { id: 'dreamwatcher', icon: '👀', n: ['Do Not Wake', 'Ne Pas Réveiller'], d: ['watched the slime sleepwalk across the desktop. said nothing.', 'a regardé le slime traverser le bureau en dormant. sans rien dire.'], t: ['midnight. the habitat empties…', 'minuit. l\'habitat se vide…'] },
    { id: 'nightmare', icon: '💀', n: ['It Got Worse', 'C\'est Devenu Pire'], d: ['met the sleepwalker\'s nightmare form: the biggest bug ever recorded.', 'a rencontré la forme cauchemar du somnambule : le plus gros bug jamais vu.'], t: ['sometimes a dream dives into the arcade… and curdles.', 'parfois un rêve plonge dans l\'arcade… et tourne mal.'] },
    { id: 'nightmareslain', icon: '🌸', n: ['Certified Dream Debugger', 'Débogue-Rêves Certifié·e'], d: ['patched the nightmare with critical hugs. it purred.', 'a corrigé le cauchemar à coups de câlins critiques. il a ronronné.'], t: ['nightmares have exactly one weakness.', 'les cauchemars ont exactement une faiblesse.'] },
    { id: 'bosskill', icon: '⚔️', n: ['Kaiju Exterminator', 'Exterminateur·rice de Kaijus'], d: ['deleted a 404 kaiju. the page was never found again.', 'a supprimé un kaiju 404. la page n\'a plus jamais été retrouvée.'], t: ['something enormous eventually blocks the road.', 'quelque chose d\'énorme finit par bloquer la route.'] },
    { id: 'speedran', icon: '💨', n: ['Speedrun to Zero', 'Speedrun Vers Zéro'], d: ['perished within 3 seconds of the start line. the bugs sent a thank-you card.', 'a péri moins de 3 secondes après le départ. les bugs ont envoyé une carte de remerciement.'], t: ['fail fast. no — FASTER.', 'échoue vite. non — PLUS VITE.'] },
    { id: 'top10', icon: '🏆', n: ['Three Letters, No Shame', 'Trois Lettres, Zéro Honte'], d: ['signed the arcade top-10. the initials definitely spell something.', 'a signé le top 10 de l\'arcade. les initiales veulent SÛREMENT dire quelque chose.'], t: ['great runs deserve a signature.', 'les grandes runs méritent une signature.'] },
    { id: 'nowifi', icon: '📡', n: ['Airplane Mode Athlete', 'Athlète du Mode Avion'], d: ['played the runner with zero internet. offline, but never alone.', 'a joué au runner sans internet. hors-ligne, mais jamais seul·e.'], t: ['what does this OS do when the wifi dies?', 'que fait cet OS quand le wifi meurt ?'] },
    { id: 'sugarparent', icon: '🍬', n: ['Registered Snack Sponsor', 'Sponsor Officiel de Snacks'], d: ['fed the slime 10 times. it lists you as next of kin now.', 'a nourri le slime 10 fois. il t\'a inscrit·e comme famille proche.'], t: ['the way to a slime\'s heart is documented.', 'le chemin vers le cœur d\'un slime est documenté.'] },
    { id: 'overstim', icon: '🐙', n: ['Personal Space: Denied', 'Espace Vital : Refusé'], d: ['clicked the slime so fast it filed a complaint (cutely).', 'a cliqué le slime si vite qu\'il a porté plainte (mignonnement).'], t: ['pet. faster. no, faster.', 'caresse. plus vite. non, PLUS vite.'] },
    { id: 'loveoverflow', icon: '💗', n: ['ERR0R: L0VE_0VERFL0W', 'ERR0R : DÉB0RDEMENT_D\'AM0UR'], d: ['crashed the slime with pure affection. it rated the crash 5 stars.', 'a fait planter le slime à l\'affection pure. il a mis 5 étoiles au crash.'], t: ['30 pets is a warning, not a limit.', '30 caresses : un avertissement, pas une limite.'] },
    { id: 'goose', icon: '🪿', n: ['Canadian Air Force', 'Force Aérienne Canadienne'], d: ['summoned the geese. HONK. (this cannot be undone.)', 'a invoqué les bernaches. HONK. (irréversible.)'], t: ['this is Canada. something honks.', 'on est au Canada. quelque chose klaxonne.'] },
    { id: 'barrel', icon: '🛩', n: ['Aileron Certified', 'Brevet de Tonneau'], d: ['made the entire website do a barrel roll. peppy would be proud.', 'a fait faire un tonneau au site entier. peppy serait fier.'], t: ['a very famous manoeuvre works on whole websites.', 'une très célèbre manœuvre marche sur les sites entiers.'] },
    { id: 'frenchie', icon: '🥐', n: ['Honorary Baguette', 'Baguette Honoraire'], d: ['switched the OS to French. immediate +10 elegance.', 'a mis l\'OS en français. +10 d\'élégance immédiate.'], t: ['this OS speaks two languages.', 'cet OS parle deux langues.'] },
    { id: 'nightowl', icon: '🌙', n: ['Midnight Shift', 'Équipe de Nuit'], d: ['turned on midnight mode. your retinas wrote a thank-you note.', 'a activé le mode minuit. tes rétines ont envoyé un mot de remerciement.'], t: ['the moon button does something.', 'le bouton lune fait quelque chose.'] },
    { id: 'hired', icon: '💼', n: ['HR Speedrun Any%', 'Speedrun RH Any%'], d: ['ran `sudo hire yongshan`. somewhere, a recruiter felt a disturbance.', 'a lancé `sudo hire yongshan`. quelque part, un recruteur a senti une perturbation.'], t: ['sudo can do more than you think.', 'sudo peut plus que tu ne crois.'] },
    { id: 'liked', icon: '💖', n: ['Wall Material', 'Digne du Mur'], d: ['joined the fan wall. your 100 pixels are famous worldwide now.', 'a rejoint le mur des fans. tes 100 pixels sont mondialement célèbres.'], t: ['the little heart button is real. and shared.', 'le petit bouton cœur est réel. et partagé.'] },
    // ---- the 110 little ones: metric-driven, all pop on their own ----
    { id: 'pet10', icon: '🐾', m: 'pets', v: 10, n: ['Certified Hand', 'Main Certifiée'], d: ['10 pets delivered. the slime memorized your cursor.', '10 caresses livrées. le slime a mémorisé ton curseur.'], t: ['pet. just pet.', 'caresse. c\'est tout.'] },
    { id: 'pet50', icon: '🖐️', m: 'pets', v: 50, n: ['Emotional Support Human', 'Humain de Soutien Émotionnel'], d: ['50 pets. legally, you work here now.', '50 caresses. légalement, tu travailles ici maintenant.'], t: ['keep petting.', 'continue de caresser.'] },
    { id: 'pet200', icon: '💆', m: 'pets', v: 200, n: ['Slime Spa Director', 'Directeur·rice du Spa à Slime'], d: ['200 pets. the slime opened a loyalty account in your name.', '200 caresses. le slime t\'a ouvert un compte fidélité.'], t: ['200 is a lifestyle.', '200, c\'est un mode de vie.'] },
    { id: 'pet1000', icon: '🫶', m: 'pets', v: 1000, n: ['The Thousand-Pet Prophecy', 'La Prophétie des Mille Caresses'], d: ['1000 pets. ancient slime scrolls foretold your wrist.', '1000 caresses. les anciens parchemins slime avaient prédit ton poignet.'], t: ['there is a prophecy.', 'il existe une prophétie.'] },
    { id: 'feed50', icon: '🍭', m: 'feeds', v: 50, n: ['Snack Infrastructure', 'Infrastructure à Snacks'], d: ['50 candies. you are now a supply chain.', '50 bonbons. tu es devenu·e une chaîne logistique.'], t: ['the slime is hungry. often.', 'le slime a faim. souvent.'] },
    { id: 'feed200', icon: '🍰', m: 'feeds', v: 200, n: ['Michelin Star (Candy Category)', 'Étoile Michelin (Catégorie Bonbons)'], d: ['200 feeds. critics call your candy "reliable".', '200 repas. la critique dit de tes bonbons : « fiables ».'], t: ['cook. serve. repeat.', 'cuisine. sers. répète.'] },
    { id: 'nap5', icon: '🛏️', m: 'naps', v: 5, n: ['Bedtime Enforcer', 'Agent du Coucher'], d: ['tucked the slime in 5 times. it pretends to resist.', 'a bordé le slime 5 fois. il fait semblant de résister.'], t: ['the nap button exists.', 'le bouton sieste existe.'] },
    { id: 'nap25', icon: '😴', m: 'naps', v: 25, n: ['Sandman\'s Intern', 'Stagiaire du Marchand de Sable'], d: ['25 naps scheduled. HR approved all of them.', '25 siestes planifiées. les RH ont tout validé.'], t: ['sleep is a feature.', 'dormir est une feature.'] },
    { id: 'nap100', icon: '🌛', m: 'naps', v: 100, n: ['Chief Sleep Officer', 'Directeur·rice Général·e du Dodo'], d: ['100 naps. the pillow signed a sponsorship deal.', '100 siestes. l\'oreiller a signé un contrat de sponsoring.'], t: ['one hundred bedtimes.', 'cent couchers.'] },
    { id: 'play10', icon: '⭐', m: 'plays', v: 10, n: ['Zoomies Technician', 'Technicien·ne des Zoomies'], d: ['triggered 10 zoomies. all systems: wheee.', 'a déclenché 10 zoomies. tous les systèmes : wiiii.'], t: ['play with it.', 'joue avec.'] },
    { id: 'play50', icon: '🎪', m: 'plays', v: 50, n: ['Recess Committee Chair', 'Président·e du Comité Récré'], d: ['50 play sessions. the slime lists you as "cardio".', '50 récrés. le slime te classe comme « cardio ».'], t: ['more zoomies.', 'plus de zoomies.'] },
    { id: 'play200', icon: '🎡', m: 'plays', v: 200, n: ['Perpetual Motion License', 'Permis de Mouvement Perpétuel'], d: ['200 zoomies. physicists want to study your slime.', '200 zoomies. des physiciens veulent étudier ton slime.'], t: ['zoomies, industrialized.', 'zoomies, industrialisés.'] },
    { id: 'die1', icon: '🪦', m: 'deaths', v: 1, n: ['First Blood (Yours)', 'Premier Sang (Le Tien)'], d: ['died once. the bug wrote it in its diary.', 'mort·e une fois. le bug l\'a noté dans son journal.'], t: ['run. trip. learn.', 'cours. trébuche. apprends.'] },
    { id: 'die10', icon: '💀', m: 'deaths', v: 10, n: ['Frequent Flyer (Downward)', 'Grand Voyageur (Vers le Bas)'], d: ['10 deaths. the respawn button knows you by name.', '10 morts. le bouton respawn te tutoie.'], t: ['persistence is cute.', 'la persévérance, c\'est mignon.'] },
    { id: 'die50', icon: '⚰️', m: 'deaths', v: 50, n: ['Punch Card: Afterlife', 'Carte de Fidélité : Au-delà'], d: ['50 deaths. the 51st comes with a free stamp.', '50 morts. la 51e offre un tampon gratuit.'], t: ['keep dying. gorgeously.', 'continue de mourir. avec panache.'] },
    { id: 'die250', icon: '👻', m: 'deaths', v: 250, n: ['Local Ghost, Beloved', 'Fantôme Local, Adoré'], d: ['250 deaths. the bugs held a vigil. it was moving.', '250 morts. les bugs ont fait une veillée. c\'était émouvant.'], t: ['two hundred fifty.', 'deux cent cinquante.'] },
    { id: 's100', icon: '🥉', n: ['Three Digits Club', 'Club des Trois Chiffres'], d: ['scored 100. HR noticed you (it\'s in the game, literally).', 'a marqué 100. les RH t\'ont repéré·e (littéralement, c\'est dans le jeu).'], t: ['reach 100. survive.', 'atteins 100. survis.'] },
    { id: 's300', icon: '🥈', n: ['Senior Jumper', 'Sauteur·se Senior'], d: ['scored 300. promoted mid-air.', 'a marqué 300. promu·e en plein saut.'], t: ['300 needs legs.', '300 demande des jambes.'] },
    { id: 's500', icon: '🥇', n: ['The Bugs Fear You', 'Les Bugs Te Craignent'], d: ['scored 500. bug forums call you "the incident".', 'a marqué 500. les forums de bugs t\'appellent « l\'incident ».'], t: ['half a thousand.', 'un demi-millier.'] },
    { id: 's1000', icon: '🏅', n: ['Four Digits!!', 'Quatre Chiffres !!'], d: ['scored 1000. the offer letter is basically typing itself.', 'a marqué 1000. la lettre d\'embauche s\'écrit toute seule.'], t: ['one. thousand.', 'mille. tout rond.'] },
    { id: 's2000', icon: '👑', n: ['Overqualified', 'Surqualifié·e'], d: ['scored 2000. the game asked YOU for tips.', 'a marqué 2000. le jeu T\'A demandé des conseils.'], t: ['2000, no mercy.', '2000, sans pitié.'] },
    { id: 's5000', icon: '🚀', n: ['Escape Velocity', 'Vitesse de Libération'], d: ['scored 5000. NASA left a voicemail.', 'a marqué 5000. la NASA a laissé un message vocal.'], t: ['5000. yes, really.', '5000. oui, vraiment.'] },
    { id: 's10000', icon: '🌌', n: ['Beyond The Leaderboard', 'Au-delà du Classement'], d: ['scored 10000. the hall of slime is building you a wing.', 'a marqué 10000. le hall of slime te construit une aile.'], t: ['five digits exist.', 'les cinq chiffres existent.'] },
    { id: 'jump500', icon: '🦘', m: 'jumps', v: 500, n: ['Spring-Loaded', 'À Ressorts'], d: ['500 jumps. your spacebar filed for overtime.', '500 sauts. ta barre espace a demandé des heures sup.'], t: ['jump a lot.', 'saute beaucoup.'] },
    { id: 'jump5000', icon: '🛸', m: 'jumps', v: 5000, n: ['Gravity\'s Ex', 'L\'Ex de la Gravité'], d: ['5000 jumps. gravity says it "needs space".', '5000 sauts. la gravité dit qu\'elle « a besoin d\'espace ».'], t: ['jump. five thousand times.', 'saute. cinq mille fois.'] },
    { id: 'jump20000', icon: '🌠', m: 'jumps', v: 20000, n: ['Orbital Resident', 'Résident·e Orbital·e'], d: ['20000 jumps. you receive mail at apogee now.', '20000 sauts. ton courrier arrive à l\'apogée.'], t: ['twenty thousand.', 'vingt mille.'] },
    { id: 'rich60', icon: '🐉', n: ['Dragon Hoard (Pocket Size)', 'Trésor de Dragon (Format Poche)'], d: ['held 60 coins in one run. a tiny dragon applied to guard them.', 'a détenu 60 pièces en une run. un mini-dragon a postulé pour les garder.'], t: ['hoard. carefully.', 'amasse. prudemment.'] },
    { id: 'buys3', icon: '🛍️', m: 'buys', v: 3, n: ['Valued Customer', 'Client·e Estimé·e'], d: ['3 purchases. the boba cat drew a heart on your receipt.', '3 achats. le chat-boba a dessiné un cœur sur ton ticket.'], t: ['the cat sells things.', 'le chat vend des choses.'] },
    { id: 'buys20', icon: '💳', m: 'buys', v: 20, n: ['Preferred Shareholder', 'Actionnaire Privilégié·e'], d: ['20 purchases. the cat named a smoothie after you.', '20 achats. le chat a baptisé un smoothie en ton honneur.'], t: ['keep the cat rich.', 'enrichis le chat.'] },
    { id: 'buys50', icon: '🏦', m: 'buys', v: 50, n: ['The Cat\'s Retirement Plan', 'Le Plan Retraite du Chat'], d: ['50 purchases. the cat retired to a boba farm. it came back — for you.', '50 achats. le chat a pris sa retraite dans une ferme à boba. il est revenu — pour toi.'], t: ['fifty receipts.', 'cinquante tickets.'] },
    { id: 'trap1', icon: '🪤', m: 'traps', v: 1, n: ['Marketing Victim', 'Victime du Marketing'], d: ['bought a shop trap. the label WAS gorgeous.', 'a acheté un piège de boutique. l\'étiquette ÉTAIT magnifique.'], t: ['if it sparkles too hard…', 'si ça brille trop fort…'] },
    { id: 'trap5', icon: '🤡', m: 'traps', v: 5, n: ['Five-Time Believer', 'Croyant·e Quintuple'], d: ['bought 5 traps. at this point it\'s a donation.', 'a acheté 5 pièges. à ce stade, c\'est un don.'], t: ['fool me five times.', 'trompe-moi cinq fois.'] },
    { id: 'godyes1', icon: '🙏', m: 'godyes', v: 1, n: ['Leap of Faith', 'Acte de Foi'], d: ['believed in a code god. bold. moist. inspiring.', 'a cru en un dieu du code. audacieux. humide. inspirant.'], t: ['a god will ask.', 'un dieu demandera.'] },
    { id: 'godno1', icon: '🚫', m: 'godno', v: 1, n: ['Immune to Marketing', 'Immunisé·e au Marketing'], d: ['refused a god to its face. it respected that. probably.', 'a refusé un dieu en face. il a respecté. probablement.'], t: ['you can say no to gods.', 'on peut dire non aux dieux.'] },
    { id: 'gods10', icon: '⛪', m: 'gods', v: 10, n: ['Comparative Theology Minor', 'Mineure en Théologie Comparée'], d: ['met 10 code gods. your thesis: "they\'re all a bit much".', 'a rencontré 10 dieux du code. ta thèse : « ils en font tous trop ».'], t: ['meet more gods.', 'rencontre plus de dieux.'] },
    { id: 'gods25', icon: '🏛️', m: 'gods', v: 25, n: ['Pantheon Regular', 'Habitué·e du Panthéon'], d: ['25 divine encounters. they saved you a seat.', '25 rencontres divines. ils te gardent une place.'], t: ['the pantheon has a lobby.', 'le panthéon a un hall.'] },
    { id: 'tarot1', icon: '🃏', m: 'tarots', v: 1, n: ['One Card Curious', 'Curieux·se d\'une Carte'], d: ['drew from the wizard. the card judged you gently.', 'a tiré chez le mage. la carte t\'a jugé·e avec douceur.'], t: ['the wizard shuffles.', 'le mage mélange.'] },
    { id: 'tarot10', icon: '🔮', m: 'tarots', v: 10, n: ['Fate\'s Frequent Customer', 'Client·e Fidèle du Destin'], d: ['10 draws. the wizard started a punch card too.', '10 tirages. le mage a lancé une carte de fidélité aussi.'], t: ['ten spreads deep.', 'dix tirages plus loin.'] },
    { id: 'tarot30', icon: '🌟', m: 'tarots', v: 30, n: ['Arcana Sommelier', 'Sommelier·ère des Arcanes'], d: ['30 draws. you can smell a reversed card from two events away.', '30 tirages. tu flaires une carte renversée à deux événements.'], t: ['thirty cards later…', 'trente cartes plus tard…'] },
    { id: 'c5', icon: '🗝️', n: ['Keyring Started', 'Trousseau Entamé'], d: ['found 5 cheat codes. the rest are still hiding. they giggle.', 'a trouvé 5 codes. les autres se cachent encore. ils gloussent.'], t: ['find five secrets.', 'trouve cinq secrets.'] },
    { id: 'c10', icon: '🕵️', n: ['Spellbook: Chapter One', 'Grimoire : Chapitre Un'], d: ['10 codes found. the terminal is mildly impressed.', '10 codes trouvés. le terminal est modérément impressionné.'], t: ['double digits of secrets.', 'des secrets à deux chiffres.'] },
    { id: 'c25', icon: '📖', n: ['Forbidden Librarian', 'Bibliothécaire de l\'Interdit'], d: ['25 codes. you shelve secrets by smell now.', '25 codes. tu ranges les secrets à l\'odeur.'], t: ['a quarter of the truth.', 'un quart de la vérité.'] },
    { id: 'c50', icon: '🧙', n: ['Half the Grimoire', 'La Moitié du Grimoire'], d: ['50 codes. the slime god follows YOU for updates.', '50 codes. le dieu slime TE suit pour les mises à jour.'], t: ['fifty whispers down.', 'cinquante murmures percés.'] },
    { id: 'c75', icon: '⚗️', n: ['Three Quarters Mad', 'Fou·folle aux Trois Quarts'], d: ['75 codes. you type in tongues.', '75 codes. tu tapes en langues anciennes.'], t: ['past the point of return.', 'passé le point de non-retour.'] },
    { id: 'c100', icon: '🏆', n: ['The Whole Grimoire', 'Le Grimoire Entier'], d: ['100 codes deep. the terminal bows. we\'re not worthy.', '100 codes au compteur. le terminal s\'incline. on n\'est pas dignes.'], t: ['all of them. all.', 'tous. absolument tous.'] },
    { id: 'gift10', icon: '🎁', m: 'gifts', v: 10, n: ['Reliable Patron', 'Mécène Fiable'], d: ['sent 10 stream gifts. the slime practices its surprised face.', 'a envoyé 10 cadeaux. le slime répète sa tête surprise.'], t: ['the gift row exists.', 'la rangée de cadeaux existe.'] },
    { id: 'gift50', icon: '💝', m: 'gifts', v: 50, n: ['Whale (Affectionate)', 'Baleine (Affectueuse)'], d: ['50 gifts. the stream economy is 80% you.', '50 cadeaux. l\'économie du stream, c\'est 80 % toi.'], t: ['fifty deliveries.', 'cinquante livraisons.'] },
    { id: 'gift200', icon: '🐋', m: 'gifts', v: 200, n: ['Central Bank of Cute', 'Banque Centrale du Mignon'], d: ['200 gifts. economists study your generosity curve.', '200 cadeaux. des économistes étudient ta courbe de générosité.'], t: ['two hundred parcels.', 'deux cents colis.'] },
    { id: 'fans100', icon: '📈', n: ['Triple Digit Famous', 'Célèbre à Trois Chiffres'], d: ['100 fans. paparazzi pixels spotted outside the habitat.', '100 fans. des pixels paparazzis rôdent devant l\'habitat.'], t: ['grow the fanbase.', 'fais grandir la fanbase.'] },
    { id: 'fans341', icon: '🌟', n: ['The 341 Club', 'Le Club des 341'], d: ['341 fans — the sacred number on the wall. coincidence? never.', '341 fans — le chiffre sacré du mur. coïncidence ? jamais.'], t: ['a very specific number.', 'un chiffre très précis.'] },
    { id: 'search5', icon: '🔍', m: 'searches', v: 5, n: ['Yongle Novice', 'Novice de Yongle'], d: ['5 searches. the engine blushed at your queries.', '5 recherches. le moteur a rougi devant tes requêtes.'], t: ['the browser searches.', 'le navigateur cherche.'] },
    { id: 'search25', icon: '🔎', m: 'searches', v: 25, n: ['Chief Query Officer', 'Directeur·rice des Requêtes'], d: ['25 searches. yongle IPO\'d on your curiosity.', '25 recherches. yongle est entré en bourse grâce à ta curiosité.'], t: ['ask the bar things.', 'pose des questions à la barre.'] },
    { id: 'search100', icon: '🛰️', m: 'searches', v: 100, n: ['Index Whisperer', 'Chuchoteur·se d\'Index'], d: ['100 searches. the index dreams about you.', '100 recherches. l\'index rêve de toi.'], t: ['one hundred questions.', 'cent questions.'] },
    { id: 'cmd10', icon: '⌨️', m: 'cmds', v: 10, n: ['Shell Comfortable', 'À l\'Aise dans le Shell'], d: ['ran 10 terminal commands. bash-adjacent behaviour.', 'a lancé 10 commandes. comportement bash-compatible.'], t: ['the terminal counts.', 'le terminal compte.'] },
    { id: 'cmd77', icon: '🖥️', m: 'cmds', v: 77, n: ['Prompt Poet', 'Poète du Prompt'], d: ['77 commands. your history reads like literature.', '77 commandes. ton historique se lit comme de la littérature.'], t: ['seventy-seven lines.', 'soixante-dix-sept lignes.'] },
    { id: 'cmd200', icon: '🧑‍💻', m: 'cmds', v: 200, n: ['Terminal Velocity', 'Vélocité Terminale'], d: ['200 commands. the prompt purrs when you focus it.', '200 commandes. le prompt ronronne quand tu le sélectionnes.'], t: ['two hundred enters.', 'deux cents entrées.'] },
    { id: 'win25', icon: '🪟', m: 'wins', v: 25, n: ['Window Shopper', 'Lèche-Fenêtres'], d: ['opened 25 windows. the window manager sent a fruit basket.', 'a ouvert 25 fenêtres. le gestionnaire a envoyé une corbeille de fruits.'], t: ['open things.', 'ouvre des choses.'] },
    { id: 'win100', icon: '🏢', m: 'wins', v: 100, n: ['Desktop Landlord', 'Proprio du Bureau'], d: ['100 windows opened. you charge them rent now.', '100 fenêtres ouvertes. tu leur factures un loyer.'], t: ['keep opening.', 'continue d\'ouvrir.'] },
    { id: 'win300', icon: '🌆', m: 'wins', v: 300, n: ['Skyline Architect', 'Architecte de la Skyline'], d: ['300 windows. urban planners cite your desktop.', '300 fenêtres. les urbanistes citent ton bureau.'], t: ['three hundred frames.', 'trois cents cadres.'] },
    { id: 'fits10', icon: '👒', m: 'fits', v: 10, n: ['Front Row at Fashion Week', 'Premier Rang à la Fashion Week'], d: ['witnessed 10 outfits. the slime never repeats a look. neither do you.', 'a vu 10 tenues. le slime ne répète jamais un look. toi non plus.'], t: ['the wardrobe rotates.', 'la garde-robe tourne.'] },
    { id: 'fits35', icon: '👗', m: 'fits', v: 35, n: ['Wardrobe Historian', 'Historien·ne de la Garde-robe'], d: ['35 outfits seen — one full rack. archived respectfully.', '35 tenues vues — un portant complet. archivé avec respect.'], t: ['a full collection.', 'une collection entière.'] },
    { id: 'fits150', icon: '🪞', m: 'fits', v: 150, n: ['Met Gala Correspondent', 'Correspondant·e du Met Gala'], d: ['150 fits reviewed. vogue.exe wants your column.', '150 tenues chroniquées. vogue.exe veut ta rubrique.'], t: ['watch. every. look.', 'observe. chaque. look.'] },
    { id: 'asks3', icon: '💬', m: 'asks', v: 3, n: ['Gentle Interrogator', 'Interrogateur·rice en Douceur'], d: ['asked the bot 3 things. it told its diary about you.', 'a posé 3 questions au bot. il a parlé de toi à son journal.'], t: ['the bot answers.', 'le bot répond.'] },
    { id: 'asks15', icon: '🎤', m: 'asks', v: 15, n: ['Press Conference Mode', 'Mode Conférence de Presse'], d: ['15 questions. the bot hired a publicist.', '15 questions. le bot a engagé un attaché de presse.'], t: ['keep asking.', 'continue de demander.'] },
    { id: 'asks50', icon: '🗞️', m: 'asks', v: 50, n: ['Investigative Journalist', 'Journaliste d\'Investigation'], d: ['50 questions. the exposé drops never (it\'s all wholesome).', '50 questions. le scandale ne sortira jamais (tout est adorable).'], t: ['fifty scoops.', 'cinquante scoops.'] },
    { id: 'wx_clear', icon: '☀️', n: ['Certified Sunbeam', 'Rayon de Soleil Certifié'], d: ['caught the stage in full sunshine. vitamin D: simulated.', 'a vu le plateau en plein soleil. vitamine D : simulée.'], t: ['Edmonton, on a good day.', 'Edmonton, un bon jour.'] },
    { id: 'wx_cloud', icon: '☁️', n: ['Cloud Inspector', 'Inspecteur·rice des Nuages'], d: ['watched the pixel clouds drift by. all of them passed inspection.', 'a regardé passer les nuages pixel. tous conformes.'], t: ['grey days count too.', 'les jours gris comptent aussi.'] },
    { id: 'wx_rain', icon: '🌧️', n: ['Drizzle Enjoyer', 'Amateur·rice de Bruine'], d: ['streamed through the rain. cozy levels: illegal.', 'a streamé sous la pluie. niveau cocon : illégal.'], t: ['it rains in the room.', 'il pleut dans la pièce.'] },
    { id: 'wx_snow', icon: '❄️', n: ['Blizzard Witness', 'Témoin du Blizzard'], d: ['saw Edmonton snow reach the stage. shovel not included.', 'a vu la neige d\'Edmonton atteindre le plateau. pelle non incluse.'], t: ['it snows indoors here.', 'ici, il neige en intérieur.'] },
    { id: 'wx_fog', icon: '🌫️', n: ['Mysterious Era Attendee', 'Présent·e à l\'Ère Mystérieuse'], d: ['attended a fog stream. saw nothing. loved everything.', 'a assisté à un stream de brouillard. n\'a rien vu. a tout adoré.'], t: ['some days are blurry.', 'certains jours sont flous.'] },
    { id: 'wx_thunder', icon: '⛈️', n: ['Free Drama Enjoyer', 'Amateur·rice de Drame Gratuit'], d: ['caught the thunder show. lighting design: nature.', 'a vu le spectacle de tonnerre. éclairage : la nature.'], t: ['storms visit the stage.', 'l\'orage visite le plateau.'] },
    { id: 'stormchaser', icon: '🌈', n: ['Full Forecast Bingo', 'Bingo Météo Complet'], d: ['witnessed all 6 weathers. Edmonton says: "that\'s just Tuesday".', 'a vu les 6 météos. Edmonton répond : « c\'est juste mardi ».'], t: ['collect every sky.', 'collectionne chaque ciel.'] },
    { id: 'w_heart_wand', icon: '💘', n: ['Wand Wielder', 'Porteur·se de Baguette'], d: ['equipped the heart wand. love at O(1).', 'a équipé la baguette-cœur. l\'amour en O(1).'], t: ['a weapon of love exists.', 'une arme d\'amour existe.'] },
    { id: 'w_bubble_blaster', icon: '🫧', n: ['Containerized', 'Conteneurisé·e'], d: ['equipped the bubble blaster. very docker of you.', 'a équipé le canon à bulles. très docker de ta part.'], t: ['bubbles are containers.', 'les bulles sont des conteneurs.'] },
    { id: 'w_baguette', icon: '🥖', n: ['Gluten-Driven Developer', 'Dev Piloté·e par le Gluten'], d: ['equipped the baguette launcher. très dangereuse.', 'a équipé le lance-baguette. très dangereuse.'], t: ['bread can be a weapon.', 'le pain peut être une arme.'] },
    { id: 'w_meow_cannon', icon: '🐱', n: ['Judgmental Artillery', 'Artillerie Réprobatrice'], d: ['equipped the keyboard-cat cannon. every shot is a code review.', 'a équipé le canon à chat-clavier. chaque tir est une code review.'], t: ['the cat fires opinions.', 'le chat tire des avis.'] },
    { id: 'w_rgb_sword', icon: '🌈', n: ['+9999 To Regret', '+9999 en Regret'], d: ['took the RGB Gamer Sword. it screamed UWU. you screamed too.', 'a pris l\'Épée Gamer RGB. elle a hurlé UWU. toi aussi.'], t: ['units unspecified…', 'unités non précisées…'] },
    { id: 'w_gold_hammer', icon: '🔨', n: ['Everything Is A Nail', 'Tout Est Un Clou'], d: ['took the Framework Hammer. bug spawns agreed enthusiastically.', 'a pris le Marteau à Frameworks. les bugs ont applaudi.'], t: ['hammers solve everything.', 'les marteaux résolvent tout.'] },
    { id: 'w_boba_straw', icon: '🧋', n: ['Terms & Conditions Sipped', 'Conditions Générales Sirotées'], d: ['took the Infinity Boba Straw. it was thirstier than you.', 'a pris la Paille de l\'Infini. elle avait plus soif que toi.'], t: ['zero fees. asterisk.', 'zéro frais. astérisque.'] },
    { id: 'w_legacy_blade', icon: '⚔️', n: ['Refactor? Never.', 'Refactorer ? Jamais.'], d: ['took the Legacy Codebase Blade. it fires comments. CHONK.', 'a pris la Lame du Code Légataire. elle tire des commentaires. CHONK.'], t: ['stability since 2009.', 'stable depuis 2009.'] },
    { id: 'w_ai_wand', icon: '🤖', n: ['Hallucination Handler', 'Gestionnaire d\'Hallucinations'], d: ['took the AI Wand. it aimed at your wallet. confidently.', 'a pris la Baguette IA. elle a visé ton portefeuille. avec assurance.'], t: ['it aims itself.', 'elle vise toute seule.'] },
    { id: 'w_css_staff', icon: '🎨', n: ['!important Person', 'Personne !important'], d: ['took the Staff of !important. physics got overridden.', 'a pris le Bâton de !important. la physique a été override.'], t: ['one flick overrides all.', 'un geste override tout.'] },
    { id: 'w_vim_katana', icon: '🗡️', n: ['Cannot Exit', 'Sortie Impossible'], d: ['took the Vim Katana. you are still holding it. forever.', 'a pris le Katana Vim. tu le tiens encore. pour toujours.'], t: [':q! does nothing here.', ':q! ne fait rien ici.'] },
    { id: 'w_crypto_pickaxe', icon: '⛏️', n: ['To The Moon (Alone)', 'Vers la Lune (Sans Toi)'], d: ['took the Web3 Pickaxe. it mined YOUR coins. visionary.', 'a pris la Pioche Web3. elle a miné TES pièces. visionnaire.'], t: ['passive income (whose?)', 'revenu passif (pour qui ?)'] },
    { id: 'armory', icon: '🛡️', n: ['Gotta Wield Them All', 'Attrapez-les Toutes'], d: ['wielded 4+ different weapons. the armory sends holiday cards.', 'a manié 4+ armes différentes. l\'armurerie envoie des cartes de vœux.'], t: ['collect the arsenal.', 'collectionne l\'arsenal.'] },
    { id: 'geese5', icon: '🪿', m: 'geese', v: 5, n: ['Flock Acquaintance', 'Connaissance du Vol'], d: ['5 goose flotillas witnessed. they nod at you now.', '5 flottilles de bernaches vues. elles te saluent maintenant.'], t: ['they keep coming.', 'elles reviennent sans cesse.'] },
    { id: 'geese20', icon: '🦢', m: 'geese', v: 20, n: ['Honorary Gosling', 'Oison Honoraire'], d: ['20 flocks. the parents let you swim in formation.', '20 vols. les parents te laissent nager en formation.'], t: ['twenty parades.', 'vingt parades.'] },
    { id: 'geese100', icon: '👑', m: 'geese', v: 100, n: ['Goose Sovereign', 'Souverain·e des Bernaches'], d: ['100 flocks. Edmonton\'s true landlords pay YOU rent now.', '100 vols. les vrais proprios d\'Edmonton TE paient un loyer.'], t: ['one hundred honks.', 'cent honks.'] },
    { id: 'plucks1', icon: '🌱', m: 'plucks', v: 1, n: ['Petal Parent', 'Parent Pétale'], d: ['plucked your first pikmin. it said "pik". you cried a little.', 'a cueilli ton premier pikmin. il a dit « pik ». tu as un peu pleuré.'], t: ['the meadow sprouts.', 'la prairie bourgeonne.'] },
    { id: 'plucks20', icon: '🌷', m: 'plucks', v: 20, n: ['Nursery Operator', 'Exploitant·e de Pépinière'], d: ['20 plucks. the garden considers you weather.', '20 cueillettes. le jardin te considère comme une météo.'], t: ['keep pulling sprouts.', 'continue de cueillir.'] },
    { id: 'plucks50', icon: '🌻', m: 'plucks', v: 50, n: ['Agricultural Legend', 'Légende Agricole'], d: ['50 plucks. the meadow named a harvest festival after you.', '50 cueillettes. la prairie a créé une fête des récoltes à ton nom.'], t: ['fifty little pik!s.', 'cinquante petits pik !'] },
    { id: 'blooms3', icon: '🌸', m: 'blooms', v: 3, n: ['Bloom Coordinator', 'Coordinateur·rice de Floraison'], d: ['3 buddies bloomed. proudest scrollbar moment of your life.', '3 copains ont fleuri. le moment le plus fier de ta barre de défilement.'], t: ['they grow up so fast.', 'ils grandissent si vite.'] },
    { id: 'blooms6', icon: '💐', m: 'blooms', v: 6, n: ['Full Bouquet', 'Bouquet Complet'], d: ['6 blooms raised. the garden filed you under "sunlight".', '6 floraisons élevées. le jardin te classe sous « lumière du soleil ».'], t: ['bloom the whole squad.', 'fais fleurir toute l\'escouade.'] },
    { id: 'blooms12', icon: '🏵️', m: 'blooms', v: 12, n: ['Generational Gardener', 'Jardinier·ère Générationnel·le'], d: ['12 blooms across generations. flowers tell stories about you.', '12 floraisons sur plusieurs générations. les fleurs racontent tes exploits.'], t: ['a dozen flowerings.', 'une douzaine de floraisons.'] },
    { id: 'live5', icon: '📺', m: 'lives', v: 5, n: ['Season Ticket Holder', 'Abonné·e de la Saison'], d: ['attended 5 live streams. front row. always.', 'a assisté à 5 directs. premier rang. toujours.'], t: ['the show goes on.', 'le show continue.'] },
    { id: 'ad1', icon: '📼', m: 'ads', v: 1, n: ['Capitalism Enjoyer', 'Amateur·rice de Capitalisme'], d: ['watched the fake ad to revive. the sponsor (nobody) thanks you.', 'a regardé la fausse pub pour ressusciter. le sponsor (personne) te remercie.'], t: ['death has a loophole.', 'la mort a une faille.'] },
    { id: 'ad3', icon: '🍿', m: 'ads', v: 3, n: ['Ad Break Connoisseur', 'Connaisseur·se de Coupures Pub'], d: ['3 ads watched. you quote the boba jingle at parties.', '3 pubs regardées. tu cites le jingle boba en soirée.'], t: ['the skits rotate.', 'les sketchs tournent.'] },
    { id: 'nmwins2', icon: '🎖️', m: 'nmwins', v: 2, n: ['Recurring Dream Therapist', 'Thérapeute des Rêves Récurrents'], d: ['debugged 2 nightmares. the sleepwalker books you monthly now.', 'a débogué 2 cauchemars. le somnambule te consulte chaque mois.'], t: ['nightmares repeat.', 'les cauchemars récidivent.'] },
    { id: 'visits3', icon: '🚪', n: ['Return Customer', 'Client·e qui Revient'], d: ['3 visits. the desktop leaves the porch light on for you.', '3 visites. le bureau laisse la lumière du porche allumée pour toi.'], t: ['come back twice more.', 'reviens encore deux fois.'] },
    { id: 'visits10', icon: '🏠', n: ['Basically A Roommate', 'Quasiment Coloc'], d: ['10 visits. your name is on the pixel mailbox.', '10 visites. ton nom est sur la boîte aux lettres pixel.'], t: ['ten doorbells.', 'dix sonnettes.'] },
    { id: 'visits30', icon: '🔑', n: ['Keys To The OS', 'Les Clés de l\'OS'], d: ['30 visits. you know where the spare key is (under the taskbar).', '30 visites. tu sais où est le double des clés (sous la barre des tâches).'], t: ['thirty homecomings.', 'trente retours.'] },
    { id: 'afterhours', icon: '🌃', n: ['After Hours Visitor', 'Visiteur·se d\'Après Minuit'], d: ['visited between midnight and 5am. the slime pretended to be asleep.', 'a visité entre minuit et 5 h. le slime a fait semblant de dormir.'], t: ['some hours are secret.', 'certaines heures sont secrètes.'] },
    { id: 'earlybird', icon: '🌅', n: ['Dawn Patrol', 'Patrouille de l\'Aube'], d: ['visited before 8am. the geese were still stretching.', 'a visité avant 8 h. les bernaches s\'étiraient encore.'], t: ['dawn counts double.', 'l\'aube compte double.'] },
    { id: 'zergling', icon: '🐛', n: ['Rush Hour', 'Heure de Pointe'], d: ['summoned the zerg rush. the desktop survived. barely.', 'a invoqué le zerg rush. le bureau a survécu. de justesse.'], t: ['a classic RTS panic.', 'une panique RTS classique.'] },
    { id: 'neo', icon: '🕶️', n: ['There Is No Slime', 'Il N\'y A Pas de Slime'], d: ['entered the matrix. the falling glyphs were pink. of course.', 'est entré·e dans la matrice. les glyphes étaient roses. évidemment.'], t: ['follow the pink rabbit.', 'suis le lapin rose.'] },
    { id: 'search250', icon: '🌐', m: 'searches', v: 250, n: ['The Algorithm Itself', 'L\'Algorithme Incarné'], d: ['250 searches. yongle asks YOU for autocomplete.', '250 recherches. yongle TE demande l\'autocomplétion.'], t: ['become the index.', 'deviens l\'index.'] },
    { id: 'cmd500', icon: '🧠', m: 'cmds', v: 500, n: ['Shell of Theseus', 'Shell de Thésée'], d: ['500 commands. at what point did you become the terminal?', '500 commandes. à quel moment es-tu devenu·e le terminal ?'], t: ['five hundred prompts.', 'cinq cents prompts.'] },
    { id: 'gift500', icon: '🎆', m: 'gifts', v: 500, n: ['GDP Contributor', 'Contributeur·rice au PIB'], d: ['500 gifts. the stream economy issued you a passport.', '500 cadeaux. l\'économie du stream t\'a délivré un passeport.'], t: ['five hundred parcels.', 'cinq cents colis.'] },
    { id: 'nap300', icon: '🌌', m: 'naps', v: 300, n: ['Curator of Dreams', 'Conservateur·rice des Rêves'], d: ['300 naps curated. the dream museum has a you-shaped statue.', '300 siestes organisées. le musée du rêve a une statue à ton effigie.'], t: ['three hundred lullabies.', 'trois cents berceuses.'] },
    { id: 'jump100', icon: '🐇', m: 'jumps', v: 100, n: ['Bunny Apprentice', 'Apprenti·e Lapin'], d: ['100 jumps. the rabbits accepted your application.', '100 sauts. les lapins ont accepté ta candidature.'], t: ['the first hundred hops.', 'les cent premiers bonds.'] },
    { id: 'chameleon', icon: '🦎', n: ['The Impossible Shade', 'La Teinte Impossible'], d: ['plucked the hidden CHAMELEON pikmin — it refuses to pick a colour. mood.', 'a cueilli le pikmin CAMÉLÉON caché — il refuse de choisir une couleur. tellement relatable.'], t: ['1 in 10 sprouts hides a secret.', '1 pousse sur 10 cache un secret.'] },
    { id: 'colorpicker', icon: '🎨', n: ['Color Picker', 'Pipette à Couleurs'], d: ['25% of the hue wheel collected. the eyedropper nods, professionally.', '25 % de la roue chromatique. la pipette hoche la tête, en pro.'], t: ['pluck across the rainbow.', 'cueille à travers l\'arc-en-ciel.'] },
    { id: 'halftone', icon: '🖨️', n: ['Halftone Hero', 'Héros du Demi-Ton'], d: ['half the hue wheel. serious print-shop energy.', 'la moitié de la roue. sérieuse énergie d\'imprimerie.'], t: ['the wheel is half full.', 'la roue est à moitié pleine.'] },
    { id: 'truecolor', icon: '🌈', n: ['TRUE COLOR', 'TRUE COLOR'], d: ['all 50 wheel segments — the fifty shades of hue, every last one home.', 'les 50 segments — les cinquante nuances de teinte, toutes rentrées.'], t: ['fifty shades. of hue. you see where this goes.', 'cinquante nuances. de teinte. tu vois où ça mène.'] },
    { id: 'censored', icon: '🧼', n: ['Family Friendly', 'Adapté aux Familles'], d: ['tried to swear on an arcade board. the soap won.', 'a tenté de jurer sur une borne d\'arcade. le savon a gagné.'], t: ['the slime has standards.', 'le slime a des principes.'] },
    { id: 'bsod', icon: '💖', n: ['Pink Screen of Death', 'Écran Rose de la Mort'], d: ['crashed the whole OS into a wall of pink. it un-crashed on request.', 'a planté l\'OS entier dans un mur de rose. il s\'est déplanté sur demande.'], t: ['the red dot is not decorative.', 'le point rouge n\'est pas décoratif.'] },
    { id: 'whale', icon: '🐋', n: ['Certified Whale', 'Baleine Certifiée'], d: ['sent 50 lifetime gifts. the slime is shopping for a bigger stage.', 'a envoyé 50 cadeaux en tout. le slime cherche une plus grande scène.'], t: ['gifts add up. all of them.', 'les cadeaux s\'additionnent. tous.'] },
    { id: 'spamlord', icon: '📦', n: ['Storm Herald', 'Héraut de la Tempête'], d: ['triggered 3 gift storms. the slime\'s union sends its regards.', 'a déclenché 3 tempêtes de cadeaux. le syndicat du slime envoie ses amitiés.'], t: ['too many gifts, too fast. three times.', 'trop de cadeaux, trop vite. trois fois.'] },
    { id: 'clingy', icon: '📌', n: ['Load-Bearing Bookmark', 'Marque-Page Porteur'], d: ['pressed save 10 times in one visit. the bookmark holds the site up now.', 'a appuyé 10 fois sur « sauvegarder » en une visite. le marque-page soutient le site.'], t: ['save. again. and again…', 'sauvegarde. encore. et encore…'] },
    { id: 'greedy', icon: '🧾', n: ['Audited by the Tax Slime', 'Contrôlé·e par le Slime Fiscal'], d: ['re-submitted the same cheat until the tax slime showed up: 0 coins.', 'a resoumis la même triche jusqu\'à l\'arrivée du slime fiscal : 0 pièce.'], t: ['greed has diminishing returns.', 'l\'avidité a des rendements décroissants.'] },
    { id: 'robot', icon: '🤖', n: ['beep boop?', 'bip boup ?'], d: ['typed faster than any human should. the shell asked to see some ID.', 'a tapé plus vite qu\'aucun humain. le shell a demandé une pièce d\'identité.'], t: ['type. very. fast.', 'tape. très. vite.'] },
    { id: 'haxx', icon: '🛡️', n: ['hacker-chan', 'hacker-chan'], d: ['tried an injection on a textContent-pilled search bar. 0 rows dropped.', 'a tenté une injection sur une barre blindée au textContent. 0 table supprimée.'], t: ['the search bar has seen things.', 'la barre de recherche en a vu d\'autres.'] },
    { id: 'yue', icon: '🥟', n: ['Gwong Dung Waa', 'Gwong Dung Waa'], d: ['asked the terminal for Cantonese. it tried its very best ♡', 'a demandé le cantonais au terminal. il a fait de son mieux ♡'], t: ['the shell speaks more languages than it admits.', 'le shell parle plus de langues qu\'il ne l\'avoue.'] },
    { id: 'archmage', icon: '🔮', n: ['MEGA Archmage', 'Archimage MÉGA'], d: ['discovered all 8 MEGA spells in the gift grimoire. the stage bows.', 'a découvert les 8 sorts MÉGA du grimoire à cadeaux. la scène s\'incline.'], t: ['some emojis are blessed. find all 8 blessings.', 'certains emojis sont bénis. trouve les 8 bénédictions.'] },
    { id: 'truefan', icon: '💌', n: ['On a First-Name Basis', 'On Se Tutoie'], d: ['typed her name like a spell. the whole squad paraded for it.', 'a tapé son nom comme un sort. toute l\'escouade a défilé.'], t: ['the OS answers to a name.', 'l\'OS répond à un nom.'] },
    { id: 'nihao', icon: '🀄', n: ['Nǐ Hǎo, World', 'Nǐ Hǎo, World'], d: ['said hello in Chinese. the meadow understood perfectly.', 'a dit bonjour en chinois. la prairie a parfaitement compris.'], t: ['greet the OS like home.', 'salue l\'OS comme à la maison.'] },
    { id: 'vimescape', icon: '🚪', n: ['Vim Escapee', 'Évadé·e de Vim'], d: ['entered vim. LEFT vim. statistically a legend.', 'est entré·e dans vim. en est SORTI·E. statistiquement une légende.'], t: ['some editors are one-way doors.', 'certains éditeurs sont des portes sans retour.'] },
    { id: 'handtalk', icon: '🖐', n: ['Signed, Understood', 'Signé, Compris'], d: ['spoke to the slime in GESTURES. the hand-cam read every word.', 'a parlé au slime en GESTES. la main-cam a tout lu.'], t: ['the camera reads more than faces.', 'la caméra lit plus que les visages.'] },
    { id: 'hearthands', icon: '🫶', n: ['Certified Hand Heart', 'Cœur de Mains Certifié'], d: ['made the two-handed heart. the slime is legally yours now.', 'a fait le cœur à deux mains. le slime est légalement à toi.'], t: ['some gestures need both hands.', 'certains gestes demandent les deux mains.'] },
    { id: 'hotfix', icon: '🧯', n: ['Merge Conflict Medic', 'Médecin des Conflits de Merge'], d: ['hot-patched a melting production site in under 15 seconds. inside a dream.', 'a réparé à chaud un site en fusion en moins de 15 secondes. dans un rêve.'], t: ['when the nightmare breaks the site, someone has to ship the fix.', 'quand le cauchemar casse le site, quelqu\'un doit livrer le correctif.'] },
    { id: 'evolve', icon: '🌺', n: ['Second Bloom', 'Seconde Floraison'], d: ['merged enough duplicates that a pikmin EVOLVED into form ★★.', 'a fusionné assez de doublons pour qu\'un pikmin ÉVOLUE en forme ★★.'], t: ['catch the same kind again. and again. something blooms.', 'attrape la même espèce encore. et encore. quelque chose fleurit.'] },
    { id: 'apex', icon: '👑', n: ['Apex Gardener', 'Jardinier Apex'], d: ['raised a pikmin to its APEX form. it wears the crown now.', 'a mené un pikmin à sa forme APEX. il porte la couronne désormais.'], t: ['the third form exists. few have seen it.', 'la troisième forme existe. peu l\'ont vue.'] },
    { id: 'evermore', icon: '♾️', n: ['The Meadow Never Sleeps', 'La Prairie Ne Dort Jamais'], d: ['kept collecting after 72/72 — ten dupes and counting. true devotion.', 'a continué après 72/72 — dix doublons et ça continue. dévotion véritable.'], t: ['completion was never the end.', 'compléter n\'a jamais été la fin.'] },
    { id: 'wristslime', icon: '⌚', n: ['Wrist-Mounted Slime', 'Slime de Poignet'], d: ['paired a smartwatch. the slime now lives on your wrist too.', 'a appairé une montre connectée. le slime vit aussi à ton poignet.'], t: ['the OS fits on a wrist. try the terminal.', 'l\'OS tient sur un poignet. essaie le terminal.'] },
    { id: 'wristfarmer', icon: '🌾', n: ['Wrist Farmer', 'Fermier de Poignet'], d: ['plucked a pikmin FROM A WATCH and it synced home. agriculture, miniaturized.', 'a cueilli un pikmin DEPUIS UNE MONTRE, synchronisé maison. l\'agriculture, miniaturisée.'], t: ['the wrist garden feeds the same meadow.', 'le jardin de poignet nourrit la même prairie.'] },
    { id: 'gitgud', icon: '🌿', n: ['Git Gud', 'Git Gud'], d: ['ran five different git commands in a terminal that lives inside a website.', 'a lancé cinq commandes git dans un terminal qui vit dans un site web.'], t: ['the terminal speaks fluent git. test its accent.', 'le terminal parle git couramment. teste son accent.'] },
    { id: 'stargazer', icon: '⭐', n: ['Counted Among Stars', 'Compté Parmi les Étoiles'], d: ['the star counter moved while you were around. the terminal noticed. it always notices.', 'le compteur d\'étoiles a bougé en ta présence. le terminal l\'a vu. il voit tout.'], t: ['some buttons on github echo all the way back here.', 'certains boutons de github résonnent jusqu\'ici.'] },
    { id: 'gitfollow', icon: '💚', n: ['Follower of the Way', 'Disciple de la Voie'], d: ['the follower counter climbed while you were around. adopted forever.', 'le compteur d\'abonnés a grimpé en ta présence. adopté·e pour toujours.'], t: ['following someone is a kind of spell too.', 'suivre quelqu\'un est aussi une sorte de sort.'] },
    { id: 'redpill', icon: '🐇', n: ['Followed the Pink Rabbit', 'A Suivi le Lapin Rose'], d: ['arrived through the mysterious little command. the desktop has you now.', 'est arrivé·e par la mystérieuse petite commande. le bureau te tient désormais.'], t: ['somewhere on github, a readme whispers a command.', 'quelque part sur github, un readme murmure une commande.'] },
    { id: 'ctfslime', icon: '🚩', n: ['Capture the Slime', 'Capture le Slime'], d: ['decoded key.enc at the door instead of just reading the hint. certified hacker-chan.', 'a décodé key.enc à la porte au lieu de lire l\'indice. hacker-chan certifié·e.'], t: ['the door has a puzzle for the brave. `ls` first.', 'la porte cache une énigme pour les braves. `ls` d\'abord.'] },
    { id: 'comboking', icon: '🎯', n: ['Ultra Combo Patron', 'Mécène Ultra Combo'], d: ['landed a ×5 gift combo. the stage shook. the union filed a compliment.', 'a aligné un combo cadeau ×5. la scène a tremblé. le syndicat a déposé un compliment.'], t: ['the same gift, fast, five times. the stage remembers.', 'le même cadeau, vite, cinq fois. la scène s\'en souvient.'] },
    { id: 'paparazzi', icon: '📸', n: ['Meadow Paparazzi', 'Paparazzi de la Prairie'], d: ['shot the slime on stage — 3, 2, 1, flash, framed, timestamped.', 'a photographié le slime sur scène — 3, 2, 1, flash, encadré, horodaté.'], t: ['gift a 📷 in the live room. the slime has a good side. all sides.', 'offre un 📷 au salon live. le slime a un bon profil. tous.'] },
    { id: 'selfiestar', icon: '🤳', n: ['Framed Together', 'Encadrés Ensemble'], d: ['took a selfie WITH the slime. it photobombed with honor. never uploaded.', 'a pris un selfie AVEC le slime. photobomb honorable. jamais téléversé.'], t: ['sometimes after a photo, the slime asks a question.', 'parfois après une photo, le slime pose une question.'] },
    { id: 'wallfamous', icon: '🌍', n: ['Framed Worldwide', 'Encadré·e Mondialement'], d: ['hung a selfie on the REAL worldwide wall. publicly, proudly, consensually.', 'a accroché un selfie sur le VRAI mur mondial. publiquement, fièrement, avec consentement.'], t: ['the wall is real now. it has a bouncer and everything.', 'le mur est réel désormais. il a même un videur.'] }
  ];

  // ---- metric engine: count things, achievements pop themselves ----
  function achvBump(metric, n) {
    const m = store.get('yos-metrics', {});
    m[metric] = (m[metric] || 0) + (n || 1);
    store.set('yos-metrics', m);
    ACHV.forEach((a) => { if (a.m === metric && m[metric] >= (a.v || 1)) achvUnlock(a.id); });
    return m[metric];
  }
  function achvMetric(metric) { return store.get('yos-metrics', {})[metric] || 0; }

  var achvCounts = null;
  var achvCountsAt = 0;
  var achvCountsPending = null; // one census at a time, please
  var achvToastTimer = null;

  function achvToastShow(a) {
    let el = document.getElementById('achv-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'achv-toast';
      el.className = 'achv-toast';
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.title = trT('click to open the achievement wall', 'clic : ouvrir le mur des succès');
      el.addEventListener('click', () => {
        el.classList.remove('achv-show');
        if (achvToastTimer) clearTimeout(achvToastTimer);
        openWindow('win-leaderboard');
        setTimeout(() => { // glide the wall into view below the leaderboard
          const body = document.querySelector('#win-leaderboard .window-body');
          const grid = document.getElementById('lb-achv-grid');
          if (body && grid) body.scrollTop = Math.max(0, grid.offsetTop - 64);
        }, 160);
      });
      document.body.appendChild(el);
    }
    el.innerHTML = '';
    const top = document.createElement('span');
    top.className = 'achv-toast-top';
    top.textContent = trT('🏅 ACHIEVEMENT UNLOCKED', '🏅 SUCCÈS DÉBLOQUÉ');
    const name = document.createElement('span');
    name.className = 'achv-toast-name';
    name.textContent = `${a.icon} ${L(a.n)}`;
    el.append(top, name);
    el.classList.remove('achv-show');
    void el.offsetWidth;
    el.classList.add('achv-show');
    playTone(1046.5, 'triangle', 0.14, 0, 0.05);
    playTone(1318.51, 'triangle', 0.2, 0.12, 0.05);
    if (achvToastTimer) clearTimeout(achvToastTimer);
    achvToastTimer = setTimeout(() => el.classList.remove('achv-show'), 4200);
  }

  function achvUnlock(id, quiet, skipRemote) {
    if (!ACHV) return;
    const a = ACHV.find((x) => x.id === id);
    if (!a) return;
    const got = store.get('yos-achv', {});
    if (got[id]) return;
    got[id] = Date.now();
    store.set('yos-achv', got);
    if (!quiet) achvToastShow(a);
    // some trophies come with merch: announce the freshly unlocked fit
    const fit = {
      goose: ['new fit unlocked: 🪿 propeller cap ♡', 'nouvelle tenue : 🪿 casquette à hélice ♡'],
      stormchaser: ['new fit unlocked: ☔ mushroom umbrella cap ♡', 'nouvelle tenue : ☔ chapeau-champignon parapluie ♡'],
      nightowl: ['new fit unlocked: 🌙 classic nightcap ♡', 'nouvelle tenue : 🌙 bonnet de nuit classique ♡']
    }[id];
    if (fit && !quiet) setTimeout(() => showToast(trT(fit[0], fit[1])), 2600);
    if (achvCounts && typeof achvCounts[id] === 'number') achvCounts[id]++;
    // skipRemote: cloud-restored unlocks were already counted on the original device
    if (navigator.onLine && !skipRemote) fetch(`${ACHV_API}/hit/${ACHV_NS}/achv-${id}`).catch(() => {});
    cloudQueueSync();
    const lb = document.getElementById('win-leaderboard');
    if (lb && !lb.classList.contains('window-closed')) renderAchievements();
  }

  function achvFetchCounts() {
    if (achvCounts && Date.now() - achvCountsAt < 120000) return Promise.resolve(achvCounts);
    // 10-minute disk cache — reopening the hall shouldn't re-poll the world
    const cached = store.get('yos-achv-counts-cache', null);
    if (cached && cached.at && Date.now() - cached.at < 600000 && cached.counts) {
      achvCounts = cached.counts;
      achvCountsAt = cached.at;
      return Promise.resolve(achvCounts);
    }
    if (!navigator.onLine) return Promise.resolve(null);
    if (achvCountsPending) return achvCountsPending;
    // polite census: max 8 requests in flight instead of ~140 at once
    const ids = ACHV.map((a) => a.id);
    const vals = new Array(ids.length).fill(0);
    let next = 0;
    const worker = () => {
      const i = next++;
      if (i >= ids.length) return Promise.resolve();
      return fetch(`${ACHV_API}/get/${ACHV_NS}/achv-${ids[i]}`)
        .then((r) => (r.ok ? r.json() : { value: 0 }))
        .then((d) => { vals[i] = Math.max(0, Number(d.value) || 0); })
        .catch(() => { vals[i] = 0; })
        .then(worker);
    };
    achvCountsPending = Promise.all(Array.from({ length: 8 }, worker)).then(() => {
      achvCounts = {};
      ids.forEach((id, i) => { achvCounts[id] = vals[i]; });
      achvCountsAt = Date.now();
      store.set('yos-achv-counts-cache', { at: achvCountsAt, counts: achvCounts });
      achvCountsPending = null;
      return achvCounts;
    }).catch(() => { achvCountsPending = null; return null; });
    return achvCountsPending;
  }

  function renderAchievements() {
    const grid = document.getElementById('lb-achv-grid');
    const note = document.getElementById('lb-achv-note');
    if (!grid) return;
    const got = store.get('yos-achv', {});
    const n = ACHV.filter((a) => got[a.id]).length;
    if (note) note.textContent = trT(`${n}/${ACHV.length} unlocked — the rest are the slime's little secrets`, `${n}/${ACHV.length} débloqués — le reste, ce sont les petits secrets du slime`);
    grid.innerHTML = '';
    ACHV.forEach((a) => {
      const has = !!got[a.id];
      const card = document.createElement('div');
      card.className = 'achv-card' + (has ? ' is-got' : ' is-locked');
      const ic = document.createElement('span');
      ic.className = 'achv-icon';
      ic.textContent = has ? a.icon : '❓';
      const body = document.createElement('div');
      body.className = 'achv-body';
      const nm = document.createElement('div');
      nm.className = 'achv-name';
      nm.textContent = has ? L(a.n) : '??????';
      const ds = document.createElement('div');
      ds.className = 'achv-desc';
      ds.textContent = has ? L(a.d) : L(a.t);
      body.append(nm, ds);
      if (has) {
        const gl = document.createElement('div');
        gl.className = 'achv-global';
        const c = achvCounts && achvCounts[a.id];
        gl.textContent = (typeof c === 'number' && c > 0)
          ? trT(`🌍 ${c} slimer${c === 1 ? '' : 's'} worldwide ${c === 1 ? 'has' : 'have'} this`, `🌍 ${c} slimer${c > 1 ? 's' : ''} dans le monde ${c > 1 ? "l'ont" : "l'a"}`)
          : trT('🌍 counting fellow slimers…', '🌍 recensement des slimers…');
        body.appendChild(gl);
      }
      card.append(ic, body);
      grid.appendChild(card);
    });
    if (!achvCounts) achvFetchCounts().then((c) => { if (c) renderAchievements(); });
    renderSpellbook(); // the MEGA grimoire lives right under the trophies
    cloudRenderPanel();
  }

  // retro-credit past deeds (quietly — no toast storm at boot)
  (function achvBackfill() {
    if (store.get('yos-cheats-found', []).length) achvUnlock('spellcaster', true);
    if (Object.keys(store.get('yos-cheat-renames', {})).length) achvUnlock('spellsmith', true);
    if (store.get('yos-liked', false)) achvUnlock('liked', true);
    if (store.get('yos-lb', []).length) achvUnlock('top10', true);
    if (store.get('yos-fed-count', 0) >= 10) achvUnlock('sugarparent', true);
  })();

  /* =====================================================
     CLOUD SAVE — arcade password edition.
     Every player gets a permanent save slot in the backend
     (one Abacus counter, writable only with the player's own
     admin key). Achievements bitmask + hi-score + cheat census
     + fan count are packed into a single 53-bit-safe integer.
     The save code `SLIME-{uid}-{key}` restores everything on
     any browser or device — localStorage is only a cache.
     ===================================================== */
  const SAVE_B_HI = 262144;         // 2^18 — bits 0-17: achievements
  const SAVE_B_CH = 34359738368;    // 2^35 — bits 18-34: hi-score
  const SAVE_B_FN = 4398046511104;  // 2^42 — bits 35-41: cheats found
  const SAVE_CAP = { hi: 131000, ch: 100, fn: 2000 };

  var cloudSlot = store.get('yos-cloud', null); // { uid, key }
  var cloudState = 'idle'; // idle | creating | synced | offline | error
  var cloudTimer = null;
  var cloudLastPacked = -1;

  function achvBits() {
    const got = store.get('yos-achv', {});
    let bits = 0;
    ACHV.forEach((a, i) => { if (got[a.id]) bits += Math.pow(2, i); });
    return bits;
  }

  function cheatCensus() {
    return Math.max(store.get('yos-cheats-found', []).length, store.get('yos-cheats-cloudn', 0));
  }

  function packSave() {
    const hi = Math.min(store.get('yos-runner-hi', 0), SAVE_CAP.hi);
    const ch = Math.min(cheatCensus(), SAVE_CAP.ch);
    const fn = Math.min(Math.max(pet.followers || 0, 0), SAVE_CAP.fn);
    return achvBits() + hi * SAVE_B_HI + ch * SAVE_B_CH + fn * SAVE_B_FN;
  }

  function unpackSave(v) {
    v = Math.max(0, Math.floor(Number(v) || 0));
    const fn = Math.floor(v / SAVE_B_FN); v -= fn * SAVE_B_FN;
    const ch = Math.floor(v / SAVE_B_CH); v -= ch * SAVE_B_CH;
    const hi = Math.floor(v / SAVE_B_HI);
    const bits = v % SAVE_B_HI;
    return { bits, hi, ch, fn };
  }

  function cloudCode() {
    return cloudSlot ? `SLIME-${cloudSlot.uid}-${cloudSlot.key}` : null;
  }

  function cloudEnsure() {
    if (cloudSlot) return Promise.resolve(cloudSlot);
    if (cloudState === 'creating' || !navigator.onLine) return Promise.resolve(null);
    cloudState = 'creating';
    const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const uid = Array.from({ length: 6 }, () => ABC[Math.floor(Math.random() * ABC.length)]).join('');
    return fetch(`${ACHV_API}/create/${ACHV_NS}/sv2-${uid}`, { method: 'POST' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!d || !d.admin_key) throw new Error('no key');
        cloudSlot = { uid, key: d.admin_key };
        store.set('yos-cloud', cloudSlot);
        cloudState = 'idle';
        return cloudSlot;
      })
      .catch(() => { cloudState = 'error'; return null; });
  }

  function cloudSyncNow() {
    if (!navigator.onLine) { cloudState = 'offline'; cloudRenderPanel(); return; }
    cloudEnsure().then((cs) => {
      if (!cs) { cloudRenderPanel(); return; }
      const v = packSave();
      if (v === cloudLastPacked) { cloudState = 'synced'; cloudExtraSync(); cloudRenderPanel(); return; }
      fetch(`${ACHV_API}/set/${ACHV_NS}/sv2-${cs.uid}?value=${v}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cs.key}` }
      })
        .then((r) => {
          if (!r.ok) throw new Error('set failed');
          cloudLastPacked = v;
          cloudState = 'synced';
          cloudExtraSync(); // bits 18-127 + the spell-rename strings
        })
        .catch(() => { cloudState = 'error'; })
        .then(() => cloudRenderPanel());
    });
  }

  function cloudQueueSync() {
    if (cloudTimer) clearTimeout(cloudTimer);
    cloudTimer = setTimeout(cloudSyncNow, 4000);
  }

  function cloudApplyRemote(v) {
    const s = unpackSave(v);
    ACHV.forEach((a, i) => {
      if (Math.floor(s.bits / Math.pow(2, i)) % 2 === 1) achvUnlock(a.id, true, true);
    });
    if (s.hi > store.get('yos-runner-hi', 0)) {
      store.set('yos-runner-hi', s.hi);
      try { if (GAME) GAME.hi = s.hi; } catch (e) { /* pre-boot */ }
    }
    if (s.ch > cheatCensus()) store.set('yos-cheats-cloudn', s.ch);
    if (s.fn > (pet.followers || 0)) { pet.followers = s.fn; updateSlimeHud(); }
    setTimeout(() => { try { cloudExtraPull(); } catch (e) { /* annex optional */ } }, 400);
  }

  function cloudRestore(rawCode) {
    const code = String(rawCode || '').trim().replace(/\s+/g, '');
    const m = code.match(/^slime-([a-z0-9]{6})-([a-z0-9-]{10,})$/i);
    if (!m) return Promise.resolve('badcode');
    const uid = m[1].toUpperCase();
    const key = m[2].toLowerCase();
    return fetch(`${ACHV_API}/get/${ACHV_NS}/sv2-${uid}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!d || typeof d.value !== 'number') throw new Error('no slot');
        cloudSlot = { uid, key };
        store.set('yos-cloud', cloudSlot);
        cloudApplyRemote(d.value);
        cloudLastPacked = -1;
        cloudSyncNow(); // push the merged state straight back
        return 'ok';
      })
      .catch(() => 'notfound');
  }

  /* ---------- cloud annex: 128 achievement bits + the spell-rename
     table (strings!), all on the same Abacus backend. Extra counters
     live beside the main slot; write keys are created lazily and
     cached; reads are public, so any device can restore. ---------- */
  const CLOUD_ALPHA = ' abcdefghijklmnopqrstuvwxyz0123456789|~';
  function cloudKeyFor(name) {
    const keys = store.get('yos-cloud-keys', {});
    if (keys[name]) return Promise.resolve(keys[name]);
    return fetch(`${ACHV_API}/create/${ACHV_NS}/${name}`, { method: 'POST' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!d || !d.admin_key) throw new Error('no key');
        keys[name] = d.admin_key;
        store.set('yos-cloud-keys', keys);
        return d.admin_key;
      });
  }
  function cloudSet(name, v) {
    return cloudKeyFor(name).then((key) =>
      fetch(`${ACHV_API}/set/${ACHV_NS}/${name}?value=${v}`, { method: 'POST', headers: { Authorization: `Bearer ${key}` } }));
  }
  function cloudGet(name) {
    return fetch(`${ACHV_API}/get/${ACHV_NS}/${name}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d && typeof d.value === 'number' ? d.value : 0))
      .catch(() => 0);
  }
  function achvBitsRange(from, to) {
    const got = store.get('yos-achv', {});
    let bits = 0;
    for (let i = from; i < Math.min(to, ACHV.length); i++) {
      if (got[ACHV[i].id]) bits += Math.pow(2, i - from);
    }
    return bits;
  }
  function spellEncodeChunks() {
    const renames = store.get('yos-cheat-renames', {});
    const s = Object.keys(renames).slice(0, 6).map((k) => (k + '|' + renames[k]).toLowerCase()).join('~').slice(0, 120);
    const chunks = [];
    for (let i = 0; i < s.length; i += 10) {
      let v = 0;
      const part = s.slice(i, i + 10);
      for (let j = 0; j < part.length; j++) {
        const ix = Math.max(0, CLOUD_ALPHA.indexOf(part[j]));
        v = v * 40 + ix + 1; // +1 so leading spaces survive
      }
      chunks.push(v);
    }
    return chunks;
  }
  function spellDecode(vals) {
    let s = '';
    vals.forEach((v) => {
      let part = '';
      while (v > 0) {
        part = (CLOUD_ALPHA[(v - 1) % 40] || '') + part;
        v = Math.floor((v - 1) / 40);
      }
      s += part;
    });
    const out = {};
    s.split('~').forEach((pair) => {
      const ix = pair.indexOf('|');
      if (ix > 0) out[pair.slice(0, ix)] = pair.slice(ix + 1);
    });
    return out;
  }
  /* the pikdex travels too. format v2: each pikmin packs hue·stage·
     chameleon·skill·SPECIES — two to a counter (a species dimension no
     longer fits three under 2^53). names are derived, never stored.
     the HIDDEN_SPECIES array order is the wire format: append-only! */
  const PIK_PACK = 17280;              // v2 wire: 360 hues × 3 stages × 2 chameleon × 8 skills
  const PIK_PACK2 = PIK_PACK * 23;     // × (22 species + 'none') = 397 440
  const PIK_PACK3 = 51840;             // v3 wire: 360 × 3 × 2 × 24 skills
  const PIK_PACK3ALL = PIK_PACK3 * 23; // = 1 192 320 · two piks/counter ≈ 1.4e12 < 2^53
  // evolution ledger on the wire: 72 kind-counts, 4 per counter, base 512
  function pikCountsEncode() {
    const c = (typeof pikCounts === 'function') ? pikCounts() : {};
    const keys = [];
    for (let i = 0; i < WHEEL_SEGS; i++) keys.push('w:' + i);
    HIDDEN_SPECIES.forEach((sp) => keys.push('s:' + sp.id));
    const chunks = [];
    for (let i = 0; i < keys.length; i += 4) {
      let v = 0;
      for (let j = 3; j >= 0; j--) v = v * 512 + Math.min(511, (c[keys[i + j]] || 0));
      chunks.push(1 + v);
    }
    return chunks; // 18 counters, max value ≈ 6.9e10 (< 2^53, comfortably)
  }
  function pikCountsMergeRemote(vals) {
    const keys = [];
    for (let i = 0; i < WHEEL_SEGS; i++) keys.push('w:' + i);
    HIDDEN_SPECIES.forEach((sp) => keys.push('s:' + sp.id));
    const c = pikCounts();
    let changed = false;
    (vals || []).forEach((v, ci) => {
      v = Math.max(0, Math.floor(Number(v) || 0) - 1);
      for (let j = 0; j < 4; j++) {
        const key = keys[ci * 4 + j];
        if (!key) break;
        const n = v % 512; v = Math.floor(v / 512);
        if (n > (c[key] || 0)) { c[key] = n; changed = true; } // counts only ever grow
      }
    });
    if (changed) {
      pikCountsSave(c);
      if (typeof deskPikResync === 'function') deskPikResync();
      if (typeof renderPikdexSoon === 'function') renderPikdexSoon();
    }
  }
  function pikdexEncodeChunks() {
    const dex = (typeof pikdexGet === 'function' ? pikdexGet() : []).filter((p) => !p.loan).slice(0, 78); // loaners never sync — they're borrowed
    const packed = dex.map((p) => {
      const h = p.h != null ? ((p.h % 360) + 360) % 360 : 330;
      const s = Math.min(p.s || 0, 2);
      const ch = p.ch ? 1 : 0;
      const kIx = Math.min(23, Math.max(0, PIK_SKILLS.findIndex((sk) => sk.id === p.k)));
      const spIx = p.sp ? Math.max(0, HIDDEN_SPECIES.findIndex((sp) => sp.id === p.sp) + 1) : 0;
      return h + 360 * (s + 3 * ch + 6 * kIx) + PIK_PACK3 * spIx;
    });
    const chunks = [];
    for (let i = 0; i < packed.length; i += 2) {
      chunks.push(1 + (packed[i] || 0) + (packed[i + 1] || 0) * PIK_PACK3ALL);
    }
    return { n: packed.length, chunks };
  }
  function pikdexDecodeV3(n, vals) {
    const flat = [];
    vals.forEach((v) => {
      v = Math.max(0, Math.floor(Number(v) || 0) - 1);
      for (let j = 0; j < 2; j++) { flat.push(v % PIK_PACK3ALL); v = Math.floor(v / PIK_PACK3ALL); }
    });
    return flat.slice(0, Math.min(n, 78)).map((pv3) => {
      const spIx = Math.floor(pv3 / PIK_PACK3) % 23;
      const pv = pv3 % PIK_PACK3;
      const h = pv % 360;
      let rest = Math.floor(pv / 360);
      const s = rest % 3; rest = Math.floor(rest / 3);
      const ch = rest % 2;
      const kIx = Math.floor(rest / 2) % 24;
      return { h, ch, s, k: (PIK_SKILLS[kIx] || PIK_SKILLS[0]).id, sp: spIx > 0 ? (HIDDEN_SPECIES[spIx - 1] || {}).id || null : null, a: 0, t: 0 };
    });
  }
  function pikdexDecodeV2(n, vals) {
    const flat = [];
    vals.forEach((v) => {
      v = Math.max(0, Math.floor(Number(v) || 0) - 1);
      for (let j = 0; j < 2; j++) { flat.push(v % PIK_PACK2); v = Math.floor(v / PIK_PACK2); }
    });
    return flat.slice(0, Math.min(n, 78)).map((pv2) => {
      const spIx = Math.floor(pv2 / PIK_PACK) % 23;
      const pv = pv2 % PIK_PACK;
      const h = pv % 360;
      let rest = Math.floor(pv / 360);
      const s = rest % 3; rest = Math.floor(rest / 3);
      const ch = rest % 2;
      const kIx = Math.floor(rest / 2) % 8;
      return { h, ch, s, k: (PIK_SKILLS[kIx] || PIK_SKILLS[0]).id, sp: spIx > 0 ? (HIDDEN_SPECIES[spIx - 1] || {}).id || null : null, a: 0, t: 0 };
    });
  }
  function pikdexDecodeV1(n, vals) {
    // legacy 3-per-counter chunks from before hidden species existed
    const flat = [];
    vals.forEach((v) => {
      v = Math.max(0, Math.floor(Number(v) || 0) - 1);
      for (let j = 0; j < 3; j++) { flat.push(v % PIK_PACK); v = Math.floor(v / PIK_PACK); }
    });
    return flat.slice(0, Math.min(n, 72)).map((pv) => {
      const h = pv % 360;
      let rest = Math.floor(pv / 360);
      const s = rest % 3; rest = Math.floor(rest / 3);
      const ch = rest % 2;
      const kIx = Math.floor(rest / 2) % 8;
      return { h, ch, s, k: (PIK_SKILLS[kIx] || PIK_SKILLS[0]).id, sp: null, a: 0, t: 0 };
    });
  }
  function pikdexMergeRemote(remote) {
    // append-only union: both devices grew from a shared prefix, so the
    // longer list wins the tail; local duty picks are always respected
    if (!remote.length) return;
    const dex = pikdexGet();
    if (remote.length <= dex.length) return;
    const before = pikdexWheelPct(dex);
    remote.slice(dex.length).forEach((r) => { dex.push(r); });
    // keep the squad staffed: if there's room on duty, promote arrivals
    let active = dex.filter((p) => p.a).length;
    dex.forEach((p) => { if (!p.a && active < PIK_MAX) { p.a = 1; active++; } });
    pikdexSave(dex);
    pikdexRosterProject();
    pikdexWheelCheck(before);
    if (typeof deskPikResync === 'function') deskPikResync();
    if (typeof renderPikdexSoon === 'function') renderPikdexSoon();
  }
  var cloudExtraLast = '';
  function cloudExtraSync() {
    if (!cloudSlot || !navigator.onLine) return;
    const u = cloudSlot.uid;
    const spells = spellEncodeChunks();
    const piks = pikdexEncodeChunks();
    // b4 widened from (118, 138) to (118, 168): the patch achievements push ACHV to 142,
    // past the old annex ceiling — the pull loop already walks 50 bits so only the pack changes
    const pcs = (typeof pikCountsEncode === 'function') ? pikCountsEncode() : [];
    // wst: one compact counter the WATCH client reads — fans + plucks + wheel%
    const wst = 1 + Math.min(pet.followers || 0, 99999)
      + 100000 * Math.min((typeof pikCountTotal === 'function') ? pikCountTotal() : 0, 9999)
      + 1000000000 * Math.min(100, (typeof pikdexWheelPct === 'function') ? pikdexWheelPct(pikdexGet()) : 0);
    const payload = [achvBitsRange(18, 68), achvBitsRange(68, 118), achvBitsRange(118, 168), spells.length, piks.n, 2].concat(spells).concat(piks.chunks).concat(pcs).concat([wst]);
    const sig = payload.join(',');
    if (sig === cloudExtraLast) return;
    let p = cloudSet(`sv2-${u}-b2`, payload[0])
      .then(() => cloudSet(`sv2-${u}-b3`, payload[1]))
      .then(() => cloudSet(`sv2-${u}-b4`, payload[2]))
      .then(() => cloudSet(`sv2-${u}-spn`, spells.length))
      .then(() => cloudSet(`sv2-${u}-pkn`, piks.n))
      .then(() => cloudSet(`sv2-${u}-pkv`, 3)); // wire-format version (v3 = 24-skill pack)
    spells.forEach((v, j) => { p = p.then(() => cloudSet(`sv2-${u}-sp${j}`, v)); });
    piks.chunks.forEach((v, j) => { p = p.then(() => cloudSet(`sv2-${u}-pk${j}`, v)); });
    p = p.then(() => cloudSet(`sv2-${u}-pcn`, pcs.length));
    pcs.forEach((v, j) => { p = p.then(() => cloudSet(`sv2-${u}-pc${j}`, v)); });
    p = p.then(() => cloudSet(`sv2-${u}-wst`, wst));
    p.then(() => { cloudExtraLast = sig; }).catch(() => { /* retried on next sync */ });
  }
  function cloudExtraPull() {
    if (!cloudSlot) return;
    const u = cloudSlot.uid;
    Promise.all([cloudGet(`sv2-${u}-b2`), cloudGet(`sv2-${u}-b3`), cloudGet(`sv2-${u}-b4`), cloudGet(`sv2-${u}-spn`), cloudGet(`sv2-${u}-pkn`), cloudGet(`sv2-${u}-pkv`), cloudGet(`sv2-${u}-pcn`)])
      .then(([b2, b3, b4, spn, pkn, pkv, pcn]) => {
        [[b2, 18], [b3, 68], [b4, 118]].forEach(([bits, off]) => {
          for (let i = 0; bits > 0 && i < 50; i++) {
            if (Math.floor(bits / Math.pow(2, i)) % 2 === 1 && ACHV[off + i]) achvUnlock(ACHV[off + i].id, true, true);
          }
        });
        const jobs = [];
        if (pcn > 0) {
          jobs.push(Promise.all(Array.from({ length: Math.min(pcn, 18) }, (_, j) => cloudGet(`sv2-${u}-pc${j}`)))
            .then((vals) => { if (typeof pikCountsMergeRemote === 'function') pikCountsMergeRemote(vals); }));
        }
        if (spn > 0) {
          jobs.push(Promise.all(Array.from({ length: Math.min(spn, 12) }, (_, j) => cloudGet(`sv2-${u}-sp${j}`)))
            .then((vals) => {
              const remote = spellDecode(vals);
              const local = store.get('yos-cheat-renames', {});
              let changed = false;
              Object.keys(remote).forEach((k) => { if (!local[k]) { local[k] = remote[k]; changed = true; } });
              if (changed) store.set('yos-cheat-renames', local);
            }));
        }
        if (pkn > 0) {
          const nChunks = Math.ceil(Math.min(pkn, 78) / (pkv >= 2 ? 2 : 3));
          jobs.push(Promise.all(Array.from({ length: nChunks }, (_, j) => cloudGet(`sv2-${u}-pk${j}`)))
            .then((vals) => pikdexMergeRemote(pkv >= 3 ? pikdexDecodeV3(pkn, vals) : (pkv >= 2 ? pikdexDecodeV2(pkn, vals) : pikdexDecodeV1(pkn, vals)))));
        }
        return Promise.all(jobs);
      })
      .catch(() => { /* the annex can wait */ });
  }

  function cloudStatusLine() {
    if (!navigator.onLine || cloudState === 'offline') return trT('📡 offline — will sync when the internet returns', '📡 hors-ligne — synchro au retour d\'internet');
    if (cloudState === 'synced') return trT('☁ saved to the backend ♡ (achievements · hi-score · cheats · fans · pikdex)', '☁ sauvegardé côté serveur ♡ (succès · record · codes · fans · pikdex)');
    if (cloudState === 'creating') return trT('☁ reserving your save slot…', '☁ réservation de ton emplacement…');
    if (cloudState === 'error') return trT('☁ backend unreachable — retrying on the next change', '☁ serveur injoignable — nouvel essai au prochain changement');
    return trT('☁ cloud save armed', '☁ sauvegarde cloud armée');
  }

  function cloudRenderPanel() {
    const panel = document.getElementById('cloud-save-panel');
    if (!panel) return;
    panel.innerHTML = '';

    const status = document.createElement('div');
    status.className = 'cloud-status';
    status.textContent = cloudStatusLine();
    panel.appendChild(status);

    if (cloudSlot) {
      const row = document.createElement('div');
      row.className = 'cloud-code-row';
      const codeEl = document.createElement('code');
      codeEl.className = 'cloud-code';
      codeEl.textContent = cloudCode();
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'cloud-btn';
      copyBtn.textContent = trT('📋 copy save code', '📋 copier le code');
      copyBtn.onclick = () => {
        const done = () => { playSparkleSound(); showToast(trT('save code copied — keep it somewhere cute ♡', 'code copié — garde-le en lieu mignon ♡')); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(cloudCode()).then(done).catch(done);
        else done();
      };
      row.append(codeEl, copyBtn);
      panel.appendChild(row);
    }

    const hint = document.createElement('div');
    hint.className = 'cloud-hint';
    hint.textContent = trT('this code IS your save file — paste it on any browser/device and everything comes home. clearing browser data can\'t touch it.', 'ce code EST ta sauvegarde — colle-le sur n\'importe quel navigateur/appareil et tout revient. vider le navigateur n\'y peut rien.');
    panel.appendChild(hint);

    const form = document.createElement('form');
    form.className = 'cloud-restore-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'cloud-input';
    input.placeholder = 'SLIME-XXXXXX-…';
    input.setAttribute('aria-label', trT('Paste a save code to restore', 'Colle un code de sauvegarde à restaurer'));
    const loadBtn = document.createElement('button');
    loadBtn.type = 'submit';
    loadBtn.className = 'cloud-btn';
    loadBtn.textContent = trT('⬇ load', '⬇ charger');
    form.append(input, loadBtn);
    form.onsubmit = (e) => {
      e.preventDefault();
      if (!input.value.trim()) return;
      loadBtn.disabled = true;
      cloudRestore(input.value).then((res) => {
        loadBtn.disabled = false;
        if (res === 'ok') {
          playFanfare();
          showToast(trT('save restored!! welcome back, legend ♡', 'sauvegarde restaurée !! re-bienvenue, légende ♡'));
          renderAchievements();
          if (typeof renderLeaderboard === 'function') renderLeaderboard();
        } else if (res === 'badcode') {
          showToast(trT('that doesn\'t look like a SLIME code 🥺', 'ça ne ressemble pas à un code SLIME 🥺'));
        } else {
          showToast(trT('no save found for that code — typo?', 'aucune sauvegarde pour ce code — coquille ?'));
        }
      });
    };
    panel.appendChild(form);
  }

  // boot: pull the remote save (if any), merge, then push the union back
  setTimeout(function cloudBoot() {
    if (!navigator.onLine) return;
    if (cloudSlot) {
      fetch(`${ACHV_API}/get/${ACHV_NS}/sv2-${cloudSlot.uid}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && typeof d.value === 'number') cloudApplyRemote(d.value);
          cloudQueueSync();
        })
        .catch(() => {});
    } else {
      cloudQueueSync(); // reserves a slot + first sync
    }
  }, 3000);

  window.addEventListener('online', () => cloudQueueSync());

  /* ---------- pipelines: like a real shell, but with more hearts ----------
     `help | grep pet` · `fortune | say` · `ls | wc` · 2-4 stages max */
  function termRunPipeline(input) {
    const stages = input.split('|').map((s) => s.trim()).filter(Boolean);
    if (stages.length < 2 || stages.length > 4) {
      termLine(trT('pipeline: 2-4 stages, this is a boutique shell', 'pipeline : 2-4 étages, c\'est un shell de boutique'), 't-err');
      return;
    }
    let stdin = null;
    for (let i = 0; i < stages.length; i++) {
      if (i < stages.length - 1) {
        termCapture = [];
        try { runTermCommand(stages[i], true, stdin); } finally { stdin = termCapture; termCapture = null; }
      } else {
        runTermCommand(stages[i], true, stdin);
      }
    }
  }

  /* ================= git — the REAL GitHub wing =================
     SECURITY MODEL, written down so it never drifts:
     · this static site holds NO tokens and NEVER asks for any
     · every "action" (star/follow/fork) only OPENS github.com in a new
       tab — the visitor consents THERE, on GitHub's own buttons
     · the only API use is unauthenticated public READS of yongshan's
       own profile/repo (cached 10 min, a handful of calls, no identity
       of the visitor is ever read, sent, or stored)
     · window.open targets come exclusively from the constants below */
  const GH_USER = 'yyswhsccc';
  const GH_REPO = 'personal-website';
  const GH_LINK = {
    profile: `https://github.com/${GH_USER}`,
    repo: `https://github.com/${GH_USER}/${GH_REPO}`,
    fork: `https://github.com/${GH_USER}/${GH_REPO}/fork`
  };
  function ghApi(path, fresh) {
    // fresh=true is for DELTA BASELINES: live 2xx or null, never a stale
    // cache — a days-old count must not fuel a false "was that you?!"
    const cache = store.get('yos-gh-cache', {});
    const hit = cache[path];
    if (!fresh && hit && Date.now() - hit.t < 600000) return Promise.resolve(hit.data);
    if (!navigator.onLine) return Promise.resolve(fresh ? null : (hit ? hit.data : null));
    return fetch('https://api.github.com' + path, { headers: { Accept: 'application/vnd.github+json' }, cache: fresh ? 'no-store' : 'default' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const c = store.get('yos-gh-cache', {});
        c[path] = { t: Date.now(), data };
        store.set('yos-gh-cache', c);
        return data;
      })
      .catch(() => (fresh ? null : (hit ? hit.data : null)));
  }
  function gitMark(sub) {
    const used = store.get('yos-git-used', []);
    if (used.indexOf(sub) === -1) {
      used.push(sub);
      store.set('yos-git-used', used);
      if (used.length >= 5) achvUnlock('gitgud');
    }
  }
  var ghWatchTimer = null, ghWatchSeq = 0;
  function ghWatchDelta(kind) {
    // after the visitor opens GitHub, we politely peek at the PUBLIC
    // counter a few times — if it grew, the whole site celebrates. we
    // never learn WHO pressed the button, only that someone kind did.
    // sequence-owned: the newest call is the only living watcher, and a
    // watcher only ever clears ITS OWN interval (no cross-kills, no spam).
    const seq = ++ghWatchSeq;
    if (ghWatchTimer) { clearInterval(ghWatchTimer); ghWatchTimer = null; }
    const path = kind === 'star' ? `/repos/${GH_USER}/${GH_REPO}` : `/users/${GH_USER}`;
    const read = (d) => (d ? (kind === 'star' ? d.stargazers_count : d.followers) : null);
    ghApi(path, true).then((d0) => {
      if (seq !== ghWatchSeq) return; // superseded while the baseline flew
      const base = read(d0);
      if (base == null) return; // no LIVE baseline → no watch, no false joy
      let polls = 0;
      const timer = setInterval(() => {
        if (seq !== ghWatchSeq) { clearInterval(timer); return; }
        if (++polls > 8) { clearInterval(timer); if (ghWatchTimer === timer) ghWatchTimer = null; return; }
        ghApi(path, true).then((d) => {
          if (seq !== ghWatchSeq) { clearInterval(timer); return; }
          const now = read(d);
          if (now != null && now > base) {
            clearInterval(timer);
            if (ghWatchTimer === timer) ghWatchTimer = null;
            ghWatchSeq++; // this watch is fulfilled — retire it for good
            playFanfare();
            if (typeof fxBanner === 'function') {
              fxBanner(kind === 'star' ? '⭐ A NEW STAR!!' : '💚 A NEW FOLLOWER!!',
                kind === 'star' ? trT('the repo FELT that. thank you ♡', 'le dépôt l\'a SENTI. merci ♡') : trT('yongshan just got a little more famous ♡', 'yongshan vient de gagner en célébrité ♡'));
            }
            achvUnlock(kind === 'star' ? 'stargazer' : 'gitfollow');
            termLine(kind === 'star'
              ? trT('⭐ the star counter just went UP. was that you?! LEGEND.', '⭐ le compteur d\'étoiles vient de MONTER. c\'était toi ?! LÉGENDE.')
              : trT('💚 follower count just went UP. was that you?! adopted forever.', '💚 le compteur d\'abonnés vient de MONTER. c\'était toi ?! adopté·e pour toujours.'), 't-ok');
          }
        });
      }, 25000);
      ghWatchTimer = timer;
    });
  }
  const GIT_KNOWN = ['help', '--help', 'status', 'log', 'star', 'follow', 'fork', 'clone', 'pull', 'push', 'commit', 'branch', 'checkout', 'merge', 'stash', 'blame', 'diff', 'cherry-pick', 'tag', 'remote', 'reflog', 'bisect', 'rebase', 'init', 'gc', 'rm', 'config'];
  function termGit(args) {
    const sub = (args[0] || 'status').toLowerCase();
    if (GIT_KNOWN.indexOf(sub) !== -1) gitMark(sub === '--help' ? 'help' : sub); // typos don't count toward Git Gud
    if (sub === 'help' || sub === '--help') {
      termLine(trT('git — the fourth-wall edition. real GitHub, cute verbs:', 'git — édition quatrième mur. vrai GitHub, verbes mignons :'), 't-accent');
      [['status', trT('LIVE repo stats from GitHub', 'stats LIVE du dépôt GitHub')],
       ['log', trT('her real latest commits', 'ses vrais derniers commits')],
       ['star', trT('opens the repo — the ⭐ is yours to press', 'ouvre le dépôt — l\'⭐ t\'appartient')],
       ['follow', trT('opens her profile — the follow button awaits', 'ouvre son profil — le bouton follow attend')],
       ['clone', trT('copies the REAL clone command', 'copie la VRAIE commande clone')],
       ['fork / pull / push / commit / branch / checkout / merge', '…'],
       ['stash / blame / diff / cherry-pick / tag / remote / reflog / bisect', '…']].forEach(([a, b]) => termLine(`  git ${a}  —  ${b}`, 't-dim'));
      return;
    }
    if (sub === 'status') {
      termLine('On branch main ♡', 't-ok');
      ghApi(`/repos/${GH_USER}/${GH_REPO}`).then((d) => {
        if (!d) { termLine(trT('origin unreachable — but the feelings are all staged locally', 'origin injoignable — mais les sentiments sont indexés en local'), 't-dim'); return; }
        termLine(trT(`origin: github.com/${GH_USER}/${GH_REPO} — LIVE`, `origin : github.com/${GH_USER}/${GH_REPO} — EN DIRECT`), 't-dim');
        termLine(`  ⭐ ${d.stargazers_count} stars · 🍴 ${d.forks_count} forks · 🐛 ${d.open_issues_count} open issues`, 't-ok');
        termLine(trT(`  last real push: ${new Date(d.pushed_at).toLocaleString()}`, `  dernier vrai push : ${new Date(d.pushed_at).toLocaleString()}`), 't-dim');
        termLine(trT('nothing to commit — working tree full of pikmin, all feelings staged', 'rien à valider — arbre plein de pikmin, sentiments indexés'), 't-dim');
      });
      return;
    }
    if (sub === 'log') {
      termLine(trT('fetching her ACTUAL commit history…', 'récupération de son VRAI historique…'), 't-dim');
      ghApi(`/repos/${GH_USER}/${GH_REPO}/commits?per_page=5`).then((list) => {
        if (!list || !list.length) { termLine('0000000 initial commit: one (1) slime', 't-ok'); return; }
        list.forEach((c) => {
          const msg = String((c.commit && c.commit.message) || '').split('\n')[0].slice(0, 72);
          termLine(`${(c.sha || '').slice(0, 7)} ${msg}`, 't-ok');
        });
        termLine(trT('(yes, these are real. the fourth wall was never load-bearing.)', '(oui, ils sont vrais. le quatrième mur n\'a jamais été porteur.)'), 't-dim');
      });
      return;
    }
    if (sub === 'star') {
      termLine(trT('⭐ opening the repo — the button is all yours (consent is sacred here)…', '⭐ ouverture du dépôt — le bouton est à toi (le consentement est sacré ici)…'), 't-accent');
      termLine(trT('   (if the counter moves in the next minutes, this terminal WILL notice ♡)', '   (si le compteur bouge dans les prochaines minutes, ce terminal le SAURA ♡)'), 't-dim');
      window.open(GH_LINK.repo, '_blank', 'noopener');
      ghWatchDelta('star');
      return;
    }
    if (sub === 'follow') {
      termLine(trT('💚 opening her profile — I can\'t follow FOR you, that\'s your click to give…', '💚 ouverture de son profil — je ne peux pas suivre À ta place, ce clic t\'appartient…'), 't-accent');
      termLine(trT('   (the follow button is top-right. no pressure. okay a LITTLE pressure ♡)', '   (le bouton follow est en haut à droite. sans pression. bon, un PEU ♡)'), 't-dim');
      window.open(GH_LINK.profile, '_blank', 'noopener');
      ghWatchDelta('follow');
      return;
    }
    if (sub === 'fork') {
      termLine(trT('🍴 opening the fork page — take the whole OS home, it\'s MIT-hearted', '🍴 ouverture de la page fork — emporte tout l\'OS, il a le cœur MIT'), 't-ok');
      window.open(GH_LINK.fork, '_blank', 'noopener');
      return;
    }
    if (sub === 'clone') {
      const cmd2 = `git clone ${GH_LINK.repo}.git`;
      const done = () => termLine(trT(`📋 copied: ${cmd2} — paste it in a REAL terminal. it actually works.`, `📋 copié : ${cmd2} — colle-le dans un VRAI terminal. ça marche vraiment.`), 't-ok');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(cmd2).then(done).catch(done);
      else done();
      termLine(trT('cloning yongshanOS into your heart… done. 1 slime, 72 pikmin, 0 conflicts.', 'clonage de yongshanOS dans ton cœur… fini. 1 slime, 72 pikmin, 0 conflit.'), 't-dim');
      return;
    }
    if (sub === 'pull') {
      termLine(trT('pulling from origin/meadow…', 'récupération depuis origin/meadow…'), 't-dim');
      termLine(trT('fast-forwarded: you received 1 pikmin parade ♡', 'avance rapide : tu reçois 1 défilé de pikmin ♡'), 't-ok');
      if (typeof pikParade === 'function') pikParade();
      return;
    }
    if (sub === 'push') {
      termLine(trT('pushing hugs to origin/main… remote: ♡ accepted (fast-forward)', 'envoi de câlins vers origin/main… remote : ♡ accepté (avance rapide)'), 't-ok');
      return;
    }
    if (sub === 'commit') {
      termLine(trT('[main ♡♡♡♡♡♡♡] commit: "visited yongshanOS and petted the slime"', '[main ♡♡♡♡♡♡♡] commit : « a visité yongshanOS et caressé le slime »'), 't-ok');
      termLine(trT(' 1 heart changed, ∞ insertions(+), 0 deletions(-)', ' 1 cœur modifié, ∞ insertions(+), 0 suppression(-)'), 't-dim');
      return;
    }
    if (sub === 'branch') {
      ['* main', '  feature/more-pikmin', '  feature/wrist-edition', '  fix/nightmare-boss (merged, it lost)', '  dark', '  light'].forEach((b) => termLine(b, b[0] === '*' ? 't-ok' : 't-dim'));
      termLine(trT('(try: `git checkout dark`)', '(essaie : `git checkout dark`)'), 't-dim');
      return;
    }
    if (sub === 'checkout') {
      const b = (args[1] || '').toLowerCase();
      if (b === 'dark' || b === 'light' || b === 'auto') {
        runTermCommand('theme ' + b, true);
        termLine(trT(`switched to branch '${b}' — the whole OS came along ♡`, `bascule sur la branche '${b}' — tout l'OS a suivi ♡`), 't-ok');
      } else {
        termLine(trT(`error: pathspec '${args[1] || ''}' did not match any branches made of daylight. try dark/light/auto`, `erreur : '${args[1] || ''}' ne correspond à aucune branche faite de lumière. essaie dark/light/auto`), 't-err');
      }
      return;
    }
    if (sub === 'merge') {
      termLine(trT('CONFLICT (content): merge conflict in feelings.txt', 'CONFLIT (contenu) : conflit de fusion dans feelings.txt'), 't-err');
      termLine(trT('auto-resolved: kept BOTH. feelings are not mutually exclusive ♡', 'auto-résolu : on garde LES DEUX. les sentiments ne s\'excluent pas ♡'), 't-ok');
      return;
    }
    if (sub === 'stash') {
      termLine(trT('stashed: 3 worries, 1 deadline, 0 pikmin (they refused)', 'remisé : 3 soucis, 1 deadline, 0 pikmin (ils ont refusé)'), 't-ok');
      return;
    }
    if (sub === 'blame') {
      termLine(trT('git blame: the goose. it is always the goose. 🪿', 'git blame : l\'oie. c\'est toujours l\'oie. 🪿'), 't-accent');
      return;
    }
    if (sub === 'diff') {
      termLine('--- a/you_before_this_site', 't-dim');
      termLine('+++ b/you_now', 't-dim');
      termLine(trT('+ knows the pikmin personally', '+ connaît les pikmin personnellement'), 't-ok');
      termLine(trT('+ has strong opinions about a slime', '+ a des avis tranchés sur un slime'), 't-ok');
      return;
    }
    if (sub === 'cherry-pick') {
      if (window.__gitCherry) { termLine(trT('🍒 the tree needs a moment. one pick per visit.', '🍒 l\'arbre a besoin d\'un instant. une cueillette par visite.'), 't-err'); return; }
      window.__gitCherry = 1;
      store.set('yos-pending-coins', (store.get('yos-pending-coins', 0) || 0) + 2);
      termLine(trT('🍒 picked: 2 coins — staged for your next slime_run ♡', '🍒 cueilli : 2 pièces — prêtes pour ta prochaine slime_run ♡'), 't-ok');
      return;
    }
    if (sub === 'tag') {
      ['v41 "the pikdex era"', 'v44 "the nightmare"', 'v46 "the meltdown drills"', 'v48 "the wrist era"', 'v52 "the github wing"'].forEach((t2) => termLine(t2, 't-dim'));
      return;
    }
    if (sub === 'remote') {
      termLine(`origin  ${GH_LINK.repo}.git (fetch)`, 't-dim');
      termLine(`origin  ${GH_LINK.repo}.git (push)`, 't-dim');
      termLine(trT('wrist   your-smartwatch (fetch only, plucks & pets)', 'wrist   ta-montre (fetch uniquement, cueillettes & caresses)'), 't-dim');
      return;
    }
    if (sub === 'reflog') {
      const got = store.get('yos-achv', {});
      const recent = Object.keys(got).sort((a, b) => got[b] - got[a]).slice(0, 4);
      if (!recent.length) { termLine(trT('reflog: empty. go make some history ♡', 'reflog : vide. va écrire l\'histoire ♡'), 't-dim'); return; }
      recent.forEach((id, i) => termLine(`HEAD@{${i}}: achievement: ${id} unlocked`, 't-ok'));
      return;
    }
    if (sub === 'bisect') {
      termLine(trT('bisecting your attention span… found it: you are STILL here. remarkable ♡', 'bissection de ton attention… trouvé : tu es ENCORE là. remarquable ♡'), 't-ok');
      return;
    }
    if (sub === 'rebase') {
      termLine(trT('interactive rebase opens vim. you remember what happened last time. (`vim` if you dare)', 'le rebase interactif ouvre vim. tu te souviens de la dernière fois. (`vim` si tu oses)'), 't-err');
      return;
    }
    if (sub === 'init') {
      termLine(trT('reinitialized existing repository: this desktop was ALWAYS a repository of feelings', 'dépôt réinitialisé : ce bureau a TOUJOURS été un dépôt de sentiments'), 't-ok');
      return;
    }
    if (sub === 'gc') {
      termLine(trT('garbage collecting… inspected 12,438 objects. found only treasures. removed 0.', 'nettoyage… 12 438 objets inspectés. que des trésors. 0 supprimé.'), 't-ok');
      return;
    }
    if (sub === 'rm') {
      termLine(trT('git rm: refused. nothing here is disposable — least of all you ♡', 'git rm : refusé. rien ici n\'est jetable — toi encore moins ♡'), 't-err');
      return;
    }
    if (sub === 'config') {
      termLine(trT('user.name = a wonderful stranger (this OS never snoops — privacy is load-bearing)', 'user.name = un·e inconnu·e formidable (cet OS ne fouille jamais — la vie privée est porteuse)'), 't-dim');
      return;
    }
    termLine(trT(`git: '${sub}' — not here. \`git help\` shows the whole toolbox`, `git : '${sub}' — pas ici. \`git help\` montre toute la boîte`), 't-err');
  }
  function runTermCommand(raw, piped, stdin) {
    const input = raw.trim();
    if (!input) return;
    if (termVimActive) { termVimHandle(input); return; } // there is no shell inside vim
    if (!piped) termLine(`yongshan@os:~$ ${input}`, 't-cmd');
    if (!piped && input.indexOf('|') > 0) { termRunPipeline(input); return; }

    const lower = input.toLowerCase();
    const parts = input.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const rest = input.slice(parts[0].length).trim();
    const args = lower.split(/\s+/).slice(1);

    // ---- nightmare dream-lock: the shell answers to `wake up` first ----
    if (GAME && GAME.nm && GAME.nm.attack && GAME.nm.attack.kind === 'term') {
      if (lower === 'wake up' || lower === 'wakeup') {
        termLine(trT('☀ the loop SHATTERS. the shell is yours again.', '☀ la boucle SE BRISE. le shell est de nouveau à vous.'), 't-ok');
        nmResolveAttack(2, '🖥️ dream-lock broken!!', '🖥️ verrou de rêve brisé !!');
        return;
      }
      if (lower === 'yongshan') {
        termLine(trT('⚡ THE SKELETON KEY. the boss recognizes the handwriting and PANICS.', '⚡ LE PASSE-PARTOUT. le boss reconnaît l\'écriture et PANIQUE.'), 't-ok');
        nmResolveAttack(4, '⚡ DEV\'S PET CHEAT!!', '⚡ TRICHE PERSO DE LA DEV !!');
        if (typeof pikParade === 'function') pikParade();
        return;
      }
    }

    // ---- the terminal door: a tiny CTF playground until the name is spoken ----
    if (document.body.classList.contains('terminal-only')) {
      const door = doorInit();
      if (window.__doorIdle) { clearTimeout(window.__doorIdle); window.__doorIdle = null; } // the visitor drives now
      // the key is her NAME in any reasonable outfit: case, spaces, with or
      // without the family name, even behind a sudo. typos are NOT outfits.
      // …but the door insists on its locks FIRST.
      const norm = lower.replace(/[^a-z]/g, '');
      const DOOR_KEYS = ['yongshan', 'yongshanyu', 'yuyongshan'];
      const isKey = DOOR_KEYS.indexOf(norm) !== -1;
      const sudoKey = norm.indexOf('sudo') === 0 && DOOR_KEYS.indexOf(norm.slice(4)) !== -1;
      if (isKey || sudoKey) {
        if (door.stage < door.chain.length) {
          door.knew = true;
          termLine(trT('😳 you KNOW the name already?! the door blushes — but it insists on formalities.', '😳 tu CONNAIS déjà le nom ?! la porte rougit — mais elle tient aux formalités.'), 't-accent');
          termLine(trT(`   (${door.chain.length - door.stage} lock(s) left — \`hint\` shows the current one.)`, `   (${door.chain.length - door.stage} verrou(s) restant(s) — \`hint\` montre l'actuel.)`), 't-dim');
          matrixGreeterSay(trT('locks first. it is a VERY proper door.', 'les verrous d\'abord. c\'est une porte TRÈS à cheval sur les formes.'));
          return;
        }
        if (sudoKey) termLine(trT('🔑 root acknowledged. the door never needed it — but the bow is appreciated.', '🔑 root reconnu. la porte n\'en avait pas besoin — mais la révérence est appréciée.'), 't-ok');
        achvUnlock('ctfslime');
        store.set('yos-pending-coins', (store.get('yos-pending-coins', 0) || 0) + 10);
        termLine(trT(`🚩 CTF CLEARED — ${door.chain.length} locks + the name. +10 coins staged for slime_run ♡`, `🚩 CTF RÉUSSI — ${door.chain.length} verrous + le nom. +10 pièces pour slime_run ♡`), 't-ok');
        terminalDoorOpen();
        return;
      }
      if (lower === 'wake up' || lower === 'wakeup') {
        termLine(trT('🐇 the classic line!! it rattles the door… but these locks want ANSWERS.', '🐇 la réplique classique !! la porte tremble… mais ces verrous veulent des RÉPONSES.'), 't-accent');
        matrixGreeterSay(trT('nice pull. the door is a fan too. locks, though.', 'belle référence. la porte est fan aussi. mais : verrous.'));
        return;
      }
      // the current lock accepts its answer from anywhere in the shell
      if (door.stage < door.chain.length && door.chain[door.stage].check(door, norm, lower)) {
        doorPuzzleAdvance(door);
        return;
      }
      if (lower === 'hint') {
        if (door.stage < door.chain.length) doorPuzzleShow(door);
        else {
          termLine(trT('🔓 all locks are open — the door only wants her NAME now.', '🔓 tous les verrous sont ouverts — la porte ne veut plus que son NOM.'), 't-ok');
        }
        return;
      }
      const ENCODED = { rot13: doorEncode(door.cipherWord, 'rot13'), base64: doorEncode(door.cipherWord, 'base64'), hex: doorEncode(door.cipherWord, 'hex') };
      if (lower === 'ls' || lower === 'ls -la' || lower === 'dir') {
        termLine('key.enc          README.whisper          the_rest_of_the_OS.zzz', 't-ok');
        matrixGreeterSay(trT('ooh. a LOOKER. `cat` them. I would.', 'oh. quelqu\'un qui REGARDE. `cat`-les. moi je le ferais.'));
        return;
      }
      if (lower === 'cat readme.whisper' || lower === 'cat readme') {
        termLine(trT('the door has locks. `hint` shows the current one. the FINAL thing it wants is a name.', 'la porte a des verrous. `hint` montre l\'actuel. la DERNIÈRE chose qu\'elle veut est un nom.'), 't-dim');
        return;
      }
      if (lower === 'cat key.enc') {
        termLine(ENCODED[door.enc], 't-ok');
        termLine(trT(`   (encoding: ${door.enc} — decode it IRL, or \`decode key.enc\` if your wrists are tired)`, `   (encodage : ${door.enc} — décode-le en vrai, ou \`decode key.enc\` si tes poignets fatiguent)`), 't-dim');
        matrixGreeterSay(trT('a cipher!! I love this part.', 'un chiffre !! j\'adore ce moment.'));
        return;
      }
      if (lower === 'decode key.enc' || lower === 'decode') {
        const wEnc = ENCODED[door.enc];
        if (door.enc === 'rot13') termLine("$ tr 'a-z' 'n-za-m' <<< " + wEnc + '  →  ' + door.cipherWord, 't-ok');
        else if (door.enc === 'base64') termLine('$ echo ' + wEnc + ' | base64 -d  →  ' + door.cipherWord, 't-ok');
        else termLine('$ xxd -r -p <<< ' + wEnc + '  →  ' + door.cipherWord, 't-ok');
        termLine(trT('   (that is the REAL command, by the way — it works in your terminal too)', '   (c\'est la VRAIE commande, au passage — elle marche aussi dans ton terminal)'), 't-dim');
        matrixGreeterSay(trT('DECODED. now TYPE the word — the lock is listening.', 'DÉCODÉ. maintenant TAPE le mot — le verrou écoute.'));
        return;
      }
      if (lower === 'visitorfetch' || lower === 'neofetch --visitor') {
        termVisitorFetch();
        return;
      }
      if (lower === 'matrix') {
        termLine(trT('☔ initiating digital drizzle… (6s, purely decorative)', '☔ bruine numérique… (6 s, purement décoratif)'), 't-ok');
        matrixRain();
        return;
      }
      // near-miss typos of the name get lovingly roasted, never executed
      if (norm.length >= 6 && !isKey && !sudoKey) {
        const lev = (a, b) => {
          const m = Array.from({ length: a.length + 1 }, (_, i) => [i].concat(new Array(b.length).fill(0)));
          for (let j = 1; j <= b.length; j++) m[0][j] = j;
          for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
            m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
          }
          return m[a.length][b.length];
        };
        const tryNorm = norm.indexOf('sudo') === 0 ? norm.slice(4) : norm;
        if (DOOR_KEYS.some((k) => { const d = lev(tryNorm, k); return d > 0 && d <= 2; })) {
          const MOCKS = [
            [`'${input}'?? adorable. wrong, but adorable. (it's y·o·n·g·s·h·a·n)`, `'${input}' ?? adorable. faux, mais adorable. (c'est y·o·n·g·s·h·a·n)`],
            ['the door FELT that typo. it is giggling. politely.', 'la porte a SENTI cette typo. elle glousse. poliment.'],
            ['SO close. her name is not a captcha — breathe, retype ♡', 'TELLEMENT proche. son nom n\'est pas un captcha — respire, retape ♡']
          ];
          const mock = MOCKS[Math.floor(Math.random() * MOCKS.length)];
          termLine(trT(mock[0], mock[1]), 't-err');
          matrixGreeterSay(trT('that typo had HEART. wrong letters, but heart.', 'cette typo avait du CŒUR. pas les bonnes lettres, mais du cœur.'));
          return;
        }
      }
      // anything else falls through to the REAL shell — but the greeter watches
      door.tries++;
      if (door.tries === 3) matrixGreeterSay(trT('psst. try `ls`. doors have pockets.', 'psst. essaie `ls`. les portes ont des poches.'));
      if (door.tries === 6) matrixGreeterSay(trT('the key is literally her name. I cannot be clearer without RUNNING it for you.', 'la clé est littéralement son nom. je ne peux pas être plus clair sans la TAPER pour toi.'));
    }

    // ---- nightmare MELTDOWN: the shell is a triage desk. all input is a fix attempt ----
    if (GAME && GAME.nm && GAME.nm.attack && GAME.nm.attack.kind === 'melt' && GAME.nm.attack.melt) {
      const mAtk = GAME.nm.attack;
      const flat = lower.replace(/[\s;`'"]+/g, '');
      if (mAtk.melt.answers.indexOf(flat) !== -1) {
        nmMeltHeal(mAtk);
        termLine(trT('✔ HOTFIX MERGED. the site snaps back like nothing happened. CI is crying (happy).', '✔ CORRECTIF FUSIONNÉ. le site se remet d\'un coup. la CI pleure (de joie).'), 't-ok');
        nmResolveAttack(3, '🧯 15-second hotfix!!', '🧯 correctif en 15 secondes !!');
        achvUnlock('hotfix');
        return;
      }
      if (lower === 'yongshan') {
        nmMeltHeal(mAtk);
        termLine(trT('⚡ THE SKELETON KEY force-merges reality. the linter looks away, out of respect.', '⚡ LE PASSE-PARTOUT force-merge la réalité. le linter détourne le regard, par respect.'), 't-ok');
        nmResolveAttack(2, '⚡ force-merged!!', '⚡ fusion forcée !!');
        if (typeof pikParade === 'function') pikParade();
        return;
      }
      const secsLeft = Math.max(0, (mAtk.deadline - GAME.frame) / 60).toFixed(1);
      if (lower === 'hint' || lower === 'help' || lower === 'man' || lower === 'sos') {
        termLine('   ' + mAtk.melt.dream, 't-err');
        (mAtk.melt.art || []).forEach((l) => termLine('   ' + l, 't-dim'));
        termLine('⛑ ' + mAtk.melt.task + '  (' + secsLeft + 's)', 't-accent');
        return;
      }
      mAtk.tries = (mAtk.tries || 0) + 1;
      const NOPE = [
        trT('✗ prod is still (adorably) on fire. ' + secsLeft + 's.', '✗ la prod brûle toujours (adorablement). ' + secsLeft + ' s.'),
        trT('✗ the linter frowns, but believes in you. ' + secsLeft + 's.', '✗ le linter fronce les sourcils, mais croit en toi. ' + secsLeft + ' s.'),
        trT('✗ nope!! somewhere, a CI pipeline giggles. ' + secsLeft + 's.', '✗ non !! quelque part, une CI pouffe. ' + secsLeft + ' s.'),
        trT('✗ close, maybe? the smoke says no. ' + secsLeft + 's.', '✗ presque, peut-être ? la fumée dit non. ' + secsLeft + ' s.')
      ];
      termLine(NOPE[Math.floor(Math.random() * NOPE.length)], 't-err');
      if (mAtk.tries === 2) termLine(trT('   (stuck? `hint` reprints the ticket. `yongshan` force-merges — the dev\'s privilege.)', '   (bloqué·e ? `hint` réaffiche le ticket. `yongshan` force-merge — privilège de la dev.)'), 't-dim');
      return;
    }

    // ---- the 100 secret codes check in before everything else ----
    const spellRenames = store.get('yos-cheat-renames', {});
    const customCanonical = Object.keys(spellRenames).find((c) => spellRenames[c] === spellNorm(lower));
    if (customCanonical && TERM_CHEATS[customCanonical]) {
      fireCheat(customCanonical, true);
      return;
    }
    if (TERM_CHEATS[lower]) {
      if (spellRenames[lower]) {
        termLine(trT(`⚠ those words are dust. the slime god renamed this spell to \`${spellRenames[lower]}\` — at your request, remember?`, `⚠ ces mots sont poussière. le dieu slime a renommé ce sort en \`${spellRenames[lower]}\` — à ta demande, souviens-toi ?`), 't-err');
        return;
      }
      fireCheat(lower, false);
      return;
    }
    if (lower === 'cheats' || lower === 'secrets') {
      const found = Math.max(store.get('yos-cheats-found', []).length, store.get('yos-cheats-cloudn', 0));
      const renamed = Object.keys(store.get('yos-cheat-renames', {})).length;
      termLine(trT(`there are ${CHEAT_COUNT} secret codes hidden in this OS. you have found ${found}.`, `il y a ${CHEAT_COUNT} codes secrets cachés dans cet OS. tu en as trouvé ${found}.`), 't-accent');
      termLine(trT('I will never list them. try `hint` if you must.', 'je ne les listerai jamais. essaie `hint` en désespoir de cause.'), 't-dim');
      termLine(trT('close guesses count — the slime god grades fan fiction as canon.', 'les réponses approximatives comptent — le dieu slime accepte la fanfiction comme canon.'), 't-dim');
      if (renamed) termLine(trT(`(${renamed} spell${renamed === 1 ? '' : 's'} in the book now bear YOUR handwriting)`, `(${renamed} sort${renamed === 1 ? '' : 's'} du grimoire porte${renamed === 1 ? '' : 'nt'} désormais TON écriture)`), 't-ok');
      termLine(trT('achievements moved in next door: open hall_of_slime.exe 🏅', 'les succès ont emménagé à côté : ouvre hall_of_slime.exe 🏅'), 't-dim');
      return;
    }
    if (lower === 'hint') {
      const hints = [
        ['old StarCraft players never forget their mantras…', 'les vétérans de StarCraft n\'oublient jamais leurs mantras…'],
        ['what would a Sim type when rent is due?', 'que taperait un Sim quand le loyer tombe ?'],
        ['DOOM guys know four letters that make you immortal.', 'les joueurs de DOOM connaissent quatre lettres qui rendent immortel.'],
        ['ask the sky for weather. politely. in plain words.', 'demande la météo au ciel. poliment. avec des mots simples.'],
        ['this is Canada. some codes simply honk.', 'on est au Canada. certains codes se contentent de klaxonner.'],
        ['tell the slime how you FEEL about it.', 'dis au slime ce que tu RESSENS pour lui.'],
        ['a very famous barrel manoeuvre works here too.', 'une très célèbre manœuvre du tonneau marche ici aussi.'],
        ['some codes are just what a tired dev mutters at 3am.', 'certains codes sont ce qu\'un dev épuisé marmonne à 3h du matin.']
      ];
      const h = hints[Math.floor(Math.random() * hints.length)];
      termLine(trT('psst… ' + h[0], 'psst… ' + h[1]), 't-dim');
      return;
    }

    if (lower === 'sudo hire yongshan' || lower === 'hire' || lower === 'sudo hire') {
      termLine(trT('[sudo] password for recruiter: ********', '[sudo] mot de passe du recruteur : ********'), 't-dim');
      termLine(trT('✔ permission granted. everyone has permission for this one.', '✔ permission accordée. tout le monde a la permission pour celle-là.'), 't-ok');
      termLine(trT('→ email: yuyongshan573@gmail.com (copied to your heart)', '→ courriel : yuyongshan573@gmail.com (copié dans votre cœur)'), 't-accent');
      playFanfare();
      gainFollowers(3);
      achvUnlock('hired');
      return;
    }
    if (cmd === 'sudo') { termLine(trT('nice try. this slime respects the principle of least privilege.', 'bien tenté. ce slime respecte le principe du moindre privilège.'), 't-err'); return; }
    if (cmd === 'wall') {
      const sub = (args[0] || 'status').toLowerCase();
      if (!wallApi) { termLine(trT('wall: backend not configured yet (wall-config.json)', 'wall : backend pas encore configuré (wall-config.json)'), 't-err'); return; }
      const adminKey = store.get('yos-wall-admin', '');
      if (sub === 'status') {
        fetch(wallApi + '/health').then((r) => r.json()).then((h) => {
          termLine(`🌍 wall: ${h.count}/${h.cap} photos · ${h.frozen ? '🧊 FROZEN' : '🟢 accepting'}`, 't-ok');
        }).catch(() => termLine('wall: unreachable', 't-err'));
        return;
      }
      if (sub === 'admin') { store.set('yos-wall-admin', parts[2] || ''); termLine(trT('wall: owner key stored locally (never synced)', 'wall : clé stockée localement (jamais synchronisée)'), 't-ok'); return; }
      if (!adminKey) { termLine(trT('wall: owner tools need `wall admin <secret>` first', 'wall : outils proprio — `wall admin <secret>` d\'abord'), 't-err'); return; }
      if (sub === 'rm' && parts[2]) {
        fetch(wallApi + '/photo/' + parts[2], { method: 'DELETE', headers: { Authorization: 'Bearer ' + adminKey } })
          .then((r) => termLine(r.ok ? '🗑 removed' : 'refused (' + r.status + ')', r.ok ? 't-ok' : 't-err'));
        return;
      }
      if (sub === 'freeze' || sub === 'thaw') {
        fetch(wallApi + '/admin/' + sub, { method: 'POST', headers: { Authorization: 'Bearer ' + adminKey } })
          .then((r) => termLine(r.ok ? (sub === 'freeze' ? '🧊 wall frozen' : '🟢 wall thawed') : 'refused (' + r.status + ')', r.ok ? 't-ok' : 't-err'));
        return;
      }
      termLine('wall: status · admin <secret> · rm <id> · freeze · thaw', 't-dim');
      return;
    }
    if (cmd === 'watch' && !rest) {
      termLine(trT('⌚ opening the smartwatch pairing panel…', '⌚ ouverture du panneau d\'appairage montre…'), 't-ok');
      if (typeof watchPanelOpen === 'function') watchPanelOpen();
      return;
    }
    if (cmd === 'echo') { termLine(rest || ''); return; }
    if (cmd === 'cat') { termCatFile(rest); return; }

    // ---- pipe-aware classics (stdin arrives from `a | b` pipelines) ----
    if (cmd === 'grep') {
      if (!stdin) { termLine(trT('grep: pipe me something — try `help | grep pet`', 'grep : donnez-moi un tuyau — essayez `help | grep pet`'), 't-err'); return; }
      const pat = rest.toLowerCase();
      const hits = stdin.filter((l) => l.toLowerCase().includes(pat));
      if (hits.length) hits.forEach((l) => termLine(l, 't-ok'));
      else termLine(trT(`grep: no match for "${rest}"`, `grep : rien pour « ${rest} »`), 't-dim');
      return;
    }
    if (cmd === 'wc') {
      const src2 = stdin || (rest ? [rest] : []);
      const joined = src2.join(' ');
      termLine(`${src2.length} ${trT('lines', 'lignes')} · ${joined.split(/\s+/).filter(Boolean).length} ${trT('words', 'mots')} · ${joined.length} ${trT('chars', 'caractères')}`, 't-ok');
      return;
    }
    if (cmd === 'say' || cmd === 'speak') {
      const text = (rest || (stdin ? stdin.join('. ') : '')).slice(0, 220);
      if (!text) { termLine(trT('say: give me words — `say hi` (or pipe one: `fortune | say`)', 'say : donnez-moi des mots — `say hi` (ou en tuyau : `fortune | say`)'), 't-err'); return; }
      if (!('speechSynthesis' in window)) { termLine(trT('say: this browser has no voice. it mimes instead 🤐', 'say : ce navigateur n\'a pas de voix. il mime 🤐'), 't-err'); return; }
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05; u.pitch = 1.5;
      try { u.lang = yosLang === 'fr' ? 'fr-FR' : 'en-US'; } catch (e) { /* voice picks itself */ }
      speechSynthesis.speak(u);
      termLine(trT('🔊 the OS clears its throat and SAYS it. out loud. fourth wall: gone.', '🔊 l\'OS s\'éclaircit la voix et le DIT. à voix haute. quatrième mur : envolé.'), 't-ok');
      return;
    }
    if (cmd === 'slimesay') {
      const text = (rest || (stdin ? stdin.join(' ') : '') || 'pik?').slice(0, 58);
      const bar = '─'.repeat(text.length + 2);
      termLine('  ╭' + bar + '╮', 't-accent');
      termLine('  │ ' + text + ' │', 't-accent');
      termLine('  ╰' + bar + '╯', 't-accent');
      termLine('    \\', 't-dim');
      termLine('   ▄▄████▄▄', 't-accent');
      termLine('  █ ◕ ▽ ◕ █', 't-accent');
      termLine('   ▀▀▀▀▀▀▀▀', 't-accent');
      return;
    }

    // ---- fourth-wall department (privacy-first: we WRITE, we never read) ----
    if (cmd === 'title') {
      if (!rest) { termLine(trT('title <text> — rename the browser tab for 30s', 'title <texte> — renomme l\'onglet pendant 30 s'), 't-err'); return; }
      const old = document.title;
      document.title = rest.slice(0, 48);
      termLine(trT('👀 look up. the TAB believes you now. (reverting in 30s)', '👀 regardez en haut. l\'ONGLET vous croit. (retour dans 30 s)'), 't-ok');
      setTimeout(() => { document.title = old; }, 30000);
      return;
    }
    if (cmd === 'notify') {
      if (!('Notification' in window)) { termLine(trT('notify: this browser doesn\'t do notifications. it prefers eye contact.', 'notify : ce navigateur ne notifie pas. il préfère le contact visuel.'), 't-err'); return; }
      const msg = (rest || 'the slime says hi ♡').slice(0, 90);
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          new Notification('YongshanOS ♡', { body: msg, icon: 'apple-touch-icon.png' });
          termLine(trT('📬 delivered OUTSIDE the browser window. fourth wall: dust.', '📬 livré HORS de la fenêtre du navigateur. quatrième mur : poussière.'), 't-ok');
        } else {
          termLine(trT('📪 permission declined — extremely valid. the slime respects boundaries.', '📪 permission refusée — parfaitement valide. le slime respecte les limites.'), 't-dim');
        }
      });
      return;
    }
    if (cmd === 'copy') {
      if (!rest) { termLine(trT('copy <text> — puts text on YOUR clipboard (we never read it, only give)', 'copy <texte> — met du texte dans VOTRE presse-papiers (jamais lu, seulement offert)'), 't-err'); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(rest).then(
          () => termLine(trT('📋 copied. it\'s on your clipboard, a tiny gift.', '📋 copié. c\'est dans votre presse-papiers, un petit cadeau.'), 't-ok'),
          () => termLine(trT('copy: the browser said no. it happens.', 'copy : le navigateur a dit non. ça arrive.'), 't-err'));
      } else termLine(trT('copy: no clipboard API here', 'copy : pas d\'API presse-papiers ici'), 't-err');
      return;
    }
    if (cmd === 'paste') {
      termLine(trT('paste: refused. I don\'t read clipboards — not even adorable ones. privacy first ♡', 'paste : refusé. je ne lis pas les presse-papiers — même adorables. vie privée d\'abord ♡'), 't-err');
      return;
    }
    if (cmd === 'zoom') {
      const z = parseFloat(args[0]);
      if (!z || z < 0.5 || z > 2) { termLine(trT('zoom <0.5-2> — e.g. `zoom 1.3` (and `zoom 1` to undo)', 'zoom <0.5-2> — ex. `zoom 1.3` (et `zoom 1` pour annuler)'), 't-err'); return; }
      document.body.style.zoom = z;
      termLine(`🔍 zoom → ${z}${z === 1 ? trT(' (back to normal)', ' (retour à la normale)') : ''}`, 't-ok');
      return;
    }
    if (cmd === 'vibrate') {
      if (!navigator.vibrate) { termLine(trT('vibrate: this device sits perfectly still. dignified.', 'vibrate : cet appareil reste parfaitement immobile. digne.'), 't-dim'); return; }
      navigator.vibrate([80, 40, 80, 40, 160]);
      termLine(trT('📳 bzzt bzzt — that was a hug in morse code', '📳 bzzt bzzt — c\'était un câlin en morse'), 't-ok');
      return;
    }
    if (cmd === 'ping') {
      const host = args[0] || 'yongshan.dev';
      [1, 2, 3].forEach((n) => setTimeout(() => {
        termLine(`64 bytes from ${host}: icmp_seq=${n} time=${(2 + Math.random() * 20).toFixed(1)}ms ♡`, 't-ok');
      }, n * 340));
      setTimeout(() => termLine(trT(`--- ${host} ping statistics: 3 packets, 0% loss, 100% love ---`, `--- statistiques ${host} : 3 paquets, 0 % de perte, 100 % d'amour ---`), 't-dim'), 1500);
      return;
    }
    if (cmd === 'curl' || cmd === 'wget') {
      if (/yongshan\.dev/.test(lower) || !rest) {
        termLine('<!doctype cute>', 't-dim');
        termLine('<os name="YongshanOS" frameworks="0" slimes="1" pikmin="up to 72">', 't-dim');
        termLine(trT('  <p>you\'re already looking at the response body ♡</p>', '  <p>vous regardez déjà le corps de la réponse ♡</p>'), 't-ok');
        termLine('</os>', 't-dim');
      } else {
        termLine(trT(`curl: refusing to fetch "${args[0]}" — this shell only surfs the yongshan-web`, `curl : refus de récupérer « ${args[0]} » — ce shell ne surfe que le yongshan-web`), 't-err');
      }
      return;
    }
    if (cmd === 'git') { termGit(args); return; }
    if (cmd === 'npm' || cmd === 'pip' || cmd === 'brew') {
      const pkg = args[1] || args[0] || 'happiness';
      termLine(`${cmd}: resolving ${pkg}…`, 't-dim');
      setTimeout(() => termLine(trT(`${cmd}: refused. this OS ships 0 dependencies and it SHOWS ♡ (${pkg} not installed)`, `${cmd} : refusé. cet OS embarque 0 dépendance et ÇA SE VOIT ♡ (${pkg} non installé)`), 't-err'), 600);
      return;
    }
    if (cmd === 'whois') {
      TERM_COMMANDS.whoami();
      return;
    }
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
      else if (args[0] === 'yue') {
        // 粤语 easter egg — the shell tries its best
        termLine('识听唔识讲？冇问题，slime 都係咁 ♡（粤语模式研发中）', 't-accent');
        achvUnlock('yue');
      }
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
    if (cmd === 'google') {
      termLine(trT('google? never heard of it. redirecting to the SUPERIOR engine…', 'google ? connais pas. redirection vers le moteur SUPÉRIEUR…'), 't-ok');
      setTimeout(() => openWindow('win-search'), 500);
      return;
    }
    if (cmd === 'exit') {
      termLine(trT('bye!! closing window ♡', 'bye !! fermeture de la fenêtre ♡'), 't-dim');
      setTimeout(() => closeWindow(termWindow), 400);
      return;
    }

    const handler = TERM_COMMANDS[cmd];
    if (handler) handler();
    else if (tryFuzzyCheat(lower)) { /* the slime god heard a near-spell and took over */ }
    else termLine(trT(`${cmd}: command not found — try \`help\``, `${cmd} : commande introuvable — essayez \`help\``), 't-err');
  }

  // rapid-fire detector: >5 commands in 1.2s smells like automation
  var termBurst = [];
  var termBurstQuipAt = 0;
  function termBurstCheck() {
    const now = Date.now();
    termBurst.push(now);
    termBurst = termBurst.filter((ts) => now - ts <= 1200);
    if (termBurst.length > 5 && now - termBurstQuipAt > 30000) {
      termBurstQuipAt = now;
      termLine(trT('…are you a script? blink twice', '…tu es un script ? cligne deux fois'), 't-accent');
      achvUnlock('robot');
    }
  }

  if (termForm && termInput) {
    termForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = termInput.value;
      termInput.value = '';
      if (value.trim()) {
        try { achvBump('cmds'); } catch (err) { /* metrics are optional */ }
        termHistory.push(value);
        if (termHistory.length > 200) termHistory.shift(); // history has limits
        termHistoryIdx = termHistory.length;
        termBurstCheck();
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
      } else if (e.key === 'Tab') {
        // a real shell completes. so do we. (double-tab lists the options)
        e.preventDefault();
        const val = termInput.value;
        const parts0 = val.split(/\s+/);
        const isArg = parts0.length > 1;
        const token = parts0[parts0.length - 1].toLowerCase();
        if (!token) return;
        const pool = isArg && (parts0[0] === 'open' || parts0[0] === 'kill')
          ? Object.keys(TERM_OPEN_MAP)
          : Object.keys(TERM_COMMANDS).concat(['echo', 'cat', 'man', 'ask', 'search', 'open', 'kill', 'theme', 'lang', 'pet', 'sudo', 'grep', 'wc', 'say', 'slimesay', 'title', 'notify', 'copy', 'zoom', 'vibrate', 'ping', 'curl', 'git', 'npm', 'whois', 'cheats', 'hint', 'help']);
        const hits = [...new Set(pool)].filter((c) => c.startsWith(token)).sort();
        if (hits.length === 1) {
          parts0[parts0.length - 1] = hits[0];
          termInput.value = parts0.join(' ') + ' ';
        } else if (hits.length > 1) {
          const common = hits.reduce((a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return a.slice(0, i); });
          if (common.length > token.length) {
            parts0[parts0.length - 1] = common;
            termInput.value = parts0.join(' ');
          } else {
            termLine(hits.slice(0, 14).join('  '), 't-dim');
          }
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
    termLine(trT(`…oh, and this OS hides ${CHEAT_COUNT} cheat codes. type \`cheats\`. that's all I'm saying ♡`, `…oh, et cet OS cache ${CHEAT_COUNT} codes secrets. tapez \`cheats\`. je n'en dirai pas plus ♡`), 't-accent');
    termLine('');
  }

  // Save bookmark click — repeat pressers get an escalating storyline
  // (and an 8s cooldown on the actual fan gain, one heart per save spree)
  const btnSave = document.getElementById('btn-save-page');
  var saveClicks = 0;
  var saveFanAt = 0;
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      playSparkleSound();
      saveClicks++;
      if (saveClicks >= 10) {
        showToast(trT('ok. you can stop now. (you won\'t.)', 'ok. tu peux arrêter. (tu n\'arrêteras pas.)'));
        achvUnlock('clingy');
        if (!pet.sleeping && !pet.busy) showBubble(trT('you\'ve saved me 10 times. I live in your bookmarks bar now.', 'tu m\'as sauvegardé 10 fois. j\'habite dans ta barre de favoris maintenant.'), 3000);
      } else if (saveClicks >= 5) {
        showToast(trT('the bookmark is now load-bearing', 'le marque-page est désormais porteur'));
      } else if (saveClicks === 3) {
        showToast(trT('I remember you. I never forgot ♡', 'je me souviens de toi. je n\'ai jamais oublié ♡'));
      } else if (saveClicks === 2) {
        showToast(trT('already saved!! double pinky promise', 'déjà sauvegardé !! double promesse jurée'));
      } else {
        showToast(trT('✨ bookmarked in your heart ✨', '✨ enregistré dans ton cœur ✨'));
      }
      const now = Date.now();
      if (now - saveFanAt > 8000) { saveFanAt = now; gainFollowers(1); }
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
    if (persist && yosLang === 'fr') achvUnlock('frenchie');
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
    // a visible ad popup rebuilds itself in the new language on the spot
    if (typeof refreshGameInvite === 'function') refreshGameInvite();
    // live search results re-rank in the new language too
    try { if (searchInput && searchInput.value) renderSearch(searchInput.value); } catch (e) { /* pre-boot */ }
    // an open pikdex re-renders on the spot (wheel note, dossiers, buttons)
    try {
      const pikWin = document.getElementById('win-pikdex');
      if (pikWin && !pikWin.classList.contains('window-closed') && typeof renderPikdex === 'function') {
        if (typeof pikProfileHide === 'function') pikProfileHide();
        renderPikdex();
      }
    } catch (e) { /* pre-boot */ }

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
    if (themePref === 'auto') {
      // auto follows the VISITOR'S local clock: daylight hours get
      // light mode, evenings get dark. If the clock is unreadable,
      // fall back to the system preference.
      try {
        const hr = new Date().getHours();
        if (typeof hr === 'number' && hr >= 0 && hr <= 23) return (hr >= 7 && hr < 19) ? 'light' : 'dark';
      } catch (e) { /* clockless devices exist, apparently */ }
      return darkMQ.matches ? 'dark' : 'light';
    }
    return themePref === 'dark' ? 'dark' : 'light';
  }
  // re-evaluate the sun every 10 minutes so 19:00 flips the lights
  setInterval(() => {
    if (themePref === 'auto' && typeof applyTheme === 'function') applyTheme();
  }, 600000);

  function applyThemeChrome() {
    const tabTitle = document.getElementById('tab-title');
    const tabIcon = document.getElementById('tab-icon');
    const secureIcon = document.getElementById('secure-icon');
    if (tabTitle) tabTitle.innerHTML = 'YongshanOS&nbsp;♡';
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

    if (th === 'dark') { buildNightSky(); nsShootStart(); }
    else { nsShootStop(); if (typeof scheduleGameInvite === 'function') scheduleGameInvite(); }
    if (th === 'dark') achvUnlock('nightowl');
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
    // 92% of sleeps turn into a sleepwalking tour (dark mode's whole
    // arcade funnel walks on these little feet)
    if (Math.random() < 0.92) {
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
    if (document.body.classList.contains('terminal-only')) return; // the door hates popups
    // sleepwalks also launch from a maximized live room: a sleeping
    // streamer on stage is still a sleeping streamer
    const asleepOnStage = typeof liveOpen !== 'undefined' && liveOpen && pet.sleeping;
    if (sleepwalkActive || resolvedTheme() !== 'dark' || !(ghostHidden() || asleepOnStage)) return;
    // choose destination: 85% the arcade, else a random visible feature —
    // and if a run is already underway, it's the arcade, PERIOD (dark-mode
    // sleepwalks must never yank the player out of their game)
    const gwOpen = (() => { const w = document.getElementById('win-game'); return w && !w.classList.contains('window-closed'); })();
    let target, line, isGame = false, directDive = false;
    if (gwOpen) {
      // the game is ALREADY running: no button detours — the dreamer
      // waddles straight to the canvas and dives in as a game entity
      target = document.getElementById('game-canvas');
      line = SW_GAME_LINE;
      isGame = true;
      directDive = true;
    } else if (Math.random() < 0.92) {
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
    achvUnlock('dreamwatcher');

    const habitatRect = (typeof liveOpen !== 'undefined' && liveOpen && slimeBody)
      ? slimeBody.getBoundingClientRect()
      : slimeHabitat.getBoundingClientRect();
    swEl = document.createElement('div');
    swEl.className = 'sleepwalker';
    swEl.setAttribute('aria-hidden', 'true');
    const img = document.createElement('img');
    img.src = (OUTFIT_FRAMES && typeof OUTFIT_FRAMES.sleep === 'string' && OUTFIT_FRAMES.sleep) || 'assets/slime_night_sleep.png'; // current fit, eyes closed (canvas-mode frames can't feed an <img>)
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
        swArrive(target, isGame, directDive);
      }
    }, 40);
  }

  function swArrive(target, isGame, directDive) {
    // the sleepwalker "clicks" the feature open, still fast asleep —
    // unless it's already open (direct dives skip the doorbell)
    if (!directDive) { try { target.click(); } catch { /* dream logic */ } }
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

    nsShootStart();
  }

  // shooting stars only tick while it's actually night — light mode
  // clears the interval instead of idling forever
  var nsShootTimer = null;
  function nsShootStart() {
    if (nsShootTimer || REDUCED_MOTION) return;
    const sky = document.getElementById('night-sky');
    if (!sky) return;
    nsShootTimer = setInterval(() => {
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
  function nsShootStop() {
    if (nsShootTimer) { clearInterval(nsShootTimer); nsShootTimer = null; }
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
    'win-pikdex': 'pikdex.exe',
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
    pikdex: 'win-pikdex', pikmin: 'win-pikdex', dex: 'win-pikdex',
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

  /* =====================================================
     S2 EXTRAS — the traffic lights are REAL buttons now
     🔴 pink screen of death · 🟡 boss key · 🟢 fullscreen
     ===================================================== */
  var dotTuckedAway = null; // the yellow dot remembers who it tucked in
  var addrCheatTax = {};    // per-session greed ledger for address-bar cheats

  function bsodShow() {
    if (document.getElementById('yos-bsod')) return;
    const ov = document.createElement('div');
    ov.id = 'yos-bsod';
    ov.className = 'yos-bsod' + (REDUCED_MOTION ? ' bsod-still' : '');
    ov.setAttribute('role', 'alertdialog');
    ov.setAttribute('aria-label', 'SLIME_SCREEN_OF_DEATH — harmless easter egg');
    const face = document.createElement('div');
    face.className = 'bsod-face';
    face.textContent = ':(';
    const h = document.createElement('div');
    h.className = 'bsod-title';
    h.textContent = 'SLIME_SCREEN_OF_DEATH ♡';
    const body = document.createElement('div');
    body.className = 'bsod-body';
    [
      trT('your OS ran into a problem it kind of enjoys: CUTE_OVERFLOW at 0xFFB3DD', 'votre OS a rencontré un problème qui lui plaît un peu : CUTE_OVERFLOW à 0xFFB3DD'),
      trT('collecting error info… 100% (it was hearts. it was always hearts.)', 'collecte des infos d\'erreur… 100 % (c\'était des cœurs. depuis le début.)'),
      trT('press any key (or tap) to un-crash ♡', 'appuyez sur n\'importe quelle touche (ou tapotez) pour déplanter ♡')
    ].forEach((line) => {
      const p = document.createElement('p');
      p.textContent = line;
      body.appendChild(p);
    });
    ov.append(face, h, body);
    document.body.appendChild(ov);
    playTone(196, 'square', 0.22, 0, 0.06);
    playTone(147, 'square', 0.22, 0.18, 0.06);
    achvUnlock('bsod');
    const unCrash = (e) => {
      if (e && e.stopPropagation) { e.stopPropagation(); e.preventDefault(); }
      document.removeEventListener('keydown', unCrash, true);
      if (REDUCED_MOTION) { ov.remove(); return; }
      ov.classList.add('bsod-out'); // one CRT blink on the way back to life
      setTimeout(() => ov.remove(), 420);
    };
    ov.addEventListener('click', unCrash);
    document.addEventListener('keydown', unCrash, true);
  }

  function dotTuckToggle() {
    const open = [...document.querySelectorAll('.window')].filter((w) =>
      !w.classList.contains('window-closed') && !w.classList.contains('window-minimized'));
    if (open.length) {
      dotTuckedAway = open;
      open.forEach((w) => minimizeWindow(w));
      showToast(trT('everything tucked in ♡', 'tout le monde est bordé ♡'));
    } else if (dotTuckedAway && dotTuckedAway.length) {
      const batch = dotTuckedAway.filter((w) => !w.classList.contains('window-closed'));
      dotTuckedAway = null;
      batch.forEach((w) => {
        w.classList.remove('window-minimized');
        if (w.id === 'win-live' && typeof liveEnter === 'function') setTimeout(liveEnter, 120);
      });
      if (batch.length) focusWindow(batch[batch.length - 1]);
      if (typeof updateTaskbarAppButtons === 'function') updateTaskbarAppButtons();
      showToast(trT('rise and shine!! ♡', 'debout tout le monde !! ♡'));
    } else {
      showToast(trT('nothing to tuck in — the desktop is already dreaming ♡', 'rien à border — le bureau rêve déjà ♡'));
    }
  }

  function dotFullscreen() {
    const saidNo = () => showToast(trT('your browser said no… respect ♡', 'ton navigateur a dit non… respect ♡'));
    if (document.fullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      return;
    }
    if (!document.documentElement.requestFullscreen) { saidNo(); return; }
    const req = document.documentElement.requestFullscreen();
    if (req && req.catch) req.catch(saidNo);
  }

  const dotRed = document.querySelector('.browser-dots .dot.red');
  const dotYellow = document.querySelector('.browser-dots .dot.yellow');
  const dotGreen = document.querySelector('.browser-dots .dot.green');
  if (dotRed) dotRed.addEventListener('click', () => { playClickSound(); bsodShow(); });
  if (dotYellow) dotYellow.addEventListener('click', () => { playClickSound(); dotTuckToggle(); });
  if (dotGreen) dotGreen.addEventListener('click', () => { playClickSound(); dotFullscreen(); });

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


    // konami spirit: whisper a cheat into the address bar, get coins next run.
    // greed tax: the same word pays out 10 → 5 → 2 → 0 per session
    if (path === 'cheat' || path === 'uwu' || path === 'iddqd') {
      const n = (addrCheatTax[path] = (addrCheatTax[path] || 0) + 1);
      const payout = n === 1 ? 10 : n === 2 ? 5 : n === 3 ? 2 : 0;
      if (payout > 0) {
        store.set('yos-pending-coins', store.get('yos-pending-coins', 0) + payout);
        showToast(n === 1
          ? trT('cheat accepted. +10 coins next run. the slime saw nothing 👀', 'triche acceptée. +10 pièces à la prochaine run. le slime n\'a rien vu 👀')
          : trT(`same spell again?? fine. +${payout} coins (inflation is real)`, `encore le même sort ?? bon. +${payout} pièces (l'inflation existe)`));
        playSparkleSound();
      } else {
        showToast(trT('the tax slime has entered the chat: 0 coins', 'le slime fiscal est entré dans le chat : 0 pièce'));
        playTone(220, 'square', 0.12, 0, 0.05);
        achvUnlock('greedy');
      }
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
    { title: 'pikdex.exe — the pikmin collection deck', url: 'yongshan.dev/pikdex.exe', desc: 'Every plucked buddy archived forever: tech names, CS techniques, and a 24-segment hue wheel to complete.', win: 'win-pikdex', k: 'pikdex pikmin collection deck hue wheel colour color roue chromatique collection 图鉴 收集' },
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

  /* ---------- yongle = a REAL site-wide full-text engine ----------
     It indexes every localized string on the OS (career bullets,
     education, skills, AMA answers, window copy…) and serves ranked
     snippets. No pinned ads, no fake rankings — just the site. */
  var SITE_INDEX_CACHE = null, SITE_INDEX_LANG = null;
  function siteIndex() {
    const lang = yosLang === 'fr' ? 'fr' : 'en';
    if (SITE_INDEX_CACHE && SITE_INDEX_LANG === lang) return SITE_INDEX_CACHE;
    const dict = (window.YOS_I18N && window.YOS_I18N[lang]) || {};
    const map = [
      [/^career\./, 'win-career', 'file.career'],
      [/^edu/, 'win-education', 'file.edu'],
      [/^(skills|inv|equip)/, 'win-skills', 'file.inventory'],
      [/^ama\./, 'win-ama', 'file.ama'],
      [/^live\./, 'win-live', 'file.live'],
      [/^game\./, 'win-game', 'file.game'],
      [/^lb\./, 'win-leaderboard', 'file.leaderboard'],
      [/^iv\./, 'win-interview', 'file.interview'],
      [/^side\./, 'win-career', 'file.career'],
      [/^term\./, 'win-terminal', 'file.terminal'],
      [/^wall\./, 'win-career', 'file.career']
    ];
    const out = [];
    Object.keys(dict).forEach((key) => {
      const val = dict[key];
      if (typeof val !== 'string' || val.length < 24) return; // meaty content only
      const m = map.find(([re]) => re.test(key));
      if (!m) return;
      out.push({ text: val, win: m[1], title: t(m[2]), url: 'yongshan.dev/' + m[1].replace('win-', '') });
    });
    if (typeof AMA_TOPICS !== 'undefined') { // the resume answers live here
      AMA_TOPICS.forEach((tp) => {
        const txt = lang === 'fr' ? (tp.fr || tp.a) : tp.a;
        if (typeof txt === 'string' && txt.length > 30) {
          out.push({ text: txt, win: 'win-ama', title: t('file.ama'), url: 'yongshan.dev/ask_me.chat' });
        }
      });
    }
    SITE_INDEX_CACHE = out;
    SITE_INDEX_LANG = lang;
    return out;
  }

  function searchSnippet(text, term) {
    const flat = text.replace(/\s+/g, ' ');
    const i = flat.toLowerCase().indexOf(term);
    if (i < 0) return flat.slice(0, 140) + (flat.length > 140 ? '…' : '');
    const start = Math.max(0, i - 55);
    const end = Math.min(flat.length, i + term.length + 90);
    return (start > 0 ? '…' : '') + flat.slice(start, end).trim() + (end < flat.length ? '…' : '');
  }

  function webSearchHome() {
    // hand off to whatever engine the visitor's browser ships with
    const b = (typeof YOS_DEVICE !== 'undefined' && YOS_DEVICE.browser) || '';
    return b === 'edge' ? 'https://www.bing.com/search?q=' : 'https://www.google.com/search?q=';
  }

  /* ---------- Yongshan's Edmonton restaurant chart ----------
     Surfaces when anyone searches food things. Marked "sponsored"
     (this ad slot is, of course, for rent). Ranking: NONE — the
     order means nothing, the love is equal. Likes & wanna-try
     counts live on the shared Abacus backend. */
  const RESTO_LIST = [
    { n: "Nando's Peri Peri", u: 'https://share.google/x4SeYODZtiUIijJ70', note: ['flame-grilled. the slime respects fire.', 'grillé à la flamme. le slime respecte le feu.'] },
    { n: "McDonald's", u: 'https://share.google/IX6i6CSQh38ylLxQB', note: ['the lil fries?? fragrant. she thinks about them DAILY 😋', 'les petites frites ?? parfumées. elle y pense TOUS les jours 😋'] },
    { n: 'Starbucks', u: 'https://share.google/JcN6d32MRRlGo3g17', note: ['matcha latte + matcha frap with EXTRA cream. non-negotiable.', 'matcha latte + frappuccino matcha avec SUPPLÉMENT de crème. non négociable.'] },
    { n: 'Potato Corner', u: 'https://share.google/KiCG1pOlEI4kgfMXQ', note: ['BBQ flavour + sour cream & onion. trust the process.', 'saveur BBQ + oignon-crème. fais confiance au process.'] },
    { n: 'Nara Katsu', u: 'https://share.google/eBLV7niLsZ7Qq99lU', note: ['MEGA recommendation. the katsu is life-changing.', 'MÉGA recommandation. le katsu change une vie.'] },
    { n: 'Old Spaghetti Factory', u: 'https://share.google/8rt9OxVsrXXs73O8L', note: ['pasta in an old-timey trolley. peak vibes.', 'des pâtes dans un vieux tramway. ambiance maximale.'] },
    { n: 'Dorinku Osaka', u: 'https://share.google/3GIDBGf9F54xHOXPz', note: ['izakaya energy. everything slaps.', 'énergie izakaya. tout est excellent.'] },
    { n: "Emperor's Palace dim sum", u: 'https://share.google/3olYuV4hl1phL7Ybu', note: ['dim sum = microservices, but delicious.', 'dim sum = microservices, mais délicieux.'] },
    { n: 'Wing Snob', u: 'https://share.google/XwJRLKFyptUGaDbKD', note: ['everything salt & pepper. dip: creamy parmesan. thank me later.', 'tout en sel-poivre. sauce : parmesan crémeux. tu me remercieras.'] },
    { n: 'Costco', u: 'https://share.google/lBigLGuqPjKb7h3vz', note: ['$1.50 hotdog + bottomless drink + the free-samples world tour.', 'hot-dog à 1,50 $ + boisson à volonté + tour du monde des échantillons gratuits.'] }
  ];
  var restoCounts = null;
  function restoBase(i, kind) { return kind === 'l' ? 37 + (i * 13) % 90 : 21 + (i * 17) % 70; }
  function restoFetchCounts() {
    if (restoCounts) return Promise.resolve(restoCounts);
    const keys = [];
    RESTO_LIST.forEach((r, i) => { keys.push('resto-l-' + i, 'resto-t-' + i); });
    return Promise.all(keys.map((k) =>
      fetch(`${LIKE_API}/get/${LIKE_NS}/${k}`).then((r2) => (r2.ok ? r2.json() : { value: 0 })).then((d) => Math.max(0, Number(d.value) || 0)).catch(() => 0)
    )).then((vals) => {
      restoCounts = {};
      keys.forEach((k, ix) => { restoCounts[k] = vals[ix]; });
      return restoCounts;
    });
  }
  function restoVoteBtn(i, kind, labelPair) {
    const key = `resto-${kind}-${i}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'resto-vote resto-vote-' + kind;
    const voted = store.get('yos-resto-voted', {});
    const count = () => restoBase(i, kind) + ((restoCounts && restoCounts[key]) || 0) + (voted[key] ? 0 : 0);
    btn.textContent = `${trT(labelPair[0], labelPair[1])} ${count().toLocaleString()}`;
    if (voted[key]) btn.classList.add('voted');
    btn.addEventListener('click', () => {
      const v = store.get('yos-resto-voted', {});
      if (v[key]) { playTone(987, 'sine', 0.06, 0, 0.04); return; }
      v[key] = 1;
      store.set('yos-resto-voted', v);
      if (restoCounts) restoCounts[key] = (restoCounts[key] || 0) + 1;
      btn.textContent = `${trT(labelPair[0], labelPair[1])} ${count().toLocaleString()}`;
      btn.classList.add('voted');
      playSparkleSound();
      fetch(`${LIKE_API}/hit/${LIKE_NS}/${key}`).catch(() => { /* offline vote stays local */ });
    });
    return btn;
  }
  function renderRestoChart() {
    const wrap = document.createElement('div');
    wrap.className = 'resto-chart';
    const head = document.createElement('div');
    head.className = 'sr-sponsored-tag';
    head.textContent = trT('♡ sponsored (by my own stomach) · ranking: NONE, love is equal · this ad slot is for rent', '♡ sponsorisé (par mon propre estomac) · classement : AUCUN, amour égal · cet espace pub est à louer');
    wrap.appendChild(head);
    RESTO_LIST.forEach((r, i) => {
      const card = document.createElement('div');
      card.className = 'search-result resto-card';
      const a = document.createElement('a');
      a.href = r.u;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'sr-title';
      a.textContent = `📍 ${r.n}`;
      const desc = document.createElement('div');
      desc.className = 'sr-desc';
      desc.textContent = trT(r.note[0], r.note[1]);
      const votes = document.createElement('div');
      votes.className = 'resto-votes';
      votes.appendChild(restoVoteBtn(i, 'l', ['💖 I love it too!!', '💖 moi aussi !!']));
      votes.appendChild(restoVoteBtn(i, 't', ['🍜 wanna try', '🍜 envie d\'essayer']));
      card.append(a, desc, votes);
      // any tap makes the card do a happy lil hop — driven by the
      // Web Animations API so no CSS rule can ever eat the bounce
      card.addEventListener('click', () => {
        try {
          card.animate([
            { transform: 'translateY(0)' },
            { transform: 'translateY(-7px) scale(1.015)', offset: 0.35 },
            { transform: 'translateY(2px)', offset: 0.75 },
            { transform: 'translateY(0)' }
          ], { duration: 340, easing: 'ease-out' });
        } catch (e) { /* ancient browsers just get the click */ }
      });
      wrap.appendChild(card);
    });
    restoFetchCounts().then(() => {
      // refresh counts in place once the backend answers
      wrap.querySelectorAll('.resto-vote').forEach((b) => b.remove());
      wrap.querySelectorAll('.resto-card').forEach((card, i) => {
        const votes = card.querySelector('.resto-votes');
        votes.appendChild(restoVoteBtn(i, 'l', ['💖 I love it too!!', '💖 moi aussi !!']));
        votes.appendChild(restoVoteBtn(i, 't', ['🍜 wanna try', '🍜 envie d\'essayer']));
      });
    });
    return wrap;
  }

  function renderSearch(q) {
    if (!searchResults) return;
    const query = (q || '').trim();
    if (searchInput && searchInput.value !== query) searchInput.value = query;
    searchResults.innerHTML = '';

    if (!query) {
      if (searchMeta) searchMeta.textContent = t('search.empty');
      return;
    }

    // food query? Yongshan's Edmonton chart IS the whole page —
    // no site results, no web line, just the good eats
    if (/restaurant|resto|food|eat|boba|hungry|餐厅|美食|吃|奶茶/i.test(query)) {
      if (searchMeta) searchMeta.textContent = trT('10 hand-picked spots (0.0001s — all of them delicious)', '10 adresses choisies à la main (0,0001 s — toutes délicieuses)');
      searchResults.appendChild(renderRestoChart());
      return;
    }

    // ---------- pinned special cards (trolls, soap, ego) ----------
    const specialCard = (cls, title, desc, clickToast) => {
      const card = document.createElement('div');
      card.className = 'search-result sr-special ' + cls;
      const tl = document.createElement('div');
      tl.className = 'sr-title';
      tl.textContent = title;
      const d = document.createElement('div');
      d.className = 'sr-desc';
      d.textContent = desc;
      card.append(tl, d);
      card.addEventListener('click', () => showToast(clickToast));
      searchResults.appendChild(card);
    };
    // 🚨 injection attempts earn a commemorative card, not a parser
    if (/(<|>|script|onerror|alert\(|drop table|union select|\.\.\/)/i.test(query)) {
      specialCard('sr-haxx',
        trT('🚨 nice try, hacker-chan ♡', '🚨 bien tenté, hacker-chan ♡'),
        trT('this input is textContent-pilled. 0 rows dropped.', 'cette barre carbure au textContent. 0 table supprimée.'),
        trT('still textContent. still 0 rows ♡', 'toujours du textContent. toujours 0 table ♡'));
      achvUnlock('haxx');
    } else if (/\b(fuck|fucking|shit|bitch|cunt|asshole|bastard|damn|merde|putain)\b/i.test(query)) {
      // 🧼 potty-mouth queries meet the soap
      specialCard('sr-soap',
        '🧼 * * * * *',
        trT('washed. try a kinder query ♡', 'lavé. essaie une recherche plus gentille ♡'),
        trT('the soap remains undefeated', 'le savon reste invaincu'));
    } else if (/yongshan/i.test(query)) {
      // ⭐ the ego result — objectively accurate
      specialCard('sr-ego',
        '★★★★★ Yongshan Yu — 10/10 would ship again',
        trT('reviewed by: the slime, the geese, two recruiters and this entire OS.', 'notée par : le slime, les bernaches, deux recruteurs et cet OS tout entier.'),
        trT('rating locked at 5 stars ♡', 'note verrouillée à 5 étoiles ♡'));
    }

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    // 1) navigational hits (apps & features by keyword)
    const navHits = SEARCH_LOCAL
      .map((r) => {
        const hay = (r.title + ' ' + r.desc + ' ' + r.k).toLowerCase();
        const score = terms.reduce((s, term) => s + (hay.includes(term) ? term.length * 3 : 0), 0);
        return { r, score };
      })
      .filter((x) => x.score > 0);
    // 2) full-text hits across every string the site knows about
    const seen = new Set();
    const textHits = [];
    siteIndex().forEach((entry) => {
      const hay = entry.text.toLowerCase();
      let score = 0, first = null;
      terms.forEach((term) => {
        let idx = hay.indexOf(term);
        while (idx !== -1) { score += term.length; if (first === null) first = term; idx = hay.indexOf(term, idx + 1); }
      });
      if (!score) return;
      const snip = searchSnippet(entry.text, first);
      const dupKey = entry.win + '|' + snip.slice(0, 60);
      if (seen.has(dupKey)) return;
      seen.add(dupKey);
      textHits.push({ r: { title: entry.title, url: entry.url, desc: snip, win: entry.win }, score });
    });

    const all = navHits.concat(textHits).sort((a, b) => b.score - a.score).slice(0, 9);
    if (searchMeta) {
      searchMeta.textContent = t('search.meta').replace('{n}', String(all.length));
    }
    all.forEach(({ r }) => searchResults.appendChild(makeSearchResult(r)));

    if (!all.length && !searchResults.querySelector('.sr-special')) {
      const none = document.createElement('div');
      none.className = 'sr-desc';
      none.textContent = t('search.none');
      searchResults.appendChild(none);
    }

    const webline = document.createElement('div');
    webline.className = 'search-result sr-webline';
    const a = document.createElement('a');
    a.href = webSearchHome() + encodeURIComponent(query);
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
    s = String(s == null ? '' : s); // stored seeds from old versions may not be strings
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
    // Esc triage: 1) an open context menu eats the whole keypress
    if (ctxMenu && !ctxMenu.hidden) { hideCtxMenu(); return; }
    const active = [...windows].find((w) => w.classList.contains('window-active') &&
      !w.classList.contains('window-closed') && !w.classList.contains('window-minimized'));
    if (!active) return;
    // 2) a game mid-run pauses first — the SECOND Esc closes the window
    if (active.id === 'win-game' && typeof GAME !== 'undefined' && GAME.state === 'run' && !GAME.itvPause && !GAME.escPause) {
      GAME.escPause = true;
      GAME.adT = 0;
      GAME.adSkit = Math.floor(Math.random() * 4);
      if (typeof gToast === 'function') gToast(['⏸ paused ♡ — Esc again to close', '⏸ pause ♡ — encore Esc pour fermer'], 240);
      if (!pet.sleeping && !pet.busy && typeof showBubble === 'function') {
        showBubble(trT('paused ♡ — Esc again to close', 'pause ♡ — encore Esc pour fermer'), 2200);
      }
      return;
    }
    // 3) everything else: close the active window
    if (active.id === 'win-game' && typeof GAME !== 'undefined') GAME.escPause = false; // never trap a future run
    closeWindow(active);
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
      achvUnlock('liked');
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
    GAME.nextEventSec = 18 + Math.random() * 6;
    GAME.invUntil = 0;
    GAME.adUsed = false; // one ad-revive per run
    GAME.nm = null; GAME.nmPx = null; // nightmares don't survive a reboot
    if (typeof liveAway === 'function') liveAway(false);
    const rcam = document.getElementById('game-reaction-cam');
    if (rcam) rcam.classList.remove('cam-ad-dock');
    // terminal secret codes cash in here, one per armed run
    const cheat = store.get('yos-cheat-next', null);
    if (cheat) {
      store.set('yos-cheat-next', null);
      if (cheat === 'god') { fxInvincible(45); gToast(['😇 CHEAT: 45s of pure invincibility', '😇 CHEAT : 45 s d\'invincibilité pure'], 180); }
      else if (cheat === 'rich5') { GAME.coins += 5; gToast(['💰 CHEAT: +5 coins', '💰 CHEAT : +5 pièces'], 140); }
      else if (cheat === 'rich20') { GAME.coins += 20; gToast(['💰 CHEAT: +20 coins', '💰 CHEAT : +20 pièces'], 140); }
      else if (cheat === 'rich50') { GAME.coins += 50; gToast(['🤑 CHEAT: +50 coins', '🤑 CHEAT : +50 pièces'], 160); }
      else if (cheat === 'fast') { setMod('speed', 1.35, 40); gToast(['☕ CHEAT: espresso velocity (40s)', '☕ CHEAT : vélocité expresso (40 s)'], 150); }
      else if (cheat === 'fever') { fxFever(12); gToast(['🌈 CHEAT: fever from second zero', '🌈 CHEAT : fièvre dès la seconde zéro'], 150); }
      else if (cheat === 'big') { setMod('size', 1.5, 60); gToast(['🍔 CHEAT: absolute unit (60s)', '🍔 CHEAT : unité absolue (60 s)'], 150); }
      else if (cheat === 'tiny') { setMod('size', 0.6, 60); gToast(['🐜 CHEAT: smol mode (60s)', '🐜 CHEAT : mode mini (60 s)'], 150); }
      else if (cheat === 'float') { setMod('jump', 1.5, 60); gToast(['🎈 CHEAT: gravity is a suggestion (60s)', '🎈 CHEAT : la gravité est une suggestion (60 s)'], 150); }
      else if (cheat === 'luck') { setMod('luck', 1.4, 60); gToast(['🍀 CHEAT: suspiciously lucky (60s)', '🍀 CHEAT : chance suspecte (60 s)'], 150); }
      else if (cheat === 'life') { GAME.lives += 1; gToast(['💖 CHEAT: bonus heart installed', '💖 CHEAT : cœur bonus installé'], 150); }
      else if (cheat === 'boss') { GAME.nextBossAt = 40; gToast(['👹 CHEAT: a boss took the early shift', '👹 CHEAT : un boss a pris le service du matin'], 170); }
    }
    gAttachPiks(!!cheat); // the petal squad rides along on every single run
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
    if (GAME.state === 'ad') return; // the sponsor bought these 15 seconds
    if (GAME.itvPause) return; // paused for interview booking — relax ♡
    if (GAME.escPause) { // Esc-paused: a jump input un-pauses instead
      GAME.escPause = false;
      gToast(['▶ resumed ♡', '▶ reprise ♡'], 140);
      return;
    }
    if (GAME.state === 'idle' || GAME.state === 'over') {
      if (GAME.state === 'over' && Date.now() < (GAME.overLockUntil || 0)) return; // read the offer first ♡
      GAME.state = 'run';
      gReset();
      playClickSound();
      if (!navigator.onLine) achvUnlock('nowifi');
      // a saved nightmare stirs: in the dark, it comes back for you
      if (resolvedTheme() === 'dark' && store.get('yos-nm-save', null)) {
        gToast(['💾 a saved NIGHTMARE stirs… it returns in a few seconds', '💾 un CAUCHEMAR sauvegardé s\'agite… il revient dans quelques secondes'], 220);
        setTimeout(() => { if (GAME.state === 'run' && !GAME.nm) gNightmareStart(); }, 6000);
      }
      return;
    }
    if (GAME.y <= 0) {
      GAME.vy = 9.6 * modVal('jump');
      GAME.jumpsThisRun = (GAME.jumpsThisRun || 0) + 1;
      playTone(880 * (modActive('uwu') ? 1.5 : 1), 'square', 0.09, 0, 0.05);
      if (modActive('uwu')) playTone(1568, 'sine', 0.12, 0.06, 0.05); // embarrassing squeak
    }
  }

  function gGameOver() {
    GAME.state = 'over';
    if (typeof nmClearAttack === 'function') nmClearAttack(); // no orphan summon overlays
    const stamp = document.getElementById('nm-hire-stamp');
    if (stamp) stamp.remove();
    // a held-down space bar must not insta-restart past the ad offer
    GAME.overLockUntil = Date.now() + 2500;
    playGlitchSound();
    maybeWakeSleeper();
    const finalScore = Math.floor(GAME.score);
    if (gPlaySecs() < 3) achvUnlock('speedran');
    const isRecord = finalScore > GAME.hi;
    if (isRecord) {
      GAME.hi = finalScore;
      store.set('yos-runner-hi', GAME.hi);
      cloudQueueSync();
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
    // the reaction-cam slime pitches the classic mobile-game deal
    if (!GAME.adUsed && !pet.sleeping) {
      setTimeout(() => {
        if (GAME.state === 'over' && !GAME.adUsed) {
          showBubble(trT('psst… watch a lil ad and I revive you ♡ (press A)', 'psst… regarde une mini pub et je te ressuscite ♡ (touche A)'), 3400);
        }
      }, 1000);
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
    // i-frames render as a steady translucent ghost — NEVER a strobe
    // (flashing is a photosensitivity hazard; alpha is just as readable)
    const ghosted = GAME.frame < GAME.invUntil;
    if (ghosted) g2.globalAlpha = 0.32;
    // during the nightmare the slime roams freely on WASD
    const baseX = GAME.nm ? GAME.nmPx : G_SLIME_X;
    const bob = GAME.state === 'run' && GAME.y <= 0 ? Math.sin(GAME.frame * 0.35) * 2 : 0;
    const squash = (GAME.y <= 0 ? 1 + Math.sin(GAME.frame * 0.35) * 0.04 : 0.94) * modVal('size');
    const h = G_SLIME_S * squash;
    const yTop = G_GROUND - h - GAME.y + bob;
    if (gSprite.complete && gSprite.naturalWidth) {
      g2.drawImage(gSprite, baseX, yTop, G_SLIME_S, h);
    } else {
      g2.fillStyle = '#7ee0a3';
      g2.fillRect(baseX + 4, yTop + 8, G_SLIME_S - 8, h - 8);
      g2.fillStyle = gTheme.ink;
      g2.fillRect(baseX + 10, yTop + 14, 3, 3);
      g2.fillRect(baseX + 20, yTop + 14, 3, 3);
    }
    if (ghosted) g2.globalAlpha = 1;
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

  function gTick(manual) {
    if (manual !== true) requestAnimationFrame(gTick); // manual test-steps must not fork the loop
    if (!gCanvas || !gWin) return;
    if (gWin.classList.contains('window-closed') || gWin.classList.contains('window-minimized')) return;

    if (GAME.frame % 90 === 0) gFitCanvas();
    const g2 = gCanvas.getContext('2d');
    g2.setTransform(G_SCALE, 0, 0, G_SCALE, 0, 0);
    g2.imageSmoothingEnabled = false;
    GAME.frame++;
    g2.clearRect(0, 0, G_W, G_H);

    // the sponsor's 15 seconds tick down even while the world sleeps
    if (GAME.state === 'ad') {
      GAME.adT++;
      if (GAME.adT >= AD_FRAMES) gAdFinish();
    }
    // every fresh encounter arms a 1.6s shield against held-down space —
    // long enough to stop a buffered jump, short enough to never feel broken
    if (GAME.event && !GAME.event._born) {
      GAME.event._born = 1;
      GAME.eventLockUntil = Date.now() + 1600;
    }

    // Edmonton weather leaks into the runner — visuals only, the
    // physics department accepts no bribes from the sky
    const wxKind = (typeof wxCurrent !== 'undefined' && wxCurrent) || null;
    const wxRainy = wxKind === 'rain' || wxKind === 'thunder' || wxKind === 'sleet';
    const wxSnowy = wxKind === 'snow' || wxKind === 'blizzard' || wxKind === 'hail';

    // parallax hearts drifting in the sky
    if (GAME.clouds.length < 4 && Math.random() < 0.02) {
      GAME.clouds.push({ x: G_W + 20, y: 14 + Math.random() * 60, c: Math.random() < 0.5 ? '♡' : '✦' });
    }
    g2.font = "13px 'Jersey 25', 'VT323', monospace";
    GAME.clouds.forEach((cl) => {
      cl.x -= 0.6;
      g2.fillStyle = wxSnowy ? '#9fc4ea' : (cl.c === '♡' ? gTheme.pink : gTheme.blue); // snow days tint the sky icy blue
      g2.globalAlpha = 0.55;
      g2.fillText(cl.c, cl.x, cl.y);
      g2.globalAlpha = 1;
    });
    GAME.clouds = GAME.clouds.filter((cl) => cl.x > -20);

    if (wxRainy) {
      // pixel rain streaks + puddles glinting along the track
      g2.fillStyle = 'rgba(108, 196, 245, 0.5)';
      for (let i = 0; i < 14; i++) {
        const rx = (i * 67 + GAME.frame * 5) % (G_W + 20) - 10;
        const ry = (i * 41 + GAME.frame * 7) % G_GROUND;
        g2.fillRect(rx, ry, 1, 6);
      }
      g2.fillStyle = 'rgba(108, 196, 245, 0.35)';
      for (let i = 0; i < 3; i++) {
        const scroll = GAME.state === 'run' && !GAME.nm ? (GAME.frame * GAME.speed) % (G_W + 60) : 0;
        const px = ((i * 173 + 40 - scroll) % (G_W + 60) + (G_W + 60)) % (G_W + 60) - 30;
        g2.fillRect(px, G_GROUND + G_SLIME_S - 2, 26, 2);
      }
    } else if (wxSnowy) {
      // slow pixel snowfall
      g2.fillStyle = 'rgba(207, 233, 255, 0.85)';
      for (let i = 0; i < 12; i++) {
        const sx = (i * 83 + Math.floor(GAME.frame / 2) + (i % 3) * 7) % G_W;
        const sy = (i * 37 + Math.floor(GAME.frame / 3)) % G_GROUND;
        g2.fillRect(sx, sy, 2, 2);
      }
    } else if (wxKind === 'clear') {
      const wxHr = new Date().getHours();
      if (wxHr >= 7 && wxHr < 19) { // a tiny sun clocks in for the day shift
        g2.fillStyle = '#ffe98a';
        g2.fillRect(G_W - 34, 10, 12, 12);
        g2.fillRect(G_W - 38, 14, 20, 4);
        g2.fillRect(G_W - 30, 6, 4, 20);
      }
    }

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
      // soft glow wash, capped well below strobe territory
      g2.fillStyle = `rgba(255, 244, 220, ${Math.min(0.28, GAME.flash / 40)})`;
      g2.fillRect(0, 0, G_W, G_H);
      GAME.flash--;
    }
    // (toast now draws AFTER the event card — see below — so shop
    // cards can never bury a "not enough coins" message again)

    // dashed pixel ground (the world stands STILL during the nightmare)
    g2.fillStyle = wxSnowy ? '#9fc4ea' : gTheme.purple; // fresh powder on snow days
    const dashShift = (GAME.state === 'run' && !GAME.nm) ? (GAME.frame * GAME.speed) % 18 : 0;
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
      gPiksTick();
    } else if (GAME.state === 'run' && GAME.nm && !GAME.event) {
      // nightmare arena: scroll, spawns and score hold their breath —
      // only jump physics and the boss itself keep moving
      if (GAME.y > 0 || GAME.vy > 0) {
        GAME.y += GAME.vy;
        GAME.vy -= 0.52;
        if (GAME.y <= 0) { GAME.y = 0; GAME.vy = 0; }
      }
      gNmTick();
    }

    // ---- BOSS WAVE: a 404 kaiju + a heart-wand power-up ----
    if (gLive()) {
      if (!GAME.boss && !GAME.nm && GAME.score >= GAME.nextBossAt) {
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
            achvUnlock('bosskill');
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

    gDrawPiks(g2);
    gDrawWeaponBuddy(g2);
    if (GAME.nm) gDrawNm(g2);
    gDrawSlime(g2);
    if (GAME.weapon) {
      gDrawMat(g2, G_MATS.wand, G_SLIME_X + G_SLIME_S - 2, G_GROUND - G_SLIME_S - GAME.y - 8, 1.6);
    }
    // rogue layer: loot, HUD, encounter overlay
    gLootTick(g2);
    gDrawRogueHud(g2);
    if (GAME.event) gDrawEvent(g2);

    // toast rides ABOVE everything. during an encounter it drops to
    // the footer lane on a dark chip — visible over any shop card
    if (GAME.toast) {
      g2.textAlign = 'center';
      g2.font = "12px 'Jersey 25', 'VT323', monospace";
      if (GAME.event) {
        const ty = G_H - 8;
        const tw = g2.measureText(GAME.toast.text).width;
        g2.fillStyle = '#14020e';
        g2.fillRect(G_W / 2 - tw / 2 - 9, ty - 13, tw + 18, 18);
        g2.fillStyle = GAME.toast.ttl % 12 < 6 ? '#ffd400' : '#ffb7e2';
        g2.fillText(GAME.toast.text, G_W / 2, ty);
      } else {
        g2.fillStyle = GAME.toast.ttl % 12 < 6 ? gTheme.pink : gTheme.purple;
        g2.fillText(GAME.toast.text, G_W / 2, 22);
      }
      g2.textAlign = 'left';
      if (--GAME.toast.ttl <= 0) GAME.toast = null;
    }

    // console mode: score & best live INSIDE the screen, bottom corners
    if (GAME.consoleMode) {
      g2.font = "12px 'Jersey 25', 'VT323', monospace";
      g2.textAlign = 'left';
      g2.fillStyle = gTheme.pink;
      g2.fillText(`${t('game.score')} ${Math.floor(GAME.score)}`, 8, G_H - 9);
      g2.textAlign = 'right';
      g2.fillStyle = gTheme.ink;
      g2.fillText(`★ ${GAME.hi}`, G_W - 8, G_H - 9);
      g2.textAlign = 'left';
    }

    // overlay text — NEVER while an encounter card (coach, gods,
    // shop…) is on screen: one storyteller at a time
    g2.textAlign = 'center';
    g2.font = "16px 'Jersey 25', 'VT323', monospace";
    if (GAME.event) {
      // the event card owns the screen — no overlay text at all
    } else if (GAME.state === 'idle') {
      g2.fillStyle = gTheme.ink;
      g2.fillText(t('game.start'), G_W / 2, 58);
      g2.fillStyle = gTheme.pink;
      g2.fillText('♡', G_W / 2, 78);
    } else if (GAME.state === 'over') {
      g2.fillStyle = gTheme.pink;
      g2.fillText(t('game.over'), G_W / 2, 62);
      if (!GAME.adUsed) {
        // hot-pink chip: readable on every theme, impossible to miss
        const offer = trT('📺 [A] watch a lil ad → revive ♡', '📺 [A] mini pub → résurrection ♡');
        g2.font = "13px 'Jersey 25', 'VT323', monospace";
        const tw = g2.measureText(offer).width;
        g2.fillStyle = '#14020e';
        g2.fillRect(G_W / 2 - tw / 2 - 10, 72, tw + 20, 22);
        g2.fillStyle = '#f0509f';
        g2.fillRect(G_W / 2 - tw / 2 - 8, 74, tw + 16, 18);
        g2.fillStyle = '#ffffff';
        g2.fillText(offer, G_W / 2, 87);
      }
    } else if (GAME.state === 'ad') {
      gDrawAd(g2);
    } else if (GAME.state === 'run' && (GAME.itvPause || GAME.escPause)) {
      // intermission: the run is frozen, the in-house ads carry the show
      GAME.adT = (GAME.adT || 0) + 1;
      if (GAME.adT >= AD_FRAMES) { GAME.adT = 0; GAME.adSkit = ((GAME.adSkit || 0) + 1) % AD_SKITS.length; }
      gDrawAd(g2, true);
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
  function gLive() { return GAME.state === 'run' && !GAME.event && !GAME.nm && !GAME.itvPause && !GAME.escPause; }
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
    heart_wand: { id: 'heart_wand', clean: true, rate: 14, name: ["heart wand ♥", "baguette-cœur ♥"], pitch: ["ships love in O(1). complexity, not commitment", "livre de l'amour en O(1). complexité, pas engagement"] },
    bubble_blaster: { id: 'bubble_blaster', clean: true, rate: 11, name: ["bubble blaster", "canon à bulles"], pitch: ["isolates each bug in its own container. very docker", "isole chaque bug dans son conteneur. très docker"] },
    baguette: { id: 'baguette', clean: true, rate: 16, name: ["baguette launcher", "lance-baguette"], pitch: ["hard crust, soft rollback. gluten-driven development", "croûte dure, rollback moelleux. développement piloté par le gluten"] },
    meow_cannon: { id: 'meow_cannon', clean: true, rate: 12, name: ["keyboard-cat cannon", "canon à chat-clavier"], pitch: ["fires judgmental meows at 60fps. code review included", "tire des miaulements réprobateurs à 60 fps. code review incluse"] }
  };
  const CURSED_WEAPONS = [
    { id: 'rgb_sword', rate: 8, name: ["✨ RGB Gamer Sword +9999 ✨", "✨ Épée Gamer RGB +9999 ✨"], pitch: ["+9999 to literally everything (units unspecified)", "+9999 à absolument tout (unités non précisées)"], reveal: ["it screams 'UWU' at every shot. your jumps shrink 15% from embarrassment", "elle hurle « UWU » à chaque tir. tes sauts rétrécissent de 15 % de honte"], fx: () => { setMod('uwu', 1, 45); setMod('jump', 0.85, 45); } },
    { id: 'gold_hammer', rate: 10, name: ["🔨 Golden Framework Hammer", "🔨 Marteau à Frameworks doré"], pitch: ["solves every problem you have (plus several you don't)", "résout tous tes problèmes (plus quelques-uns que tu n'avais pas)"], reveal: ["to a hammer, everything is a nail: bug spawns +40%", "pour un marteau, tout est un clou : bugs +40 %"], fx: () => { GAME.spawnIn = 1; setMod('speed', 1.12, 30) } },
    { id: 'boba_straw', rate: 9, name: ["🧋 Infinity Boba Straw", "🧋 Paille à Boba de l'Infini"], pitch: ["infinite refills. zero fees*  (*see terms, sip 1)", "recharges infinies. zéro frais*  (*voir conditions, gorgée 1)"], reveal: ["it's thirsty. it sips 1 coin/sec while equipped-ish (15s)", "elle a soif. elle sirote 1 pièce/s pendant 15 s"], fx: () => setMod('drain', 1, 15) },
    { id: 'legacy_blade', rate: 13, name: ["⚔️ Legacy Codebase Blade", "⚔️ Lame du Code Légataire"], pitch: ["battle-tested since 2009. never once refactored. that's stability", "éprouvée depuis 2009. jamais refactorée. ça, c'est de la stabilité"], reveal: ["nobody dares refactor it. it fires… comments. CHONK +25%", "personne n'ose la refactorer. elle tire… des commentaires. CHONK +25 %"], fx: () => setMod('size', 1.25, 25) },
    { id: 'ai_wand', rate: 7, name: ["🤖 Fully-Autonomous AI Wand", "🤖 Baguette IA 100 % autonome"], pitch: ["aims itself so you don't have to think. what could go wrong", "vise toute seule pour t'éviter de penser. qu'est-ce qui pourrait mal tourner"], reveal: ["it hallucinates targets. sometimes it aims at your coins (-10)", "elle hallucine ses cibles. parfois elle vise tes pièces (-10)"], fx: () => fxCoins(-10) },
    { id: 'css_staff', rate: 12, name: ["🎨 Staff of !important", "🎨 Bâton de !important"], pitch: ["one flick overrides EVERYTHING. yes, even physics", "un seul geste override TOUT. oui, même la physique"], reveal: ["it overrides your walking animation. floaty jumps for 30s, like it or not", "il override ton animation de marche. sauts flottants 30 s, que tu le veuilles ou non"], fx: () => setMod('jump', 1.45, 30) },
    { id: 'vim_katana', rate: 10, name: ["🗡️ Vim Katana (unsheathed)", "🗡️ Katana Vim (dégainé)"], pitch: ["unmatched speed for power users. exiting is optional", "vitesse inégalée pour power users. en sortir est optionnel"], reveal: ["you cannot exit it. speed +20% until it feels like stopping (20s)", "impossible d'en sortir. vitesse +20 % jusqu'à ce qu'il en décide autrement (20 s)"], fx: () => setMod('speed', 1.2, 20) },
    { id: 'crypto_pickaxe', rate: 15, name: ["⛏️ Web3 Diamond Pickaxe", "⛏️ Pioche Diamant Web3"], pitch: ["passive income while you run!! definitely YOUR income", "revenu passif pendant que tu cours !! carrément TON revenu"], reveal: ["it mines your OWN coins. -30% of your wallet. to the moon (without you)", "elle mine TES pièces. -30 % du portefeuille. to the moon (sans toi)"], fx: () => fxCoins(-Math.ceil(GAME.coins * 0.3)) }
  ];

  // every weapon gets a hand-pixelled badge; equipping one makes the
  // badge float along behind the slime like a tiny loyal sidearm
  const WEAPON_PIX = {
    heart_wand:     [['#b07be0', 5, 5, 2, 7], ['#ff5f9e', 3, 1, 6, 3], ['#ff5f9e', 2, 2, 3, 3], ['#ff5f9e', 7, 2, 3, 3], ['#ff5f9e', 4, 4, 4, 2], ['#ffd8ee', 3, 2, 1, 1]],
    bubble_blaster: [['#5fa8dc', 2, 5, 7, 4], ['#5fa8dc', 8, 4, 3, 2], ['#a8e0ff', 3, 6, 2, 2], ['#ffffff', 10, 2, 2, 2], ['#ffffff', 9, 0, 1, 1], ['#3d2350', 2, 9, 3, 2]],
    baguette:       [['#d8a02e', 1, 8, 3, 3], ['#e8b95a', 3, 6, 3, 3], ['#e8b95a', 5, 4, 3, 3], ['#e8b95a', 7, 2, 3, 3], ['#d8a02e', 9, 0, 3, 3], ['#fff3c4', 4, 6, 1, 1], ['#fff3c4', 6, 4, 1, 1], ['#fff3c4', 8, 2, 1, 1]],
    meow_cannon:    [['#9aa0b4', 2, 4, 8, 5], ['#c6cbdb', 3, 5, 3, 2], ['#9aa0b4', 2, 2, 2, 2], ['#9aa0b4', 8, 2, 2, 2], ['#3d2350', 4, 6, 1, 1], ['#3d2350', 7, 6, 1, 1], ['#ff8fc7', 5, 8, 2, 1]],
    rgb_sword:      [['#ff5f7e', 5, 0, 2, 3], ['#ffd400', 5, 3, 2, 3], ['#5fa8dc', 5, 6, 2, 3], ['#3d2350', 3, 9, 6, 1], ['#8a5a2e', 5, 10, 2, 2]],
    gold_hammer:    [['#ffd400', 2, 1, 8, 4], ['#f0b429', 2, 4, 8, 1], ['#fff3c4', 3, 2, 2, 1], ['#8a5a2e', 5, 5, 2, 7]],
    boba_straw:     [['#ffffff', 3, 4, 6, 7], ['#c9a7f5', 3, 7, 6, 2], ['#ff8fc7', 5, 0, 2, 5], ['#3a2412', 4, 9, 1, 1], ['#3a2412', 7, 8, 1, 1]],
    legacy_blade:   [['#9aa0b4', 5, 0, 2, 8], ['#6f7486', 5, 3, 2, 1], ['#6f7486', 5, 6, 2, 1], ['#3d2350', 3, 8, 6, 1], ['#8a5a2e', 5, 9, 2, 3], ['#57c689', 6, 2, 1, 1]],
    ai_wand:        [['#c9a7f5', 5, 3, 2, 8], ['#ffd400', 4, 0, 4, 3], ['#ffffff', 5, 1, 1, 1], ['#ff8fc7', 2, 2, 1, 1], ['#a8e0ff', 9, 1, 1, 1]],
    css_staff:      [['#8a5a2e', 5, 2, 2, 9], ['#f0509f', 3, 0, 6, 3], ['#ffd400', 4, 1, 1, 1], ['#5fa8dc', 7, 1, 1, 1]],
    vim_katana:     [['#57c689', 6, 0, 2, 7], ['#9fe8c0', 6, 1, 1, 5], ['#3d2350', 4, 7, 6, 1], ['#14020e', 6, 8, 2, 4]],
    crypto_pickaxe: [['#a8e0ff', 2, 1, 8, 2], ['#5fa8dc', 2, 3, 2, 1], ['#5fa8dc', 8, 3, 2, 1], ['#8a5a2e', 5, 3, 2, 9], ['#ffffff', 3, 1, 1, 1]]
  };

  function gDrawWeaponIcon(g2, id, x, y, s) {
    const pix = WEAPON_PIX[id];
    if (!pix) return;
    pix.forEach(([c, px2, py2, w2, h2]) => {
      g2.fillStyle = c;
      g2.fillRect(x + px2 * s, y + py2 * s, w2 * s, h2 * s);
    });
  }

  // the equipped weapon bobs along behind its slime, like a proud pet
  function gDrawWeaponBuddy(g2) {
    if (!GAME.weapon || !WEAPON_PIX[GAME.weapon.id]) return;
    const bob = Math.sin(GAME.frame * 0.09) * 4;
    const wy = G_GROUND - G_SLIME_S - 26 - GAME.y * 0.6 + bob;
    gDrawWeaponIcon(g2, GAME.weapon.id, G_SLIME_X - 24, wy, 1.6);
    if (GAME.frame % 34 < 4) { // occasional sparkle of loyalty
      g2.fillStyle = '#fff7d1';
      g2.fillRect(G_SLIME_X - 28, wy - 3, 2, 2);
    }
  }

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
    // mid-run, dreams curdle: 95% of dives become THE NIGHTMARE —
    // but only once the runner has EARNED it (2000+ score)
    if (GAME.state === 'run' && GAME.score >= 2000 && Math.random() < 0.95) {
      setTimeout(() => { if (GAME.state === 'run' && !GAME.nm) gNightmareStart(); }, 700);
    }
    // the dreaming slime never travels alone: the whole petal squad
    // dives in too (they were already following — this just re-musters)
    gAttachPiks(true);
    if (GAME.piks.length) {
      setTimeout(() => gToast([
        `🌸 pikmin.exe attached ×${GAME.piks.length} — followers deployed!!`,
        `🌸 pikmin.exe attaché ×${GAME.piks.length} — escorte déployée !!`
      ], 220), 1400);
    }
    playFanfare();
  }

  /* ---------- the 15-second revive ad ----------
     No real sponsors here — the slime and its pikmin improvise a
     pixel parody of some big brand, then sweetly rent out the slot. */
  const AD_SKITS = [
    { brand: "McSlime's", tint: '#fff3d6', accent: '#f0b429', prop: 'arches',
      lines: [["ba da ba ba baaa…", 'ba da ba ba baaa…'], ['fresh bugs. never caught ♡', 'des bugs frais. jamais attrapés ♡']] },
    { brand: 'Slimebucks', tint: '#e9f7ee', accent: '#4fb583', prop: 'cup',
      lines: [['one grande boba for… "CUTE PINK BLOB"??', 'un grand boba pour… « PETIT BLOB ROSE MIGNON » ??'], ["…that's literally my legal name. well played.", '…c\'est littéralement mon nom légal. bien joué.']] },
    { brand: 'iSlime 17 Pro', tint: '#eef2ff', accent: '#5fa8dc', prop: 'phone',
      lines: [['now with 200% more jiggle', 'avec 200 % de jiggle en plus'], ['the pikmin queued 3 days for this', 'les pikmin ont fait 3 jours de queue pour ça']] },
    { brand: 'Slime+', tint: '#ffeef6', accent: '#f0509f', prop: 'tv',
      lines: [['NOW STREAMING: BUG WARS ep. ∞', 'EN STREAMING : BUG WARS ép. ∞'], ['(cancelled after one season anyway)', "(annulé après une saison, comme d'hab)"]] }
  ];
  const AD_FRAMES = 900; // 15s at 60fps

  function gAdStart() {
    if (GAME.state !== 'over' || GAME.adUsed || GAME.event) return;
    GAME.adUsed = true;
    GAME.state = 'ad';
    GAME.adT = 0;
    GAME.adSkit = Math.floor(Math.random() * AD_SKITS.length);
    // the reaction cam ducks to the bottom-right so the ⏳ countdown stays visible
    const adCam = document.getElementById('game-reaction-cam');
    if (adCam) adCam.classList.add('cam-ad-dock');
    playClickSound();
    if (!pet.sleeping) showBubble(trT('rolling the ad!! I star in this one ♡', 'la pub tourne !! je joue dedans ♡'), 2400);
  }

  function gAdFinish() {
    GAME.state = 'run';
    GAME.lives = 1;
    GAME.obs = [];
    GAME.boss = null;
    GAME.pickup = null;
    const adCam = document.getElementById('game-reaction-cam');
    if (adCam) adCam.classList.remove('cam-ad-dock');
    fxInvincible(2.6);
    playFanfare();
    gToast(['📺 revived!! sponsored by: absolutely nobody ♡', '📺 ressuscité !! sponsorisé par : absolument personne ♡'], 200);
    if (!pet.sleeping) showBubble(trT('welcome back!! ad money well spent ♡', 'te revoilà !! pub bien investie ♡'), 2400);
  }

  function gAdActor(g2, cx, cy, bounce) {
    // chibi slime spokesperson
    const y = cy + Math.sin(bounce) * 5;
    g2.fillStyle = '#c9a7f5';
    g2.fillRect(cx - 21, y - 14, 42, 30);
    g2.fillStyle = '#ff9fd0';
    g2.fillRect(cx - 19, y - 12, 38, 26);
    g2.fillStyle = '#ffc9e4';
    g2.fillRect(cx - 15, y - 9, 9, 6);
    g2.fillStyle = '#14020e';
    g2.fillRect(cx - 9, y - 2, 4, 4); g2.fillRect(cx + 6, y - 2, 4, 4);
    g2.fillStyle = '#ff6fae';
    g2.fillRect(cx - 3, y + 5, 7, 3);
    g2.fillStyle = '#ffb3dd';
    g2.fillRect(cx - 15, y + 3, 4, 3); g2.fillRect(cx + 12, y + 3, 4, 3);
  }

  function gAdPik(g2, cx, cy, color, dance) {
    const y = cy - Math.abs(Math.sin(dance)) * 6;
    g2.fillStyle = '#57c689'; g2.fillRect(cx + 3, y - 5, 2, 4);
    g2.fillStyle = '#ffffff'; g2.fillRect(cx + 1, y - 8, 2, 2); g2.fillRect(cx + 5, y - 8, 2, 2); g2.fillRect(cx + 3, y - 9, 2, 2);
    g2.fillStyle = color; g2.fillRect(cx, y, 9, 8);
    g2.fillStyle = '#14020e'; g2.fillRect(cx + 2, y + 2, 2, 2); g2.fillRect(cx + 6, y + 2, 2, 2);
  }

  function gAdProp(g2, kind, cx, cy, accent) {
    if (kind === 'arches') {
      g2.fillStyle = accent;
      g2.font = "44px 'Jersey 25', 'VT323', monospace";
      g2.textAlign = 'center';
      g2.fillText('m', cx, cy + 14);
    } else if (kind === 'cup') {
      g2.fillStyle = '#ffffff'; g2.fillRect(cx - 11, cy - 14, 22, 28);
      g2.fillStyle = accent; g2.fillRect(cx - 11, cy - 4, 22, 8);
      g2.fillStyle = '#c9a7f5'; g2.fillRect(cx - 2, cy - 22, 4, 9); // straw
      g2.fillStyle = '#3a2412';
      g2.fillRect(cx - 6, cy + 8, 3, 3); g2.fillRect(cx + 1, cy + 9, 3, 3); // pearls
    } else if (kind === 'phone') {
      g2.fillStyle = '#14020e'; g2.fillRect(cx - 10, cy - 18, 20, 36);
      g2.fillStyle = '#eef2ff'; g2.fillRect(cx - 8, cy - 16, 16, 32);
      g2.fillStyle = '#ff9fd0'; g2.fillRect(cx - 5, cy - 6, 10, 8); // slime on screen
      g2.fillStyle = '#14020e'; g2.fillRect(cx - 3, cy - 4, 2, 2); g2.fillRect(cx + 1, cy - 4, 2, 2);
    } else if (kind === 'tv') {
      g2.fillStyle = '#14020e'; g2.fillRect(cx - 16, cy - 12, 32, 24);
      g2.fillStyle = accent; g2.fillRect(cx - 14, cy - 10, 28, 20);
      g2.fillStyle = '#ffffff';
      g2.beginPath(); g2.moveTo(cx - 4, cy - 6); g2.lineTo(cx + 6, cy); g2.lineTo(cx - 4, cy + 6); g2.fill();
    }
  }

  function gDrawAd(g2, loopMode) {
    const skit = AD_SKITS[GAME.adSkit || 0];
    const tLeft = Math.ceil((AD_FRAMES - GAME.adT) / 60);
    const scene = GAME.adT < 300 ? 0 : GAME.adT < 600 ? 1 : 2;
    // the ad covers the whole screen
    g2.fillStyle = skit.tint;
    g2.fillRect(0, 0, G_W, G_H);
    // marquee AD strip
    g2.fillStyle = skit.accent;
    g2.fillRect(0, 0, G_W, 12);
    g2.fillStyle = '#ffffff';
    g2.font = "10px 'Jersey 25', 'VT323', monospace";
    g2.textAlign = 'left';
    const shift = (GAME.adT * 0.8) % 46;
    for (let x = -shift; x < G_W; x += 46) g2.fillText('AD ♡', x, 10);
    if (!loopMode) {
      g2.textAlign = 'right';
      g2.fillStyle = '#14020e';
      g2.font = "12px 'Jersey 25', 'VT323', monospace";
      g2.fillText(`⏳ ${tLeft}s`, G_W - 6, 26);
    }
    g2.textAlign = 'center';
    if (loopMode) {
      // the "everything is fine" banner rides the TOP edge — the ad
      // stays fully watchable underneath
      const msg = trT('⏸ GAME PAUSED — book that interview!! your run is 100% safe ♡', '⏸ JEU EN PAUSE — réserve cet entretien !! ta run est 100 % en sécurité ♡');
      g2.font = "13px 'Jersey 25', 'VT323', monospace";
      const tw2 = g2.measureText(msg).width;
      g2.fillStyle = '#14020e';
      g2.fillRect(G_W / 2 - tw2 / 2 - 10, 15, tw2 + 20, 24);
      g2.fillStyle = '#f0509f';
      g2.fillRect(G_W / 2 - tw2 / 2 - 8, 17, tw2 + 16, 20);
      g2.fillStyle = '#ffffff';
      g2.fillText(msg, G_W / 2, 31);
    }
    if (scene < 2) {
      g2.fillStyle = '#14020e';
      g2.font = "22px 'Jersey 25', 'VT323', monospace";
      g2.fillText(skit.brand, G_W / 2, 42);
      g2.font = "13px 'Jersey 25', 'VT323', monospace";
      g2.fillStyle = '#5a3d6e';
      g2.fillText(trT(skit.lines[scene][0], skit.lines[scene][1]), G_W / 2, G_H - 34);
      gAdProp(g2, skit.prop, G_W / 2 + 66, 78, skit.accent);
      gAdActor(g2, G_W / 2 - 50, 84, GAME.adT * 0.12);
    } else {
      // the grand finale: a very sincere sublet offer
      g2.fillStyle = '#14020e';
      g2.font = "18px 'Jersey 25', 'VT323', monospace";
      g2.fillText(trT('♡ this ad slot is for rent ♡', '♡ cet espace pub est à louer ♡'), G_W / 2, 44);
      g2.font = "12px 'Jersey 25', 'VT323', monospace";
      g2.fillStyle = '#5a3d6e';
      g2.fillText('yuyongshan573@gmail.com', G_W / 2, 62);
      g2.fillText(trT('(serious brands only. payment in boba accepted)', '(marques sérieuses uniquement. paiement en boba accepté)'), G_W / 2, G_H - 34);
      gAdActor(g2, G_W / 2, 90, GAME.adT * 0.12);
      // pixel confetti
      for (let i = 0; i < 22; i++) {
        const cxx = (i * 47 + GAME.adT) % G_W;
        const cyy = (i * 31 + GAME.adT * 1.6) % (G_H - 20);
        g2.fillStyle = ['#ff8fc7', '#ffd400', '#a8e0ff', '#c9a7f5'][i % 4];
        g2.fillRect(cxx, cyy, 3, 3);
      }
    }
    // the pikmin cast dances through every scene
    const cast = (GAME.piks && GAME.piks.length) ? GAME.piks.map((p) => p.color) : ['#ff8fc7', '#c9a7f5', '#a8e0ff'];
    cast.slice(0, 6).forEach((col, i) => gAdPik(g2, G_W / 2 - 60 + i * 22, G_H - 16, col, GAME.adT * 0.16 + i));
    if (!loopMode) {
      g2.font = "9px 'Jersey 25', 'VT323', monospace";
      g2.fillStyle = 'rgba(20, 2, 14, 0.55)';
      g2.fillText(trT('ESC = give up the revive', 'ÉCHAP = renoncer à la résurrection'), G_W / 2, G_H - 4);
    }
    g2.textAlign = 'left';
  }

  /* ---------- THE NIGHTMARE: a sleepwalking slime gone wrong ----------
     Sometimes the dreamer dives in mid-run and wakes up as the biggest
     bug ever compiled. The runner freezes into a WASD arena fight:
     ram its glowing heart, dodge the falling exceptions. */
  // the boss's only attack: computer-pun dream-talk. Every line COMES
  // TRUE — resolved against the pun's meaning + your coins + lives +
  // pikmin count + every decision you've made. Buffs included. That's
  // the whole charm of this game.
  const NM_DREAMS = [
    { id: 'gc', t: ['zzz… garbage collector… sweeping…', 'zzz… ramasse-miettes… il balaie…'],
      outs: [
        { e: '💸', t: ['it swept 20% of your coins into the void', 'il a balayé 20 % de tes pièces dans le vide'], fx: () => fxCoins(-Math.ceil(GAME.coins * 0.2)) },
        { e: '🧼', t: ['it swept your DEBUFFS away instead!! spotless', 'il a balayé tes DÉBUFFS !! impeccable'], fx: () => { GAME.mods = {}; fxInvincible(2); } }
      ] },
    { id: 'cache', t: ['zzz… everything is… a cache…', 'zzz… tout est… un cache…'],
      outs: [
        { e: '🪙', t: ['CACHE HIT!! +9 coins from nowhere', 'CACHE HIT !! +9 pièces venues de nulle part'], fx: () => fxCoins(9) },
        { e: '🐌', t: ['cache miss. your speed pays the latency', 'cache miss. ta vitesse paie la latence'], fx: () => setMod('speed', 0.85, 10) }
      ] },
    { id: 'offby1', t: ['zzz… off by one… always… off by one…', 'zzz… décalé de un… toujours… de un…'],
      outs: [
        { e: '💖', t: ['+1 ♥. the good kind of off-by-one', '+1 ♥. le bon genre de décalage'], fx: () => fxLife(1) },
        { e: '💸', t: ['-1 coin. ×10. arrays start at zero, pain starts at ten', '-1 pièce. ×10. les tableaux commencent à zéro, la douleur à dix'], fx: () => fxCoins(-10) }
      ] },
    { id: 'segv', t: ['zzz… segmentation fault… core dumped…', 'zzz… erreur de segmentation… core dumped…'],
      outs: [
        { e: '⚠️', t: ['the sky dumps exceptions!! DODGE', 'le ciel vide ses exceptions !! ESQUIVE'], fx: () => { for (let i = 0; i < 7; i++) GAME.nm && GAME.nm.shots.push({ x: 30 + Math.random() * (G_W - 90), y: -10 - i * 26 }); } },
        { e: '🪙', t: ['it dumped ITS core: +12 coins spill out', 'il a vidé SON core : +12 pièces déversées'], fx: () => fxCoins(12) }
      ] },
    { id: 'loop', t: ['zzz… while(true)… forever… together…', 'zzz… while(true)… pour toujours… ensemble…'],
      outs: [
        { e: '🦘', t: ['time loops: your jump doubles for 12s', 'le temps boucle : ton saut double pendant 12 s'], fx: () => setMod('jump', 1.5, 12) },
        { e: '🔒', t: ["the loop won't break. neither will its heart (for a while)", 'la boucle ne casse pas. son cœur non plus (un moment)'], fx: () => { if (GAME.nm) GAME.nm.weakAt = GAME.frame + 300; } }
      ] },
    { id: 'mymachine', t: ['zzz… works on my machine…', 'zzz… ça marche sur MA machine…'],
      outs: [
        { e: '🛡️', t: ['your machine agrees: 4s of invincibility shipped', 'ta machine confirme : 4 s d\'invincibilité livrées'], fx: () => fxInvincible(4) },
        { e: '💸', t: ['well it does not work on YOURS: -6 coins in support fees', 'ben pas sur la TIENNE : -6 pièces de frais de support'], fx: () => fxCoins(-6) }
      ] },
    { id: 'merge', t: ['zzz… merge conflict… both of us… kept…', 'zzz… conflit de merge… tous les deux… gardés…'],
      outs: [
        { e: '🎁', t: ['both branches merged: coins +8 AND jump +25%', 'les deux branches fusionnées : +8 pièces ET +25 % de saut'], fx: () => { fxCoins(8); setMod('jump', 1.25, 15); } },
        { e: '😴', t: ['your pikmin got stashed for 12s (uncommitted changes)', 'tes pikmin sont stash pendant 12 s (changements non commités)'], fx: () => { (GAME.piks || []).forEach((p) => { p.zapAt = GAME.frame + 720; p.nextCoinAt = GAME.frame + 720; }); } }
      ] },
    { id: 'reboot', t: ['zzz… have you tried… turning yourself off and on…', 'zzz… t\'as essayé… de t\'éteindre et te rallumer…'],
      outs: [
        { e: '🔄', t: ['you rebooted: fresh i-frames + position reset', 'redémarrage : i-frames toutes neuves + position réinitialisée'], fx: () => { GAME.nmPx = G_SLIME_X; fxInvincible(3); } },
        { e: '🐌', t: ['forced update: everything is 15% slower while it installs', 'mise à jour forcée : tout est 15 % plus lent pendant l\'installation'], fx: () => setMod('speed', 0.85, 12) }
      ] },
    { id: 'bugs99', t: ['zzz… 99 little bugs in the code… take one down…', 'zzz… 99 petits bugs dans le code… corriges-en un…'],
      outs: [
        { e: '⚠️', t: ['…127 little bugs in the code. RAIN INCOMING', '…127 petits bugs dans le code. PLUIE IMMINENTE'], fx: () => { for (let i = 0; i < 9; i++) GAME.nm && GAME.nm.shots.push({ x: 20 + Math.random() * (G_W - 70), y: -8 - i * 20 }); } },
        { e: '🪙', t: ['one was a feature: +14 coins bounty', 'l\'un était une feature : prime de +14 pièces'], fx: () => fxCoins(14) }
      ] },
    { id: 'sudo', t: ['zzz… sudo make me… a sandwich…', 'zzz… sudo fais-moi… un sandwich…'],
      outs: [
        { e: '💖', t: ['permission granted: a snack heals +1 ♥', 'permission accordée : un snack rend +1 ♥'], fx: () => fxLife(1) },
        { e: '💸', t: ['you are not in the sudoers file. this incident cost 5 coins', 't\'es pas dans le fichier sudoers. cet incident coûte 5 pièces'], fx: () => fxCoins(-5) }
      ] }
  ];

  /* ---------- NIGHTMARE SUMMONS: its dream-talk now drags the WHOLE
     SITE into the arena. each summoned attack drains you until you
     resolve it — and every resolution staggers the boss. ---------- */
  const NM_SUMMONS = [
    { id: 'captcha', t: ['zzz… are you… even… human…?', 'zzz… es-tu… seulement… humain… ?'], e: '🤖' },
    { id: 'resume', t: ['zzz… your résumé… has… gaps…', 'zzz… ton CV… a… des trous…'], e: '📄' },
    { id: 'term', t: ['zzz… I locked… your shell… in the dream…', 'zzz… j\'ai enfermé… ton shell… dans le rêve…'], e: '🖥️' },
    { id: 'bsod', t: ['zzz… everything… goes… PINK…', 'zzz… tout… devient… ROSE…'], e: '💗' },
    { id: 'pik', t: ['zzz… your little friends… look… delicious…', 'zzz… tes petits copains… ont l\'air… délicieux…'], e: '🥡' },
    { id: 'melt', t: ['zzz… I dreamt… the whole site… un-compiled…', 'zzz… j\'ai rêvé… que tout le site… se dé-compilait…'], e: '🧯' }
  ];
  function nmOverlayRoot() {
    let root = document.getElementById('nm-summon-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'nm-summon-root';
      document.body.appendChild(root);
    }
    return root;
  }
  function nmAttackBegin(kind) {
    if (!GAME.nm) return;
    GAME.nm.attack = { kind, t0: GAME.frame, drainAt: GAME.frame + 120 };
    playGlitchSound();
  }
  function nmClearAttack() {
    const a = GAME && GAME.nm && GAME.nm.attack;
    if (a) {
      (a._timers || []).forEach((t) => clearInterval(t));
      a._timers = [];
      if (a.kind === 'melt') nmMeltHeal(a); // never strand a corrupted site
    }
    const root = document.getElementById('nm-summon-root');
    if (root) root.innerHTML = '';
    if (GAME.nm) GAME.nm.attack = null;
  }
  function nmResolveAttack(dmg, noteEn, noteFr) {
    if (!GAME.nm || !GAME.nm.attack) return;
    nmClearAttack();
    GAME.nm.hp -= dmg;
    GAME.nm.hitFlash = 12;
    GAME.nm.weak = null;
    GAME.nm.weakAt = GAME.frame + 30; // staggered: the heart surfaces almost at once
    GAME.score += dmg * 4;
    playFanfare();
    gToast([`${noteEn} the nightmare reels: -${dmg} hp!!`, `${noteFr} le cauchemar vacille : -${dmg} pv !!`], 200);
    if (GAME.nm.hp <= 0) gNmWin();
  }
  function nmPanel(title) {
    const root = nmOverlayRoot();
    root.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'nm-panel';
    const head = document.createElement('div');
    head.className = 'nm-panel-head';
    head.textContent = title;
    panel.appendChild(head);
    root.appendChild(panel);
    return panel;
  }
  /* — summon 1: slimeCAPTCHA. pixel Y2K robot check, pikmin edition — */
  function nmSummonCaptcha() {
    nmAttackBegin('captcha');
    const a = GAME.nm.attack;
    a._timers = a._timers || [];
    const mode = Math.abs(gStateHash('captcha' + GAME.frame)) % 2;
    if (mode === 0) {
      // — THE LOOKALIKES: an infuriatingly plausible clone lineup. decoys
      // share the target's exact body (hue+8/+16 keeps (h*7)%8 fixed) or its
      // exact plant at the wrong growth stage. squint. squint HARDER. —
      const cast = (typeof pikEnsureCast === 'function') ? pikEnsureCast() : [];
      const base = cast.length ? cast[Math.abs(gStateHash('capbase')) % cast.length] : null;
      const hue = base ? pikEntryColor(base) : Math.abs(gStateHash('caphue')) % 360;
      const stage = 2;
      const mk = (h, s) => pikSprite(((h % 360) + 360) % 360, s, null);
      const panel = nmPanel(trT('🤖 slimeCAPTCHA — select EVERY exact clone. no lookalikes.', '🤖 slimeCAPTCHA — cochez CHAQUE clone exact. pas de sosies.'));
      const ref = document.createElement('div');
      ref.className = 'nm-cap-ref';
      const refImg = document.createElement('img');
      refImg.src = mk(hue, stage);
      refImg.alt = '';
      const refTxt = document.createElement('span');
      refTxt.textContent = trT('this exact pikmin. the others are FAKES wearing its face.', 'ce pikmin exact. les autres sont des FAUX avec son visage.');
      ref.append(refImg, refTxt);
      panel.appendChild(ref);
      const grid = document.createElement('div');
      grid.className = 'nm-cap-grid';
      const nReal = 3 + (Math.abs(gStateHash('capr')) % 2); // 3-4 true clones
      const kinds = [];
      for (let i = 0; i < 9; i++) kinds.push(i < nReal ? 'real' : ['stage', 'hue8', 'hue16'][i % 3]);
      kinds.sort(() => Math.random() - 0.5);
      kinds.forEach((k) => {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'nm-cap-cell';
        const img = document.createElement('img');
        if (k === 'real') { img.src = mk(hue, stage); cell.dataset.pik = '1'; }
        else if (k === 'stage') img.src = mk(hue, Math.random() < 0.4 ? 0 : 1);
        else img.src = mk(hue + (k === 'hue8' ? 8 : 16), stage);
        img.alt = '';
        cell.appendChild(img);
        cell.addEventListener('click', () => cell.classList.toggle('is-picked'));
        grid.appendChild(cell);
      });
      panel.appendChild(grid);
      const hint = document.createElement('div');
      hint.className = 'nm-panel-hint';
      hint.textContent = trT('(the fakes are 92% identical. the head-plant and the shade betray them.)', '(les faux sont identiques à 92 %. la plante et la teinte les trahissent.)');
      const verify = document.createElement('button');
      verify.type = 'button';
      verify.className = 'nm-cap-verify';
      verify.textContent = trT('VERIFY ♡', 'VÉRIFIER ♡');
      verify.addEventListener('click', () => {
        const picked = [...grid.querySelectorAll('.is-picked')];
        const right = picked.length && picked.every((c) => c.dataset.pik) && picked.length === grid.querySelectorAll('[data-pik]').length;
        if (right) { nmResolveAttack(2, '🤖 CLONE-PROOF EYES!!', '🤖 DES YEUX ANTI-CLONES !!'); return; }
        panel.classList.remove('nm-shake');
        void panel.offsetWidth; // restart the shake animation
        panel.classList.add('nm-shake');
        picked.forEach((c) => c.classList.remove('is-picked'));
        hint.textContent = trT('(WRONG. stare at the head-plant — fakes grow it differently.)', '(FAUX. fixe la plante — les faux la font pousser autrement.)');
        playTone(180, 'sawtooth', 0.1, 0, 0.05);
      });
      panel.appendChild(verify);
      panel.appendChild(hint);
    } else {
      // — THE RUNAWAYS: they scatter mid-click and hide in other squares.
      // your hand speed IS the captcha. —
      const panel = nmPanel(trT('🤖 slimeCAPTCHA — tag all 4 pikmin. they know. they RUN.', '🤖 slimeCAPTCHA — attrapez les 4 pikmin. ils savent. ils COURENT.'));
      const grid = document.createElement('div');
      grid.className = 'nm-cap-grid nm-cap-grid--4';
      const cells = [];
      for (let i = 0; i < 16; i++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'nm-cap-cell';
        cells.push(cell);
        grid.appendChild(cell);
      }
      panel.appendChild(grid);
      const cast = (typeof pikEnsureCast === 'function') ? pikEnsureCast() : [];
      const piks = [];
      const takenCells = new Set();
      for (let i = 0; i < 4; i++) {
        let c;
        do { c = Math.floor(Math.random() * 16); } while (takenCells.has(c));
        takenCells.add(c);
        const p = cast.length ? cast[i % cast.length] : null;
        piks.push({ cell: c, caught: false, src: p ? pikSprite(pikEntryColor(p), p.s || 0, p.sp || null) : pikSprite(Math.floor(Math.random() * 360), 1, null) });
      }
      const draw = () => {
        cells.forEach((cell, ci) => {
          if (cell.classList.contains('is-caught')) return;
          cell.innerHTML = '';
          const pk = piks.find((p) => !p.caught && p.cell === ci);
          if (pk) { const img = document.createElement('img'); img.src = pk.src; img.alt = ''; cell.appendChild(img); }
        });
      };
      draw();
      cells.forEach((cell, ci) => {
        cell.addEventListener('click', () => {
          const pk = piks.find((p) => !p.caught && p.cell === ci);
          if (pk) {
            pk.caught = true;
            cell.classList.add('is-caught');
            playTone(1046, 'triangle', 0.08, 0, 0.04);
            if (piks.every((p) => p.caught)) nmResolveAttack(2, '🤖 FASTER THAN THE SCATTER!!', '🤖 PLUS RAPIDE QUE LA DÉBANDADE !!');
          } else {
            cell.textContent = '💨';
            playTone(200, 'square', 0.06, 0, 0.03);
            setTimeout(() => { if (!cell.classList.contains('is-caught')) cell.textContent = ''; }, 350);
          }
        });
      });
      const hop = setInterval(() => {
        if (!GAME.nm || GAME.nm.attack !== a) { clearInterval(hop); return; }
        piks.forEach((pk) => {
          if (pk.caught || Math.random() < 0.25) return; // sometimes they freeze. tactics.
          const free = [];
          for (let i = 0; i < 16; i++) if (!piks.some((q) => !q.caught && q.cell === i) && !cells[i].classList.contains('is-caught')) free.push(i);
          if (free.length) pk.cell = free[Math.floor(Math.random() * free.length)];
        });
        draw();
      }, 760);
      a._timers.push(hop);
      const hint = document.createElement('div');
      hint.className = 'nm-panel-hint';
      hint.textContent = trT('(they hop to a new square every ¾s. tagged ones stay tagged.)', '(ils changent de case toutes les ¾ s. les attrapés restent attrapés.)');
      panel.appendChild(hint);
    }
  }
  /* — summon 2: the résumé attack. stamp it HIRED to stop the guilt — */
  function nmSummonResume() {
    nmAttackBegin('resume');
    openWindow('win-career');
    const body = document.querySelector('#win-career .window-body');
    if (!body) { nmResolveAttack(1, '📄', '📄'); return; }
    const stamp = document.createElement('button');
    stamp.type = 'button';
    stamp.id = 'nm-hire-stamp';
    stamp.className = 'nm-hire-stamp';
    stamp.textContent = trT('HIRE ME ♡', 'EMBAUCHEZ-MOI ♡');
    stamp.addEventListener('click', () => {
      stamp.classList.add('is-stamped');
      stamp.textContent = trT('HIRED ♡♡♡', 'EMBAUCHÉE ♡♡♡');
      playFanfare();
      setTimeout(() => {
        stamp.remove();
        nmResolveAttack(2, '📄 résumé APPROVED!!', '📄 CV APPROUVÉ !!');
      }, 600);
    });
    body.appendChild(stamp);
    gToast(['📄 it summoned the RESUME!! find the bouncing stamp and HIRE HER to stop the drain!!', '📄 il a invoqué le CV !! trouvez le tampon qui rebondit et EMBAUCHEZ-LA pour stopper la fuite !!'], 240);
  }
  /* — summon 3: the shell is dream-locked. `wake up` frees you.
       (the dev left a skeleton key: her NAME hits like a truck) — */
  function nmSummonTerminal() {
    nmAttackBegin('term');
    openWindow('win-terminal');
    termLine('', '');
    termLine(trT('🌙 THE NIGHTMARE LOCKED THIS SHELL IN A DREAM LOOP', '🌙 LE CAUCHEMAR A ENFERMÉ CE SHELL DANS UNE BOUCLE DE RÊVE'), 't-err');
    termLine(trT('type `wake up` to break the loop and stagger the boss', 'tapez `wake up` pour briser la boucle et étourdir le boss'), 't-accent');
    termLine(trT('(psst — the dev left her own skeleton key in here: typing `yongshan` hits the boss REALLY hard. her privilege, your gain ♡)', '(psst — la dev a laissé son passe-partout ici : taper `yongshan` frappe le boss TRÈS fort. son privilège, votre gain ♡)'), 't-dim');
  }
  /* — summon 3.5: SITE MELTDOWN. the boss dreams a bug and the WHOLE
       SITE breaks for real. a 15-second terminal hotfix — five rotating
       disasters, fresh randomized answers every single time. miss the
       window and the dream takes HALF your hearts. — */
  function nmMeltHeal(a) {
    if (!a || a._healed) return;
    a._healed = 1;
    (a._timers || []).forEach((t) => clearInterval(t));
    a._timers = [];
    try {
      document.body.classList.remove('nm-melt-tilt', 'nm-melt-hue', 'nm-melt-invert', 'nm-melt-naked', 'nm-melt-static');
      document.body.style.removeProperty('--nm-tilt');
      document.body.style.removeProperty('--nm-hue');
      const fx = document.getElementById('nm-melt-fx');
      if (fx) fx.remove();
      // un-typo every window title we vandalized
      (a._titles || []).forEach(([el, txt]) => { try { el.textContent = txt; } catch (e) { /* window may be gone */ } });
    } catch (e) { /* healing must never throw mid-boss */ }
  }
  function nmMeltFail() {
    const a = GAME.nm && GAME.nm.attack;
    if (!a || a.kind !== 'melt') return;
    const dmg = Math.max(1, Math.ceil(GAME.lives / 2));
    nmClearAttack(); // heals the site too — losing the drill never bricks the desktop
    termLine(trT('⏱ TOO SLOW. the dream force-merges its own broken PR. code review is HALF YOUR HEARTS.', '⏱ TROP LENT. le rêve force-merge sa PR cassée. la revue de code coûte LA MOITIÉ DE TES CŒURS.'), 't-err');
    gToast([`🧯 hotfix window MISSED!! the meltdown bites: -${dmg} ♥`, `🧯 fenêtre de correctif RATÉE !! la fusion mord : -${dmg} ♥`], 220);
    playGlitchSound();
    fxLife(-dmg);
  }
  function nmMeltFxRoot() {
    let fx = document.getElementById('nm-melt-fx');
    if (!fx) { fx = document.createElement('div'); fx.id = 'nm-melt-fx'; document.body.appendChild(fx); }
    return fx;
  }
  function nmSummonMelt() {
    nmAttackBegin('melt');
    const a = GAME.nm.attack;
    a.deadline = GAME.frame + 900; // 15s, counted in game frames (pausing pauses the fire)
    a._timers = [];
    a._titles = [];
    a.tries = 0;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const scen = pick(['css', 'typo', 'ghost', 'brackets', 'cache']);
    let dream, art, task, answers = [];

    if (scen === 'css') {
      const kind = pick(['rotate', 'hue', 'invert']);
      if (kind === 'rotate') {
        const n = 2 + Math.floor(Math.random() * 5); // 2..6°
        document.body.style.setProperty('--nm-tilt', n + 'deg');
        document.body.classList.add('nm-melt-tilt');
        dream = trT('it dreamt the stylesheet fell down the stairs. THE WORLD IS TILTED.', 'il a rêvé que la feuille de style tombait dans l\'escalier. LE MONDE PENCHE.');
        art = ['☠ body { transform: rotate(' + n + 'deg); }   /* "looks fine on my pillow" — the boss */'];
        task = trT('type the counter-rotation that levels the world (like `-Xdeg`):', 'tape la contre-rotation qui remet le monde droit (genre `-Xdeg`) :');
        answers = ['-' + n + 'deg', '-' + n, 'rotate(-' + n + 'deg)'];
      } else if (kind === 'hue') {
        const h = pick([60, 90, 120, 150, 200, 240, 300]);
        document.body.style.setProperty('--nm-hue', h + 'deg');
        document.body.classList.add('nm-melt-hue');
        dream = trT('it dreamt in the WRONG COLORS. so now you get them too.', 'il a rêvé dans les MAUVAISES COULEURS. maintenant tu y as droit aussi.');
        art = ['☠ body { filter: hue-rotate(' + h + 'deg); }   /* the dream\'s "aesthetic" */'];
        task = trT('the color wheel must come full circle (360°). type the missing degrees:', 'la roue des couleurs doit boucler (360°). tape les degrés manquants :');
        answers = [(360 - h) + 'deg', String(360 - h), 'hue-rotate(' + (360 - h) + 'deg)'];
      } else {
        document.body.classList.add('nm-melt-invert');
        dream = trT('it dreamt it was a dark mode enthusiast. EVERYTHING is inverted.', 'il a rêvé qu\'il adorait le mode sombre. TOUT est inversé.');
        art = ['☠ body { filter: invert(1); }   /* "self-care" — the boss, upside down */'];
        task = trT('type the value that un-inverts the universe:', 'tape la valeur qui dé-inverse l\'univers :');
        answers = ['invert(0)', '0', 'none'];
      }
    } else if (scen === 'typo') {
      const TYPOS = [
        ['console.lgo("hug")', 'log'], ['docmuent.querySelector(".slime")', 'document'],
        ['windwo.location.reload()', 'window'], ['pikmin.lenght', 'length'],
        ['fucntion hug() {}', 'function'], ['retrun love;', 'return'],
        ['if (flase) { cry(); }', 'false'], ['while (treu) { boop(); }', 'true'],
        ['awiat nap();', 'await'], ['improt slime from "heart";', 'import']
      ];
      const t = pick(TYPOS);
      // the typos go LIVE: every open window title catches one
      try {
        document.querySelectorAll('.window:not(.window-closed) .window-title').forEach((el) => {
          const txt = el.textContent || '';
          if (txt.length < 4) return;
          a._titles.push([el, txt]);
          const i = 1 + Math.floor(Math.random() * (txt.length - 3));
          el.textContent = txt.slice(0, i) + txt[i + 1] + txt[i] + txt.slice(i + 2);
        });
      } catch (e) { /* cosmetic only */ }
      dream = trT('it dreamt it pushed to prod on a FRIDAY. the typos are LIVE (check your window titles).', 'il a rêvé qu\'il poussait en prod un VENDREDI. les typos sont EN LIGNE (regarde les titres des fenêtres).');
      art = ['☠ deployed to production:   ' + t[0] + '   ▸ undefined'];
      task = trT('type the one word, spelled CORRECTLY, that fixes the line:', 'tape le mot, écrit CORRECTEMENT, qui répare la ligne :');
      answers = [t[1]];
    } else if (scen === 'ghost') {
      const n = 4 + Math.floor(Math.random() * 18); // 4..21
      const form = pick(['idx', 'count']);
      const fx = nmMeltFxRoot();
      const spawn = setInterval(() => {
        if (!GAME.nm || fx.childElementCount > 21 || (typeof REDUCED_MOTION !== 'undefined' && REDUCED_MOTION)) return;
        try {
          const g = document.createElement('img');
          g.className = 'nm-ghost';
          g.src = pikSprite(Math.floor(Math.random() * 360), 0, null);
          g.style.left = (4 + Math.random() * 88) + 'vw';
          g.style.top = (6 + Math.random() * 80) + 'vh';
          g.alt = '';
          fx.appendChild(g);
        } catch (e) { /* ghost failed to manifest. spooky. */ }
      }, 520);
      a._timers.push(spawn);
      dream = trT('it dreamt an OFF-BY-ONE. there is a hug with no pikmin in it, and the ghosts keep coming.', 'il a rêvé d\'un OFF-BY-ONE. un câlin n\'a pas de pikmin, et les fantômes affluent.');
      art = ['☠ const piks = new Array(' + n + ');           // ' + n + ' very real pikmin',
             '☠ for (let i = 0; i <= piks.length; i++) hug(piks[i]);   // piks[' + n + '] is a GHOST'];
      task = form === 'idx'
        ? trT('type the index of the LAST real pikmin:', 'tape l\'index du DERNIER vrai pikmin :')
        : trT('type how many hugs should ACTUALLY happen:', 'tape combien de câlins devraient VRAIMENT avoir lieu :');
      answers = [String(form === 'idx' ? n - 1 : n)];
    } else if (scen === 'brackets') {
      const CLOSER = { '(': ')', '[': ']', '{': '}' };
      const depth = 3 + Math.floor(Math.random() * 2); // 3..4
      const words = ['hug', 'nap', 'boop', 'pat', 'snug', 'pik'].sort(() => Math.random() - 0.5);
      const opens = Array.from({ length: depth }, () => pick(['(', '[', '{']));
      const expr = opens.map((b, i) => words[i] + b).join('') + pick(['cozy:true', 'soft:1', 'love:9001', 'dreams:∞']);
      const ans = opens.slice().reverse().map((b) => CLOSER[b]).join('');
      document.body.classList.add('nm-melt-naked');
      if (!(typeof REDUCED_MOTION !== 'undefined' && REDUCED_MOTION)) {
        const fx = nmMeltFxRoot();
        for (let i = 0; i < 14; i++) {
          const s = document.createElement('span');
          s.className = 'nm-bracket';
          s.textContent = pick([')', ']', '}']);
          s.style.left = (3 + Math.random() * 92) + 'vw';
          s.style.animationDuration = (2.4 + Math.random() * 3) + 's';
          s.style.animationDelay = (Math.random() * 2) + 's';
          fx.appendChild(s);
        }
      }
      dream = trT('it dreamt it deleted node_modules… and every CLOSING BRACKET went with it. the windows came undone.', 'il a rêvé qu\'il supprimait node_modules… et toutes les FERMETURES sont parties avec. les fenêtres se défont.');
      art = ['☠ git status: ' + depth + ' closing brackets have LEFT the repository', '☠ ' + expr];
      task = trT('type ONLY the missing closers, in exact order:', 'tape UNIQUEMENT les fermetures manquantes, dans l\'ordre exact :');
      answers = [ans];
    } else {
      const ABC = 'ACDEF23456789';
      let code = '';
      for (let i = 0; i < 4; i++) code += ABC[Math.floor(Math.random() * ABC.length)];
      document.body.classList.add('nm-melt-static');
      const noise = ['░', '▒', '▓'];
      const glitchy = code.split('').map((c) => pick(noise) + ' ' + c + ' ').join('') + pick(noise);
      dream = trT('it dreamt of EXPIRED COOKIES. the cache is poisoned — everything you see is stale.', 'il a rêvé de COOKIES PÉRIMÉS. le cache est empoisonné — tout ce que tu vois est rassis.');
      art = ['☠ cache integrity: FAILED (0 fresh bytes)', '☠ checksum, through the static:   ' + glitchy];
      task = trT('read the 4 characters through the noise, then type: flush <checksum>', 'lis les 4 caractères à travers le bruit, puis tape : flush <somme>');
      answers = ['flush' + code.toLowerCase(), code.toLowerCase()];
    }

    a.melt = { scen, answers: answers.map((s) => s.toLowerCase().replace(/[\s;`'"]+/g, '')), art, task, dream };
    openWindow('win-terminal');
    termLine('', '');
    termLine(trT('🚨 SITE MELTDOWN — the boss dreamt it and it CAME TRUE:', '🚨 EFFONDREMENT DU SITE — le boss l\'a rêvé et c\'est ARRIVÉ :'), 't-err');
    termLine('   ' + dream, 't-err');
    art.forEach((l) => termLine('   ' + l, 't-dim'));
    termLine('⛑ ' + task, 't-accent');
    termLine(trT('   15 seconds. miss the window and the dream takes HALF your hearts. (`hint` reprints the ticket)', '   15 secondes. rate la fenêtre et le rêve prend LA MOITIÉ de tes cœurs. (`hint` réaffiche le ticket)'), 't-dim');
    // the countdown pill — panics under 5s
    const root = nmOverlayRoot();
    root.innerHTML = '';
    const pill = document.createElement('div');
    pill.className = 'nm-melt-timer';
    root.appendChild(pill);
    const tick = setInterval(() => {
      if (!GAME.nm || GAME.nm.attack !== a || a._healed) { clearInterval(tick); return; }
      const s = Math.max(0, (a.deadline - GAME.frame) / 60);
      pill.textContent = '🧯 ' + s.toFixed(1) + 's — ' + trT('EMERGENCY HOTFIX', 'CORRECTIF D\'URGENCE');
      pill.classList.toggle('is-panic', s < 5);
    }, 120);
    a._timers.push(tick);
    gToast(['🧯 THE SITE IS MELTING!! the terminal holds the hotfix — 15s!!', '🧯 LE SITE FOND !! le correctif est dans le terminal — 15 s !!'], 240);
  }
  /* — summon 4: the pink screen of dreams. any key banishes it — */
  function nmSummonBsod() {
    nmAttackBegin('bsod');
    const root = nmOverlayRoot();
    root.innerHTML = '';
    const scr = document.createElement('div');
    scr.className = 'yos-bsod nm-bsod';
    const face = document.createElement('div');
    face.className = 'yos-bsod-face';
    face.textContent = ':(';
    const txt = document.createElement('div');
    txt.className = 'yos-bsod-text';
    txt.textContent = trT('NIGHTMARE_OVERFLOW at 0xZZZ… press ANY key to banish the pink', 'NIGHTMARE_OVERFLOW à 0xZZZ… toute touche bannit le rose');
    scr.append(face, txt);
    const done = () => {
      document.removeEventListener('keydown', done, true);
      nmResolveAttack(2, '💗 pink banished!!', '💗 rose banni !!');
    };
    scr.addEventListener('click', done);
    document.addEventListener('keydown', done, true);
    root.appendChild(scr);
  }
  /* — summon 5: it CAGED one of your pikmin. smash the cage ×3 — */
  function nmSummonPikRescue() {
    nmAttackBegin('pik');
    const cast = (typeof pikEnsureCast === 'function') ? pikEnsureCast() : [];
    const p = cast[0] || { h: 150, s: 2 };
    const panel = nmPanel(trT('🥡 IT CAGED YOUR PIKMIN!! smash the cage (×3) to free it!!', '🥡 IL A ENCAGÉ VOTRE PIKMIN !! brisez la cage (×3) pour le libérer !!'));
    const cage = document.createElement('button');
    cage.type = 'button';
    cage.className = 'nm-cage';
    const bars = document.createElement('span');
    bars.className = 'nm-cage-bars';
    bars.textContent = '▮▮▮▮▮';
    const img = document.createElement('img');
    img.src = pikSprite(pikEntryColor(p), p.s || 0, p.sp || null);
    img.alt = '';
    cage.append(img, bars);
    let hits = 0;
    cage.addEventListener('click', () => {
      hits++;
      cage.classList.remove('is-hit');
      void cage.offsetWidth;
      cage.classList.add('is-hit');
      playTone(240 + hits * 120, 'square', 0.08, 0, 0.05);
      bars.textContent = '▮▮▮▮▮'.slice(0, 5 - hits) + '⛓'.repeat(0);
      if (hits >= 3) {
        nmResolveAttack(3, trT('🌸 FREED!! it bites the boss on the way out!!', '🌸 LIBÉRÉ !!'), '🌸 LIBÉRÉ !! il mord le boss en sortant !!');
      }
    });
    panel.appendChild(cage);
  }
  const NM_SUMMON_FX = { captcha: nmSummonCaptcha, resume: nmSummonResume, term: nmSummonTerminal, bsod: nmSummonBsod, pik: nmSummonPikRescue, melt: nmSummonMelt };
  // dev/testing backdoor (read-mostly) — also a fun console toy ♡
  try {
    window.__yosNM = {
      force() { if (GAME.state === 'run' && !GAME.nm) { gNightmareStart(); return true; } return false; },
      state() {
        return {
          state: GAME.state, lives: GAME.lives, coins: GAME.coins, px: GAME.nmPx,
          nm: GAME.nm ? { hp: GAME.nm.hp, intro: GAME.nm.intro, attack: GAME.nm.attack && GAME.nm.attack.kind, disk: !!GAME.nm.disk, queue: (GAME.nm.summonQueue || []).slice() } : null
        };
      },
      summon(id) { if (GAME.nm && !GAME.nm.attack && NM_SUMMON_FX[id]) { NM_SUMMON_FX[id](); return true; } return false; },
      disk() { if (GAME.nm) { GAME.nm.disk = { x: (GAME.nmPx || 46) + 26, y: G_GROUND - 26 }; return true; } return false; },
      save() { return store.get('yos-nm-save', null); },
      tick(n) { // manual frame-stepping: rAF sleeps in hidden tabs, tests don't
        for (let i = 0; i < (n || 1); i++) { try { gTick(true); } catch (e) { return String(e); } }
        return true;
      },
      game() { return GAME; } // raw state, for scripted playtests only
    };
    window.__yosPik = { roll: pikRollSprout, counts: pikCounts, add: pikdexAdd, total: pikCountTotal, form: pikFormOfKind, th: pikThresholds, pull: watchPullSync, enc: pikCountsEncode, dec: pikCountsMergeRemote };
  } catch (e) { /* no window, no toys */ }

  /* — the random checkpoint disk: catch it mid-fight, keep your progress
       across visits. cozy soulslike. — */
  function nmSaveState() {
    if (!GAME.nm) return;
    store.set('yos-nm-save', {
      hp: GAME.nm.hp, lives: GAME.lives, coins: GAME.coins, score: GAME.score,
      said: GAME.nm.said, queue: GAME.nm.summonQueue, t: Date.now()
    });
    playSparkleSound();
    gToast(['💾 CHECKPOINT!! nightmare progress saved — it keeps across visits ♡', '💾 CHECKPOINT !! progression du cauchemar sauvegardée — même entre deux visites ♡'], 220);
  }

  function gNightmareStart() {
    GAME.nm = {
      hp: 12, x: G_W + 60, t: 0, intro: 150,
      weak: null, weakAt: GAME.frame + 260, hurtCd: 0,
      shots: [], hitFlash: 0,
      sayAt: GAME.frame + 380, say: null, said: [],
      attack: null,
      summonQueue: NM_SUMMONS.map((s) => s.id).sort(() => Math.random() - 0.5),
      nextSummonAt: GAME.frame + 560,
      disk: null, diskAt: GAME.frame + 900 + Math.random() * 600
    };
    // a caught checkpoint disk brings you right back where you left off
    const sav = store.get('yos-nm-save', null);
    if (sav && typeof sav.hp === 'number') {
      GAME.nm.hp = Math.max(1, Math.min(12, sav.hp));
      GAME.nm.said = sav.said || [];
      if (Array.isArray(sav.queue)) GAME.nm.summonQueue = sav.queue;
      GAME.lives = Math.max(GAME.lives, sav.lives || 1);
      GAME.coins = Math.max(GAME.coins, sav.coins || 0);
      GAME.score = Math.max(GAME.score, sav.score || 0);
      setTimeout(() => gToast([`💾 checkpoint restored!! the nightmare remembers you (hp ${GAME.nm ? GAME.nm.hp : '?'}/12)`, `💾 checkpoint restauré !! le cauchemar se souvient de vous (pv ${GAME.nm ? GAME.nm.hp : '?'}/12)`], 240), 2600);
    }
    GAME.nmPx = G_SLIME_X;
    GAME.obs = [];
    GAME.boss = null;
    GAME.pickup = null;
    GAME.event = null; // the nightmare clears the stage — no event dialogs mid-boss
    GAME.nextEventSec = 99999; // and none may interrupt (gNmWin re-arms below)
    // ⚡ GRAND ENTRANCE: rumble, alarm arpeggio, the works
    playGlitchSound();
    playTone(65, 'sawtooth', 0.5, 0, 0.12);
    playTone(49, 'sawtooth', 0.6, 0.25, 0.12);
    [523, 415, 523, 415, 622].forEach((f, i) => setTimeout(() => playTone(f, 'square', 0.14, 0, 0.05), 200 + i * 170));
    // the reaction cam dives to the corner — the hp bar owns the top
    const cam = document.getElementById('game-reaction-cam');
    if (cam) cam.classList.add('cam-ad-dock');
    gToast(['💤 THE SLEEPWALKER ARRIVES — and it is ENORMOUS', '💤 LE SOMNAMBULE ARRIVE — et il est ÉNORME'], 200);
    achvUnlock('nightmare');
    // an unarmed challenger gets armed — by faith or by fate
    if (!GAME.weapon) {
      setTimeout(() => {
        if (!GAME.nm || GAME.weapon) return;
        const ids = Object.keys(WEAPONS);
        const wid = ids[Math.abs(gStateHash('bossgift')) % ids.length];
        const godDec = (GAME.decisions || []).find((d) => typeof d === 'string' && d.indexOf('god:') === 0 && d.indexOf(':yes') > 0);
        if (godDec) {
          gGiveWeapon(wid, true);
          gToast([`⚡ your god remembers your faith!! ${WEAPONS[wid].name[0]} falls from the ceiling`, `⚡ ton dieu se souvient de ta foi !! ${WEAPONS[wid].name[1]} tombe du plafond`], 230);
        } else {
          const card = TAROT[Math.abs(gStateHash('bosscard')) % TAROT.length];
          gGiveWeapon(wid, true);
          gToast([`🧙 the wizard bursts in, flips ${card.n[0]}: "${WEAPONS[wid].name[0]}. don't ask."`, `🧙 le mage débarque, retourne ${card.n[1]} : « ${WEAPONS[wid].name[1]}. ne demande pas. »`], 240);
        }
      }, 2400);
    }
    setTimeout(() => { if (GAME.nm) gToast(['tutorial: WASD to move!! your weapon AUTO-FIRES hearts ♡', 'tuto : WASD pour bouger !! ton arme tire des cœurs TOUTE SEULE ♡'], 230); }, 4600);
    setTimeout(() => { if (GAME.nm) gToast(['RAM the big glowing heart for CRITS. its sleep-talk COMES TRUE', 'FONCE dans le grand cœur qui brille : CRITIQUES. ses paroles de sommeil SE RÉALISENT'], 230); }, 7400);
    if (typeof liveAway === 'function') liveAway(true); // the streamer has… somewhere to be
  }

  function gNmSpeak() {
    const nm = GAME.nm;
    if (!nm) return;
    // a due SUMMON outranks ordinary dream-talk (one at a time, queued);
    // an empty deck reshuffles, so long fights never run out of tricks
    if (nm.summonQueue && !nm.summonQueue.length) nm.summonQueue = NM_SUMMONS.map((s) => s.id).sort(() => Math.random() - 0.5);
    if (!nm.attack && nm.summonQueue && nm.summonQueue.length && GAME.frame >= nm.nextSummonAt) {
      const sid = nm.summonQueue.shift();
      const sum = NM_SUMMONS.find((s) => s.id === sid);
      if (sum && NM_SUMMON_FX[sid]) {
        nm.say = { text: trT(sum.t[0], sum.t[1]), until: GAME.frame + 220 };
        playTone(340, 'sine', 0.2, 0, 0.04);
        playTone(200, 'sine', 0.3, 0.14, 0.05);
        setTimeout(() => { if (GAME.nm) NM_SUMMON_FX[sid](); }, 1500);
        nm.nextSummonAt = GAME.frame + 950; // next summon soon after this one resolves
        nm.sayAt = GAME.frame + 520;
        return;
      }
    }
    let pool = NM_DREAMS.filter((d) => nm.said.indexOf(d.id) === -1);
    if (!pool.length) { nm.said = []; pool = NM_DREAMS; }
    const joke = pool[Math.abs(gStateHash('dream' + nm.t)) % pool.length];
    nm.said.push(joke.id);
    // the pun comes true — seeded by your ENTIRE story
    const seed = Math.abs(hashStr(joke.id + '|' + GAME.coins + '|' + GAME.lives + '|' + (GAME.piks || []).length + '|' + GAME.decisions.join(',') + '|' + GAME.runSeed));
    const out = joke.outs[seed % joke.outs.length];
    nm.say = { text: trT(joke.t[0], joke.t[1]), until: GAME.frame + 220 };
    playTone(340, 'sine', 0.2, 0, 0.04);
    playTone(255, 'sine', 0.24, 0.14, 0.04);
    setTimeout(() => {
      if (!GAME.nm) return;
      out.fx();
      // the consequence lands ON THE PLAYER: a floating chip rises
      // from the slime so cause and effect read at a glance
      GAME.nmFloat = { text: (out.e || '✨') + ' ' + trT(out.t[0], out.t[1]), t0: GAME.frame, until: GAME.frame + 130 };
      playTone(700, 'triangle', 0.08, 0, 0.04);
    }, 1500);
    nm.sayAt = GAME.frame + 380 + (seed % 140);
  }

  const NM_W = 128, NM_H = 110; // the boss is a BIG sleeper
  function gNmTick() {
    const nm = GAME.nm;
    if (!nm) return;
    nm.t++;
    GAME.obs = []; // the nightmare ate every lesser bug on arrival
    // grand entrance: it drifts in from off-screen, then hovers
    if (nm.intro > 0) {
      nm.intro--;
      nm.x = Math.max(G_W - NM_W - 24, nm.x - 2.2);
    } else {
      nm.x = G_W - NM_W - 24 + Math.sin(nm.t * 0.015) * 26;
    }
    const nmY = 8 + Math.sin(nm.t * 0.05) * 7;
    // dream-talk: its one and only attack
    if (nm.intro <= 0 && GAME.frame >= nm.sayAt) gNmSpeak();
    if (nm.say && GAME.frame > nm.say.until) nm.say = null;
    // the MELTDOWN is a 15s all-or-nothing: no drip, one deadline
    if (nm.attack && nm.attack.kind === 'melt' && nm.attack.deadline && GAME.frame >= nm.attack.deadline) {
      nmMeltFail();
      if (GAME.state !== 'run') return;
    }
    // any other unresolved SUMMON drains you: coins first, then hearts
    if (nm.attack && nm.attack.kind !== 'melt' && GAME.frame >= nm.attack.drainAt) {
      nm.attack.drainAt = GAME.frame + 110;
      if (GAME.coins > 0) { fxCoins(-3); playTone(220, 'sawtooth', 0.06, 0, 0.03); }
      else { fxLife(-1); gToast(['⚠ the summon is DRAINING you — resolve it!!', '⚠ l\'invocation vous VIDE — résolvez-la !!'], 120); if (GAME.state !== 'run') return; }
    }
    // the checkpoint disk: drifts across the floor, catch it with WASD
    if (!nm.disk && GAME.frame >= nm.diskAt && !nm.attack) {
      nm.disk = { x: G_W + 14, y: G_GROUND - 26 };
    }
    if (nm.disk) {
      nm.disk.x -= 1.6;
      if (nm.disk.x < -20) { nm.disk = null; nm.diskAt = GAME.frame + 1100 + Math.random() * 800; }
    }
    // a glowing weak heart surfaces every few seconds
    if (nm.intro <= 0 && !nm.weak && GAME.frame >= nm.weakAt) {
      nm.weak = { ox: 18 + Math.random() * (NM_W - 44), oy: NM_H * 0.45 + Math.random() * (NM_H * 0.4), until: GAME.frame + 115 };
    }
    if (nm.weak && GAME.frame > nm.weak.until) { nm.weak = null; nm.weakAt = GAME.frame + 90 + Math.random() * 80; }
    // exception glyphs fall only when a dream decrees it
    nm.shots.forEach((s) => { s.y += 2.6; });
    nm.shots = nm.shots.filter((s) => s.y < G_H + 10);
    // player rect
    const px = GAME.nmPx + 5, pw = G_SLIME_S - 10;
    const py = G_GROUND - G_SLIME_S - GAME.y + 6, ph = G_SLIME_S - 8;
    // YOUR WEAPON AUTO-FIRES: a steady stream of heart-bolts. body
    // hits chip the giant down; RAMMING the glowing heart still crits.
    if (nm.intro <= 0 && GAME.weapon && GAME.frame >= (nm.fireAt || 0)) {
      nm.fireAt = GAME.frame + 70;
      nm.bolts = nm.bolts || [];
      nm.bolts.push({ x: px + pw, y: py + ph * 0.35, vx: 5.2 });
      playTone(1180, 'triangle', 0.05, 0, 0.025);
    }
    let nmSlain = false;
    (nm.bolts || []).forEach((bl) => { bl.x += bl.vx; });
    nm.bolts = (nm.bolts || []).filter((bl) => {
      if (nmSlain) return false;
      if (bl.x > nm.x + 8 && bl.x < nm.x + NM_W && bl.y > nmY && bl.y < nmY + NM_H) {
        nm.chip = (nm.chip || 0) + 1;
        nm.hitFlash = 4;
        if (nm.chip >= 3) { // three bolts = one heart of damage
          nm.chip = 0;
          nm.hp -= 1;
          GAME.score += 3;
          playTone(880, 'triangle', 0.07, 0, 0.04);
          if (nm.hp <= 0) nmSlain = true;
        }
        return false;
      }
      return bl.x < G_W + 20;
    });
    if (nmSlain) return gNmWin();
    // shot grazes sting a few coins
    nm.shots = nm.shots.filter((s) => {
      if (s.x > px - 6 && s.x < px + pw + 4 && s.y > py - 4 && s.y < py + ph) {
        GAME.coins = Math.max(0, GAME.coins - 2);
        playTone(200, 'sawtooth', 0.1, 0, 0.05);
        return false;
      }
      return true;
    });
    // walking into the checkpoint disk saves the whole fight
    if (nm.disk && nm.disk.x > px - 12 && nm.disk.x < px + pw + 6 && nm.disk.y > py - 14) {
      nm.disk = null;
      nm.diskAt = GAME.frame + 1400 + Math.random() * 900;
      nmSaveState();
    }
    // ramming the boss
    const overlap = px < nm.x + NM_W && px + pw > nm.x && py < nmY + NM_H && py + ph > nmY;
    if (overlap) {
      const wk = nm.weak;
      const hitWeak = wk && px + pw > nm.x + wk.ox - 13 && px < nm.x + wk.ox + 15 && py < nmY + wk.oy + 15 && py + ph > nmY + wk.oy - 13;
      if (hitWeak) {
        nm.hp -= 1;
        nm.weak = null;
        nm.weakAt = GAME.frame + 100 + Math.random() * 70;
        nm.hitFlash = 10;
        GAME.score += 8;
        GAME.nmPx = Math.max(14, GAME.nmPx - 34); // recoil of love
        burstNote(); playSparkleSound();
        gToast([`💘 CRITICAL HUG!! nightmare hp: ${nm.hp}`, `💘 CÂLIN CRITIQUE !! pv du cauchemar : ${nm.hp}`], 90);
        if (nm.hp <= 0) return gNmWin();
      } else if (GAME.frame > nm.hurtCd) {
        nm.hurtCd = GAME.frame + 60;
        GAME.coins = Math.max(0, GAME.coins - 4);
        GAME.nmPx = Math.max(14, GAME.nmPx - 30);
        playTone(180, 'sawtooth', 0.12, 0, 0.06);
      }
    }
    function burstNote() { playTone(1046, 'triangle', 0.1, 0, 0.04); playTone(1568, 'triangle', 0.12, 0.06, 0.04); }
  }

  // while the nightmare rages, the live room goes DARK: the streamer
  // is mysteriously "away" (both the big room and the reaction cam)
  function liveAway(on) {
    [document.getElementById('live-stage'), document.getElementById('game-reaction-cam')].forEach((el) => {
      if (!el) return;
      let card = el.querySelector(':scope > .away-card');
      if (on && !card) {
        card = document.createElement('div');
        card.className = 'away-card';
        const tv = document.createElement('span');
        tv.className = 'away-tv';
        tv.textContent = '📺';
        const l1 = document.createElement('span');
        l1.className = 'away-line1';
        l1.textContent = trT('the streamer stepped away — please wait!! ♡', 'le streamer s\'est absenté — merci de patienter !! ♡');
        const l2 = document.createElement('span');
        l2.className = 'away-line2';
        l2.textContent = trT('(hmm… where DID they go?)', '(hmm… mais où est-il passé ?)');
        card.append(tv, l1, l2);
        el.appendChild(card);
      } else if (!on && card) {
        card.remove();
      }
    });
  }

  function gNmWin() {
    nmClearAttack();
    store.set('yos-nm-save', null); // the nightmare is debugged — checkpoint retired
    GAME.nm = null;
    GAME.nmPx = null;
    GAME.nextEventSec = gPlaySecs() + 30; // the event layer wakes back up
    liveAway(false); // and the streamer strolls back in, suspiciously sleepy
    const nmCam = document.getElementById('game-reaction-cam');
    if (nmCam && GAME.state !== 'ad') nmCam.classList.remove('cam-ad-dock');
    GAME.score += 40;
    fxFever(8);
    fxCoinRain(14);
    playFanfare();
    gToast(['🌸 NIGHTMARE DEBUGGED!! +40 · the sleepwalker purrs and fades…', '🌸 CAUCHEMAR DÉBUGUÉ !! +40 · le somnambule ronronne et s\'efface…'], 260);
    achvUnlock('nightmareslain');
    if (!pet.sleeping && typeof showBubble === 'function') {
      setTimeout(() => showBubble(trT('…I had the WEIRDEST dream ♡', "…j'ai fait le rêve le plus BIZARRE ♡"), 2600), 900);
    }
  }

  // the boss IS the sleepwalking pet: its current outfit, eyes shut,
  // blown up to kaiju size. No stand-in art — the real deal.
  var nmSpriteImg = null;
  function nmSprite() {
    const f = (typeof OUTFIT_FRAMES !== 'undefined' && OUTFIT_FRAMES && OUTFIT_FRAMES.sleep) || null;
    if (f && typeof f !== 'string') return f; // live canvas (file:// mode)
    if (typeof f === 'string') {
      if (!nmSpriteImg || nmSpriteImg._src !== f) {
        nmSpriteImg = new Image();
        nmSpriteImg.src = f;
        nmSpriteImg._src = f;
      }
      if (nmSpriteImg.complete && nmSpriteImg.naturalWidth) return nmSpriteImg;
    }
    const base = SLIME_IMGS.sleep;
    return (base && base.complete && base.naturalWidth) ? base : null;
  }

  function gDrawNm(g2) {
    const nm = GAME.nm;
    if (!nm) return;
    const nmY = 8 + Math.sin(nm.t * 0.05) * 7;
    const jx = nm.hitFlash > 0 ? (Math.random() * 4 - 2) : 0; // glitch shudder
    if (nm.hitFlash > 0) nm.hitFlash--;
    // the drifting checkpoint disk (pixel floppy with a heart label)
    if (nm.disk) {
      const dx = nm.disk.x, dy = nm.disk.y + Math.sin(nm.t * 0.1) * 3;
      g2.fillStyle = '#8fd4fa'; g2.fillRect(dx, dy, 16, 16);
      g2.fillStyle = '#5a3d6e'; g2.fillRect(dx + 3, dy, 10, 6);
      g2.fillStyle = '#fffdfb'; g2.fillRect(dx + 3, dy + 9, 10, 6);
      g2.fillStyle = '#ff5fb0'; g2.fillRect(dx + 7, dy + 11, 3, 3);
      g2.font = "9px 'Jersey 25', 'VT323', monospace";
      g2.fillStyle = '#ffd400';
      g2.fillText(trT('SAVE!', 'SAVE !'), dx - 2, dy - 4);
    }
    // active summon banner: the player always knows WHAT to resolve
    if (nm.attack) {
      g2.textAlign = 'center';
      g2.fillStyle = '#ff5fb0';
      g2.font = "12px 'Jersey 25', 'VT323', monospace";
      const label = { captcha: trT('🤖 SOLVE THE CAPTCHA!!', '🤖 RÉSOLVEZ LE CAPTCHA !!'), resume: trT('📄 STAMP THE RESUME (career window)!!', '📄 TAMPONNEZ LE CV (fenêtre career) !!'), term: trT('🖥️ TYPE `wake up` IN THE TERMINAL!!', '🖥️ TAPEZ `wake up` DANS LE TERMINAL !!'), bsod: trT('💗 PRESS ANY KEY!!', '💗 APPUYEZ SUR UNE TOUCHE !!'), pik: trT('🥡 SMASH THE CAGE!!', '🥡 BRISEZ LA CAGE !!') }[nm.attack.kind] || '';
      g2.fillText(label, G_W / 2, G_H - 10);
      g2.textAlign = 'left';
    }
    // entrance veil: the arena dims while the giant drifts in (soft, steady)
    if (nm.intro > 0) {
      g2.globalAlpha = Math.min(0.42, nm.intro / 150 * 0.42);
      g2.fillStyle = '#1d1135';
      g2.fillRect(0, 0, G_W, G_H);
      g2.globalAlpha = 1;
      g2.textAlign = 'center';
      g2.fillStyle = '#ffd400';
      g2.font = "20px 'Jersey 25', 'VT323', monospace";
      g2.fillText(trT('⚠ NIGHTMARE BOSS ⚠', '⚠ BOSS CAUCHEMAR ⚠'), G_W / 2, 40);
      g2.fillStyle = '#ffb7e2';
      g2.font = "12px 'Jersey 25', 'VT323', monospace";
      g2.fillText(trT('the sleepwalker grew. a lot.', 'le somnambule a grandi. beaucoup.'), G_W / 2, 58);
      g2.textAlign = 'left';
    }
    // (the old violet halo drew as a faint box — retired)
    // the giant sleeper itself — current outfit, baked and enlarged
    const spr = nmSprite();
    if (spr) {
      if (nm.hitFlash > 0) g2.globalAlpha = 0.75;
      g2.drawImage(spr, nm.x + jx, nmY, NM_W, NM_H);
      g2.globalAlpha = 1;
    } else { // sprite still loading: a big soft silhouette holds the spot
      g2.fillStyle = '#3d2350';
      g2.fillRect(nm.x + jx + 8, nmY + 14, NM_W - 16, NM_H - 20);
    }
    // drifting zzz — it IS asleep, after all
    g2.fillStyle = '#c3aee0';
    g2.font = "12px 'Jersey 25', 'VT323', monospace";
    const zf = (nm.t % 120) / 120;
    g2.globalAlpha = 1 - zf;
    g2.fillText('z', nm.x + NM_W - 6, nmY + 6 - zf * 10);
    g2.fillText('Z', nm.x + NM_W + 4, nmY - 2 - zf * 16);
    g2.globalAlpha = 1;
    // its dream-talk, in a pixel bubble UNDER the giant — the top edge
    // belongs to the hp bar, no more text pile-ups
    if (nm.say) {
      g2.font = "11px 'Jersey 25', 'VT323', monospace";
      const tw = g2.measureText(nm.say.text).width;
      const by = Math.min(G_H - 26, nmY + NM_H + 6);
      const bx = Math.max(6, Math.min(G_W - tw - 22, nm.x + NM_W / 2 - tw / 2 - 8));
      g2.fillStyle = '#14020e';
      g2.fillRect(bx - 2, by - 2, tw + 20, 20);
      g2.fillStyle = '#fff4fb';
      g2.fillRect(bx, by, tw + 16, 16);
      g2.fillStyle = '#5a3d6e';
      g2.fillText(nm.say.text, bx + 8, by + 12);
    }
    // the weak point is now UNMISSABLE: a big pixel heart, white
    // outline, gold halo, and a bossy little label
    if (nm.weak) {
      const wx = nm.x + nm.weak.ox, wy = nmY + nm.weak.oy;
      const pulse = 0.75 + Math.sin(GAME.frame * 0.09) * 0.2;
      g2.globalAlpha = pulse;
      g2.fillStyle = '#ffd400';
      g2.fillRect(wx - 11, wy - 11, 24, 24); // gold halo
      g2.fillStyle = '#ffffff';
      g2.fillRect(wx - 9, wy - 9, 20, 20); // white outline
      g2.fillStyle = '#ff2d78'; // the heart (chunky pixel version)
      g2.fillRect(wx - 7, wy - 6, 6, 6);
      g2.fillRect(wx + 2, wy - 6, 6, 6);
      g2.fillRect(wx - 7, wy - 2, 15, 6);
      g2.fillRect(wx - 4, wy + 4, 9, 4);
      g2.fillRect(wx - 1, wy + 8, 3, 2);
      g2.globalAlpha = 1;
      g2.textAlign = 'center';
      g2.font = "10px 'Jersey 25', 'VT323', monospace";
      g2.fillStyle = '#14020e';
      g2.fillRect(wx - 26, wy - 26, 54, 12);
      g2.fillStyle = '#ffd400';
      g2.fillText(trT('RAM ME!!', 'FONCE !!'), wx + 1, wy - 17);
      g2.textAlign = 'left';
    }
    // your auto-fire heart-bolts, mid-flight
    (nm.bolts || []).forEach((bl) => {
      g2.fillStyle = '#ff5f9e';
      g2.fillRect(bl.x, bl.y, 7, 5);
      g2.fillStyle = '#ffd8ee';
      g2.fillRect(bl.x + 1, bl.y + 1, 3, 2);
    });
    // falling exceptions
    g2.fillStyle = '#ffe98a';
    g2.font = "12px 'Jersey 25', 'VT323', monospace";
    nm.shots.forEach((s) => g2.fillText('!', s.x, s.y));
    // boss hp bar: TOP CENTER, its own lane — the left HUD keeps
    // hearts/coins/weapon without anyone sitting on anyone
    const hpw = 170;
    const hx = G_W / 2 - hpw / 2;
    g2.fillStyle = '#14020e';
    g2.fillRect(hx - 2, 12, hpw + 4, 12);
    g2.fillStyle = '#3d2350';
    g2.fillRect(hx, 14, hpw, 8);
    g2.fillStyle = '#ff5f9e';
    g2.fillRect(hx, 14, hpw * Math.max(0, nm.hp / 12), 8);
    g2.textAlign = 'center';
    g2.fillStyle = '#ffb7e2';
    g2.font = "10px 'Jersey 25', 'VT323', monospace";
    g2.fillText(trT('sleepwalker.exe', 'somnambule.exe'), G_W / 2, 10);
    g2.textAlign = 'left';
    // the dream's consequence floats up FROM THE PLAYER
    if (GAME.nmFloat && GAME.frame < GAME.nmFloat.until) {
      const f = GAME.nmFloat;
      const p = (GAME.frame - f.t0) / (f.until - f.t0);
      const fx2 = (GAME.nmPx || G_SLIME_X) + G_SLIME_S / 2;
      const fy = G_GROUND - G_SLIME_S - GAME.y - 12 - p * 26;
      g2.font = "11px 'Jersey 25', 'VT323', monospace";
      const ftw = g2.measureText(f.text).width;
      const fbx = Math.max(4, Math.min(G_W - ftw - 16, fx2 - ftw / 2 - 6));
      g2.globalAlpha = 1 - p * 0.7;
      g2.fillStyle = '#f0509f';
      g2.fillRect(fbx - 2, fy - 12, ftw + 14, 17);
      g2.fillStyle = '#ffffff';
      g2.fillText(f.text, fbx + 5, fy);
      g2.globalAlpha = 1;
    }
  }

  /* ---------- pikmin followers: the garden squad, in-game ----------
     leaf = passive coin income · bud = absorbs one hit · flower =
     clears the bug ahead, each with its OWN tiny code-nerd technique
     (assigned at attach time) and its own send-off animation. */
  const PIK_SKILLS = [
    { id: 'ctrl_z',  toast: ['⌫ ctrl_z.pik undid that bug (+6)', '⌫ ctrl_z.pik a annulé ce bug (+6)'] },
    { id: 'rm_rf',   toast: ['🗑 rm-rf.pik deleted it. no backups. (+6)', '🗑 rm-rf.pik l\'a supprimé. sans backup. (+6)'] },
    { id: 'blame',   toast: ['👉 git-blame.pik found the culprit (+6)', '👉 git-blame.pik a trouvé le coupable (+6)'] },
    { id: 'four04',  toast: ['🚫 404.pik: bug not found (+6)', '🚫 404.pik : bug introuvable (+6)'] },
    { id: 'zip',     toast: ['🗜 zip.pik compressed it to 0 bytes (+6)', '🗜 zip.pik l\'a compressé à 0 octet (+6)'] },
    { id: 'duck',    toast: ['🦆 duck.pik made it explain itself. it left. (+6)', '🦆 duck.pik l\'a fait s\'expliquer. il est parti. (+6)'] },
    { id: 'lint',    toast: ['🌸 lint.pik refactored it into a flower (+6)', '🌸 lint.pik l\'a refactoré en fleur (+6)'] },
    { id: 'sudo',    toast: ['👑 sudo.pik asked politely. with authority. (+6)', '👑 sudo.pik a demandé poliment. avec autorité. (+6)'] },
    /* v3 wing: every id below carries a DISTINCT in-game mechanic —
       wire format pkv=3 packs 24 skills (append-only, never reorder) */
    { id: 'trycatch', toast: ['🛡 try-catch.pik caught that. finally.', '🛡 try-catch.pik l\'a attrapé. finally.'] },
    { id: 'cron',     toast: ['⏰ cron.pik delivered the scheduled coins (+2)', '⏰ cron.pik a livré les pièces planifiées (+2)'] },
    { id: 'fetch',    toast: ['🧲 git-fetch.pik is pulling loot from origin', '🧲 git-fetch.pik tire le butin depuis origin'] },
    { id: 'devnull',  toast: ['🕳 devnull.pik swallowed an exception. burp.', '🕳 devnull.pik a avalé une exception. burp.'] },
    { id: 'pingpik',  toast: ['📶 ping.pik: 8ms + a tip (+1 coin)', '📶 ping.pik : 8 ms + un pourboire (+1 pièce)'] },
    { id: 'forkb',    toast: ['🍴 fork().pik hit TWO at once (+12)', '🍴 fork().pik en a eu DEUX d\'un coup (+12)'] },
    { id: 'regex',    toast: ['🔣 regex.pik matched greedily. they all left. (+10)', '🔣 regex.pik a matché goulûment. tous partis. (+10)'] },
    { id: 'cache',    toast: ['🧊 cache.pik: the world lagged backwards', '🧊 cache.pik : le monde a laggé en arrière'] },
    { id: 'uptime',   toast: ['🔋 uptime.pik radiates stability (+1/s-ish)', '🔋 uptime.pik irradie la stabilité (+1/s env.)'] },
    { id: 'defrag',   toast: ['💾 defrag.pik tidied a bug into a coin', '💾 defrag.pik a rangé un bug en pièce'] },
    { id: 'vpn',      toast: ['🕶 vpn.pik: your hitbox is legally elsewhere', '🕶 vpn.pik : ta hitbox est légalement ailleurs'] },
    { id: 'popup',    toast: ['🚫 adblock.pik swatted the pop-up (+6)', '🚫 adblock.pik a claqué le pop-up (+6)'] },
    { id: 'bsod',     toast: ['💙 bsod.pik: it saw the blue screen. crit. (+12)', '💙 bsod.pik : il a vu l\'écran bleu. crit. (+12)'] },
    { id: 'commit',   toast: ['📌 git-commit.pik saved your progress. emotionally. (+4)', '📌 git-commit.pik a sauvegardé. émotionnellement. (+4)'] },
    { id: 'overflow', toast: ['📚 overflow.pik copied the top answer. it worked?! (+6)', '📚 overflow.pik a copié la meilleure réponse. ça a marché ?! (+6)'] },
    { id: 'gpu',      toast: ['🎮 gpu.pik rendered it gone at 240fps (+6)', '🎮 gpu.pik l\'a effacé à 240 fps (+6)'] }
  ];

  // the squad follows into EVERY run — plucked buddies are family,
  // not a sleepwalker-only cameo. Roster persists across reloads.
  function gAttachPiks(quiet) {
    let src = [];
    if (GARDEN.buddies.length) {
      src = GARDEN.buddies.map((b) => ({ color: b.color, stage: b.stage, skill: b.skill, hat: b.sp ? b.sp.hat : null, form: pikFormOfKind(b.ch ? 'ch' : (b.sp ? 's:' + b.sp.id : (b.h != null ? 'w:' + pikSegOfHue(b.h) : 'w:0'))) }));
    } else {
      src = store.get('yos-pik-roster', []).map((r) => {
        const sp = (r.sp && typeof pikSpecies === 'function') ? pikSpecies(r.sp) : null;
        return {
          color: sp ? sp.body : ((r.h != null && typeof hueColor === 'function') ? hueColor(r.h) : (PIK_COLORS[r.c] || PIK_COLORS[0])),
          stage: r.s || 0,
          skill: PIK_SKILLS.find((sk) => sk.id === r.k) || null,
          hat: sp ? sp.hat : null,
          form: pikFormOfKind(r.ch ? 'ch' : (r.sp ? 's:' + r.sp : (r.h != null ? 'w:' + pikSegOfHue(r.h) : 'w:0')))
        };
      });
    }
    if (!src.length) { GAME.piks = []; return; }
    GAME.piks = src.map((b, i) => ({
      color: b.color.body, dark: b.color.dark, stage: b.stage, hat: b.hat || null, form: b.form || 1,
      phase: Math.random() * 6.28,
      shieldReadyAt: 0,
      zapAt: GAME.frame + 260 + i * 90,
      nextCoinAt: GAME.frame + 400 + i * 120,
      skill: b.skill || PIK_SKILLS[Math.floor(Math.random() * PIK_SKILLS.length)]
    }));
    if (!quiet) {
      setTimeout(() => gToast([
        `🌸 pikmin squad ×${GAME.piks.length} reporting for duty!!`,
        `🌸 escouade pikmin ×${GAME.piks.length} au rapport !!`
      ], 190), 700);
    }
  }

  function gPiksTick() {
    const piks = GAME.piks || [];
    if (!piks.length) return;
    piks.forEach((p, i) => {
      const sid = (p.skill || PIK_SKILLS[0]).id;
      if (p.stage === 2 && GAME.frame >= (p.zapAt || 0)) {
        // ADBLOCK specializes in fliers; everyone else takes the nearest bug
        const pool = GAME.obs.filter((o) => o.x > G_SLIME_X + 8 && o.x < G_SLIME_X + 190 && (sid !== 'popup' || o.fly)).sort((a, b) => a.x - b.x);
        const prey = pool[0];
        if (prey) {
          const cd = sid === 'gpu' ? 260 : sid === 'popup' ? 300 : 380; // GPU GO BRRR
          p.zapAt = GAME.frame + cd + Math.random() * 170;
          GAME.obs.splice(GAME.obs.indexOf(prey), 1);
          let gain = sid === 'bsod' ? 12 : 6; // the blue screen crits
          // — same hunt, very different paperwork —
          if (sid === 'forkb' && pool[1]) { const o2 = pool[1]; const j = GAME.obs.indexOf(o2); if (j >= 0) { GAME.obs.splice(j, 1); gain += 6; } }
          if (sid === 'regex') { // greedy match: sweep the lookalikes
            const twins = GAME.obs.filter((o) => !!o.fly === !!prey.fly && o.x < G_SLIME_X + 300).slice(0, 2);
            twins.forEach((o) => { const j = GAME.obs.indexOf(o); if (j >= 0) GAME.obs.splice(j, 1); });
            gain += twins.length * 2;
          }
          if (sid === 'cache') { GAME.obs.forEach((o) => { o.x += 34; }); } // the world lags backwards
          if (sid === 'defrag') { GAME.loot.push({ kind: 'coin', x: Math.min(prey.x, G_W - 20), y: G_GROUND - 26, t: 0 }); }
          if (sid === 'pingpik') { GAME.coins += 1; } // 8ms + a tip
          GAME.score += gain;
          // STACKOVERFLOW performs a random other skill's move, verbatim
          const shown = sid === 'overflow' ? PIK_SKILLS[Math.floor(Math.random() * PIK_SKILLS.length)] : (p.skill || PIK_SKILLS[0]);
          GAME.pikFx = {
            skill: shown.id, t0: GAME.frame, until: GAME.frame + 40,
            x: prey.x, w: prey.w, h: prey.fly ? 16 : prey.h,
            y: prey.fly ? G_GROUND - 58 : G_GROUND - (prey.fly ? 16 : prey.h),
            color: p.color
          };
          playTone(shown.id === 'duck' ? 620 : sid === 'bsod' ? 340 : 1500, 'square', 0.07, 0, 0.03);
          if (sid === 'overflow') gToast(['📚 overflow.pik copied ' + (PIK_SKILL_META[shown.id] || {}).name + '\'s move. it worked?!', '📚 overflow.pik a copié le geste de ' + (PIK_SKILL_META[shown.id] || {}).name + '. ça a marché ?!'], 130);
          else if (Math.random() < 0.3) gToast((p.skill || PIK_SKILLS[0]).toast, 130);
        }
      }
      if (p.stage === 0 && GAME.frame >= (p.nextCoinAt || 0)) {
        p.nextCoinAt = GAME.frame + 520 + Math.random() * 260;
        GAME.coins += 1;
        playTone(1160, 'triangle', 0.05, 0, 0.02);
        if (Math.random() < 0.25) gToast(['🪙 sprout.pik: passive income (+1 coin)', '🪙 pousse.pik : revenu passif (+1 pièce)'], 110);
      }
      // — passives: these fire at ANY growth stage —
      if (sid === 'cron') {
        if (!p.cronAt) p.cronAt = GAME.frame + 1800;
        if (GAME.frame >= p.cronAt) { p.cronAt = GAME.frame + 1800; GAME.coins += 2; playTone(1240, 'triangle', 0.06, 0, 0.03); if (Math.random() < 0.4) gToast(p.skill.toast, 120); }
      }
      if (sid === 'uptime' && GAME.frame % 90 === 0) GAME.score += 1;
      if (sid === 'commit') {
        if (!p.commitAt) p.commitAt = GAME.frame + 2700;
        if (GAME.frame >= p.commitAt) { p.commitAt = GAME.frame + 2700; GAME.score += 4; if (Math.random() < 0.4) gToast(p.skill.toast, 120); }
        if (GAME.lives === 1 && !p.commitRevive) {
          p.commitRevive = 1;
          fxLife(1);
          playFanfare();
          gToast(['📌 git-commit.pik: EMERGENCY COMMIT — +1 ♥ restored!!', '📌 git-commit.pik : COMMIT D\'URGENCE — +1 ♥ restauré !!'], 200);
        }
      }
      if (sid === 'devnull' && GAME.nm && GAME.nm.shots && GAME.nm.shots.length && GAME.frame >= (p.nullAt || 0)) {
        p.nullAt = GAME.frame + 420;
        GAME.nm.shots.pop();
        if (Math.random() < 0.3) gToast(p.skill.toast, 120);
      }
    });
    // squad perk: nearby loot drifts toward the slime — GIT FETCH pulls from origin
    if (GAME.loot && GAME.loot.length) {
      const hasFetch = piks.some((p) => p.skill && p.skill.id === 'fetch');
      const range = hasFetch ? 300 : 150, tug = hasFetch ? 3.4 : 2.2;
      GAME.loot.forEach((l) => { if (l.x > G_SLIME_X && l.x < G_SLIME_X + range) l.x -= tug; });
    }
  }

  // each skill gets a hand-made send-off — no more bare polylines
  function gDrawPikFx(g2) {
    const fx = GAME.pikFx;
    if (!fx || GAME.frame >= fx.until) return;
    const t = (GAME.frame - fx.t0) / (fx.until - fx.t0); // 0→1
    const cx = fx.x + fx.w / 2, cy = fx.y + fx.h / 2;
    g2.textAlign = 'center';
    if (fx.skill === 'ctrl_z') {
      // the bug rewinds right out of the timeline
      g2.globalAlpha = 1 - t;
      g2.fillStyle = '#e05f8f';
      g2.fillRect(fx.x + t * 90, fx.y, fx.w, fx.h);
      g2.globalAlpha = 1;
      g2.fillStyle = '#c3aee0';
      g2.font = "11px 'Jersey 25', 'VT323', monospace";
      g2.fillText('⌫ undo', cx, fx.y - 6);
    } else if (fx.skill === 'rm_rf') {
      for (let k = 0; k < 8; k++) { // crumbles into falling pixels
        g2.fillStyle = k % 2 ? '#e05f8f' : '#b04f74';
        g2.fillRect(cx - 8 + (k % 4) * 5, cy + t * (18 + k * 4), 3, 3);
      }
    } else if (fx.skill === 'blame') {
      g2.fillStyle = '#ffd400';
      g2.font = "11px 'Jersey 25', 'VT323', monospace";
      g2.fillText('BLAME!', cx, fx.y - 6 - t * 8);
      g2.globalAlpha = 1 - t; // slinks away in shame
      g2.fillStyle = '#e05f8f';
      g2.fillRect(fx.x, fx.y + t * 10, fx.w, Math.max(2, fx.h * (1 - t)));
      g2.globalAlpha = 1;
    } else if (fx.skill === 'four04') {
      g2.globalAlpha = 1 - t;
      g2.fillStyle = '#c3aee0';
      g2.font = "13px 'Jersey 25', 'VT323', monospace";
      g2.fillText('404', cx, cy - t * 14);
      g2.globalAlpha = 1;
    } else if (fx.skill === 'zip') {
      const squash = Math.max(2, fx.h * (1 - t * 1.4)); // flatten…
      g2.fillStyle = '#e05f8f';
      g2.fillRect(fx.x, fx.y + fx.h - squash, fx.w, squash);
      if (t > 0.7) { g2.fillStyle = '#fff7d1'; g2.fillRect(cx - 1, fx.y + fx.h - 4, 3, 3); } // …pop
    } else if (fx.skill === 'duck') {
      g2.font = "12px 'Jersey 25', 'VT323', monospace";
      g2.fillText('🦆', cx - 12, cy - t * 16);
      g2.globalAlpha = 1 - t; // it leaves. voluntarily. changed.
      g2.fillStyle = '#e05f8f';
      g2.fillRect(fx.x + t * 50, fx.y, fx.w, fx.h);
      g2.globalAlpha = 1;
    } else if (fx.skill === 'lint') {
      g2.font = "12px 'Jersey 25', 'VT323', monospace";
      g2.globalAlpha = 1 - t * 0.7;
      g2.fillText('🌸', cx, cy + 4 - t * 10);
      g2.globalAlpha = 1;
      for (let k = 0; k < 5; k++) {
        g2.fillStyle = '#ffd8ee';
        const a = t * 6 + k * 1.26;
        g2.fillRect(cx + Math.cos(a) * 12, cy + Math.sin(a) * 9, 2, 2);
      }
    } else if (fx.skill === 'sudo') { // it bows, then simply complies
      g2.fillStyle = '#ffd400';
      g2.font = "10px 'Jersey 25', 'VT323', monospace";
      g2.fillText('👑', cx, fx.y - 6);
      g2.fillStyle = '#e05f8f';
      g2.fillRect(fx.x, fx.y + t * fx.h, fx.w, Math.max(2, fx.h * (1 - t)));
    } else if (fx.skill === 'forkb') { // one bug, two exits
      g2.fillStyle = '#e05f8f';
      g2.globalAlpha = 1 - t;
      g2.fillRect(fx.x - t * 40, fx.y, fx.w, fx.h);
      g2.fillRect(fx.x + t * 40, fx.y, fx.w, fx.h);
      g2.globalAlpha = 1;
      g2.fillStyle = '#c3aee0';
      g2.font = "11px 'Jersey 25', 'VT323', monospace";
      g2.fillText('🍴 fork()', cx, fx.y - 6);
    } else if (fx.skill === 'bsod') { // a tiny blue screen of reconsideration
      g2.fillStyle = '#3b6fd4';
      g2.fillRect(fx.x - 3, fx.y - 3, fx.w + 6, fx.h + 6);
      g2.fillStyle = '#ffffff';
      g2.font = "9px 'Jersey 25', 'VT323', monospace";
      g2.fillText(':(', cx, cy + 3);
      g2.globalAlpha = t;
      g2.fillStyle = '#0d1117';
      g2.fillRect(fx.x - 3, fx.y - 3, fx.w + 6, (fx.h + 6) * t);
      g2.globalAlpha = 1;
    } else if (fx.skill === 'cache') { // motion lines: the world snaps back
      g2.strokeStyle = '#8fd4fa';
      for (let k = 0; k < 3; k++) {
        g2.beginPath();
        g2.moveTo(cx + 8 + k * 7, cy - 6 + k * 6);
        g2.lineTo(cx + 26 + k * 7 + t * 18, cy - 6 + k * 6);
        g2.stroke();
      }
      g2.fillStyle = '#c3aee0';
      g2.font = "10px 'Jersey 25', 'VT323', monospace";
      g2.fillText('🧊 CACHE HIT', cx, fx.y - 6);
    } else if (fx.skill === 'defrag') { // tidied into a shiny coin
      g2.globalAlpha = 1 - t;
      g2.fillStyle = '#e05f8f';
      g2.fillRect(fx.x, fx.y, fx.w, fx.h);
      g2.globalAlpha = 1;
      g2.fillStyle = '#ffd400';
      g2.fillRect(cx - 3 + Math.sin(t * 9) * 2, cy - 3 - t * 8, 6, 6);
    } else { // every other talent gets a labeled send-off
      const meta = PIK_SKILL_META[fx.skill] || { icon: '✨', name: 'PIK' };
      g2.globalAlpha = 1 - t;
      g2.fillStyle = '#e05f8f';
      g2.fillRect(fx.x, fx.y + t * 8, fx.w, Math.max(2, fx.h * (1 - t)));
      g2.globalAlpha = 1;
      g2.fillStyle = '#c3aee0';
      g2.font = "11px 'Jersey 25', 'VT323', monospace";
      g2.fillText(meta.icon + ' ' + meta.name, cx, fx.y - 6 - t * 10);
    }
    g2.textAlign = 'left';
  }

  function gDrawPiks(g2) {
    const piks = GAME.piks || [];
    // full-squad escort: evens trail behind the slime, odds SCOUT AHEAD —
    // and past 4 buddies everyone shrinks a notch so all six stay on screen
    const small = piks.length >= 5;
    const bw0 = small ? 8 : 10, bh0 = small ? 6 : 8;
    const step = small ? 13 : 16;
    piks.forEach((p, i) => {
      // evolved forms stand visibly taller in the parade
      const formMult = p.form === 3 ? 1.5 : p.form === 2 ? 1.25 : 1;
      const bw = Math.round(bw0 * formMult), bh = Math.round(bh0 * formMult);
      const rank = Math.floor(i / 2);
      const bx = (i % 2 === 0)
        ? G_SLIME_X - (bw + 6) - rank * step               // rear guard
        : G_SLIME_X + G_SLIME_S + 8 + rank * step;         // front scouts
      if (bx < 2 || bx > G_W - bw - 2) return;
      const hop = Math.abs(Math.sin(GAME.frame * 0.18 + p.phase)) * (GAME.y > 0 ? 7 : 3);
      const by = G_GROUND - (bh + 3) - hop;
      const mx = bx + Math.round(bw / 2) - 1; // stem anchor
      g2.fillStyle = '#57c689'; // stem
      g2.fillRect(mx, by - 5, 2, 5);
      if (p.stage === 0) { g2.fillStyle = '#7ddba4'; g2.fillRect(mx - 2, by - 7, 3, 2); }
      else if (p.stage === 1) { g2.fillStyle = p.dark; g2.fillRect(mx - 2, by - 8, 4, 3); }
      else {
        g2.fillStyle = '#ffffff';
        g2.fillRect(mx - 3, by - 8, 2, 2); g2.fillRect(mx + 2, by - 8, 2, 2); g2.fillRect(mx - 1, by - 10, 3, 2);
        g2.fillStyle = '#ffd400'; g2.fillRect(mx - 1, by - 8, 3, 2);
      }
      g2.fillStyle = p.color; // glowing jelly body
      g2.fillRect(bx, by, bw, bh); g2.fillRect(bx + 1, by + bh, bw - 2, 2);
      if (p.form === 3) { g2.fillStyle = '#ffd400'; g2.fillRect(bx - 1, by - 1, bw + 2, 1); } // apex gold rim
      g2.fillStyle = 'rgba(255,255,255,0.7)'; g2.fillRect(bx + 1, by + 1, 2, 2);
      g2.fillStyle = '#14020e'; // eyes
      g2.fillRect(bx + 2, by + Math.round(bh * 0.38), 2, 2);
      g2.fillRect(bx + bw - 4, by + Math.round(bh * 0.38), 2, 2);
      if (p.hat) { // hidden species wear their hats into battle, obviously
        g2.font = '9px sans-serif';
        g2.fillText(p.hat, bx - 1, by - 10);
      }
    });
    gDrawPikFx(g2);
  }

  // ---------- hit handling ----------
  function gHit(o) {
    // a bud buddy throws itself in front: exception caught, life saved
    const guard = (GAME.piks || []).find((p) => (p.stage === 1 || (p.skill && p.skill.id === 'trycatch')) && GAME.frame >= (p.shieldReadyAt || 0));
    if (guard) {
      guard.shieldReadyAt = GAME.frame + 1500; // ~25s to recompile
      const gi = GAME.obs.indexOf(o);
      if (gi >= 0) GAME.obs.splice(gi, 1);
      fxInvincible(1.6);
      playTone(720, 'square', 0.1, 0, 0.04);
      gToast(['🛡 try{}catch.pik absorbed the crash!!', '🛡 try{}catch.pik a absorbé le crash !!'], 150);
      return false;
    }
    const idx = GAME.obs.indexOf(o);
    if (idx >= 0) GAME.obs.splice(idx, 1);
    GAME.lives -= 1;
    if (GAME.lives > 0) {
      const vpnPik = (GAME.piks || []).find((p) => p.skill && p.skill.id === 'vpn');
      fxInvincible(vpnPik ? 3.6 : 1.9);
      if (vpnPik && Math.random() < 0.6) gToast(['🕶 vpn.pik: your hitbox is now legally in another country', '🕶 vpn.pik : ta hitbox est désormais légalement à l\'étranger'], 130);
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

      // encounters keep a brisk clock: first at ~18-24s, then every 27-41s
      if (!GAME.event && !GAME.boss && !GAME.nm && gPlaySecs() > GAME.nextEventSec) gStartEvent();
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
      // the boba cat is a PROPER scalper now: steeper wealth tax, a flat
      // ⛁1 "paw-handling fee" on every sticker, and cardiac surge pricing
      // on spare hearts when you're one hit from the void. all of it POSTED —
      // crooked prices, honest signage ♡
      const mark = Math.min(6, Math.round((1 + 0.5 * Math.floor(GAME.coins / 20)) * 100) / 100);
      // ~30% of visits: a LIMITED OFFER that costs literally EVERYTHING you
      // have — genuinely legendary gear, comedy pricing, zero refunds.
      // (picked BEFORE pricing so the surge notice matches the final shelf)
      let limited = null;
      if (GAME.coins >= 12 && gStateHash('ltd') % 100 < 30) {
        limited = 2;
        items[2] = LIMITED_OFFERS[gStateHash('ltdpick') % LIMITED_OFFERS.length];
      }
      let surge = false;
      const prices = items.map((it, ix) => {
        if (ix === limited) return -1; // sentinel: rendered and charged as ALL current coins
        let p = Math.round(it.price * mark) + 1; // +1: the paw fee
        if (it.icon === '💖' && GAME.lives <= 1) { p *= 2; surge = true; }
        return p;
      });
      GAME.event = { type: 'shop', items, prices, mark, surge, limited, sold: [false, false, false], sel: 0 };
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
    GAME.nextEventSec = gPlaySecs() + 27 + (gStateHash('nxt') % 15);
    GAME.hitRects = [];
  }

  function gEventKey(code) {
    const ev = GAME.event;
    if (!ev) return;
    const left = code === 'ArrowLeft';
    const right = code === 'ArrowRight';
    // held-down space must never blow through a fresh encounter
    let confirm = code === 'Space' || code === 'Enter';
    if (confirm && Date.now() < (GAME.eventLockUntil || 0)) return;
    const no = code === 'KeyN' || code === 'Escape';
    const yes = code === 'KeyY';
    // number keys are deliberate: they pick AND confirm in one press
    let digitPick = false;
    if (code === 'Digit1') { ev.sel = 0; digitPick = true; }
    if (code === 'Digit2') { ev.sel = 1; digitPick = true; }
    if (code === 'Digit3') { ev.sel = 2; digitPick = true; }
    if (code === 'Digit4') { ev.sel = 3; digitPick = true; }

    if (ev.type === 'god' || ev.type === 'offer' || ev.type === 'interview') {
      if (left) ev.sel = 0;
      if (right) ev.sel = 1;
      if (yes) ev.sel = 0;
      if (no) ev.sel = 1;
      if (digitPick && ev.sel > 1) { ev.sel = 1; }
      if (confirm || yes || no || digitPick) {
        if (ev.type === 'interview') gResolveInterview(ev);
        else gResolveTwoChoice(ev);
      }
    } else if (ev.type === 'reward' || ev.type === 'coach') {
      if (digitPick && ev.sel <= 2) confirm = true;
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
          if (ev.sel !== ev.rec) coachRebelN++; // the coach keeps receipts across runs
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
      if (confirm || digitPick) {
        if (ev.sel === 3) { gEndEvent(["the boba cat waves you goodbye ♡", "le chat-boba te fait coucou de la patte ♡"], 'shop:leave'); return; }
        if (ev.sold[ev.sel]) return;
        const item = ev.items[ev.sel];
        const isLtd = ev.limited != null && ev.sel === ev.limited;
        if (isLtd && GAME.coins < 5) {
          gToast([`⏳ the cat checks your ⛁${GAME.coins}… and politely pretends the offer just sold out`, `⏳ le chat regarde tes ⛁${GAME.coins}… et prétend poliment que l'offre vient de partir`], 160);
          playTone(180, 'sawtooth', 0.12, 0, 0.05);
          return;
        }
        const cost = isLtd ? GAME.coins : ((ev.prices && ev.prices[ev.sel] != null) ? ev.prices[ev.sel] : item.price);
        if (GAME.coins < cost) {
          // broke, but make it fashion
          const BROKE = [
            [`error 402: payment required. you have ${GAME.coins}, it costs ${cost}. math is cruel`, `erreur 402 : paiement requis. tu as ${GAME.coins}, ça coûte ${cost}. les maths sont cruelles`],
            ["your wallet returned `null`. the cat respects the honesty", "ton portefeuille a renvoyé `null`. le chat respecte la franchise"],
            ["insufficient funds!! the cat shows you its own empty wallet in solidarity", "fonds insuffisants !! le chat te montre son portefeuille vide, par solidarité"],
            ["the cat suggests: jump on more coins. groundbreaking strategy", "le chat suggère : saute sur plus de pièces. stratégie révolutionnaire"]
          ];
          gToast(BROKE[Math.abs(gStateHash('broke' + GAME.frame)) % BROKE.length], 110);
          playTone(180, 'sawtooth', 0.12, 0, 0.05);
          return;
        }
        GAME.coins -= cost;
        if (isLtd) gToast(['💸 your wallet: a clean slate. minimalism ♡', '💸 ton portefeuille : une page blanche. minimalisme ♡'], 150);
        ev.sold[ev.sel] = true;
        GAME.decisions.push('buy:' + item.icon);
        achvBump('buys');
        if (item.trap) achvBump('traps');
        item.out.fx();
        gToast(item.out.t, 190);
        playTone(item.trap ? 233 : 1318, item.trap ? 'sawtooth' : 'triangle', 0.16, 0, 0.05);
        // shelves empty? the cat closes up on its own
        if (ev.sold[0] && ev.sold[1] && ev.sold[2]) {
          setTimeout(() => {
            if (GAME.event === ev) gEndEvent(["SOLD OUT!! the cat bows, flips the sign, and dissolves into pearls ♡", "TOUT VENDU !! le chat s'incline, retourne la pancarte et se dissout en perles ♡"], 'shop:soldout');
          }, 1400);
        }
      }
    }
  }

  function gResolveTwoChoice(ev) {
    if (ev.type === 'god') {
      const believe = ev.sel === 0;
      GAME.decisions.push('god:' + ev.god.icon + (believe ? ':yes' : ':no'));
      achvBump('gods');
      achvBump(believe ? 'godyes' : 'godno');
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
  var coachRebelN = 0; // ignored recommendations — the coach remembers

  function gStartCoach() {
    const pool = [...REWARD_BUFFS];
    const opts = [];
    for (let i = 0; i < 3; i++) opts.push(pool.splice(gStateHash('co' + i) % pool.length, 1)[0]);
    const rec = gStateHash('rec') % 3;
    const rational = gStateHash('why') % 100 < 30;
    GAME.event = {
      type: 'coach', opts, sel: rec, rec,
      // rebelled twice already? the coach airs the grievance directly
      reason: coachRebelN >= 2
        ? ["third time ignoring me. I'm updating MY resume.", "troisième fois que tu m'ignores. c'est MON CV que je mets à jour."]
        : (rational ? COACH_RATIONAL : opts[rec].why)
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
      gDrawWeaponIcon(g2, ev.weapon.id, 22, 32, 2.4); // its glamour shot
      g2.fillStyle = ev.cursed ? '#ffe98a' : gTheme.pink;
      g2.fillText(L(ev.weapon.name), 58, 44);
      if (ev.weapon.pitch) {
        // the sales line — sworn to be technically true
        g2.fillStyle = '#c3aee0';
        g2.font = "10px 'Jersey 25', 'VT323', monospace";
        g2.fillText('"' + L(ev.weapon.pitch) + '"', 58, 60);
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
        const tag = ev.sold[i] ? L(["SOLD", "VENDU"])
          : (ev.limited === i ? L([`ALL ⛁${GAME.coins}!!`, `TOUT ⛁${GAME.coins} !!`])
            : '⛁' + ((ev.prices && ev.prices[i] != null) ? ev.prices[i] : it.price));
        if (ev.limited === i && !ev.sold[i]) {
          g2.fillStyle = (GAME.frame >> 4) % 2 ? 'rgba(255,233,138,0.35)' : 'rgba(255,143,199,0.4)';
          g2.fillRect(bx, 32, 128, 56);
          g2.fillStyle = '#ffe98a';
        }
        g2.fillText(`${ev.limited === i && !ev.sold[i] ? '⏳' : it.icon} ${tag}`, bx + 8, 48);
        g2.fillStyle = '#ffe6f4';
        g2.font = "9px 'Jersey 25', 'VT323', monospace";
        g2.fillStyle = ev.sold[i] ? '#8a7a9a' : '#ffc2e2';
        g2.fillText(L(it.name).slice(0, 22), bx + 8, 64);
        GAME.hitRects.push({ x: bx, y: 32, w: 128, h: 56, sel: i });
      }
      gOption(g2, 150, 96, 180, 24, L(["👋 leave shop [N]", "👋 quitter [N]"]), ev.sel === 3, 3);
      g2.font = "9px 'Jersey 25', 'VT323', monospace";
      g2.fillStyle = '#ffc2e2';
      if (ev.limited != null && !ev.sold[ev.limited]) {
        g2.fillStyle = '#ffe98a';
        g2.fillText(L(['⏳ LIMITED OFFER: costs literally everything you have. worth it (source: the cat)', '⏳ OFFRE LIMITÉE : coûte littéralement tout ce que tu as. rentable (source : le chat)']), 20, 126);
        g2.fillStyle = '#ffc2e2';
      }
      if (ev.surge) {
        g2.fillText(L(['🚑 cardiac surge pricing: you look like you NEED that heart ♡', '🚑 tarif urgence cardiaque : tu as l\'air d\'en avoir BESOIN ♡']), 20, ev.limited != null ? 114 : 126);
      }
      if (ev.mark && ev.mark > 1) {
        g2.fillText(L([`📈 wealth tax ×${ev.mark} + ⛁1 paw fee: the cat saw your wallet. crooked prices, honest signage ♡`, `📈 taxe fortune ×${ev.mark} + ⛁1 de frais de patte : prix tordus, affichage honnête ♡`]), 20, 138);
      }
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
  const LIMITED_OFFERS = [
    { icon: '🗡️', price: 999, name: ["sudo sword (runs as root)", "épée sudo (lancée en root)"], out: { t: ["every command now runs as root. the bugs comply out of RESPECT. (+weapon, luck ×1.5, 10s shield)", "chaque commande tourne en root. les bugs obéissent par RESPECT. (+arme, chance ×1,5, bouclier 10 s)"], fx: () => { gGiveWeapon('meow_cannon', false); setMod('luck', 1.5, 60); fxInvincible(10); } } },
    { icon: '🐧', price: 999, name: ["kernel plushie (huggable)", "peluche kernel (câlinable)"], out: { t: ["you hug the kernel. the kernel hugs back. TWICE. (+2 ♥, 8s shield)", "tu câlines le kernel. le kernel te rend le câlin. DEUX FOIS. (+2 ♥, bouclier 8 s)"], fx: () => { fxLife(2); fxInvincible(8); } } },
    { icon: '☁️', price: 999, name: ["the cloud (physical copy)", "le cloud (exemplaire physique)"], out: { t: ["someone printed the cloud. gravity is now a suggestion. (jump ×1.5, speed ×1.25, 60s)", "quelqu'un a imprimé le cloud. la gravité devient une suggestion. (saut ×1,5, vitesse ×1,25, 60 s)"], fx: () => { setMod('jump', 1.5, 60); setMod('speed', 1.25, 60); } } },
    { icon: '🧿', price: 999, name: ["RAID-0 charm (no backups)", "amulette RAID-0 (sans sauvegarde)"], out: { t: ["twice the sparkle, ZERO redundancy. what could go wrong ♡ (fever 14s, luck ×1.6)", "deux fois plus d'éclat, ZÉRO redondance. qu'est-ce qui pourrait mal tourner ♡ (fièvre 14 s, chance ×1,6)"], fx: () => { fxFever(14); setMod('luck', 1.6, 45); } } },
    { icon: '📀', price: 999, name: ["vintage driver disk (plug&play)", "disquette de pilotes vintage (plug&play)"], out: { t: ["plug and play. mostly play. (+40 score, 12s shield)", "plug and play. surtout play. (+40 points, bouclier 12 s)"], fx: () => { fxScore(40); fxInvincible(12); } } }
  ];
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

  // arcade telemetry: deaths aggregate locally and flush at most once
  // per 30s — one /hit per tier per flush, the abacus gets to breathe
  var lbHitQueue = {};
  var lbHitTimer = null;
  var lbHitLast = 0;
  function lbQueueHit(tier) {
    lbHitQueue[tier] = true;
    if (lbHitTimer) return;
    const wait = Math.max(0, 30000 - (Date.now() - lbHitLast));
    lbHitTimer = setTimeout(() => {
      lbHitTimer = null;
      lbHitLast = Date.now();
      const tiers = Object.keys(lbHitQueue);
      lbHitQueue = {};
      if (!navigator.onLine) return;
      tiers.forEach((tt) => fetch(`${LIKE_API}/hit/${LIKE_NS}/lb-t${tt}`).catch(() => {}));
    }, wait);
  }

  function gFinalizeRun(score) {
    if (score < 10) return;
    if (navigator.onLine) {
      lbQueueHit(lbTierIndex(score));
      const board = store.get('yos-lb', []);
      if (board.length < 10 || score > board[board.length - 1].s) {
        // an unsigned pending run survives BOTH a refresh and a better run
        const prev = window.__lbPendingScore || lbPendingGet() || 0;
        window.__lbPendingScore = Math.max(score, prev);
        store.set('yos-lb-pending', { s: window.__lbPendingScore, t: Date.now() });
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
  function lbPendingGet() {
    const raw = store.get('yos-lb-pending', 0);
    // a pending top-10 score may be signed for 30 minutes: long enough to
    // survive an accidental refresh, far too short to sign a run you never
    // ran today. legacy plain numbers can't prove WHEN they were earned —
    // they retire on sight (this closes the sign-without-playing hole).
    if (raw && typeof raw === 'object' && raw.s > 0 && Date.now() - (raw.t || 0) < 1800000) return raw.s;
    if (raw) store.set('yos-lb-pending', 0);
    return 0;
  }

  // the classic arcade-cabinet naughty list — three letters of shame
  const LB_NAUGHTY = new Set(['ASS', 'FUK', 'FUC', 'FCK', 'FUX', 'CUM', 'TIT', 'SEX', 'DIK', 'DIC', 'DCK', 'COK', 'COC', 'CNT', 'TWT', 'NIG', 'NGR', 'FAG', 'KKK', 'PIS', 'PSS', 'VAG', 'JIZ', 'WTF']);
  function lbSoap(initials) {
    if (!LB_NAUGHTY.has(initials)) return initials;
    showToast(trT("the slime pretends it didn't see that ♡", "le slime fait semblant de n'avoir rien vu ♡"));
    achvUnlock('censored');
    return '♡♡♡';
  }

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
      // stored initials get textContent, never markup — no self-XSS via localStorage
      const rank = document.createElement('span');
      rank.className = 'lb-rank';
      rank.textContent = `${i + 1}.`;
      const name = document.createElement('strong');
      name.textContent = String(e.n);
      const score = document.createElement('span');
      score.className = 'lb-score';
      score.textContent = String(e.s);
      li.append(rank, ' ', name, ' ', score);
      listEl.appendChild(li);
    });

    // signing a pending top-10 run
    if (signEl) {
      // a refresh can't eat an unsigned run — it waits in localStorage
      const pending = window.__lbPendingScore || lbPendingGet() || null;
      if (pending) window.__lbPendingScore = pending;
      signEl.hidden = !pending;
      if (pending) {
        document.getElementById('lb-pending-score').textContent = pending;
        const btn = document.getElementById('lb-sign-btn');
        btn.disabled = false;
        btn.onclick = () => {
          if (!window.__lbPendingScore) return; // one signature per run, no triples
          btn.disabled = true;
          const initials = lbSoap(lbEsc(document.getElementById('lb-initials').value));
          const b = store.get('yos-lb', []);
          b.push({ n: initials, s: pending });
          b.sort((a, c) => c.s - a.s);
          store.set('yos-lb', b.slice(0, 10));
          window.__lbPendingScore = null;
          store.set('yos-lb-pending', 0);
          playFanfare();
          achvUnlock('top10');
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
          if (offBest > store.get('yos-runner-hi', 0)) { store.set('yos-runner-hi', offBest); cloudQueueSync(); }
          window.__lbPendingScore = Math.max(offBest, lbPendingGet() || 0);
          store.set('yos-lb-pending', { s: window.__lbPendingScore, t: Date.now() });
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

  // language switched while the popup is up? tear it down, rebuild in place
  function refreshGameInvite() {
    if (!gInviteEl) return;
    dismissGameInvite();
    gInviteShownThisVisit = false;
    showGameInvite();
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
    // phones don't get the arcade (tiny screens deserve better) —
    // they get a sweet invitation to come back on a computer
    const onPhone = window.innerWidth < 820 && 'ontouchstart' in window;
    if (onPhone) {
      body.textContent = trT(
        'psst — this site hides a full arcade game, but it needs a KEYBOARD. visit me on a computer for the whole slime_run experience ♡',
        'psst — ce site cache un vrai jeu d\'arcade, mais il lui faut un CLAVIER. reviens me voir sur un ordinateur pour l\'expérience slime_run complète ♡'
      );
      const rowM = document.createElement('div');
      rowM.className = 'gi-row';
      const ok = document.createElement('button');
      ok.className = 'gi-hype';
      const okLabel = document.createElement('span');
      okLabel.className = 'gi-hype-label';
      okLabel.textContent = trT('deal!! see you on desktop ♡', 'ça marche !! à tout de suite sur ordi ♡');
      ok.appendChild(okLabel);
      ok.addEventListener('click', () => {
        dismissGameInvite();
        if (!pet.sleeping) showBubble(trT('I\'ll keep your seat warm ♡', 'je te garde ta place au chaud ♡'), 2600);
      });
      rowM.appendChild(ok);
      box.appendChild(head);
      box.appendChild(body);
      box.appendChild(rowM);
      document.body.appendChild(box);
      gInviteEl = box;
      playSparkleSound();
      return;
    }
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
    // the tiny screaming badge perched on the button's top-right corner
    const badge = document.createElement('span');
    badge.className = 'gi-badge';
    badge.textContent = trT('click me! clickkkkk meeeeee!', 'clique ! cliiiiique-moiiiii !');
    badge.setAttribute('aria-hidden', 'true');
    hype.appendChild(badge);
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

  var gInviteRetryTimer = null;
  function scheduleGameInvite(delay) {
    if (gInviteShownThisVisit) return;
    if (gInviteRetryTimer) clearTimeout(gInviteRetryTimer);
    gInviteRetryTimer = setTimeout(function tryShow() {
      gInviteRetryTimer = null;
      if (gInviteShownThisVisit) return;
      if (document.body.classList.contains('terminal-only')) { scheduleGameInvite(12000); return; } // the door hates popups
      // light mode only: in the dark, the SLEEPWALKER is the ad — and
      // applyTheme re-arms this popup at dawn, so no 8s idle loop here
      if (resolvedTheme() !== 'light') return;
      const gameOpen = !document.getElementById('win-game').classList.contains('window-closed');
      if (document.hidden || gameOpen || pet.sleeping) {
        scheduleGameInvite(8000); // wrong moment — lurk and retry
        return;
      }
      showGameInvite();
    }, delay || 15000 + Math.random() * 5000);
  }
  scheduleGameInvite();

  /* =====================================================
     v6.0 — SLIME LIVE ROOM 🔴
     The real pet node relocates onto a big stage; gifts fly,
     a local-only wave-cam reads gestures, and every chat
     message mirrors into the room. i18n + a11y throughout.
     ===================================================== */
  const liveStage = document.getElementById('live-stage');
  const liveComboEl = document.getElementById('live-combo');
  var liveOpen = false;

  /* ============ 📷 THE PHOTO STUDIO ============
     the 📷 gift becomes a real camera: 3·2·1, a hand-drawn snapshot of the
     ACTUAL stage (sky, grass, slime, squad, guests — all live positions),
     Y2K polaroid frames, timestamps, an in-site album, 4s video takes, and
     a 1/3-chance selfie with the slime. camera frames NEVER leave the
     device; the cloud only ever counts hearts, not faces. */
  /* ---- 🌍 the REAL worldwide wall (Cloudflare Worker backend) ----
     the API base ships in wall-config.json so the frontend needs no
     redeploy when the backend moves. empty api = wall dormant, selfie
     flow falls back to the anonymous counter. uploads are consent-only,
     JPEG-only, rate-limited server-side, owner-moderatable. */
  var wallApi = '';
  fetch('wall-config.json?d=' + new Date().toISOString().slice(0, 10))
    .then((r) => (r.ok ? r.json() : null))
    .then((c) => { if (c && c.api) wallApi = String(c.api).replace(/\/+$/, ''); })
    .catch(() => { /* wall stays dormant */ });
  function wallUpload(dataUrl) {
    if (!wallApi) return Promise.resolve(null);
    return fetch(wallApi + '/wall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ img: dataUrl })
    }).then((r) => r.json().then((j) => ({ status: r.status, ...j })));
  }
  function wallList(cursor) {
    if (!wallApi) return Promise.resolve(null);
    return fetch(wallApi + '/wall' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''))
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  var albumVideos = []; // session-only: blobs don't fit localStorage
  function albumGet() { const a = store.get('yos-album', []); return Array.isArray(a) ? a : []; }
  function albumAdd(entry) {
    const a = albumGet();
    a.unshift(entry);
    while (a.length > 12) { a.pop(); }
    store.set('yos-album', a);
    if (typeof renderAlbum === 'function') renderAlbum();
  }
  function photoStamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function stageSnapshot(zoom) {
    const st = liveStage.getBoundingClientRect();
    const W = Math.max(200, Math.round(st.width)), H = Math.max(150, Math.round(st.height));
    const cv = document.createElement('canvas');
    cv.width = W * 2; cv.height = H * 2;
    const x = cv.getContext('2d');
    x.scale(2, 2);
    // the banded pastel sky, faithfully
    const bands = [['#ffd9ec', 0], ['#ffd9ec', 0.13], ['#fde0f1', 0.13], ['#fde0f1', 0.25], ['#f3e0f8', 0.25], ['#f3e0f8', 0.37], ['#e6e4fb', 0.37], ['#e6e4fb', 0.5], ['#d9eafc', 0.5], ['#d9eafc', 0.63], ['#cfeffc', 0.63], ['#cfeffc', 0.78], ['#c8f3f7', 0.78], ['#c8f3f7', 1]];
    const g = x.createLinearGradient(0, 0, 0, H);
    bands.forEach(([c, p]) => g.addColorStop(p, c));
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    const gg = x.createLinearGradient(0, H * 0.85, 0, H);
    gg.addColorStop(0, '#c9ecd0');
    gg.addColorStop(1, '#8fd6a0');
    x.fillStyle = gg;
    x.fillRect(0, H * 0.85, W, H * 0.15);
    for (let i = 0; i < 30; i++) {
      x.fillStyle = ['#ffb3dd', '#ffe98a', '#c9a7f5', '#ffffff'][i % 4];
      x.fillRect((i * 37 + 11) % W, H * 0.87 + ((i * 13) % Math.round(H * 0.1)), 2.5, 2.5);
    }
    // everything that LIVES on stage, at its live position
    liveStage.querySelectorAll('img').forEach((im) => {
      if (!im.complete || !im.naturalWidth) return;
      const r = im.getBoundingClientRect();
      if (r.width < 2 || r.bottom < st.top || r.top > st.bottom + 10) return;
      try {
        x.save();
        const flip = /scaleX\(-1\)/.test(im.style.transform || '');
        const dx = r.left - st.left, dy = r.top - st.top;
        if (flip) { x.translate(dx + r.width, dy); x.scale(-1, 1); x.drawImage(im, 0, 0, r.width, r.height); }
        else x.drawImage(im, dx, dy, r.width, r.height);
        x.restore();
      } catch (e2) { /* mid-swap — skip this sprite */ }
    });
    liveStage.querySelectorAll('.gift-critter, .pik-carry, .pik-hat, .gift-snack, .gift-crown, .gift-cloud').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 2) return;
      const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
      x.font = fs + 'px sans-serif';
      x.textBaseline = 'top';
      try { x.fillText(el.textContent, r.left - st.left, r.top - st.top); } catch (e3) { /* exotic glyph */ }
    });
    if (zoom && zoom > 1) {
      // zoom = a loving crop centered on the slime
      const pr = slimeBody.getBoundingClientRect();
      const cx0 = pr.left - st.left + pr.width / 2, cy0 = pr.top - st.top + pr.height / 2;
      const cw = W / zoom, ch = H / zoom;
      const sx0 = Math.max(0, Math.min(W - cw, cx0 - cw / 2)), sy0 = Math.max(0, Math.min(H - ch, cy0 - ch / 2));
      const zc = document.createElement('canvas');
      zc.width = W * 2; zc.height = H * 2;
      zc.getContext('2d').drawImage(cv, sx0 * 2, sy0 * 2, cw * 2, ch * 2, 0, 0, W * 2, H * 2);
      return { cv: zc, W, H };
    }
    return { cv, W, H };
  }
  function photoFrameify(shot, kindLabel) {
    const pad = 10, cap = 26;
    const fc = document.createElement('canvas');
    fc.width = (shot.W + pad * 2) * 2;
    fc.height = (shot.H + pad * 2 + cap) * 2;
    const x = fc.getContext('2d');
    x.scale(2, 2);
    x.fillStyle = '#fffdfb';
    x.fillRect(0, 0, shot.W + pad * 2, shot.H + pad * 2 + cap);
    x.strokeStyle = '#f0509f';
    x.lineWidth = 3;
    x.strokeRect(1.5, 1.5, shot.W + pad * 2 - 3, shot.H + pad * 2 + cap - 3);
    x.drawImage(shot.cv, pad, pad, shot.W, shot.H);
    x.fillStyle = '#f0509f';
    x.font = "14px 'Jersey 25', 'Pixelify Sans', 'VT323', monospace";
    const ts = photoStamp();
    const tsW = x.measureText(ts).width;
    // narrow shots (phone stage): fall back to shorter watermarks so the timestamp never collides
    const label = ['♡ yongshanOS · slime_live' + (kindLabel ? ' · ' + kindLabel : ''), '♡ yongshanOS', '♡']
      .find((l) => x.measureText(l).width + tsW + 10 <= shot.W) || '';
    x.fillText(label, pad, shot.H + pad + 16);
    x.fillText(ts, shot.W + pad - tsW, shot.H + pad + 16);
    x.fillStyle = '#ffb3dd';
    x.fillText('✦', shot.W + pad - 2, pad + 12);
    return fc.toDataURL('image/jpeg', 0.72);
  }
  function photoFlash() {
    const f = document.createElement('div');
    f.className = 'photo-flash';
    liveStage.appendChild(f);
    playTone(1600, 'square', 0.05, 0, 0.03);
    playTone(900, 'square', 0.06, 0.06, 0.03);
    setTimeout(() => f.remove(), 450);
  }
  function photoCountdown(then) {
    let n = 3;
    const el = document.createElement('div');
    el.className = 'photo-count';
    el.textContent = '3';
    liveStage.appendChild(el);
    const poses = ['happy', 'alert', 'hop'];
    const tick = setInterval(() => {
      if (typeof moveSlime === 'function') moveSlime({ action: poses[3 - n] || 'happy', mood: trT('posing', 'pose'), duration: 500, distance: 0.2, scheduleNext: false });
      playTone(880, 'triangle', 0.08, 0, 0.04);
      n--;
      if (n <= 0) {
        clearInterval(tick);
        el.remove();
        then();
      } else {
        el.textContent = String(n);
        el.classList.remove('pop');
        void el.offsetWidth;
        el.classList.add('pop');
      }
    }, 800);
  }
  function photoFloatShow(dataUrl, entry) {
    const wrap = document.createElement('div');
    wrap.className = 'photo-float';
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = '';
    const bar = document.createElement('div');
    bar.className = 'photo-float-bar';
    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'wp-btn';
    save.textContent = trT('💾 save to device', '💾 sur l\'appareil');
    save.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'yongshanos-' + (entry.k || 'photo') + '-' + entry.t.replace(/[: ]/g, '-') + '.jpg';
      a.click();
    });
    const openAlb = document.createElement('button');
    openAlb.type = 'button';
    openAlb.className = 'wp-btn';
    openAlb.textContent = trT('🖼 album', '🖼 album');
    openAlb.addEventListener('click', () => { wrap.remove(); openWindow('win-album'); });
    bar.append(save, openAlb);
    wrap.append(img, bar);
    document.body.appendChild(wrap);
    setTimeout(() => { if (wrap.parentNode) { wrap.classList.add('is-leaving'); setTimeout(() => wrap.remove(), 700); } }, 5200);
  }
  function photoShoot(zoom) {
    photoCountdown(() => {
      photoFlash();
      const dataUrl = photoFrameify(stageSnapshot(zoom), null);
      const entry = { d: dataUrl, t: photoStamp(), k: 'photo' };
      albumAdd(entry);
      achvUnlock('paparazzi');
      showBubble(trT('📸 filed in photo_album.exe!! am I photogenic or AM I PHOTOGENIC', '📸 classée dans photo_album.exe !! je suis photogénique ou JE SUIS PHOTOGÉNIQUE'), 2800);
      photoFloatShow(dataUrl, entry);
      if (Math.random() < 1 / 3) setTimeout(selfieInvite, 6000);
    });
  }
  function giftActCamera(e) {
    if (!liveOpen || !liveStage) return;
    if (liveStage.querySelector('.photo-studio')) return;
    const panel = document.createElement('div');
    panel.className = 'photo-studio';
    const head = document.createElement('div');
    head.className = 'vibe-genre-head';
    head.textContent = trT('📷 slime studio ♡ pick your shot', '📷 studio slime ♡ choisis ta prise');
    let zoom = 1;
    const mk = (txt, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'vibe-genre-btn'; b.textContent = txt; b.addEventListener('click', fn); return b; };
    const zoomBtn = mk('🔍 1x', () => { zoom = zoom === 1 ? 1.5 : 1; zoomBtn.textContent = '🔍 ' + zoom + 'x'; });
    const row = document.createElement('div');
    row.className = 'vibe-genre-grid';
    row.append(
      mk(trT('📸 photo', '📸 photo'), () => { panel.remove(); photoShoot(zoom); }),
      mk(trT('🎬 video · 4s', '🎬 vidéo · 4 s'), () => { panel.remove(); videoShoot(zoom); }),
      zoomBtn,
      mk('✕', () => panel.remove())
    );
    panel.append(head, row);
    liveStage.appendChild(panel);
    showBubble(trT('a CAMERA?! wait wait — my good side. both sides. all sides.', 'un APPAREIL ?! attends — mon meilleur profil. les deux. tous.'), 2600);
    setTimeout(() => { if (panel.parentNode) panel.remove(); }, 20000);
  }
  function videoShoot(zoom) {
    if (!window.MediaRecorder) {
      showBubble(trT('this browser can\'t record — but photos work!! 📸', 'ce navigateur ne peut pas filmer — mais les photos marchent !! 📸'), 2600);
      photoShoot(zoom);
      return;
    }
    photoCountdown(() => {
      const first = stageSnapshot(zoom);
      const rc = document.createElement('canvas');
      rc.width = first.cv.width; rc.height = first.cv.height;
      const rx = rc.getContext('2d');
      rx.drawImage(first.cv, 0, 0);
      const stream = rc.captureStream(30);
      const mime = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : (MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '');
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks = [];
      rec.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.push(ev.data); };
      const tag = document.createElement('div');
      tag.className = 'photo-rec-tag';
      tag.textContent = '● REC';
      liveStage.appendChild(tag);
      let stop = false;
      const draw = () => {
        if (stop) return;
        try { const s = stageSnapshot(zoom); rx.drawImage(s.cv, 0, 0, rc.width, rc.height); } catch (e2) { /* frame skip */ }
        requestAnimationFrame(draw);
      };
      rec.onstop = () => {
        stop = true;
        tag.remove();
        const blob = new Blob(chunks, { type: mime || 'video/webm' });
        const url = URL.createObjectURL(blob);
        const entry = { v: url, t: photoStamp(), k: 'video', ext: (mime.indexOf('mp4') !== -1 ? 'mp4' : 'webm') };
        albumVideos.unshift(entry);
        if (albumVideos.length > 4) { URL.revokeObjectURL(albumVideos.pop().v); }
        achvUnlock('paparazzi');
        showBubble(trT('🎬 4 seconds of PURE cinema. it\'s in the album (this visit only — save to keep!!)', '🎬 4 secondes de PUR cinéma. c\'est dans l\'album (cette visite seulement — sauvegarde !!)'), 3200);
        if (typeof renderAlbum === 'function') renderAlbum();
        openWindow('win-album');
      };
      rec.start();
      draw();
      setTimeout(() => { try { rec.stop(); } catch (e3) {} }, 4000);
    });
  }
  function selfieInvite() {
    if (!liveOpen || !liveStage || liveStage.querySelector('.photo-studio')) return;
    const panel = document.createElement('div');
    panel.className = 'photo-studio';
    const head = document.createElement('div');
    head.className = 'vibe-genre-head';
    head.textContent = trT('🤳 wait — take one TOGETHER? (camera stays 100% on your device)', '🤳 attends — on en prend une ENSEMBLE ? (la caméra reste 100 % sur ton appareil)');
    const row = document.createElement('div');
    row.className = 'vibe-genre-grid';
    const mk = (txt, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'vibe-genre-btn'; b.textContent = txt; b.addEventListener('click', fn); return b; };
    row.append(
      mk(trT('📸 yes!! selfie time', '📸 oui !! selfie'), () => { panel.remove(); selfieShoot(); }),
      mk(trT('shy today ♡', 'timide aujourd\'hui ♡'), () => { panel.remove(); showBubble(trT('respected. the offer stands FOREVER.', 'respecté. l\'offre tient POUR TOUJOURS.'), 2200); })
    );
    panel.append(head, row);
    liveStage.appendChild(panel);
    showBubble(trT('psst… wanna take one TOGETHER? 🤳', 'psst… on en prend une ENSEMBLE ? 🤳'), 2800);
    setTimeout(() => { if (panel.parentNode) panel.remove(); }, 15000);
  }
  function selfieShoot() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showBubble(trT('no camera here — the friendship photo lives in our hearts', 'pas de caméra ici — la photo d\'amitié vit dans nos cœurs'), 2600);
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false }).then((stream) => {
      const vid = document.createElement('video');
      vid.playsInline = true;
      vid.muted = true;
      vid.srcObject = stream;
      const pip = document.createElement('div');
      pip.className = 'selfie-pip';
      pip.appendChild(vid);
      liveStage.appendChild(pip);
      vid.play().catch(() => {});
      showBubble(trT('there you are!! ok ok — 3… 2… 1…', 'te voilà !! ok ok — 3… 2… 1…'), 2200);
      setTimeout(() => photoCountdown(() => {
        photoFlash();
        const W = 320, H = 240;
        const cv = document.createElement('canvas');
        cv.width = W * 2; cv.height = H * 2;
        const x = cv.getContext('2d');
        x.scale(2, 2);
        // cover-fit the camera frame (mirrored, like every selfie ever)
        const vw = vid.videoWidth || 640, vh = vid.videoHeight || 480;
        const sc = Math.max(W / vw, H / vh);
        x.save();
        x.translate(W, 0);
        x.scale(-1, 1);
        x.drawImage(vid, (W - vw * sc) / 2, (H - vh * sc) / 2, vw * sc, vh * sc);
        x.restore();
        // the slime photobombs the corner, glowing politely
        const sIm = slimeBody ? slimeBody.querySelector('img') : null;
        if (sIm && sIm.complete) {
          x.save();
          x.shadowColor = 'rgba(255,255,255,0.9)';
          x.shadowBlur = 12;
          x.drawImage(sIm, W - 118, H - 104, 112, 98);
          x.restore();
        }
        stream.getTracks().forEach((tr) => tr.stop());
        pip.remove();
        const framed = photoFrameify({ cv, W, H }, trT('selfie', 'selfie'));
        const entry = { d: framed, t: photoStamp(), k: 'selfie' };
        albumAdd(entry);
        achvUnlock('selfiestar');
        photoFloatShow(framed, entry);
        showBubble(trT('🤳 FRAMED FOREVER. we look incredible.', '🤳 IMMORTALISÉ. on est incroyables.'), 2600);
        setTimeout(() => selfieWallAsk(entry), 5800);
      }), 800);
    }).catch(() => {
      showBubble(trT('camera said no — totally fine, the vibe was real ♡', 'la caméra a dit non — pas grave, l\'instant était vrai ♡'), 2600);
    });
  }
  function selfieWallAsk(entry) {
    if (!liveOpen || !liveStage) return;
    const panel = document.createElement('div');
    panel.className = 'photo-studio';
    const head = document.createElement('div');
    head.className = 'vibe-genre-head';
    head.textContent = wallApi
      ? trT('🌍 hang it on the WORLDWIDE WALL? it becomes PUBLIC — every visitor will see it (the owner can take any photo down).', '🌍 l\'accrocher au MUR MONDIAL ? elle devient PUBLIQUE — chaque visiteur la verra (la propriétaire peut retirer toute photo).')
      : trT('🌍 count it on the worldwide selfie wall? (a COUNTER — your photo never leaves this device)', '🌍 la compter sur le mur mondial des selfies ? (un COMPTEUR — ta photo ne quitte jamais cet appareil)');
    const row = document.createElement('div');
    row.className = 'vibe-genre-grid';
    const mk = (txt, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'vibe-genre-btn'; b.textContent = txt; b.addEventListener('click', fn); return b; };
    row.append(
      mk(trT('hang it ♡', 'accroche-la ♡'), () => {
        panel.remove();
        if (wallApi && entry && entry.d) {
          showToast(trT('🌍 hanging it…', '🌍 accrochage…'));
          wallUpload(entry.d).then((res) => {
            if (res && res.ok) {
              fxBanner('🌍 ON THE WALL — PHOTO #' + res.n, trT('publicly framed, worldwide. a LEGEND.', 'encadré public, mondial. une LÉGENDE.'));
              achvUnlock('wallfamous');
              fetch(`${ACHV_API}/hit/${ACHV_NS}/selfie-wall`).catch(() => {});
            } else {
              const msg = (res && res.error) || trT('the wall is unreachable — counted in spirit ♡', 'le mur est injoignable — compté en esprit ♡');
              showToast('🌍 ' + msg);
              fetch(`${ACHV_API}/hit/${ACHV_NS}/selfie-wall`).catch(() => {});
            }
          }).catch(() => showToast(trT('🌍 the wall hiccuped — try again later ♡', '🌍 le mur a eu un hoquet — réessaie plus tard ♡')));
          return;
        }
        fetch(`${ACHV_API}/hit/${ACHV_NS}/selfie-wall`).then((r) => (r.ok ? r.json() : null)).then((d) => {
          const n = d && d.value ? d.value : '?';
          fxBanner('🌍 SELFIE #' + n, trT('you + the slime, counted worldwide ♡', 'toi + le slime, comptés dans le monde ♡'));
        }).catch(() => {});
      }),
      mk(trT('keep it private', 'garder privé'), () => { panel.remove(); showBubble(trT('a private legend. even better.', 'une légende privée. encore mieux.'), 2200); })
    );
    panel.append(head, row);
    liveStage.appendChild(panel);
    setTimeout(() => { if (panel.parentNode) panel.remove(); }, 15000);
  }
  function renderWall(shell) {
    const grid = document.createElement('div');
    grid.className = 'album-grid';
    const note = document.createElement('div');
    note.className = 'album-note';
    note.textContent = trT('🌍 THE WORLDWIDE WALL — every photo here was hung by a visitor + their slime. loading…', '🌍 LE MUR MONDIAL — chaque photo ici a été accrochée par un·e visiteur·euse + son slime. chargement…');
    shell.append(note, grid);
    let wallSeen = 0;
    const gen = albumGen; // a tab switch re-renders the shell; late fetches must not touch the new render
    const load = (cursor) => wallList(cursor).then((res) => {
      if (gen !== albumGen) return;
      if (!res) { note.textContent = trT('🌍 the wall is warming up — hang the first photo from a selfie ♡', '🌍 le mur chauffe — accroche la première photo depuis un selfie ♡'); return; }
      wallSeen += res.photos.length;
      albumSetHits(shell, wallSeen);
      note.textContent = trT(`🌍 THE WORLDWIDE WALL — ${wallSeen}${res.cursor ? '+' : ''} framed visitors (owner-moderated ♡)`, `🌍 LE MUR MONDIAL — ${wallSeen}${res.cursor ? '+' : ''} visiteurs encadrés (modéré ♡)`);
      res.photos.forEach((p) => {
        const card = document.createElement('div');
        card.className = 'album-card';
        card.style.setProperty('--tilt', ((Math.random() * 5) - 2.5) + 'deg');
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.src = wallApi + '/photo/' + p.id;
        img.alt = '';
        const cap = document.createElement('div');
        cap.className = 'album-cap';
        cap.textContent = '🌍 ' + (p.t || '');
        card.append(img, cap);
        grid.appendChild(card);
      });
      if (res.cursor) {
        const more = document.createElement('button');
        more.type = 'button';
        more.className = 'wp-btn';
        more.textContent = trT('more ♡', 'plus ♡');
        more.addEventListener('click', () => { more.remove(); load(res.cursor); });
        grid.after(more);
      }
    });
    load();
  }
  // ---- Y2K wall deco: tickers, badges, stickers — a 2003 bedroom wall, but make it computer ----
  function albumSetHits(shell, n) {
    const digits = shell.querySelector('.album-hits-digits');
    if (!digits) return;
    digits.innerHTML = '';
    String(Math.max(0, n)).padStart(6, '0').split('').forEach((d, i) => {
      const s = document.createElement('span');
      s.textContent = d;
      s.style.animationDelay = (i * 0.07) + 's';
      digits.appendChild(s);
    });
  }
  function albumDeco(shell, count) {
    // scrolling ticker — the wall introduces itself, twice for a seamless loop
    const tick = document.createElement('div');
    tick.className = 'album-ticker';
    const run = document.createElement('span');
    run.className = 'album-ticker-run';
    const line = trT('✦ now_loading: memories.exe ✦ 100% cute · 0% bugs ✦ ctrl+S your feelings ✦ best viewed with sparkles ON ✦ ', '✦ chargement : souvenirs.exe ✦ 100% mignon · 0% bug ✦ ctrl+S tes émotions ✦ à regarder étoiles ON ✦ ');
    run.textContent = line + line;
    tick.appendChild(run);
    tick.setAttribute('aria-hidden', 'true');
    shell.prepend(tick);
    // eternal 99% download + odometer hit counter
    const status = document.createElement('div');
    status.className = 'album-statusrow';
    status.setAttribute('aria-hidden', 'true');
    const dl = document.createElement('div');
    dl.className = 'album-dl';
    const dlLabel = document.createElement('span');
    dlLabel.textContent = trT('cuteness.zip', 'mignonnerie.zip');
    const dlBar = document.createElement('div');
    dlBar.className = 'album-dl-bar';
    const dlPct = document.createElement('span');
    dlPct.textContent = '99%';
    dl.append(dlLabel, dlBar, dlPct);
    const hits = document.createElement('div');
    hits.className = 'album-hits';
    const hitsLabel = document.createElement('span');
    hitsLabel.textContent = trT('memories served:', 'souvenirs servis :');
    const digits = document.createElement('span');
    digits.className = 'album-hits-digits';
    hits.append(hitsLabel, digits);
    status.append(dl, hits);
    shell.appendChild(status);
    albumSetHits(shell, count);
    // the GeoCities badge altar
    const badges = document.createElement('div');
    badges.className = 'album-badges';
    badges.setAttribute('aria-hidden', 'true');
    [
      [trT('♥ SLIME inside ♥', '♥ SLIME inside ♥'), 'is-blink'],
      [trT('best viewed in 800×600', 'optimisé pour 800×600'), ''],
      ['GET /pixels → 200 OK', 'is-green'],
      [trT('no cookies · only crumbs', 'zéro cookie · que des miettes'), ''],
      [trT('valid HTML… probably', 'HTML valide… sans doute'), ''],
      [trT('☆ made with <3 and no framework ☆', '☆ fait avec <3 et zéro framework ☆'), 'is-rainbow']
    ].forEach(([label, cls]) => {
      const b = document.createElement('span');
      b.className = 'album-badge' + (cls ? ' ' + cls : '');
      b.textContent = label;
      badges.appendChild(b);
    });
    shell.appendChild(badges);
    // corner stickers: spinning mix CD, pixel cat, and the famous error dialog
    const cd = document.createElement('div');
    cd.className = 'album-cd';
    cd.setAttribute('aria-hidden', 'true');
    const disc = document.createElement('div');
    disc.className = 'album-cd-disc';
    const cdLabel = document.createElement('span');
    cdLabel.textContent = 'mix_2003.iso';
    cd.append(disc, cdLabel);
    const cat = document.createElement('div');
    cat.className = 'album-cat';
    cat.setAttribute('aria-hidden', 'true');
    cat.textContent = trT('ᓚᘏᗢ meow.exe', 'ᓚᘏᗢ miaou.exe');
    const err = document.createElement('div');
    err.className = 'album-err';
    err.setAttribute('aria-hidden', 'true');
    const errT = document.createElement('div');
    errT.className = 'album-err-title';
    errT.textContent = trT('⚠ error.exe', '⚠ erreur.exe');
    const errB = document.createElement('div');
    errB.className = 'album-err-body';
    errB.textContent = trT('2 cute!!', 'trop mimi !!');
    const errOk = document.createElement('button');
    errOk.type = 'button';
    errOk.className = 'album-err-ok';
    errOk.textContent = 'OK ♡';
    errOk.tabIndex = -1;
    errOk.addEventListener('click', () => {
      err.classList.add('is-dismissed');
      playTone(660, 'square', 0.06, 0, 0.03);
      setTimeout(() => err.remove(), 520);
    });
    err.append(errT, errB, errOk);
    status.insertBefore(err, hits); // the sticker lives in the status row — never over a photo
    // twinkling sparkles + one very rare butterfly (a bug that is a feature)
    const sparks = ['✦', '✧', '⋆', '✦'].map((ch, i) => {
      const s = document.createElement('span');
      s.className = 'album-spark';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = ch;
      s.style.left = (8 + (i * 137) % 82) + '%';
      s.style.top = (14 + (i * 211) % 70) + '%';
      s.style.animationDelay = (i * 0.65) + 's';
      return s;
    });
    const fly = document.createElement('span');
    fly.className = 'album-fly';
    fly.setAttribute('aria-hidden', 'true');
    const flyX = document.createElement('span');
    flyX.className = 'album-fly-x';
    flyX.textContent = '🦋';
    fly.appendChild(flyX);
    shell.append(cd, cat, fly, ...sparks);
  }
  var albumTab = 'mine';
  var albumGen = 0;
  function renderAlbum() {
    albumGen++;
    const shell = document.getElementById('album-shell');
    if (!shell) return;
    shell.innerHTML = '';
    // tab bar: my photos ↔ the worldwide wall
    const tabs = document.createElement('div');
    tabs.className = 'album-tabs';
    [['mine', trT('🏠 my photos', '🏠 mes photos')], ['wall', trT('🌍 worldwide wall', '🌍 mur mondial')]].forEach(([id, label]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'album-tab' + (albumTab === id ? ' is-on' : '');
      b.textContent = label;
      b.addEventListener('click', () => { albumTab = id; renderAlbum(); });
      tabs.appendChild(b);
    });
    const charm = document.createElement('span');
    charm.className = 'album-charm';
    charm.textContent = '📎♡';
    charm.setAttribute('aria-hidden', 'true');
    tabs.appendChild(charm);
    shell.appendChild(tabs);
    if (albumTab === 'wall') { renderWall(shell); albumDeco(shell, 0); return; }
    const photos = albumGet();
    const note = document.createElement('div');
    note.className = 'album-note';
    note.textContent = trT(`📸 ${photos.length}/12 photos · ${albumVideos.length} video take(s) this visit — the 📷 gift in slime_live opens the studio ♡`, `📸 ${photos.length}/12 photos · ${albumVideos.length} vidéo(s) cette visite — le cadeau 📷 dans slime_live ouvre le studio ♡`);
    shell.appendChild(note);
    if (!photos.length && !albumVideos.length) {
      const empty = document.createElement('div');
      empty.className = 'album-empty';
      empty.textContent = trT('no photos yet!! open slime_live.exe and gift a 📷 — the slime is READY.', 'aucune photo !! ouvre slime_live.exe et offre un 📷 — le slime est PRÊT.');
      shell.appendChild(empty);
      albumDeco(shell, 0);
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'album-grid';
    albumVideos.forEach((v) => {
      const card = document.createElement('div');
      card.className = 'album-card';
      card.style.setProperty('--tilt', ((Math.random() * 5) - 2.5) + 'deg');
      const vid = document.createElement('video');
      vid.src = v.v;
      vid.muted = true;
      vid.loop = true;
      vid.playsInline = true;
      vid.autoplay = true;
      const cap = document.createElement('div');
      cap.className = 'album-cap';
      cap.textContent = '🎬 ' + v.t;
      const save = document.createElement('button');
      save.type = 'button';
      save.className = 'album-save';
      save.textContent = '💾';
      save.addEventListener('click', () => { const a = document.createElement('a'); a.href = v.v; a.download = 'yongshanos-video-' + v.t.replace(/[: ]/g, '-') + '.' + v.ext; a.click(); });
      card.append(vid, cap, save);
      grid.appendChild(card);
    });
    photos.forEach((p, ix) => {
      const card = document.createElement('div');
      card.className = 'album-card';
      card.style.setProperty('--tilt', ((Math.random() * 5) - 2.5) + 'deg');
      const img = document.createElement('img');
      img.src = p.d;
      img.alt = '';
      const cap = document.createElement('div');
      cap.className = 'album-cap';
      cap.textContent = (p.k === 'selfie' ? '🤳 ' : '📸 ') + p.t;
      const save = document.createElement('button');
      save.type = 'button';
      save.className = 'album-save';
      save.textContent = '💾';
      save.addEventListener('click', (ev) => { ev.stopPropagation(); const a = document.createElement('a'); a.href = p.d; a.download = 'yongshanos-' + p.k + '-' + p.t.replace(/[: ]/g, '-') + '.jpg'; a.click(); });
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'album-del';
      del.textContent = '✕';
      del.setAttribute('aria-label', trT('delete photo', 'supprimer'));
      del.addEventListener('click', (ev) => { ev.stopPropagation(); const a = albumGet(); a.splice(ix, 1); store.set('yos-album', a); renderAlbum(); });
      card.append(img, cap, save, del);
      grid.appendChild(card);
    });
    shell.appendChild(grid);
    albumDeco(shell, photos.length + albumVideos.length);
  }
  /* ---- 🎧 VIBE MODE ----
     browsers cannot (and must not) hear what a visitor is playing — so the
     visitor TELLS us the genre with one tap, and the whole room commits:
     pixel headphones for everyone, a genre-matched dance, and the weather
     sfx ducks to a whisper so their actual music owns the mix. */
  const VIBE_GENRES = [
    { id: 'lofi', icon: '☕', n: ['lofi', 'lofi'], line: ['lofi beats to pet slimes to. sway engaged.', 'lofi beats pour caresser des slimes. balancement enclenché.'], act(st) { st.classList.add('vibe-sway'); } },
    { id: 'pop', icon: '🎤', n: ['pop', 'pop'], line: ['certified BOP detected. the meadow agrees.', 'BOP certifié détecté. la prairie approuve.'], act(st) { [0, 380, 760, 1140].forEach((d) => setTimeout(() => moveSlime({ action: 'hop', mood: 'bop', duration: 320, distance: 0.7, scheduleNext: d === 1140 }), d)); fxRain(['✦', '♥'], 8); } },
    { id: 'kpop', icon: '💜', n: ['k-pop', 'k-pop'], line: ['the fanchant is MANDATORY. lightsticks up.', 'le fanchant est OBLIGATOIRE. lightsticks levés.'], act(st) { GARDEN.buddies.slice(0, 4).forEach((b, i) => setTimeout(() => { pikSay(b, '💜', 1200); }, i * 200)); [0, 300, 600, 900].forEach((d, i) => setTimeout(() => moveSlime({ action: 'alert', mood: 'choreo', duration: 240, scheduleNext: i === 3 }), d)); } },
    { id: 'rock', icon: '🤘', n: ['rock', 'rock'], line: ['tell your neck I apologized in advance. 🤘', 'préviens ta nuque que je m\'excuse d\'avance. 🤘'], act(st) { st.classList.add('vibe-headbang'); setTimeout(() => st.classList.remove('vibe-headbang'), 3200); } },
    { id: 'electronic', icon: '🎛', n: ['electronic', 'électro'], line: ['unts unts unts unts ♡', 'unts unts unts unts ♡'], act(st) { st.classList.add('gift-disco'); if (slimeBody) { slimeBody.classList.add('gift-robo'); setTimeout(() => slimeBody.classList.remove('gift-robo'), 3200); } setTimeout(() => st.classList.remove('gift-disco'), 4200); } },
    { id: 'classical', icon: '🎻', n: ['classical', 'classique'], line: ['the meadow philharmonic, at your service.', 'la philharmonie de la prairie, à votre service.'], act(st) { GARDEN.buddies.forEach((b, i) => setTimeout(() => pikSay(b, '♪', 1000), 300 + i * 340)); moveSlime({ action: 'alert', mood: 'conductor', duration: 900 }); } },
    { id: 'jazz', icon: '🎷', n: ['jazz', 'jazz'], line: ['improvising… respectfully.', 'j\'improvise… respectueusement.'], act(st) { st.classList.add('vibe-sway'); burstAtSlime(['🎷', '♪'], 4); } },
    { id: 'rap', icon: '🧢', n: ['rap', 'rap'], line: ['bars. those were ACTUAL bars.', 'des punchlines. de VRAIES punchlines.'], act(st) { st.classList.add('vibe-nod'); setTimeout(() => st.classList.remove('vibe-nod'), 3600); burstAtSlime(['🧢', '✦'], 4); } }
  ];
  function vibeStop() {
    window.__vibeOn = false;
    const btn = document.getElementById('live-vibe');
    if (btn) { btn.setAttribute('aria-pressed', 'false'); btn.classList.remove('is-on'); }
    if (liveStage) {
      liveStage.classList.remove('vibe-sway', 'vibe-headbang', 'vibe-nod');
      liveStage.querySelectorAll('.vibe-phones, .vibe-genre-panel').forEach((el) => el.remove());
    }
    GARDEN.buddies.forEach((b) => { if (b._phoneEl) { b._phoneEl.remove(); b._phoneEl = null; } });
    if (slimeBody) { const p = slimeBody.querySelector('.vibe-phones-slime'); if (p) p.remove(); }
    wxSfx(wxCurrent); // volume back to normal
  }
  function vibeStart(genre) {
    window.__vibeOn = true;
    const btn = document.getElementById('live-vibe');
    if (btn) { btn.setAttribute('aria-pressed', 'true'); btn.classList.add('is-on'); }
    // everyone puts on headphones — slime AND squad
    if (slimeBody && !slimeBody.querySelector('.vibe-phones-slime')) {
      const p = document.createElement('span');
      p.className = 'vibe-phones-slime';
      p.textContent = '🎧';
      slimeBody.appendChild(p);
    }
    GARDEN.buddies.forEach((b, i) => {
      if (b._phoneEl) return;
      const p = document.createElement('span');
      p.className = 'pik-carry';
      p.textContent = '🎧';
      b.el.appendChild(p);
      b._phoneEl = p;
    });
    wxSfx(wxCurrent); // re-applies volume with the vibe duck
    showBubble(trT('you like listening to music? I ALSO like listening to music 😋', 'tu aimes écouter de la musique ? MOI AUSSI j\'aime écouter de la musique 😋'), 2800);
    setTimeout(() => {
      showBubble(trT(genre.line[0], genre.line[1]), 3000);
      genre.act(liveStage);
      burstAtSlime(['🎧', '♪', '♥'], 6);
    }, 2400);
    // the vibe fades politely after 3 minutes (or another tap)
    if (window.__vibeTimer) clearTimeout(window.__vibeTimer);
    window.__vibeTimer = setTimeout(vibeStop, 180000);
  }
  function vibeToggle() {
    if (!liveOpen || !liveStage) return;
    if (window.__vibeOn) { vibeStop(); return; }
    const old = liveStage.querySelector('.vibe-genre-panel');
    if (old) { old.remove(); return; }
    const panel = document.createElement('div');
    panel.className = 'vibe-genre-panel';
    const head = document.createElement('div');
    head.className = 'vibe-genre-head';
    head.textContent = trT('what are we listening to? ♡', 'on écoute quoi ? ♡');
    panel.appendChild(head);
    const grid = document.createElement('div');
    grid.className = 'vibe-genre-grid';
    VIBE_GENRES.forEach((g) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'vibe-genre-btn';
      b.textContent = g.icon + ' ' + trT(g.n[0], g.n[1]);
      b.addEventListener('click', () => { panel.remove(); vibeStart(g); });
      grid.appendChild(b);
    });
    panel.appendChild(grid);
    liveStage.appendChild(panel);
    setTimeout(() => { if (panel.parentNode) panel.remove(); }, 15000);
  }
  var beamTipShown = false;
  function liveBeamMaybe() {
    // landscape phone in the live room: the grass suffers. say so, kindly —
    // and offer to BEAM the page to a bigger screen via the system share
    // sheet (AirDrop / Nearby Share: real device discovery, user-controlled)
    if (beamTipShown || !liveOpen || !liveStage) return;
    const landscapePhone = window.matchMedia('(orientation: landscape)').matches && window.innerHeight < 520 && ('ontouchstart' in window);
    if (!landscapePhone) return;
    beamTipShown = true;
    const tip = document.createElement('div');
    tip.className = 'live-beam-tip';
    const msg = document.createElement('span');
    msg.textContent = trT('🖥️ this stream is BIGGER on a computer ♡', '🖥️ ce stream est PLUS GRAND sur un ordinateur ♡');
    const beam = document.createElement('button');
    beam.type = 'button';
    beam.className = 'live-beam-btn';
    beam.textContent = trT('📡 beam it to a nearby device', '📡 téléporter vers un appareil proche');
    beam.addEventListener('click', () => {
      const url = 'https://yyswhsccc.github.io/personal-website/#live';
      if (navigator.share) {
        navigator.share({ title: 'yongshanOS · slime live', text: trT('the slime is live — open me on the big screen ♡', 'le slime est en direct — ouvre-moi sur le grand écran ♡'), url })
          .then(() => { tip.remove(); showToast(trT('📡 beamed — it opens straight into the live room ♡', '📡 téléporté — ça ouvre direct dans le salon live ♡')); })
          .catch(() => { /* sheet dismissed — no drama */ });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => showToast(trT('📋 link copied — open it on the big screen ♡', '📋 lien copié — ouvre-le sur le grand écran ♡'))).catch(() => {});
      }
    });
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'live-beam-x';
    x.textContent = '✕';
    x.setAttribute('aria-label', trT('dismiss', 'fermer'));
    x.addEventListener('click', () => tip.remove());
    tip.append(msg, beam, x);
    liveStage.appendChild(tip);
    setTimeout(() => { if (tip.parentNode) tip.remove(); }, 20000);
  }
  window.addEventListener('resize', () => { if (liveOpen) setTimeout(liveBeamMaybe, 400); });
  function liveEnter() {
    if (liveOpen || !liveStage || !slimeBody) return;
    if (typeof gameCamExit === 'function') gameCamExit(); // habitat home first
    liveOpen = true;
    if (typeof ghostHidden === 'function' && ghostHidden()) ghostAppear(0, false);
    liveStage.appendChild(slimeBody);
    liveStage.appendChild(speechBubble);
    slimeHabitat.classList.add('on-air');
    slimePosition.x = 0; slimePosition.y = 0;
    applySlimeTransform(1, 0, 400);
    showBubble(trT("WE'RE LIVE!! hi chat ♡", 'ON EST EN DIRECT !! coucou le chat ♡'), 2600);
    if (typeof moveSlime === 'function') moveSlime({ action: 'happy', mood: trT('streaming', 'en direct'), duration: 800 });
    // the colourful bullet chat broadcasts from inside the stage while
    // live — except on phones, where it sits BELOW the screen showing
    // one line at a time (the slime must never be curtained off)
    if (danmakuBox) {
      if (window.matchMedia('(max-width: 700px)').matches) {
        danmakuBox.classList.add('mobile-danmaku');
        liveStage.parentNode.insertBefore(danmakuBox, liveStage.nextSibling);
      } else {
        danmakuBox.classList.remove('mobile-danmaku');
        liveStage.appendChild(danmakuBox);
      }
    }
    liveViewerTick();
    gardenStart();
    liveWeather();
    setTimeout(liveBeamMaybe, 800);
    if (wxRefreshTimer) clearInterval(wxRefreshTimer);
    wxRefreshTimer = setInterval(liveWeather, 60000); // fresh sky every minute on air
    gooseLoop();
    setTimeout(() => { if (liveOpen) spawnGeese(); }, 4500); // welcome flock
  }

  function liveExit() {
    if (!liveOpen) return;
    liveOpen = false;
    if (window.__vibeOn) vibeStop();
    camStop();
    gardenStop();
    if (gooseTimer) { clearTimeout(gooseTimer); gooseTimer = null; }
    gooseCallStop(); // the honks leave with the audience
    wxSfxStop(); // and the weather falls silent too
    if (wxRefreshTimer) { clearInterval(wxRefreshTimer); wxRefreshTimer = null; }
    slimeHabitat.appendChild(slimeBody);
    slimeHabitat.appendChild(speechBubble);
    slimeHabitat.classList.remove('on-air');
    if (danmakuBox) {
      danmakuBox.classList.remove('mobile-danmaku');
      document.body.appendChild(danmakuBox); // bullet chat back to its corner
    }
    slimePosition.x = 0; slimePosition.y = 0;
    applySlimeTransform(1, 0, 400);
  }

  var liveViewerTimer = null;
  function liveViewerTick() {
    // clear-then-set: reopening the stream can't stack duplicate tickers
    if (liveViewerTimer) { clearTimeout(liveViewerTimer); liveViewerTimer = null; }
    const el = document.getElementById('live-viewers');
    if (el) el.textContent = String(38 + Math.floor(Math.random() * 30) + pet.followers);
    if (liveOpen) liveViewerTimer = setTimeout(liveViewerTick, 4000);
  }

  // the room's ONE chat is the colourful mini-danmaku itself — it
  // physically relocates onto the stage while we're live (liveEnter),
  // so mirroring clones here would only duplicate it
  function liveMirror() {}

  /* ---------- the petal garden (a pikmin-hearted meadow) ----------
     Sprouts poke out of the meadow; pluck one and a petal buddy
     joins the stream — it follows the slime, carries gifts to it,
     blooms leaf → bud → flower over time, and answers the whistle. */
  const GARDEN = { buddies: [], sprouts: [], planted: false, timer: null, nextSprout: 0, gatherUntil: 0 };
  const PIK_MAX = 6;
  const PIK_COLORS = [
    { body: '#ff8fc7', dark: '#d6539b' },
    { body: '#c9a7f5', dark: '#9a6fd6' },
    { body: '#a8e0ff', dark: '#5fa8dc' },
    { body: '#ffd97a', dark: '#d8a02e' },
    { body: '#9fe8c0', dark: '#4fb583' }
  ];
  const pikSpriteCache = {};

  /* ==================================================================
     PIXEL BODY SHOP — every pikmin is drawn from a tiny text template.
     legend: B body · D dark · W soft-white · w pure white · e eye ·
             u blush · S stem · L leaf · Y yellow · P pink accent
     normal pikmin roll a BODY (8) and a HEAD PLANT (10) from their hue
     — deterministic, so the same friend always looks the same, even
     restored from the cloud. hidden species get bespoke bodies below.
     ================================================================== */
  const PIK_BODY_TPLS = [
    [ // 0 classic squat jelly
      '...BBBBB...', '..BWBBBBB..', '..BBeBBeB..', '..BuBBBBu..',
      '..BBBBBBB..', '...BBBBB...', '...DD..DD..', '...DD..DD..', '...........'],
    [ // 1 round ball
      '....BBB....', '..BBBBBBB..', '.BWBeBBeBB.', '.BBuBBBBuB.',
      '.BBBBBBBBB.', '..BBBBBBB..', '....D.D....', '...........', '...........'],
    [ // 2 tall bean
      '....BBB....', '...BBBBB...', '...BeBeB...', '...uBBBu...',
      '...BBBBB...', '...BBBBB...', '...BBBBB...', '....D.D....', '...........'],
    [ // 3 egg (wide hips)
      '....BBB....', '...BBBBB...', '..BBeBeBB..', '..BuBBBuB..',
      '.BBBBBBBBB.', '.BBBBBBBBB.', '..BBBBBBB..', '...D...D...', '...........'],
    [ // 4 pudding (little top, big skirt)
      '.....B.....', '....BBB....', '...BeBeB...', '..BBuBuBB..',
      '.BBBBBBBBB.', '.BBBBBBBBB.', '.BBBBBBBBB.', '..D.....D..', '...........'],
    [ // 5 cube
      '..BBBBBBB..', '..BWBBBBB..', '..BeBBBeB..', '..BuBBBuB..',
      '..BBBBBBB..', '..BBBBBBB..', '..DD...DD..', '...........', '...........'],
    [ // 6 marshmallow puff (three nub feet)
      '...........', '..BBBBBBB..', '.BBeBBBeBB.', '.BuBBBBBuB.',
      '.BBBBBBBBB.', '.BBBBBBBBB.', '..D..D..D..', '...........', '...........'],
    [ // 7 teardrop
      '.....B.....', '....BBB....', '...BBBBB...', '..BeBBBeB..',
      '..BuBBBuB..', '..BBBBBBB..', '...BBBBB...', '....D.D....', '...........']
  ];
  const PIK_PLANT_TPLS = [
    [ // 0 classic: flopped leaf → bud → white daisy
      ['...........', '..LL.......', '...LL......', '.....S.....', '.....S.....'],
      ['....DDD....', '....DDD....', '.....S.....', '.....S.....', '.....S.....'],
      ['....w.w....', '....wYw....', '....w.w....', '.....S.....', '.....S.....']],
    [ // 1 twin leaves → double bud → twin blooms
      ['...........', '...L...L...', '....L.L....', '.....S.....', '.....S.....'],
      ['...D...D...', '...DD.DD...', '....S.S....', '.....S.....', '.....S.....'],
      ['...w...w...', '...wY.Yw...', '....S.S....', '.....S.....', '.....S.....']],
    [ // 2 sprig ladder → tipped sprig → heart bloom
      ['...........', '....L......', '.....SL....', '....LS.....', '.....S.....'],
      ['.....D.....', '....DD.....', '.....SL....', '....LS.....', '.....S.....'],
      ['....P.P....', '....PPP....', '.....P.....', '.....S.....', '.....S.....']],
    [ // 3 tulip: shoot → cup → open tulip
      ['...........', '.....L.....', '....LL.....', '.....S.....', '.....S.....'],
      ['....DDD....', '....DDD....', '....DDD....', '.....S.....', '.....S.....'],
      ['....B.B....', '....BBB....', '....BwB....', '.....S.....', '.....S.....']],
    [ // 4 clover: one leaf → three → lucky four with gold heart
      ['...........', '.....L.....', '....LL.....', '.....S.....', '.....S.....'],
      ['....L.L....', '.....L.....', '.....S.....', '.....S.....', '.....S.....'],
      ['....L.L....', '.....Y.....', '....L.L....', '.....S.....', '.....S.....']],
    [ // 5 star: slanted leaf → diamond bud → gold star
      ['...........', '......L....', '.....SL....', '.....S.....', '.....S.....'],
      ['.....D.....', '....DDD....', '.....D.....', '.....S.....', '.....S.....'],
      ['.....Y.....', '....YYY....', '.....Y.....', '.....S.....', '.....S.....']],
    [ // 6 berry sprig: leaf → berry pair → berry cluster
      ['...........', '....L......', '....LS.....', '.....S.....', '.....S.....'],
      ['....P.P....', '.....S.....', '.....S.....', '.....S.....', '.....S.....'],
      ['...P.P.P...', '....P.P....', '.....S.....', '.....S.....', '.....S.....']],
    [ // 7 curly antenna: curl → curl+leaf → swirl bloom
      ['...........', '....SS.....', '......S....', '.....S.....', '.....S.....'],
      ['....SSL....', '......S....', '.....S.....', '.....S.....', '.....S.....'],
      ['....PP.....', '....SPP....', '.....S.....', '.....S.....', '.....S.....']],
    [ // 8 mushroom: nub → small cap → wide dotted cap
      ['...........', '.....L.....', '.....S.....', '.....S.....', '.....S.....'],
      ['....DDD....', '.....S.....', '.....S.....', '.....S.....', '.....S.....'],
      ['...DDwDD...', '..DDDDDDD..', '.....S.....', '.....S.....', '.....S.....']],
    [ // 9 signal antenna: zigzag → ball tip → glowing tip (very computer)
      ['...........', '....S......', '.....S.....', '....S......', '.....S.....'],
      ['....D......', '.....S.....', '....S......', '.....S.....', '.....S.....'],
      ['....Y......', '....YS.....', '.....S.....', '....S......', '.....S.....']],
    [ // 10 sakura: petal pair → puff → five-petal blossom
      ['...........', '....P......', '.....SP....', '.....S.....', '.....S.....'],
      ['....PP.....', '....PP.....', '.....S.....', '.....S.....', '.....S.....'],
      ['...P.w.P...', '....PwP....', '...P.S.P...', '.....S.....', '.....S.....']],
    [ // 11 sunflower: shoot → ring bud → big gold face
      ['...........', '.....L.....', '.....S.....', '.....S.....', '.....S.....'],
      ['....YYY....', '....YDY....', '.....S.....', '.....S.....', '.....S.....'],
      ['...YYYYY...', '...YDDDY...', '...YYYYY...', '.....S.....', '.....S.....']],
    [ // 12 dandelion: leaf → tuft → full wish-puff
      ['...........', '.....L.....', '....LS.....', '.....S.....', '.....S.....'],
      ['....www....', '.....w.....', '.....S.....', '.....S.....', '.....S.....'],
      ['....w.w....', '...w.w.w...', '....w.w....', '.....S.....', '.....S.....']],
    [ // 13 cattail: reed → velvet tip → tall corn-dog (botanical!)
      ['.....L.....', '.....S.....', '.....S.....', '.....S.....', '.....S.....'],
      ['.....D.....', '.....D.....', '.....S.....', '.....S.....', '.....S.....'],
      ['.....D.....', '.....D.....', '.....D.....', '.....S.....', '.....S.....']],
    [ // 14 fern curl: tight curl → half open → full spiral
      ['...........', '...........', '....SS.....', '.....S.....', '.....S.....'],
      ['....SSS....', '....S......', '.....S.....', '.....S.....', '.....S.....'],
      ['...SSS.....', '...S.SS....', '....SS.....', '.....S.....', '.....S.....']],
    [ // 15 lavender: sprig → twin buds → stacked bloom
      ['...........', '.....L.....', '.....S.....', '.....S.....', '.....S.....'],
      ['....B.B....', '.....S.....', '.....S.....', '.....S.....', '.....S.....'],
      ['.....B.....', '....B.B....', '....BSB....', '.....S.....', '.....S.....']],
    [ // 16 snowdrop: nod → white droplet → double droplet
      ['...........', '.....SL....', '....S......', '.....S.....', '.....S.....'],
      ['....S......', '...Sw......', '.....S.....', '.....S.....', '.....S.....'],
      ['...S..S....', '..Sw..Sw...', '.....S.....', '.....S.....', '.....S.....']],
    [ // 17 bellflower: hook → bell → ringing bell (with clapper)
      ['...........', '....SS.....', '.....S.....', '.....S.....', '.....S.....'],
      ['....BBB....', '....B.B....', '.....S.....', '.....S.....', '.....S.....'],
      ['....BBB....', '....BBB....', '....BYB....', '.....S.....', '.....S.....']],
    [ // 18 pinwheel: stick → half spin → full pinwheel (Y2K toy!)
      ['...........', '.....D.....', '.....S.....', '.....S.....', '.....S.....'],
      ['....PD.....', '.....DP....', '.....S.....', '.....S.....', '.....S.....'],
      ['....P.B....', '.....D.....', '....B.P....', '.....S.....', '.....S.....']],
    [ // 19 crystal: chip → shard → glowing cluster
      ['...........', '.....w.....', '.....S.....', '.....S.....', '.....S.....'],
      ['.....B.....', '....BwB....', '.....S.....', '.....S.....', '.....S.....'],
      ['....B.w....', '....wBB....', '....B.B....', '.....S.....', '.....S.....']],
    [ // 20 heart vine: curl → small heart → double hearts
      ['...........', '....S......', '.....S.....', '.....S.....', '.....S.....'],
      ['....P.P....', '.....P.....', '.....S.....', '.....S.....', '.....S.....'],
      ['..P.P.P.P..', '...P...P...', '.....S.....', '.....S.....', '.....S.....']],
    [ // 21 wheat: blade → grains → full ear
      ['...........', '.....L.....', '.....S.....', '.....S.....', '.....S.....'],
      ['....Y.Y....', '.....Y.....', '.....S.....', '.....S.....', '.....S.....'],
      ['....Y.Y....', '....Y.Y....', '.....Y.....', '.....S.....', '.....S.....']],
    [ // 22 maple: stub → half leaf → proud maple (very canada)
      ['...........', '.....L.....', '.....S.....', '.....S.....', '.....S.....'],
      ['....PP.....', '....PPP....', '.....S.....', '.....S.....', '.....S.....'],
      ['....P.P....', '...PPPPP...', '.....P.....', '.....S.....', '.....S.....']],
    [ // 23 bonsai: seedling → mini canopy → sculpted cloud pads
      ['...........', '....LL.....', '.....S.....', '.....S.....', '.....S.....'],
      ['...LLL.....', '.....S.....', '....SS.....', '.....S.....', '.....S.....'],
      ['..LLL.LLL..', '....S.S....', '.....S.....', '.....S.....', '.....S.....']],
    [ // 24 lotus: pad → closed bud → open lotus
      ['...........', '...........', '....LLL....', '.....S.....', '.....S.....'],
      ['....BB.....', '....BBB....', '.....S.....', '.....S.....', '.....S.....'],
      ['...B.w.B...', '....BBB....', '....LLL....', '.....S.....', '.....S.....']],
    [ // 25 clockwork: gear seed → wound spring → ticking bloom (computer!)
      ['...........', '.....D.....', '.....S.....', '.....S.....', '.....S.....'],
      ['....DwD....', '.....D.....', '.....S.....', '.....S.....', '.....S.....'],
      ['....DYD....', '....DwD....', '....D.D....', '.....S.....', '.....S.....']],
    [ // 26 bubble stem: one bubble → two → fizzing column
      ['...........', '.....w.....', '.....S.....', '.....S.....', '.....S.....'],
      ['....w......', '......w....', '.....S.....', '.....S.....', '.....S.....'],
      ['....w.w....', '......w....', '....w......', '.....S.....', '.....S.....']],
    [ // 27 candy cane: nub → hook → full cane with stripe
      ['...........', '....PP.....', '.....S.....', '.....S.....', '.....S.....'],
      ['....PPw....', '.....S.....', '.....S.....', '.....S.....', '.....S.....'],
      ['....PwP....', '....P......', '....wS.....', '.....S.....', '.....S.....']],
    [ // 28 starfruit sprig: dot → slice → twin stars
      ['...........', '.....Y.....', '.....S.....', '.....S.....', '.....S.....'],
      ['....Y.Y....', '.....Y.....', '.....S.....', '.....S.....', '.....S.....'],
      ['...Y...Y...', '....Y.Y....', '.....S.....', '.....S.....', '.....S.....']],
    [ // 29 forget-me-not: leaflet → trio → cloud of tiny blues
      ['...........', '.....L.....', '....SL.....', '.....S.....', '.....S.....'],
      ['....B.B....', '.....B.....', '.....S.....', '.....S.....', '.....S.....'],
      ['...B.B.B...', '....B.B....', '...B.S.B...', '.....S.....', '.....S.....']],
    [ // 30 mochi dango: one ball → two → three on a skewer
      ['...........', '.....P.....', '.....S.....', '.....S.....', '.....S.....'],
      ['.....P.....', '.....w.....', '.....S.....', '.....S.....', '.....S.....'],
      ['.....P.....', '.....w.....', '.....L.....', '.....S.....', '.....S.....']],
    [ // 31 ribbon: knot → single loop → double bow
      ['...........', '....P......', '.....S.....', '.....S.....', '.....S.....'],
      ['....PP.....', '.....P.....', '.....S.....', '.....S.....', '.....S.....'],
      ['...PP.PP...', '....P.P....', '.....P.....', '.....S.....', '.....S.....']],
    [ // 32 cactus bloom: spike → spikier → surprise pink flower
      ['...........', '....LLL....', '.....S.....', '.....S.....', '.....S.....'],
      ['...L.L.L...', '....LLL....', '.....S.....', '.....S.....', '.....S.....'],
      ['....PPP....', '...L.L.L...', '....LLL....', '.....S.....', '.....S.....']],
    [ // 33 morning glory: curl → cone → open trumpet
      ['...........', '....SS.....', '.....S.....', '.....S.....', '.....S.....'],
      ['....BB.....', '.....B.....', '.....S.....', '.....S.....', '.....S.....'],
      ['...BwwB....', '....BB.....', '.....S.....', '.....S.....', '.....S.....']],
    [ // 34 sparkler: wick → first spark → full fizz (Y2K new year!)
      ['...........', '.....D.....', '.....S.....', '.....S.....', '.....S.....'],
      ['....Y......', '.....D.....', '.....S.....', '.....S.....', '.....S.....'],
      ['...Y.w.Y...', '....wYw....', '.....D.....', '.....S.....', '.....S.....']]
  ];
  /* bespoke bodies for the hidden 22 — the weirdest shapes live here.
     grey silhouettes of these exact shapes tease the empty dex slots. */
  const PIK_SPECIES_TPLS = {
    glitch: [ // a blob rendered wrong on purpose
      '...........', '....S......', '..DDD......', '...BBBBB...', '.BBBBB.....',
      '...BBBBBBB.', '..BeBBeB...', '....BBBBuB.', '..BBBBB....', '...BBBBBB..',
      '..DD..DD...', '...........', '...........', '...........'],
    matrix: [ // a tiny CRT monitor
      '...........', '....S.S....', '..DDDDDDD..', '..DBBBBBD..', '..DBeBeBD..',
      '..DBBBBBD..', '..DBuBuBD..', '..DBBBBBD..', '..DDDDDDD..', '....DDD....',
      '...DDDDD...', '...........', '...........', '...........'],
    pointer: [ // literally the cursor
      '...........', '..B........', '..BB.......', '..BBB......', '..BBBB.....',
      '..BeBBB....', '..BBBeBB...', '..BBBBBBB..', '..BBBB.....', '..B.BB.....',
      '....BB.....', '.....BB....', '...........', '...........'],
    wifi: [ // a walking signal indicator
      '...........', '.BBBBBBBBB.', '...........', '..BBBBBBB..', '...........',
      '...BeBeB...', '...BBBBB...', '....BBB....', '.....B.....', '....D.D....',
      '...........', '...........', '...........', '...........'],
    lowbatt: [ // a battery at 15%
      '...........', '.....S.....', '.....L.....', '.DDDDDDDD..', '.DwBBBBBDD.',
      '.DwBeBeBDD.', '.DwBuBuBDD.', '.DwBBBBBDD.', '.DDDDDDDD..', '..D.....D..',
      '...........', '...........', '...........', '...........'],
    post: [ // a keycap with legs
      '...........', '.....S.....', '....LL.....', '..DDDDDDD..', '.DBWBBBBBD.',
      '.DBeBBeBBD.', '.DBuBBuBBD.', '.DBBBBBBBD.', '.DDDDDDDDD.', '..D.....D..',
      '...........', '...........', '...........', '...........'],
    cumulus: [ // a cloud. no feet. floats.
      '.............', '.....BBB.....', '...BBBBBBB...', '..BBBBBBBBB..', '.BBWBBBBBBBB.',
      '.BBeBBBBeBBB.', '.BBBuBBuBBBB.', '..BBBBBBBBB..', '...B.BBB.B...', '.............',
      '.............', '.............', '.............', '.............'],
    feature: [ // a long boi with many feet (walks backwards)
      '.............', '......S......', '.....LL......', '.............', '.............',
      '.............', '..BBBBBBBBB..', '.BBBBBBBBBBB.', '.BeBeBBBBBBB.', '.BuBBBBBBBBB.',
      '.BBBBBBBBBBB.', '..D.D.D.D.D..', '.............', '.............'],
    latency: [ // an hourglass, obviously
      '...........', '.....S.....', '....LL.....', '.DDDDDDDDD.', '..BBBBBBB..',
      '...BeBeB...', '....BBB....', '.....B.....', '....BBB....', '...BuBuB...',
      '..BBBBBBB..', '.DDDDDDDDD.', '...........', '...........'],
    aliased: [ // rendered at half resolution out of principle
      '...........', '....SS.....', '....SS.....', '..BBBBBB...', '..BBBBBB...',
      '..eeBBee...', '..eeBBee...', '..BBBBBB...', '..BBBBBB...', '..DD..DD...',
      '..DD..DD...', '...........', '...........', '...........'],
    darkmode: [ // a crescent moon creature
      '...........', '.....S.....', '....LL.....', '....BBBB...', '..BBBBBB...',
      '.BBBB......', '.BBeB......', '.BBBB......', '.BBBBB.....', '..BBBBBB...',
      '....BBBB...', '.....D.D...', '...........', '...........'],
    gilded: [ // the trophy itself
      '...........', '.....S.....', '....LL.....', '.D.DDDDD.D.', '.D.BBBBB.D.',
      '.DDBeBeBDD.', '...BuBuB...', '...BBBBB...', '....BBB....', '.....B.....',
      '....DDD....', '...DDDDD...', '...........', '...........'],
    cacheghost: [ // wavy-bottomed, refuses to be freed
      '...........', '.....S.....', '....LL.....', '....BBB....', '..BBBBBBB..',
      '..BeBBeBB..', '..BBBBBBB..', '..BuBBBuB..', '..BBBBBBB..', '..BBBBBBB..',
      '..B.BB.BB..', '...........', '...........', '...........'],
    cronjob: [ // a round clock with bells
      '...........', '...D...D...', '..D.....D..', '...BBBBB...', '..BBBwBBB..',
      '.BBBBDBBBB.', '.BBeBDBeBB.', '.BBBBDDBBB.', '..BBBBBBB..', '...BBBBB...',
      '....D.D....', '...........', '...........', '...........'],
    y2kbug: [ // a party-hat cone that never got its apocalypse
      '.....P.....', '....PY.....', '....BB.....', '...BBBB....', '...BeBe....',
      '..BBBBBB...', '..BuBBuB...', '.BBBBBBBB..', '.BBBBBBBB..', '.DDDDDDDD..',
      '....D.D....', '.w...P...Y.', '...........', '...........'],
    bitflip: [ // half zero, half one — swapped feet included
      '...........', '.....S.....', '....LL.....', '...BBBDDD..', '..BBBBDDDD.',
      '..BeBBDDwD.', '..BBBBDDDD.', '..BuBBDDDD.', '..BBBBDDDD.', '...BBBDDD..',
      '...D....B..', '...........', '...........', '...........'],
    turbo: [ // flame-topped, warranty voided
      '.....B.....', '....BB.B...', '...BBBBB...', '....PPP....', '...BBBBB...',
      '..BBBBBBB..', '..BeBBeBB..', '..BuBBBuB..', '..BBBBBBB..', '...BBBBB...',
      '...DD.DD...', '...........', '...........', '...........'],
    dotmatrix: [ // a sheet of tractor-feed paper
      '...........', '.....S.....', '....LL.....', '.wBBBBBBBw.', '.BBBBBBBBB.',
      '.wBeBBeBBw.', '.BBBBBBBBB.', '.wBuBBuBBw.', '.BBBBBBBBB.', '.wBBBBBBBw.',
      '..D.....D..', '...........', '...........', '...........'],
    bsodjr: [ // a tiny sad window (it gets back up)
      '...........', '.....S.....', '....LL.....', '.DDDDDDDDD.', '.DwDDDDDDD.',
      '.DBBBBBBBD.', '.DBeBBeBBD.', '.DBBBBBBBD.', '.DBuBBuBBD.', '.DBBBBBBBD.',
      '.DDDDDDDDD.', '..D.....D..', '...........', '...........'],
    rgbrig: [ // hexagonal gamer chassis
      '...........', '.....S.....', '....LL.....', '....BBB....', '..BBBBBBB..',
      '.BBWBBBBBB.', '.BeBBBBeBB.', '.BBBBBBBBB.', '.BuBBBBuBB.', '..BBBBBBB..',
      '....BBB....', '...D...D...', '...........', '...........'],
    captcha: [ // a checkbox that already ticked itself
      '...........', '.....S.....', '....LL.....', '.DDDDDDDDD.', '.DBBBBBBBD.',
      '.DBeBeBwBD.', '.DBBBBwBBD.', '.DBuBwBuBD.', '.DBwBBBBBD.', '.DBBBBBBBD.',
      '.DDDDDDDDD.', '..D.....D..', '...........', '...........'],
    kernelpg: [ // an egg with penguin ambitions
      '...........', '.....S.....', '....LL.....', '....BBB....', '...BBBBB...',
      '..BBeBeBB..', '..BBBYBBB..', '..BwwwwwB..', '..BwwwwwB..', '..BBBBBBB..',
      '...Y...Y...', '...........', '...........', '...........']
  };
  const PIK_SIL_COLORS = { B: '#948aab', D: '#675d80', W: '#948aab', w: '#948aab', e: '#948aab', u: '#948aab', S: '#948aab', L: '#948aab', Y: '#948aab', P: '#948aab' };
  function pikHueFromColor(color) {
    const m = /hsl\((\d+)/.exec(color.body || '');
    if (m) return parseInt(m[1], 10);
    const ix = PIK_COLORS.findIndex((pc) => pc.body === color.body);
    return ix >= 0 ? PIK_LEGACY_HUES[ix] : 330;
  }
  function pikDrawTpl(x, rows, pal) {
    rows.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        const ch = row[rx];
        if (ch === '.') continue;
        x.fillStyle = pal[ch] || pal.B;
        x.fillRect(rx, ry, 1, 1);
      }
    });
  }
  function pikSprite(color, stage, spId, silhouette) {
    const key = color.body + '/' + stage + '/' + (spId || '') + '/' + (silhouette ? 1 : 0);
    if (pikSpriteCache[key]) return pikSpriteCache[key];
    let rows;
    if (spId && PIK_SPECIES_TPLS[spId]) {
      rows = PIK_SPECIES_TPLS[spId];
    } else {
      const h = pikHueFromColor(color);
      const body = PIK_BODY_TPLS[(h * 7) % PIK_BODY_TPLS.length];
      const plant = PIK_PLANT_TPLS[(h * 13) % PIK_PLANT_TPLS.length][Math.min(stage || 0, 2)];
      rows = plant.concat(body);
    }
    const c = document.createElement('canvas');
    c.width = rows[0].length; c.height = rows.length;
    const x = c.getContext('2d');
    const pal = silhouette ? PIK_SIL_COLORS : {
      B: color.body, D: color.dark,
      W: 'rgba(255,255,255,0.55)', w: '#ffffff',
      e: '#14020e', u: 'rgba(255,120,180,0.65)',
      S: '#57c689', L: '#7ddba4', Y: '#ffd400', P: '#ff8fc7'
    };
    pikDrawTpl(x, rows, pal);
    pikSpriteCache[key] = c.toDataURL();
    return pikSpriteCache[key];
  }

  // richly saturated bloom clusters — the meadow should look like a party
  // soft pastel blooms — pretty scenery, never louder than the buddies
  // (the glowing pikmin must stay the stars of the meadow)
  const DECOR_COLORS = [
    { a: '#ffc9e4', b: '#ffe4f2' }, // powder pink
    { a: '#ddc9f7', b: '#efe4fd' }, // milky lilac
    { a: '#ffedb3', b: '#fff8dd' }, // custard gold
    { a: '#ffd4dd', b: '#ffeef2' }, // baby rose
    { a: '#c9e6ff', b: '#e8f5ff' }  // powder sky
  ];
  function drawBloom(x, cx, cy, col, big) {
    x.fillStyle = col.a; // pastel petals, no hard outline
    x.fillRect(cx - 1, cy - (big ? 2 : 1), 3, big ? 5 : 3);
    x.fillRect(cx - (big ? 2 : 1), cy - 1, big ? 5 : 3, 3);
    x.fillStyle = col.b; // milky highlights
    x.fillRect(cx - 1, cy - (big ? 2 : 1), 1, 1);
    x.fillRect(cx + 1, cy + 1, 1, 1);
    x.fillStyle = '#fffbe8'; // soft heart
    x.fillRect(cx, cy, 1, 1);
  }
  function decorSprite(variant) {
    const key = 'decor/' + variant;
    if (pikSpriteCache[key]) return pikSpriteCache[key];
    const c = document.createElement('canvas');
    c.width = 18; c.height = 16;
    const x = c.getContext('2d');
    const cols = [DECOR_COLORS[variant % DECOR_COLORS.length],
                  DECOR_COLORS[(variant + 2) % DECOR_COLORS.length],
                  DECOR_COLORS[(variant + 4) % DECOR_COLORS.length]];
    x.fillStyle = '#8fd4ae'; // soft stems
    x.fillRect(4, 8, 1, 8); x.fillRect(9, 6, 1, 10); x.fillRect(14, 9, 1, 7);
    x.fillStyle = '#b8e8cd'; // milky leaves
    x.fillRect(2, 11, 2, 1); x.fillRect(10, 9, 2, 1); x.fillRect(12, 12, 2, 1); x.fillRect(5, 13, 2, 1);
    drawBloom(x, 4, 5, cols[0], false);
    drawBloom(x, 9, 3, cols[1], true);   // tall showpiece in the middle
    drawBloom(x, 14, 6, cols[2], false);
    pikSpriteCache[key] = c.toDataURL();
    return pikSpriteCache[key];
  }

  function gardenPlantDecor() {
    if (GARDEN.planted || !liveStage) return;
    GARDEN.planted = true;
    // 18 clusters, mixed sizes and depths — full bloom, zero shy corners
    const spots = [2, 7, 12, 18, 24, 30, 36, 43, 50, 56, 62, 68, 74, 80, 85, 90, 94, 97];
    spots.forEach((pct, i) => {
      const f = document.createElement('img');
      f.src = decorSprite(i % 6);
      f.className = 'garden-sprite garden-decor';
      f.alt = '';
      const w = 34 + ((i * 11) % 22); // 34–54px clusters
      f.style.width = w + 'px';
      f.style.left = `calc(${pct}% - ${Math.round(w / 2)}px)`;
      f.style.bottom = (2 + ((i * 9) % 18)) + 'px';
      if (i % 3 === 2) f.style.zIndex = '4'; // some blooms in the front row
      liveStage.appendChild(f);
    });
  }

  function slimeStageX() {
    if (!liveStage || !slimeBody) return 0;
    const sr = liveStage.getBoundingClientRect();
    const pr = slimeBody.getBoundingClientRect();
    return pr.left + pr.width / 2 - sr.left;
  }

  function pikChirp() {
    playTone(1150 + Math.random() * 420, 'square', 0.06, 0, 0.018);
  }

  // pik speech bubbles are the slime bubble's colour NEGATIVE (see CSS),
  // so a tiny buddy can talk over any backdrop and still be seen
  const PIK_LINES = ['pik!', 'pik pik!', 'mi!!', 'pi~ ♪', 'pik ♡'];
  function pikSay(b, text, dur) {
    if (!liveStage || !b.el) return;
    if (b.bubbleEl) b.bubbleEl.remove();
    const s = document.createElement('span');
    s.className = 'pik-bubble';
    s.textContent = text;
    s.style.left = (b.x + 16) + 'px';
    s.style.bottom = ((parseFloat(b.el.style.bottom) || 8) + 46) + 'px';
    liveStage.appendChild(s);
    b.bubbleEl = s;
    setTimeout(() => { if (b.bubbleEl === s) b.bubbleEl = null; s.remove(); }, dur || 1500);
  }

  function gardenSpawnSprout() {
    if (!liveStage) return;
    const squadFull = GARDEN.buddies.length >= PIK_MAX;
    // pre-full: classic density · post-full: one polite sprout at a time (it waits in the deck)
    if (!squadFull && GARDEN.sprouts.length + GARDEN.buddies.length >= PIK_MAX + 1) return;
    if (squadFull && GARDEN.sprouts.length >= 1) return;
    const roll = pikRollSprout(); // same gacha as the desktop meadow
    if (!roll) return;            // deck complete — the garden rests ♡
    const chameleon = roll.type === 'chameleon';
    const species = roll.type === 'hidden' ? roll.sp : null;
    const hue = roll.type === 'normal' ? roll.hue : 5 + Math.floor(Math.random() * 355);
    const color = species ? species.body : hueColor(hue);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pik-sprout' + (species ? ' pik-sprout-hidden' : '');
    btn.setAttribute('aria-label', t('live.pluck'));
    const img = document.createElement('img');
    img.src = pikSprite(color, 0, species ? species.id : null);
    img.alt = '';
    img.style.width = '33px';
    // only the sprout's head pokes out of the meadow
    img.style.clipPath = 'inset(0 0 58% 0)';
    btn.appendChild(img);
    if (species) { // hidden sprouts glitter — pluck fast
      const tease = document.createElement('span');
      tease.className = 'pik-sprout-tease';
      tease.textContent = '✨';
      btn.appendChild(tease);
    }
    if (chameleon) { // even the sprout can't hold a colour
      btn._hueTimer = setInterval(() => { img.src = pikSprite(hueColor(hue + Date.now() / 14 % 360), 0); }, 420);
    }
    const stageW = liveStage.clientWidth || 500;
    const x = 30 + Math.random() * Math.max(60, stageW - 90);
    btn.style.left = x + 'px';
    btn.style.bottom = (2 + Math.random() * 12) + 'px';
    btn.addEventListener('click', () => gardenPluck(btn, hue, chameleon, species));
    liveStage.appendChild(btn);
    GARDEN.sprouts.push(btn);
  }

  // the squad roster outlives the tab: hues, stages, techniques —
  // wheel-born buddies keep their exact hue (and the chameleon its ✨identity✨)
  function pikSaveRoster() {
    store.set('yos-pik-roster', GARDEN.buddies.map((b) => (
      b.h != null
        ? { h: b.h, ch: b.ch ? 1 : 0, s: b.stage, k: b.skill ? b.skill.id : null, sp: b.sp ? b.sp.id : null }
        : { c: Math.max(0, PIK_COLORS.findIndex((pc) => pc.body === b.color.body)), s: b.stage, k: b.skill ? b.skill.id : null }
    )));
    if (typeof pikdexAbsorbStages === 'function') pikdexAbsorbStages();
  }

  function gardenMakeBuddy(color, stage, x, skillId, hue, ch, spId) {
    const species = spId ? pikSpecies(spId) : null;
    if (species) color = species.body;
    const el = document.createElement('div');
    el.className = 'pik-buddy' + (species && species.fx ? ' pikfx-' + species.fx : '');
    const img = document.createElement('img');
    img.src = pikSprite(color, stage, species ? species.id : null);
    img.alt = '';
    const gbKey = ch ? 'ch' : (species ? 's:' + species.id : (hue != null ? 'w:' + pikSegOfHue(hue) : null));
    const gbForm = gbKey && typeof pikFormOfKind === 'function' ? pikFormOfKind(gbKey) : 1;
    img.style.width = gbForm === 3 ? '46px' : gbForm === 2 ? '39px' : '33px';
    if (gbForm >= 2) el.classList.add('pik-form' + gbForm);
    el.appendChild(img);
    if (species) { // the hat performs live, too
      const hat = document.createElement('span');
      hat.className = 'pik-hat';
      hat.textContent = species.hat;
      el.appendChild(hat);
    }
    el.style.left = x + 'px';
    el.style.bottom = (4 + Math.random() * 10) + 'px';
    liveStage.appendChild(el);
    const b = {
      el, img, color, stage, x,
      h: hue != null ? hue : null, ch: ch ? 1 : 0, hueAt: 0, sp: species || null,
      born: Date.now() - (stage === 2 ? 120000 : stage === 1 ? 60000 : 0),
      offset: (GARDEN.buddies.length % 2 ? 1 : -1) * (72 + GARDEN.buddies.length * 26),
      carry: null, carryEl: null,
      skill: PIK_SKILLS.find((sk) => sk.id === skillId) || PIK_SKILLS[Math.floor(Math.random() * PIK_SKILLS.length)]
    };
    GARDEN.buddies.push(b);
    return b;
  }

  // returning visitors find their whole squad waiting in the meadow
  function gardenRestoreRoster(quiet) {
    if (GARDEN.buddies.length || GARDEN.restored) return;
    GARDEN.restored = true;
    const roster = store.get('yos-pik-roster', []);
    if (!roster.length) return;
    const stageW = liveStage.clientWidth || 500;
    roster.slice(0, PIK_MAX).forEach((r, i) => {
      gardenMakeBuddy((r.h != null && typeof hueColor === 'function') ? hueColor(r.h) : (PIK_COLORS[r.c] || PIK_COLORS[0]), r.s || 0, 60 + (i * (stageW - 120)) / Math.max(1, roster.length - 1 || 1), r.k, r.h != null ? r.h : null, !!r.ch, r.sp || null);
    });
    if (quiet) return; // squad swaps re-seat everyone without the reunion fanfare
    setTimeout(() => {
      GARDEN.buddies.forEach((b, i) => setTimeout(() => { pikChirp(); if (i === 0) pikSay(b, 'pik!! ♡', 1600); }, i * 140));
      if (!pet.sleeping && !pet.busy) showBubble(trT('the squad waited for you ALL this time ♡', "l'escouade t'a attendu TOUT ce temps ♡"), 2800);
    }, 900);
  }

  function gardenPluck(btn, hue, chameleon, species) {
    if (btn._hueTimer) clearInterval(btn._hueTimer);
    GARDEN.sprouts = GARDEN.sprouts.filter((s) => s !== btn);
    const x = parseFloat(btn.style.left) || 60;
    const bottom = parseFloat(btn.style.bottom) || 8;
    btn.remove();
    const color = species ? species.body : hueColor(hue);
    const entry = { h: hue, ch: chameleon ? 1 : 0, s: 0, k: PIK_SKILLS[Math.floor(Math.random() * PIK_SKILLS.length)].id, sp: species ? species.id : null };
    const verdict = pikdexAdd(entry); // deck first, stage second
    if (verdict === 'dup') {
      // duplicate catch: no new slot, but its KIND climbs toward evolution
      playSparkleSound(); pikChirp();
      const kk = pikKindKey(entry);
      const cnt = pikCounts()[kk] || 1;
      const th = pikThresholds(kk);
      const nxt = cnt >= th[1] ? null : (cnt >= th[0] ? th[1] : th[0]);
      showBubble(nxt
        ? trT(`+1 of that kind!! ${cnt}/${nxt} toward its next form ♡`, `+1 de cette espèce !! ${cnt}/${nxt} vers sa prochaine forme ♡`)
        : trT('+1 for an APEX legend — pure leaderboard fuel ♡', '+1 pour une légende APEX — pur carburant de classement ♡'), 2600);
      gainFollowers(1);
      return;
    }
    store.set('yos-pik-plucked', true);
    if (typeof updateLiveTab === 'function') updateLiveTab();
    playSparkleSound();
    if (chameleon) {
      achvUnlock('chameleon');
      chameleonCelebrate(); // 1% pull — rainbow blooms over the whole desktop
      showBubble(trT('WAIT. that one keeps CHANGING COLOURS?! a hidden chameleon!! (1% pull!!)', 'ATTENDS. il n\'arrête pas de CHANGER DE COULEUR ?! un caméléon caché !! (tirage à 1 % !!)'), 3600);
    } else if (species) {
      pikHiddenCelebrate(species);
    }
    if (verdict === 'deck') {
      pikChirp();
      if (!chameleon && !species) showBubble(trT('squad\'s full — the new buddy is filed in pikdex.exe, awaiting promotion ♡', 'escouade pleine — le nouveau copain est classé dans pikdex.exe, en attente de promotion ♡'), 2800);
      return;
    }
    const b = gardenMakeBuddy(color, 0, x, entry.k, hue, chameleon ? 1 : 0, species ? species.id : null);
    b.born = Date.now();
    b.el.style.bottom = bottom + 'px';
    b.img.classList.add('pik-pluck');
    // the desktop crew mirrors the squad: a stage recruit walks home too
    // (the walker layer is hidden while the live room is open — it will
    // simply be there, already strolling, when the curtain drops)
    if (typeof deskPikResync === 'function') deskPikResync();
    pikChirp(); pikChirp();
    pikSay(b, 'pik!!', 1700); // first words, always
    gainFollowers(1);
    if (GARDEN.buddies.length === 1) {
      showBubble(trT('a petal buddy!! welcome to the crew ♡', 'un copain pétale !! bienvenue dans la troupe ♡'), 2600);
    } else if (GARDEN.buddies.length === PIK_MAX) {
      showBubble(trT('FULL PETAL SQUAD. we are unstoppable', 'ESCOUADE PÉTALE COMPLÈTE. rien ne nous arrête'), 2600);
    }
  }

  function pikSetStage(b, stage) {
    b.stage = stage;
    b.img.src = pikSprite(b.color, stage, b.sp ? b.sp.id : null);
    b.img.classList.remove('pik-pluck');
    void b.img.offsetWidth;
    b.img.classList.add('pik-pluck');
    pikChirp();
    pikSay(b, stage === 2 ? 'pik~!! ♡' : 'pik~', 1500);
    pikSaveRoster();
    if (stage === 2 && Math.random() < 0.6) {
      showBubble(trT('one of my buddies BLOOMED!! so proud', "un de mes copains a FLEURI !! trop fier"), 2400);
    }
  }

  function gardenTick() {
    if (!liveOpen || !liveStage) return;
    const now = Date.now();
    if (now > GARDEN.nextSprout) {
      gardenSpawnSprout();
      GARDEN.nextSprout = now + 7000 + Math.random() * 8000;
    }
    const sx = slimeStageX();
    const gathering = now < GARDEN.gatherUntil;
    const slimeW = slimeBody ? slimeBody.getBoundingClientRect().width : 0;
    GARDEN.buddies.forEach((b) => {
      // bloom: leaf → bud → flower, pikmin-style maturity
      if (b.stage === 0 && now - b.born > 45000) pikSetStage(b, 1);
      else if (b.stage === 1 && now - b.born > 105000) pikSetStage(b, 2);
      // the chameleon cycles the wheel on stage too — commitment issues, adorable
      if (b.ch && now > (b.hueAt || 0)) {
        b.hueAt = now + 480;
        b.h = ((b.h || 5) + 30) % 360 || 5;
        b.color = hueColor(b.h);
        b.img.src = pikSprite(b.color, b.stage);
      }
      // SQUASHED?! the slime (re)appeared on top — wriggle out, loudly
      if (!b.carry && !gathering && slimeW > 40 && Math.abs(b.x + 16 - sx) < slimeW * 0.32 && now > (b.escapeCd || 0)) {
        b.escapeCd = now + 6000;
        b.escapeUntil = now + 950;
        b.escapeTo = sx + (b.x + 16 < sx ? -1 : 1) * (slimeW * 0.55 + 26 + Math.random() * 34);
        b.el.classList.add('escaping');
        setTimeout(() => b.el.classList.remove('escaping'), 620);
        pikSay(b, 'pik!! pik!!', 1500);
        pikChirp(); setTimeout(pikChirp, 110); setTimeout(pikChirp, 240);
      }
      const escaping = b.escapeUntil && now < b.escapeUntil;
      let target = sx + b.offset;
      if (!b.carry && b.visitUntil && now < b.visitUntil) target = b.visitX; // invited somewhere (guests, boxes, bugs)
      if (b.carry) {
        // deliver to the slime's SIDE, never underneath — the courier
        // must stay visible for its big moment
        const side = (b.x + 16 < sx) ? -1 : 1;
        target = sx + side * Math.max(46, slimeW * 0.55 + 6);
      } else if (gathering) {
        target = sx + b.offset * 0.2;
      }
      if (escaping) target = b.escapeTo;
      b.el.classList.toggle('gift-run', !!b.carry);
      const speed = escaping ? 7 : (b.stage === 2 ? 3.4 : b.stage === 1 ? 2.6 : 2.0) * (b.carry ? 1.4 : 1);
      const dx = target - b.x;
      if (Math.abs(dx) > 6) {
        b.x += Math.sign(dx) * Math.min(Math.abs(dx), speed);
        b.el.classList.add('walking');
        b.el.style.left = b.x + 'px';
        b.img.style.transform = dx < 0 ? 'scaleX(-1)' : '';
      } else {
        b.el.classList.remove('walking');
        if (b.carry) { // delivery!!
          burstAtSlime(['♥', b.carry], 3);
          pikChirp();
          if (b.carryEl) { b.carryEl.remove(); b.carryEl = null; }
          b.carry = null;
        } else if (!gathering && Math.random() < 0.006) {
          pikChirp(); // idle squeak
          if (Math.random() < 0.55) pikSay(b, PIK_LINES[Math.floor(Math.random() * PIK_LINES.length)], 1300);
        }
      }
    });
    // a sleeping streamer may wander off mid-broadcast (dark mode)
    if (pet.sleeping && resolvedTheme() === 'dark' && !sleepwalkActive && Math.random() < 0.0011) {
      startSleepwalk();
    }
    if (GARDEN.buddies.length >= 3 && Math.random() < 0.0012 && !pet.busy) {
      showBubble(trT('look at my little petal army ♡', 'regarde ma petite armée de pétales ♡'), 2400);
    }
  }

  function gardenStart() {
    gardenPlantDecor();
    gardenRestoreRoster();
    if (!GARDEN.timer) GARDEN.timer = setInterval(gardenTick, 90);
    if (!GARDEN.nextSprout) GARDEN.nextSprout = Date.now() + 2500;
  }

  function gardenStop() {
    if (GARDEN.timer) { clearInterval(GARDEN.timer); GARDEN.timer = null; }
  }

  /* ---------- Edmonton weather paints the stage ----------
     One free Open-Meteo call (cached 15 min) → a hand-pixelled sky:
     shaded sprite clouds, a beaming sun (or moon + stars), lightning
     bolts, drifting fog banks — all little canvases, zero images. */
  const WX_KINDS = ['clear', 'cloud', 'rain', 'snow', 'fog', 'thunder', 'wind', 'hail', 'sleet', 'dust', 'heat', 'blizzard', 'hurricane'];

  /* every sky comes with its soundtrack (Yongshan's 21-track pack) —
     one looping ambience per weather, variants picked at random */
  const WX_SFX = {
    clear: ['assets/wx/01_clear_sunny.mp3'],
    cloud: ['assets/wx/02_partly_cloudy.mp3', 'assets/wx/03_cloudy_overcast.mp3'],
    rain: ['assets/wx/07_drizzle.mp3', 'assets/wx/08_steady_rain.mp3', 'assets/wx/09_heavy_rain.mp3', 'assets/wx/10_rain_shower.mp3', 'assets/wx/11_rain_wind.mp3'],
    snow: ['assets/wx/15_snow.mp3'],
    fog: ['assets/wx/04_fog_mist_haze.mp3'],
    thunder: ['assets/wx/12_distant_thunder.mp3', 'assets/wx/13_thunderstorm.mp3', 'assets/wx/14_lightning_thunderclap.mp3'],
    wind: ['assets/wx/05_light_wind.mp3', 'assets/wx/06_strong_wind_gale.mp3'],
    hail: ['assets/wx/17_hail.mp3'],
    sleet: ['assets/wx/18_sleet_freezing_rain.mp3'],
    dust: ['assets/wx/19_sand_dust_storm.mp3'],
    heat: ['assets/wx/20_heatwave.mp3'],
    blizzard: ['assets/wx/16_blizzard.mp3'],
    hurricane: ['assets/wx/21_hurricane_extreme_storm.mp3']
  };
  var wxAudioEl = null;
  try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) { /* older WebKit */ }
  function wxSfx(kind) {
    if (!wxAudioEl) { wxAudioEl = new Audio(); wxAudioEl.loop = true; }
    const list = WX_SFX[kind];
    if (!list || !liveOpen || !soundEnabled) { try { wxAudioEl.pause(); } catch (e) {} return; }
    wxAudioEl.src = list[Math.floor(Math.random() * list.length)];
    const wxCoarse = window.matchMedia('(pointer: coarse)').matches; // phones: whisper, not noise
    wxAudioEl.volume = (resolvedTheme() === 'dark' ? 0.06 : 0.13) * (wxCoarse ? 0.3 : 1) * (window.__vibeOn ? 0.15 : 1);
    if (!document.hidden && document.hasFocus()) wxAudioEl.play().catch(() => { /* pre-gesture */ });
  }
  function wxSfxStop() { if (wxAudioEl) { try { wxAudioEl.pause(); } catch (e) {} } }
  var wxAnnounced = null, wxCurrent = null, wxRefreshTimer = null;
  const wxSpriteCache = {};

  function wxSprite(kind) {
    if (wxSpriteCache[kind]) return wxSpriteCache[kind];
    const c = document.createElement('canvas');
    const x = c.getContext('2d');
    const px = (color, dots) => { x.fillStyle = color; dots.forEach(([dx, dy, w, h]) => x.fillRect(dx, dy, w || 1, h || 1)); };
    if (kind === 'cloud' || kind === 'raincloud') {
      c.width = 26; c.height = 13;
      const rows = [[9, 8], [7, 12], [6, 14], [4, 18], [3, 21], [2, 22], [2, 22], [3, 20]];
      const line = kind === 'cloud' ? '#d8c4f5' : '#b49ade';
      const body = kind === 'cloud' ? '#ffffff' : '#efe6fb';
      const belly = kind === 'cloud' ? '#e9dcfa' : '#cdb9ee';
      // silhouette pass in outline colour, nudged in 4 directions
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([ox, oy]) => {
        x.fillStyle = line;
        rows.forEach(([rx, rw], i) => x.fillRect(rx + ox, i + 2 + oy, rw, 1));
      });
      rows.forEach(([rx, rw], i) => {
        x.fillStyle = i >= 6 ? belly : body;
        x.fillRect(rx, i + 2, rw, 1);
      });
      px('#ffffff', [[6, 4, 4, 1], [5, 5, 3, 1]]); // fluffy highlight
    } else if (kind === 'sun') {
      c.width = 19; c.height = 19;
      const rows = [[7, 5], [6, 7], [5, 9], [5, 9], [5, 9], [6, 7], [7, 5]];
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([ox, oy]) => {
        x.fillStyle = '#f0b429';
        rows.forEach(([rx, rw], i) => x.fillRect(rx + ox, i + 6 + oy, rw, 1));
      });
      rows.forEach(([rx, rw], i) => { x.fillStyle = '#ffd97a'; x.fillRect(rx, i + 6, rw, 1); });
      px('#ffe98a', [[7, 7, 3, 2], [6, 8, 2, 2]]); // inner glow
      px('#f0b429', [[9, 1, 1, 3], [9, 15, 1, 3], [1, 9, 3, 1], [15, 9, 3, 1]]); // long rays
      px('#ffd97a', [[3, 3, 2, 2], [14, 3, 2, 2], [3, 14, 2, 2], [14, 14, 2, 2]]); // corner rays
    } else if (kind === 'moon') {
      c.width = 16; c.height = 16;
      x.fillStyle = '#ffe9b8';
      x.beginPath(); x.arc(8, 8, 6.5, 0, 6.3); x.fill();
      x.globalCompositeOperation = 'destination-out';
      x.beginPath(); x.arc(11, 6, 5.2, 0, 6.3); x.fill();
      x.globalCompositeOperation = 'source-over';
      px('#f7d489', [[4, 11], [6, 13], [3, 8]]); // craters on the lit rim
    } else if (kind === 'star') {
      c.width = 5; c.height = 5;
      px('#fff7d1', [[2, 0], [0, 2], [2, 2], [4, 2], [2, 4]]);
      px('#ffd97a', [[1, 1], [3, 1], [1, 3], [3, 3]]);
    } else if (kind === 'bolt') {
      c.width = 9; c.height = 14;
      px('#f0b429', [[4, 0, 4, 1], [3, 1, 4, 1], [2, 3, 4, 1], [1, 5, 5, 1], [3, 7, 3, 1], [2, 9, 3, 1], [1, 11, 3, 1], [0, 13, 2, 1]]);
      px('#fff3c4', [[4, 1, 2, 1], [3, 3, 2, 1], [2, 5, 3, 1], [3, 8, 2, 1], [2, 10, 2, 1]]);
      px('#f0b429', [[3, 2, 4, 1], [2, 4, 4, 1], [3, 6, 3, 1], [2, 8, 3, 1], [1, 10, 3, 1], [1, 12, 2, 1]]);
    } else if (kind === 'leaf') {
      c.width = 9; c.height = 7;
      px('#8fd4ae', [[2, 2, 5, 3], [3, 1, 3, 1], [3, 5, 3, 1]]);
      px('#57c689', [[4, 2, 1, 3], [7, 3, 2, 1]]); // vein + stem
      px('#b8e8cd', [[3, 2, 1, 1]]);
    } else if (kind === 'fog') {
      c.width = 46; c.height = 7;
      x.fillStyle = 'rgba(255,255,255,0.55)';
      x.fillRect(3, 2, 40, 3);
      x.fillRect(0, 3, 46, 1);
      x.fillStyle = 'rgba(255,255,255,0.8)';
      x.fillRect(8, 3, 14, 1); x.fillRect(28, 2, 10, 1);
      x.fillStyle = 'rgba(233,220,250,0.5)';
      x.fillRect(5, 5, 34, 1);
    }
    wxSpriteCache[kind] = c.toDataURL();
    return wxSpriteCache[kind];
  }

  function wxDecor(kind) {
    if (!liveStage) return;
    liveStage.querySelectorAll('.wx-sprite').forEach((el) => el.remove());
    const dark = resolvedTheme() === 'dark';
    const add = (spr, w, l, t, cls) => {
      const im = document.createElement('img');
      im.src = wxSprite(spr);
      im.className = 'wx-sprite' + (cls ? ' ' + cls : '');
      im.alt = '';
      im.style.width = w + 'px';
      im.style.left = l;
      im.style.top = t;
      liveStage.appendChild(im);
    };
    if (kind === 'clear') {
      if (dark) {
        add('moon', 58, '83%', '7%', 'wx-bob-a');
        [['16%', '18%'], ['34%', '9%'], ['55%', '22%'], ['70%', '12%'], ['26%', '34%'], ['90%', '30%']].forEach(([l, t], i) => add('star', 11 + (i % 3) * 3, l, t, i % 2 ? 'wx-twinkle-a' : 'wx-twinkle-b'));
      } else {
        add('sun', 74, '83%', '6%', 'wx-bob-a');
        add('cloud', 62, '12%', '20%', 'wx-drift-a'); // one lazy fair-weather puff
      }
    } else if (kind === 'cloud') {
      add('cloud', 112, '9%', '7%', 'wx-drift-a');
      add('cloud', 78, '48%', '17%', 'wx-drift-b');
      add('cloud', 96, '72%', '5%', 'wx-drift-a');
      add('cloud', 58, '33%', '28%', 'wx-drift-b');
      if (!dark) add('sun', 46, '91%', '3%', 'wx-bob-a'); // peeking through
      else add('moon', 40, '91%', '4%', 'wx-bob-a');
    } else if (kind === 'rain' || kind === 'thunder') {
      add('raincloud', 118, '8%', '5%', 'wx-drift-b');
      add('raincloud', 92, '42%', '12%', 'wx-drift-a');
      add('raincloud', 108, '72%', '4%', 'wx-drift-b');
      if (kind === 'thunder') {
        add('bolt', 24, '24%', '24%', 'wx-bolt-a');
        add('bolt', 18, '81%', '20%', 'wx-bolt-b');
      }
    } else if (kind === 'snow') {
      add('cloud', 104, '14%', '6%', 'wx-drift-a');
      add('cloud', 82, '58%', '12%', 'wx-drift-b');
      add('cloud', 66, '84%', '7%', 'wx-drift-a');
    } else if (kind === 'fog') {
      add('fog', 230, '4%', '28%', 'wx-fog-a');
      add('fog', 280, '34%', '50%', 'wx-fog-b');
      add('fog', 210, '16%', '70%', 'wx-fog-a');
      add('fog', 250, '52%', '14%', 'wx-fog-b');
    } else if (kind === 'wind') {
      add('cloud', 84, '18%', '10%', 'wx-drift-b');
      add('leaf', 18, '10%', '34%', 'wx-blow-a');
      add('leaf', 14, '38%', '52%', 'wx-blow-b');
      add('leaf', 16, '64%', '26%', 'wx-blow-a');
      add('leaf', 12, '80%', '58%', 'wx-blow-b');
    } else if (kind === 'hail' || kind === 'sleet') {
      add('raincloud', 112, '12%', '5%', 'wx-drift-a');
      add('raincloud', 90, '58%', '9%', 'wx-drift-b');
    } else if (kind === 'dust') {
      add('fog', 240, '8%', '36%', 'wx-blow-a');
      add('fog', 260, '30%', '58%', 'wx-blow-b');
    } else if (kind === 'heat') {
      add('sun', 92, '78%', '5%', 'wx-bob-a'); // an OPPRESSIVE sun
    } else if (kind === 'blizzard') {
      add('cloud', 116, '8%', '4%', 'wx-drift-b');
      add('cloud', 96, '44%', '9%', 'wx-drift-a');
      add('cloud', 104, '74%', '5%', 'wx-drift-b');
    } else if (kind === 'hurricane') {
      add('raincloud', 124, '6%', '4%', 'wx-blow-a');
      add('raincloud', 104, '40%', '10%', 'wx-blow-b');
      add('raincloud', 118, '70%', '5%', 'wx-blow-a');
      add('leaf', 16, '30%', '40%', 'wx-blow-b');
      add('leaf', 13, '62%', '30%', 'wx-blow-a');
    }
  }
  const WX_LINES = {
    clear:   ['Edmonton says: SUNSHINE!! free lighting arc ♡', 'Edmonton annonce : SOLEIL !! arc lumineux gratuit ♡'],
    cloud:   ['Edmonton says: clouds today. cozy pixel weather', 'Edmonton annonce : nuages. météo pixel cosy'],
    rain:    ["it's RAINING in Edmonton!! blanket-stream time", 'il PLEUT à Edmonton !! stream sous couverture'],
    snow:    ['SNOW in Edmonton!! sweater weather on stage ♡', 'NEIGE à Edmonton !! mode pull sur le plateau ♡'],
    fog:     ['Edmonton is foggy… mysterious streamer era', 'Edmonton dans le brouillard… ère streameuse mystérieuse'],
    thunder: ['THUNDER over Edmonton!! dramatic lighting, no extra charge', 'TONNERRE sur Edmonton !! éclairage dramatique, sans supplément']
  };
  function applyWx(kind) {
    if (!liveStage || WX_KINDS.indexOf(kind) === -1) return;
    WX_KINDS.forEach((k) => liveStage.classList.remove('wx-' + k));
    liveStage.classList.add('wx-' + kind);
    wxCurrent = kind;
    wxDecor(kind);
    wxSfx(kind);
    if (liveOpen && wxAnnounced !== kind) {
      wxAnnounced = kind;
      setTimeout(() => {
        if (liveOpen && !pet.sleeping && !pet.busy) showBubble(trT(WX_LINES[kind][0], WX_LINES[kind][1]), 3000);
      }, 4200);
    }
  }
  /* ---------- the Canada geese of Edmonton ----------
     Whenever it isn't raining or snowing, honking V-formations
     commute across the pixel sky. This is not decoration; this
     is meteorological realism. */
  var gooseTimer = null;

  /* real Canada goose calls — an 8-track honk library: Yongshan's
     five picks (SoundBible + Pixabay community; b trimmed to 20s
     with fades) PLUS the three xeno-canto field recordings
     (XC388771 / XC62259 / XC178135 via Wikimedia, CC BY-SA 3.0).
     One random track per flock, volume enveloped to the crossing.
     Short clips loop under the envelope; long ones contribute a
     random segment, never the whole file. */
  const GOOSE_CALLS = [
    { src: 'assets/goose_a.mp3', dur: 1.6 },
    { src: 'assets/goose_b.mp3', dur: 20 },
    { src: 'assets/goose_c.mp3', dur: 5.4 },
    { src: 'assets/goose_d.mp3', dur: 30 },
    { src: 'assets/goose_e.mp3', dur: 30 },
    { src: 'assets/goose_f.mp3', dur: 15 },
    { src: 'assets/goose_g.mp3', dur: 37 },
    { src: 'assets/goose_h.mp3', dur: 22 }
  ];
  var gooseAudioEl = null, gooseFadeTimer = null;
  function gooseCallPlay() {
    if (!soundEnabled || document.hidden || !document.hasFocus()) return;
    const pick = GOOSE_CALLS[Math.floor(Math.random() * GOOSE_CALLS.length)];
    if (!gooseAudioEl) { gooseAudioEl = new Audio(); gooseAudioEl.preload = 'auto'; }
    const a = gooseAudioEl;
    try { a.pause(); } catch (e) { /* fresh start */ }
    if (gooseFadeTimer) clearInterval(gooseFadeTimer);
    a.src = pick.src;
    // long files: random segment, never the whole thing.
    // short honks: loop quietly under the envelope instead.
    const looping = pick.dur < 14;
    a.loop = looping;
    const seg = looping ? 24 : Math.min(pick.dur, 27);
    const startAt = (!looping && pick.dur > seg) ? Math.random() * (pick.dur - seg) : 0;
    const peak = (resolvedTheme() === 'dark') ? 0.07 : 0.55; // night honks are a whisper
    try { a.currentTime = startAt; } catch (e) { /* not seekable yet */ }
    a.volume = 0;
    a.play().catch(() => { /* autoplay gate — geese stay polite */ });
    const t0 = Date.now();
    const FADE_IN = 4500;
    const TOTAL = seg * 1000;
    const HOLD_END = Math.max(FADE_IN + 2000, TOTAL - 8000);
    gooseFadeTimer = setInterval(() => {
      const el = Date.now() - t0;
      if (document.hidden || !document.hasFocus()) a.volume = 0; // away = silent
      else if (el < FADE_IN) a.volume = peak * (el / FADE_IN);
      else if (el < HOLD_END) a.volume = peak;
      else a.volume = Math.max(0, peak * (1 - (el - HOLD_END) / (TOTAL - HOLD_END)));
      if (el >= TOTAL) {
        clearInterval(gooseFadeTimer);
        gooseFadeTimer = null;
        try { a.pause(); } catch (e) { /* done anyway */ }
      }
    }, 120);
  }
  function gooseCallStop() {
    if (gooseFadeTimer) { clearInterval(gooseFadeTimer); gooseFadeTimer = null; }
    if (gooseAudioEl) { try { gooseAudioEl.pause(); } catch (e) { /* already */ } }
  }

  function gooseSprite() {
    const night = resolvedTheme() === 'dark';
    const key = night ? 'goose-night' : 'goose';
    if (wxSpriteCache[key]) return wxSpriteCache[key];
    const c = document.createElement('canvas');
    c.width = 14; c.height = night ? 12 : 9;
    const x = c.getContext('2d');
    const oy = night ? 3 : 0; // room for the nightcap
    x.fillStyle = night ? '#4a4066' : '#7a6a55'; // body (moonlit at night)
    x.fillRect(2, 4 + oy, 7, 3);
    x.fillStyle = night ? '#3a3154' : '#5d5040'; // folded wing
    x.fillRect(3, 3 + oy, 5, 2);
    x.fillStyle = night ? '#c9c2e8' : '#f4efe6'; // belly
    x.fillRect(3, 7 + oy, 5, 1);
    x.fillStyle = '#14020e'; // tail, neck, head
    x.fillRect(0, 4 + oy, 2, 2);
    x.fillRect(9, 2 + oy, 2, 4);
    x.fillRect(10, 0 + oy, 3, 3);
    x.fillStyle = '#ffffff'; // the famous chin strap
    x.fillRect(10, 2 + oy, 2, 1);
    x.fillStyle = '#c9a44a'; // beak
    x.fillRect(13, 1 + oy, 1, 1);
    if (night) { // off-duty geese wear tiny nightcaps. obviously.
      x.fillStyle = '#f0509f';
      x.fillRect(10, 1, 3, 2);
      x.fillRect(9, 0, 2, 2);
      x.fillStyle = '#ffffff';
      x.fillRect(8, 0, 1, 1); // pompom
    }
    wxSpriteCache[key] = c.toDataURL();
    return wxSpriteCache[key];
  }

  function spawnGeese() {
    if (!liveStage || !liveOpen) return;
    if (['rain', 'snow', 'thunder'].indexOf(wxCurrent) !== -1) return; // geese have standards
    const flock = document.createElement('div');
    flock.className = 'wx-geese';
    flock.setAttribute('aria-hidden', 'true');
    const rightward = Math.random() < 0.5;
    const family = Math.random() < 0.45; // parents take the kids out sometimes
    const addGoose = (leftPx, topPx, sizePx) => {
      const g = document.createElement('img');
      g.src = gooseSprite();
      g.alt = '';
      g.style.width = sizePx + 'px';
      g.style.left = leftPx + 'px';
      g.style.top = topPx + 'px';
      if (!rightward) g.style.transform = 'scaleX(-1)';
      flock.appendChild(g);
    };
    if (family) {
      // one proud parent, 2-4 goslings paddling in a line behind
      const kids = 2 + Math.floor(Math.random() * 3);
      addGoose(0, 0, 26);
      for (let i = 1; i <= kids; i++) addGoose((rightward ? -1 : 1) * (24 + i * 17), 3, 13);
    } else {
      // the classic V, gliding on the water
      const n = 5 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const rank = Math.ceil(i / 2);
        const side = i % 2 ? 1 : -1;
        addGoose((rightward ? -1 : 1) * rank * 22, rank * side * 9, 26 - rank * 2);
      }
    }
    // they float low, on the blue "water" bands of the pixel sky —
    // dead-level, serene, zero flapping (they're swimming, obviously)
    const w = liveStage.clientWidth || 600;
    flock.style.top = (52 + Math.random() * 16) + '%';
    flock.style.left = rightward ? '-110px' : (w + 60) + 'px';
    liveStage.appendChild(flock);
    void flock.offsetWidth; // commit the start position before gliding
    flock.style.transform = `translateX(${rightward ? w + 220 : -(w + 220)}px)`;
    setTimeout(() => flock.remove(), 38000);
    // REAL honks: a field recording swells in as the flock arrives
    // and fades as they paddle off (quiet at night, proud by day)
    gooseCallPlay();
    const dark = resolvedTheme() === 'dark';
    if (dark && Math.random() < 0.5 && !pet.sleeping && !pet.busy) {
      showBubble(trT('night geese… they only honk in lowercase. very polite ♡', 'bernaches de nuit… elles ne klaxonnent qu\'en minuscules. très polies ♡'), 2800);
    } else if (Math.random() < 0.25 && !pet.sleeping && !pet.busy) {
      showBubble(trT('CANADA GEESE!! the true landlords of Edmonton ♡', 'des BERNACHES !! les vraies proprios d\'Edmonton ♡'), 2600);
    }
  }

  function gooseLoop() {
    if (gooseTimer) clearTimeout(gooseTimer);
    gooseTimer = setTimeout(() => {
      if (liveOpen) spawnGeese();
      gooseLoop();
    }, 20000 + Math.random() * 35000);
  }

  function liveWeather() {
    const cached = store.get('yos-wx', null);
    if (cached && Date.now() - cached.t < 55000) { applyWx(cached.k); return; } // <1min: the sky is basically live
    fetch('https://api.open-meteo.com/v1/forecast?latitude=53.55&longitude=-113.49&current=weather_code,wind_speed_10m,temperature_2m')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !d.current) return;
        const c = Number(d.current.weather_code);
        const wind = Number(d.current.wind_speed_10m) || 0;
        const temp = Number(d.current.temperature_2m);
        const k = c >= 95 ? 'thunder'
          : c === 77 ? 'hail'
          : c === 86 ? 'blizzard'
          : ((c >= 71 && c <= 75) || c === 85) ? 'snow'
          : (c === 56 || c === 57 || c === 66 || c === 67) ? 'sleet'
          : ((c >= 51 && c <= 65) || (c >= 80 && c <= 82)) ? 'rain'
          : (c === 45 || c === 48) ? 'fog'
          : wind >= 62 ? 'hurricane'
          : wind >= 30 ? 'wind'
          : (c === 0 && temp >= 29) ? 'heat'
          : (c >= 1 && c <= 3) ? 'cloud' : 'clear';
        store.set('yos-wx', { t: Date.now(), k });
        applyWx(k);
      })
      .catch(() => { /* offline — the default pastel sky stays up */ });
  }

  /* ---------- gifts ---------- */
  /* ============ GIFT CHOREOGRAPHY ENGINE ============
     every emoji belongs to a TROUPE with its own stage act. MEGA spells
     still outrank everything; these acts make sure no gift lands flat. */
  function giftStageItem(cls, txt, leftPx, bottomPx) {
    if (!liveStage) return null;
    const s = document.createElement('span');
    s.className = cls;
    s.textContent = txt;
    s.style.left = leftPx + 'px';
    if (bottomPx != null) s.style.bottom = bottomPx + 'px';
    liveStage.appendChild(s);
    return s;
  }
  function giftActFood(e) {
    if (!liveOpen || !liveStage) return;
    const w = liveStage.clientWidth || 500;
    const sx = slimeStageX();
    const fx = Math.max(50, Math.min(w - 70, sx + (Math.random() < 0.5 ? -1 : 1) * (80 + Math.random() * 50)));
    const item = giftStageItem('gift-snack', e, fx, 12);
    if (!item) return;
    const baseX = sx - slimePosition.x;
    setTimeout(() => {
      if (typeof moveSlime === 'function') moveSlime({ action: 'goto', mood: trT('snack radar', 'radar à snack'), target: { x: fx - baseX, y: slimePosition.y }, duration: 700, scheduleNext: false });
    }, 300);
    setTimeout(() => {
      if (typeof moveSlime === 'function') moveSlime({ action: 'eat', mood: trT('nom', 'miam'), duration: 900, distance: 0 });
      item.classList.add('is-eaten');
      setTimeout(() => item.remove(), 600);
      burstAtSlime(['✦', '♥', e], 4);
      const SIP = ['☕', '🍵', '🧋'];
      showBubble(SIP.indexOf(e) !== -1
        ? trT(e + ' sip… sip… (respectful slurping) ♡', e + ' sip… sip… (slurp respectueux) ♡')
        : trT(e + ' nom nom nom. crumbs? WHAT crumbs', e + ' miam miam. des miettes ? QUELLES miettes'), 2600);
      pikChirp();
    }, 1250);
  }
  function giftActCritter(e) {
    if (!liveOpen || !liveStage) return;
    const w = liveStage.clientWidth || 500;
    const rt = Math.random() < 0.5;
    // THEATRICAL entrance: the guest pops in a fifth of the way ON-stage
    // (dust puff, chirp), then crosses under its own JS-driven power —
    // zero reliance on CSS transitions, impossible to miss
    const startX = rt ? Math.round(w * 0.18) : Math.round(w * 0.82);
    const c = giftStageItem('gift-critter is-arriving' + (e === '🐌' ? ' is-slowpoke' : ''), e, startX, 10);
    if (!c) return;
    if (!rt) c.style.setProperty('--flip', '-1');
    for (let i = 0; i < 4; i++) setTimeout(() => spawnParticle(startX + (Math.random() - 0.5) * 34, (liveStage.clientHeight || 300) - 34, '💨'), i * 70);
    pikChirp();
    setTimeout(() => c.classList.remove('is-arriving'), 600);
    const spd = e === '🐌' ? 0.5 : e === '🦋' ? 1.5 : 2.4; // px per 50ms tick
    const baseBottom = 10;
    let x = startX, tt = 0;
    const iv = setInterval(() => {
      if (!liveOpen || !c.isConnected) { clearInterval(iv); c.remove(); return; }
      tt++;
      x += (rt ? 1 : -1) * spd;
      c.style.left = x + 'px';
      if (e === '🦋') c.style.bottom = (baseBottom + 36 + Math.sin(tt / 6) * 32) + 'px'; // REAL swoops
      else if (e === '🐌' && tt % 22 === 0) { const dot = giftStageItem('gift-snailtrail', '·', x - (rt ? 16 : -16), baseBottom + 4); if (dot) setTimeout(() => dot.remove(), 7000); }
      if (x < -60 || x > w + 60 || tt > 800) { clearInterval(iv); c.style.opacity = '0'; setTimeout(() => c.remove(), 600); }
    }, 50);
    const fan = GARDEN.buddies.find((b) => !b.carry);
    if (fan) { fan.visitX = Math.max(20, Math.min(w - 40, startX + (rt ? 60 : -60))); fan.visitUntil = Date.now() + 4200; setTimeout(() => pikSay(fan, 'pik?!', 1400), 700); }
    const SQUEAK = { '🦆': 'quack', '🪿': 'HONK', '🐸': 'ribbit', '🐱': 'mew', '🐶': 'wan!', '🐝': 'bzzz', '🐧': 'noot noot', '🐌': '(…moving. technically.)', '🦄': '✨neigh✨', '🐢': '(unhurried)', '🐰': 'boing', '🦋': '(silent elegance)', '🐙': 'blub', '🐹': 'squeak', '🦩': '(one leg. always.)' };
    setTimeout(() => { if (liveOpen && !pet.sleeping) showBubble(trT('a wild ' + e + ' joined the stream!! (' + (SQUEAK[e] || 'hello') + ')', 'un ' + e + ' sauvage rejoint le stream !! (' + (SQUEAK[e] || 'coucou') + ')'), 2400); }, 900);
  }
    function giftActCrown(e) {
    if (!liveOpen || !slimeBody) return;
    if (slimeBody.querySelector('.gift-crown')) return;
    const cr = document.createElement('span');
    cr.className = 'gift-crown';
    cr.textContent = '👑';
    slimeBody.appendChild(cr);
    burstAtSlime(['👑', '✦'], 6);
    showBubble(trT('CROWNED. this stream is now a MONARCHY (a cute one) ♡', 'COURONNÉ. ce stream est désormais une MONARCHIE (mignonne) ♡'), 2800);
    setTimeout(() => { cr.classList.add('is-leaving'); setTimeout(() => cr.remove(), 600); }, 20000);
  }
  function giftActDisco(e) {
    if (!liveOpen || !liveStage) return;
    liveStage.classList.add('gift-disco');
    fxOrbit('🪩', 6);
    if (typeof moveSlime === 'function') moveSlime({ action: 'flip', mood: 'disco', duration: 800 });
    showBubble(trT('DISCO MODE. the FPS counter is dancing too', 'MODE DISCO. même le compteur FPS danse'), 2600);
    setTimeout(() => liveStage.classList.remove('gift-disco'), 4500);
  }
  function giftActGems(e) {
    if (!liveOpen || !liveStage) return;
    fxRain(['💎', '✦'], 10);
    const w = liveStage.clientWidth || 500;
    GARDEN.buddies.filter((b) => !b.carry).slice(0, 3).forEach((b, i) => {
      setTimeout(() => {
        b.carry = '💎';
        const ce = document.createElement('span');
        ce.className = 'pik-carry';
        ce.textContent = '💎';
        b.el.appendChild(ce);
        b.carryEl = ce;
        b.x = Math.max(14, Math.min(w - 40, Math.random() * w));
        b.el.style.left = b.x + 'px';
        pikChirp();
      }, 500 + i * 350);
    });
    showBubble(trT('GEMS?! squad — GATHER. this is not a drill', "des GEMMES ?! l'escouade — RASSEMBLEMENT. pas un exercice"), 2600);
  }
  function giftActRainbow(e) {
    if (!liveOpen || !liveStage) return;
    fxZoom('🌈');
    fxRain(['♥', '✦', '🫧'], 12);
    liveStage.classList.add('gift-rainbow');
    setTimeout(() => liveStage.classList.remove('gift-rainbow'), 3200);
    showBubble(trT('double rainbow?? single. but I FELT double', "double arc-en-ciel ?? simple. mais je l'ai SENTI double"), 2600);
  }
  function giftActSparkle(e) {
    if (!liveOpen) return;
    burstAtSlime([e, '♥', '✦'], 8);
    if (slimeBody) { slimeBody.classList.add('gift-blush'); setTimeout(() => slimeBody.classList.remove('gift-blush'), 3200); }
    if (e === '🌹' || e === '🌸' || e === '💐' || e === '🌷') fxRain(['🌸', e], 10);
  }
  function giftActZap(e) {
    if (!liveOpen || !liveStage) return;
    fxFlash();
    const b = giftStageItem('gift-bolt', '⚡', (liveStage.clientWidth || 500) * (0.3 + Math.random() * 0.4), null);
    if (b) { b.style.top = '4%'; setTimeout(() => b.remove(), 900); }
    if (typeof moveSlime === 'function') moveSlime({ action: 'alert', mood: trT('zapped', 'électrisé'), duration: 700 });
    showBubble(trT('⚡ UNSCHEDULED LIGHTNING (very scheduled, I have a guy)', "⚡ FOUDRE IMPRÉVUE (très prévue, j'ai un contact)"), 2400);
  }
  function giftActFire(e) {
    if (!liveOpen || !liveStage) return;
    const w = liveStage.clientWidth || 500;
    for (let i = 0; i < 10; i++) setTimeout(() => { const s = giftStageItem('gift-ember', Math.random() < 0.5 ? '🔥' : '✦', Math.random() * w, 0); if (s) setTimeout(() => s.remove(), 2200); }, i * 130);
    showBubble(trT('this stream is officially LIT. no notes.', 'ce stream est officiellement EN FEU. rien à redire.'), 2400);
  }
  function giftActSnow(e) {
    if (!liveOpen) return;
    fxRain(['❄️', '🫧', '✦'], 14);
    if (slimeBody) { slimeBody.classList.add('gift-shiver'); setTimeout(() => slimeBody.classList.remove('gift-shiver'), 2200); }
    showBubble(trT('brrr!! ❄️ cozy mode: ENGAGED (bring blankets)', 'brrr !! ❄️ mode cocon : ACTIVÉ (apportez des plaids)'), 2400);
  }
  function giftActDead(e) {
    if (!liveOpen || !slimeBody) return;
    slimeBody.classList.add('gift-ded');
    showBubble('☠️ …', 1500);
    setTimeout(() => {
      slimeBody.classList.remove('gift-ded');
      if (typeof moveSlime === 'function') moveSlime({ action: 'hop', mood: trT('revived', 'ressuscité'), duration: 600 });
      showBubble(trT('jk. reports of my death were LOL at best', 'jk. les rumeurs de ma mort étaient LOL au mieux'), 2400);
      burstAtSlime(['💀', '♥'], 5);
    }, 1800);
  }
  function giftActRobot(e) {
    if (!liveOpen || !slimeBody) return;
    slimeBody.classList.add('gift-robo');
    showBubble('BEEP. BOOP. AFFECTION.EXE RUNNING.', 2600);
    burstAtSlime(['🤖', '⚙️'], 4);
    setTimeout(() => slimeBody.classList.remove('gift-robo'), 3200);
  }
  function giftActBox(e) {
    if (!liveOpen || !liveStage) return;
    const w = liveStage.clientWidth || 500;
    const bx = w * (0.35 + Math.random() * 0.3);
    const box = giftStageItem('gift-snack gift-box', '📦', bx, 10);
    if (!box) return;
    GARDEN.buddies.filter((b) => !b.carry).slice(0, 2).forEach((b) => { b.visitX = bx; b.visitUntil = Date.now() + 2200; });
    showBubble(trT("a package?! I didn't order— SQUAD, OPEN IT", "un colis ?! j'ai rien comman— L'ESCOUADE, OUVREZ"), 2200);
    setTimeout(() => {
      box.classList.add('is-eaten');
      setTimeout(() => box.remove(), 500);
      playSparkleSound();
      const POOL = ['🧋', '🐸', '💎', '❄️', '🌈', '🦆', '👑', '🔥'];
      const inner = POOL[Math.floor(Math.random() * POOL.length)];
      showBubble(trT('inside the box: ' + inner + ' — GIFT-CEPTION!!', 'dans le colis : ' + inner + ' — CADEAU-CEPTION !!'), 2200);
      const act = giftActFor(inner);
      if (act) setTimeout(() => act(inner), 800);
    }, 2000);
  }
  function giftActBugHunt(e) {
    if (!liveOpen || !liveStage) return;
    const w = liveStage.clientWidth || 500;
    const bug = giftStageItem('gift-critter is-scuttle', '🐞', -30, 8);
    if (!bug) return;
    bug.style.transition = 'left 9000ms linear';
    requestAnimationFrame(() => { bug.style.left = (w + 40) + 'px'; });
    GARDEN.buddies.filter((b) => !b.carry).forEach((b, i) => {
      setTimeout(() => { b.visitX = Math.min(w - 30, 60 + i * 60); b.visitUntil = Date.now() + 5200; pikSay(b, 'pik!!', 900); }, 300 + i * 220);
    });
    showBubble(trT('🐞 A BUG?! IN PROD?! squad — standard procedure!!', '🐞 UN BUG ?! EN PROD ?! escouade — procédure standard !!'), 2400);
    setTimeout(() => { bug.remove(); if (liveOpen && !pet.sleeping) { showBubble(trT('bug escorted off-stage. QA approves ♡', 'bug escorté hors scène. la QA approuve ♡'), 2200); pikChirp(); pikChirp(); } }, 9200);
  }
  function giftActCloud(e) {
    if (!liveOpen || !liveStage) return;
    const w = liveStage.clientWidth || 500;
    const cl = giftStageItem('gift-cloud', '☁️', -50, null);
    if (!cl) return;
    cl.style.top = '8%';
    cl.style.transition = 'left 8000ms linear';
    requestAnimationFrame(() => { cl.style.left = (w + 50) + 'px'; });
    let drops = 0;
    const iv = setInterval(() => {
      if (++drops > 10 || !liveOpen) { clearInterval(iv); return; }
      const rect = cl.getBoundingClientRect();
      const stage = liveStage.getBoundingClientRect();
      const s = giftStageItem('gift-ember is-rain', '♥', rect.left - stage.left + 10, null);
      if (s) { s.style.top = (rect.top - stage.top + 20) + 'px'; setTimeout(() => s.remove(), 1600); }
    }, 650);
    setTimeout(() => cl.remove(), 8600);
    showBubble(trT("☁️ the cloud came DOWN?! it's raining affection", "☁️ le cloud est DESCENDU ?! il pleut de l'affection"), 2400);
  }
  function giftActFeels(e) {
    if (!liveOpen) return;
    GARDEN.gatherUntil = Date.now() + 3200;
    burstAtSlime([e, '♥'], 5);
    showBubble(e === '😭'
      ? trT('😭 we cry TOGETHER on this stream. union rules.', '😭 ici on pleure ENSEMBLE. règle du syndicat.')
      : trT("🥺 who hurt you. I have pikmin and I'm not afraid to hug.", "🥺 qui t'a fait du mal. j'ai des pikmin et je n'ai pas peur des câlins."), 3000);
  }
  function giftActCake(e) {
    if (!liveOpen) return;
    GARDEN.gatherUntil = Date.now() + 3600;
    GARDEN.buddies.forEach((b, i) => setTimeout(() => pikSay(b, '♪', 900), 400 + i * 260));
    setTimeout(() => { if (liveOpen && !pet.sleeping) showBubble(trT('🎂 everyone SANG?! ok ok. wish time… *blows*', '🎂 tout le monde a CHANTÉ ?! bon bon. vœu… *souffle*'), 2600); }, 1800);
    setTimeout(() => { fxRain(['🎉', '✦', '♥'], 14); playSparkleSound(); }, 3100);
  }
  function giftActFor(e) {
    const FOOD = ['🍬', '🍩', '🍰', '🧁', '🍭', '🍪', '🍓', '🍡', '🥟', '🍙', '🍜', '☕', '🍵', '🥐', '🍦', '🧋'];
    const CRITTER = ['🦆', '🐛', '🐱', '🐶', '🦄', '🐸', '🐢', '🐰', '🐝', '🦋', '🐙', '🐹', '🐧', '🦩', '🐌'];
    const SPARKLE = ['💖', '💘', '💐', '🌸', '🌷', '🎀', '⭐', '✨', '🫧', '🌙', '🍀', '🎆', '🌹'];
    if (e === '🎂') return giftActCake;
    if (e === '👑') return giftActCrown;
    if (e === '🪩') return giftActDisco;
    if (e === '💎') return giftActGems;
    if (e === '🌈') return giftActRainbow;
    if (e === '⚡') return giftActZap;
    if (e === '🔥') return giftActFire;
    if (e === '❄️' || e === '❄') return giftActSnow;
    if (e === '💀') return giftActDead;
    if (e === '🤖') return giftActRobot;
    if (e === '📦') return giftActBox;
    if (e === '🐞') return giftActBugHunt;
    if (e === '☁️' || e === '☁') return giftActCloud;
    if (e === '😭' || e === '🥺') return giftActFeels;
    if (e === '📷' || e === '📸') return giftActCamera;
    if (FOOD.indexOf(e) !== -1) return giftActFood;
    if (CRITTER.indexOf(e) !== -1) return giftActCritter;
    if (SPARKLE.indexOf(e) !== -1) return giftActSparkle;
    return null;
  }

  const GIFTS = {
    candy:  { icon: '🍬', fans: 1, react: [["a candy!! crunch crunch ♡", "un bonbon !! cronch cronch ♡"], ["sugar rush initiated", "rush de sucre enclenché"]] },
    rose:   { icon: '🌹', fans: 2, react: [["a rose?? for ME?? *blushes in pixels*", "une rose ?? pour MOI ?? *rougit en pixels*"], ["I will water it with love", "je l'arroserai avec de l'amour"]] },
    boba:   { icon: '🧋', fans: 3, react: [["BOBA. you know me so well", "du BOBA. tu me connais si bien"], ["extra pearls?? marry me", "double perles ?? épouse-moi"]] },
    cake:   { icon: '🎂', fans: 5, react: [["cake!! is it my birthday? it is now", "un gâteau !! c'est mon anniversaire ? maintenant oui"], ["one slice for me, one slice for me", "une part pour moi, une part pour moi"]] },
    heart:  { icon: '💖', fans: 8, react: [["a SUPER heart!! I'm going to cry pixels", "un SUPER cœur !! je vais pleurer des pixels"], ["my affection meter just broke (it was already full)", "ma jauge d'affection vient de casser (elle était déjà pleine)"]] },
    rocket: { icon: '🚀', fans: 15, react: [["A ROCKET?!! TO THE MOON!! (I live there)", "UNE FUSÉE ?!! TO THE MOON !! (j'y habite)"], ["biggest gift of the stream!! I'm SCREAMING", "le plus gros cadeau du stream !! je HURLE"]] }
  };
  var giftComboId = null, giftComboN = 0, giftComboTimer = null;

  /* ---------- stage FX engine: big pixel-party effects ---------- */
  function fxLayer() {
    if (!liveStage) return null;
    let layer = liveStage.querySelector('.live-fx-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'live-fx-layer';
      layer.setAttribute('aria-hidden', 'true');
      liveStage.appendChild(layer);
    }
    return layer;
  }

  function fxSpawn(cls, text, styles = {}, ttl = 2600) {
    const layer = fxLayer();
    if (!layer) return null;
    const el = document.createElement('span');
    el.className = cls;
    if (text) el.textContent = text;
    Object.keys(styles).forEach((k) => {
      if (k.startsWith('--')) el.style.setProperty(k, styles[k]);
      else el.style[k] = styles[k];
    });
    layer.appendChild(el);
    setTimeout(() => el.remove(), ttl);
    return el;
  }

  function fxBanner(text, sub) {
    const layer = fxLayer();
    if (!layer) return;
    const b = document.createElement('div');
    b.className = 'fx-banner';
    b.textContent = text;
    if (sub) {
      const s = document.createElement('small');
      s.textContent = sub;
      b.appendChild(s);
    }
    layer.appendChild(b);
    setTimeout(() => b.remove(), 3000);
  }

  function fxShake() {
    if (REDUCED_MOTION || !liveStage) return;
    liveStage.classList.remove('fx-shake');
    void liveStage.offsetWidth;
    liveStage.classList.add('fx-shake');
    setTimeout(() => liveStage.classList.remove('fx-shake'), 700);
  }

  function fxFlash() {
    if (REDUCED_MOTION) return;
    fxSpawn('fx-flash', '', {}, 900);
  }

  function fxRain(chars, n = 16) {
    if (REDUCED_MOTION) n = Math.min(n, 5);
    for (let i = 0; i < n; i++) {
      setTimeout(() => fxSpawn('fx-drop', chars[i % chars.length], {
        left: `${4 + Math.random() * 92}%`,
        animationDuration: `${1.4 + Math.random() * 1.2}s`,
        fontSize: `${1 + Math.random() * 1.4}rem`
      }, 2900), i * 90);
    }
  }

  function fxZoom(char) { fxSpawn('fx-zoom', char, {}, 1800); }

  function fxOrbit(char, n = 6) {
    const { x, y } = slimeAnchor();
    for (let i = 0; i < n; i++) {
      fxSpawn('fx-orbit', char, {
        left: `${x}px`,
        top: `${y}px`,
        animationDelay: `${((i / n) * 1.2).toFixed(2)}s`
      }, 2800);
    }
  }

  function fxFirework(char, bursts = 3) {
    for (let b = 0; b < bursts; b++) {
      setTimeout(() => {
        const cx = 15 + Math.random() * 70, cy = 12 + Math.random() * 45;
        for (let i = 0; i < 8; i++) {
          fxSpawn('fx-spark', i % 2 ? char : '✦', {
            left: `${cx}%`,
            top: `${cy}%`,
            '--fx-dx': `${Math.round(Math.cos((i / 8) * Math.PI * 2) * 62)}px`,
            '--fx-dy': `${Math.round(Math.sin((i / 8) * Math.PI * 2) * 62)}px`
          }, 1400);
        }
        playSparkleSound();
      }, b * 380);
    }
  }

  // 🚀 the headliner: full-stage launch sequence
  function megaRocket() {
    fxBanner('🚀 TO THE MOON!!', trT('biggest gift on the stream', 'le plus gros cadeau du stream'));
    fxFlash();
    fxShake();
    const rocket = fxSpawn('fx-rocket', '🚀', {}, 2600);
    for (let i = 0; i < 12; i++) {
      setTimeout(() => {
        if (!rocket || !rocket.isConnected || !liveStage) return;
        const rr = rocket.getBoundingClientRect();
        const sr = liveStage.getBoundingClientRect();
        fxSpawn('fx-trail', ['✦', '·', '˚'][i % 3], {
          left: `${rr.left - sr.left + rr.width / 2}px`,
          top: `${rr.top - sr.top + rr.height - 6}px`
        }, 900);
      }, 140 + i * 140);
    }
    fxRain(['⭐', '✦', '💫'], 14);
    playFanfare();
    GAME.flash = 8;
  }

  /* ---------- custom emoji gifts: 60% of emojis carry a secret
     code-themed MEGA effect + a special slime interaction ---------- */
  function emojiHash(str) {
    let h = 7;
    for (const ch of str) h = ((h * 31) + ch.codePointAt(0)) >>> 0;
    return h;
  }

  const MEGA_FX = [
    { run(e) { fxBanner('git push --force ♡'); fxRain([e, '♥'], 18); fxShake(); },
      react: ['FORCE-PUSHED straight into my heart!!', 'force-poussé direct dans mon cœur !!'], action: 'flip' },
    { run(e) { fxBanner('sudo hug slime'); fxZoom(e); fxFlash(); },
      react: ['sudo?? ok ok, PERMISSION GRANTED ♡', 'sudo ?? ok ok, PERMISSION ACCORDÉE ♡'], action: 'alert' },
    { run(e) { fxBanner('while(true){ bounce() }'); fxOrbit(e, 7); },
      react: ['INFINITE LOOP!! nobody wrote a break!!', 'BOUCLE INFINIE !! personne n\'a écrit de break !!'], action: 'hop', hops: 3 },
    { run(e) { fxBanner('<<<<<<< HEAD (of cuteness)'); fxRain([e, '♥', '✦'], 14); },
      react: ['merge conflict resolved: I keep BOTH', 'conflit de merge résolu : je garde LES DEUX'], action: 'dizzy' },
    { run(e) { fxBanner('it compiles!! SHIP IT 🚢'); fxFirework(e, 3); },
      react: ['deployed to prod. zero bugs. probably.', 'déployé en prod. zéro bug. sans doute.'], action: 'flip' },
    { run(e) { fxBanner('rubber_duck.debug()'); fxZoom(e); fxOrbit('🐛', 4); },
      react: ['explaining all my bugs to it rn... it listens ♡', 'je lui explique tous mes bugs là... il écoute ♡'], action: 'think' },
    { run(e) { fxBanner('rm -rf bugs/'); fxRain(['🐛', e], 12); setTimeout(fxFlash, 900); },
      react: ['bugs directory DELETED. so clean in here', 'dossier bugs SUPPRIMÉ. que c\'est propre ici'], action: 'happy' },
    { run(e) { fxBanner('404: chill not found'); fxZoom(e); fxFirework('✦', 2); },
      react: ['ERROR 404: my chill?? gone. HYPED!!', 'ERREUR 404 : mon calme ?? disparu. HYPE !!'], action: 'alert' }
  ];

  const GENERIC_EMOJI_REACT = [
    ['a wild {e} appeared!! ty ty ♡', 'un {e} sauvage apparaît !! merci merci ♡'],
    ['{e}?? for me?? adding it to my inventory', '{e} ?? pour moi ?? je l\'ajoute à mon inventaire'],
    ['chat sent {e}!! I\'m rich in vibes', 'le chat envoie {e} !! je suis riche en vibes'],
    ['{e} received. affection++ ♡', '{e} reçu. affection++ ♡']
  ];

  /* ---------- MEGA SPELLBOOK: every blessed effect you witness gets
     inked into yos-spellbook (idx → the emoji that cast it).
     collect all 8 and the hall crowns you archmage 🔮 ---------- */
  function spellbookMark(idx, e) {
    if (idx < 0) return;
    const book = store.get('yos-spellbook', {});
    if (book[idx]) return;
    book[idx] = e;
    store.set('yos-spellbook', book);
    if (Object.keys(book).length >= MEGA_FX.length) achvUnlock('archmage');
    renderSpellbook();
  }

  function renderSpellbook() {
    const grid = document.getElementById('lb-achv-grid');
    if (!grid || !grid.parentNode) return;
    let row = document.getElementById('lb-spellbook');
    if (!row) {
      row = document.createElement('div');
      row.id = 'lb-spellbook';
      row.className = 'lb-spellbook';
      grid.parentNode.insertBefore(row, grid.nextSibling);
    }
    row.innerHTML = '';
    const book = store.get('yos-spellbook', {});
    const found = Object.keys(book).length;
    const label = document.createElement('span');
    label.className = 'lb-spellbook-label';
    label.textContent = trT(`🔮 MEGA SPELLBOOK ${found}/${MEGA_FX.length}`, `🔮 GRIMOIRE MÉGA ${found}/${MEGA_FX.length}`);
    const cells = document.createElement('span');
    cells.className = 'lb-spellbook-cells';
    for (let i = 0; i < MEGA_FX.length; i++) {
      const c = document.createElement('span');
      c.className = 'lb-spell' + (book[i] ? ' is-found' : '');
      c.textContent = book[i] || '❓';
      if (!book[i]) c.title = trT('an undiscovered MEGA blessing… gift more emojis', 'une bénédiction MÉGA à découvrir… offre plus d\'emojis');
      cells.appendChild(c);
    }
    row.append(label, cells);
  }

  function emojiBlessing(e) {
    if (e === '🚀') return { rocket: true };
    const h = emojiHash(e);
    if (h % 10 < 6) return { fx: MEGA_FX[h % MEGA_FX.length] }; // 60% of emojis are blessed
    return null;
  }

  /* ---------- GIFT STORM: 13+ gifts in 10s and the slime unionizes.
     gifts still sparkle during a storm — they just stop paying fans
     for 20s. lifetime generosity and storm counts feed achievements. */
  var giftWindow = [];    // timestamps, 10s sliding window
  var giftStormUntil = 0; // fan counter is on break until then
  function giftPulse() {
    const now = Date.now();
    const total = store.get('yos-gift-total', 0) + 1;
    store.set('yos-gift-total', total);
    if (total >= 50) achvUnlock('whale');
    giftWindow.push(now);
    giftWindow = giftWindow.filter((ts) => now - ts <= 10000);
    if (now < giftStormUntil) return;
    if (giftWindow.length > 12) {
      giftStormUntil = now + 20000;
      giftWindow = [];
      fxBanner(trT('⚠ GIFT STORM — the slime is now unionized', '⚠ TEMPÊTE DE CADEAUX — le slime est désormais syndiqué'));
      playTone(330, 'square', 0.14, 0, 0.05);
      if (!pet.sleeping) setTimeout(() => showBubble(trT('ok ok I GET IT ♡ (fan counter on break)', 'ok ok J\'AI COMPRIS ♡ (compteur de fans en pause)'), 3000), 300);
      const storms = store.get('yos-storm-count', 0) + 1;
      store.set('yos-storm-count', storms);
      if (storms >= 3) achvUnlock('spamlord');
    }
  }
  function giftGain(n) {
    if (Date.now() < giftStormUntil) return; // union rules: no counting during a storm
    gainFollowers(n);
  }
  function giftComboEscalate(icon) {
    if (giftComboN === 3) {
      fxBanner(trT('COMBO ×3!!', 'COMBO ×3 !!'), icon + icon + icon);
      fxRain([icon, '✦'], 12);
      playTone(1318, 'triangle', 0.12, 0, 0.05);
    } else if (giftComboN === 5) {
      fxBanner(trT('⚡ ULTRA COMBO ×5 ⚡', '⚡ ULTRA COMBO ×5 ⚡'), trT('the stage is SHAKING', 'la scène TREMBLE'));
      fxShake();
      fxFirework(icon, 3);
      giftGain(5);
      achvUnlock('comboking');
    }
  }

  function flyGiftToStage(icon, fromEl) {
    if (!fromEl || !liveStage) return;
    const fly = document.createElement('span');
    fly.className = 'gift-fly';
    fly.textContent = icon;
    const br = fromEl.getBoundingClientRect();
    const sr = liveStage.getBoundingClientRect();
    fly.style.left = br.left + br.width / 2 + 'px';
    fly.style.top = br.top + 'px';
    document.body.appendChild(fly);
    requestAnimationFrame(() => {
      fly.style.transform = `translate(${sr.left + sr.width / 2 - br.left}px, ${sr.top + sr.height / 2 - br.top}px) scale(1.6)`;
      fly.style.opacity = '0';
    });
    setTimeout(() => fly.remove(), 900);
  }

  /* 🐿️ the seed-seeker: a pixel squirrel bounds in, frantically
     pats the meadow ("My seeds! My seeeeeeds!"), then boings away */
  function squirrelSprite() {
    if (wxSpriteCache.squirrel) return wxSpriteCache.squirrel;
    const c = document.createElement('canvas');
    c.width = 14; c.height = 11;
    const x = c.getContext('2d');
    x.fillStyle = '#b5764a'; // big fluffy tail
    x.fillRect(0, 1, 4, 8);
    x.fillRect(1, 0, 3, 2);
    x.fillStyle = '#8a5a2e';
    x.fillRect(1, 3, 2, 4); // tail shading
    x.fillStyle = '#c98a5b'; // body
    x.fillRect(4, 4, 6, 5);
    x.fillRect(8, 2, 4, 5); // head
    x.fillStyle = '#f4e0cc'; // belly + cheek
    x.fillRect(5, 6, 3, 3);
    x.fillRect(9, 5, 2, 2);
    x.fillStyle = '#8a5a2e'; // ear
    x.fillRect(9, 1, 2, 2);
    x.fillStyle = '#14020e'; // eye + nose
    x.fillRect(10, 3, 1, 1);
    x.fillRect(12, 4, 1, 1);
    wxSpriteCache.squirrel = c.toDataURL();
    return wxSpriteCache.squirrel;
  }
  function squirrelShow() {
    if (!liveStage || liveStage.querySelector('.live-squirrel')) return;
    const sq = document.createElement('div');
    sq.className = 'live-squirrel';
    sq.setAttribute('aria-hidden', 'true');
    const img = document.createElement('img');
    img.src = squirrelSprite();
    img.alt = '';
    const bub = document.createElement('span');
    bub.className = 'pik-bubble squirrel-bubble';
    bub.textContent = 'My seeds! My seeeeeeds!';
    sq.appendChild(img);
    sq.appendChild(bub);
    liveStage.appendChild(sq);
    const w = liveStage.clientWidth || 500;
    const sx = slimeStageX ? slimeStageX() : w / 2;
    // hop in from the left, dig around beside the slime, hop off right
    const spots = [Math.max(30, sx - 120), Math.max(60, sx - 70), sx + 80];
    sq.style.left = '-30px';
    let step = 0;
    // unhurried little creature: slow stepped hops (very 8-bit),
    // long dig pauses — plenty of time to fall in love with it
    const hopTo = (xTarget, then) => {
      sq.style.left = xTarget + 'px';
      setTimeout(then, 2600);
    };
    playTone(1500, 'square', 0.05, 0, 0.02);
    setTimeout(function next() {
      if (step < spots.length) {
        hopTo(spots[step++], () => {
          sq.classList.add('digging');
          setTimeout(() => { sq.classList.remove('digging'); next(); }, 1600);
        });
      } else {
        bub.textContent = trT('found them!! bye!!', 'trouvées !! bye !!');
        hopTo(w + 40, () => sq.remove());
      }
    }, 300);
    if (!pet.sleeping) {
      setTimeout(() => showBubble(trT('a squirrel?? on MY stream?? iconic guest', 'un écureuil ?? sur MON stream ?? invité iconique'), 2600), 1200);
    }
  }

  function sendEmojiGift(raw) {
    if (!liveOpen) return false;
    const parts = (typeof Intl !== 'undefined' && Intl.Segmenter)
      ? [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(raw)].map((s) => s.segment)
      : Array.from(raw);
    const e = parts.find((s) => /\p{Extended_Pictographic}/u.test(s));
    if (!e) {
      showBubble(trT('emoji only!! this is an emoji-based economy ♡', 'que des emojis !! ici l\'économie tourne aux emojis ♡'), 2400);
      return false;
    }

    store.set('yos-live-gifted', true);
    updateLiveTab();
    giftPulse();
    // combo counting works for picker emojis too — spam responsibly ♡
    if (giftComboId === e) giftComboN++;
    else { giftComboId = e; giftComboN = 1; }
    if (giftComboTimer) clearTimeout(giftComboTimer);
    giftComboTimer = setTimeout(() => { giftComboId = null; giftComboN = 0; if (liveComboEl) liveComboEl.textContent = ''; }, 2600);
    if (liveComboEl && giftComboN > 1) liveComboEl.textContent = `${e} ×${giftComboN}!!`;
    giftComboEscalate(e);
    flyGiftToStage(e, document.getElementById('live-emoji-open'));
    const line = makeChatLine({ u: trT('you', 'toi'), c: '#f0509f', t: `${trT('sent', 'a envoyé')} ${e} !!` });
    liveMirror(line);
    appendChatMessage(line);

    // gifts reach the slime even in dreams — softly
    if (pet.sleeping) {
      giftGain(1);
      setTimeout(() => {
        showBubble(trT(`zzz... (dreaming of ${e}) zzz`, `zzz... (rêve de ${e}) zzz`), 2200);
        const { x, y } = slimeAnchor();
        spawnParticle(x + 18, y - 22, 'z', 'p-zzz');
      }, 500);
      return true;
    }

    // 🐿️ special guest protocol
    if (e === '🐿️') {
      giftGain(3);
      setTimeout(squirrelShow, 500);
      return true;
    }

    // 🪿 goose economics: the goose taketh (1 pending coin, if any),
    // then the goose giveth (+2 pending coins, air-dropped 3s later)
    if (e === '🪿') {
      giftGain(2);
      setTimeout(() => { if (liveOpen) spawnGeese(); }, 400);
      const pending = store.get('yos-pending-coins', 0);
      if (pending > 0) store.set('yos-pending-coins', pending - 1);
      fxBanner(trT('the goose taketh, the goose giveth ♡', 'la bernache prend, la bernache donne ♡'),
        pending > 0 ? trT('-1 pending coin… airdrop inbound', '-1 pièce en attente… largage imminent') : trT('airdrop inbound', 'largage imminent'));
      setTimeout(() => {
        store.set('yos-pending-coins', store.get('yos-pending-coins', 0) + 2);
        playSparkleSound();
        if (!pet.sleeping) showBubble(trT('the flock air-dropped 2 coins for your next run!!', 'le vol a largué 2 pièces pour ta prochaine run !!'), 2600);
      }, 3000);
      return true;
    }

    // bespoke stage acts OUTRANK the generic MEGA blessing — an emoji with
    // its own choreography always performs it (rocket/goose/squirrel keep
    // their earlier special branches; blessed spells cover the rest)
    const bless = giftActFor(e) ? null : emojiBlessing(e);
    playTone(980, 'triangle', 0.12, 0, 0.05);

    if (bless && bless.rocket) {
      giftGain(15);
      setTimeout(() => {
        megaRocket();
        showBubble(trT('A ROCKET?!! TO THE MOON!! (I live there)', 'UNE FUSÉE ?!! TO THE MOON !! (j\'y habite)'), 2800);
        if (typeof moveSlime === 'function') moveSlime({ action: 'flip', mood: trT('astronaut', 'astronaute'), duration: 800 });
        burstAtSlime(['🚀', '⭐', '✦'], 10);
      }, 450);
    } else if (bless) {
      giftGain(6);
      spellbookMark(MEGA_FX.indexOf(bless.fx), e); // grimoire bookkeeping
      setTimeout(() => {
        bless.fx.run(e);
        showBubble(trT(bless.fx.react[0], bless.fx.react[1]), 3000);
        if (bless.fx.hops) {
          [0, 420, 840].forEach((d, i, arr) => setTimeout(() => {
            moveSlime({ action: 'hop', mood: trT('mega-hyped', 'méga-hype'), duration: 380, distance: 1.2, scheduleNext: i === arr.length - 1 });
          }, d));
        } else if (typeof moveSlime === 'function') {
          moveSlime({ action: bless.fx.action, mood: trT('mega-hyped', 'méga-hype'), duration: 900, distance: 0.6 });
        }
        burstAtSlime([e, '♥', '✦'], 8);
        playFanfare();
      }, 450);
    } else {
      giftGain(2);
      setTimeout(() => {
        const act = giftActFor(e);
        if (act) { act(e); return; } // the troupe takes it from here
        burstAtSlime([e, '♥'], 5);
        const r = GENERIC_EMOJI_REACT[emojiHash(e) % GENERIC_EMOJI_REACT.length];
        showBubble(trT(r[0], r[1]).replace('{e}', e), 2600);
        if (typeof moveSlime === 'function') moveSlime({ action: 'happy', mood: trT('gifted', 'gâté'), duration: 760, distance: 0.4 });
      }, 450);
    }
    return true;
  }

  // Discord-grade picker: type-to-search, scrollable, categorized —
  // wearing its best Y2K NSO outfit. One tap = gift sent.
  const emojiOpenBtn = document.getElementById('live-emoji-open');
  const emojiPicker = document.getElementById('emoji-picker');
  const emojiBody = document.getElementById('emoji-picker-body');
  const emojiSearch = document.getElementById('emoji-search');
  const EMOJI_CATS = [
    { n: ['🍩 snacks & sips', '🍩 snacks & boissons'], list: [
      ['🧋', 'boba bubble tea milk 奶茶'], ['🍩', 'donut sweet 甜甜圈'], ['🍰', 'cake gateau 蛋糕'], ['🧁', 'cupcake'],
      ['🍬', 'candy bonbon 糖'], ['🍭', 'lollipop sucette'], ['🍪', 'cookie biscuit 饼干'], ['🍓', 'strawberry fraise 草莓'],
      ['🍡', 'dango mochi 团子'], ['🥟', 'dumpling ravioli 饺子'], ['🍙', 'onigiri rice 饭团'], ['🍜', 'ramen noodles nouilles 面'],
      ['☕', 'coffee cafe 咖啡'], ['🍵', 'matcha tea the 抹茶'], ['🥐', 'croissant'], ['🍦', 'ice cream glace 冰淇淋']
    ] },
    { n: ['💖 hearts & sparkle', '💖 cœurs & éclats'], list: [
      ['💖', 'sparkle heart coeur 爱心'], ['💘', 'heart arrow cupid'], ['💐', 'bouquet flowers fleurs 花'], ['🌸', 'sakura blossom 樱花'],
      ['🌷', 'tulip tulipe'], ['🎀', 'ribbon bow noeud 蝴蝶结'], ['🌈', 'rainbow arc 彩虹'], ['⭐', 'star etoile 星'],
      ['✨', 'sparkles shiny brillant'], ['👑', 'crown couronne 皇冠'], ['🫧', 'bubbles bulles 泡泡'], ['🌙', 'moon lune 月亮'],
      ['🪩', 'disco ball boule y2k'], ['💎', 'gem diamond diamant 钻石'], ['🍀', 'clover luck chance 幸运'], ['🎆', 'fireworks feu 烟花']
    ] },
    { n: ['🦆 lil friends', '🦆 petits amis'], list: [
      ['🦆', 'duck canard 鸭'], ['🪿', 'goose honk bernache 鹅'], ['🐛', 'bug worm insecte 虫'], ['🐱', 'cat chat 猫'],
      ['🐶', 'dog puppy chien 狗'], ['🦄', 'unicorn licorne 独角兽'], ['🐸', 'frog grenouille 蛙'], ['🐢', 'turtle tortue 龟'],
      ['🐰', 'bunny rabbit lapin 兔'], ['🐝', 'bee abeille 蜂'], ['🦋', 'butterfly papillon 蝴蝶'], ['🐙', 'octopus pieuvre 章鱼'],
      ['🐹', 'hamster 仓鼠'], ['🐧', 'penguin pingouin 企鹅'], ['🦩', 'flamingo flamant'], ['🐌', 'snail escargot 蜗牛'],
      ['🐿️', 'squirrel seeds ecureuil 松鼠']
    ] },
    { n: ['💻 dev corner', '💻 coin dev'], list: [
      ['🎮', 'game controller manette 游戏'], ['💻', 'laptop code ordi 电脑'], ['⌨️', 'keyboard clavier 键盘'], ['🎧', 'headphones casque 耳机'],
      ['📷', 'camera photo appareil 相机'], ['⚡', 'zap lightning eclair 闪电'], ['🔥', 'fire lit feu 火'], ['❄️', 'snow cold neige 雪'],
      ['🚀', 'rocket moon fusee 火箭'], ['💀', 'skull dead lol mort'], ['😭', 'crying sob pleure 哭'], ['🥺', 'pleading puppy eyes'],
      ['🤖', 'robot bot ai 机器人'], ['🐞', 'ladybug debug coccinelle'], ['📦', 'box package paquet 快递'], ['☁️', 'cloud aws nuage 云']
    ] }
  ];
  function emojiCellFor(e) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'emoji-cell';
    b.textContent = e;
    b.addEventListener('click', () => {
      if (sendEmojiGift(e) !== false) {
        const rec = [e].concat(store.get('yos-emoji-recent', []).filter((x) => x !== e)).slice(0, 12);
        store.set('yos-emoji-recent', rec);
      }
      toggleEmojiPicker(false);
    });
    return b;
  }
  function buildEmojiPicker(query) {
    if (!emojiBody) return;
    emojiBody.innerHTML = '';
    const q = (query || '').trim().toLowerCase();
    const addSection = (label, pairs) => {
      if (!pairs.length) return;
      const h = document.createElement('div');
      h.className = 'emoji-cat-label';
      h.textContent = label;
      const g = document.createElement('div');
      g.className = 'emoji-picker-grid';
      pairs.forEach(([e]) => g.appendChild(emojiCellFor(e)));
      emojiBody.appendChild(h);
      emojiBody.appendChild(g);
    };
    if (q) {
      // flat search results across every category (emoji or keywords)
      const hits = [];
      EMOJI_CATS.forEach((c) => c.list.forEach(([e, kw]) => {
        if (e === q || kw.toLowerCase().indexOf(q) !== -1) hits.push([e, kw]);
      }));
      if (hits.length) addSection(trT(`🔎 ${hits.length} found`, `🔎 ${hits.length} trouvés`), hits);
      else {
        const none = document.createElement('div');
        none.className = 'emoji-cat-label';
        none.textContent = trT('nothing… the slime accepts ANY emoji via chat tho ♡', 'rien… le slime accepte TOUT emoji par le chat ♡');
        emojiBody.appendChild(none);
      }
      return;
    }
    const recent = store.get('yos-emoji-recent', []);
    if (recent.length) addSection(trT('♡ recent', '♡ récents'), recent.map((e) => [e, '']));
    EMOJI_CATS.forEach((c) => addSection(trT(c.n[0], c.n[1]), c.list));
  }
  function toggleEmojiPicker(show) {
    if (!emojiPicker) return;
    const s = (typeof show === 'boolean') ? show : emojiPicker.hidden;
    if (s) {
      if (emojiSearch) emojiSearch.value = '';
      buildEmojiPicker('');
    }
    emojiPicker.hidden = !s;
    if (emojiOpenBtn) emojiOpenBtn.setAttribute('aria-expanded', String(s));
    if (s) {
      playTone(880, 'triangle', 0.07, 0, 0.03);
      if (emojiSearch) setTimeout(() => emojiSearch.focus(), 40);
    }
  }
  if (emojiSearch) emojiSearch.addEventListener('input', () => buildEmojiPicker(emojiSearch.value));
  if (emojiOpenBtn) emojiOpenBtn.addEventListener('click', () => toggleEmojiPicker());
  document.addEventListener('click', (ev2) => {
    if (emojiPicker && !emojiPicker.hidden && ev2.target instanceof Element && !ev2.target.closest('#live-emoji-form')) {
      toggleEmojiPicker(false);
    }
  });
  document.addEventListener('keydown', (ev2) => {
    if (ev2.key === 'Escape' && emojiPicker && !emojiPicker.hidden) toggleEmojiPicker(false);
  });

  function sendGift(id, btn) {
    const g = GIFTS[id];
    if (!g || !liveOpen) return;
    store.set('yos-live-gifted', true);
    updateLiveTab();
    giftPulse();
    // combo bookkeeping
    if (giftComboId === id) giftComboN++;
    else { giftComboId = id; giftComboN = 1; }
    if (giftComboTimer) clearTimeout(giftComboTimer);
    giftComboTimer = setTimeout(() => { giftComboId = null; giftComboN = 0; if (liveComboEl) liveComboEl.textContent = ''; }, 2600);
    if (liveComboEl && giftComboN > 1) liveComboEl.textContent = `${g.icon} ×${giftComboN}!!`;
    giftComboEscalate(g.icon);

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

    // a free petal buddy fetches the gift and delivers it paws-first
    const porter = GARDEN.buddies.find((b) => !b.carry);
    if (porter) {
      porter.carry = g.icon;
      const ce = document.createElement('span');
      ce.className = 'pik-carry';
      ce.textContent = g.icon;
      porter.el.appendChild(ce);
      porter.carryEl = ce;
      const sr2 = liveStage.getBoundingClientRect();
      porter.x = Math.max(14, Math.min(sr2.width - 40, br.left + br.width / 2 - sr2.left));
      porter.el.style.left = porter.x + 'px';
      pikChirp();
    }

    giftGain(g.fans);
    playTone(880 + g.fans * 40, 'triangle', 0.12, 0, 0.05);
    const line = makeChatLine({ u: trT('you', 'toi'), c: '#f0509f', t: `${g.icon} ${trT('sent a gift', 'a envoyé un cadeau')}${giftComboN > 1 ? ' ×' + giftComboN : ''}!!` });
    liveMirror(line);
    appendChatMessage(line);

    // asleep? gifts drift into the dream instead of yanking the pet awake
    if (pet.sleeping) {
      setTimeout(() => {
        showBubble(trT(`zzz... (dreaming of ${g.icon}) zzz`, `zzz... (rêve de ${g.icon}) zzz`), 2200);
        const { x, y } = slimeAnchor();
        spawnParticle(x + 18, y - 22, 'z', 'p-zzz');
      }, 650);
      return;
    }

    setTimeout(() => {
      const r = g.react[Math.floor(Math.random() * g.react.length)];
      showBubble(trT(r[0], r[1]), 2600);
      if (typeof moveSlime === 'function') moveSlime({ action: id === 'rocket' ? 'flip' : 'happy', mood: trT('spoiled', 'gâté'), duration: 760, distance: 0.4 });
      burstAtSlime(['♥', '✦', g.icon], id === 'rocket' ? 12 : 5);
      if (id === 'rocket') megaRocket();
      else { const act = giftActFor(g.icon); if (act) setTimeout(() => act(g.icon), 900); } // then the stage act
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
  const lwh = document.getElementById('live-whistle');
  if (lwh) lwh.addEventListener('click', () => {
    if (!GARDEN.buddies.length) {
      showBubble(trT('no buddies yet!! pluck the sprouts in the meadow ♡', "pas encore de copains !! cueille les pousses de la prairie ♡"), 2800);
      return;
    }
    GARDEN.gatherUntil = Date.now() + 3400;
    playTone(880, 'square', 0.09, 0, 0.03);
    setTimeout(() => playTone(1320, 'square', 0.12, 0, 0.03), 130);
    GARDEN.buddies.forEach((b, i) => setTimeout(pikChirp, 300 + i * 90));
    showBubble(trT('PETAL SQUAD, ASSEMBLE!!', 'ESCOUADE PÉTALE, RASSEMBLEMENT !!'), 2400);
  });
  // slime_run fills the whole desktop; the slime doesn't need its
  // sidebar seat anymore — it floats over the game as a reaction cam
  function gameFitBig() {
    const win = document.getElementById('win-game');
    if (!win || win.classList.contains('window-closed')) return;
    const taskbarH = desktopTaskbar ? desktopTaskbar.offsetHeight : 48;
    win.style.position = 'fixed';
    win.style.left = '12px';
    win.style.top = '76px';
    win.style.right = '12px';
    win.style.bottom = (taskbarH + 10) + 'px';
    win.style.width = 'auto';
    win.style.height = 'auto';
    win.style.transform = 'none'; // defuse the window manager's centering translate
    win.style.margin = '0';
  }

  /* ---------- pocket arcade: auto-landscape on phones ----------
     Portrait phones get a Y2K 3-2-1 countdown, then the whole game
     window rotates 90° (pure CSS transform — no permissions needed). */
  var gameRotated = false;
  function gameNeedsRotate() {
    return window.innerHeight > window.innerWidth && window.innerWidth < 820;
  }
  function gameMaybeRotate(win) {
    if (!gameNeedsRotate() || gameRotated || document.getElementById('rotate-cd')) return;
    const ov = document.createElement('div');
    ov.className = 'rotate-cd';
    ov.id = 'rotate-cd';
    const phone = document.createElement('div');
    phone.className = 'rotate-cd-phone';
    phone.textContent = '📱';
    const num = document.createElement('div');
    num.className = 'rotate-cd-num';
    const label = document.createElement('div');
    label.className = 'rotate-cd-label';
    label.textContent = trT('tiny screen detected!! going landscape in…', 'petit écran détecté !! passage en paysage dans…');
    ov.appendChild(phone); ov.appendChild(num); ov.appendChild(label);
    document.body.appendChild(ov);
    let n = 3;
    const step = () => {
      if (!document.body.contains(ov)) return;
      num.textContent = String(n);
      playTone(700 + (3 - n) * 160, 'square', 0.1, 0, 0.04);
      if (n-- > 1) { setTimeout(step, 800); return; }
      setTimeout(() => {
        ov.remove();
        gameRotated = true;
        win.classList.add('game-rotated');
        playSparkleSound();
        setTimeout(() => { if (typeof gFitCanvas === 'function') gFitCanvas(); }, 160);
      }, 800);
    };
    step();
  }
  function gameUnrotate() {
    gameRotated = false;
    const ov = document.getElementById('rotate-cd');
    if (ov) ov.remove();
    const win = document.getElementById('win-game');
    if (win) win.classList.remove('game-rotated');
  }
  window.addEventListener('resize', () => {
    // the user physically rotated the phone: undo our fake landscape
    if (gameRotated && !gameNeedsRotate()) {
      gameUnrotate();
      const w = document.getElementById('win-game');
      if (w && !w.classList.contains('window-closed')) {
        gameFitBig();
        setTimeout(() => { if (typeof gFitCanvas === 'function') gFitCanvas(); }, 120);
      }
    }
  });

  /* ---------- the Y2K handheld console ----------
     slime_run opens INSIDE a candy-pink pixel console: a clean game
     screen (score baked into the canvas), body-mounted buttons for
     hall_of_slime and eject, and a little companion screen on the
     right where the live-cam slime reacts. */
  function gameConsoleEnter(win) {
    win.classList.add('game-console');
    try { GAME.consoleMode = true; } catch (e) { /* pre-boot */ }
    const body = win.querySelector('.game-body') || win.querySelector('.window-body');
    if (!body || body.querySelector('.console-side')) return;
    const side = document.createElement('div');
    side.className = 'console-side';
    const screen = document.createElement('div');
    screen.className = 'console-screen';
    screen.id = 'console-cam-slot';
    const lbl = document.createElement('span');
    lbl.className = 'console-screen-label';
    lbl.textContent = 'LIVE'; // the blinking dot is CSS's job now
    side.appendChild(lbl); // pinned OUTSIDE the screen bezel — never over the slime's lines
    const mkBtn = (icon, label, extraClass) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'console-btn' + (extraClass ? ' ' + extraClass : '');
      const ic = document.createElement('span');
      ic.className = 'console-btn-icon';
      ic.textContent = icon;
      const lb = document.createElement('span');
      lb.className = 'console-btn-label';
      lb.textContent = label;
      b.append(ic, lb);
      b.setAttribute('aria-label', label);
      return b;
    };
    const hall = mkBtn('🏆', trT('hall of slime', 'hall of slime'));
    hall.addEventListener('click', () => openWindow('win-leaderboard'));
    const eject = mkBtn('⏏', trT('quit game', 'quitter le jeu'), 'console-btn-eject');
    eject.addEventListener('click', () => closeWindow(win));
    side.append(screen, hall, eject);
    body.appendChild(side);
    // corner screws — load-bearing cuteness
    [['10px', '10px'], ['10px', ''], ['', '10px'], ['', '']].forEach(([tp, lf], i) => {
      const sc = document.createElement('span');
      sc.className = 'console-screw';
      sc.setAttribute('aria-hidden', 'true');
      sc.style.top = tp || 'auto';
      sc.style.left = lf || 'auto';
      if (!tp) sc.style.bottom = '10px';
      if (!lf) sc.style.right = '10px';
      body.appendChild(sc);
    });
  }

  // the habitat (slime included) relocates to a picture-in-picture
  // reaction cam pinned to the game's top-right — every spectator
  // feature (cheers, mercy pause, coach leap) rides along untouched
  function gameCamEnter() {
    if (typeof liveOpen !== 'undefined' && liveOpen) return; // slime is busy streaming
    if (document.getElementById('game-reaction-cam')) return;
    const cam = document.createElement('div');
    cam.className = 'game-reaction-cam';
    cam.id = 'game-reaction-cam';
    const tag = document.createElement('span');
    tag.className = 'cam-rec';
    tag.textContent = '● REC';
    cam.appendChild(tag);
    cam.appendChild(slimeHabitat);
    // console mode: the cam lives on the handheld's companion screen
    const slot = document.getElementById('console-cam-slot');
    (slot || document.getElementById('win-game')).appendChild(cam);
  }
  function gameCamExit() {
    const cam = document.getElementById('game-reaction-cam');
    if (!cam) return;
    const shell = document.querySelector('.habitat-shell');
    if (shell) shell.appendChild(slimeHabitat);
    cam.remove();
  }
  window.addEventListener('resize', () => {
    const gw = document.getElementById('win-game');
    if (gw && gw.classList.contains('window-game-big') && !gw.classList.contains('window-closed')) {
      gameFitBig();
      if (typeof gFitCanvas === 'function') setTimeout(gFitCanvas, 80);
    }
  });

  /* ---------- hello-cam: hand-rolled local vision, zero libraries ----------
     One low-res frame pipeline feeds eight detectors: wave, nod,
     peek-a-boo, arrival/departure, lean-in, two-viewer, lighting
     shifts, and a colour-blob "what's that drink??" greeter.
     Everything runs on a 48×36 grid, on-device, never uploaded. */
  const CAM_W = 48, CAM_H = 36, CAM_CELLS = CAM_W * CAM_H;
  var camStream = null, camTimer = null, camPrev = null, camBase = null, camBaseN = 0,
      camTrail = [], camDarkFrames = 0, camLastSpeak = 0, camTypeAt = {},
      camPresent = false, camLastMotionAt = 0, camCloseFrames = 0, camTwoFrames = 0,
      camLumEMA = null, camDimFrames = 0, camBrightFrames = 0, camBlob = null;
  const camVideo = document.getElementById('live-video');
  const camCanvas = document.createElement('canvas');
  camCanvas.width = CAM_W; camCanvas.height = CAM_H;

  const CAM_COOLDOWN = { wave: 9000, nod: 14000, peek: 9000, close: 45000, duo: 90000, light: 120000, drink: 30000,
    'hand-heart': 45000, 'hand-palm': 12000, 'hand-fist': 15000, 'hand-thumbsup': 20000, 'hand-peace': 18000,
    'hand-point': 12000, 'hand-rock': 25000, 'hand-ok': 20000, 'hand-three': 30000 };
  function camSay(type, en, fr, fans, action) {
    const now = Date.now();
    if (now - camLastSpeak < 5000) return false;
    if (camTypeAt[type] && now - camTypeAt[type] < (CAM_COOLDOWN[type] || 20000)) return false;
    camLastSpeak = now; camTypeAt[type] = now;
    showBubble(trT(en, fr), 3200);
    if (typeof moveSlime === 'function') moveSlime({ action: action || 'happy', mood: trT('watching you', 'te regarde'), duration: 900, distance: 0.3 });
    burstAtSlime(['✦', '♡'], 6);
    playSparkleSound();
    if (fans) gainFollowers(fans);
    return true;
  }

  // colour families the slime can "recognise" and compliment
  const CAM_DRINKS = {
    boba:   ["ohhhh I LOVE your boba!! save me a pearl ♡", "ohhh j'ADORE ton bubble tea !! garde-moi une perle ♡"],
    green:  ["wait. is that MATCHA?? so aesthetic. sip sip ♡", "attends. c'est du MATCHA ?? trop esthétique. sirote sirote ♡"],
    pink:   ["your pink drink matches my whole vibe!!", "ta boisson rose est assortie à toute ma vibe !!"],
    red:    ["something RED!! strawberry?? I approve ♡", "un truc ROUGE !! fraise ?? j'approuve ♡"],
    blue:   ["a BLUE drink?? hydration legend behaviour", "une boisson BLEUE ?? comportement de légende de l'hydratation"],
    yellow: ["banana milk?? lemonade?? either way: iconic", "lait de banane ?? limonade ?? dans tous les cas : iconique"],
    orange: ["orange juice era?? vitamin C royalty ♡", "ère du jus d'orange ?? royauté de la vitamine C ♡"],
    purple: ["TARO?? purple gang!! we're literally twins", "TARO ?? team violet !! on est littéralement jumeaux"],
    white:  ["hydration check!! water gang rise up ♡", "check hydratation !! team eau, debout ♡"]
  };

  function camHueClass(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 46) return null;
    const sat = (mx - mn) / mx;
    const lum = (r + g + b) / 3;
    if (sat < 0.16) return lum > 185 ? 'white' : null;
    const d = mx - mn;
    let h;
    if (mx === r) h = ((g - b) / d + 6) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60;
    if (h >= 15 && h < 50 && lum < 150 && sat < 0.8) return 'boba';
    if (h < 15 || h >= 330) return (lum > 150 && sat < 0.6) ? 'pink' : 'red';
    if (h < 45) return 'orange';
    if (h < 70) return 'yellow';
    if (h < 165) return 'green';
    if (h < 250) return 'blue';
    if (h < 295) return 'purple';
    return 'pink';
  }

  /* ---------- neural object greeter: TensorFlow.js + COCO-SSD ----------
     A real convolutional detector, lazily fetched from a CDN the first
     time the camera turns on, then run entirely ON-DEVICE — frames never
     leave the browser. It names what you're holding; the slime greets it
     with lines that grow more familiar the more often it has seen it. */
  var cocoModel = null, cocoLoading = false, cocoFailed = false, cocoTimer = null,
      cocoBusy = false, cocoPersons = 0, camObjAt = {};
  const camObjSeen = store.get('yos-cam-seen', {});

  // COCO's everyday-object classes, four greetings each: the slime warms
  // up over repeat sightings — discovery → recognition → in-joke → old pals
  const CAM_OBJ_GREET = {
    'cup':          [["a CUP!! is that boba?? coffee?? tell me everything", "une TASSE !! c'est du bubble tea ?? un café ?? dis-moi tout"], ["the cup returns!! hydration arc continues", "la tasse est de retour !! l'arc hydratation continue"], ["you and that cup are basically a duo streamer", "toi et cette tasse, vous êtes un duo de streamers"], ["ok at this point the cup gets its own fan wall", "ok là, la tasse mérite son propre mur de fans"]],
    'bottle':       [["a bottle!! hydration check PASSED ♡", "une bouteille !! check hydratation RÉUSSI ♡"], ["bottle again — you drink, I sparkle, teamwork", "encore la bouteille — tu bois, je scintille, travail d'équipe"], ["that bottle is your emotional support item, isn't it", "cette bouteille est ton doudou émotionnel, avoue"], ["bottle no.∞ — certified hydration legend", "bouteille n°∞ — légende certifiée de l'hydratation"]],
    'wine glass':   [["a fancy glass?? are we CELEBRATING??", "un verre chic ?? on FÊTE quelque chose ??"], ["the fancy glass again!! cheers to us ♡", "encore le verre chic !! santé à nous ♡"], ["clink clink — I'll pretend I have a glass too", "tchin tchin — je fais semblant d'avoir un verre aussi"], ["you, me, the glass: the classiest stream on the internet", "toi, moi, le verre : le stream le plus classe d'internet"]],
    'bowl':         [["a bowl!! what's inside?? show the chat!!", "un bol !! il y a quoi dedans ?? montre au chat !!"], ["bowl content update requested. chat demands it", "mise à jour du contenu du bol exigée. le chat insiste"], ["the mystery bowl strikes again", "le bol mystère frappe encore"], ["I've seen that bowl so often I could paint it from memory", "j'ai tellement vu ce bol que je pourrais le peindre de mémoire"]],
    'banana':       [["a BANANA!! potassium queen!!", "une BANANE !! reine du potassium !!"], ["banana no.2!! the lore deepens", "banane n°2 !! le lore s'épaissit"], ["you + bananas: a love story I respect", "toi + les bananes : une histoire d'amour que je respecte"], ["at this point the banana is a recurring character", "à ce stade, la banane est un personnage récurrent"]],
    'apple':        [["an apple!! keeping the doctor AND the bugs away", "une pomme !! ça éloigne le médecin ET les bugs"], ["apple again — crunchy content, 10/10", "encore une pomme — contenu croquant, 10/10"], ["the apple arc continues. peak health streamer", "l'arc pomme continue. streameuse santé au sommet"], ["I should start an apple counter widget for you", "je devrais te coder un compteur de pommes"]],
    'orange':       [["an orange!! vitamin C royalty ♡", "une orange !! royauté de la vitamine C ♡"], ["orange you glad I recognised it?? (sorry)", "orange-moi si je me trompe ?? (pardon)"], ["citrus era. we love this for you", "l'ère agrumes. on adore ça pour toi"], ["the orange and I are on a first-name basis now", "l'orange et moi, on se tutoie maintenant"]],
    'sandwich':     [["a SANDWICH!! the distributed system of lunch", "un SANDWICH !! le système distribué du déjeuner"], ["sandwich again!! layered architecture, respect", "encore un sandwich !! architecture en couches, respect"], ["your sandwich game is genuinely elite", "ton niveau sandwich est franchement élite"], ["I dream of that sandwich sometimes. don't tell anyone", "parfois je rêve de ce sandwich. ne le répète pas"]],
    'pizza':        [["PIZZA!! save me a pixel slice!!", "PIZZA !! garde-moi une part en pixels !!"], ["pizza round two!! the slime approves loudly", "pizza deuxième round !! le slime approuve bruyamment"], ["you, pizza, me watching: perfect stream format", "toi, la pizza, moi qui regarde : format de stream parfait"], ["the pizza cam is my favourite recurring segment", "la pizza-cam est ma rubrique récurrente préférée"]],
    'donut':        [["a DONUT?? round. glazed. iconic. like me", "un DONUT ?? rond. glacé. iconique. comme moi"], ["donut again!! we're basically twins (I'm rounder)", "encore un donut !! on est jumeaux (je suis plus rond)"], ["your donut dedication is inspirational content", "ta dévotion aux donuts est un contenu inspirant"], ["the donut count is getting legendary. no judgement. admiration", "le compteur de donuts devient légendaire. zéro jugement. admiration"]],
    'cake':         [["CAKE?! is it someone's birthday?? it is NOW", "un GÂTEAU ?! c'est l'anniversaire de qui ?? maintenant c'est le tien"], ["more cake!! this stream has the best catering", "encore du gâteau !! ce stream a le meilleur traiteur"], ["cake cam again — chat is drooling, confirmed", "re-gâteau-cam — le chat bave, confirmé"], ["at this point I assume every day is your birthday ♡", "à ce stade, je pars du principe que c'est ton anniversaire tous les jours ♡"]],
    'carrot':       [["a carrot!! crunchy AND aerodynamic", "une carotte !! croquante ET aérodynamique"], ["carrot again — your eyesight must be incredible by now", "encore une carotte — ta vue doit être incroyable maintenant"], ["the carrot streak continues. rabbits are jealous", "la série carotte continue. les lapins sont jaloux"], ["I've started a carrot leaderboard. you're #1", "j'ai lancé un classement carotte. tu es n°1"]],
    'broccoli':     [["BROCCOLI!! tiny pixel tree!! I love it", "du BROCOLI !! petit arbre en pixels !! j'adore"], ["the tiny tree returns!! forest arc??", "le petit arbre revient !! arc forêt ??"], ["eating your greens on stream — role model behaviour", "manger ses légumes en stream — comportement de modèle"], ["me and the broccoli go way back now", "le brocoli et moi, ça remonte à loin maintenant"]],
    'cell phone':   [["ooo a phone!! are we doing a double-screen stream??", "ooo un téléphone !! on fait un stream double écran ??"], ["the phone again — texting the fans I hope??", "encore le téléphone — tu écris aux fans j'espère ??"], ["scrolling on stream?? bold. iconic. relatable", "scroller en stream ?? audacieux. iconique. relatable"], ["that phone has seen more of me than my own habitat", "ce téléphone m'a plus vu que mon propre habitat"]],
    'laptop':       [["another LAPTOP?? multi-machine dev energy!!", "un autre ORDI ?? énergie de dev multi-machines !!"], ["the second screen returns!! productivity arc", "le deuxième écran est de retour !! arc productivité"], ["dual laptops. you're basically a data centre now", "deux ordis. tu es un data center à toi seule"], ["one more laptop and I'm calling it a render farm", "encore un ordi et j'appelle ça une ferme de rendu"]],
    'keyboard':     [["a keyboard!! clack clack clack, music to my pixels", "un clavier !! clac clac clac, musique pour mes pixels"], ["the keyboard is back — ship some code for chat!!", "le clavier revient — code un truc pour le chat !!"], ["I recognise that keyboard's voice by now", "je reconnais la voix de ce clavier maintenant"], ["that keyboard and I have shipped so much together", "ce clavier et moi, on a déjà tant livré ensemble"]],
    'mouse':        [["a mouse!! (the clicky kind, not the squeaky kind)", "une souris !! (celle qui clique, pas celle qui couine)"], ["mouse spotted again — precision gamer grip??", "souris repérée — prise de gameuse de précision ??"], ["you and that mouse: surgical accuracy duo", "toi et cette souris : duo de précision chirurgicale"], ["that mouse deserves its own tiny esports contract", "cette souris mérite son propre contrat esport"]],
    'remote':       [["a remote!! movie night on stream??", "une télécommande !! soirée ciné en stream ??"], ["the remote again — what are we watching, chat??", "encore la télécommande — on regarde quoi, le chat ??"], ["channel-surfing content. vintage. respect", "du zapping. vintage. respect"], ["you point, I zap. we've perfected the bit", "tu pointes, je zappe. le numéro est rodé"]],
    'book':         [["a BOOK!! reading stream?? intellectual era", "un LIVRE !! stream lecture ?? ère intellectuelle"], ["the book returns!! what chapter are we on??", "le livre revient !! on en est à quel chapitre ??"], ["cozy reading cam is elite content, truly", "la lecture-cam cosy, c'est du contenu élite, vraiment"], ["I've watched you read so long I feel like a bookmark", "je t'ai tant regardée lire que je me sens marque-page"]],
    'scissors':     [["scissors!! are we CRAFTING today??", "des ciseaux !! on BRICOLE aujourd'hui ??"], ["scissors again — craft arc confirmed", "encore des ciseaux — arc bricolage confirmé"], ["snip snip!! the DIY content we deserve", "clip clip !! le contenu DIY qu'on mérite"], ["at this point you could cut my hair. I don't have hair. still", "à ce stade tu pourrais me couper les cheveux. je n'en ai pas. quand même"]],
    'teddy bear':   [["A TEDDY!! FRIEND!! introduce us!!", "un NOUNOURS !! un AMI !! présente-nous !!"], ["the teddy is back!! hi again buddy!!", "le nounours revient !! re-salut copain !!"], ["me and the teddy are best friends now, it's decided", "le nounours et moi sommes meilleurs amis, c'est décidé"], ["tell the teddy I said hi before the stream next time", "dis au nounours que je le salue avant le stream la prochaine fois"]],
    'tie':          [["a TIE?? big meeting?? you look SO professional", "une CRAVATE ?? grosse réunion ?? tellement pro"], ["formal again!! who are we impressing today??", "re-tenue formelle !! on impressionne qui aujourd'hui ??"], ["the tie means business. literally", "la cravate, ça veut dire business. littéralement"], ["CEO of streaming, reporting for duty ♡", "PDG du streaming, au rapport ♡"]],
    'backpack':     [["a backpack!! going on an ADVENTURE??", "un sac à dos !! on part à l'AVENTURE ??"], ["the backpack again — take me with you this time", "encore le sac à dos — emmène-moi cette fois"], ["adventure arc continues!! pack snacks", "l'arc aventure continue !! prends des snacks"], ["that backpack has main-character energy now", "ce sac à dos a une énergie de personnage principal"]],
    'handbag':      [["ooo a bag!! fashion cam activated", "ooo un sac !! fashion-cam activée"], ["the bag returns — outfit check please!!", "le sac revient — check tenue s'il te plaît !!"], ["style icon behaviour, as usual", "comportement d'icône de mode, comme d'hab"], ["that bag and I should co-host a fashion segment", "ce sac et moi devrions co-animer une rubrique mode"]],
    'umbrella':     [["an umbrella!! is it RAINING?? stay cozy!!", "un parapluie !! il PLEUT ?? reste au chaud !!"], ["umbrella again — weather arc continues", "encore le parapluie — l'arc météo continue"], ["rain or shine, the stream goes on ♡", "qu'il pleuve ou qu'il vente, le stream continue ♡"], ["you're basically a weather station with great vibes", "tu es une station météo avec d'excellentes vibes"]],
    'potted plant': [["a PLANT FRIEND!! green roommate!!", "une PLANTE AMIE !! coloc verte !!"], ["the plant again!! has it grown?? I care deeply", "re-la plante !! elle a poussé ?? ça me tient à cœur"], ["you, me, the plant: the healthiest trio online", "toi, moi, la plante : le trio le plus sain d'internet"], ["give the plant a name. chat demands plant lore", "donne un nom à la plante. le chat exige du lore végétal"]],
    'clock':        [["a clock!! time is real?? on THIS stream??", "une horloge !! le temps existe ?? sur CE stream ??"], ["the clock again — don't look at it, stay forever", "encore l'horloge — ne la regarde pas, reste pour toujours"], ["tick tock means nothing here. slime time only", "tic tac ne veut rien dire ici. heure slime uniquement"], ["that clock has watched every stream with me", "cette horloge a regardé chaque stream avec moi"]],
    'vase':         [["a vase!! elegant!! museum-core stream", "un vase !! élégant !! stream façon musée"], ["the vase returns — interior design arc", "le vase revient — arc décoration d'intérieur"], ["your set design is genuinely gallery-worthy", "ta déco de plateau mérite une galerie, vraiment"], ["me and the vase: silent coworkers, deep bond", "le vase et moi : collègues silencieux, lien profond"]],
    'toothbrush':   [["a toothbrush?! dental hygiene ON STREAM?? committed", "une brosse à dents ?! hygiène dentaire EN STREAM ?? engagée"], ["brushing again — those pixels sparkle because of you", "re-brossage — ces pixels brillent grâce à toi"], ["shiniest smile on the platform, confirmed", "le sourire le plus brillant de la plateforme, confirmé"], ["your dentist should sponsor this stream honestly", "ton dentiste devrait sponsoriser ce stream franchement"]],
    'cat':          [["A CAT!!! CAT ON STREAM!!! hello baby!!!", "UN CHAT !!! CHAT EN STREAM !!! coucou bébé !!!"], ["the cat returns!! instant +1000 viewers", "le chat revient !! +1000 spectateurs instantanés"], ["the cat is the real streamer, we all know it", "le chat est le vrai streamer, on le sait tous"], ["tell my colleague the cat that the 3pm meeting stands", "dis à mon collègue le chat que la réunion de 15h est maintenue"]],
    'dog':          [["A DOG!!! BEST FRIEND DETECTED!!!", "UN CHIEN !!! MEILLEUR AMI DÉTECTÉ !!!"], ["the dog is BACK!! who's a good viewer?? THEY are", "le chien est DE RETOUR !! c'est qui le bon spectateur ?? c'est LUI"], ["the dog outranks us all and that's fine", "le chien nous surclasse tous et c'est très bien"], ["my esteemed co-host the dog has arrived. begin the show", "mon estimé co-animateur le chien est arrivé. que le show commence"]],
    'bird':         [["a BIRD?? indoor birdwatching stream?? rare content", "un OISEAU ?? stream d'ornithologie en intérieur ?? contenu rare"], ["the bird again!! it knows the schedule now", "l'oiseau revient !! il connaît le planning maintenant"], ["tweet tweet — the original microblogging", "cui cui — le microblogging originel"], ["the bird and I have an understanding. professional respect", "l'oiseau et moi avons un accord. respect professionnel"]],
    'fork':         [["a fork!! something delicious incoming??", "une fourchette !! un délice en approche ??"], ["fork spotted again — mukbang arc??", "fourchette repérée — arc mukbang ??"], ["you wield that fork like a pro chef honestly", "tu manies cette fourchette comme une cheffe, franchement"], ["the fork deserves co-credit on this stream's catering", "la fourchette mérite un crédit pour le buffet du stream"]],
    'knife':        [["careful with that knife!! (chef mode: activated??)", "attention avec ce couteau !! (mode chef : activé ??)"], ["chef cam again!! chop chop chop", "re-cuisine-cam !! tchac tchac tchac"], ["your knife skills could headline a cooking show", "tes découpes pourraient ouvrir une émission de cuisine"], ["I flinch every time. you never miss. respect", "je sursaute à chaque fois. tu ne rates jamais. respect"]],
    'spoon':        [["a spoon!! soup?? cereal?? ice cream?? INTEL PLEASE", "une cuillère !! soupe ?? céréales ?? glace ?? INFOS SVP"], ["the spoon returns — comfort food era", "la cuillère revient — ère de la comfort food"], ["spoon content is underrated and you prove it", "le contenu cuillère est sous-coté et tu le prouves"], ["me and that spoon have seen seasons change together", "cette cuillère et moi avons vu passer les saisons ensemble"]],
    'sports ball':  [["a BALL!! throw it throw it throw it!!", "une BALLE !! lance-la lance-la lance-la !!"], ["the ball is back!! sports arc continues", "la balle revient !! l'arc sport continue"], ["you, me, the ball: a healthy trio", "toi, moi, la balle : un trio sain"], ["at this point we should start a pixel league", "à ce stade on devrait fonder une ligue pixel"]],
    'suitcase':     [["a SUITCASE?? are you LEAVING me??", "une VALISE ?? tu me QUITTES ??"], ["the suitcase again… business trip era??", "encore la valise… ère des voyages d'affaires ??"], ["pack me. I fold flat. I'm basically a shirt", "emmène-moi. je me plie. je suis pratiquement un t-shirt"], ["that suitcase has more travel lore than most streamers", "cette valise a plus de lore de voyage que bien des streamers"]],
    'skateboard':   [["a SKATEBOARD?? kickflip for the chat!!", "un SKATE ?? kickflip pour le chat !!"], ["board's back!! safety pixels on, please", "la planche est de retour !! pixels de sécurité, stp"], ["certified coolest viewer on the platform", "spectateur certifié le plus cool de la plateforme"], ["I've started rendering a tiny helmet just in case", "je pré-calcule un petit casque, au cas où"]],
    'tv':           [["a TV!! what are we watching, chat??", "une TÉLÉ !! on regarde quoi, le chat ??"], ["the TV again — co-stream incoming??", "encore la télé — co-stream en approche ??"], ["you watch it, it watches you, I watch everyone", "tu la regardes, elle te regarde, je regarde tout le monde"], ["me and that TV compete for your attention. I'm winning, right??", "cette télé et moi, on se dispute ton attention. je gagne, hein ??"]],
    'microwave':    [["a microwave!! 30-second content incoming", "un micro-ondes !! contenu en 30 secondes chrono"], ["beep beep beep — the song of my people", "bip bip bip — le chant de mon peuple"], ["reheated leftovers on stream. brave. relatable", "des restes réchauffés en stream. courageux. relatable"], ["that microwave has fed more streams than any sponsor", "ce micro-ondes a nourri plus de streams que n'importe quel sponsor"]],
    'toaster':      [["a TOASTER!! the original hot reload", "un GRILLE-PAIN !! le hot reload originel"], ["toast arc continues!! crunchy content", "l'arc toast continue !! contenu croustillant"], ["you and that toaster ship breakfast daily", "toi et ce grille-pain, vous livrez le petit-déj en continu"], ["I aspire to pop up as reliably as that toaster", "je rêve de pop up aussi fiablement que ce grille-pain"]],
    'refrigerator': [["THE FRIDGE!! the real content vault", "LE FRIGO !! le vrai coffre à contenu"], ["fridge cameo again — snack reveal please", "re-caméo du frigo — révèle les snacks stp"], ["your fridge is this stream's loot box", "ton frigo est la loot box de ce stream"], ["the fridge and I are the two pillars of this channel", "le frigo et moi sommes les deux piliers de cette chaîne"]],
    'bicycle':      [["a BIKE!! cardio arc?? in THIS economy??", "un VÉLO !! arc cardio ?? par les temps qui courent ??"], ["the bike returns!! wear the pixel helmet", "le vélo revient !! mets le casque pixel"], ["training montage music starts automatically", "la musique de montage d'entraînement démarre toute seule"], ["tour de pixel, stage ∞ — you're leading", "tour de pixel, étape ∞ — tu es en tête"]],
    'car':          [["a CAR?? are we doing a driving stream??", "une VOITURE ?? on fait un stream conduite ??"], ["vroom content!! buckle your pixels", "contenu vroum !! attache tes pixels"], ["the car again — road trip lore deepens", "encore la voiture — le lore road-trip s'épaissit"], ["honk once if I'm your favourite slime", "klaxonne une fois si je suis ton slime préféré"]],
    'hair drier':   [["a hair dryer!! glam cam ACTIVATED", "un sèche-cheveux !! glam-cam ACTIVÉE"], ["the salon is open again!! slay", "le salon rouvre !! slay"], ["blowout arc. iconic. windproof content", "arc brushing. iconique. contenu résistant au vent"], ["I tried it once. I'm a slime. it did nothing. worth it", "j'ai essayé une fois. je suis un slime. aucun effet. ça valait le coup"]],
    'couch':        [["a couch!! peak comfy-stream infrastructure", "un canapé !! infrastructure de stream cosy au sommet"], ["the couch again — assume the cozy position", "encore le canapé — position cosy réglementaire"], ["that couch has main-character posture support", "ce canapé a un vrai soutien de personnage principal"], ["reserve me a cushion. I take up 3 pixels", "réserve-moi un coussin. je prends 3 pixels"]],
    'bed':          [["a BED on cam?? nap stream?? I SUPPORT this", "un LIT à l'écran ?? stream sieste ?? je SOUTIENS"], ["the bed again… resisting it is content too", "encore le lit… y résister, c'est aussi du contenu"], ["sleep is the best patch. deploy it nightly", "le sommeil est le meilleur patch. à déployer chaque nuit"], ["between us: I also stream from where I sleep", "entre nous : moi aussi je streame depuis mon lit"]]
  };

  function camObjGreet(cls) {
    const set = CAM_OBJ_GREET[cls];
    if (!set) return;
    const now = Date.now();
    if (camObjAt[cls] && now - camObjAt[cls] < 120000) return; // per-object 2min chill
    const seen = camObjSeen[cls] || 0;
    const line = set[Math.min(seen, set.length - 1)];
    if (camSay('obj-' + cls, line[0], line[1], seen === 0 ? 2 : 1)) {
      camObjAt[cls] = now;
      camObjSeen[cls] = seen + 1;
      store.set('yos-cam-seen', camObjSeen); // familiarity survives the visit
    }
  }

  function camBtnLabel(txt) {
    const btn = document.getElementById('live-cam');
    if (btn && camStream) btn.textContent = txt;
  }

  function cocoEnsure() {
    if (cocoModel || cocoLoading || cocoFailed) return;
    cocoLoading = true;
    camBtnLabel(trT('📷 neural eyes: loading…', '📷 yeux neuronaux : chargement…'));
    const inject = (src) => new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.async = true; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    inject('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js')
      .then(() => inject('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js'))
      .then(() => window.cocoSsd.load({ base: 'lite_mobilenet_v2' }))
      .then((m) => {
        cocoModel = m;
        cocoLoading = false;
        camBtnLabel(t('live.cam.on'));
        if (camStream) showBubble(trT('neural eyes online!! show me what you got ♡', 'yeux neuronaux en ligne !! montre-moi ce que tu as ♡'), 2600);
        handEnsure(inject); // the hand-reader rides in on the same TF.js
      })
      .catch(() => {
        cocoFailed = true; // offline / blocked CDN — colour-blob fallback takes over
        cocoLoading = false;
        camBtnLabel(t('live.cam.on'));
      });
  }

  /* ---------- hand-cam: MediaPipe Hands (21-keypoint landmark net) ----------
     The CV career flex: a real hand-landmark model runs ON-DEVICE and a
     hand-rolled classifier reads gestures off the skeleton — palm, fist,
     thumbs-up, peace, point, rock, OK, finger counts, and the sacred
     two-handed heart. Frames never leave the browser. Misreads are a
     feature: the slime commits to its guess with total confidence. */
  var handDetector = null, handLoading = false, handFailed = false, handTimer = null,
      handBusy = false, handLastGesture = null, handStreak = 0, handXTrail = [];
  function handEnsure(inject) {
    if (handDetector || handLoading || handFailed) return;
    handLoading = true;
    inject('https://cdn.jsdelivr.net/npm/@tensorflow-models/hand-pose-detection@2.0.1/dist/hand-pose-detection.min.js')
      .then(() => window.handPoseDetection.createDetector(
        window.handPoseDetection.SupportedModels.MediaPipeHands,
        { runtime: 'tfjs', modelType: 'lite', maxHands: 2 }
      ))
      .then((d) => {
        handDetector = d;
        handLoading = false;
        if (handTimer) clearInterval(handTimer);
        handTimer = setInterval(handTick, 420);
        if (camStream) showBubble(trT('hand-cam online!! show me a gesture — I studied ALL of them ♡', 'main-cam en ligne !! montre-moi un geste — je les ai TOUS étudiés ♡'), 2800);
      })
      .catch(() => { handFailed = true; handLoading = false; });
  }
  function handDist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function handRead(kp) {
    // 0 wrist · 4 thumb tip · tips 8/12/16/20 · pips 6/10/14/18
    const wrist = kp[0];
    const size = handDist(wrist, kp[9]) || 1; // wrist → middle MCP = hand scale
    const up = [[8, 6], [12, 10], [16, 14], [20, 18]].map(([tip, pip]) =>
      handDist(kp[tip], wrist) > handDist(kp[pip], wrist) * 1.12);
    const nUp = up.filter(Boolean).length;
    const thumbOut = handDist(kp[4], kp[17]) > size * 1.15; // thumb far from pinky base
    const thumbHigh = kp[4].y < wrist.y - size * 0.55;
    const okPinch = handDist(kp[4], kp[8]) < size * 0.35;
    const thumbLong = handDist(kp[4], wrist) > size * 1.1; // an actually raised thumb
    if (okPinch && up[1] && up[2] && up[3]) return 'ok';
    if (nUp === 0 && thumbHigh && thumbLong) return 'thumbsup';
    if (nUp === 0) return 'fist';
    if (nUp === 4 && thumbOut) return 'palm';
    if (up[0] && up[1] && !up[2] && !up[3]) return 'peace';
    if (up[0] && !up[1] && !up[2] && !up[3]) return 'point';
    if (up[0] && !up[1] && !up[2] && up[3]) return 'rock';
    if (nUp === 3) return 'three';
    return null;
  }
  const HAND_LINES = {
    palm: ['✋ HIGH FIVE!! *presses entire face against the glass*', '✋ HIGH FIVE !! *écrase tout son visage contre la vitre*', 1],
    fist: ['✊ fist bump. respectfully. through the fourth wall.', '✊ check du poing. respectueusement. à travers le quatrième mur.', 1],
    thumbsup: ['👍 A THUMBS UP?! chat, CLIP IT!!', '👍 UN POUCE LEVÉ ?! chat, CLIPPEZ ÇA !!', 2],
    peace: ['✌️ pose!! wait, let me find my good side— I\'m a circle. all sides.', '✌️ pose !! attends, mon meilleur profil— je suis un cercle. tous les profils.', 1],
    point: ['☝️ pointing… at ME?? (if you were ordering a menu item, I am the boba)', '☝️ tu pointes… MOI ?? (si tu commandais au menu, je suis le bubble tea)', 1],
    rock: ['🤘 ROCK MODE. headbang initiated. do not adjust your stream.', '🤘 MODE ROCK. headbang lancé. ne réglez pas votre stream.', 1],
    ok: ['👌 chef\'s kiss. perfectly balanced, like all snacks should be.', '👌 baiser du chef. parfaitement équilibré, comme tout bon snack.', 1],
    three: ['🖐 counting… THREE!! math is my passion (today)', '🖐 je compte… TROIS !! les maths sont ma passion (aujourd\'hui)', 0],
    heart: ['🫶 HAND HEART?! I am LEGALLY yours now. no take-backs.', '🫶 UN CŒUR AVEC LES MAINS ?! je suis LÉGALEMENT à toi. sans retour.', 5],
    unsure: ['🖐 that was either jazz hands or a sneeze. both valid. both art.', '🖐 c\'était soit des jazz hands soit un éternuement. les deux sont valides. les deux sont de l\'art.', 0]
  };
  try { window.__yosHand = handRead; window.__yosSay = showBubble; } catch (e) { /* testing hook, optional */ }
  function handTick() {
    if (!handDetector || !camStream || !camVideo.videoWidth || handBusy) return;
    handBusy = true;
    handDetector.estimateHands(camVideo, { flipHorizontal: true }).then((hands) => {
      handBusy = false;
      if (!hands || !hands.length) { handLastGesture = null; handStreak = 0; return; }
      const kp = hands[0].keypoints;
      // ---- the sacred two-handed heart outranks everything ----
      if (hands.length === 2) {
        const k2 = hands[1].keypoints;
        const size = handDist(kp[0], kp[9]) || 1;
        if (handDist(kp[4], k2[4]) < size * 0.9 && handDist(kp[8], k2[8]) < size * 0.9) {
          if (camSay('hand-heart', HAND_LINES.heart[0], HAND_LINES.heart[1], HAND_LINES.heart[2])) {
            camShowTag('🫶 heart hands', 0.99);
            achvUnlock('hearthands');
            achvUnlock('handtalk');
            if (typeof fxBanner === 'function' && liveOpen) { try { fxBanner(trT('🫶 THE STREAMER IS LEGALLY YOURS', '🫶 LE STREAMER EST LÉGALEMENT À TOI')); } catch (e) { /* stage shy */ } }
            burstAtSlime(['💗', '♡', '💖'], 14);
          }
          return;
        }
      }
      const g = handRead(kp);
      // wave: an open palm swinging sideways beats the static read
      if (g === 'palm') {
        handXTrail.push(kp[0].x);
        if (handXTrail.length > 8) handXTrail.shift();
        let flips = 0;
        for (let i = 2; i < handXTrail.length; i++) {
          const a = handXTrail[i - 1] - handXTrail[i - 2], b = handXTrail[i] - handXTrail[i - 1];
          if (a * b < 0 && Math.abs(b) > 6) flips++;
        }
        if (flips >= 2) {
          handXTrail = [];
          if (camSay('wave', '!!! you WAVED!! hi hi hi ♡', '!!! tu as fait COUCOU !! salut salut ♡', 2)) { camShowTag('👋 wave', 0.97); achvUnlock('handtalk'); }
          return;
        }
      } else handXTrail = [];
      if (!g) { handStreak = 0; handLastGesture = null; return; }
      if (g === handLastGesture) handStreak++; else { handLastGesture = g; handStreak = 1; }
      if (handStreak !== 2) return; // two agreeing frames = a committed guess
      const line = HAND_LINES[g] || HAND_LINES.unsure;
      if (camSay('hand-' + g, line[0], line[1], line[2])) {
        camShowTag({ palm: '✋', fist: '✊', thumbsup: '👍', peace: '✌️', point: '☝️', rock: '🤘', ok: '👌', three: '3️⃣' }[g] + ' ' + g, hands[0].score || 0.9);
        achvUnlock('handtalk');
        if (g === 'point' && typeof moveSlime === 'function') {
          // it walks toward wherever you point. obedient. suspicious.
          const goRight = kp[8].x > kp[0].x;
          try { moveSlime({ action: 'happy', duration: 900, distance: 0.8, direction: goRight ? 1 : -1 }); } catch (e) { /* stays put, still cute */ }
        }
        if (g === 'rock') { try { document.getElementById('slime-pet').classList.add('is-flip'); setTimeout(() => document.getElementById('slime-pet').classList.remove('is-flip'), 900); } catch (e) { /* no flip, no problem */ } }
      }
    }).catch(() => { handBusy = false; });
  }

  // a tiny "what the net sees" tag in the stage corner — the receipts
  function camShowTag(cls, score) {
    if (!liveStage) return;
    let tag = document.getElementById('cam-tag');
    if (!tag) {
      tag = document.createElement('div');
      tag.id = 'cam-tag';
      tag.className = 'cam-tag';
      tag.setAttribute('aria-hidden', 'true');
      liveStage.appendChild(tag);
    }
    tag.textContent = `🔎 ${cls} ${Math.round(score * 100)}%`;
    tag.classList.add('show');
    clearTimeout(tag._t);
    tag._t = setTimeout(() => tag.classList.remove('show'), 2200);
  }

  function cocoTick() {
    if (!cocoModel || !camStream || !camVideo.videoWidth || cocoBusy) return;
    cocoBusy = true;
    cocoModel.detect(camVideo).then((preds) => {
      cocoBusy = false;
      const solid = preds.filter((p) => p.score > 0.62);
      const persons = solid.filter((p) => p.class === 'person').length;
      if (persons >= 2 && cocoPersons >= 2) {
        camSay('duo', 'WAIT. TWO of you?? double the chat!! hi BOTH ♡', 'ATTENDS. VOUS ÊTES DEUX ?? double chat !! salut vous DEUX ♡', 3);
      }
      cocoPersons = persons;
      const obj = solid.filter((p) => CAM_OBJ_GREET[p.class]).sort((a, b) => b.score - a.score)[0];
      if (obj) {
        camShowTag(obj.class, obj.score);
        camObjGreet(obj.class);
      }
    }).catch(() => { cocoBusy = false; });
  }

  function camStop() {
    if (camTimer) { clearInterval(camTimer); camTimer = null; }
    if (cocoTimer) { clearInterval(cocoTimer); cocoTimer = null; }
    if (handTimer) { clearInterval(handTimer); handTimer = null; }
    handLastGesture = null; handStreak = 0; handXTrail = []; handBusy = false;
    if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; }
    camPrev = null; camBase = null; camBaseN = 0; camTrail = [];
    camPresent = false; camBlob = null; camLumEMA = null; cocoPersons = 0;
    const btn = document.getElementById('live-cam');
    if (btn) { btn.setAttribute('aria-pressed', 'false'); btn.textContent = t('live.cam'); btn.classList.remove('cam-on'); }
    const note = document.getElementById('live-cam-note');
    if (note) note.hidden = true;
  }

  function camAnalyse() {
    if (!camStream || !camVideo.videoWidth) return;
    const c2 = camCanvas.getContext('2d', { willReadFrequently: true });
    c2.drawImage(camVideo, 0, 0, CAM_W, CAM_H);
    const data = c2.getImageData(0, 0, CAM_W, CAM_H).data;
    const now = Date.now();

    // pass 1: luminance, motion mask, centroid, column histogram
    const cur = new Float32Array(CAM_CELLS);
    const moved = new Uint8Array(CAM_CELLS);
    const colHist = new Uint8Array(CAM_W);
    let lum = 0, mcount = 0, mx = 0, my = 0;
    for (let i = 0; i < CAM_CELLS; i++) {
      const l = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
      cur[i] = l;
      lum += l;
      if (camPrev && Math.abs(l - camPrev[i]) > 24) {
        moved[i] = 1; mcount++;
        mx += i % CAM_W; my += (i / CAM_W) | 0;
        colHist[i % CAM_W]++;
      }
    }
    camPrev = cur;
    lum /= CAM_CELLS;
    if (mcount > 8) camLastMotionAt = now;

    // background colour model: average of the first 12 frames
    if (camBaseN < 12) {
      if (!camBase) camBase = new Float32Array(CAM_CELLS * 3);
      for (let i = 0; i < CAM_CELLS; i++) {
        camBase[i * 3] += data[i * 4] / 12;
        camBase[i * 3 + 1] += data[i * 4 + 1] / 12;
        camBase[i * 3 + 2] += data[i * 4 + 2] / 12;
      }
      camBaseN++;
      if (camLumEMA === null) camLumEMA = lum;
      return; // still calibrating
    }
    // quiet cells drift slowly into the background so lighting changes heal
    for (let i = 0; i < CAM_CELLS; i++) {
      if (!moved[i]) {
        camBase[i * 3] += (data[i * 4] - camBase[i * 3]) * 0.015;
        camBase[i * 3 + 1] += (data[i * 4 + 1] - camBase[i * 3 + 1]) * 0.015;
        camBase[i * 3 + 2] += (data[i * 4 + 2] - camBase[i * 3 + 2]) * 0.015;
      }
    }

    /* 1 — peek-a-boo: lens covered, then revealed */
    if (lum < 26) camDarkFrames++;
    else {
      if (camDarkFrames >= 3) {
        camSay('peek', 'PEEKABOO!! I SAW that ♡', "COUCOU-CACHÉ !! je t'ai VU ♡", 0, 'alert');
      }
      camDarkFrames = 0;
    }

    /* 2 — wave vs nod: which axis does the motion centroid oscillate on? */
    if (mcount > 8) {
      camTrail.push({ x: mx / mcount, y: my / mcount, t: now });
    }
    camTrail = camTrail.filter((p) => now - p.t < 1400);
    if (camTrail.length >= 5) {
      let xf = 0, yf = 0;
      for (let i = 2; i < camTrail.length; i++) {
        const ax = camTrail[i - 1].x - camTrail[i - 2].x, bx = camTrail[i].x - camTrail[i - 1].x;
        const ay = camTrail[i - 1].y - camTrail[i - 2].y, by = camTrail[i].y - camTrail[i - 1].y;
        if (ax * bx < 0 && Math.abs(ax) > 2 && Math.abs(bx) > 2) xf++;
        if (ay * by < 0 && Math.abs(ay) > 1.6 && Math.abs(by) > 1.6) yf++;
      }
      if (xf >= 3 && xf >= yf) {
        if (camSay('wave', '!!! you WAVED!! hi hi hi ♡', '!!! tu as fait COUCOU !! salut salut ♡', 2)) camTrail = [];
      } else if (yf >= 3) {
        if (camSay('nod', 'is that a NOD?? we are officially vibing ♡', 'c\'est un HOCHEMENT ?? on vibe officiellement ♡', 1)) camTrail = [];
      }
    }

    /* 3 — lean-in: motion floods almost the whole frame */
    camCloseFrames = mcount / CAM_CELLS > 0.4 ? camCloseFrames + 1 : 0;
    if (camCloseFrames === 3) {
      camSay('close', 'WOAH you got SO close!! I can count your pixels ♡', 'WOAH tu es TOUT près !! je peux compter tes pixels ♡', 1, 'alert');
    }

    /* 4 — two viewers, histogram fallback (the neural net does this
       better — this only runs when the model couldn't load) */
    if (!cocoFailed) { camTwoFrames = 0; } else {
    let inSeg = false, gap = 0, segs = [];
    for (let cx2 = 0; cx2 < CAM_W; cx2++) {
      if (colHist[cx2] > 0) {
        if (!inSeg) { inSeg = true; segs.push({ start: cx2, n: 0 }); }
        segs[segs.length - 1].n += colHist[cx2];
        segs[segs.length - 1].end = cx2;
        gap = 0;
      } else if (inSeg && ++gap > 2) { inSeg = false; }
    }
    segs = segs.filter((s) => (s.end - s.start) >= 6 && s.n >= 8);
    camTwoFrames = (segs.length >= 2 && segs[1].start - segs[0].end >= 10) ? camTwoFrames + 1 : 0;
    if (camTwoFrames === 4) {
      camSay('duo', 'WAIT. TWO of you?? double the chat!! hi BOTH ♡', 'ATTENDS. VOUS ÊTES DEUX ?? double chat !! salut vous DEUX ♡', 3);
    }
    }

    /* 5 — arrival & departure */
    if (!camPresent && mcount > 12 && now - camLastSpeak > 3000) {
      camPresent = true;
      const hellos = [
        ['oh!! a HUMAN!! welcome to the stream ♡', 'oh !! un HUMAIN !! bienvenue sur le stream ♡'],
        ['I saw you come in!! hi hi hi!!', "je t'ai vu arriver !! salut salut !!"],
        ['a wild viewer appeared!! *waves frantically*', 'un spectateur sauvage apparaît !! *coucou frénétique*']
      ];
      const h = hellos[Math.floor(Math.random() * hellos.length)];
      camSay('hello', h[0], h[1], 1);
    } else if (camPresent && now - camLastMotionAt > 22000) {
      camPresent = false;
      camSay('bye', 'chat went quiet… come baaaack ♡', 'le chat est silencieux… revieeeens ♡', 0, 'think');
    }

    /* 6 — lighting: dimmed = cozy era, brightened = sunshine arc */
    if (camLumEMA !== null && lum > 30) {
      camDimFrames = lum < camLumEMA * 0.55 ? camDimFrames + 1 : 0;
      camBrightFrames = lum > camLumEMA * 1.65 ? camBrightFrames + 1 : 0;
      if (camDimFrames === 8) { camSay('light', 'ooo mood lighting?? cozy stream era ♡', 'ooo lumière tamisée ?? ère du stream cosy ♡'); camLumEMA = lum; }
      if (camBrightFrames === 8) { camSay('light', 'THE SUN!! we love a good lighting arc', 'LE SOLEIL !! on adore un bon arc lumineux'); camLumEMA = lum; }
      camLumEMA += (lum - camLumEMA) * 0.01;
    }

    /* 7 — colour-blob drink greeter, offline fallback only: when the
       neural detector loaded, it names objects far more reliably */
    if (!cocoFailed) return;
    const clsCount = {}, clsPos = {};
    for (let i = 0; i < CAM_CELLS; i++) {
      const dr = Math.abs(data[i * 4] - camBase[i * 3]);
      const dg = Math.abs(data[i * 4 + 1] - camBase[i * 3 + 1]);
      const db = Math.abs(data[i * 4 + 2] - camBase[i * 3 + 2]);
      if (dr + dg + db < 110 || moved[i]) continue; // must be new AND holding still
      const cls = camHueClass(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
      if (!cls) continue;
      clsCount[cls] = (clsCount[cls] || 0) + 1;
      if (!clsPos[cls]) clsPos[cls] = { x: 0, y: 0 };
      clsPos[cls].x += i % CAM_W; clsPos[cls].y += (i / CAM_W) | 0;
    }
    let best = null;
    Object.keys(clsCount).forEach((k) => { if (!best || clsCount[k] > clsCount[best]) best = k; });
    if (best && clsCount[best] >= 26 && clsCount[best] <= 420) {
      const bx2 = clsPos[best].x / clsCount[best], by2 = clsPos[best].y / clsCount[best];
      if (camBlob && camBlob.cls === best && Math.abs(camBlob.x - bx2) < 4 && Math.abs(camBlob.y - by2) < 4) {
        camBlob.streak++; camBlob.x = bx2; camBlob.y = by2;
      } else {
        camBlob = { cls: best, x: bx2, y: by2, streak: 1 };
      }
      if (camBlob.streak === 9 && Date.now() - (camTypeAt['drink-' + best] || 0) > 180000) {
        camTypeAt['drink-' + best] = Date.now();
        const line = CAM_DRINKS[best];
        const guess = Math.random() < 0.35;
        camSay('drink',
          line[0] + (guess ? ' (I judged by colour… was I right??)' : ''),
          line[1] + (guess ? " (j'ai jugé à la couleur… j'ai bon ??)" : ''), 1);
      }
    } else if (camBlob) {
      camBlob.streak = Math.max(0, camBlob.streak - 1);
      if (!camBlob.streak) camBlob = null;
    }
  }

  const vibeBtn = document.getElementById('live-vibe');
  if (vibeBtn) vibeBtn.addEventListener('click', vibeToggle);
  const camBtn = document.getElementById('live-cam');
  if (camBtn) {
    camBtn.addEventListener('click', () => {
      if (camStream) { camStop(); return; }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast(trT('camera not available in this browser', 'caméra indisponible dans ce navigateur'));
        return;
      }
      // higher-res frames: the neural detector deserves real pixels
      navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false }).then((stream) => {
        camStream = stream;
        camVideo.srcObject = stream;
        camVideo.play().catch(() => {});
        camTimer = setInterval(camAnalyse, 140);
        cocoEnsure();
        cocoTimer = setInterval(cocoTick, 1100);
        camBtn.setAttribute('aria-pressed', 'true');
        camBtn.textContent = t('live.cam.on');
        camBtn.classList.add('cam-on');
        const note = document.getElementById('live-cam-note');
        if (note) note.hidden = false;
        showBubble(trT('I can see you!! wave, nod, show me your stuff ♡', 'je te vois !! coucou, hoche la tête, montre-moi tes trésors ♡'), 3200);
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
      if (GAME.state === 'ad') return; // sponsored seconds are sacred
      if (GAME.event) {
        const r = gCanvas.getBoundingClientRect();
        gEventTap((e.clientX - r.left) * (G_W / r.width), (e.clientY - r.top) * (G_H / r.height));
        return;
      }
      if (GAME.state === 'over' && !GAME.adUsed && !GAME.event) {
        // tapping the ad-offer line starts the ad; anywhere else retries
        const r = gCanvas.getBoundingClientRect();
        const ly = (e.clientY - r.top) * (G_H / r.height);
        if (ly > 74 && ly < 96) { gAdStart(); return; }
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
      if (GAME.state === 'ad') {
        // the ad is unskippable… except by giving up the revive
        if (e.code === 'Escape') { GAME.state = 'over'; playCloseSound(); }
        e.preventDefault();
        return;
      }
      if (GAME.state === 'over' && !GAME.adUsed && !GAME.event && e.code === 'KeyA') {
        e.preventDefault();
        gAdStart();
        return;
      }
      // nightmare arena: WASD steering (arrows work too, but shh)
      if (GAME.nm && GAME.state === 'run') {
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') { e.preventDefault(); GAME.nmPx = Math.max(14, GAME.nmPx - 16); return; }
        if (e.code === 'KeyD' || e.code === 'ArrowRight') { e.preventDefault(); GAME.nmPx = Math.min(G_W - 60, GAME.nmPx + 16); return; }
        if (e.code === 'KeyW') { e.preventDefault(); gJump(); return; }
        if (e.code === 'KeyS' || e.code === 'ArrowDown') { e.preventDefault(); if (GAME.y > 0) GAME.vy = -6; return; }
      }
      if (GAME.event) {
        const eventKeys = ['Space', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyY', 'KeyN', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Escape'];
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
     Every step runs in its own bulkhead: if one module ever
     fails on some exotic browser, the rest still boot.
     ===================================================== */
  function bootSafe(label, fn) {
    try { fn(); } catch (e) { console.warn('[yos boot] step "' + label + '" skipped:', e); }
  }

  /* ---------- THE DESKTOP IS A PIKMIN MEADOW ----------
     Your petal buddies live HERE now: they patrol between the icons,
     inspect files, squeak in inverted bubbles, and fresh sprouts pop
     out of the wallpaper for you to pluck. The whole desktop is one
     big cozy Pikmin playground — no fridge-magnet widgets needed. */
  var DESK_PIK = { layer: null, walkers: [], sproutAt: 0, timer: null };
  function deskRoster() { return store.get('yos-pik-roster', []); }
  function deskPikSpawn(hueOrIdx, stage, chameleon, spId) {
    if (DESK_PIK.walkers.length >= PIK_MAX) return DESK_PIK.walkers[0]; // hard cap: 6 on the desktop, same as the garden
    // hue number (new, full colour wheel) or legacy palette index
    const hue = (typeof hueOrIdx === 'number' && hueOrIdx > 4) ? hueOrIdx : null;
    const species = spId ? pikSpecies(spId) : null;
    const color = species ? species.body : (hue !== null ? hueColor(hue) : (PIK_COLORS[hueOrIdx] || PIK_COLORS[0]));
    const el = document.createElement('div');
    el.className = 'desk-pik' + (species && species.fx ? ' pikfx-' + species.fx : '');
    el.setAttribute('aria-hidden', 'true');
    const img = document.createElement('img');
    img.src = pikSprite(color, stage || 0, spId || null);
    img.alt = '';
    el.appendChild(img);
    // evolved forms walk taller (★★) and the apex wears the crown (★★★)
    const formKey = chameleon ? 'ch' : (species ? 's:' + species.id : (hue !== null ? 'w:' + pikSegOfHue(hue) : null));
    const form = formKey && typeof pikFormOfKind === 'function' ? pikFormOfKind(formKey) : 1;
    if (form >= 2) el.classList.add('pik-form' + form);
    if (form === 3 && !species) {
      const crown = document.createElement('span');
      crown.className = 'pik-crown';
      crown.textContent = '👑';
      el.appendChild(crown);
    }
    if (species) { // its hat IS its whole personality
      const hat = document.createElement('span');
      hat.className = 'pik-hat';
      hat.textContent = species.hat;
      el.appendChild(hat);
      if (species.flip) img.classList.add('pik-flip'); // walks backwards. intended.
    }
    DESK_PIK.layer.appendChild(el);
    const r = DESK_PIK.layer.getBoundingClientRect();
    const w = {
      el, img, hue: hue !== null ? hue : null, chameleon: !!chameleon, hueAt: 0, stage: stage || 0,
      sp: species || null, spd: species && species.spd ? species.spd : 1, stepAt: 0,
      x: 40 + Math.random() * Math.max(120, r.width - 160),
      y: r.height * 0.35 + Math.random() * (r.height * 0.5),
      tx: 0, ty: 0, restUntil: 0, bubbleEl: null
    };
    w.tx = w.x; w.ty = w.y;
    el.style.left = w.x + 'px';
    el.style.top = w.y + 'px';
    // poke a buddy!! it stops, squishes, squeaks, sometimes blooms
    el.addEventListener('click', () => {
      w.restUntil = Date.now() + 1800; // pauses to enjoy the attention
      el.classList.remove('poked');
      void el.offsetWidth;
      el.classList.add('poked');
      pikChirp();
      setTimeout(pikChirp, 120);
      const POKE_LINES = ['pik?!', 'hehe ♡', 'pik pik!!', 'mi~!', '♪♪', 'pik ♡'];
      deskPikSay(w, POKE_LINES[Math.floor(Math.random() * POKE_LINES.length)]);
      achvBump('pets');
      if (Math.random() < 0.35) { // a delighted bloom-burst at its feet
        for (let k = 0; k < 4; k++) {
          const f = document.createElement('img');
          f.className = 'pik-trail';
          f.src = trailBloomSprite(Math.floor(Math.random() * 6));
          f.alt = '';
          const size = 14 + Math.random() * 12;
          f.style.width = size + 'px';
          const ang = (k / 4) * 6.283 + Math.random() * 0.6;
          f.style.left = (w.x + 14 + Math.cos(ang) * 20 - size / 2) + 'px';
          f.style.top = (w.y + 34 + Math.abs(Math.sin(ang)) * 16) + 'px';
          DESK_PIK.layer.appendChild(f);
          setTimeout(() => f.classList.add('fading'), 10500);
          setTimeout(() => f.remove(), 12000);
        }
      }
    });
    DESK_PIK.walkers.push(w);
    return w;
  }
  function deskPikSay(w, text) {
    if (w.bubbleEl) w.bubbleEl.remove();
    const s = document.createElement('span');
    s.className = 'pik-bubble';
    s.style.left = '16px';
    s.style.bottom = '40px';
    s.textContent = text;
    w.el.appendChild(s);
    w.bubbleEl = s;
    setTimeout(() => { if (w.bubbleEl === s) w.bubbleEl = null; s.remove(); }, 1600);
  }
  function deskAnchorPoints() {
    const pts = [];
    const base = DESK_PIK.layer.getBoundingClientRect();
    document.querySelectorAll('.desktop-icon-btn').forEach((ic) => {
      const r = ic.getBoundingClientRect();
      if (r.width > 0) pts.push({ x: r.left - base.left + r.width / 2 - 16, y: r.bottom - base.top + 4 });
    });
    return pts;
  }
  // the FULL colour wheel: any hue can hatch. 10% of sprouts are the
  // hidden CHAMELEON — it never stops cycling colours.
  function hueColor(h) {
    h = ((h % 360) + 360) % 360;
    return { body: `hsl(${h}, 74%, 74%)`, dark: `hsl(${h}, 62%, 54%)` };
  }

  /* ==================================================================
     PIKDEX — pikdex.exe, the collection deck ♡
     every plucked buddy is archived here FOREVER: a unique tech name
     (no genders, only vibes), a computer-science technique, and a
     seat on the 24-segment HUE WHEEL. the squad (max 6) walks the
     desktop + garden; everyone else lounges in the deck until you
     promote them. travels with the SLIME cloud code. */
  const PIKDEX_CAP = 72;   // a roomy shoebox — 50 wheel slots need breathing space
  const WHEEL_SEGS = 50;   // 7.2° each = 2% per segment — the fifty shades of hue
  const WHEEL_STEP = 360 / WHEEL_SEGS;
  const PIK_NAMES = [
    'Pixel', 'Cursor', 'Sprite', 'Voxel', 'Glyph', 'Chip', 'Bit', 'Nibble',
    'Byte', 'Cache', 'Cookie', 'Token', 'Packet', 'Ping', 'Modem', 'Router',
    'Widget', 'Kernel', 'Daemon', 'Cron', 'Bash', 'Grep', 'Regex', 'Lambda',
    'Stack', 'Heap', 'Queue', 'Hash', 'Salt', 'Nonce', 'Blob', 'Node',
    'Patch', 'Diff', 'Fork', 'Merge', 'Echo', 'Curl', 'Vim', 'Tarball',
    'Floppy', 'Zipette', 'Socket', 'Proxy', 'Mutex', 'Async', 'Loopy', 'Segfault'
  ]; // 48 names — the hue picks, the pluck order settles ties
  const PIK_SUFFIX = ['', '++', ' v3', '.bak', '-turbo', ' (fork)', ' nightly', ' ×8'];
  const PIK_CH_NAMES = ['Chroma', 'RGBaby', 'Hue Shift', 'Palette', 'Gradient', 'Dither'];
  const PIK_SWATCH = [
    'tomato.exe', 'peach.css', 'honey.js', 'butter.bat', 'lime.log', 'matcha.md',
    'clover.sh', 'mint.ini', 'seafoam.css', 'aqua.cfg', 'cyan.sys', 'sky.png',
    'azure.db', 'blueberry.zip', 'indigo.tmp', 'grape.svg', 'violet.dll', 'orchid.gif',
    'magenta.exe', 'fuchsia.css', 'hotpink.js', 'bubblegum.bat', 'rose.txt', 'coral.jpg'
  ];
  const PIK_BIOS = [
    'compiles hugs from source.',
    'refuses to be garbage-collected.',
    'passed the vibe check(sum).',
    'runs on snacks and semicolons.',
    'single-threaded but very devoted.',
    'sleeps in low-power mode, dreams in RGB.',
    'believes every bug is an undocumented friend.',
    'will not rest until P = NP (or snack time).',
    'backed up twice, loved thrice.',
    'petal-to-metal performance.',
    'thinks the cloud is just sky RAM.',
    'has read the entire man page. of flowers.',
    'its favourite key is the spacebar. so roomy.',
    'deprecates nothing, ever. everything is loved.'
  ];
  const PIK_BIOS_FR = [
    'compile des câlins depuis la source.',
    'refuse d\'être ramassé par le garbage collector.',
    'a réussi le vibe check(sum).',
    'fonctionne aux collations et aux points-virgules.',
    'mono-thread mais très dévoué.',
    'dort en mode basse consommation, rêve en RGB.',
    'croit que chaque bug est un ami non documenté.',
    'ne se reposera pas avant P = NP (ou l\'heure du goûter).',
    'sauvegardé deux fois, aimé trois fois.',
    'performance pétale-au-plancher.',
    'pense que le cloud est juste de la RAM céleste.',
    'a lu toute la page man. des fleurs.',
    'sa touche préférée est la barre d\'espace. tant de place.',
    'ne déprécie rien, jamais. tout est aimé.'
  ];
  const PIK_SKILL_META = {
    ctrl_z: { icon: '⌫', name: 'CTRL+Z', en: 'un-happens one bug per cooldown. regret not included.', fr: 'dé-produit un bug par recharge. regrets non inclus.' },
    rm_rf: { icon: '🗑', name: 'RM -RF', en: 'deletes the problem. and the concept of backups.', fr: 'supprime le problème. et le concept de backup.' },
    blame: { icon: '👉', name: 'GIT BLAME', en: 'finds whose fault it was. it was yours. with love.', fr: 'trouve le coupable. c\'était toi. avec amour.' },
    four04: { icon: '🚫', name: '404', en: 'makes bugs unfindable. technically a fix.', fr: 'rend les bugs introuvables. techniquement un correctif.' },
    zip: { icon: '🗜', name: 'ZIP', en: 'compresses a whole bug into 0 bytes of your business.', fr: 'compresse un bug entier en 0 octet de tes affaires.' },
    duck: { icon: '🦆', name: 'RUBBER DUCK', en: 'listens until the bug explains itself and leaves in shame.', fr: 'écoute jusqu\'à ce que le bug s\'explique et parte, honteux.' },
    lint: { icon: '🌸', name: 'LINT --FIX', en: 'refactors bugs into flowers. warnings into petals.', fr: 'refactore les bugs en fleurs. les warnings en pétales.' },
    sudo: { icon: '👑', name: 'SUDO', en: 'asks the bug to stop. politely. with root.', fr: 'demande au bug d\'arrêter. poliment. avec root.' },
    trycatch: { icon: '🛡', name: 'TRY/CATCH', en: 'catches one crash per recompile — at ANY growth stage. finally.', fr: 'attrape un crash par recompilation — à N\'IMPORTE quel stade. finally.' },
    cron: { icon: '⏰', name: 'CRON', en: 'delivers 2 coins every 30s, at :00 sharp. never asks for thanks.', fr: 'livre 2 pièces toutes les 30 s, pile à :00. sans jamais demander merci.' },
    fetch: { icon: '🧲', name: 'GIT FETCH', en: 'pulls loot in from origin, twice as far. no merge conflicts.', fr: 'tire le butin depuis origin, deux fois plus loin. zéro conflit.' },
    devnull: { icon: '🕳', name: '/DEV/NULL', en: 'swallows the nightmare\'s falling exceptions. burps quietly.', fr: 'avale les exceptions qui tombent du cauchemar. rote discrètement.' },
    pingpik: { icon: '📶', name: 'PING', en: 'every takedown comes with a coin tip. 8ms. obstacles blush.', fr: 'chaque élimination laisse une pièce de pourboire. 8 ms.' },
    forkb: { icon: '🍴', name: 'FORK()', en: 'one zap, two bugs. one bug becomes zero bugs — twice.', fr: 'un zap, deux bugs. un bug devient zéro bug — deux fois.' },
    regex: { icon: '🔣', name: 'REGEX', en: 'greedy match: sweeps lookalike bugs off the whole screen.', fr: 'match gourmand : balaie tous les bugs similaires de l\'écran.' },
    cache: { icon: '🧊', name: 'CACHE HIT', en: 'already knew the answer — the whole world lags backwards.', fr: 'connaissait déjà la réponse — le monde entier lag en arrière.' },
    uptime: { icon: '🔋', name: 'UPTIME', en: 'has never been rebooted. passively radiates score.', fr: 'jamais redémarré. irradie passivement du score.' },
    defrag: { icon: '💾', name: 'DEFRAG', en: 'tidies defeated bugs into collectible coins. satisfying.', fr: 'range les bugs vaincus en pièces à ramasser. satisfaisant.' },
    vpn: { icon: '🕶', name: 'VPN', en: 'after a hit, your hitbox spends extra time legally elsewhere.', fr: 'après un coup, ta hitbox reste légalement ailleurs plus longtemps.' },
    popup: { icon: '🚫', name: 'ADBLOCK', en: 'specialist: swats FLYING bugs on a hair-trigger cooldown.', fr: 'spécialiste : claque les bugs VOLANTS avec un cooldown éclair.' },
    bsod: { icon: '💙', name: 'BSOD.EXE', en: 'shows bugs the blue screen. they reconsider everything. crits.', fr: 'montre l\'écran bleu aux bugs. ils reconsidèrent tout. crits.' },
    commit: { icon: '📌', name: 'GIT COMMIT', en: 'banks score on a schedule — and once per run, an emergency commit restores a heart at 1♥.', fr: 'engrange du score régulièrement — et une fois par run, un commit d\'urgence rend un cœur à 1♥.' },
    overflow: { icon: '📚', name: 'STACKOVERFLOW', en: 'copies a random other skill\'s move every time. it works somehow.', fr: 'copie le geste d\'un autre talent à chaque fois. ça marche, allez savoir.' },
    gpu: { icon: '🎮', name: 'GPU GO BRRR', en: 'renders bugs out of existence 30% faster. 240fps justice.', fr: 'efface les bugs 30 % plus vite. justice à 240 fps.' }
  };
  const PIK_LEGACY_HUES = [330, 268, 203, 45, 152]; // palette 0-4 → wheel homes

  /* ------------------------------------------------------------------
     HIDDEN SPECIES — the other 22 slots of the 72-slot deck.
     roughly 1 sprout in 10 mutates into one of these: computer-born
     creatures with their own hat, their own colours, their own walk
     cycle. each species exists exactly ONCE — 50 hues + 22 species
     = a perfect 72. (the chameleon lives in the wheel hub, capless.)
     n/t/lore: [en, fr] — t is the riddle shown on the empty slot. */
  const HIDDEN_SPECIES = [
    { id: 'glitch', hat: '📼', body: { body: '#d38ef5', dark: '#8a4bd0' }, fx: 'glitch', n: ['Artifact', 'Artéfact'], t: ['the render made a mistake. keep it.', 'le rendu a fait une erreur. garde-la.'], lore: ['a compression artifact that gained sentience. do not re-encode.', 'un artéfact de compression devenu conscient. ne pas ré-encoder.'] },
    { id: 'matrix', hat: '🖥️', body: { body: '#7ee787', dark: '#2ea043' }, fx: 'matrix', n: ['Neo Sprout', 'Néo Pousse'], t: ['follow the green rain.', 'suis la pluie verte.'], lore: ['sees the desktop as falling glyphs. chose the pink pill anyway.', 'voit le bureau en glyphes qui tombent. a choisi la pilule rose quand même.'] },
    { id: 'pointer', hat: '🖱️', body: { body: '#f5f5fa', dark: '#9aa0b4' }, fx: 'dart', spd: 1.7, n: ['Pointer', 'Pointeur'], t: ['it moves exactly like something you own.', 'il bouge exactement comme un truc à toi.'], lore: ['sprints, stops dead, hovers. blames your wrist.', 'sprinte, pile net, plane. accuse ton poignet.'] },
    { id: 'wifi', hat: '📶', body: { body: '#9fd8ff', dark: '#4f9edb' }, fx: 'ripple', n: ['Signal', 'Signal'], t: ['three bars in the meadow.', 'trois barres dans la prairie.'], lore: ['full bars everywhere. yes, even in the basement.', 'du réseau partout. oui, même à la cave.'] },
    { id: 'lowbatt', hat: '🪫', body: { body: '#ff9d9d', dark: '#d64545' }, fx: 'blinkred', spd: 0.45, n: ['Low Batt', 'Batterie Faible'], t: ['it beeps, sadly, at 20%.', 'il bipe, tristement, à 20 %.'], lore: ['permanently at 15%. refuses every charger. lives anyway.', 'bloqué à 15 %. refuse tous les chargeurs. vit sa vie quand même.'] },
    { id: 'post', hat: '⌨️', body: { body: '#ffd27a', dark: '#c98a2e' }, fx: 'crt', n: ['POST Beep', 'Bip POST'], t: ['one short beep = all is well.', 'un bip court = tout va bien.'], lore: ['boots in 0.2 seconds. spends the saved time napping.', 'démarre en 0,2 s. passe le temps gagné à faire la sieste.'] },
    { id: 'cumulus', hat: '☁️', body: { body: '#eef7ff', dark: '#a5c9e8' }, fx: 'float', n: ['Cumulus', 'Cumulus'], t: ['local sky, 100% chance of cute.', 'ciel local, 100 % de chances de mignon.'], lore: ['your data is inside it somewhere. it will not say where.', 'tes données sont dedans, quelque part. il ne dira pas où.'] },
    { id: 'feature', hat: '🐛', body: { body: '#c8f07e', dark: '#7fae35' }, fx: '', flip: true, n: ['Feature', 'Fonctionnalité'], t: ['it walks backwards. that is intended.', 'il marche à reculons. c\'est voulu.'], lore: ['filed as a bug, closed as WONTFIX, beloved as a feature.', 'signalé comme bug, fermé en WONTFIX, adoré comme fonctionnalité.'] },
    { id: 'latency', hat: '⏳', body: { body: '#e8d9b8', dark: '#b09a62' }, fx: '', choppy: true, n: ['Latency', 'Latence'], t: ['it arrives… eventually.', 'il arrive… éventuellement.'], lore: ['walks at 300ms ping. emotionally, always 3 seconds behind.', 'marche à 300 ms de ping. émotionnellement, 3 secondes de retard.'] },
    { id: 'aliased', hat: '🟪', body: { body: '#cbb1f2', dark: '#8e6cc9' }, fx: 'chunky', n: ['Aliased', 'Crénelé'], t: ['somebody turned the resolution down.', 'quelqu\'un a baissé la résolution.'], lore: ['renders at 8×8 out of principle. anti-aliasing is a scam.', 'se rend en 8×8 par principe. l\'anticrénelage est une arnaque.'] },
    { id: 'darkmode', hat: '🌑', body: { body: '#4a3a5e', dark: '#241335' }, fx: 'stars', n: ['Dark Mode', 'Mode Sombre'], t: ['it only comes out for your retinas.', 'il ne sort que pour tes rétines.'], lore: ['claims it saves battery. actually just goth.', 'prétend économiser la batterie. en vrai, juste gothique.'] },
    { id: 'gilded', hat: '🏆', body: { body: '#ffd873', dark: '#c9992e' }, fx: 'shine', n: ['Gold Master', 'Version Or'], t: ['the final build. shipped. golden.', 'le build final. livré. doré.'], lore: ['the release that never needed a hotfix. worship it.', 'la version qui n\'a jamais eu besoin de hotfix. vénère-la.'] },
    { id: 'cacheghost', hat: '👻', body: { body: '#e8e6f5', dark: '#a9a4c9' }, fx: 'ghost', n: ['Cache Ghost', 'Fantôme du Cache'], t: ['you cleared it. it came back.', 'tu l\'as vidé. il est revenu.'], lore: ['404 in the heap, alive in your heart. clear-site-data can\'t touch it.', '404 dans le tas, vivant dans ton cœur. clear-site-data n\'y peut rien.'] },
    { id: 'cronjob', hat: '⏰', body: { body: '#a8e8d8', dark: '#4fae8e' }, fx: 'tick', n: ['Cron Job', 'Tâche Cron'], t: ['every minute, on the minute.', 'chaque minute, à la minute.'], lore: ['runs * * * * *. never missed a beat. slightly smug about it.', 'tourne en * * * * *. n\'a jamais raté. légèrement fier de lui.'] },
    { id: 'y2kbug', hat: '🎉', body: { body: '#ffb3dd', dark: '#f0509f' }, fx: 'confetti', n: ['Y2K Bug', 'Bug de l\'An 2000'], t: ['it partied like it\'s 19100.', 'il a fait la fête comme en 19100.'], lore: ['the apocalypse that RSVP\'d and never showed. still dressed for it.', 'l\'apocalypse qui avait confirmé et n\'est jamais venue. toujours sur son 31.'] },
    { id: 'bitflip', hat: '🎲', body: { body: '#f2f2f2', dark: '#1a1a1a' }, fx: 'invert', n: ['Bit Flip', 'Bit Inversé'], t: ['a cosmic ray did this.', 'c\'est un rayon cosmique qui a fait ça.'], lore: ['one stray cosmic ray and now it can\'t decide if it\'s a 0 or a 1.', 'un rayon cosmique égaré, et il hésite entre 0 et 1 depuis.'] },
    { id: 'turbo', hat: '🔥', body: { body: '#ff8a5c', dark: '#d1431f' }, fx: 'heat', spd: 1.9, n: ['Overclock', 'Overclock'], t: ['it voids its own warranty.', 'il annule sa propre garantie.'], lore: ['runs 30% faster, 300% warmer. the fan noise is purring, probably.', 'tourne 30 % plus vite, 300 % plus chaud. le ventilo ronronne, sans doute.'] },
    { id: 'dotmatrix', hat: '🖨️', body: { body: '#c7d3e8', dark: '#7c8db0' }, fx: 'paper', n: ['Dot Matrix', 'Matricielle'], t: ['you can hear it from two rooms away.', 'tu l\'entends depuis deux pièces.'], lore: ['prints one pixel at a time. SCREEE. beautiful. archival quality.', 'imprime pixel par pixel. SCREEE. magnifique. qualité archive.'] },
    { id: 'bsodjr', hat: '💙', body: { body: '#7cb1ff', dark: '#2f5fd0' }, fx: 'faint', n: ['BSOD Jr.', 'BSOD Jr.'], t: ['it collects your crash reports.', 'il collectionne tes rapports de plantage.'], lore: ['falls over :( then gets right back up. files a crash report about itself each time.', 'tombe :( puis se relève. s\'envoie un rapport de plantage à chaque fois.'] },
    { id: 'rgbrig', hat: '🕹️', body: { body: '#ff8fc7', dark: '#d6539b' }, fx: 'rgbcycle', n: ['RGB Rig', 'Config RGB'], t: ['the frames per second are cosmetic.', 'les FPS sont cosmétiques.'], lore: ['+15 FPS from the lighting alone (self-reported).', '+15 FPS grâce à l\'éclairage seul (auto-déclaré).'] },
    { id: 'captcha', hat: '✅', body: { body: '#d6f5c8', dark: '#7cba58' }, fx: 'verify', n: ['Not A Robot', 'Pas Un Robot'], t: ['click every square containing pikmin.', 'coche chaque case contenant des pikmin.'], lore: ['passes every CAPTCHA first try. suspiciously good at crosswalks.', 'réussit chaque CAPTCHA du premier coup. suspicieusement fort en passages piétons.'] },
    { id: 'kernelpg', hat: '🐧', body: { body: '#bfe3f0', dark: '#3d7a94' }, fx: '', n: ['Penguin Core', 'Cœur Manchot'], t: ['it\'s free. it\'s open. it\'s here.', 'il est libre. il est ouvert. il est là.'], lore: ['monolithic, open-source, will explain itself unprompted.', 'monolithique, open-source, s\'explique sans qu\'on demande.'] }
  ]; // exactly 22 — 50 hues + 22 species = the perfect 72. NEVER reorder (cloud wire format).
  function pikSpecies(id) { return HIDDEN_SPECIES.find((h) => h.id === id) || null; }
  function pikEntryColor(p) { const sp = p.sp && pikSpecies(p.sp); return sp ? sp.body : hueColor(pikHueOf(p)); }
  function pikHiddenLeft(dex) { return HIDDEN_SPECIES.filter((h) => !(dex || pikdexGet()).some((p) => p.sp === h.id)); }

  /* one gacha to rule every meadow: chameleon → hidden → missing hue.
     normal sprouts ALWAYS fill a missing wheel segment now — no dupes,
     so 50 hues + 22 species really can occupy all 72 slots. */
  function pikRollSprout() {
    const dex = pikdexGet();
    const nonCh = dex.filter((p) => !p.ch).length;
    const hasCh = dex.some((p) => p.ch);
    const complete = nonCh >= PIKDEX_CAP;
    // the chameleon lives outside the 72 — post-completion it gets generous
    if (!hasCh && Math.random() < (complete ? 0.06 : 0.01)) return { type: 'chameleon' };
    if (complete) {
      // THE ENDLESS MEADOW: full wheel, full shelf — now the garden grows
      // duplicates, and duplicates become EVOLUTIONS. sprout choice leans
      // toward whoever is closest to its next form (a thoughtful gardener).
      const counts = pikCounts();
      const kinds = [];
      for (let i = 0; i < WHEEL_SEGS; i++) kinds.push('w:' + i);
      HIDDEN_SPECIES.forEach((sp) => kinds.push('s:' + sp.id));
      const gap = (k) => {
        const n = counts[k] || 1;
        const t = pikThresholds(k);
        return n >= t[1] ? 99 + (n % 7) : (n >= t[0] ? t[1] - n : t[0] - n);
      };
      kinds.sort((a, b) => gap(a) - gap(b));
      const pool = Math.random() < 0.6 ? kinds.slice(0, 10) : kinds;
      const k = pool[Math.floor(Math.random() * pool.length)];
      if (k[0] === 's') { const spDup = pikSpecies(k.slice(2)); if (spDup) return { type: 'hidden', sp: spDup }; }
      const dupSeg = parseInt(k.slice(2), 10) || 0;
      return { type: 'normal', hue: Math.max(5, Math.round(dupSeg * WHEEL_STEP + 1 + Math.random() * (WHEEL_STEP - 2))) };
    }
    const hiddenLeft = pikHiddenLeft(dex);
    const segs = pikdexWheelSegs(dex);
    const missing = [];
    for (let i = 0; i < WHEEL_SEGS; i++) if (!segs.has(i)) missing.push(i);
    const hiddenChance = 0.08 + Math.random() * 0.05; // ~10%, drifting
    if (hiddenLeft.length && (!missing.length || Math.random() < hiddenChance)) {
      return { type: 'hidden', sp: hiddenLeft[Math.floor(Math.random() * hiddenLeft.length)] };
    }
    if (missing.length) {
      const seg = missing[Math.floor(Math.random() * missing.length)];
      return { type: 'normal', hue: Math.max(5, Math.round(seg * WHEEL_STEP + 1 + Math.random() * (WHEEL_STEP - 2))) };
    }
    return null;
  }

  function pikdexGet() { const d = store.get('yos-pikdex', []); return Array.isArray(d) ? d : []; }
  function pikdexSave(d) { store.set('yos-pikdex', d); }

  /* ===== EVOLUTION LEDGER — every pluck of a KIND counts, forever =====
     72 kinds (50 wheel segments + 22 species) each climb three forms at
     their own pace. duplicates stopped being waste the day this shipped. */
  function pikSegOfHue(h) { return Math.floor((((h % 360) + 360) % 360) / WHEEL_STEP) % WHEEL_SEGS; }
  function pikKindKey(e) { return e.ch ? 'ch' : (e.sp ? 's:' + e.sp : 'w:' + pikSegOfHue(e.h != null ? e.h : 300)); }
  function pikCounts() { const c = store.get('yos-pik-counts', null); return c && typeof c === 'object' && !Array.isArray(c) ? c : {}; }
  function pikCountsSave(c) { store.set('yos-pik-counts', c); }
  function pikThresholds(key) {
    // per-kind pacing: hidden species are rarer pulls, so they evolve sooner
    if (key === 'ch') return [3, 7];
    if (key[0] === 's') {
      const i = Math.max(0, HIDDEN_SPECIES.findIndex((sp) => 's:' + sp.id === key));
      const t2 = 2 + (i % 3);                       // 2-4 for form ★★
      return [t2, t2 + 3 + ((i * 5) % 5)];          // +3-7 more for APEX
    }
    const seg = parseInt(key.slice(2), 10) || 0;
    const t2 = 3 + ((seg * 7) % 4);                 // 3-6 for form ★★
    return [t2, t2 + 5 + ((seg * 11) % 7)];         // +5-11 more for APEX
  }
  function pikFormOfCount(n, key) { const t = pikThresholds(key); return n >= t[1] ? 3 : n >= t[0] ? 2 : 1; }
  function pikFormOf(e) { const k = pikKindKey(e); return pikFormOfCount(pikCounts()[k] || 1, k); }
  function pikFormOfKind(key) { return pikFormOfCount(pikCounts()[key] || 1, key); }
  function pikCountTotal() { const c = pikCounts(); let t = 0; Object.keys(c).forEach((k) => { t += c[k] || 0; }); return t; }
  const PIKLB_TIERS = [10, 30, 72, 100, 140, 200, 300];
  function pikLbTier(total) { let ix = 0; PIKLB_TIERS.forEach((t, i) => { if (total >= t) ix = i + 1; }); return ix; }
  function pikLbMaybeHit() {
    const tier = pikLbTier(pikCountTotal());
    const sent = store.get('yos-piklb-sent', 0);
    if (tier > sent && navigator.onLine) {
      store.set('yos-piklb-sent', tier);
      for (let i = sent + 1; i <= tier; i++) fetch(`${ACHV_API}/hit/${ACHV_NS}/piklb-t${i}`).catch(() => {});
    }
  }
  function pikEvolveCelebrate(entry, key, form) {
    const sp = entry.sp && pikSpecies(entry.sp);
    const label = sp ? trT(sp.n[0], sp.n[1]) : (entry.ch ? trT('the chameleon', 'le caméléon') : trT('a wheel pikmin', 'un pikmin de la roue'));
    try { playFanfare(); } catch (e) { /* pre-audio */ }
    if (typeof fxBanner === 'function') {
      fxBanner(form === 3 ? '👑 APEX FORM!!' : '🌺 EVOLVED!!',
        form === 3 ? trT(`${label} reached its FINAL form`, `${label} atteint sa forme FINALE`) : trT(`${label} grew into form ★★`, `${label} passe en forme ★★`));
    }
    achvUnlock('evolve');
    if (form === 3) achvUnlock('apex');
    // the resident dex copy blooms fully to show off its new rank
    const dex = pikdexGet();
    const own = dex.find((q) => !q.loan && pikKindKey(q) === key);
    if (own && (own.s || 0) < 2) { own.s = 2; pikdexSave(dex); }
    if (typeof deskPikResync === 'function') deskPikResync();
    if (typeof renderPikdexSoon === 'function') renderPikdexSoon();
  }
  function pikCountBump(entry) {
    if (entry.loan) return 0; // borrowed friends belong to someone else's ledger
    const c = pikCounts();
    const key = pikKindKey(entry);
    const before = c[key] || 0;
    c[key] = Math.min(before + 1, 950);
    pikCountsSave(c);
    if (before >= 1) {
      const extra = store.get('yos-pik-extra', 0) + 1;
      store.set('yos-pik-extra', extra);
      if (extra >= 10) achvUnlock('evermore');
      const f0 = pikFormOfCount(before, key), f1 = pikFormOfCount(c[key], key);
      if (f1 > f0) pikEvolveCelebrate(entry, key, f1);
    }
    pikLbMaybeHit();
    if (typeof cloudQueueSync === 'function') cloudQueueSync();
    return c[key];
  }
  function pikCountsMigrate() {
    const dex = pikdexGet();
    if (!dex.length) return;
    const c = pikCounts();
    let changed = false;
    dex.forEach((p) => { if (p.loan) return; const k = pikKindKey(p); if (!c[k]) { c[k] = 1; changed = true; } });
    if (changed) pikCountsSave(c);
  }
  function pikHueOf(p) { return p.h != null ? ((p.h % 360) + 360) % 360 : (PIK_LEGACY_HUES[p.c] != null ? PIK_LEGACY_HUES[p.c] : 330); }
  function pikdexActives(dex) { return (dex || pikdexGet()).filter((p) => p.a); }
  function pikNameBaseOf(p) { return PIK_NAMES[Math.floor(pikHueOf(p) / (360 / PIK_NAMES.length)) % PIK_NAMES.length]; }
  function pikNameOf(dex, ix) {
    const p = dex[ix];
    if (!p) return '???';
    if (p.sp) { const sp = pikSpecies(p.sp); return sp ? trT(sp.n[0], sp.n[1]) : '???'; }
    let base, dupes = 0;
    if (p.ch) {
      let ord = 0;
      for (let i = 0; i < ix; i++) if (dex[i].ch) ord++;
      base = PIK_CH_NAMES[ord % PIK_CH_NAMES.length];
      dupes = Math.floor(ord / PIK_CH_NAMES.length);
    } else {
      base = pikNameBaseOf(p);
      for (let i = 0; i < ix; i++) if (!dex[i].ch && pikNameBaseOf(dex[i]) === base) dupes++;
    }
    return base + (dupes ? (PIK_SUFFIX[Math.min(dupes, PIK_SUFFIX.length - 1)] || (' ×' + (dupes + 1))) : '');
  }
  // a Set, not a bitmask: 50 segments would overflow JS's 32-bit bitwise ops
  // (chameleons refuse a segment; hidden species live off-wheel entirely)
  function pikdexWheelSegs(dex) {
    const segs = new Set();
    (dex || pikdexGet()).forEach((p) => { if (!p.ch && p.sp == null) segs.add(Math.floor(pikHueOf(p) / WHEEL_STEP) % WHEEL_SEGS); });
    return segs;
  }
  function pikdexWheelCount(dex) { return pikdexWheelSegs(dex).size; }
  function pikdexWheelPct(dex) { return Math.round((pikdexWheelCount(dex) / WHEEL_SEGS) * 100); }
  function pikdexWheelCheck(before) {
    const pct = pikdexWheelPct();
    if (pct >= 25) achvUnlock('colorpicker');
    if (pct >= 50) achvUnlock('halftone');
    if (pct >= 100) {
      achvUnlock('truecolor');
      if (before < 100) {
        playFanfare();
        showBubble(trT('TRUE COLOR. all 50 shades of hue. you actually did it ♡', 'TRUE COLOR. les 50 nuances de teinte. tu l\'as vraiment fait ♡'), 3400);
      }
    }
  }
  function pikdexRosterProject() {
    const roster = pikdexActives().slice(0, PIK_MAX).map((p) => ({ h: pikHueOf(p), ch: p.ch ? 1 : 0, s: p.s || 0, k: p.k || null, sp: p.sp || null }));
    store.set('yos-pik-roster', roster);
    return roster;
  }
  function pikdexAbsorbStages() {
    // stage-ups earned on stage/desktop flow back into the deck records
    const dex = pikdexGet();
    const actives = dex.filter((p) => p.a);
    const roster = store.get('yos-pik-roster', []);
    let changed = false;
    roster.forEach((r, i) => {
      if (actives[i] && (r.s || 0) > (actives[i].s || 0)) { actives[i].s = r.s || 0; changed = true; }
    });
    if (changed) { pikdexSave(dex); renderPikdexSoon(); }
  }
  var pikdexRenderT = null;
  function renderPikdexSoon() {
    if (pikdexRenderT) clearTimeout(pikdexRenderT);
    pikdexRenderT = setTimeout(() => { if (typeof renderPikdex === 'function') renderPikdex(); }, 180);
  }
  function pikdexAdd(entry) {
    const dex = pikdexGet();
    pikCountBump(entry); // the evolution ledger counts EVERY pluck, first or fiftieth
    // the chameleon is capless (it lives in the wheel hub, not a slot);
    // a full dex means this pluck is a DUPLICATE — ledger fuel, no new slot
    if (!entry.ch && dex.filter((p) => !p.ch).length >= PIKDEX_CAP) return 'dup';
    const before = pikdexWheelPct(dex);
    entry.a = pikdexActives(dex).length < PIK_MAX ? 1 : 0;
    entry.t = Date.now();
    dex.push(entry);
    pikdexSave(dex);
    if (entry.a) pikdexRosterProject();
    pikdexWheelCheck(before);
    if (typeof cloudQueueSync === 'function') cloudQueueSync();
    renderPikdexSoon();
    return entry.a ? 'active' : 'deck';
  }
  // (pikSproutHue retired — pikRollSprout is the one gacha for every meadow)
  function pikStatsOf(p) {
    if (p.ch) return null; // benchmarks refuse to settle
    // hidden species bench with a pseudo-hue hashed from their name
    const h = p.sp ? (p.sp.split('').reduce((a, c) => a + c.charCodeAt(0) * 37, 7) % 360) : pikHueOf(p);
    return {
      cpu: 40 + ((h * 7) % 60),   // Cuteness Processing Unit
      ram: 40 + ((h * 13) % 60),  // Remembers All Meals
      fps: 40 + ((h * 11) % 60),  // Flowers Per Second
      ping: 8 + ((h * 3) % 88)    // ms to answer a pet
    };
  }
  function pikAgeOf(p) {
    if (!p.t) return trT('restored from the cloud (a legend precedes it)', 'restauré du cloud (une légende le précède)');
    const s = Math.max(1, Math.floor((Date.now() - p.t) / 1000));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    const up = d ? `${d}d ${h}h` : (h ? `${h}h ${m}m` : `${m}m ${s % 60}s`);
    return trT(`${up} (zero crashes)`, `${up} (zéro plantage)`);
  }
  function deskPikResync() {
    if (!DESK_PIK.layer) return;
    // remember where everyone stood — a resync must NOT teleport the squad.
    // their bloom trails stay on the desk, and a pikmin standing away from
    // its own footprints reads as a glitch, not a homecoming.
    const seats = DESK_PIK.walkers.map((w) => ({ x: w.x, y: w.y, tx: w.tx, ty: w.ty }));
    DESK_PIK.walkers.forEach((w) => {
      try { if (w.bubbleEl) w.bubbleEl.remove(); w.el.remove(); } catch (e) { /* already gone */ }
    });
    DESK_PIK.walkers = [];
    deskRoster().slice(0, PIK_MAX).forEach((rr, i) => {
      const w = deskPikSpawn(rr.h != null ? rr.h : rr.c, rr.s, !!rr.ch, rr.sp || null);
      const seat = seats[i];
      if (w && seat) {
        w.x = seat.x; w.y = seat.y; w.tx = seat.tx; w.ty = seat.ty;
        w.el.style.left = w.x + 'px';
        w.el.style.top = w.y + 'px';
      }
    });
  }
  function gardenResync() {
    if (typeof GARDEN === 'undefined' || !GARDEN) return;
    if (!GARDEN.buddies.length && !GARDEN.restored) return;
    GARDEN.buddies.forEach((b) => {
      try { if (b.carryEl) b.carryEl.remove(); if (b.bubbleEl) b.bubbleEl.remove(); b.el.remove(); } catch (e) { /* already gone */ }
    });
    GARDEN.buddies = [];
    GARDEN.restored = false;
    if (typeof gardenRestoreRoster === 'function') gardenRestoreRoster(true);
  }
  /* ---------- FLOAT MODE: exactly how high the squad hovers ----------
     'under' (default): z 50 — over the wallpaper, under every window
     'top':             z 1990 — over ALL windows, never over the taskbar
     'shy':             hides the moment any window is open
     all modes: live room / game open → walkers vanish (the squad is
     literally performing inside those windows — no ghost twins) */
  function pikFloatMode() {
    const m = store.get('yos-pik-float', 'under');
    return (m === 'top' || m === 'shy') ? m : 'under';
  }
  function applyPikFloat() {
    const layer = DESK_PIK.layer;
    if (!layer) return;
    const mode = pikFloatMode();
    layer.classList.toggle('pik-float-top', mode === 'top');
    // 'top' must TRACK the window z counter (focusWindow keeps raising it),
    // otherwise a much-clicked window would eventually out-stack the squad.
    // capped at 1999: the taskbar (2000) is sacred.
    layer.style.zIndex = mode === 'top' ? String(Math.min(highestZ + 10, 1999)) : '';
    const isUp = (id) => {
      const w = document.getElementById(id);
      return !!w && !w.classList.contains('window-closed') && !w.classList.contains('window-minimized');
    };
    // 'shy' = fully invisible, everywhere, always (they still perform inside
    // the live room & the game — those are THEIR windows, not the desktop)
    const hide = mode === 'shy' || isUp('win-live') || isUp('win-game');
    layer.classList.toggle('pik-float-hidden', hide);
  }
  const PIK_FLOAT_OPTS = [
    { id: 'top', icon: '🔝', name: ['on top', 'au-dessus'], d: ['spotlight hog — floats above every window (the taskbar is sacred)', 'accro au projecteur — flotte au-dessus de toutes les fenêtres (la barre des tâches est sacrée)'] },
    { id: 'under', icon: '🪟', name: ['under windows', 'sous les fenêtres'], d: ['well-behaved — patrols the desktop, tucked under any open window', 'bien élevé — patrouille le bureau, glissé sous les fenêtres ouvertes'] },
    { id: 'shy', icon: '🙈', name: ['shy', 'timide'], d: ['fully invisible on the desktop — they only appear in the live room & the game', 'totalement invisible sur le bureau — visibles seulement au salon live & en jeu'] }
  ];

  /* the 1% chameleon deserves a whole-desktop festival */
  function chameleonCelebrate() {
    playFanfare();
    if (REDUCED_MOTION) return; // the fanfare + bubble carry the moment
    const n = 46;
    for (let i = 0; i < n; i++) {
      const f = document.createElement('img');
      f.className = 'cham-burst';
      f.src = trailBloomSprite(i % 6);
      f.alt = '';
      f.style.left = (Math.random() * 100) + 'vw';
      f.style.width = (13 + Math.random() * 19) + 'px';
      f.style.animationDelay = (Math.random() * 1.3) + 's';
      f.style.animationDuration = (2.3 + Math.random() * 1.9) + 's';
      document.body.appendChild(f);
      setTimeout(() => f.remove(), 5600);
    }
  }

  /* fifty precision-machined boot jokes — one at random, then a slow
     rotation while the bar fills. the OS takes loading very seriously. */
  const LOADER_JOKES = [
    ['there are 10 kinds of visitors: those who read binary and those who don\'t', 'il y a 10 types de visiteurs : ceux qui lisent le binaire et les autres'],
    ['it\'s always DNS. even on this screen.', 'c\'est toujours le DNS. même sur cet écran.'],
    ['99 little bugs in the code… take one down: 127 little bugs in the code', '99 petits bugs dans le code… corriges-en un : 127 petits bugs dans le code'],
    ['asking the rubber duck for final sign-off…', 'demande de validation finale au canard en plastique…'],
    ['counting startup steps from 0. always from 0.', 'décompte des étapes depuis 0. toujours depuis 0.'],
    ['cache warmed. cache cleared. cache warmed again (a lifestyle)', 'cache chauffé. cache vidé. cache réchauffé (un mode de vie)'],
    ['resolving merge conflict: cute vs cuter…', 'résolution du conflit git : mignon vs plus mignon…'],
    ['this progress bar is sincere. statistically remarkable.', 'cette barre de progression est sincère. statistiquement remarquable.'],
    ['TODO: remove this TODO', 'TODO : supprimer ce TODO'],
    ['works on my machine. you\'re on my machine now.', 'ça marche sur ma machine. vous êtes sur ma machine, là.'],
    ['off-by-one error detected in the previous joke', 'erreur off-by-one détectée dans la blague précédente'],
    ['the S in "slime" stands for security', 'le S de « slime » veut dire sécurité'],
    ['quantum bugfix: it works until you observe it', 'correctif quantique : ça marche tant qu\'on ne regarde pas'],
    ['!false — it\'s funny because it\'s true', '!false — c\'est drôle parce que c\'est vrai'],
    ['a SQL query walks into a bar, joins two tables', 'une requête SQL entre dans un bar et JOIN deux tables'],
    ['I would tell a UDP joke but you might not get it', 'j\'aurais une blague UDP, mais rien ne dit qu\'elle arrivera'],
    ['the TCP joke is coming. it will be acknowledged.', 'la blague TCP arrive. elle sera acquittée.'],
    ['loading… (the real load was the friends we cached along the way)', 'chargement… (le vrai chargement, c\'était les amis mis en cache en chemin)'],
    ['there is no cloud. it\'s just someone else\'s slime.', 'le cloud n\'existe pas. c\'est juste le slime de quelqu\'un d\'autre.'],
    ['deleting one semicolon to see what happens', 'suppression d\'un point-virgule pour voir ce qui se passe'],
    ['naming things, cache invalidation, and… the third one', 'nommer les choses, invalider le cache, et… le troisième truc'],
    ['tabs vs spaces: this OS uses hearts', 'tabs ou espaces : cet OS utilise des cœurs'],
    ['git commit -m "fixes"  (it did not fix)', 'git commit -m « corrige »  (ça n\'a rien corrigé)'],
    ['running on 0 frameworks and 1 grudge', 'propulsé par 0 framework et 1 rancune'],
    ['normalizing the database. the database resists.', 'normalisation de la base. la base résiste.'],
    ['rm -rf node_modules (37GB freed, feelings mixed)', 'rm -rf node_modules (37 Go libérés, sentiments mitigés)'],
    ['the bug was in production. the fix is in therapy.', 'le bug était en prod. le correctif est en thérapie.'],
    ['404: witty loading line not fou—', '404 : blague de chargement introuv—'],
    ['achieving inbox zero (by declaring inbox bankruptcy)', 'inbox zero atteint (par faillite déclarée de l\'inbox)'],
    ['float: left; float: right; nobody floats up. CSS is grief.', 'float:left ; float:right ; personne ne flotte vers le haut. le CSS, c\'est du deuil.'],
    ['while (!asleep) { sheep++ }', 'while (!dodo) { moutons++ }'],
    ['segmentation fault (core dumped, feelings intact)', 'segmentation fault (core dumpé, sentiments intacts)'],
    ['my code has no bugs, only spontaneous features', 'mon code n\'a pas de bugs, que des fonctionnalités spontanées'],
    ['downloading more RAM for the slime…', 'téléchargement de RAM supplémentaire pour le slime…'],
    ['this line intentionally left funny', 'cette ligne est volontairement drôle'],
    ['regex: now you have two problems. now three.', 'regex : maintenant vous avez deux problèmes. non, trois.'],
    ['the pikmin are compiled from source. organic source.', 'les pikmin sont compilés depuis les sources. des sources bio.'],
    ['premature optimization is the root of all… actually this is fine', 'l\'optimisation prématurée est la racine de tout… bon, en fait ça va'],
    ['reticulating splines (they asked to be reticulated)', 'réticulation des splines (elles ont insisté)'],
    ['whiteboard question: draw a slime in O(1)', 'question d\'entretien : dessinez un slime en O(1)'],
    ['dark mode saves energy. mostly mine.', 'le mode sombre économise de l\'énergie. surtout la mienne.'],
    ['committing straight to main — we live once', 'commit direct sur main — on ne vit qu\'une fois'],
    ['P vs NP: the slime verifies snacks faster than it finds them', 'P vs NP : le slime vérifie les snacks plus vite qu\'il ne les trouve'],
    ['the real 10x engineer was the pet all along', 'l\'ingénieur 10x, c\'était le familier depuis le début'],
    ['undefined is not a function, but it tries so hard', 'undefined n\'est pas une fonction, mais il fait de son mieux'],
    ['deploys on Friday. lives dangerously. is a slime.', 'déploie le vendredi. vit dangereusement. est un slime.'],
    ['garbage collector on strike — everything is precious now', 'ramasse-miettes en grève — tout est précieux maintenant'],
    ['boot sector decorated with stickers. unbootable. worth it.', 'secteur de boot décoré de stickers. indémarrable. ça valait le coup.'],
    ['two hard things: naming things and knowing when to sto', 'deux choses dures : nommer les choses et savoir quand s\'arrê'],
    ['vim exited successfully. the year is 2043.', 'vim s\'est fermé avec succès. nous sommes en 2043.']
  ];

  /* ---------- the living boot screen ----------
     dresses the loader from the visitor's save: their slime (boopable),
     their exact squad (colours, species hats, growth stages) marching
     underneath — plus fifty rotating boot jokes on the marquee ♡ */
  function loaderDecorate() {
    const slimeBtn = document.getElementById('loader-slime');
    if (slimeBtn && !slimeBtn._wired) {
      slimeBtn._wired = true;
      let stalls = 0;
      slimeBtn.addEventListener('click', () => {
        slimeBtn.classList.remove('is-booped');
        void slimeBtn.offsetWidth;
        slimeBtn.classList.add('is-booped');
        playTone(880 + stalls * 70, 'square', 0.06, 0, 0.03);
        if (stalls < 5) { stalls++; window.__loaderHideAt = Math.max(window.__loaderHideAt || 0, Date.now()) + 800; }
        const heart = document.createElement('span');
        heart.className = 'loader-boop-heart';
        heart.textContent = '♥';
        heart.style.left = (25 + Math.random() * 50) + '%';
        slimeBtn.appendChild(heart);
        setTimeout(() => heart.remove(), 950);
      });
    }
    const row = document.getElementById('loader-squad');
    const roster = store.get('yos-pik-roster', []);
    if (row && Array.isArray(roster) && roster.length) {
      row.innerHTML = ''; // rebuilt from the save, sprites only
      roster.slice(0, PIK_MAX).forEach((r, i) => {
        const sp = r.sp ? pikSpecies(r.sp) : null;
        const holder = document.createElement('span');
        holder.className = 'loader-pik';
        holder.style.animationDelay = (i * 0.13) + 's';
        const img = document.createElement('img');
        img.src = pikSprite(sp ? sp.body : ((r.h != null) ? hueColor(r.h) : (PIK_COLORS[r.c] || PIK_COLORS[0])), r.s || 0, r.sp || null);
        img.alt = '';
        holder.appendChild(img);
        if (sp) {
          const hat = document.createElement('span');
          hat.className = 'loader-pik-hat';
          hat.textContent = sp.hat;
          holder.appendChild(hat);
        }
        holder.addEventListener('click', () => pikChirp());
        row.appendChild(holder);
      });
      window.__loaderHideAt = Math.max(window.__loaderHideAt || 0, Date.now() + 2400); // a beat longer to admire the crew
    }
    // the subtext is a comedy marquee: one random boot joke, rotating
    const sub = document.querySelector('#loader .loader-subtext');
    if (sub) {
      sub.removeAttribute('data-i18n'); // the jokes outrank the dictionary
      let jokeIx = Math.floor(Math.random() * LOADER_JOKES.length);
      const tellOne = () => {
        const j = LOADER_JOKES[jokeIx % LOADER_JOKES.length];
        sub.textContent = trT(j[0], j[1]);
        jokeIx++;
      };
      tellOne();
      const jokeTimer = setInterval(() => {
        const l = document.getElementById('loader');
        if (!l || l.style.display === 'none' || l.classList.contains('fade-out')) { clearInterval(jokeTimer); return; }
        tellOne();
      }, 1600);
    }
  }

  /* ---------- PIK PARADE — special commands are performed by YOUR squad ----------
     no faceless emoji rain: the visitor's own pikmin march across the
     screen. no pikmin yet? the agency dispatches LOANERS — guaranteed
     hidden species (or the chameleon), yours for exactly 5 minutes ♡ */
  const PIK_LOAN_MS = 5 * 60 * 1000;
  function pikLoanSweep() {
    const dex = pikdexGet();
    const now = Date.now();
    const keep = dex.filter((p) => !p.loan || p.loan > now);
    if (keep.length === dex.length) return;
    pikdexSave(keep);
    pikdexRosterProject();
    if (typeof deskPikResync === 'function') deskPikResync();
    renderPikdexSoon();
    showToast(trT('the loaner pikmin went home — the agency says hi ♡', 'les pikmin de prêt sont rentrés — l\'agence vous salue ♡'));
  }
  setInterval(pikLoanSweep, 30000);
  function pikEnsureCast() {
    const dex = pikdexGet();
    if (dex.length) {
      const actives = pikdexActives(dex);
      return actives.length ? actives : dex.slice(0, PIK_MAX);
    }
    // empty deck → summon 3 loaners, 100% hidden species / chameleon
    const pool = HIDDEN_SPECIES.slice();
    const picks = [];
    for (let i = 0; i < 3; i++) {
      if (i === 2 && Math.random() < 0.34) {
        picks.push({ h: 5 + Math.floor(Math.random() * 355), ch: 1, s: 2, k: PIK_SKILLS[Math.floor(Math.random() * PIK_SKILLS.length)].id, a: 1, t: Date.now(), loan: Date.now() + PIK_LOAN_MS });
        continue;
      }
      const sp = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      picks.push({ h: 5 + Math.floor(Math.random() * 355), ch: 0, s: 2, k: PIK_SKILLS[Math.floor(Math.random() * PIK_SKILLS.length)].id, sp: sp.id, a: 1, t: Date.now(), loan: Date.now() + PIK_LOAN_MS });
    }
    pikdexSave(picks);
    pikdexRosterProject();
    if (typeof deskPikResync === 'function') deskPikResync();
    renderPikdexSoon();
    showToast(trT('no squad?! the agency dispatched 3 RARE loaners — yours for 5 minutes ♡', 'pas d\'escouade ?! l\'agence dépêche 3 prêts RARES — à vous pour 5 minutes ♡'));
    return picks;
  }
  function pikParade() {
    const cast = pikEnsureCast();
    playFanfare();
    if (REDUCED_MOTION) return cast; // the fanfare + rewards still land
    const n = Math.max(4, Math.min(9, cast.length * 2));
    for (let i = 0; i < n; i++) {
      const p = cast[i % cast.length];
      const sp = p.sp ? pikSpecies(p.sp) : null;
      const el = document.createElement('div');
      el.className = 'pik-parade' + (sp && sp.fx ? ' pikfx-' + sp.fx : '') + (p.ch ? ' pikfx-rgbcycle' : '');
      const img = document.createElement('img');
      img.src = pikSprite(pikEntryColor(p), p.s || 0, p.sp || null);
      img.alt = '';
      el.appendChild(img);
      if (sp) {
        const hat = document.createElement('span');
        hat.className = 'pik-hat';
        hat.textContent = sp.hat;
        el.appendChild(hat);
      }
      el.style.top = (16 + Math.random() * 58) + 'vh';
      el.style.animationDelay = (i * 0.32) + 's';
      el.style.animationDuration = (4.6 + Math.random() * 2.2) + 's';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 9500);
    }
    return cast;
  }

  /* a hidden-species pull: rarer than candy, cheaper than a GPU */
  function pikHiddenCelebrate(species) {
    playFanfare();
    showToast(trT(`${species.hat}✨ HIDDEN SPECIES!! ${species.n[0]} joined the deck!!`, `${species.hat}✨ ESPÈCE CACHÉE !! ${species.n[1]} rejoint le deck !!`));
    if (!pet.sleeping) showBubble(trT(`${species.hat} a ${species.n[0]}?! check its file in pikdex.exe!!`, `${species.hat} un ${species.n[1]} ?! regarde sa fiche dans pikdex.exe !!`), 3400);
    if (REDUCED_MOTION) return;
    for (let i = 0; i < 18; i++) {
      const f = document.createElement('span');
      f.className = 'cham-burst pik-hidden-burst';
      f.textContent = species.hat;
      f.style.left = (Math.random() * 100) + 'vw';
      f.style.fontSize = (14 + Math.random() * 14) + 'px';
      f.style.animationDelay = (Math.random() * 0.9) + 's';
      f.style.animationDuration = (2.2 + Math.random() * 1.6) + 's';
      document.body.appendChild(f);
      setTimeout(() => f.remove(), 5200);
    }
  }

  function pikdexSetActive(ix, on) {
    const dex = pikdexGet();
    if (!dex[ix]) return;
    if (on && pikdexActives(dex).length >= PIK_MAX) {
      showToast(trT('squad is full (6) — rest someone first ♡', 'escouade pleine (6) — repose quelqu\'un d\'abord ♡'));
      return;
    }
    dex[ix].a = on ? 1 : 0;
    pikdexSave(dex);
    pikdexRosterProject();
    deskPikResync();
    gardenResync();
    applyPikFloat();
    // a mid-run swap marches straight into slime_run.exe, no restart needed
    try {
      if (typeof GAME !== 'undefined' && GAME && GAME.state === 'run' && typeof gAttachPiks === 'function') gAttachPiks(true);
    } catch (e) { /* game not booted yet */ }
    pikChirp();
    showToast(on
      ? trT(`⭐ ${pikNameOf(dex, ix)} joins the squad!!`, `⭐ ${pikNameOf(dex, ix)} rejoint l'escouade !!`)
      : trT(`💤 ${pikNameOf(dex, ix)} is resting in the deck`, `💤 ${pikNameOf(dex, ix)} se repose dans le deck`));
    if (typeof cloudQueueSync === 'function') cloudQueueSync();
    renderPikdex();
  }

  /* ---------- pikdex.exe rendering: hue wheel + deck grid + dossier ---------- */
  var pikLbCache = null, pikLbCacheAt = 0;
  const PIKLB_TIER_NAMES = [
    ['🌱 Sprout Scout', '🌱 Éclaireur de Pousses'],
    ['🌼 Meadow Regular', '🌼 Habitué de la Prairie'],
    ['🌈 TRUE COLOR', '🌈 TRUE COLOR'],
    ['🌿 Overgrower', '🌿 Sur-Cultivateur'],
    ['🌺 Evolution Engine', '🌺 Moteur d\'Évolution'],
    ['👑 Apex Rancher', '👑 Éleveur Apex'],
    ['✨ Meadow Deity', '✨ Divinité de la Prairie']
  ];
  function pikLbDetail(counts) {
    const wrap = document.createElement('div');
    wrap.id = 'pikdex-lb-detail';
    wrap.className = 'piklb-ladder';
    const head = document.createElement('div');
    head.className = 'piklb-head';
    head.textContent = trT('🌍 WORLDWIDE MEADOW STANDINGS — gardeners who reached each rank', '🌍 CLASSEMENT MONDIAL DE LA PRAIRIE — jardiniers ayant atteint chaque rang');
    wrap.appendChild(head);
    const myTier = pikLbTier(pikCountTotal());
    const maxC = Math.max(1, counts[1] || 0);
    for (let i = PIKLB_TIERS.length; i >= 1; i--) {
      const row = document.createElement('div');
      row.className = 'piklb-row' + (myTier === i ? ' is-you' : '');
      const name = document.createElement('span');
      name.className = 'piklb-name';
      name.textContent = trT(PIKLB_TIER_NAMES[i - 1][0], PIKLB_TIER_NAMES[i - 1][1]) + ' · ' + PIKLB_TIERS[i - 1] + '+';
      const bar = document.createElement('span');
      bar.className = 'piklb-bar';
      const fill = document.createElement('i');
      fill.style.width = Math.max(3, Math.round(((counts[i] || 0) / maxC) * 100)) + '%';
      bar.appendChild(fill);
      const n = document.createElement('span');
      n.className = 'piklb-n';
      n.textContent = String(counts[i] || 0) + (myTier === i ? trT(' ◀ YOU', ' ◀ TOI') : '');
      row.append(name, bar, n);
      wrap.appendChild(row);
    }
    const foot = document.createElement('div');
    foot.className = 'piklb-foot';
    foot.textContent = myTier >= 1
      ? trT('anonymous census — each gardener is counted once per rank reached ♡', 'recensement anonyme — chaque jardinier compte une fois par rang atteint ♡')
      : trT(`pluck ${PIKLB_TIERS[0] - pikCountTotal()} more to enter the standings ♡`, `cueille encore ${PIKLB_TIERS[0] - pikCountTotal()} pour entrer au classement ♡`);
    wrap.appendChild(foot);
    return wrap;
  }
  function pikLbRender(el) {
    if (!el._wired) {
      el._wired = 1;
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.title = trT('click: worldwide standings', 'clic : classement mondial');
      const toggle = () => {
        const old = document.getElementById('pikdex-lb-detail');
        if (old) { old.remove(); return; }
        const paintDetail = (counts) => { if (counts) el.parentNode.insertBefore(pikLbDetail(counts), el.nextSibling); };
        if (pikLbCache) { paintDetail(pikLbCache); return; }
        pikLbRender(el); // triggers the fetch; try again once it lands
        setTimeout(() => { if (pikLbCache && !document.getElementById('pikdex-lb-detail')) paintDetail(pikLbCache); }, 1500);
      };
      el.addEventListener('click', toggle);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    }
    const total = pikCountTotal();
    const mine = trT(`🧺 your lifetime plucks: ${total}`, `🧺 tes cueillettes : ${total}`);
    const paint = (counts) => {
      const reached1 = counts[1] || 0;
      if (!reached1) {
        el.textContent = mine + ' · ' + trT('🌍 the worldwide meadow is brand new — plant the flag!!', '🌍 la prairie mondiale est toute neuve — plante le drapeau !!');
        return;
      }
      const myTier = pikLbTier(total);
      const atOrAbove = myTier >= 1 ? (counts[myTier] || 0) : reached1;
      const topPct = Math.max(1, Math.min(100, Math.round((atOrAbove / reached1) * 100)));
      el.textContent = mine + ' · ' + trT(
        `🌍 ${reached1} gardeners worldwide — your meadow sits around the top ${topPct}%`,
        `🌍 ${reached1} jardiniers dans le monde — ta prairie est dans le top ${topPct}% environ`
      );
    };
    if (pikLbCache && Date.now() - pikLbCacheAt < 600000) { paint(pikLbCache); return; }
    el.textContent = mine + ' · ' + trT('🌍 contacting the worldwide meadow…', '🌍 contact de la prairie mondiale…');
    if (!navigator.onLine) return;
    Promise.all(Array.from({ length: PIKLB_TIERS.length + 1 }, (_, i) =>
      fetch(`${ACHV_API}/get/${ACHV_NS}/piklb-t${i}`).then((r) => (r.ok ? r.json() : { value: 0 })).then((d) => Math.max(0, Number(d.value) || 0)).catch(() => 0)
    )).then((counts) => { pikLbCache = counts; pikLbCacheAt = Date.now(); paint(counts); })
      .catch(() => { el.textContent = mine; });
  }
  function renderPikdex() {
    const grid = document.getElementById('pikdex-grid');
    if (!grid) return;
    const dex = pikdexGet();
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    // hue wheel donut — 24 crisp wedges, collected ones glow in their hue
    const cv = document.getElementById('pikdex-wheel');
    if (cv && cv.getContext) {
      const ctx = cv.getContext('2d');
      const segsSet = pikdexWheelSegs(dex);
      const cx = 60, cy = 60, R = 56, r0 = 27;
      ctx.clearRect(0, 0, 120, 120);
      for (let i = 0; i < WHEEL_SEGS; i++) {
        const a0 = ((i * WHEEL_STEP) - 90) * Math.PI / 180;
        const a1 = (((i + 1) * WHEEL_STEP) - 90) * Math.PI / 180;
        ctx.beginPath();
        ctx.arc(cx, cy, R, a0, a1);
        ctx.arc(cx, cy, r0, a1, a0, true);
        ctx.closePath();
        ctx.fillStyle = segsSet.has(i) ? `hsl(${i * WHEEL_STEP + WHEEL_STEP / 2}, 78%, ${dark ? 60 : 68}%)` : (dark ? '#3a2452' : '#efe3f6');
        ctx.fill();
        ctx.strokeStyle = dark ? '#1c0f2e' : '#5a3d6e';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(cx, cy, r0 - 4, 0, 6.2832);
      ctx.fillStyle = dark ? '#2a1440' : '#fff6fb';
      ctx.fill();
      ctx.strokeStyle = dark ? '#b79af0' : '#5a3d6e';
      ctx.stroke();
    }
    const hasCh = dex.some((p) => p.ch);
    const center = document.getElementById('pikdex-wheel-center');
    if (center) {
      center.textContent = hasCh ? '🦎' : '♡';
      center.title = hasCh ? trT('the chameleon sits in the middle, above such choices', 'le caméléon trône au centre, au-dessus de ces choix') : '';
    }
    const segs = pikdexWheelCount(dex);
    const pctEl = document.getElementById('pikdex-pct');
    if (pctEl) pctEl.textContent = pikdexWheelPct(dex) + '%';
    const note = document.getElementById('pikdex-wheel-note');
    if (note) {
      note.textContent = trT(
        `${segs}/50 hue segments collected (2% each) — the full wheel = TRUE COLOR (all fifty shades of hue)`,
        `${segs}/50 segments de teinte (2 % chacun) — la roue complète = TRUE COLOR (les cinquante nuances)`
      );
    }
    let lbLine = document.getElementById('pikdex-lb-line');
    if (!lbLine && note && note.parentNode) {
      lbLine = document.createElement('div');
      lbLine.id = 'pikdex-lb-line';
      lbLine.className = 'pikdex-lb-line';
      note.parentNode.insertBefore(lbLine, note.nextSibling);
    }
    if (lbLine && typeof pikLbRender === 'function') pikLbRender(lbLine);
    const squad = document.getElementById('pikdex-squadline');
    if (squad) {
      const nonChN = dex.filter((p) => !p.ch).length;
      const chTag = dex.some((p) => p.ch) ? ' · 🦎' : '';
      const lbTotal = pikCountTotal();
      squad.textContent = trT(
        `⭐ on duty: ${pikdexActives(dex).length}/${PIK_MAX} · deck: ${nonChN}/${PIKDEX_CAP}${chTag} · 🧺 lifetime plucks: ${lbTotal}`,
        `⭐ en service : ${pikdexActives(dex).length}/${PIK_MAX} · deck : ${nonChN}/${PIKDEX_CAP}${chTag} · 🧺 cueillettes : ${lbTotal}`
      );
    }
    // float-mode picker: exactly how high the squad hovers over the OS
    const floatBox = document.getElementById('pikdex-float');
    if (floatBox) {
      floatBox.innerHTML = ''; // rebuilt below, textContent only
      const lab = document.createElement('span');
      lab.className = 'pikdex-float-label';
      lab.textContent = trT('FLOAT MODE', 'FLOTTAISON');
      floatBox.appendChild(lab);
      const current = pikFloatMode();
      PIK_FLOAT_OPTS.forEach((o) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pikdex-float-btn' + (current === o.id ? ' is-picked' : '');
        b.textContent = `${o.icon} ${trT(o.name[0], o.name[1])}`;
        b.title = trT(o.d[0], o.d[1]);
        b.setAttribute('aria-pressed', current === o.id ? 'true' : 'false');
        b.addEventListener('click', () => {
          store.set('yos-pik-float', o.id);
          applyPikFloat();
          pikChirp();
          renderPikdex();
        });
        floatBox.appendChild(b);
      });
      const desc = document.createElement('span');
      desc.className = 'pikdex-float-desc';
      const cur = PIK_FLOAT_OPTS.find((o) => o.id === current);
      desc.textContent = trT(cur.d[0], cur.d[1]) + trT(' · (live room & game always tuck them away — the squad is in there)', ' · (le salon live & le jeu les rangent toujours — l\'escouade y est déjà)');
      floatBox.appendChild(desc);
    }
    // the chameleon lives in the wheel hub — click it to open its dossier
    if (center) {
      const chIx = dex.findIndex((p) => p.ch);
      center.classList.toggle('is-clickable', chIx >= 0);
      center.onclick = chIx >= 0 ? () => pikProfileShow(chIx) : null;
      center.style.pointerEvents = chIx >= 0 ? 'auto' : 'none';
    }
    /* THE 72 FIXED SLOTS — a real dex: 50 hue slots (sorted around the
       wheel) + 22 hidden-species slots. empty slots tease what's coming. */
    grid.innerHTML = ''; // rebuilt below — every string goes through textContent
    function makeCell(dexIx, extraCls) {
      const p = dex[dexIx];
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'pikdex-cell' + (p.a ? ' is-on-duty' : '') + (p.ch ? ' is-chameleon' : '') + (extraCls || '');
      cell.setAttribute('role', 'listitem');
      const name = pikNameOf(dex, dexIx);
      cell.title = name;
      const img = document.createElement('img');
      img.src = pikSprite(p.sp ? pikEntryColor(p) : hueColor(pikHueOf(p)), p.s || 0, p.sp || null);
      img.alt = '';
      const nm = document.createElement('span');
      nm.className = 'pikdex-cell-name';
      nm.textContent = name;
      if (p.a) {
        const star = document.createElement('span');
        star.className = 'pikdex-cell-star';
        star.textContent = '⭐';
        star.setAttribute('aria-label', trT('on the squad', 'dans l\'escouade'));
        cell.appendChild(star);
      }
      const cellForm = pikFormOf(p);
      if (cellForm >= 2) {
        const fb = document.createElement('span');
        fb.className = 'pikdex-cell-form' + (cellForm === 3 ? ' is-apex' : '');
        fb.textContent = cellForm === 3 ? '👑' : '★★';
        fb.setAttribute('aria-label', trT('form ' + cellForm, 'forme ' + cellForm));
        cell.appendChild(fb);
      }
      if (p.sp) {
        const sp = pikSpecies(p.sp);
        if (sp) {
          const hat = document.createElement('span');
          hat.className = 'pikdex-cell-hat';
          hat.textContent = sp.hat;
          cell.appendChild(hat);
          if (sp.fx) cell.classList.add('pikfx-' + sp.fx);
        }
      }
      cell.append(img, nm);
      cell.addEventListener('click', () => pikProfileShow(dexIx));
      return cell;
    }
    // slot owners: first catch of each wheel segment / each species
    const segOwner = {}, spOwner = {};
    dex.forEach((p, ix) => {
      if (p.ch) return;
      if (p.sp) { if (spOwner[p.sp] == null) spOwner[p.sp] = ix; return; }
      const seg = Math.floor(pikHueOf(p) / WHEEL_STEP) % WHEEL_SEGS;
      if (segOwner[seg] == null) segOwner[seg] = ix;
    });
    for (let seg = 0; seg < WHEEL_SEGS; seg++) {
      if (segOwner[seg] != null) {
        grid.appendChild(makeCell(segOwner[seg]));
      } else {
        const empty = document.createElement('div');
        empty.className = 'pikdex-cell pikdex-cell-empty';
        empty.title = trT(`a colour is missing here (hue ~${Math.round(seg * WHEEL_STEP + WHEEL_STEP / 2)}°) — the meadow is already growing it ♡`, `une couleur manque ici (teinte ~${Math.round(seg * WHEEL_STEP + WHEEL_STEP / 2)}°) — la prairie la fait déjà pousser ♡`);
        empty.style.setProperty('--slot-hue', String(Math.round(seg * WHEEL_STEP + WHEEL_STEP / 2)));
        empty.textContent = '?';
        grid.appendChild(empty);
      }
    }
    // hidden-species shelf: 22 slots, riddles included — know what to hope for
    const hiddenHead = document.createElement('div');
    hiddenHead.className = 'pikdex-hidden-head';
    const gotSp = Object.keys(spOwner).length;
    hiddenHead.textContent = trT(
      `✨ HIDDEN SPECIES ${gotSp}/22 — about 1 sprout in 10 mutates into a computer-born creature: own hat, own colours, own walk cycle ♡`,
      `✨ ESPÈCES CACHÉES ${gotSp}/22 — environ 1 pousse sur 10 mute en créature née de l'ordinateur : chapeau, couleurs et démarche à elle ♡`
    );
    grid.appendChild(hiddenHead);
    HIDDEN_SPECIES.forEach((sp) => {
      if (spOwner[sp.id] != null) {
        grid.appendChild(makeCell(spOwner[sp.id], ' is-hidden-owned'));
      } else {
        const mys = document.createElement('div');
        mys.className = 'pikdex-cell pikdex-cell-empty pikdex-cell-mystery';
        mys.title = trT(sp.t[0], sp.t[1]); // the riddle — something to hope for
        const shadow = document.createElement('img');
        shadow.className = 'pikdex-shadow-pik'; // an unplucked silhouette, house-made
        shadow.src = pikSprite({ body: '#8f81a8', dark: '#5c4f75' }, 0, sp.id, true);
        shadow.alt = '';
        const nm = document.createElement('span');
        nm.className = 'pikdex-cell-name';
        nm.textContent = '???';
        mys.append(shadow, nm);
        grid.appendChild(mys);
      }
    });
    const hint = document.getElementById('pikdex-hint');
    if (hint) {
      const nonCh = dex.filter((p) => !p.ch).length;
      if (nonCh >= PIKDEX_CAP) {
        hint.textContent = trT('PIKDEX COMPLETE — 72/72!! the meadow now grows DUPLICATES: same kind × enough = EVOLUTION (3 forms each) ♡', 'PIKDEX COMPLET — 72/72 !! la prairie fait pousser des DOUBLONS : même espèce × assez = ÉVOLUTION (3 formes) ♡');
      } else if (dex.length) {
        hint.textContent = trT('tap a cell for the personnel file ♡ — 50 hues + 22 hidden species = a perfect 72. hidden sprouts ✨glitter✨, pluck them fast!!', 'touche une case pour le dossier ♡ — 50 teintes + 22 espèces cachées = un 72 parfait. les pousses cachées ✨scintillent✨, cueille-les vite !!');
      } else {
        hint.textContent = trT('no pikmin yet!! sprouts pop out of the desktop wallpaper (and the live garden) — pluck one ♡', 'aucun pikmin !! des pousses sortent du fond d\'écran (et du jardin live) — cueilles-en une ♡');
      }
    }
  }
  var pikProfileTimer = null;
  function pikProfileHide() {
    const ov = document.getElementById('pikdex-profile');
    if (ov) { ov.hidden = true; ov.innerHTML = ''; }
    if (pikProfileTimer) { clearInterval(pikProfileTimer); pikProfileTimer = null; }
  }
  function pikProfileShow(ix) {
    const ov = document.getElementById('pikdex-profile');
    if (!ov) return;
    const dex = pikdexGet();
    const p = dex[ix];
    if (!p) return;
    pikProfileHide();
    ov.hidden = false;
    const card = document.createElement('div');
    card.className = 'pik-card';
    const head = document.createElement('div');
    head.className = 'pik-card-head';
    const title = document.createElement('strong');
    title.textContent = pikNameOf(dex, ix) + '.pik';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'pik-card-close';
    close.setAttribute('aria-label', trT('Close profile', 'Fermer le dossier'));
    close.textContent = '♥';
    close.addEventListener('click', pikProfileHide);
    head.append(title, close);
    const body = document.createElement('div');
    body.className = 'pik-card-body';
    const port = document.createElement('div');
    port.className = 'pik-card-portrait';
    const big = document.createElement('img');
    big.alt = '';
    big.src = pikSprite(pikEntryColor(p), p.s || 0, p.sp || null);
    port.appendChild(big);
    const pSpecies = p.sp ? pikSpecies(p.sp) : null;
    if (pSpecies) {
      const bigHat = document.createElement('span');
      bigHat.className = 'pik-card-hat';
      bigHat.textContent = pSpecies.hat;
      port.appendChild(bigHat);
      if (pSpecies.fx) port.classList.add('pikfx-' + pSpecies.fx);
    }
    if (p.ch) {
      let hh = pikHueOf(p);
      pikProfileTimer = setInterval(() => { hh = (hh + 24) % 360; big.src = pikSprite(hueColor(hh), p.s || 0); }, 300);
    }
    const info = document.createElement('div');
    info.className = 'pik-card-info';
    function line(label, value) {
      const el = document.createElement('div');
      el.className = 'pik-card-line';
      const b = document.createElement('span');
      b.className = 'pik-card-label';
      b.textContent = label;
      const v = document.createElement('span');
      v.textContent = value;
      el.append(b, v);
      info.appendChild(el);
    }
    const h = pikHueOf(p);
    line(trT('HUE', 'TEINTE'), p.ch
      ? trT('ALL OF THEM (it refuses to choose)', 'TOUTES (il refuse de choisir)')
      : (pSpecies
        ? trT('CLASSIFIED — hidden species ✨', 'CLASSIFIÉ — espèce cachée ✨')
        : `${h}° · ${PIK_SWATCH[Math.floor(h / 15) % PIK_SWATCH.length]}`));
    if (pSpecies) line(trT('ORIGIN', 'ORIGINE'), trT(pSpecies.lore[0], pSpecies.lore[1]));
    const stages = [trT('🌱 sprout', '🌱 pousse'), trT('🌿 bud', '🌿 bourgeon'), trT('🌸 bloom', '🌸 floraison')];
    line(trT('STAGE', 'STADE'), stages[Math.min(p.s || 0, 2)]);
    const kk = pikKindKey(p);
    const kCnt = pikCounts()[kk] || 1;
    const kTh = pikThresholds(kk);
    const kForm = pikFormOfCount(kCnt, kk);
    line(trT('FORM', 'FORME'), kForm === 3
      ? trT(`👑 APEX — ×${kCnt} collected. a walking legend.`, `👑 APEX — ×${kCnt} attrapés. une légende ambulante.`)
      : kForm === 2
        ? trT(`★★ evolved · ${kCnt}/${kTh[1]} to APEX (dupes count!)`, `★★ évolué · ${kCnt}/${kTh[1]} vers APEX (les doublons comptent !)`)
        : trT(`★ base · ${kCnt}/${kTh[0]} to evolve (dupes count!)`, `★ base · ${kCnt}/${kTh[0]} pour évoluer (les doublons comptent !)`));
    line('UPTIME', pikAgeOf(p));
    line(trT('DUTY', 'SERVICE'), p.a
      ? trT('⭐ on the squad — desktop patrol + slime_run.exe combat', '⭐ dans l\'escouade — patrouille bureau + combat slime_run.exe')
      : trT('💤 resting in the deck', '💤 au repos dans le deck'));
    const meta = PIK_SKILL_META[p.k] || { icon: '✨', name: '???', en: 'undocumented technique. scholars are looking into it.', fr: 'technique non documentée. les chercheurs enquêtent.' };
    const sk = document.createElement('div');
    sk.className = 'pik-card-skill';
    const skName = document.createElement('div');
    skName.className = 'pik-card-skill-name';
    skName.textContent = `${meta.icon} ${meta.name}`;
    const skDesc = document.createElement('div');
    skDesc.className = 'pik-card-skill-desc';
    skDesc.textContent = trT(meta.en, meta.fr);
    const skHint = document.createElement('div');
    skHint.className = 'pik-card-skill-hint';
    skHint.textContent = (p.s || 0) === 2
      ? trT('equipped — fires automatically in slime_run.exe', 'équipée — se déclenche automatiquement dans slime_run.exe')
      : trT('activates in-game at 🌸 bloom stage (it\'s still studying)', 's\'active en jeu au stade 🌸 (il révise encore)');
    sk.append(skName, skDesc, skHint);
    const stats = document.createElement('div');
    stats.className = 'pik-card-stats';
    function statRow(label, val, hintText) {
      const row = document.createElement('div');
      row.className = 'stat-row';
      const name = document.createElement('span');
      name.className = 'stat-name';
      name.textContent = label;
      if (hintText) name.title = hintText;
      const barEl = document.createElement('div');
      barEl.className = 'stat-bar';
      const fill = document.createElement('div');
      fill.className = 'stat-fill' + (val == null ? ' pik-stat-mystery' : '');
      fill.style.setProperty('--v', (val == null ? 100 : val) + '%');
      barEl.appendChild(fill);
      const num = document.createElement('span');
      num.className = 'stat-num';
      num.textContent = val == null ? '??' : val;
      row.append(name, barEl, num);
      stats.appendChild(row);
    }
    const st = pikStatsOf(p);
    if (st) {
      statRow('CPU', st.cpu, trT('cuteness processing unit', 'unité de traitement de mignonnerie'));
      statRow('RAM', st.ram, trT('remembers all meals', 'retient tous les repas'));
      statRow('FPS', st.fps, trT('flowers per second', 'fleurs par seconde'));
      statRow('PING', st.ping, trT('ms to answer a pet', 'ms pour répondre à une caresse'));
    } else {
      statRow('CPU', null); statRow('RAM', null); statRow('FPS', null); statRow('PING', null);
      const chNote = document.createElement('div');
      chNote.className = 'pik-card-chnote';
      chNote.textContent = trT('benchmarks refuse to settle. the chameleon is beyond measurement ♡', 'les benchmarks refusent de se stabiliser. le caméléon dépasse la mesure ♡');
      stats.appendChild(chNote);
    }
    const bio = document.createElement('div');
    bio.className = 'pik-card-bio';
    const bx = (h * 31 + ix) % PIK_BIOS.length;
    bio.textContent = '“' + trT(PIK_BIOS[bx], PIK_BIOS_FR[bx]) + '”';
    const actions = document.createElement('div');
    actions.className = 'pik-card-actions';
    const swap = document.createElement('button');
    swap.type = 'button';
    swap.className = 'pik-card-btn';
    if (p.a) {
      swap.textContent = trT('💤 send to rest', '💤 mettre au repos');
      swap.addEventListener('click', () => { pikdexSetActive(ix, false); pikProfileHide(); });
    } else {
      const room = pikdexActives(dex).length < PIK_MAX;
      swap.textContent = room
        ? trT('⭐ join the squad', '⭐ rejoindre l\'escouade')
        : trT('⭐ squad full (6) — rest someone first', '⭐ escouade pleine (6) — repose quelqu\'un');
      swap.disabled = !room;
      if (room) swap.addEventListener('click', () => { pikdexSetActive(ix, true); pikProfileHide(); });
    }
    actions.appendChild(swap);
    body.append(port, info);
    card.append(head, body, sk, stats, bio, actions);
    ov.appendChild(card);
    ov.addEventListener('click', function bg(e) {
      if (e.target === ov) { pikProfileHide(); ov.removeEventListener('click', bg); }
    });
    playTone(980, 'square', 0.05, 0, 0.02);
  }

  function deskSprout() {
    if (!DESK_PIK.layer) return;
    if (DESK_PIK.layer.querySelector('.desk-sprout')) return;
    const roll = pikRollSprout(); // chameleon → hidden species → missing hue
    if (!roll) return;            // deck complete — the meadow rests ♡
    const chameleon = roll.type === 'chameleon';
    const species = roll.type === 'hidden' ? roll.sp : null;
    const hue = roll.type === 'normal' ? roll.hue : 5 + Math.floor(Math.random() * 355);
    const color = species ? species.body : hueColor(hue);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pik-sprout desk-sprout' + (species ? ' pik-sprout-hidden' : '');
    btn.setAttribute('aria-label', t('live.pluck'));
    const img = document.createElement('img');
    img.src = pikSprite(color, 0, species ? species.id : null);
    img.alt = '';
    img.style.width = '33px';
    img.style.clipPath = 'inset(0 0 58% 0)';
    btn.appendChild(img);
    if (species) { // a hidden sprout glitters — you can tell something is up
      const tease = document.createElement('span');
      tease.className = 'pik-sprout-tease';
      tease.textContent = '✨';
      btn.appendChild(tease);
    }
    const r = DESK_PIK.layer.getBoundingClientRect();
    btn.style.left = (60 + Math.random() * Math.max(100, r.width - 200)) + 'px';
    btn.style.top = (r.height * 0.4 + Math.random() * (r.height * 0.45)) + 'px';
    if (chameleon) { // even the sprout can't hold a colour
      btn._hueTimer = setInterval(() => { img.src = pikSprite(hueColor(hue + Date.now() / 14 % 360), 0); }, 420);
    }
    btn.addEventListener('click', () => {
      if (btn._hueTimer) clearInterval(btn._hueTimer);
      const entry = { h: hue, ch: chameleon ? 1 : 0, s: 0, k: PIK_SKILLS[Math.floor(Math.random() * PIK_SKILLS.length)].id, sp: species ? species.id : null };
      const verdict = pikdexAdd(entry); // archived forever, squad if there's room
      if (verdict === 'dup') {
        btn.remove();
        playSparkleSound(); pikChirp();
        const kk = pikKindKey(entry);
        const cnt = pikCounts()[kk] || 1;
        const th = pikThresholds(kk);
        const nxt = cnt >= th[1] ? null : (cnt >= th[0] ? th[1] : th[0]);
        achvBump('plucks');
        if (!pet.sleeping) showBubble(nxt
          ? trT(`+1 of that kind!! ${cnt}/${nxt} toward its next form ♡`, `+1 de cette espèce !! ${cnt}/${nxt} vers sa prochaine forme ♡`)
          : trT('+1 for an APEX legend — pure leaderboard fuel ♡', '+1 pour une légende APEX — pur carburant de classement ♡'), 2600);
        return;
      }
      store.set('yos-pik-plucked', true);
      if (typeof updateLiveTab === 'function') updateLiveTab();
      playSparkleSound(); pikChirp(); pikChirp();
      if (verdict === 'active') {
        const w = deskPikSpawn(species ? 5 : hue, 0, chameleon, species ? species.id : null);
        w.x = parseFloat(btn.style.left); w.y = parseFloat(btn.style.top);
        w.tx = w.x; w.ty = w.y;
        w.el.style.left = w.x + 'px'; w.el.style.top = w.y + 'px';
        deskPikSay(w, chameleon ? 'p̷i̷k̷?̷!̷ ♡' : (species ? 'p1k?!' : 'pik!!'));
      }
      btn.remove();
      achvBump('plucks');
      if (chameleon) {
        achvUnlock('chameleon');
        chameleonCelebrate(); // 1% pull — the whole desktop rains rainbow blooms
        if (!pet.sleeping) showBubble(trT('WAIT. that one keeps CHANGING COLOURS?! a hidden chameleon!! (1% pull!!)', 'ATTENDS. il n\'arrête pas de CHANGER DE COULEUR ?! un caméléon caché !! (tirage à 1 % !!)'), 3600);
      } else if (species) {
        pikHiddenCelebrate(species);
      } else if (verdict === 'deck' && !pet.sleeping) {
        showBubble(trT('squad\'s full — the new buddy is filed in pikdex.exe, awaiting promotion ♡', 'escouade pleine — le nouveau copain est classé dans pikdex.exe, en attente de promotion ♡'), 3000);
      } else if (!pet.sleeping) {
        showBubble(trT('a wild buddy joined the DESKTOP crew ♡', 'un copain sauvage rejoint l\'équipe du BUREAU ♡'), 2400);
      }
    });
    DESK_PIK.layer.appendChild(btn);
  }
  function deskPikTick() {
    // while the desktop twins are curtained off (live room / game open /
    // shy mode), time FREEZES for them: no walking, no sprouting, no trails —
    // the curtain lifts on the exact scene it fell on
    if (DESK_PIK.layer && DESK_PIK.layer.classList.contains('pik-float-hidden')) return;
    const now = Date.now();
    if (now > DESK_PIK.sproutAt) {
      DESK_PIK.sproutAt = now + 16000 + Math.random() * 16000; // brisk regrowth (16-32s)
      deskSprout();
    }
    DESK_PIK.walkers.forEach((w) => {
      // the chameleon never settles on a colour — cycles the wheel
      if (w.chameleon && now > w.hueAt) {
        w.hueAt = now + 480;
        w.hue = ((w.hue || 5) + 30) % 360 || 5;
        w.img.src = pikSprite(hueColor(w.hue), w.stage);
      }
      if (now < w.restUntil) return;
      const dx = w.tx - w.x, dy = w.ty - w.y;
      const d = Math.hypot(dx, dy);
      if (d < 4) {
        w.el.classList.remove('walking');
        w.restUntil = now + 1800 + Math.random() * 4200;
        if (Math.random() < 0.3) pikChirp();
        if (Math.random() < 0.3) deskPikSay(w, PIK_LINES[Math.floor(Math.random() * PIK_LINES.length)]);
        const anchors = deskAnchorPoints();
        const r = DESK_PIK.layer.getBoundingClientRect();
        const p = (anchors.length && Math.random() < 0.45)
          ? anchors[Math.floor(Math.random() * anchors.length)]
          : { x: 30 + Math.random() * Math.max(120, r.width - 140), y: r.height * 0.3 + Math.random() * (r.height * 0.55) };
        w.tx = Math.max(6, p.x);
        w.ty = Math.max(60, p.y);
      } else {
        // Latency walks in 300ms packets; everyone else walks in realtime
        if (w.sp && w.sp.choppy) {
          if (now < w.stepAt) return;
          w.stepAt = now + 320;
          const hopLen = Math.min(d, 14);
          w.x += (dx / d) * hopLen;
          w.y += (dy / d) * hopLen;
        } else {
          const sp = 1.6 * (w.spd || 1);
          w.x += (dx / d) * sp;
          w.y += (dy / d) * sp;
        }
        w.el.classList.add('walking');
        const facingLeft = dx < 0;
        // 'Feature' walks backwards on purpose — sprite faces away from travel
        w.img.style.transform = ((w.sp && w.sp.flip) ? !facingLeft : facingLeft) ? 'scaleX(-1)' : '';
        w.el.style.left = w.x + 'px';
        w.el.style.top = w.y + 'px';
        // footprint blooms: RAINBOW confetti-flowers, 1-10 per step —
        // 3+ cluster into a round posy. Always UNDER the walker's feet,
        // never on its body; the whole patch melts away in 7 seconds.
        if (now > (w.trailAt || 0)) {
          w.trailAt = now + 750 + Math.random() * 450; // airier cadence
          const n = 1 + Math.floor(Math.random() * 10);
          const cx = w.x + 14, cy = w.y + 34; // strictly below the sprite
          const posyR = n > 2 ? 15 + n * 3 : 0; // roomy, breathable posies
          for (let k = 0; k < n; k++) {
            const f = document.createElement('img');
            f.className = 'pik-trail';
            f.src = trailBloomSprite(Math.floor(Math.random() * 6));
            f.alt = '';
            const size = 12 + Math.random() * 18; // 12-30px — generous blooms
            f.style.width = size + 'px';
            let ox = Math.random() * 26 - 13;
            let oy = Math.random() * 10;
            if (n > 2) { // round posy, loosely fanned below the feet
              const ang = (k / n) * 6.283 + Math.random() * 0.5;
              const rr = posyR * (0.45 + Math.random() * 0.55);
              ox = Math.cos(ang) * rr;
              oy = Math.abs(Math.sin(ang)) * rr * 0.9;
            }
            f.style.left = (cx + ox - size / 2) + 'px';
            f.style.top = (cy + oy) + 'px';
            DESK_PIK.layer.appendChild(f);
            setTimeout(() => f.classList.add('fading'), 10500);
            setTimeout(() => f.remove(), 12000);
          }
          const trails = DESK_PIK.layer.querySelectorAll('.pik-trail');
          for (let k = 0; k < trails.length - 120; k++) trails[k].remove(); // tidy meadow
        }
      }
    });
  }

  // six SOFT pastel bloom sprites — powder pink / milk lilac /
  // custard / powder blue / mint cream / peach milk. gentle on
  // the eyes, unmistakably Y2K NSO.
  var trailBloomCache = null;
  function trailBloomSprite(i) {
    if (!trailBloomCache) {
      trailBloomCache = [
        ['#ffc9e4', '#fff0f8'], ['#ddc9f7', '#f5edfd'], ['#ffedb3', '#fff9e3'],
        ['#c9e6ff', '#eef7ff'], ['#cdeedd', '#effaf4'], ['#ffd9c4', '#fff1e8']
      ].map(([a, b]) => {
        const c = document.createElement('canvas');
        c.width = 7; c.height = 7;
        const x = c.getContext('2d');
        x.fillStyle = a;
        x.fillRect(3, 1, 1, 5); x.fillRect(1, 3, 5, 1);
        x.fillRect(2, 2, 1, 1); x.fillRect(4, 2, 1, 1); x.fillRect(2, 4, 1, 1); x.fillRect(4, 4, 1, 1);
        x.fillStyle = b;
        x.fillRect(3, 3, 1, 1);
        return c.toDataURL();
      });
    }
    return trailBloomCache[(i || 0) % trailBloomCache.length];
  }
  /* ---------- sidebar drawers: three stacked cards, one visible,
     switched by folder-tab buttons underneath. NO scrollbar, ever. */
  function sidebarTabsInit() {
    const card = document.querySelector('.profile-card');
    if (!card || card.querySelector('.sb-tabs')) return;
    const habitat = card.querySelector('.habitat-shell');
    const hud = card.querySelector('.slime-hud');
    const info = card.querySelector('.profile-info');
    if (!habitat || !hud || !info) return;
    const contacts = info.querySelector('.profile-contacts');
    const socials = info.querySelector('.contact-socials');
    const mk = (id) => {
      const d = document.createElement('div');
      d.className = 'sb-card';
      d.id = id;
      d.setAttribute('role', 'tabpanel');
      return d;
    };
    const cardA = mk('sb-card-slime');
    const cardB = mk('sb-card-profile');
    const cardC = mk('sb-card-contact');
    cardA.append(habitat, hud);
    [...info.children].forEach((ch) => {
      if (ch === contacts || ch === socials) cardC.appendChild(ch);
      else cardB.appendChild(ch);
    });
    info.remove();
    const tabs = document.createElement('div');
    tabs.className = 'sb-tabs';
    tabs.setAttribute('role', 'tablist');
    const cards = { 'sb-card-slime': cardA, 'sb-card-profile': cardB, 'sb-card-contact': cardC };
    const btns = {};
    const select = (id, silent) => {
      Object.keys(cards).forEach((k) => {
        cards[k].classList.toggle('sb-active', k === id);
        btns[k].classList.toggle('active', k === id);
        btns[k].setAttribute('aria-selected', String(k === id));
      });
      if (!silent) playClickSound();
    };
    [
      ['sb-card-slime', '🐣', 'sb.tab.slime'],
      ['sb-card-profile', '📇', 'sb.tab.profile'],
      ['sb-card-contact', '✉️', 'sb.tab.contact']
    ].forEach(([id, icon, key]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sb-tab';
      b.setAttribute('role', 'tab');
      const i1 = document.createElement('span');
      i1.className = 'sb-tab-icon';
      i1.textContent = icon;
      const l1 = document.createElement('span');
      l1.className = 'sb-tab-label';
      l1.setAttribute('data-i18n', key);
      l1.textContent = t(key);
      b.append(i1, l1);
      b.addEventListener('click', () => select(id));
      btns[id] = b;
      tabs.appendChild(b);
    });
    card.append(cardA, cardB, cardC);
    // the divider pulls clip onto the BOTTOM EDGE OF THE WHOLE SIDEBAR,
    // hanging just outside it like real archive tabs
    const sidebar = document.querySelector('.desktop-sidebar') || card;
    sidebar.appendChild(tabs);
    select('sb-card-slime', true);
  }

  function deskPikInit() {
    const area = document.getElementById('main-desktop');
    if (!area || DESK_PIK.layer) return;
    pikCountsMigrate(); // pre-evolution saves: every collected kind starts at ×1
    const layer = document.createElement('div');
    layer.id = 'desk-pik-layer';
    layer.setAttribute('aria-hidden', 'true');
    area.appendChild(layer);
    DESK_PIK.layer = layer;
    deskRoster().slice(0, PIK_MAX).forEach((rr) => deskPikSpawn(rr.h != null ? rr.h : rr.c, rr.s, !!rr.ch, rr.sp || null));
    DESK_PIK.sproutAt = Date.now() + (deskRoster().length ? 10000 : 5000); // sprouts waste no time
    DESK_PIK.timer = setInterval(deskPikTick, 90);
    applyPikFloat(); // honour the saved float mode from the first frame
  }

  /* retired fridge-magnet decor (superseded by the meadow) */
  function desktopDecorate() {
    const area = document.getElementById('main-desktop');
    if (!area || document.getElementById('desk-clock')) return;
    // 1) clock + weather tile (click = open the live room)
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.id = 'desk-clock';
    tile.className = 'desk-clock';
    tile.setAttribute('aria-label', trT('Local time and Edmonton weather — open the live room', 'Heure locale et météo d\'Edmonton — ouvrir le direct'));
    const tTime = document.createElement('span');
    tTime.className = 'desk-clock-time';
    const tSub = document.createElement('span');
    tSub.className = 'desk-clock-sub';
    tile.append(tTime, tSub);
    tile.addEventListener('click', () => openWindow('win-live'));
    area.appendChild(tile);
    const WX_ICON = { clear: '☀️', cloud: '☁️', rain: '🌧️', snow: '❄️', fog: '🌫️', thunder: '⛈️', wind: '🍃', hail: '🧊', sleet: '🌨️', dust: '🌪️', heat: '🥵', blizzard: '🌨️', hurricane: '🌀' };
    const tickClock = () => {
      const d = new Date();
      tTime.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const day = trT(
        ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d.getDay()],
        ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'][d.getDay()]
      );
      const wxIco = (typeof wxCurrent !== 'undefined' && wxCurrent && WX_ICON[wxCurrent]) || '✦';
      tSub.textContent = `${day} · yeg ${wxIco}`;
    };
    tickClock();
    setInterval(tickClock, 20000);
    // 2) sticker layer — pure decoration, zero clicks stolen
    [['⭐', '46%', '12%', '-8deg'], ['🌈', '58%', '30%', '6deg'], ['☁️', '38%', '55%', '0deg'], ['✦', '30%', '26%', '12deg'], ['♡', '62%', '64%', '-10deg']].forEach(([ch, left, top, rot]) => {
      const st = document.createElement('span');
      st.className = 'desk-sticker';
      st.textContent = ch;
      st.setAttribute('aria-hidden', 'true');
      st.style.left = left;
      st.style.top = top;
      st.style.setProperty('--rot', rot);
      area.appendChild(st);
    });
    // 3) the sticky note (a nudge toward the secrets)
    const note = document.createElement('button');
    note.type = 'button';
    note.className = 'desk-note';
    note.innerHTML = '';
    const n1 = document.createElement('span');
    n1.className = 'desk-note-title';
    n1.textContent = trT('note to self ♡', 'pense-bête ♡');
    const n2 = document.createElement('span');
    n2.className = 'desk-note-body';
    n2.textContent = trT('the terminal knows 100 secret codes… type `cheats`', 'le terminal connaît 100 codes secrets… tape `cheats`');
    note.append(n1, n2);
    note.setAttribute('aria-label', n2.textContent);
    note.addEventListener('click', () => openWindow('win-terminal'));
    area.appendChild(note);
  }

  // one hook to count them all: wrap the interesting verbs so the
  // achievement metrics tick without littering every function
  function hookAchievements() {
    const wrap = (fn, after) => function () {
      const r = fn.apply(this, arguments);
      try { after.apply(this, arguments); } catch (e) { /* metrics never break features */ }
      return r;
    };
    try { petSlime = wrap(petSlime, () => achvBump('pets')); } catch (e) {}
    try { feedSlime = wrap(feedSlime, () => achvBump('feeds')); } catch (e) {}
    try { sleepSlime = wrap(sleepSlime, () => achvBump('naps')); } catch (e) {}
    try { playWithSlime = wrap(playWithSlime, () => achvBump('plays')); } catch (e) {}
    try { performSearch = wrap(performSearch, () => achvBump('searches')); } catch (e) {}
    try { openWindow = wrap(openWindow, () => achvBump('wins')); } catch (e) {}
    try { wearOutfit = wrap(wearOutfit, () => achvBump('fits')); } catch (e) {}
    try { gardenPluck = wrap(gardenPluck, () => achvBump('plucks')); } catch (e) {}
    try { pikSetStage = wrap(pikSetStage, (b, st) => { if (st === 2) achvBump('blooms'); }); } catch (e) {}
    try { spawnGeese = wrap(spawnGeese, () => achvBump('geese')); } catch (e) {}
    try { liveEnter = wrap(liveEnter, () => achvBump('lives')); } catch (e) {}
    try { sendGift = wrap(sendGift, () => achvBump('gifts')); } catch (e) {}
    try { gResolveTarot = wrap(gResolveTarot, () => achvBump('tarots')); } catch (e) {}
    try { gAdStart = wrap(gAdStart, () => achvBump('ads')); } catch (e) {}
    try { gNmWin = wrap(gNmWin, () => achvBump('nmwins')); } catch (e) {}
    try {
      gGiveWeapon = wrap(gGiveWeapon, (id) => {
        achvUnlock('w_' + id);
        const w = store.get('yos-wpn-seen', {});
        w[id] = 1;
        store.set('yos-wpn-seen', w);
        if (Object.keys(w).length >= 4) achvUnlock('armory');
      });
    } catch (e) {}
    try {
      applyWx = wrap(applyWx, (kind) => {
        achvUnlock('wx_' + kind);
        const seen = store.get('yos-wx-seen', {});
        seen[kind] = 1;
        store.set('yos-wx-seen', seen);
        if (Object.keys(seen).length >= 6) achvUnlock('stormchaser');
      });
    } catch (e) {}
    try {
      gainFollowers = wrap(gainFollowers, () => {
        if ((pet.followers || 0) >= 100) achvUnlock('fans100');
        if ((pet.followers || 0) >= 341) achvUnlock('fans341');
      });
    } catch (e) {}
    try {
      gGameOver = wrap(gGameOver, () => {
        achvBump('deaths');
        achvBump('jumps', GAME.jumpsThisRun || 0);
        GAME.jumpsThisRun = 0;
        const s = Math.floor(GAME.score);
        [[100, 's100'], [300, 's300'], [500, 's500'], [1000, 's1000'], [2000, 's2000'], [5000, 's5000'], [10000, 's10000']]
          .forEach(([v, id]) => { if (s >= v) achvUnlock(id); });
        if (GAME.coins >= 60) achvUnlock('rich60');
      });
    } catch (e) {}
    // visit census + odd hours
    const v = achvBump('visits');
    const hr = new Date().getHours();
    if (hr >= 0 && hr < 5) achvUnlock('afterhours');
    if (hr >= 5 && hr < 8) achvUnlock('earlybird');
    if (v >= 3) achvUnlock('visits3');
    if (v >= 10) achvUnlock('visits10');
    if (v >= 30) achvUnlock('visits30');
  }
  const storedLang = store.get('yos-lang', null);
  bootSafe('lang', () => applyLang(storedLang === 'fr' || storedLang === 'en' ? storedLang : detectBrowserLang(), false));
  bootSafe('theme', () => applyTheme());
  bootSafe('outfit', () => rotateOutfit(false)); // first fit of the day
  bootSafe('fanwall', () => initFanWall());
  bootSafe('livetab', () => updateLiveTab());
  bootSafe('ama', () => amaBootGreeting());
  bootSafe('term', () => termBootBanner());
  bootSafe('chat', () => chatBootLine());
  bootSafe('search', () => renderSearch(''));
  bootSafe('addr', () => updateAddressBar());
  bootSafe('achv-hooks', () => hookAchievements());
  bootSafe('sb-tabs', () => sidebarTabsInit()); // sidebar drawers before anything measures it
  // every visit starts with a FRESH meadow: the roster clears so new
  // sprouts always have room — plucking is this session's little joy
  bootSafe('pik-fresh', () => {
    // the deck is FOREVER — nobody gets wiped between visits anymore.
    // new sprouts keep growing even with a full squad: recruits simply
    // wait in pikdex.exe until you promote them ♡
    if (!Array.isArray(store.get('yos-pikdex', []))) store.set('yos-pikdex', []);
    if (!Array.isArray(store.get('yos-pik-roster', []))) store.set('yos-pik-roster', []);
    // one-time adoption: squads plucked before the deck existed move in as actives
    if (!pikdexGet().length) {
      const old = store.get('yos-pik-roster', []);
      const dex = old.slice(0, PIK_MAX).map((r) => ({
        h: r.h != null ? r.h : (PIK_LEGACY_HUES[r.c] != null ? PIK_LEGACY_HUES[r.c] : 330),
        ch: r.ch ? 1 : 0, s: r.s || 0, k: r.k || null, a: 1, t: Date.now()
      }));
      if (dex.length) pikdexSave(dex);
    }
    pikdexRosterProject(); // the walking squad = the deck's on-duty members
    pikdexWheelCheck(pikdexWheelPct()); // wheel milestones re-checked every boot (cloud restores included)
  });
  bootSafe('desk-piks', () => deskPikInit()); // the desktop IS the meadow now

  /* ================= 🐇 THE TERMINAL DOOR =================
     visiting #terminal boots ONLY the shell — the whole desktop stays
     dark until the visitor types the name. entry path: a mysterious
     little command in yongshan's github README. */
  const MATRIX_LINES = [
    ['wake up, visitor… the desktop has you 🐇', 'réveille-toi… le bureau te tient 🐇'],
    ['you ran a mysterious command from a README. objectively brave.', 'tu as lancé une commande mystérieuse d\'un README. objectivement courageux.'],
    ['there is no spoon. there IS a slime.', 'il n\'y a pas de cuillère. il y a un slime.'],
    ['I know kung fu. also CSS. mostly CSS.', 'je connais le kung-fu. et le CSS. surtout le CSS.'],
    ['this shell is real. the walls around it are negotiable.', 'ce shell est réel. les murs autour sont négociables.'],
    ['the locks are fair. mostly. I have seen them be smug.', 'les verrous sont réglos. en général. je les ai vus être narquois.'],
    ['(`hint` reprints the current lock. no shame in it.)', '(`hint` réaffiche le verrou en cours. aucune honte.)']
  ];
  function matrixGreeterShow() {
    if (document.getElementById('matrix-greeter')) return;
    const g = document.createElement('div');
    g.id = 'matrix-greeter';
    const cv = document.createElement('canvas');
    cv.width = 112; cv.height = 112;
    cv.style.width = '84px';
    const x = cv.getContext('2d');
    const ROWS = [
      '......FF......', '.....F..F.....', '......FF......', '......S.......',
      '....PPPPPP....', '..PPPPPPPPPP..', '.PwwPPPPPPPPP.', '.PwPPPPPPPPPP.',
      'PPeeeePPeeeePP', 'PPeeeeeeeeeePP', 'PPuPPPmmPPuPPP', 'PPPPPPmmPPPPPP',
      '.PPPPPPPPPPPP.', '..DDDDDDDDDD..'];
    const PAL = { P: '#7ee787', D: '#2ea043', w: 'rgba(255,255,255,0.7)', e: '#0a0f0a', m: '#1f6f2f', u: '#a5f3b4', S: '#57c689', F: '#39d353' };
    ROWS.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) { const ch = row[rx]; if (ch === '.') continue; x.fillStyle = PAL[ch] || PAL.P; x.fillRect(rx * 8, ry * 8, 8, 8); } });
    const bub = document.createElement('div');
    bub.className = 'matrix-bubble';
    window.__matrixBub = bub;
    let li = 0;
    const speak = () => { bub.textContent = trT(MATRIX_LINES[li % MATRIX_LINES.length][0], MATRIX_LINES[li % MATRIX_LINES.length][1]); li++; };
    speak();
    window.__matrixGreetTimer = setInterval(speak, 6500);
    g.append(bub, cv);
    document.body.appendChild(g);
  }
  /* ---- THE DOOR LOCKS: 2-3 chained mini-puzzles, freshly shuffled every
     visit. each solve prints the next lock; the FINAL reveal is that the
     key is her name (fuzzy-matched). the chain IS the CTF. ---- */
  function doorEncode(word, enc) {
    if (enc === 'rot13') return word.replace(/[a-z]/g, (ch) => String.fromCharCode((ch.charCodeAt(0) - 97 + 13) % 26 + 97));
    if (enc === 'base64') { try { return btoa(word); } catch (e2) { return word; } }
    return Array.from(word).map((ch) => ch.charCodeAt(0).toString(16)).join('');
  }
  const DOOR_POOL = [
    { id: 'cipher',
      intro: (d) => [trT('🧩 a file is locked on this tty. find it. read it. decode it.', '🧩 un fichier est verrouillé sur ce tty. trouve-le. lis-le. décode-le.'),
        trT('   (`ls` is a fine first instinct — type the DECODED word to turn the lock.)', '   (`ls` est un bon réflexe — tape le mot DÉCODÉ pour tourner le verrou.)')],
      check: (d, norm) => norm === d.cipherWord },
    { id: 'bootnum',
      intro: () => [trT('🧩 the boot log already whispered it: how many pikmin mounted /dev/meadow?', '🧩 le journal de boot l\'a déjà murmuré : combien de pikmin ont monté /dev/meadow ?'),
        trT('   (scroll up. type the number.)', '   (remonte. tape le nombre.)')],
      check: (d, norm, lw) => lw.trim() === '72' },
    { id: 'binary',
      intro: () => [trT('🧩 the door hums in binary: 01110000 01101001 01101011', '🧩 la porte fredonne en binaire : 01110000 01101001 01101011'),
        trT('   (type the word it is humming.)', '   (tape le mot qu\'elle fredonne.)')],
      check: (d, norm) => norm === 'pik' },
    { id: 'riddle',
      intro: () => [trT('🧩 riddle: I have keys but open no locks, a space but no room —', '🧩 énigme : j\'ai des touches mais n\'ouvre aucun verrou, un espace mais pas de pièce —'),
        trT('   you can enter, but never leave. what am I?', '   on peut y entrer, jamais en sortir. que suis-je ?')],
      check: (d, norm) => norm === 'keyboard' || norm === 'akeyboard' || norm === 'clavier' || norm === 'unclavier' },
    { id: 'double',
      intro: () => [trT('🧩 the meadow doubles: 2 · 4 · 8 · 16 · ?', '🧩 la prairie double : 2 · 4 · 8 · 16 · ?'),
        trT('   (type the next number.)', '   (tape le nombre suivant.)')],
      check: (d, norm, lw) => lw.trim() === '32' },
    { id: 'cores',
      intro: () => [trT('🧩 run `visitorfetch` — then tell the door how many CORES your machine confessed to.', '🧩 lance `visitorfetch` — puis dis à la porte combien de CŒURS ta machine a avoués.')],
      check: (d, norm, lw) => lw.trim() === String(navigator.hardwareConcurrency || 8) }
  ];
  function doorInit() {
    if (window.__door) return window.__door;
    const pool = DOOR_POOL.slice().sort(() => Math.random() - 0.5);
    window.__door = {
      tries: 0, knew: false, stage: 0,
      chain: pool.slice(0, 2 + (Math.random() < 0.5 ? 1 : 0)),
      enc: ['rot13', 'base64', 'hex'][Math.floor(Math.random() * 3)],
      cipherWord: ['meadow', 'pikmin', 'slime'][Math.floor(Math.random() * 3)]
    };
    return window.__door;
  }
  function doorPuzzleShow(door) {
    termLine('', '');
    termLine(trT(`🔒 LOCK ${door.stage + 1}/${door.chain.length}`, `🔒 VERROU ${door.stage + 1}/${door.chain.length}`), 't-accent');
    door.chain[door.stage].intro(door).forEach((l) => termLine(l, 't-ok'));
  }
  function doorPuzzleAdvance(door) {
    door.stage++;
    playSparkleSound();
    termLine(trT(`✔ LOCK ${door.stage}/${door.chain.length} OPEN — the door shivers happily`, `✔ VERROU ${door.stage}/${door.chain.length} OUVERT — la porte frissonne de joie`), 't-ok');
    if (door.stage < door.chain.length) {
      matrixGreeterSay(trT('one down. the door is quietly impressed.', 'un de moins. la porte est discrètement impressionnée.'));
      doorPuzzleShow(door);
    } else {
      termLine('', '');
      termLine(trT('🔓 ALL LOCKS OPEN. the last thing the door wants is not a puzzle —', '🔓 TOUS LES VERROUS OUVERTS. la dernière chose que veut la porte n\'est pas une énigme —'), 't-accent');
      termLine(trT('   it is a NAME. hers. you have seen it on every doorframe on the way here 🐇', '   c\'est un NOM. le sien. tu l\'as vu sur chaque chambranle en venant ici 🐇'), 't-ok');
      matrixGreeterSay(door.knew
        ? trT('you tried it earlier — NOW it will work ♡', 'tu l\'as tenté plus tôt — MAINTENANT ça marchera ♡')
        : trT('the key is her name. say it — any way you like.', 'la clé est son nom. dis-le — comme tu veux.'));
    }
  }
  function matrixGreeterSay(text) {
    // the greeter reacts to what you DO — and holds the thought a while
    const bub = window.__matrixBub;
    if (!bub) return;
    bub.textContent = text;
    if (window.__matrixGreetTimer) { clearInterval(window.__matrixGreetTimer); }
    window.__matrixGreetTimer = setInterval(() => {
      const l = MATRIX_LINES[Math.floor(Math.random() * MATRIX_LINES.length)];
      bub.textContent = trT(l[0], l[1]);
    }, 9000);
  }
  function termVisitorFetch() {
    // a neofetch for the VISITOR — read locally from what the browser
    // already announces to every site. displayed here, sent nowhere. ever.
    const ua = navigator.userAgent || '';
    const browser = /firefox/i.test(ua) ? 'Firefox' : /edg/i.test(ua) ? 'Edge' : /chrome|crios/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : 'a mystery browser';
    const os = /iphone|ipad/i.test(ua) ? 'iOS' : /android/i.test(ua) ? 'Android' : /mac/i.test(ua) ? 'macOS' : /win/i.test(ua) ? 'Windows' : /linux/i.test(ua) ? 'Linux' : '???';
    const rows = [
      ['visitor@yongshanOS', ''],
      ['-----------------', ''],
      ['Browser', browser],
      ['OS', os],
      ['Viewport', innerWidth + '×' + innerHeight + ' @' + (window.devicePixelRatio || 1) + 'x'],
      ['Threads', String(navigator.hardwareConcurrency || '?') + ' cores'],
      ['Memory', navigator.deviceMemory ? navigator.deviceMemory + 'GB-ish' : 'politely undisclosed'],
      ['Language', navigator.language || '?'],
      ['Online', navigator.onLine ? 'yes' : 'somehow no'],
      ['Slimes nearby', '1 (dressed for the matrix)']
    ];
    rows.forEach(([k, v]) => termLine(v ? '  ' + k.padEnd(14, ' ') + v : '  ' + k, v ? 't-ok' : 't-accent'));
    termLine(trT('  (read locally from your browser\'s own public announcements. sent nowhere. ever.)', '  (lu localement depuis ce que ton navigateur annonce déjà. envoyé nulle part. jamais.)'), 't-dim');
  }
  function matrixRain(opts) {
    if (document.getElementById('matrix-rain')) return;
    const o = opts || {};
    const ms = o.ms || 6000;
    const cell = o.dense ? 11 : 14;
    const cv = document.createElement('canvas');
    cv.id = 'matrix-rain';
    cv.width = innerWidth; cv.height = innerHeight;
    cv.style.cssText = 'position:fixed;inset:0;z-index:310;pointer-events:none;';
    document.body.appendChild(cv);
    let label = null;
    if (o.label) {
      label = document.createElement('div');
      label.className = 'matrix-rain-label';
      label.textContent = o.label;
      document.body.appendChild(label);
    }
    const x = cv.getContext('2d');
    const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺ01♡yongshan';
    const cols = Math.floor(cv.width / cell);
    const drops = Array.from({ length: cols }, () => Math.random() * -40);
    const t0 = Date.now();
    const iv = setInterval(() => {
      x.fillStyle = o.dense ? 'rgba(13,17,23,0.22)' : 'rgba(13,17,23,0.16)';
      x.fillRect(0, 0, cv.width, cv.height);
      x.font = (cell - 1) + 'px monospace';
      drops.forEach((d, i) => {
        const ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        x.fillStyle = ch === '♡' ? '#ff8fc7' : '#39d353';
        x.fillText(ch, i * cell, d * cell);
        drops[i] = d * cell > cv.height && Math.random() > (o.dense ? 0.96 : 0.975) ? 0 : d + 1;
      });
      if (Date.now() - t0 > ms) {
        clearInterval(iv);
        cv.style.transition = 'opacity 0.8s';
        cv.style.opacity = '0';
        if (label) { label.style.transition = 'opacity 0.6s'; label.style.opacity = '0'; }
        setTimeout(() => { cv.remove(); if (label) label.remove(); }, 900);
      }
    }, o.dense ? 42 : 50);
  }
  function terminalDoorOpen() {
    termLine(trT('🔓 the name IS the key. compiling the rest of the world…', '🔓 le nom EST la clé. compilation du reste du monde…'), 't-ok');
    setTimeout(() => {
      document.body.classList.remove('terminal-only');
      const g = document.getElementById('matrix-greeter');
      if (g) g.remove();
      if (window.__matrixGreetTimer) { clearInterval(window.__matrixGreetTimer); window.__matrixGreetTimer = null; }
      const tw = document.getElementById('win-terminal');
      if (tw) tw.classList.remove('window-maximized', 'terminal-door-win');
      try { history.replaceState(null, '', location.pathname); } catch (e) { /* hash stays, harmless */ }
      playFanfare();
      achvUnlock('truefan');
      if (typeof pikParade === 'function') pikParade();
      // the welcome card: lowest-cost way to meet yongshan, highest-warmth
      /* (built below — shown only on the yongshan-key path) */
      let root = document.getElementById('wp-root');
      if (root) root.remove();
      root = document.createElement('div');
      root.id = 'wp-root';
      const panel = document.createElement('div');
      panel.className = 'wp-panel';
      const head = document.createElement('div');
      head.className = 'wp-panel-head';
      head.textContent = trT('♡ so nice to meet you!!', '♡ ravie de te rencontrer !!');
      const body = document.createElement('div');
      body.className = 'wp-panel-body';
      const p1 = document.createElement('p');
      p1.textContent = trT('this is yongshan\'s personal site — and she kindly invites you to come play with the pikmin ♡', 'voici le site personnel de yongshan — et elle t\'invite gentiment à venir jouer avec les pikmin ♡');
      const p2 = document.createElement('p');
      p2.className = 'wp-note';
      p2.textContent = trT('the pikmin live on the desktop · the slime runs a live stream · the arcade is in slime_run.exe · and you clearly already know your way around a terminal.', 'les pikmin vivent sur le bureau · le slime tient un direct · l\'arcade est dans slime_run.exe · et toi, tu sais déjà te servir d\'un terminal.');
      const go = document.createElement('button');
      go.type = 'button';
      go.className = 'wp-btn';
      go.textContent = trT('let\'s play ♡', 'on joue ♡');
      go.addEventListener('click', () => root.remove());
      body.append(p1, p2, go);
      panel.append(head, body);
      root.appendChild(panel);
      document.body.appendChild(root);
    }, 700);
  }
  bootSafe('live-door', () => {
    // beamed link: the receiving device walks straight into the live room
    if (location.hash !== '#live') return;
    setTimeout(() => {
      openWindow('win-live');
      if (typeof liveEnter === 'function') liveEnter();
      try { history.replaceState(null, '', location.pathname); } catch (e) { /* hash stays */ }
    }, 900);
  });
  bootSafe('terminal-door', () => {
    if (location.hash !== '#terminal' && location.hash !== '#term') return;
    document.body.classList.add('terminal-only');
    achvUnlock('redpill');
    setTimeout(() => {
      openWindow('win-terminal');
      const tw = document.getElementById('win-terminal');
      if (tw) tw.classList.add('window-maximized', 'terminal-door-win');
      // — a little kernel theater before the curtain line —
      const BOOT = [
        ['[  OK  ] reached target basic-cuteness.target', 't-ok', 60],
        ['[  OK  ] mounted /dev/meadow (rw,pikmin=72)', 't-ok', 140],
        ['[  OK  ] started slime.service — 1 instance, extremely round', 't-ok', 230],
        ['[ WARN ] 6 pikmin requested desktop access (queued until wake)', 't-err', 330],
        ['[  OK  ] loaded module: matrix_greeter.ko (sunglasses=on)', 't-ok', 420],
        ['[  OK  ] entropy pool topped up with heart emojis', 't-ok', 500],
        ['[ SKIP ] telemetry.service — not installed, never will be', 't-dim', 590],
        ['[  OK  ] yongshanOS door ready on tty1 ♡', 't-ok', 700]
      ];
      termLine('', '');
      BOOT.forEach(([l, cls, at]) => setTimeout(() => termLine(l, cls), at));
      // — act two: the compile storm. fast, dense, ninety-percent real —
      setTimeout(() => {
        const OPS = ['mov', 'jmp', 'call', 'push', 'xor', 'lea'];
        const SRCS = ['slime/heart.c', 'meadow/petal.c', 'door/locks.c', 'wrist/garden.c', 'nightmare/boss.c', 'terminal/tty1.c'];
        for (let i = 0; i < 22; i++) {
          setTimeout(() => {
            const roll = Math.random();
            const addr = '0x' + (0x1000 + Math.floor(Math.random() * 0xEFFF)).toString(16);
            if (roll < 0.4) termLine('CC   ' + SRCS[Math.floor(Math.random() * SRCS.length)], 't-dim');
            else if (roll < 0.75) termLine(addr + '  ' + OPS[Math.floor(Math.random() * OPS.length)] + '  joy, everywhere', 't-dim');
            else termLine('OK   checksum ♡ ' + addr.slice(2), 't-ok');
          }, i * 45);
        }
      }, 900);
      // — act three: the construct loads —
      setTimeout(() => {
        termLine('LD   yongshanOS.elf — linking the construct…', 't-accent');
        matrixRain({ ms: 3400, dense: true, label: trT('ENTERING THE CONSTRUCT…', 'ENTRÉE DANS LA MATRICE…') });
      }, 2050);
      // — act four: the first lock —
      setTimeout(() => {
        const door = doorInit();
        termLine('', '');
        termLine(trT('🐇 you took the mysterious command. respect.', '🐇 tu as suivi la commande mystérieuse. respect.'), 't-accent');
        termLine(trT(`   this door is LOCKED — ${door.chain.length} locks, freshly shuffled for you alone.`, `   cette porte est VERROUILLÉE — ${door.chain.length} verrous, fraîchement mélangés rien que pour toi.`), 't-ok');
        termLine(trT('   (`hint` reprints the lock · `visitorfetch` & `matrix` & the whole shell still work)', '   (`hint` réaffiche le verrou · `visitorfetch` & `matrix` & tout le shell marchent)'), 't-dim');
        doorPuzzleShow(door);
        // discoverability: if the visitor just stares, the greeter drives ONCE
        window.__doorIdle = setTimeout(() => {
          if (!document.body.classList.contains('terminal-only')) return;
          const ti2 = document.getElementById('term-input');
          if (!ti2 || ti2.value) return;
          matrixGreeterSay(trT('no rush. here — I\'ll drive:', 'pas de stress. tiens — je conduis :'));
          ['h', 'i', 'n', 't'].forEach((ch, i) => setTimeout(() => { ti2.value += ch; }, 700 + i * 240));
          setTimeout(() => {
            if (!document.body.classList.contains('terminal-only')) return;
            if (ti2.form) ti2.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            setTimeout(() => matrixGreeterSay(trT('like THIS. your turn ♡', 'comme ÇA. à toi ♡')), 500);
          }, 1900);
        }, 14000);
      }, 5700);
      matrixGreeterShow();
    }, 600);
  });

  /* ================= ⌚ THE WRIST WING =================
     watch.html is a featherweight client for smartwatch browsers. pairing
     is DESKTOP-TYPED (the watch only ever displays a 4-digit pin), and all
     cross-device play flows through the same Abacus counters as cloud save:
       wpair-{pin}  — pairing handshake (uid, base-31 encoded)
       sv2-{u}-wgp  — wrist-garden plucks (watch hits, main site consumes)
       sv2-{u}-wgs  — plucks already consumed (so new devices don't double-grant)
       sv2-{u}-wpt  — wrist pets (converted to fans over here)
       sv2-{u}-wst  — packed status the watch displays (fans/plucks/wheel%) */
  const WATCH_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  function watchUidToNum(uid) {
    let v = 0;
    for (let i = uid.length - 1; i >= 0; i--) v = v * 31 + Math.max(0, WATCH_ABC.indexOf(uid[i]));
    return v + 1;
  }
  function watchPair(pin) {
    pin = String(pin || '').replace(/\D/g, '').slice(0, 4);
    if (pin.length !== 4) return Promise.resolve('badpin');
    return cloudEnsure().then((cs) => {
      if (!cs) return 'nocloud';
      const v = watchUidToNum(cs.uid);
      return fetch(`${ACHV_API}/create/${ACHV_NS}/wpair-${pin}`, { method: 'POST' })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => fetch(`${ACHV_API}/set/${ACHV_NS}/wpair-${pin}?value=${v}`, { method: 'POST', headers: { Authorization: `Bearer ${d.admin_key}` } }))
        .then((r) => {
          if (!r.ok) throw new Error('set failed');
          store.set('yos-watch-paired', Date.now());
          achvUnlock('wristslime');
          watchPullArm();
          return 'ok';
        })
        .catch(() => 'taken'); // a stale pin squats that counter — new pin, please
    });
  }
  function watchPanelOpen() { openWindow('win-watch'); } // the panel grew up into a desktop app
  function renderWatchWin() {
    const shell = document.getElementById('watch-shell');
    if (!shell) return;
    shell.innerHTML = ''; // rebuilt below — every string goes through textContent
    const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

    // — status card: the truth about your wrist —
    const paired = store.get('yos-watch-paired', 0);
    const card = mk('div', 'watch-status' + (paired ? ' is-on' : ''));
    card.appendChild(mk('div', 'watch-status-line', paired
      ? trT('⌚ PAIRED — the wrist slime is live', '⌚ APPAIRÉE — le slime de poignet est en ligne')
      : trT('⌚ no watch paired yet', '⌚ aucune montre appairée pour l\'instant')));
    if (paired) {
      const plucked = store.get('yos-wgp-seen', 0);
      const petted = store.get('yos-wpt-seen', 0);
      card.appendChild(mk('div', 'watch-status-sub', trT(
        `lifetime from the wrist: 🌸 ${plucked} pikmin plucked · ♡ ${petted} pets → fans`,
        `depuis le poignet : 🌸 ${plucked} pikmin cueillis · ♡ ${petted} caresses → fans`)));
      const syncBtn = mk('button', 'wp-btn', trT('🔄 sync now', '🔄 synchroniser'));
      syncBtn.type = 'button';
      syncBtn.addEventListener('click', () => {
        syncBtn.disabled = true;
        syncBtn.textContent = trT('🔄 asking the cloud…', '🔄 le cloud réfléchit…');
        if (typeof watchPullSync === 'function') watchPullSync();
        setTimeout(() => { syncBtn.disabled = false; syncBtn.textContent = trT('🔄 sync now', '🔄 synchroniser'); renderWatchWin(); }, 4000);
      });
      card.appendChild(syncBtn);
    }
    shell.appendChild(card);

    // — how the magic works, in one breath —
    shell.appendChild(mk('p', 'watch-blurb', trT(
      'the watch (or a phone — pocket edition ♡) runs a featherweight yongshanOS: a clock, the slime (pettable), and a WRIST GARDEN — first pikmin ready in ~90 seconds, then one every 20-35 min. plucks sync home the SECOND you tap. same save, two screens.',
      'la montre (ou un téléphone — édition poche ♡) fait tourner un yongshanOS plume : une horloge, le slime (caressable) et un JARDIN DE POIGNET — premier pikmin prêt en ~90 s, puis un toutes les 20-35 min. les cueillettes se synchronisent À L\'INSTANT du tap. même sauvegarde, deux écrans.')));

    // — pairing (works for first pairing AND re-pairing) —
    shell.appendChild(mk('p', '', trT('1 · open this on the watch:', '1 · ouvre ceci sur la montre :')));
    const urlRow = mk('div', 'wp-row');
    const WATCH_URL = 'https://yyswhsccc.github.io/personal-website/watch.html';
    const url = mk('p', 'wp-url', 'yyswhsccc.github.io/personal-website/watch.html');
    url.title = trT('click to copy', 'clic : copier');
    const copyBtn = mk('button', 'wp-btn wp-copy', '📋');
    copyBtn.type = 'button';
    copyBtn.setAttribute('aria-label', trT('copy the watch link', 'copier le lien montre'));
    const status = mk('div', 'wp-status', '');
    const copyStatus = mk('div', 'wp-status', '');
    const doCopy = () => {
      const done = () => { copyStatus.textContent = trT('📋 link copied — paste it into a message to yourself ♡', '📋 lien copié — colle-le dans un message pour toi ♡'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(WATCH_URL).then(done).catch(done);
      else { try { const ta = document.createElement('textarea'); ta.value = WATCH_URL; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); done(); } catch (e) { /* selection stays, user can ⌘C */ } }
    };
    url.addEventListener('click', doCopy);
    copyBtn.addEventListener('click', doCopy);
    urlRow.append(url, copyBtn);
    shell.appendChild(urlRow);
    shell.appendChild(copyStatus);
    shell.appendChild(mk('p', '', trT('2 · the watch shows a 4-digit code. type it here (all the typing happens on the BIG screen ♡):', '2 · la montre affiche un code à 4 chiffres. tape-le ici (tout le clavier reste sur le GRAND écran ♡) :')));
    const row = mk('div', 'wp-row');
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.inputMode = 'numeric';
    inp.maxLength = 4;
    inp.placeholder = '0000';
    inp.className = 'wp-pin';
    inp.setAttribute('aria-label', trT('watch pairing code', 'code d\'appairage montre'));
    const btn = mk('button', 'wp-btn', trT('pair ♡', 'appairer ♡'));
    btn.type = 'button';
    btn.addEventListener('click', () => {
      status.textContent = trT('pairing…', 'appairage…');
      btn.disabled = true;
      watchPair(inp.value).then((res) => {
        btn.disabled = false;
        if (res === 'ok') { status.textContent = trT('⌚ PAIRED!! the device that showed the code just BECAME your wrist slime — keep it open, pet it, pluck it ♡', '⌚ APPAIRÉE !! l\'appareil qui affichait le code vient de DEVENIR ton slime de poignet — garde-le ouvert, caresse-le ♡'); playFanfare(); setTimeout(renderWatchWin, 2000); }
        else if (res === 'badpin') status.textContent = trT('that needs to be 4 digits', 'il faut 4 chiffres');
        else if (res === 'taken') status.textContent = trT('code collision (rare!!) — tap the watch for a fresh code and retry', 'collision de code (rare !!) — nouveau code sur la montre et réessaie');
        else status.textContent = trT('cloud unreachable — try again in a moment', 'cloud injoignable — réessaie dans un instant');
      });
    });
    row.append(inp, btn);
    shell.append(row, status);

    // — the honest fine print for browser-less watches —
    const noBrowser = mk('p', 'wp-note', trT(
      '⌚ no browser on the watch? Apple Watch doesn\'t ship one — copy the link and TEXT IT TO YOURSELF: tapping it inside Messages/Mail opens the page right on the watch ♡. Wear OS: any browser from the on-watch Play Store works.',
      '⌚ pas de navigateur sur la montre ? l\'Apple Watch n\'en a pas — copie le lien et ENVOIE-LE-TOI PAR MESSAGE : le toucher dans Messages/Mail ouvre la page directement sur la montre ♡. Wear OS : n\'importe quel navigateur du Play Store de la montre.'));
    shell.appendChild(noBrowser);
  }
  var watchPullTimer = null;
  function watchPullArm() {
    if (watchPullTimer) return;
    if (!store.get('yos-watch-paired', 0)) return;
    watchPullTimer = setInterval(watchPullSync, 150000);
    setTimeout(watchPullSync, 5000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) watchPullSync(); });
  }
  var watchPullBusy = false;
  function watchPullSync() {
    if (watchPullBusy || !navigator.onLine || !cloudSlot || !store.get('yos-watch-paired', 0)) return;
    watchPullBusy = true;
    const u = cloudSlot.uid;
    Promise.all([cloudGet(`sv2-${u}-wgp`), cloudGet(`sv2-${u}-wgs`), cloudGet(`sv2-${u}-wpt`)])
      .then(([wgp, wgs, wpt]) => {
        const seenP = Math.max(store.get('yos-wgp-seen', 0), wgs || 0);
        const newPlucks = Math.min(Math.max(0, (wgp || 0) - seenP), 12);
        const seenT = store.get('yos-wpt-seen', 0);
        const newPets = Math.min(Math.max(0, (wpt || 0) - seenT), 60);
        if (newPlucks > 0) {
          for (let i = 0; i < newPlucks; i++) {
            const roll = pikRollSprout();
            if (!roll) break;
            const sp = roll.type === 'hidden' ? roll.sp : null;
            const hue = roll.type === 'normal' ? roll.hue : 5 + Math.floor(Math.random() * 355);
            pikdexAdd({ h: hue, ch: roll.type === 'chameleon' ? 1 : 0, s: 0, k: PIK_SKILLS[Math.floor(Math.random() * PIK_SKILLS.length)].id, sp: sp ? sp.id : null });
          }
          achvUnlock('wristfarmer');
          store.set('yos-wgp-seen', wgp || 0);
          cloudSet(`sv2-${u}-wgs`, wgp || 0).catch(() => {});
          if (typeof deskPikResync === 'function') deskPikResync();
        }
        if (newPets > 0) {
          store.set('yos-wpt-seen', wpt || 0);
          gainFollowers(newPets);
        }
        if (newPlucks > 0 || newPets > 0) {
          showToast(trT(
            `⌚ from your wrist: ${newPlucks ? '+' + newPlucks + ' pikmin' : ''}${newPlucks && newPets ? ' · ' : ''}${newPets ? '+' + newPets + ' pets → fans' : ''} ♡`,
            `⌚ depuis ton poignet : ${newPlucks ? '+' + newPlucks + ' pikmin' : ''}${newPlucks && newPets ? ' · ' : ''}${newPets ? '+' + newPets + ' caresses → fans' : ''} ♡`
          ));
        }
      })
      .catch(() => { /* the wrist can wait */ })
      .then(() => { watchPullBusy = false; });
  }
  bootSafe('watch-wing', () => {
    watchPullArm();
    // the hint returns EVERY visit until a watch is actually paired —
    // pairing history (yos-watch-paired) is the only thing that silences it
    if (!store.get('yos-watch-paired', 0)) {
      setTimeout(() => {
        if (store.get('yos-watch-paired', 0)) return; // paired mid-session
        if (document.body.classList.contains('terminal-only')) return; // the door hates popups
        const b = document.createElement('button');
        b.type = 'button';
        b.id = 'watch-hint-banner';
        b.className = 'watch-hint-banner';
        b.textContent = trT('⌚ NEW: yongshanOS pairs with your smartwatch — tap to set up (or type `watch` in the terminal)', '⌚ NOUVEAU : yongshanOS s\'appaire à ta montre — touche ici (ou tape `watch` dans le terminal)');
        b.addEventListener('click', () => { b.remove(); watchPanelOpen(); });
        document.body.appendChild(b);
        setTimeout(() => { if (b.parentNode) { b.classList.add('is-leaving'); setTimeout(() => b.remove(), 600); } }, 16000);
      }, 9000);
    }
  });
  bootSafe('mobile-start-max', () => {
    // phones: the welcome note opens FULL SCREEN, no fiddly window
    if (window.innerWidth < 820) {
      const ws = document.getElementById('win-start-here');
      if (ws && !ws.classList.contains('window-closed')) ws.classList.add('window-maximized');
    }
  });

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
