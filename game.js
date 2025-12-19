const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const stateEl = document.getElementById('state');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');

const player = {
  x: canvas.width / 2 - 18,
  y: canvas.height - 80,
  size: 36,
  speed: 260,
  color: '#38bdf8'
};

let obstacles = [];
let keys = new Set();
let gameState = 'idle'; // idle, playing, paused, over
let lastTime = 0;
let score = 0;
let elapsed = 0;
let spawnTimer = 0;

const config = {
  baseSpawnInterval: 0.9,
  minSpawnInterval: 0.25,
  baseObstacleSpeed: 120,
  speedRamp: 32,
  spawnRamp: 0.03
};

function setState(newState) {
  gameState = newState;
  const textMap = {
    idle: '准备',
    playing: '游戏中',
    paused: '暂停',
    over: '失败'
  };
  stateEl.textContent = textMap[newState] || newState;
  updatePauseButtonLabel();
}

function resetGame() {
  player.x = canvas.width / 2 - player.size / 2;
  player.y = canvas.height - 90;
  obstacles = [];
  keys = new Set();
  score = 0;
  elapsed = 0;
  spawnTimer = 0;
  setState('idle');
  scoreEl.textContent = '0';
}

function startGame() {
  if (gameState === 'playing') return;
  if (gameState === 'paused') {
    resumeGame();
    return;
  }
  if (gameState === 'over' || gameState === 'idle') {
    resetGame();
  }
  setState('playing');
}

function pauseGame() {
  if (gameState !== 'playing') return;
  setState('paused');
}

function resumeGame() {
  if (gameState !== 'paused') return;
  setState('playing');
}

function restartGame() {
  resetGame();
  setState('playing');
}

function spawnObstacle() {
  const width = 30 + Math.random() * 50;
  const height = 20 + Math.random() * 50;
  const x = Math.random() * (canvas.width - width);
  const speedBoost = elapsed * config.speedRamp;
  const speed = config.baseObstacleSpeed + Math.random() * 60 + speedBoost;
  obstacles.push({ x, y: -height, width, height, speed });
}

function update(delta) {
  if (gameState !== 'playing') return;

  elapsed += delta;
  score += delta * 15;
  scoreEl.textContent = Math.floor(score).toString();

  const currentSpawnInterval = Math.max(
    config.minSpawnInterval,
    config.baseSpawnInterval - elapsed * config.spawnRamp
  );

  spawnTimer -= delta;
  if (spawnTimer <= 0) {
    spawnObstacle();
    spawnTimer = currentSpawnInterval;
  }

  updatePlayer(delta);
  updateObstacles(delta);
  checkCollisions();
}

function updatePlayer(delta) {
  let dx = 0;
  let dy = 0;
  if (keys.has('ArrowLeft') || keys.has('a')) dx -= 1;
  if (keys.has('ArrowRight') || keys.has('d')) dx += 1;
  if (keys.has('ArrowUp') || keys.has('w')) dy -= 1;
  if (keys.has('ArrowDown') || keys.has('s')) dy += 1;

  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy) || 1;
    dx /= length;
    dy /= length;
    player.x += dx * player.speed * delta;
    player.y += dy * player.speed * delta;
  }

  player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));
}

function updateObstacles(delta) {
  for (const block of obstacles) {
    block.y += block.speed * delta;
  }
  obstacles = obstacles.filter((block) => block.y <= canvas.height + block.height);
}

function checkCollisions() {
  for (const block of obstacles) {
    const collide = !(
      player.x + player.size < block.x ||
      player.x > block.x + block.width ||
      player.y + player.size < block.y ||
      player.y > block.y + block.height
    );
    if (collide) {
      setState('over');
      return;
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // background grid
  ctx.save();
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.restore();

  // player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.size, player.size);

  // obstacles
  ctx.fillStyle = '#f87171';
  for (const block of obstacles) {
    ctx.fillRect(block.x, block.y, block.width, block.height);
  }

  if (gameState === 'idle') {
    drawMessage('按「开始」或空格开局');
  } else if (gameState === 'paused') {
    drawMessage('暂停中，按空格继续');
  } else if (gameState === 'over') {
    drawMessage('失败！按重开或空格再来');
  }
}

function drawMessage(text) {
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
  ctx.fillRect(0, canvas.height / 2 - 40, canvas.width, 80);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '24px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 8);
  ctx.restore();
}

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const delta = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  update(delta);
  draw();
  requestAnimationFrame(gameLoop);
}

function handleKeydown(event) {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
    event.preventDefault();
  }
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (key === ' ') {
    if (gameState === 'idle') {
      startGame();
    } else if (gameState === 'playing') {
      pauseGame();
    } else if (gameState === 'paused') {
      resumeGame();
    } else if (gameState === 'over') {
      restartGame();
    }
  }
  keys.add(key);
}

function handleKeyup(event) {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.delete(key);
}

window.addEventListener('keydown', handleKeydown);
window.addEventListener('keyup', handleKeyup);

startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', () => {
  if (gameState === 'playing') {
    pauseGame();
  } else if (gameState === 'paused') {
    resumeGame();
  }
});
restartBtn.addEventListener('click', restartGame);

function updatePauseButtonLabel() {
  pauseBtn.textContent = gameState === 'paused' ? '继续' : '暂停';
}

resetGame();
requestAnimationFrame(gameLoop);
