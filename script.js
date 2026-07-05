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

  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    playClickSound();
    const isExpanded = startBtn.getAttribute('aria-expanded') === 'true';
    startBtn.setAttribute('aria-expanded', String(!isExpanded));
    startMenu.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!startMenu.contains(e.target) && e.target !== startBtn) {
      startMenu.classList.remove('show');
      startBtn.setAttribute('aria-expanded', 'false');
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

  function openWindow(winId, opts = {}) {
    const win = document.getElementById(winId);
    if (!win) return;

    if (!opts.fromHistory) yosPushNav(winId);

    const wasClosed = win.classList.contains('window-closed');
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

    if (!win.classList.contains('window-maximized') && !win.style.top) {
      const offsetX = 30 + (Math.random() * 60);
      const offsetY = 50 + (Math.random() * 60);
      win.style.left = `${offsetX}px`;
      win.style.top = `${offsetY}px`;
    }
  }

  function closeWindow(win) {
    playCloseSound();
    win.classList.add('window-closed');
    win.classList.remove('window-active');
    focusTopWindow();
  }

  function minimizeWindow(win) {
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
  document.querySelectorAll('.desktop-icon-btn, .quest-btn, .plugin-chip[data-window]').forEach((btn) => {
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

  // --- sprite frames (hand-generated pixel expressions) ---
  const SLIME_FRAMES = {
    base: 'assets/slime_pet_cutout.png',
    sleep: 'assets/slime_sleep.png',
    eat: 'assets/slime_eat.png'
  };
  Object.values(SLIME_FRAMES).forEach((src) => { const img = new Image(); img.src = src; });

  const slimeImg = slimeBody ? slimeBody.querySelector('img') : null;
  let currentFrame = 'base';

  function setSlimeFrame(name) {
    if (!slimeImg || currentFrame === name || !SLIME_FRAMES[name]) return;
    currentFrame = name;
    slimeImg.src = SLIME_FRAMES[name];
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
    if (slimeMoodText) slimeMoodText.textContent = translateMood(pet.mood);

    if (slimeHeartsEl) {
      const filled = Math.round((pet.affection / 100) * 7);
      [...slimeHeartsEl.children].forEach((span, i) => {
        const full = i < filled;
        span.textContent = full ? '♥' : '♡';
        span.classList.toggle('heart-empty', !full);
      });
    }

    if (slimeFollowerCountEl) slimeFollowerCountEl.textContent = String(pet.followers);
    if (trayFans) trayFans.textContent = `★${pet.followers}`;

    if (slimeEnergyFill) {
      slimeEnergyFill.style.width = `${pet.energy}%`;
      slimeEnergyFill.classList.toggle('energy-low', pet.energy < 30);
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
        const x = 12 + Math.random() * (slimeHabitat.clientWidth - 24);
        const y = 20 + Math.random() * (slimeHabitat.clientHeight - 50);
        spawnParticle(x, y, ['🎉', '♥', '✦', '★', '🎀'][i % 5]);
      }, i * 70);
    }
  }

  // --- speech bubble ---
  function showBubble(text, duration = 2500) {
    if (!speechBubble) return;
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
    if (!slimeHabitat) return;
    if (REDUCED_MOTION) return;
    const p = document.createElement('span');
    p.className = `pet-particle ${cls}`.trim();
    p.textContent = char;
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.setProperty('--px', `${Math.round((Math.random() - 0.5) * 36)}px`);
    p.style.setProperty('--pr', `${Math.round((Math.random() - 0.5) * 80)}deg`);
    slimeHabitat.appendChild(p);
    p.addEventListener('animationend', () => p.remove());
  }

  function slimeAnchor() {
    // slime's current center, in habitat coordinates
    const habitatRect = slimeHabitat.getBoundingClientRect();
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
  function getSlimeBounds() {
    const habitat = slimeHabitat.getBoundingClientRect();
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

    const roll = Math.random();
    const tired = pet.energy < 25;

    if (tired && roll < 0.5) {
      moveSlime({ action: 'nap', mood: 'exhausted', phrase: roll < 0.2 ? 'low battery... feed me?' : '', duration: 1900 });
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
      moveSlime({ action: 'alert', mood: 'listening', phrase: 'chat? you there?', duration: 1000 });
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
    el.style.left = `${clamp(x - 20, 4, slimeHabitat.clientWidth - 60)}px`;
    el.style.top = `${clamp(y - 40, 4, slimeHabitat.clientHeight - 30)}px`;
    slimeHabitat.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  function triggerGlitchMode() {
    playGlitchSound();
    slimeHabitat.classList.add('glitch-mode');
    setSlimeAction('is-glitch');
    pet.mood = 'l0v3_0v3rfl0w';
    showBubble('ERR0R: love_overflow ♡♡♡', 2600);
    updateSlimeHud();
    setTimeout(() => {
      slimeHabitat.classList.remove('glitch-mode');
      setSlimeAction('');
      pet.mood = 'recovered';
      showBubble('...I\'m ok. that was the good kind of crash', 2400);
      updateSlimeHud();
    }, 2100);
    pauseSlimeLoop(4800);
  }

  function petSlime() {
    if (pet.busy || isGrabbing) return;
    if (typeof ghostHidden === 'function' && ghostHidden()) {
      ghostAppear(3800, '👻 you found me!! +1 haunted fan');
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
      moveSlime({ action: 'dizzy', mood: 'overstimulated', phrase: 'T-TOO MUCH ATTENTION!!', duration: 1800, scheduleNext: false });
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
    moveSlime({ action: 'flip', mood: 'show-off', phrase: 'FRONTEND FLIP!!', duration: 800 });
  }

  // --- drag & carry (pointer events) ---
  let isGrabbing = false;
  let grabMoved = false;
  let suppressNextClick = false;
  let grabPointerId = null;

  function habitatPointToSlimeCoords(clientX, clientY) {
    const habitat = slimeHabitat.getBoundingClientRect();
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
      showBubble('whee!! I\'m flying', 1400);
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
      moveSlime({ action: 'hop', mood: 'bounced', phrase: Math.random() < 0.5 ? 'safe landing!' : 'do it again!!', duration: 620, distance: 0.2 });
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
      showBubble('press Enter to pet me ♡', 1800);
    }
  });

  // --- feeding ---
  const CANDY_CHARS = ['🍬', '🧁', '🍓', '🍡'];
  let activeCandy = null;

  function feedSlime() {
    if (pet.busy || activeCandy) return;
    if (typeof ghostHidden === 'function' && ghostHidden()) ghostAppear(7000, false);
    if (pet.sleeping) { wakeSlime(false); }

    if (pet.energy >= 98) {
      showBubble('I\'m full!! save it for stream snacks', 2200);
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
    candy.style.left = `${slimeHabitat.clientWidth / 2 + targetX - 9}px`;
    candy.style.top = `${62 + 37 + targetY}px`;
    slimeHabitat.appendChild(candy);
    activeCandy = candy;

    // slime notices, then waddles over
    moveSlime({ action: 'alert', mood: 'snack radar ON', phrase: 'SNACK DETECTED', duration: 500, scheduleNext: false });

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
      moveSlime({ action: 'eat', mood: 'munching', phrase: 'nom nom nom...', duration: 1100, scheduleNext: false });
    }, 1650);

    // done
    setTimeout(() => {
      pet.busy = false;
      gainFollowers(2);
      moveSlime({ action: 'happy', mood: 'grateful', phrase: '+22 energy! ty chef ♡', duration: 800 });
    }, 2900);
  }

  // --- playing ---
  function playWithSlime() {
    if (pet.busy) return;
    if (typeof ghostHidden === 'function' && ghostHidden()) ghostAppear(6000, false);
    if (pet.sleeping) { wakeSlime(false); }

    if (pet.energy < 18) {
      showBubble('no energy... snack first? 🥺', 2200);
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
          phrase: i === 1 ? 'ZOOMIES!!' : '',
          duration: 440,
          distance: 1.6,
          scheduleNext: false
        });
      }, delay);
    });

    setTimeout(() => {
      pet.busy = false;
      gainFollowers(2);
      moveSlime({ action: 'happy', mood: 'giddy', phrase: 'best. stream. ever.', duration: 800 });
    }, 1600);
  }

  // --- napping ---
  let sleepTimer = null;
  let sleepZzzTimer = null;

  function sleepSlime() {
    if (pet.busy || pet.sleeping) return;
    if (typeof ghostHidden === 'function' && ghostHidden()) ghostAppear(9000, false);

    playCloseSound();
    pet.sleeping = true;
    pet.mood = 'sleeping';
    slimeHabitat.classList.add('night-mode');
    moveSlime({ action: 'nap', mood: 'sleeping', phrase: 'sleep(4000)... zzz', duration: 1400, scheduleNext: false });

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
      moveSlime({ action: 'alert', mood: 'grumpy', phrase: 'I was DREAMING about shipping!!', duration: 1100 });
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
    'win-profile-intro': 'that\'s my dev! she built me from scratch',
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
    { u: 'recruiter_chan', c: '#f0509f', t: 'wait. she hand-built this whole OS site? no framework???' },
    { u: 'aws_wizard', c: '#6cc4f5', t: 'she ran a production Moodle on EC2 — auto-heal, S3 DR backups, the works 😭' },
    { u: 'moodle_mod', c: '#9a6fe0', t: 'WCAG 2.1 AA, verified with WAVE + Accessibility Insights. a11y queen' },
    { u: 'data_goblin', c: '#e8a13c', t: '200+ annotators coordinated in EN/中文/粤語… scheduling final boss defeated' },
    { u: 'ml_nerd', c: '#43b581', t: '>82% mAP50-95 with YOLOv8n. real-time. on actual industrial parts.' },
    { u: 'r_stats_uncle', c: '#6cc4f5', t: 'ARIMA-GARCH walk-forward, 12-step RMSE < 2.8. respect.' },
    { u: 'oss_maintainer', c: '#f0509f', t: 'her agent pipeline replies to my review comments before I finish typing them' },
    { u: 'night_owl', c: '#9a6fe0', t: 'semi-supervised ResNet-18: recall 25%→52% with barely any labels. how' },
    { u: 'pixel_fan', c: '#e8a13c', t: 'the slime has a COMBO SYSTEM?? this portfolio has gameplay' },
    { u: 'infra_cat', c: '#43b581', t: 'UFW + Fail2ban + least-privilege IAM… she hardens servers for fun' },
    { u: 'genai_lurker', c: '#6cc4f5', t: 'video pipeline quality +26% resolution +17% length at HyperGAI. numbers!!' },
    { u: 'brainwave_bro', c: '#9a6fe0', t: 'she turned EEG signals into images and hit >70% trend prediction 🧠' },
    { u: 'hr_bot', c: '#f0509f', t: '📧 yuyongshan573@gmail.com — literally hireable right now' },
    { u: 'sre_enjoyer', c: '#43b581', t: 'nightly snapshots, auto-clone, email alerts. a non-technical team runs it. THAT is design' },
    { u: 'lurker_9000', c: '#e8a13c', t: 'top 5% of graduating class btw. she won\'t say it so I will' }
  ];

  const chatDonations = [
    { u: 'recruiter_chan', amt: '$50', t: 'PLEASE check your LinkedIn DMs' },
    { u: 'startup_ceo', amt: '$100', t: 'can she start Monday?' },
    { u: 'design_lead', amt: '$25', t: 'the window manager alone is a portfolio' }
  ];

  let chatIndex = 0;
  let donationCooldown = 0;

  function appendChatMessage(node) {
    if (!chatFeed) return;
    chatFeed.appendChild(node);
    while (chatFeed.children.length > 40) {
      chatFeed.removeChild(chatFeed.firstChild);
    }
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }

  function makeChatLine({ u, c, t }) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg';
    const user = document.createElement('span');
    user.className = 'chat-user';
    user.style.color = c || 'var(--purple-dark)';
    user.textContent = u + ':';
    msg.appendChild(user);
    msg.appendChild(document.createTextNode(' ' + t));
    return msg;
  }

  function makeSystemLine(text) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg chat-system';
    msg.textContent = text;
    return msg;
  }

  function makeDonationLine({ u, amt, t }) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg chat-donation';
    const user = document.createElement('span');
    user.className = 'chat-user';
    user.textContent = `★ ${u} donated ${amt}:`;
    msg.appendChild(user);
    msg.appendChild(document.createTextNode(' ' + t));
    return msg;
  }

  if (chatFeed) {
    appendChatMessage(makeSystemLine('— stream_chat connected ♡ —'));

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

  function pushDanmaku(payload, isDonation) {
    if (!danmakuBox) return;
    // slower cadence than the full chat: skip ~40% of regular messages
    if (!isDonation && Math.random() < 0.4) return;

    const line = document.createElement('button');
    line.type = 'button';
    line.className = 'dm-line' + (isDonation ? ' dm-donation' : '');
    line.title = 'open stream_chat.log';
    const user = document.createElement('span');
    user.className = 'dm-user';
    user.textContent = (isDonation ? `★ ${payload.u}:` : `${payload.u}:`);
    if (!isDonation && payload.c) user.style.color = payload.c;
    line.appendChild(user);
    line.appendChild(document.createTextNode(' ' + (isDonation ? payload.t : payload.t)));
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
      appendChatMessage(makeSystemLine('email copied to clipboard — go say hi ♡'));
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
        showBubble('chat is sending love!! ♡', 2000);
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
      k: ['hello', 'hi ', 'hey', 'yo ', '你好', '哈喽', '嗨'],
      a: 'hi hi!! ♡ I\'m Yongshan\'s slime — her resume lives in my jelly. Ask me about her skills, Druid, the LMS she built, or anything really!',
      zh: '嗨嗨！！♡ 我是永杉的史莱姆，她的简历都存在我的果冻里～ 问我技能、Druid、她建的 LMS，什么都行！'
    },
    {
      k: ['who are you', 'who is', 'about her', 'about yongshan', 'introduce', 'intro', '介绍', '她是谁', '是谁'],
      a: 'Yongshan Yu: Systems/LMS & Full-Stack Lead + AI/Data practitioner, 3+ years across platform engineering, data science and MLOps. She takes things all the way to production — cloud stacks, hardened security, SRE automation. Also she drew me. pixel by pixel.',
      zh: '于永杉：Systems/LMS 全栈负责人 + AI/数据工程师，3 年+ 横跨平台工程、数据科学和 MLOps。她的特长是把东西真正做到生产环境——云架构、安全加固、SRE 自动化。顺便，我是她一个像素一个像素画出来的。'
    },
    {
      k: ['skill', 'stack', 'tech', 'technology', 'programming', 'code', '技能', '技术栈', '会什么', '编程'],
      a: 'Her loadout:\n• Python (Pandas/NumPy/PyTorch/TF/HuggingFace), C/C++, SQL, R\n• AWS S3/EC2, Azure, Nginx, Redis, MariaDB\n• AgentOps: autonomous coding-agent orchestration\n• CV (YOLO), time series (ARIMA-GARCH), GenAI\n• SRE: CloudWatch, TLS/HSTS, UFW/Fail2ban, cron automation\n• WCAG 2.1 AA accessibility\nOpen inventory.sav for the full item box!',
      zh: '她的装备栏：\n• Python（Pandas/NumPy/PyTorch/TF/HuggingFace）、C/C++、SQL、R\n• AWS S3/EC2、Azure、Nginx、Redis、MariaDB\n• AgentOps：自主编码智能体编排\n• 计算机视觉（YOLO）、时间序列（ARIMA-GARCH）、生成式 AI\n• SRE：CloudWatch、TLS/HSTS、UFW/Fail2ban、cron 自动化\n• WCAG 2.1 AA 无障碍\n打开 inventory.sav 看完整道具箱！'
    },
    {
      k: ['druid', 'agent', 'ai agent', 'autonomous', 'rustchain', 'agentops', '智能体', '代理'],
      a: 'Druid is her autonomous engineering framework — agents that scan repos, classify risk, write test-backed patches, open PRs, track reviews, and learn from outcomes (with stop-loss so they don\'t waste effort).\nReceipts: 47 merged PRs, 45 maintainer-reviewed in RustChain, 36 in active review, ~34 clean PRs/week. Focus: money-path, bridge, UTXO, payout & governance code. Humans keep the high-risk gates.',
      zh: 'Druid 是她的自主工程框架——智能体扫描仓库、划分风险等级、生成带回归测试的补丁、开 PR、跟踪 review、并从结果里学习（还有止损机制避免浪费算力）。\n战绩：47 个合并 PR，45 个经 RustChain 维护者 review，36 个在活跃审核队列，每周约 34 个干净 PR。专攻资金路径、跨链桥、UTXO、支付与治理代码，高风险操作保留人工把关。'
    },
    {
      k: ['moodle', 'lms', 'arc', 'website she built', 'production site', '网站', '在线学习'],
      a: 'She solo-built a production Moodle LMS on AWS for ARC in Action (anti-harassment education, bilingual EN/FR): EC2 + Nginx + PHP-FPM + MariaDB + Redis, Let\'s Encrypt/HSTS, UFW/Fail2ban, S3 backups with DR replication, nightly snapshots, auto-heal — designed so a fully non-technical team never touches a server. WCAG 2.1 AA verified. It\'s live — the "M" icon on this desktop opens it.',
      zh: '她独立为 ARC in Action（反性骚扰教育项目，英法双语）在 AWS 上搭了生产级 Moodle LMS：EC2 + Nginx + PHP-FPM + MariaDB + Redis、Let\'s Encrypt/HSTS、UFW/Fail2ban、S3 备份 + 容灾复制、每夜快照、故障自愈——设计目标是让完全不懂技术的团队永远不用碰服务器。通过 WCAG 2.1 AA 无障碍验证。网站在线运行中，桌面上的"M"图标就能打开。'
    },
    {
      k: ['hypergai', 'data engineer', 'annotat', 'internship', 'singapore', '数据工程', '实习'],
      a: 'At HyperGAI (Singapore) she ran data ops for multimodal GenAI: coordinated 200+ annotators across regions in English/Mandarin/Cantonese, built an S3 data warehouse, shipped Nginx microservices, and her pipeline work raised video dataset resolution +26% and length +17%.'
    },
    {
      k: ['research', 'yolo', 'defect', 'arima', 'time series', 'resnet', 'coyote', 'eeg', 'paper', '研究', '科研'],
      a: 'Research highlights:\n• YOLOv8 real-time defect detection — >82% mAP50-95, +18% factory throughput (NTU)\n• ARIMA-GARCH/SARIMA with walk-forward validation — 12-step RMSE < 2.8, −70% tuning time\n• Semi-supervised ResNet-18 — recall 25%→52% with scarce labels (UofA)\n• EEG-to-image autoencoders — >70% trend prediction (UofA)\nFull logs in career_quest.exe!'
    },
    {
      k: ['education', 'degree', 'university', 'school', 'gpa', 'master', 'study', '学历', '学校', '大学', '硕士'],
      a: 'MSc in Artificial Intelligence, NTU Singapore (GPA 4.21/5.0) + BSc Computer Science with a Science Psychology minor, University of Alberta — graduated with Distinction, top 5% of class, with a 4-year international scholarship.',
      zh: '新加坡南洋理工大学 AI 硕士（GPA 4.21/5.0）+ 阿尔伯塔大学计算机科学学士（辅修科学心理学）——以 Distinction 毕业，全班前 5%，还拿了四年国际学生奖学金。'
    },
    {
      k: ['contact', 'email', 'linkedin', 'github', 'reach', 'dm', '联系', '邮箱', '微信'],
      a: 'Reach her at:\n📧 yuyongshan573@gmail.com (click it in the sidebar to copy!)\n📞 +1 825-963-2725\n🔗 linkedin.com/in/yongshan-yu-b9a713227\n🐙 github.com/yyswhsccc',
      zh: '联系方式：\n📧 yuyongshan573@gmail.com（点侧边栏的邮箱可以直接复制！）\n📞 +1 825-963-2725\n🔗 linkedin.com/in/yongshan-yu-b9a713227\n🐙 github.com/yyswhsccc'
    },
    {
      k: ['hire', 'hiring', 'available', 'job', 'recruit', 'work with', 'open to work', 'open for work', 'looking for work', 'opportunit', 'position', 'role', 'freelance', 'employ', '招聘', '雇', '工作机会', '合作', '找工作', '求职', '招人'],
      a: 'YES. She\'s open to UI/UX + full-stack + AI systems roles. You\'ve seen the evidence: this whole site is hand-written, the LMS is in production, Druid has 47 merged PRs. Email yuyongshan573@gmail.com before someone else does — I need job security as her mascot!!',
      zh: '当然可以！她对 UI/UX、全栈、AI 系统方向的机会都开放。证据你都看到了：这个网站纯手写、LMS 在生产环境跑着、Druid 有 47 个合并 PR。快发邮件到 yuyongshan573@gmail.com——我这个吉祥物还指着她吃饭呢！！'
    },
    {
      k: ['this site', 'this website', 'how did', 'built this', 'portfolio', 'made this', '这个网站', '怎么做的'],
      a: 'Everything here is hand-written HTML/CSS/JS — zero frameworks, zero libraries. A draggable window manager, an 8-bit Web Audio synth, my sprite engine (my sleeping/eating faces are pixel-edited frames), a fake terminal, and me: a stateful virtual pet with a localStorage save file. Even this bot is a client-side keyword engine — no API, works offline.',
      zh: '这里的一切都是纯手写 HTML/CSS/JS——零框架、零库。可拖拽的窗口管理器、8-bit Web Audio 合成器、我的精灵引擎（睡觉/吃饭表情是逐像素改出来的帧）、伪终端，还有我：一只带 localStorage 存档的状态机宠物。连这个问答机器人都是纯前端关键词引擎——没有 API，断网也能用。'
    },
    {
      k: ['language', 'speak', 'chinese', 'mandarin', 'cantonese', 'french', 'english', '会说', '语言', '中文', '粤语', '法语'],
      a: 'She speaks English (fluent), Mandarin (native), Cantonese (native), and is studying French — handy, since the LMS she built is bilingual EN/FR. She once coordinated 200+ annotators across all three Chinese/English channels at once.',
      zh: '她说英语（流利）、普通话（母语）、粤语（母语），正在学法语——正好她建的 LMS 就是英法双语的。在 HyperGAI 她试过同时用中英粤三语协调 200+ 标注员。'
    },
    {
      k: ['slime', 'pet', 'you ', 'your name', 'cute', '史莱姆', '宠物', '可爱'],
      a: 'Me?? I\'m a production-grade virtual pet: state machine (mood/energy/affection), combo detection, drag physics, sprite frames, a persistent fan counter, and an overload failsafe. She wrote all of it. Also I\'m adorable, which is a separate skill.',
      zh: '我吗？？我可是生产级虚拟宠物：状态机（心情/能量/好感度）、连击检测、拖拽物理、表情帧、粉丝数存档，还有防过载保险丝。全是她写的。另外我很可爱，这是另一项独立技能。'
    },
    {
      k: ['salary', 'pay', 'compensation', 'rate', '薪资', '工资', '报价'],
      a: 'A slime does not negotiate compensation!! That\'s between you and her inbox: yuyongshan573@gmail.com ♡'
    },
    {
      k: ['location', 'where', 'based', 'canada', 'timezone', '在哪', '哪里', '时区'],
      a: 'She\'s based in Canada (that +1 825 number is Alberta!) and has worked across Canada 🇨🇦 and Singapore 🇸🇬 — comfortable with remote and cross-timezone teams.'
    },
    {
      k: ['hobby', 'hobbies', 'fun', 'like to do', 'favorite', 'favourite', '爱好', '喜欢'],
      a: 'Judging by my existence: pixel art, cute-tech, rhythm-game-grade UI feedback, and teaching AI agents to do her chores. Also studying French. Her favorite color is statistically pink, I have receipts.'
    },
    {
      k: ['weakness', 'flaw', 'bad at', '缺点'],
      a: 'Her documented weakness: she keeps polishing pixel details at 2am. Her slime\'s documented weakness: snacks.'
    },
    {
      k: ['awesome', 'amazing', 'impressive', 'incredible', 'so cool', 'very cool', 'love this', 'love it', 'wow', 'great', 'nice', 'insane', 'goated', '好牛', '牛逼', '太牛', '厉害', '太强', '好强', '绝了', '好棒', '太棒', '真棒', '优秀', 'nb', '666', '哇'],
      a: 'hehehe stoppp I\'m gonna wobble off the screen 🥹 — but yes, agreed, she IS that good. Want proof to forward to your team? Ask me "research highlights" or "what is Druid", or just email her: yuyongshan573@gmail.com ♡',
      zh: '嘿嘿嘿别夸了，我要滚出屏幕了 🥹 ——不过你说得对，她确实很强。想要能转发给团队的证据吗？问我"研究亮点"或者"Druid 是什么"，或者直接发邮件：yuyongshan573@gmail.com ♡'
    },
    {
      k: ['thank', 'thanks', 'thx', 'ty ', 'merci', '谢谢', '感谢', '辛苦'],
      a: 'no no, thank YOU for visiting the stream ♡ tip jar accepts: job offers, boba, and pixel hearts.',
      zh: '不不，是谢谢你来看直播 ♡ 打赏通道只收：工作机会、奶茶、和像素爱心。'
    },
    {
      k: ['really', 'seriously', 'for real', 'no way', 'sure?', '真的吗', '真的假的', '不会吧', '认真的'],
      a: 'REALLY really. Receipts: the ARC Moodle LMS is live in production (the "M" icon opens it), Druid has 47 merged PRs with maintainer reviews on record, and this entire OS is view-source-able hand-written code. I\'m a slime, I cannot legally lie.',
      zh: '真的不能再真了。证据链：ARC Moodle LMS 正在生产环境运行（桌面上"M"图标直接打开）、Druid 有 47 个带维护者 review 记录的合并 PR、这整个 OS 右键查看源码全是手写的。我是史莱姆，法律上不允许说谎。'
    },
    {
      k: ['how are you', 'how r u', 'how is it going', "how's it going", '你好吗', '最近怎么样'],
      a: 'living my best jelly life — energy bar green, fans climbing, zero production incidents. how are YOU? (if the answer is "hiring", I know a girl.)',
      zh: '果冻人生巅峰状态——能量条全绿、粉丝上涨、生产环境零事故。你呢？（如果答案是"在招人"，我认识一个很合适的人。）'
    },
    {
      k: ['bye', 'goodbye', 'see you', 'cya', 'gtg', '再见', '拜拜', '走了'],
      a: 'byebye!! ♡ don\'t forget to ♥ like the site on your way out — and yuyongshan573@gmail.com is always open. *waves with entire body*',
      zh: '拜拜！！♡ 走之前记得点一下 ♥ like——邮箱 yuyongshan573@gmail.com 永远开放。*用整个身体挥手*'
    }
  ];

  const AMA_FALLBACKS = [
    'hmm, that one\'s not in my jelly yet… try asking about her skills, Druid, the LMS, research, or how to hire her! Or email her directly: yuyongshan573@gmail.com ♡',
    'my slime brain returned 404 on that 🥺 — try "what is Druid?", "tech stack?", or "is she open to work?"'
  ];

  const AMA_CHIP_POOL = [
    'What is Druid?',
    'What\'s her tech stack?',
    'Tell me about the LMS',
    'Is she open to work?',
    '她会说中文吗？',
    'Who built this site?',
    'Research highlights?',
    'How do I contact her?',
    '推荐个餐厅吧！'
  ];

  function amaScore(question, topic) {
    const q = question.toLowerCase();
    let score = 0;
    topic.k.forEach((kw) => {
      if (q.includes(kw.trim().toLowerCase())) {
        score += hasCJK(kw) ? kw.length * 4 : kw.length;
      }
    });
    return score;
  }

  var amaLastTopic = null;
  var amaRepeatCount = 0;

  function amaAnswerFor(question) {
    let best = null;
    let bestScore = 2; // threshold
    AMA_TOPICS.forEach((t) => {
      const s = amaScore(question, t);
      if (s > bestScore) { bestScore = s; best = t; }
    });
    if (!best) {
      amaLastTopic = null;
      return AMA_FALLBACKS[Math.floor(Math.random() * AMA_FALLBACKS.length)];
    }

    const zh = hasCJK(question) && best.zh;
    let answer = zh ? best.zh : best.a;

    // same topic again? acknowledge it instead of sounding like a broken record
    if (best === amaLastTopic) {
      amaRepeatCount++;
      const againEn = ['(asking twice = extra important!! ok, once more:)', '(you REALLY like this topic ♡ recap:)', '(third time?? fine, tattooing it on my jelly:)'];
      const againZh = ['（问两遍=真的很重要！！那再说一次：）', '（你是真的喜欢这个话题 ♡ 复述如下：）', '（第三遍？？行，我把它纹在果冻上：）'];
      const pool = zh ? againZh : againEn;
      answer = pool[Math.min(amaRepeatCount - 1, pool.length - 1)] + '\n' + answer;
    } else {
      amaRepeatCount = 0;
    }
    amaLastTopic = best;
    return answer;
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

  function amaRenderChips() {
    if (!amaChipsWrap) return;
    amaChipsWrap.innerHTML = '';
    const shuffled = [...AMA_CHIP_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
    shuffled.forEach((q) => {
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
      amaAddBot(amaAnswerFor(q));
      playTone(987.77, 'sine', 0.08, 0, 0.05);
      amaBusy = false;
      amaRenderChips();
      gainFollowers(1);
      if (!pet.sleeping && !pet.busy && Math.random() < 0.5) {
        showBubble('someone\'s asking about her!! ♡', 1800);
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

  if (amaFeed) {
    amaAddBot('hi!! I\'m slime_bot — Yongshan\'s resume lives in my jelly 🍮 Ask me anything about her: tech, projects, research… even in 中文! (I run 100% in your browser, no servers were bothered.)');
    amaRenderChips();
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

  const TERM_COMMANDS = {
    help() {
      termLine('available commands:', 't-dim');
      termLine('  whoami      — who is yongshan');
      termLine('  skills      — tech loadout');
      termLine('  druid       — her AI-agent framework (the good stuff)');
      termLine('  repos       — live fetch from the GitHub API');
      termLine('  neofetch    — system info, but cute');
      termLine('  open <app>  — open a window (career/skills/chat/ama/edu)');
      termLine('  pet         — pet the slime without leaving the shell');
      termLine('  contact     — email / phone / links');
      termLine('  spy         — toggle ghost/incognito mode 🕵️');
      termLine('  clear       — wipe the screen');
      termLine('  sudo hire yongshan — you know you want to', 't-accent');
    },
    whoami() {
      termLine('yongshan yu — systems/LMS & full-stack lead, AI/data practitioner', 't-accent');
      termLine('3+ yrs: platform engineering · data science · MLOps');
      termLine('ships to production: AWS stacks, hardened security, SRE automation');
      termLine('currently: building autonomous engineering agents (see `druid`)');
    },
    skills() {
      termLine('~/skills', 't-dim');
      termLine('├── python (pandas·numpy·pytorch·tf·huggingface)', 't-accent');
      termLine('├── c/c++ · sql · r');
      termLine('├── aws (s3·ec2) · azure · nginx · redis · mariadb');
      termLine('├── agentops: coding-agent orchestration, CI-aware debugging');
      termLine('├── ml: yolo · faster r-cnn · arima-garch · genAI');
      termLine('├── sre: cloudwatch · tls/hsts · ufw/fail2ban · cron');
      termLine('└── a11y: WCAG 2.1 AA (WAVE, Accessibility Insights)');
    },
    druid() {
      termLine('DRUID — agentic engineering OS', 't-accent');
      termLine('loop: scan → classify risk → patch+tests → PR → track review → learn → stop-loss');
      termLine('  47 merged PRs total', 't-ok');
      termLine('  45 maintainer-reviewed outcomes in RustChain', 't-ok');
      termLine('  36 PRs in active review · ~34 clean PRs/week', 't-ok');
      termLine('focus: money-path, bridge, UTXO, payout & governance surfaces');
      termLine('humans keep the gates on high-risk changes.', 't-dim');
    },
    neofetch() {
      NEOFETCH_ART.forEach((l) => termLine(l, 't-accent'));
      termLine('');
      termLine('yongshan@os', 't-ok');
      termLine('-----------', 't-dim');
      termLine('OS:       YongshanOS v2.0 (Y2K pastel edition)');
      termLine('Host:     hand-written HTML/CSS/JS — 0 frameworks');
      termLine('Kernel:   window-manager 1.0 + 8-bit synth');
      termLine('Shell:    slime_sh');
      termLine('Pet:      1 slime (sprite engine, 3 expressions)');
      termLine(`Fans:     ${pet.followers} ★`);
      termLine('Uptime:   coding since 2019, agents since 2025');
    },
    contact() {
      termLine('email:    yuyongshan573@gmail.com', 't-accent');
      termLine('phone:    +1 825-963-2725');
      termLink('linkedin: linkedin.com/in/yongshan-yu-b9a713227', 'http://www.linkedin.com/in/yongshan-yu-b9a713227');
      termLink('github:   github.com/yyswhsccc', 'https://github.com/yyswhsccc');
    },
    pet() {
      petSlime();
      termLine('*boing* the slime has been petted remotely. +1 fan', 't-ok');
    },
    clear() {
      if (termOut) termOut.innerHTML = '';
    },
    repos: termCmdRepos,
    spy() {
      const spying = resolvedTheme() === 'incognito';
      setThemePref(spying ? 'auto' : 'incognito');
      playGlitchSound();
      termLine(spying ? 'spy mode disengaged. welcome back to the pastel zone ♡' : '🕵️ spy mode ON. the slime is now a ghost. trust no one.', 't-accent');
    },
    ls() {
      termLine('career_quest.exe   inventory.sav   stream_chat.log', 't-accent');
      termLine('ask_me.chat        terminal.exe    education_awards.txt');
      termLine('about_me.ini       slime.pet       hire_me.plz', 't-dim');
    }
  };

  const TERM_OPEN_MAP = {
    career: 'win-career', quest: 'win-career',
    skills: 'win-skills', inventory: 'win-skills',
    chat: 'win-chat', stream: 'win-chat',
    ama: 'win-ama', ask: 'win-ama',
    edu: 'win-education', education: 'win-education',
    about: 'win-profile-intro', terminal: 'win-terminal'
  };

  function runTermCommand(raw) {
    const input = raw.trim();
    if (!input) return;
    termLine(`yongshan@os:~$ ${input}`, 't-cmd');

    const lower = input.toLowerCase();
    const [cmd, ...args] = lower.split(/\s+/);

    if (lower === 'sudo hire yongshan' || lower === 'hire' || lower === 'sudo hire') {
      termLine('[sudo] password for recruiter: ********', 't-dim');
      termLine('✔ permission granted. everyone has permission for this one.', 't-ok');
      termLine('→ email: yuyongshan573@gmail.com (copied to your heart)', 't-accent');
      playFanfare();
      gainFollowers(3);
      return;
    }
    if (cmd === 'sudo') {
      termLine('nice try. this slime respects the principle of least privilege.', 't-err');
      return;
    }
    if (cmd === 'echo') {
      termLine(input.slice(5) || '');
      return;
    }
    if (cmd === 'open') {
      const target = TERM_OPEN_MAP[args[0]];
      if (target) {
        openWindow(target);
        termLine(`opening ${args[0]}…`, 't-ok');
      } else {
        termLine(`open: unknown app "${args[0] || ''}" — try career/skills/chat/ama/edu`, 't-err');
      }
      return;
    }
    if (cmd === 'rm') {
      termLine('rm: refusing to delete cuteness (protected path)', 't-err');
      return;
    }
    if (cmd === 'exit') {
      termLine('bye!! closing window ♡', 't-dim');
      setTimeout(() => closeWindow(termWindow), 400);
      return;
    }

    const handler = TERM_COMMANDS[cmd];
    if (handler) {
      handler();
    } else {
      termLine(`${cmd}: command not found — try \`help\``, 't-err');
    }
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

    termLine('YongshanOS terminal — hand-rolled, no libraries.', 't-accent');
    termLine('type `help` to explore, `neofetch` to vibe.', 't-dim');
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
  var themePref = store.get('yos-theme', 'auto'); // 'auto' | 'light' | 'dark' | 'incognito'
  var isIncogDetected = false;
  var nightSkyBuilt = false;
  const darkMQ = window.matchMedia('(prefers-color-scheme: dark)');

  function resolvedTheme() {
    if (themePref === 'incognito') return 'incognito';
    if (themePref === 'auto') {
      if (isIncogDetected) return 'incognito';
      return darkMQ.matches ? 'dark' : 'light';
    }
    return themePref;
  }

  function applyThemeChrome() {
    const th = document.documentElement.getAttribute('data-theme') || 'light';
    const tabTitle = document.getElementById('tab-title');
    const tabIcon = document.getElementById('tab-icon');
    const secureIcon = document.getElementById('secure-icon');
    if (th === 'incognito') {
      if (tabTitle) tabTitle.textContent = t('tab.incog');
      if (tabIcon) tabIcon.textContent = '🕵️';
      if (secureIcon) secureIcon.textContent = '🕵️';
      document.title = t('tab.incog');
    } else {
      if (tabTitle) tabTitle.innerHTML = 'YongshanOS&nbsp;♡&nbsp;v2.0';
      if (tabIcon) tabIcon.textContent = '🌐';
      if (secureIcon) secureIcon.textContent = '🔒';
      document.title = t('meta.title');
    }
  }

  function applyTheme() {
    const th = resolvedTheme();
    if (th === 'light') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', th);

    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) themeBtn.textContent = th === 'dark' ? '🌞' : th === 'incognito' ? '🕵️' : '🌙';

    if (th === 'dark') buildNightSky();
    applyThemeChrome();
    gRefreshTheme();
    syncGhostMode();
  }

  /* =====================================================
     v3.1 — GHOST ENGINE (incognito signature)
     In spy mode the slime is invisible most of the time and
     only drifts in for a few seconds, shades on, like a
     friendly apparition. Interacting summons it.
     ===================================================== */
  var ghostCycleTimer = null;
  var ghostHideTimer = null;

  const GHOST_LINES = [
    '👻 boo. you saw nothing.',
    'cutest ghost on this side of the firewall',
    'ghosts ship clean code too',
    'shhh... private stream',
    'the shades? standard spy issue ♡'
  ];

  function ghostHidden() {
    return slimeBody && slimeBody.classList.contains('is-ghost-hidden');
  }

  function ghostVanish() {
    if (resolvedTheme() !== 'incognito') return;
    if (pet.busy || pet.sleeping || isGrabbing) return;
    if (slimeBody) slimeBody.classList.add('is-ghost-hidden');
  }

  function ghostAppear(duration = 3200, line) {
    if (!slimeBody || resolvedTheme() !== 'incognito') return;
    slimeBody.classList.remove('is-ghost-hidden');
    if (line !== false) {
      showBubble(line || GHOST_LINES[Math.floor(Math.random() * GHOST_LINES.length)], 2400);
    }
    playTone(392, 'sine', 0.35, 0, 0.04);
    playTone(494, 'sine', 0.3, 0.18, 0.03);
    if (ghostHideTimer) clearTimeout(ghostHideTimer);
    ghostHideTimer = setTimeout(ghostVanish, duration);
  }

  function ghostLoop() {
    if (ghostCycleTimer) clearTimeout(ghostCycleTimer);
    if (resolvedTheme() !== 'incognito') return;
    ghostCycleTimer = setTimeout(() => {
      if (resolvedTheme() === 'incognito' && !pet.busy && !pet.sleeping && !isGrabbing) {
        if (ghostHidden()) ghostAppear(2800 + Math.random() * 1800);
        else ghostVanish(); // whatever woke it up, the ghost hour resumes
      }
      ghostLoop();
    }, 6500 + Math.random() * 7000);
  }

  function syncGhostMode() {
    if (!slimeBody) return;
    if (resolvedTheme() === 'incognito') {
      if (ghostHideTimer) clearTimeout(ghostHideTimer);
      ghostHideTimer = setTimeout(ghostVanish, 2400);
      ghostLoop();
    } else {
      if (ghostCycleTimer) clearTimeout(ghostCycleTimer);
      if (ghostHideTimer) clearTimeout(ghostHideTimer);
      ghostCycleTimer = null;
      slimeBody.classList.remove('is-ghost-hidden');
    }
  }

  // clicking the empty habitat while the ghost hides = summoning ritual
  if (slimeHabitat) {
    slimeHabitat.addEventListener('click', (e) => {
      if (!ghostHidden()) return;
      if (e.target.closest('.slime-pet')) return;
      ghostAppear(3800, '👻 you found me!! +1 haunted fan');
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

  // Best-effort private-browsing detection (storage quota heuristic).
  // Note: recent Chrome versions deliberately report incognito quotas that look
  // normal, so this can't be 100% reliable — spy mode is always one click away
  // in the right-click menu, the address bar (`spy`) and the terminal.
  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then(({ quota }) => {
      if (quota && quota < 400 * 1024 * 1024) {
        isIncogDetected = true;
        if (themePref === 'auto') {
          applyTheme();
          setTimeout(() => {
            showToast(t('toast.incog'));
            if (!pet.sleeping) showBubble('🕵️ ...who ARE you?', 2600);
          }, 2600);
        }
      }
    }).catch(() => { /* not supported — stay pastel */ });
  }

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
      const s = document.createElement('span');
      const roll = Math.random();
      s.className = 'ns-star' + (roll < 0.33 ? ' ns-pink' : roll < 0.6 ? ' ns-blue' : '');
      s.textContent = Math.random() < 0.5 ? '✦' : '·';
      s.style.left = `${Math.random() * 100}%`;
      s.style.top = `${Math.random() * 68}%`;
      s.style.fontSize = `${7 + Math.random() * 9}px`;
      s.style.animationDelay = `${Math.random() * 3}s`;
      sky.appendChild(s);
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
    'win-education': 'education_awards.txt',
    'win-profile-intro': 'about_me.ini',
    'win-start-here': 'start_here.txt'
  };
  const ADDR_ALIASES = {
    career: 'win-career', quest: 'win-career', skills: 'win-skills', inventory: 'win-skills',
    chat: 'win-chat', stream: 'win-chat', ama: 'win-ama', ask: 'win-ama',
    terminal: 'win-terminal', term: 'win-terminal', search: 'win-search',
    game: 'win-game', run: 'win-game', edu: 'win-education', education: 'win-education',
    about: 'win-profile-intro', start: 'win-start-here', help: 'win-start-here'
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

    // secret handshake: toggle spy mode from the address bar
    if (path === 'spy' || path === 'incognito' || path === 'ghost') {
      const spying = resolvedTheme() === 'incognito';
      setThemePref(spying ? 'auto' : 'incognito');
      showToast(t(spying ? 'toast.light' : 'toast.incog'));
      playGlitchSound();
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
      url: 'yongshan.dev/about_me.ini',
      desc: 'The person this entire operating system is about. 3+ years of platform engineering, data science and MLOps — shipped to production.',
      win: 'win-profile-intro'
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
    { title: 'the slime — a production-grade virtual pet', url: 'yongshan.dev/slime.pet', desc: 'State machine, combo detection, drag physics, sprite frames, auto-nap health protocol. Also: adorable.', win: 'win-start-here', k: 'slime pet cute tamagotchi mascot 史莱姆 宠物 mignon' }
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
    const spying = resolvedTheme() === 'incognito';
    ctxMenu.appendChild(ctxItem(t(spying ? 'ctx.spyOff' : 'ctx.spy'), () => {
      setThemePref(spying ? 'auto' : 'incognito');
      showToast(t(spying ? 'toast.light' : 'toast.incog'));
      playGlitchSound();
    }));
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
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideCtxMenu(); });
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
    speed: 3.4, score: 0, spawnIn: 60, frame: 0,
    hi: store.get('yos-runner-hi', 0)
  };
  const G_W = 480, G_H = 160, G_GROUND = 132, G_SLIME_X = 46, G_SLIME_S = 34;

  const gSprite = new Image();
  gSprite.src = 'assets/slime_pet_cutout.png';

  function gReset() {
    GAME.obs = [];
    GAME.speed = 3.4;
    GAME.score = 0;
    GAME.spawnIn = 60;
    GAME.y = 0;
    GAME.vy = 0;
  }

  function gJump() {
    if (GAME.state === 'idle' || GAME.state === 'over') {
      GAME.state = 'run';
      gReset();
      playClickSound();
      return;
    }
    if (GAME.y <= 0) {
      GAME.vy = 9.6;
      playTone(880, 'square', 0.09, 0, 0.05);
    }
  }

  function gGameOver() {
    GAME.state = 'over';
    playGlitchSound();
    if (GAME.score > GAME.hi) {
      GAME.hi = Math.floor(GAME.score);
      store.set('yos-runner-hi', GAME.hi);
      playFanfare();
    }
    if (!pet.sleeping && Math.random() < 0.6) {
      showBubble(yosLang === 'fr' ? 'aïe!! le bug m\'a eu' : 'ouch!! the bug got me', 1800);
    }
  }

  function gDrawSlime(g2) {
    const bob = GAME.state === 'run' && GAME.y <= 0 ? Math.sin(GAME.frame * 0.35) * 2 : 0;
    const squash = GAME.y <= 0 ? 1 + Math.sin(GAME.frame * 0.35) * 0.04 : 0.94;
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
    const yTop = o.fly ? G_GROUND - 58 : G_GROUND - o.h;
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

    const g2 = gCanvas.getContext('2d');
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

    // dashed pixel ground
    g2.fillStyle = gTheme.purple;
    const dashShift = GAME.state === 'run' ? (GAME.frame * GAME.speed) % 18 : 0;
    for (let x = -18; x < G_W + 18; x += 18) {
      g2.fillRect(x - dashShift, G_GROUND + G_SLIME_S - 4, 10, 3);
    }

    if (GAME.state === 'run') {
      // physics
      if (GAME.y > 0 || GAME.vy > 0) {
        GAME.y += GAME.vy;
        GAME.vy -= 0.52;
        if (GAME.y <= 0) { GAME.y = 0; GAME.vy = 0; }
      }

      // spawn + move obstacles
      GAME.spawnIn--;
      if (GAME.spawnIn <= 0) {
        const fly = GAME.score > 220 && Math.random() < 0.26;
        GAME.obs.push({
          x: G_W + 10,
          w: fly ? 26 : 13 + Math.random() * 12,
          h: fly ? 16 : 16 + Math.random() * 14,
          fly
        });
        GAME.spawnIn = Math.max(34, 58 + Math.random() * 52 - GAME.speed * 5);
      }
      GAME.obs.forEach((o) => { o.x -= GAME.speed; });
      GAME.obs = GAME.obs.filter((o) => o.x > -40);

      // collision (slightly forgiving hitboxes)
      const sx = G_SLIME_X + 5, sw = G_SLIME_S - 10;
      const sy = G_GROUND - G_SLIME_S - GAME.y + 6, sh = G_SLIME_S - 8;
      for (const o of GAME.obs) {
        const oy = o.fly ? G_GROUND - 58 : G_GROUND - o.h;
        const oh = o.fly ? 16 : o.h;
        if (sx < o.x + o.w - 3 && sx + sw > o.x + 3 && sy < oy + oh - 3 && sy + sh > oy + 2) {
          gGameOver();
          break;
        }
      }

      GAME.score += 0.16 * GAME.speed;
      GAME.speed = Math.min(9.5, GAME.speed + 0.0016);
    }

    GAME.obs.forEach((o) => gDrawObstacle(g2, o));
    gDrawSlime(g2);

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

  function gameWindowVisible() {
    return gWin && !gWin.classList.contains('window-closed') && !gWin.classList.contains('window-minimized');
  }

  if (gCanvas) {
    gCanvas.addEventListener('pointerdown', (e) => { e.preventDefault(); gJump(); });
    document.addEventListener('keydown', (e) => {
      if (!gameWindowVisible()) return;
      if (e.target.closest('input, textarea')) return;
      if (e.code === 'Space' || e.code === 'ArrowUp') {
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
    k: ['restaurant', 'food', 'eat', 'hungry', 'dinner', 'lunch', 'boba', 'snack', 'manger', 'restau', '餐厅', '吃什么', '美食', '奶茶', '推荐'],
    a: 'slime\'s totally unbiased restaurant algorithm ♡\n1. anywhere with boba — weight 0.9\n2. hotpot — the distributed system of food: many nodes, one broth\n3. dim sum — microservices, but delicious\n4. a good poutine (she\'s in Alberta, it\'s the law)\ntip: she coordinated 200+ annotators in EN/中文/粤語 — ordering for the table is a solved problem.',
    zh: '史莱姆的公正餐厅推荐算法 ♡\n1. 有奶茶的地方——权重 0.9\n2. 火锅——食物界的分布式系统：节点多，汤底只有一个\n3. 早茶点心——微服务架构，但是好吃\n4. 加拿大 poutine（她在阿尔伯塔，这是法律规定）\n小贴士：她管理过 200+ 中英粤三语标注员——帮全桌点菜属于已解决问题。'
  });

  /* =====================================================
     v3.0 — BOOT SEQUENCE for the new modules
     ===================================================== */
  const storedLang = store.get('yos-lang', null);
  applyLang(storedLang === 'fr' || storedLang === 'en' ? storedLang : detectBrowserLang(), false);
  applyTheme();
  initFanWall();
  renderSearch('');
  updateAddressBar();

  const phoneText = document.querySelector('.contact-text');
  if (phoneText) phoneText.classList.add('incog-redact');

  if (!navigator.onLine) {
    setOfflineUI(true);
    setTimeout(() => openWindow('win-game', { fromHistory: true }), 2400);
  }
});
