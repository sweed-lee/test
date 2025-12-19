(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const scoreValue = document.getElementById('scoreValue');
  const difficultyValue = document.getElementById('difficultyValue');

  const startButton = document.getElementById('startButton');
  const pauseButton = document.getElementById('pauseButton');
  const restartButton = document.getElementById('restartButton');

  const overlay = document.getElementById('overlay');
  const overlayButton = document.getElementById('overlayButton');
  const statusHeading = document.getElementById('statusHeading');
  const overlayMessage = document.getElementById('overlayMessage');

  const KEY_BINDINGS = {
    arrowleft: 'left',
    a: 'left',
    arrowright: 'right',
    d: 'right',
    arrowup: 'up',
    w: 'up',
    arrowdown: 'down',
    s: 'down'
  };

  const STARFIELD = Array.from({ length: 60 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2 + 0.5,
    speed: Math.random() * 30 + 15
  }));

  const createInitialState = () => ({
    running: false,
    paused: false,
    lastTime: 0,
    elapsed: 0,
    score: 0,
    difficulty: 1,
    spawnTimer: 0,
    spawnInterval: 1100,
    player: {
      size: 32,
      speed: 320,
      x: canvas.width / 2 - 16,
      y: canvas.height - 90
    },
    keys: { left: false, right: false, up: false, down: false },
    obstacles: []
  });

  let state = createInitialState();
  let animationId = null;

  function startGame() {
    state = createInitialState();
    state.running = true;
    overlay.classList.add('hidden');
    pauseButton.disabled = false;
    restartButton.disabled = false;
    startButton.disabled = true;
    pauseButton.textContent = 'Pause';
    updateOverlayMeta('Meteor Dodge', 'Dodge every meteor you can!', 'Resume');
    cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(loop);
  }

  function restartGame() {
    startGame();
  }

  function togglePause(forceResume = false) {
    if (!state.running) return;
    state.paused = forceResume ? false : !state.paused;
    pauseButton.textContent = state.paused ? 'Resume' : 'Pause';

    if (state.paused) {
      updateOverlayMeta('Paused', 'Take a breather then jump back in.', 'Resume');
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }

  function endGame() {
    state.running = false;
    pauseButton.disabled = true;
    pauseButton.textContent = 'Pause';
    startButton.disabled = false;
    restartButton.disabled = false;
    overlay.classList.remove('hidden');
    updateOverlayMeta(
      'Game Over',
      `Final score: ${Math.floor(state.score)} - tap Play to try again!`,
      'Play Again'
    );
  }

  function loop(timestamp) {
    if (!state.running) return;

    if (!state.lastTime) state.lastTime = timestamp;
    const delta = timestamp - state.lastTime;
    state.lastTime = timestamp;

    if (!state.paused) {
      update(delta);
      draw(delta);
    }

    animationId = requestAnimationFrame(loop);
  }

  function update(delta) {
    const dt = delta / 1000;
    state.elapsed += delta;
    state.difficulty = 1 + state.elapsed / 15000;
    state.score += dt * 25 * state.difficulty;

    updatePlayer(dt);
    updateObstacles(dt);

    state.spawnTimer += delta;
    const dynamicInterval = Math.max(320, state.spawnInterval / state.difficulty);
    if (state.spawnTimer > dynamicInterval) {
      spawnObstacle();
      state.spawnTimer = 0;
    }

    updateHUD();
  }

  function updatePlayer(dt) {
    const p = state.player;
    const horiz = (state.keys.right ? 1 : 0) - (state.keys.left ? 1 : 0);
    const vert = (state.keys.down ? 1 : 0) - (state.keys.up ? 1 : 0);

    p.x += horiz * p.speed * dt;
    p.y += vert * p.speed * 0.8 * dt;

    p.x = clamp(p.x, 0, canvas.width - p.size);
    p.y = clamp(p.y, canvas.height * 0.35, canvas.height - p.size - 10);
  }

  function updateObstacles(dt) {
    const difficultyBoost = state.difficulty;

    state.obstacles.forEach((obs) => {
      obs.y += obs.speed * difficultyBoost * dt;
      obs.x += Math.sin((state.elapsed + obs.phase) * obs.wobbleSpeed) * obs.wobbleMagnitude * dt;
    });

    state.obstacles = state.obstacles.filter((obs) => obs.y < canvas.height + obs.height);

    const playerRect = {
      x: state.player.x,
      y: state.player.y,
      width: state.player.size,
      height: state.player.size
    };

    for (const obs of state.obstacles) {
      if (rectsOverlap(playerRect, obs)) {
        endGame();
        break;
      }
    }
  }

  function spawnObstacle() {
    const size = randBetween(22, 54);
    state.obstacles.push({
      x: randBetween(0, canvas.width - size),
      y: -size,
      width: size,
      height: size,
      speed: randBetween(140, 260),
      hue: randBetween(10, 40),
      phase: Math.random() * Math.PI * 2,
      wobbleSpeed: randBetween(2, 5),
      wobbleMagnitude: randBetween(10, 30)
    });
  }

  function draw(delta) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawStarfield(delta);
    drawObstacles();
    drawPlayer();
  }

  function drawStarfield(delta) {
    const dt = delta / 1000;
    ctx.save();
    ctx.fillStyle = '#02040a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(126, 252, 251, 0.35)';
    STARFIELD.forEach((star) => {
      star.y += star.speed * dt;
      if (star.y > canvas.height) {
        star.y = -star.size;
        star.x = Math.random() * canvas.width;
      }
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawObstacles() {
    state.obstacles.forEach((obs) => {
      const gradient = ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y + obs.height);
      gradient.addColorStop(0, `hsl(${obs.hue}, 90%, 65%)`);
      gradient.addColorStop(1, '#ff5f6d');
      ctx.fillStyle = gradient;
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(obs.x, obs.y - 4, obs.width, 4);
    });
  }

  function drawPlayer() {
    const p = state.player;
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#7efcfb';
    ctx.fillStyle = '#7efcfb';
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeRect(0, canvas.height * 0.35, canvas.width, canvas.height * 0.65);
  }

  function updateHUD() {
    scoreValue.textContent = Math.floor(state.score).toString();
    difficultyValue.textContent = `${state.difficulty.toFixed(1)}x`;
  }

  function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function randBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function updateOverlayMeta(title, message, buttonText) {
    statusHeading.textContent = title;
    overlayMessage.textContent = message;
    overlayButton.textContent = buttonText;
  }

  function handleKeyChange(event, isDown) {
    const key = event.key.toLowerCase();
    if (KEY_BINDINGS[key]) {
      state.keys[KEY_BINDINGS[key]] = isDown;
      event.preventDefault();
    }

    if ((event.code === 'Space' || event.key === ' ') && isDown) {
      event.preventDefault();
      if (state.running) {
        if (state.paused) {
          togglePause(true);
        } else {
          togglePause();
        }
      }
    }
  }

  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', restartGame);
  pauseButton.addEventListener('click', () => {
    if (state.paused) {
      togglePause(true);
    } else {
      togglePause();
    }
  });

  overlayButton.addEventListener('click', () => {
    if (!state.running) {
      startGame();
    } else if (state.paused) {
      togglePause(true);
    }
  });

  window.addEventListener('keydown', (event) => handleKeyChange(event, true));
  window.addEventListener('keyup', (event) => handleKeyChange(event, false));
  window.addEventListener('blur', () => {
    Object.keys(state.keys).forEach((key) => {
      state.keys[key] = false;
    });
  });

  updateHUD();
})();
