const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.querySelector('#gameOverlay');
const overlayKicker = document.querySelector('#overlayKicker');
const overlayTitle = document.querySelector('#overlayTitle');
const overlayMessage = document.querySelector('#overlayMessage');
const startButton = document.querySelector('#startButton');
const scoreElement = document.querySelector('#score');
const highScoreElement = document.querySelector('#highScore');
const levelElement = document.querySelector('#level');
const statusText = document.querySelector('#statusText');
const playerSprite = document.querySelector('#playerSprite');
const chaserSprite = document.querySelector('#chaserSprite');

const WORLD = { width: 1200, height: 520, groundY: 404 };
const player = { x: 145, y: WORLD.groundY - 82, width: 66, height: 82, velocityY: 0, grounded: true };
const chaser = { x: 57, y: WORLD.groundY - 82, width: player.width, height: player.height, velocityY: 0, grounded: true };
let obstacles = [];
let particles = [];
let running = false;
let paused = false;
let gameOver = false;
let catching = false;
let catchStartedAt = 0;
let catchStartX = 0;
let runElapsed = 0;
const catchDuration = 850;
const maxChaserLag = 150;
let score = 0;
let highScore = Number(localStorage.getItem('neonRunnerBest') || 0);
let speed = 7;
let spawnTimer = 0;
let nextSpawn = 92;
let lastTime = 0;
let animationFrame;

function formatScore(value) { return Math.floor(value).toString().padStart(6, '0'); }
function updateHud() {
  scoreElement.textContent = formatScore(score);
  highScoreElement.textContent = formatScore(Math.max(highScore, score));
  levelElement.textContent = String(Math.min(99, Math.floor(score / 500) + 1)).padStart(2, '0');
}

function setOverlay(mode) {
  overlay.classList.remove('is-hidden');
  if (mode === 'ready') {
    overlayKicker.textContent = '城市邊界・疾速穿越'; overlayTitle.textContent = '準備開跑？';
    overlayMessage.textContent = '按下 Space 或 W 跳過沿途障礙，挑戰更遠的距離。'; startButton.querySelector('span').textContent = '開始跑酷';
  } else {
    overlayKicker.textContent = '失誤被追上・下次跑更遠'; overlayTitle.textContent = '被追上了！';
    overlayMessage.textContent = `本次跑過 ${formatScore(score)} 公尺。重新出發，別讓追逐者追上你。`; startButton.querySelector('span').textContent = '重新出發';
  }
}

function resetGame() {
  player.y = WORLD.groundY - player.height; player.velocityY = 0; player.grounded = true;
  chaser.x = player.x - chaser.width - 22; chaser.y = WORLD.groundY - chaser.height; chaser.velocityY = 0; chaser.grounded = true;
  runElapsed = 0;
  obstacles = []; particles = []; score = 0; speed = 7; spawnTimer = 0; nextSpawn = 92;
  running = true; paused = false; gameOver = false; catching = false; overlay.classList.add('is-hidden');
  statusText.textContent = '高速奔跑'; updateHud();
}

function jump() {
  if (!running || paused || gameOver) return;
  if (player.grounded) {
    player.velocityY = -17.2; player.grounded = false;
    for (let i = 0; i < 7; i += 1) particles.push({ x: player.x + 10, y: WORLD.groundY - 5, vx: -Math.random() * 3, vy: -Math.random() * 2, life: 1, size: Math.random() * 3 + 1 });
  }
}

function spawnObstacle() {
  const tall = Math.random() > 0.46;
  const width = tall ? 32 + Math.random() * 11 : 46 + Math.random() * 18;
  const height = tall ? 61 + Math.random() * 38 : 31 + Math.random() * 19;
  obstacles.push({ x: WORLD.width + 25, y: WORLD.groundY - height, width, height, tall, phase: Math.random() * 10 });
  nextSpawn = Math.max(54, 108 - speed * 3 + Math.random() * 58);
}

function update(delta) {
  if (!running || paused || gameOver) return;
  const frame = Math.min(delta / 16.67, 2);
  runElapsed += delta;
  score += delta * 0.012 * speed;
  speed = Math.min(15, 7 + score / 1150);
  chaser.x = player.x - chaser.width - 22 - Math.min(maxChaserLag, runElapsed / 250);
  spawnTimer += frame;
  if (spawnTimer > nextSpawn) { spawnTimer = 0; spawnObstacle(); }

  player.velocityY += 0.84 * frame;
  player.y += player.velocityY * frame;
  if (player.y >= WORLD.groundY - player.height) { player.y = WORLD.groundY - player.height; player.velocityY = 0; player.grounded = true; }

  obstacles.forEach((obstacle) => { obstacle.x -= speed * frame; obstacle.phase += 0.08 * frame; });
  obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.width > -30);

  const nextChaserObstacle = obstacles.find((obstacle) => obstacle.x + obstacle.width > chaser.x + 8);
  if (chaser.grounded && nextChaserObstacle && nextChaserObstacle.x < chaser.x + chaser.width + speed * 14) {
    chaser.velocityY = -17.2;
    chaser.grounded = false;
  }
  chaser.velocityY += 0.84 * frame;
  chaser.y += chaser.velocityY * frame;
  if (chaser.y >= WORLD.groundY - chaser.height) {
    chaser.y = WORLD.groundY - chaser.height;
    chaser.velocityY = 0;
    chaser.grounded = true;
  }

  particles.forEach((particle) => { particle.x += particle.vx * frame; particle.y += particle.vy * frame; particle.vy += 0.15 * frame; particle.life -= 0.035 * frame; });
  particles = particles.filter((particle) => particle.life > 0);

  const playerBox = { x: player.x + 12, y: player.y + 7, width: player.width - 24, height: player.height - 11 };
  if (obstacles.some((obstacle) => playerBox.x < obstacle.x + obstacle.width - 5 && playerBox.x + playerBox.width > obstacle.x + 5 && playerBox.y < obstacle.y + obstacle.height && playerBox.y + playerBox.height > obstacle.y + 4)) endGame();
  updateHud();
}

function endGame() {
  if (catching || gameOver) return;
  running = false;
  catching = true;
  catchStartedAt = performance.now();
  catchStartX = chaser.x;
  statusText.textContent = '即將被追上';
}

function finishCatch() {
  catching = false;
  gameOver = true;
  highScore = Math.max(highScore, Math.floor(score));
  localStorage.setItem('neonRunnerBest', highScore); statusText.textContent = '被追上了'; setOverlay('gameover');
  for (let i = 0; i < 22; i += 1) particles.push({ x: player.x + player.width / 2, y: player.y + player.height / 2, vx: (Math.random() - .5) * 8, vy: (Math.random() - .5) * 8, life: 1, size: Math.random() * 4 + 1 });
  updateHud();
}

function drawCityLayer(time, baseY, segmentWidth, color, parallax, count, detailColor) {
  const offset = (time * speed * parallax) % segmentWidth;
  const firstBuilding = Math.floor((time * speed * parallax) / segmentWidth);
  ctx.fillStyle = color;
  for (let i = -1; i < count; i += 1) {
    const seed = i + firstBuilding;
    const x = i * segmentWidth - offset;
    const width = segmentWidth * (0.48 + ((seed * 17 % 5 + 5) % 5) * 0.055);
    const height = 55 + ((seed * 37 % 7 + 7) % 7) * 13;
    const roofY = baseY - height;
    ctx.fillRect(x, roofY, width, height);
    ctx.fillRect(x + width * 0.14, roofY - 7, width * 0.35, 7);
    if (i % 3 === 0) {
      ctx.fillRect(x + width * 0.68, roofY - 15, 2, 15);
      ctx.fillRect(x + width * 0.65, roofY - 15, 8, 2);
    }
    if (detailColor) {
      ctx.fillStyle = detailColor;
      for (let row = 0; row < 3; row += 1) {
        for (let column = 0; column < 3; column += 1) {
          ctx.fillRect(x + 9 + column * 15, roofY + 13 + row * 16, 5, 7);
        }
      }
      ctx.fillStyle = color;
    }
  }
}

function drawBackground(time) {
  const sky = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  sky.addColorStop(0, '#d7dcde');
  sky.addColorStop(0.68, '#eef0ef');
  sky.addColorStop(1, '#b9bec0');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  const sun = ctx.createRadialGradient(905, 128, 8, 905, 128, 180);
  sun.addColorStop(0, 'rgba(255,255,255,.82)');
  sun.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(905, 128, 180, 0, Math.PI * 2);
  ctx.fill();

  drawCityLayer(time, 331, 118, '#c2c7c8', 0.008, 13, 'rgba(244,246,245,.5)');
  drawCityLayer(time, 366, 154, '#7f8587', 0.008, 10, 'rgba(231,234,233,.28)');
  drawCityLayer(time, WORLD.groundY, 190, '#34393b', 0.008, 9);

  ctx.fillStyle = '#282d2f';
  ctx.fillRect(0, WORLD.groundY, WORLD.width, WORLD.height - WORLD.groundY);
  ctx.fillStyle = '#f1f2f0';
  ctx.fillRect(0, WORLD.groundY, WORLD.width, 3);
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  const dashOffset = (time * speed * 0.2) % 150;
  for (let i = -1; i < 10; i += 1) {
    ctx.fillRect(i * 150 - dashOffset, WORLD.groundY + 76, 78, 4);
  }
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.fillRect(0, WORLD.groundY + 12, WORLD.width, 1);
}

function drawPlayer() {
  playerSprite.style.left = `${player.x / WORLD.width * 100}%`;
  playerSprite.style.top = `${player.y / WORLD.height * 100}%`;
  playerSprite.style.width = `${player.width / WORLD.width * 100}%`;
  playerSprite.style.height = `${player.height / WORLD.height * 100}%`;
}

function drawChaser(time) {
  if (catching) {
    const progress = Math.min(1, (time - catchStartedAt) / catchDuration);
    const easedProgress = progress * progress;
    const catchTargetX = player.x - chaser.width - 4;
    chaser.x = catchStartX + (catchTargetX - catchStartX) * easedProgress;
    if (progress === 1) finishCatch();
  }
  chaserSprite.style.left = `${chaser.x / WORLD.width * 100}%`;
  chaserSprite.style.top = `${chaser.y / WORLD.height * 100}%`;
  chaserSprite.style.width = `${chaser.width / WORLD.width * 100}%`;
  chaserSprite.style.height = `${chaser.height / WORLD.height * 100}%`;
}

function drawObstacle(obstacle) {
  ctx.save();
  ctx.translate(obstacle.x, obstacle.y);
  ctx.fillStyle = '#24292b';
  ctx.strokeStyle = '#24292b';
  ctx.lineWidth = 3;
  if (obstacle.tall) {
    ctx.fillRect(obstacle.width * 0.38, 0, obstacle.width * 0.24, obstacle.height);
    ctx.fillRect(0, obstacle.height * 0.16, obstacle.width, 8);
    ctx.fillStyle = '#e1e4e5';
    ctx.fillRect(obstacle.width * 0.38, obstacle.height * 0.26, obstacle.width * 0.24, 8);
    ctx.fillRect(0, obstacle.height * 0.16, obstacle.width, 8);
  } else {
    ctx.fillRect(0, obstacle.height * 0.12, obstacle.width, obstacle.height * 0.88);
    ctx.fillStyle = '#e1e4e5';
    ctx.fillRect(0, obstacle.height * 0.12, obstacle.width, 6);
    ctx.fillStyle = '#737a7c';
    ctx.fillRect(5, obstacle.height * 0.36, obstacle.width - 10, 3);
  }
  ctx.restore();
}

function drawParticles() {
  particles.forEach((particle) => {
    ctx.globalAlpha = particle.life * 0.7;
    ctx.fillStyle = particle.life > .45 ? '#24292b' : '#aeb4b6';
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}
function render(time) { drawBackground(time); obstacles.forEach(drawObstacle); drawParticles(); drawChaser(time); drawPlayer(); }
function loop(time) { const delta = lastTime ? time - lastTime : 16.67; lastTime = time; update(delta); render(time); animationFrame = requestAnimationFrame(loop); }

function togglePause() {
  if (!running || gameOver) return; paused = !paused; statusText.textContent = paused ? '暫停中' : '高速奔跑';
  if (paused) { overlayKicker.textContent = '暫停跑酷・整裝待發'; overlayTitle.textContent = '稍作喘息'; overlayMessage.textContent = '按下 P，繼續穿越城市。'; startButton.querySelector('span').textContent = '繼續奔跑'; overlay.classList.remove('is-hidden'); }
  else overlay.classList.add('is-hidden');
}

startButton.addEventListener('click', () => { if (paused) togglePause(); else resetGame(); });
document.addEventListener('keydown', (event) => {
  if (event.code === 'Space' || event.key.toLowerCase() === 'w') { event.preventDefault(); if (catching) return; if (!running || gameOver) resetGame(); else jump(); }
  if (event.key.toLowerCase() === 'p') togglePause();
  if (event.key.toLowerCase() === 'r') resetGame();
});
canvas.addEventListener('pointerdown', () => { if (catching) return; if (!running || gameOver) resetGame(); else jump(); });
updateHud(); render(0); animationFrame = requestAnimationFrame(loop);
