const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const difficultyEl = document.getElementById("difficulty");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");

const keys = new Set();
let lastTime = 0;
let animationFrame = null;

const gameState = {
  status: "ready", // ready | running | paused | over
  score: 0,
  elapsed: 0,
  difficultyMultiplier: 1,
  player: null,
  obstacles: [],
  spawnTimer: 0,
};

const CONFIG = {
  playerSize: 32,
  playerSpeed: 240,
  baseSpawnInterval: 1,
  baseObstacleSpeed: 90,
};

function initGame() {
  gameState.status = "ready";
  gameState.score = 0;
  gameState.elapsed = 0;
  gameState.difficultyMultiplier = 1;
  gameState.obstacles = [];
  gameState.spawnTimer = 0;
  gameState.player = {
    x: canvas.width / 2 - CONFIG.playerSize / 2,
    y: canvas.height - CONFIG.playerSize * 1.8,
    size: CONFIG.playerSize,
    color: "#3ddc97",
  };
  updateHUD();
  draw();
}

function updateHUD() {
  scoreEl.textContent = Math.floor(gameState.score);
  difficultyEl.textContent = `${gameState.difficultyMultiplier.toFixed(1)}x`;
  statusEl.textContent =
    gameState.status === "ready"
      ? "准备中"
      : gameState.status === "running"
      ? "进行中"
      : gameState.status === "paused"
      ? "暂停"
      : "游戏结束";

  startBtn.disabled = gameState.status === "running";
  pauseBtn.disabled = gameState.status !== "running";
}

function spawnObstacle() {
  const width = 30 + Math.random() * 40;
  const height = 15 + Math.random() * 25;
  const x = Math.random() * (canvas.width - width);
  const speed = CONFIG.baseObstacleSpeed * gameState.difficultyMultiplier;
  gameState.obstacles.push({ x, y: -height, width, height, speed, color: "#ff4d6d" });
}

function update(delta) {
  if (gameState.status !== "running") return;

  gameState.elapsed += delta;
  gameState.score += delta * 20;
  gameState.difficultyMultiplier = 1 + gameState.elapsed / 15;

  handlePlayerMovement(delta);

  gameState.spawnTimer += delta;
  const spawnInterval = CONFIG.baseSpawnInterval / gameState.difficultyMultiplier;
  if (gameState.spawnTimer >= spawnInterval) {
    spawnObstacle();
    gameState.spawnTimer = 0;
  }

  moveObstacles(delta);
  detectCollisions();
  removeOffscreenObstacles();
  updateHUD();
}

function handlePlayerMovement(delta) {
  const player = gameState.player;
  if (!player) return;
  let dx = 0;
  let dy = 0;
  if (keys.has("ArrowLeft") || keys.has("a")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("d")) dx += 1;
  if (keys.has("ArrowUp") || keys.has("w")) dy -= 1;
  if (keys.has("ArrowDown") || keys.has("s")) dy += 1;

  if (dx !== 0 && dy !== 0) {
    const invDiag = 1 / Math.sqrt(2);
    dx *= invDiag;
    dy *= invDiag;
  }

  player.x += dx * CONFIG.playerSpeed * delta;
  player.y += dy * CONFIG.playerSpeed * delta;

  player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));
}

function moveObstacles(delta) {
  const boost = 1 + gameState.score / 500;
  gameState.obstacles.forEach((o) => {
    o.y += o.speed * delta * boost;
  });
}

function detectCollisions() {
  const player = gameState.player;
  for (const obstacle of gameState.obstacles) {
    if (rectsOverlap(player, obstacle)) {
      gameOver();
      break;
    }
  }
}

function removeOffscreenObstacles() {
  gameState.obstacles = gameState.obstacles.filter((o) => o.y < canvas.height + o.height);
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.size > b.x &&
    a.y < b.y + b.height &&
    a.y + a.size > b.y
  );
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackgroundGrid();
  drawPlayer();
  drawObstacles();

  if (gameState.status === "ready") {
    drawOverlay("按下“开始”按钮开始游戏");
  } else if (gameState.status === "paused") {
    drawOverlay("暂停中");
  } else if (gameState.status === "over") {
    drawOverlay("失败！点击重开重试");
  }
}

function drawBackgroundGrid() {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawPlayer() {
  const player = gameState.player;
  if (!player) return;
  ctx.fillStyle = player.color;
  ctx.shadowColor = "rgba(61, 220, 151, 0.7)";
  ctx.shadowBlur = 15;
  ctx.fillRect(player.x, player.y, player.size, player.size);
  ctx.shadowBlur = 0;
}

function drawObstacles() {
  ctx.fillStyle = "#ff4d6d";
  gameState.obstacles.forEach((o) => {
    ctx.fillRect(o.x, o.y, o.width, o.height);
  });
}

function drawOverlay(text) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(0, canvas.height / 2 - 60, canvas.width, 120);
  ctx.fillStyle = "#ffffff";
  ctx.font = "24px/1 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 8);
}

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const delta = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  update(delta);
  draw();

  animationFrame = requestAnimationFrame(gameLoop);
}

function startGame() {
  if (gameState.status === "running") return;
  if (gameState.status === "ready" || gameState.status === "over") {
    initGame();
    gameState.status = "running";
  } else if (gameState.status === "paused") {
    gameState.status = "running";
  }
  updateHUD();
  lastTime = 0;
  if (!animationFrame) {
    animationFrame = requestAnimationFrame(gameLoop);
  }
}

function pauseGame() {
  if (gameState.status !== "running") return;
  gameState.status = "paused";
  updateHUD();
}

function restartGame() {
  initGame();
  gameState.status = "running";
  updateHUD();
  lastTime = 0;
}

function gameOver() {
  gameState.status = "over";
  updateHUD();
}

startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", pauseGame);
restartBtn.addEventListener("click", restartGame);

document.addEventListener("visibilitychange", () => {
  if (document.hidden && gameState.status === "running") {
    pauseGame();
  }
});

document.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
    event.preventDefault();
  }
  keys.add(event.key);
  keys.add(event.key.toLowerCase());
  if (event.key === " " && gameState.status === "running") {
    pauseGame();
  } else if (event.key === " " && gameState.status !== "running") {
    startGame();
  }
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
  keys.delete(event.key);
});

initGame();
animationFrame = requestAnimationFrame(gameLoop);
