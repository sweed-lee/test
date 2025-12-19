const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("statusText");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");

const keysPressed = new Set();
const CONTROL_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "KeyA",
  "KeyD",
  "KeyW",
  "KeyS",
  "Space",
]);

const state = {
  running: false,
  gameOver: false,
  statusText: "等待开始",
  score: 0,
  elapsed: 0,
  obstacles: [],
  player: {
    x: canvas.width / 2 - 20,
    y: canvas.height - 70,
    width: 40,
    height: 40,
    speed: 320, // px per second
  },
  lastSpawn: 0,
  spawnIntervalMs: 1000,
};

let lastTimestamp = 0;

function setStatus(text) {
  state.statusText = text;
  statusEl.textContent = text;
}

function resetGame() {
  state.running = false;
  state.gameOver = false;
  state.score = 0;
  state.elapsed = 0;
  state.obstacles = [];
  state.spawnIntervalMs = 1000;
  state.lastSpawn = 0;
  state.player.x = canvas.width / 2 - state.player.width / 2;
  state.player.y = canvas.height - 70;
  setStatus("等待开始");
  updateScoreboard();
  drawScene();
}

function startGame() {
  if (state.gameOver) {
    resetGame();
  }
  if (!state.running) {
    state.running = true;
    setStatus("运行中");
  }
}

function pauseGame() {
  if (state.running) {
    state.running = false;
    setStatus("已暂停");
  }
}

function restartGame() {
  resetGame();
  state.running = true;
  setStatus("运行中");
}

function updateScoreboard() {
  scoreEl.textContent = Math.floor(state.score).toString();
}

function spawnObstacle(currentSpeed) {
  const width = 30 + Math.random() * 60;
  const height = 20 + Math.random() * 30;
  const x = Math.random() * (canvas.width - width);
  const baseSpeed = currentSpeed * (0.85 + Math.random() * 0.4);
  state.obstacles.push({ x, y: -height, width, height, speed: baseSpeed });
}

function handleSpawning(delta, timestamp) {
  const difficultyBoost = Math.min(1, state.elapsed / 60);
  state.spawnIntervalMs = Math.max(240, 1000 - state.elapsed * 25);

  if (timestamp - state.lastSpawn > state.spawnIntervalMs) {
    const fallSpeed = 120 + state.elapsed * (90 + 60 * difficultyBoost);
    spawnObstacle(fallSpeed);
    state.lastSpawn = timestamp;
  }
}

function updatePlayer(delta) {
  const move = state.player.speed * delta;
  if (keysPressed.has("ArrowLeft") || keysPressed.has("KeyA")) {
    state.player.x -= move;
  }
  if (keysPressed.has("ArrowRight") || keysPressed.has("KeyD")) {
    state.player.x += move;
  }

  // clamp within canvas
  state.player.x = Math.max(0, Math.min(canvas.width - state.player.width, state.player.x));
}

function updateObstacles(delta) {
  state.obstacles.forEach((obs) => {
    obs.y += obs.speed * delta;
  });
  state.obstacles = state.obstacles.filter((obs) => obs.y < canvas.height + obs.height);
}

function detectCollisions() {
  for (const obs of state.obstacles) {
    const intersects =
      state.player.x < obs.x + obs.width &&
      state.player.x + state.player.width > obs.x &&
      state.player.y < obs.y + obs.height &&
      state.player.y + state.player.height > obs.y;

    if (intersects) {
      state.gameOver = true;
      state.running = false;
      setStatus("撞击！按重开再来");
      break;
    }
  }
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // background grid
  ctx.fillStyle = "#0f1b33";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // player
  ctx.fillStyle = "#2ec4b6";
  ctx.fillRect(state.player.x, state.player.y, state.player.width, state.player.height);

  // obstacles
  ctx.fillStyle = "#e63946";
  state.obstacles.forEach((obs) => {
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
  });

  if (!state.running && !state.gameOver) {
    ctx.fillStyle = "rgba(15, 27, 51, 0.65)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f1faee";
    ctx.font = "24px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("点击开始或按空格开始游戏", canvas.width / 2, canvas.height / 2);
  }

  if (state.gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f1faee";
    ctx.font = "32px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("游戏结束", canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = "20px 'Segoe UI', sans-serif";
    ctx.fillText("按重开重新开始", canvas.width / 2, canvas.height / 2 + 26);
  }
}

function gameLoop(timestamp) {
  const delta = (timestamp - lastTimestamp) / 1000 || 0;
  lastTimestamp = timestamp;

  if (state.running && !state.gameOver) {
    state.elapsed += delta;
    state.score += delta * 10;
    handleSpawning(delta, timestamp);
    updatePlayer(delta);
    updateObstacles(delta);
    detectCollisions();
    updateScoreboard();
  }

  drawScene();
  requestAnimationFrame(gameLoop);
}

function handleKeyDown(event) {
  if (!CONTROL_KEYS.has(event.code)) return;
  event.preventDefault();
  keysPressed.add(event.code);

  if (event.code === "Space") {
    if (!state.running && !state.gameOver) {
      startGame();
    } else if (state.running) {
      pauseGame();
    } else if (state.gameOver) {
      restartGame();
    }
  }
}

function handleKeyUp(event) {
  if (!CONTROL_KEYS.has(event.code)) return;
  event.preventDefault();
  keysPressed.delete(event.code);
}

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("blur", () => {
  if (state.running) {
    pauseGame();
  }
});

startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", pauseGame);
restartBtn.addEventListener("click", restartGame);

resetGame();
requestAnimationFrame(gameLoop);
