(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const levelEl = document.getElementById("level");
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const restartBtn = document.getElementById("restartBtn");

  const config = {
    playerWidth: 70,
    playerHeight: 18,
    playerSpeed: 420, // px per second
    baseSpawnInterval: 1200,
    minSpawnInterval: 320,
    difficultyRamp: 0.00018, // controls how fast difficulty accelerates
    maxObstacleSpeed: 420,
    minObstacleSpeed: 210,
  };

  const state = {
    player: createPlayer(),
    obstacles: [],
    keys: new Set(),
    running: false,
    paused: false,
    isGameOver: false,
    frameId: null,
    lastTimestamp: 0,
    elapsed: 0,
    spawnTimer: 0,
    score: 0,
    level: 1,
  };

  function createPlayer() {
    return {
      x: canvas.width / 2 - config.playerWidth / 2,
      y: canvas.height - config.playerHeight - 25,
      width: config.playerWidth,
      height: config.playerHeight,
      color: "#38bdf8",
    };
  }

  function resetGame() {
    state.player = createPlayer();
    state.obstacles = [];
    state.elapsed = 0;
    state.spawnTimer = 0;
    state.score = 0;
    state.level = 1;
    state.running = false;
    state.paused = false;
    state.isGameOver = false;
    state.lastTimestamp = performance.now();
    updateStats();
    render(); // draw idle state
  }

  function startGame() {
    if (state.running && !state.paused) {
      return;
    }
    if (state.isGameOver) {
      resetGame();
    }
    state.running = true;
    state.paused = false;
    state.lastTimestamp = performance.now();
    if (!state.frameId) {
      state.frameId = requestAnimationFrame(loop);
    }
    updateUiLabels();
  }

  function pauseOrResume() {
    if (!state.running || state.isGameOver) {
      return;
    }
    state.paused = !state.paused;
    updateUiLabels();
  }

  function restartGame() {
    resetGame();
    startGame();
  }

  function updateUiLabels() {
    pauseBtn.textContent = state.paused ? "继续" : "暂停";
    startBtn.textContent = state.running && !state.paused ? "进行中" : "开始";
  }

  function loop(timestamp) {
    const delta = timestamp - state.lastTimestamp;
    state.lastTimestamp = timestamp;

    if (!state.paused && !state.isGameOver) {
      update(delta);
    }

    render();

    if (!state.isGameOver) {
      state.frameId = requestAnimationFrame(loop);
    } else {
      cancelAnimationFrame(state.frameId);
      state.frameId = null;
      state.running = false;
    }
  }

  function update(delta) {
    const seconds = delta / 1000;
    handleMovement(seconds);
    updateObstacles(delta);
    state.elapsed += delta;
    state.score = Math.floor(state.elapsed / 120);
    state.level = Math.min(9, 1 + Math.floor(state.elapsed / 4000));
    updateStats();
  }

  function handleMovement(dtSeconds) {
    const velocity = config.playerSpeed * dtSeconds;
    if (state.keys.has("ArrowLeft") || state.keys.has("KeyA")) {
      state.player.x -= velocity;
    }
    if (state.keys.has("ArrowRight") || state.keys.has("KeyD")) {
      state.player.x += velocity;
    }
    state.player.x = Math.max(14, Math.min(state.player.x, canvas.width - state.player.width - 14));
  }

  function updateObstacles(delta) {
    const difficultyBoost = 1 + state.elapsed * config.difficultyRamp;
    const spawnInterval = Math.max(
      config.minSpawnInterval,
      config.baseSpawnInterval / difficultyBoost
    );

    state.spawnTimer += delta;
    if (state.spawnTimer >= spawnInterval) {
      state.spawnTimer = 0;
      spawnObstacle(difficultyBoost);
    }

    for (let i = state.obstacles.length - 1; i >= 0; i -= 1) {
      const obstacle = state.obstacles[i];
      obstacle.y += obstacle.speed * (delta / 1000);

      if (checkCollision(state.player, obstacle)) {
        onGameOver();
        return;
      }

      if (obstacle.y - obstacle.height > canvas.height) {
        state.obstacles.splice(i, 1);
      }
    }
  }

  function spawnObstacle(multiplier) {
    const width = randomBetween(40, 120);
    const x = randomBetween(10, canvas.width - width - 10);
    const speed =
      randomBetween(config.minObstacleSpeed, config.maxObstacleSpeed) * Math.min(multiplier, 3.2);
    const hue = Math.floor(randomBetween(180, 230));
    state.obstacles.push({
      x,
      y: -30,
      width,
      height: randomBetween(14, 26),
      speed,
      color: `hsl(${hue}deg 90% 60%)`,
    });
  }

  function checkCollision(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  function onGameOver() {
    state.isGameOver = true;
    updateStats();
  }

  function updateStats() {
    scoreEl.textContent = state.score.toString();
    levelEl.textContent = state.level.toString();
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();

    // player
    drawRoundedRect(state.player, 8);

    // obstacles
    state.obstacles.forEach((ob) => drawRoundedRect(ob, 6));

    drawOverlayMessages();
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#0b1221");
    gradient.addColorStop(1, "#01030a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gridSize = 32;
    ctx.strokeStyle = "rgba(94, 234, 212, 0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, canvas.height);
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(canvas.width, y + 0.5);
    }
    ctx.stroke();
  }

  function drawRoundedRect(obj, radius) {
    ctx.fillStyle = obj.color || "#facc15";
    const { x, y, width, height } = obj;
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  function drawOverlayMessages() {
    ctx.fillStyle = "rgba(2, 6, 23, 0.65)";
    ctx.font = "28px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (state.isGameOver) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
      ctx.fillRect(canvas.width / 2 - 220, canvas.height / 2 - 80, 440, 160);
      ctx.fillStyle = "#f87171";
      ctx.font = "bold 40px 'Segoe UI', sans-serif";
      ctx.fillText("游戏结束", canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "24px 'Segoe UI', sans-serif";
      ctx.fillText("按 R 重开，或点击“重开”按钮", canvas.width / 2, canvas.height / 2 + 32);
      return;
    }

    if (!state.running) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.fillRect(canvas.width / 2 - 240, canvas.height / 2 - 90, 480, 180);
      ctx.fillStyle = "#5eead4";
      ctx.font = "bold 36px 'Segoe UI', sans-serif";
      ctx.fillText("按空格或点击开始", canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "22px 'Segoe UI', sans-serif";
      ctx.fillText("躲避彩色方块，时间越久得分越高", canvas.width / 2, canvas.height / 2 + 40);
    } else if (state.paused) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
      ctx.fillRect(canvas.width / 2 - 180, canvas.height / 2 - 70, 360, 140);
      ctx.fillStyle = "#fde68a";
      ctx.font = "bold 36px 'Segoe UI', sans-serif";
      ctx.fillText("暂停中", canvas.width / 2, canvas.height / 2 - 8);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "22px 'Segoe UI', sans-serif";
      ctx.fillText("按 P 继续游戏", canvas.width / 2, canvas.height / 2 + 32);
    }
  }

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function handleKeyDown(event) {
    const { code } = event;
    if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space"].includes(code)) {
      event.preventDefault();
    }

    if (code === "Space") {
      startGame();
    } else if (code === "KeyP") {
      pauseOrResume();
    } else if (code === "KeyR") {
      restartGame();
    }

    state.keys.add(code);
  }

  function handleKeyUp(event) {
    state.keys.delete(event.code);
  }

  function bindEvents() {
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    startBtn.addEventListener("click", startGame);
    pauseBtn.addEventListener("click", pauseOrResume);
    restartBtn.addEventListener("click", restartGame);
    window.addEventListener("blur", () => {
      if (state.running && !state.paused && !state.isGameOver) {
        state.paused = true;
        updateUiLabels();
      }
    });
  }

  bindEvents();
  resetGame();
})();
