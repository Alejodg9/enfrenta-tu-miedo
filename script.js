(() => {
  'use strict';
  const SCREENS = ['cover', 'video', 'explain', 'spell', 'paper'];
  const IDLE_SECONDS = { default: 60, paper: 300 };
  const WARNING_SECONDS = 15;
  const screens = [...document.querySelectorAll('[data-screen]')];
  const restartButton = document.getElementById('restartButton');
  const video = document.getElementById('boggart-video');
  const videoMissing = document.getElementById('videoMissing');
  const videoPlayPrompt = document.getElementById('videoPlayPrompt');
  const orbButton = document.getElementById('orbButton');
  const orbInstruction = document.getElementById('orbInstruction');
  const spellWord = document.getElementById('spellWord');
  const spellContinue = document.getElementById('spellContinue');
  const idlePrompt = document.getElementById('idlePrompt');
  const countdown = document.getElementById('countdown');
  const canvas = document.getElementById('particleCanvas');
  const ctx = canvas.getContext('2d');
  const IMAGINATION_DURATION = 8000;
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const imaginedButton = document.getElementById('imaginedButton');
  const spellReflect = document.getElementById('spellReflect');
  const spellTransform = document.getElementById('spellTransform');
  const spellResult = document.getElementById('spellResult');
  const resultKicker = document.getElementById('resultKicker');
  const boggartStage = document.querySelector('.boggart-stage');
  let current = 'cover';
  let lastActivity = Date.now();
  let castTimer = null;
  let animationFrame = null;
  let particles = [];
  let spellCast = false;
  let missingVideo = false;
  let spellState = 'idle';
  let imaginationStarted = 0;
  let sequenceTimers = [];

  // El seguimiento se interpola y solo afecta al contenedor visual del Boggart.
  if (boggartStage && !REDUCED_MOTION && window.matchMedia('(hover: hover)').matches) {
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let boggartFrame = null;

    const renderBoggart = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      boggartStage.style.setProperty('--boggart-x', `${currentX.toFixed(2)}px`);
      boggartStage.style.setProperty('--boggart-y', `${currentY.toFixed(2)}px`);
      if (Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05) boggartFrame = requestAnimationFrame(renderBoggart);
      else { currentX = targetX; currentY = targetY; boggartFrame = null; }
    };

    const moveBoggart = event => {
      const bounds = boggartStage.getBoundingClientRect();
      targetX = Math.max(-8, Math.min(8, ((event.clientX - bounds.left) / bounds.width - .5) * 16));
      targetY = Math.max(-8, Math.min(8, ((event.clientY - bounds.top) / bounds.height - .5) * 16));
      if (!boggartFrame) boggartFrame = requestAnimationFrame(renderBoggart);
    };

    boggartStage.addEventListener('pointermove', moveBoggart);
    boggartStage.addEventListener('pointerleave', () => {
      targetX = 0;
      targetY = 0;
      if (!boggartFrame) boggartFrame = requestAnimationFrame(renderBoggart);
    });
  }

  function showVideoPlayPrompt() {
    if (!missingVideo) videoPlayPrompt.hidden = false;
  }

  function hideVideoPlayPrompt() { videoPlayPrompt.hidden = true; }

  function playVideo() {
    if (missingVideo) return;
    const playback = video.play();
    if (playback && typeof playback.catch === 'function') playback.catch(showVideoPlayPrompt);
  }

  function schedule(fn, delay) {
    const timer = setTimeout(() => { sequenceTimers = sequenceTimers.filter(t => t !== timer); fn(); }, delay);
    sequenceTimers.push(timer);
    return timer;
  }

  function clearSequence() {
    sequenceTimers.forEach(clearTimeout);
    sequenceTimers = [];
  }

  function resetSpell() {
    clearSequence();
    clearTimeout(castTimer);
    spellCast = false;
    spellState = 'idle';
    imaginationStarted = 0;
    spellReflect.hidden = false;
    spellReflect.classList.remove('leaving');
    spellTransform.hidden = true;
    spellTransform.classList.remove('entering', 'concluding');
    spellResult.hidden = true;
    spellResult.classList.remove('show-kicker', 'show-result', 'show-copy');
    resultKicker.classList.remove('visible');
    spellWord.textContent = '¡Riddikulus!';
    spellWord.classList.remove('visible');
    spellContinue.hidden = true;
    orbInstruction.textContent = 'CUANDO ESTÉS LISTO, TOCÁ LA ESFERA.';
    orbButton.disabled = false;
    orbButton.style.animationDuration = '';
    orbButton.querySelectorAll('.orb, .orb-halo, .orb-progress').forEach(element => { element.style.animationDuration = ''; });
    orbButton.classList.remove('cast', 'done', 'imagining', 'anticipate', 'bursting', 'gone');
    particles = [];
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function markActivity() { lastActivity = Date.now(); idlePrompt.hidden = true; }

  function showScreen(name) {
    if (!SCREENS.includes(name)) return;
    if (current === 'video' && name !== 'video') {
      video.pause();
      hideVideoPlayPrompt();
    }
    if (name === 'cover' || name === 'spell') resetSpell();
    if (name === 'cover') {
      video.pause();
      video.currentTime = 0;
      hideVideoPlayPrompt();
    }
    current = name;
    screens.forEach(s => { const active = s.dataset.screen === name; s.hidden = !active; s.classList.toggle('active', active); });
    restartButton.hidden = name === 'cover';
    markActivity();
    document.title = name === 'cover' ? 'Enfrentá tu miedo · Experiencia Riddikulus' : 'Enfrentá tu miedo · ' + name;
    window.scrollTo(0, 0);
    if (name === 'video') playVideo();
  }

  document.querySelectorAll('[data-next]').forEach(b => b.addEventListener('click', () => showScreen(b.dataset.next)));
  restartButton.addEventListener('click', () => showScreen('cover'));
  document.getElementById('finishRestart').addEventListener('click', () => showScreen('cover'));
  document.getElementById('stayButton').addEventListener('click', markActivity);
  for (const eventName of ['pointerdown', 'pointermove', 'keydown', 'wheel']) {
    document.addEventListener(eventName, markActivity, { passive: true });
  }
  video.addEventListener('play', markActivity);
  video.addEventListener('pause', markActivity);
  video.addEventListener('play', hideVideoPlayPrompt);
  video.addEventListener('ended', () => { hideVideoPlayPrompt(); markActivity(); if (current === 'video') showScreen('explain'); });
  video.addEventListener('error', () => {
    missingVideo = true;
    video.hidden = true;
    hideVideoPlayPrompt();
    videoMissing.hidden = false;
  });
  videoPlayPrompt.addEventListener('click', () => { markActivity(); playVideo(); });

  function sizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', sizeCanvas);
  window.addEventListener('orientationchange', sizeCanvas);
  window.visualViewport?.addEventListener('resize', sizeCanvas);
  sizeCanvas();

  function burst(fireworks = false) {
    sizeCanvas();
    const canvasRect = canvas.getBoundingClientRect();
    const orbRect = orbButton.getBoundingClientRect();
    const x = orbRect.left + orbRect.width / 2 - canvasRect.left;
    const y = orbRect.top + orbRect.height / 2 - canvasRect.top;
    const colors = fireworks ? ['#ffc25f', '#ff726d', '#ee75bc', '#c4a6ff', '#9cecf2'] : ['#a2eff7', '#d8ffff', '#cdb2ff', '#f29bd8'];
    const count = REDUCED_MOTION ? (fireworks ? 30 : 35) : (fireworks ? 70 : 105);
    particles = Array.from({ length: count }, (_, index) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = (fireworks ? 2.6 : 2) + Math.random() * (fireworks ? 6.2 : 6);
      return { x, y, px: x, py: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 1 + Math.random() * 3.2, life: 60 + Math.random() * 35, alpha: 1, color: colors[index % colors.length], fireworks };
    });
    function frame() {
      const bounds = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, bounds.width, bounds.height);
      particles = particles.filter(p => p.life > 0);
      for (const p of particles) {
        p.px = p.x; p.py = p.y; p.x += p.vx; p.y += p.vy; p.vx *= .984; p.vy = p.vy * .984 + (p.fireworks ? .035 : 0); p.life -= 1;
        ctx.globalAlpha = Math.min(1,p.life / 45);
        if (p.fireworks) { ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1, p.r * .7); ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.shadowBlur = 15; ctx.shadowColor = p.color; ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (particles.length) animationFrame = requestAnimationFrame(frame);
      else { ctx.clearRect(0, 0, bounds.width, bounds.height); animationFrame = null; }
    }
    frame();
  }

  function launchFirework(x, y, color) {
    const count = REDUCED_MOTION ? 22 : 58;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 2.2 + Math.random() * 5.5;
      particles.push({ x, y, px: x, py: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - Math.sin(angle * 2) * 1.3, r: 1 + Math.random() * 2.3, life: 52 + Math.random() * 38, alpha: 1, color, fireworks: true });
    }
  }

  function showResult() {
    if (spellState !== 'fireworks') return;
    spellResult.hidden = false;
    spellResult.classList.add('show-result');
    spellWord.classList.add('visible');
    schedule(() => {
      if (spellState !== 'fireworks') return;
      spellResult.classList.add('show-kicker');
      resultKicker.classList.add('visible');
    }, REDUCED_MOTION ? 250 : 900);
    schedule(() => {
      if (spellState !== 'fireworks') return;
      spellResult.classList.add('show-copy');
      spellContinue.hidden = false;
      spellState = 'result';
    }, REDUCED_MOTION ? 500 : 1550);
  }

  function startFireworks() {
    spellState = 'fireworks';
    const rect = canvas.getBoundingClientRect();
    [[.21,.30,'#ffbf60'],[.76,.28,'#ef6ea8'],[.51,.20,'#f57655'],[.34,.58,'#c1a7ff'],[.70,.58,'#ff9e55'],[.52,.45,'#94ebf0']].forEach(([x,y,color], i) => {
      schedule(() => launchFirework(rect.width * x, rect.height * y, color), i * (REDUCED_MOTION ? 160 : 330));
    });
    schedule(showResult, REDUCED_MOTION ? 850 : 1750);
  }

  function explodeOrb() {
    if (spellState !== 'imagining') return;
    spellState = 'burst';
    orbButton.classList.remove('imagining');
    orbButton.classList.add('anticipate');
    spellTransform.classList.add('concluding');
    schedule(() => {
      if (spellState !== 'burst') return;
      orbButton.classList.remove('anticipate');
      orbButton.classList.add('bursting');
      burst();
      schedule(() => { orbButton.classList.add('gone'); startFireworks(); }, REDUCED_MOTION ? 150 : 330);
    }, 300);
  }

  function beginImagination() {
    if (spellState !== 'idle') return;
    spellState = 'imagining';
    spellCast = true;
    imaginationStarted = Date.now();
    markActivity();
    orbButton.disabled = true;
    const duration = `${IMAGINATION_DURATION}ms`;
    orbButton.style.animationDuration = duration;
    orbButton.querySelectorAll('.orb, .orb-halo, .orb-progress').forEach(element => { element.style.animationDuration = duration; });
    orbButton.classList.add('imagining');
    orbInstruction.textContent = 'IMAGINÁ CÓMO CAMBIA…';
    castTimer = schedule(explodeOrb, IMAGINATION_DURATION);
  }

  imaginedButton.addEventListener('click', () => {
    if (spellState !== 'idle') return;
    spellReflect.classList.add('leaving');
    schedule(() => { spellReflect.hidden = true; spellReflect.classList.remove('leaving'); spellTransform.hidden = false; spellTransform.classList.add('entering'); schedule(() => spellTransform.classList.remove('entering'), 450); }, 240);
  });
  orbButton.addEventListener('pointerup', event => { event.preventDefault(); beginImagination(); });
  orbButton.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); beginImagination(); } });

  // A video playing is intentional activity: don't reset mid-scene.
  // All other screens reset after 60s, except the paper exercise (5min).
  setInterval(() => {
    if (current === 'cover') { idlePrompt.hidden = true; return; }
    if (current === 'video' && !video.paused && !video.ended && !missingVideo) { lastActivity = Date.now(); idlePrompt.hidden = true; return; }
    const remaining = Math.ceil(IDLE_SECONDS[current === 'paper' ? 'paper' : 'default'] - (Date.now() - lastActivity) / 1000);
    if (remaining <= 0) { showScreen('cover'); return; }
    if (remaining <= WARNING_SECONDS) { countdown.textContent = String(remaining); idlePrompt.hidden = false; }
    else idlePrompt.hidden = true;
  }, 1000);

  // Optional recovery shortcut for a volunteer at the stand.
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && current !== 'cover') showScreen('cover'); });
  showScreen('cover');
})();
