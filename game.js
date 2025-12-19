const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const difficultyEl = document.getElementById('difficulty');
const statusEl = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');

const player = {
  width: 34,
  height: 34,
  speed: 260,
  x: canvas.width / 2 - 17,
  y: canvas.height - 60
};

const keys = {
  up: false,
  down: false,
  left: false,
  right: false
};

let obstacles = [];
let spawnInterval = 1200;
let spawnTimer = 0;
let difficultyTimer = 0;
let speedMultiplier = 1;
let score = 0;
let lastTimestamp = 0;
let animationId;
let gameRunning = false;
let paused = false;
let gameOver = false;

function resetGameState() {
  obstacles = [];
  spawnInterval = 1200;
  spawnTimer = 0;
  difficultyTimer = 0;
  speedMultiplier = 1;
  score = 0;
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - player.height - 20;
  paused = false;
  gameOver = false;
  updateScore();
  updateDifficulty();
  statusEl.textContent = '游戏中';
  pauseBtn.textContent = '暂停';
}

function startGame() {
  resetGameState();
  gameRunning = true;
  lastTimestamp = performance.now();
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(gameLoop);
}

function togglePause() {
  if (!gameRunning || gameOver) return;
  paused = !paused;
  statusEl.textContent = paused ? '已暂停' : '游戏中';
  pauseBtn.textContent = paused ? '继续' : '暂停';
  if (!paused) {
    lastTimestamp = performance.now();
  }
}

function restartGame() {
  if (!gameRunning) {
    startGame();
    return;
  }
  resetGameState();
}

function endGame() {
  gameRunning = false;
  gameOver = true;
  statusEl.textContent = '撞击！点击重开再来一次';
  cancelAnimationFrame(animationId);
}

function updateScore() {
  scoreEl.textContent = Math.floor(score);
}

function updateDifficulty() {
  difficultyEl.textContent = `${speedMultiplier.toFixed(2)}x`;
}

function spawnObstacle() {
  const width = 26 + Math.random() * 40;
  const height = width * (0.6 + Math.random() * 0.5);
  const x = Math.random() * (canvas.width - width);
  const speed = (160 + Math.random() * 120) * speedMultiplier;
  obstacles.push({ x, y: -height, width, height, speed });
}

function movePlayer(deltaSeconds) {
  const move = player.speed * deltaSeconds;
  if (keys.left) player.x -= move;
  if (keys.right) player.x += move;
  if (keys.up) player.y -= move;
  if (keys.down) player.y += move;

  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
}

function updateObstacles(deltaSeconds) {
  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = obstacles[i];
    obstacle.y += obstacle.speed * deltaSeconds;

    if (obstacle.y > canvas.height) {
      obstacles.splice(i, 1);
      score += 5;
      continue;
    }

    if (
      player.x < obstacle.x + obstacle.width &&
      player.x + player.width > obstacle.x &&
      player.y < obstacle.y + obstacle.height &&
      player.y + player.height > obstacle.y
    ) {
      endGame();
      return;
    }
  }
}

function step(delta) {
  if (paused || gameOver) return;

  const deltaSeconds = delta / 1000;
  spawnTimer += delta;
  difficultyTimer += delta;
  score += deltaSeconds * 12;

  if (spawnTimer >= spawnInterval) {
    spawnObstacle();
    spawnTimer = 0;
  }

  if (difficultyTimer >= 5000) {
    speedMultiplier = Math.min(3.5, speedMultiplier + 0.12);
    spawnInterval = Math.max(450, spawnInterval - 70);
    difficultyTimer = 0;
    updateDifficulty();
  }

  movePlayer(deltaSeconds);
  updateObstacles(deltaSeconds);
  updateScore();
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  const step = 32;
  for (let x = 0; x < canvas.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#08162b');
  gradient.addColorStop(1, '#03070f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();

  ctx.fillStyle = '#64ffda';
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#64ffda';
  ctx.fillRect(player.x, player.y, player.width, player.height);
  ctx.shadowBlur = 0;

  obstacles.forEach((obstacle) => {
    ctx.fillStyle = '#ff5c8d';
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  });
}

function gameLoop(timestamp) {
  if (!gameRunning) return;
  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  step(delta);
  render();
  animationId = requestAnimationFrame(gameLoop);
}

const keyMap = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right'
};

document.addEventListener('keydown', (event) => {
  const dir = keyMap[event.key];
  if (dir) {
    event.preventDefault();
    keys[dir] = true;
  }
});

document.addEventListener('keyup', (event) => {
  const dir = keyMap[event.key];
  if (dir) {
    event.preventDefault();
    keys[dir] = false;
  }
});

startBtn.addEventListener('click', () => {
  startGame();
});

pauseBtn.addEventListener('click', () => {
  togglePause();
});

restartBtn.addEventListener('click', () => {
  restartGame();
});

statusEl.textContent = '点击开始进行游戏';
