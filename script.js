const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.querySelector('#gameOverlay');
const overlayKicker = document.querySelector('#overlayKicker');
const overlayTitle = document.querySelector('#overlayTitle');
const overlayMessage = document.querySelector('#overlayMessage');
const startButton = document.querySelector('#startButton');
const scoreElement = document.querySelector('#score');
const highScoreElement = document.querySelector('#highScore');
const killsElement = document.querySelector('#kills');
const highKillsElement = document.querySelector('#highKills');
const levelElement = document.querySelector('#level');
const statusText = document.querySelector('#statusText');
const playerSprite = document.querySelector('#playerSprite');

const WORLD = { width: 1200, height: 520, groundY: 404 };
const player = { x: 145, y: WORLD.groundY - 82, width: 66, height: 82, velocityY: 0, grounded: true };
let obstacles = [];
let enemies = [];
let bullets = [];
let particles = [];
let stars = [];
let running = false;
let paused = false;
let gameOver = false;
let score = 0;
let highScore = Number(localStorage.getItem('neonRunnerBest') || 0);
let kills = 0;
let highKills = Number(localStorage.getItem('neonRunnerHighKills') || 0);
let speed = 7;
let spawnTimer = 0;
let nextSpawn = 92;
let enemySpawnTimer = 0;
let nextEnemySpawn = 175;
let lastTime = 0;
let animationFrame;

for (let i = 0; i < 80; i += 1) {
  stars.push({ x: Math.random() * WORLD.width, y: Math.random() * 285, size: Math.random() * 2 + 0.5, alpha: Math.random() * 0.55 + 0.15, drift: Math.random() * 0.6 + 0.15 });
}

function formatScore(value) { return Math.floor(value).toString().padStart(6, '0'); }
function updateHud() {
  scoreElement.textContent = formatScore(score);
  highScoreElement.textContent = formatScore(Math.max(highScore, score));
  killsElement.textContent = String(kills).padStart(3, '0');
  highKillsElement.textContent = String(Math.max(highKills, kills)).padStart(3, '0');
  levelElement.textContent = String(Math.min(99, Math.floor(score / 500) + 1)).padStart(2, '0');
}

function setOverlay(mode) {
  overlay.classList.remove('is-hidden');
  if (mode === 'ready') {
    overlayKicker.textContent = '山水長卷・徐徐展開'; overlayTitle.textContent = '踏墨啟程？';
    overlayMessage.textContent = '按下 Space 或 W 躍身避開山石，使用 X 擊退前方的山間守衛。'; startButton.querySelector('span').textContent = '踏入山河';
  } else {
    overlayKicker.textContent = '行至卷終・且待再續'; overlayTitle.textContent = '山河未盡';
    overlayMessage.textContent = `此行 ${formatScore(score)} 步，擊退 ${String(kills).padStart(3, '0')} 名守衛。歇息片刻，再踏征途。`; startButton.querySelector('span').textContent = '再行山河';
  }
}

function resetGame() {
  player.y = WORLD.groundY - player.height; player.velocityY = 0; player.grounded = true;
  obstacles = []; enemies = []; bullets = []; particles = []; score = 0; kills = 0; speed = 7; spawnTimer = 0; nextSpawn = 92; enemySpawnTimer = 0; nextEnemySpawn = 175;
  running = true; paused = false; gameOver = false; overlay.classList.add('is-hidden');
  statusText.textContent = '奔行中'; updateHud();
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

function spawnEnemy() {
  const types = ['tengu', 'kitsune', 'oni'];
  const type = types[Math.floor(Math.random() * types.length)];
  const specs = {
    tengu: { width: 68, height: 86, speed: 0.88 },
    kitsune: { width: 92, height: 70, speed: 1.08 },
    oni: { width: 76, height: 94, speed: 0.68 },
  };
  const spec = specs[type];
  enemies.push({ type, x: WORLD.width + 35, y: WORLD.groundY - spec.height, width: spec.width, height: spec.height, speed: spec.speed, phase: Math.random() * 10, health: 1 });
  nextEnemySpawn = Math.max(92, 185 - speed * 4 + Math.random() * 120);
}

function fire() {
  if (!running || paused || gameOver) return;
  bullets.push({ x: player.x + player.width - 2, y: player.y + 29, width: 19, height: 4, speed: 18, active: true });
  for (let i = 0; i < 3; i += 1) particles.push({ x: player.x + player.width, y: player.y + 31, vx: Math.random() * 2, vy: (Math.random() - .5) * 2, life: .7, size: 2 });
}

function update(delta) {
  if (!running || paused || gameOver) return;
  const frame = Math.min(delta / 16.67, 2);
  score += delta * 0.012 * speed;
  speed = Math.min(15, 7 + score / 1150);
  spawnTimer += frame;
  if (spawnTimer > nextSpawn) { spawnTimer = 0; spawnObstacle(); }
  enemySpawnTimer += frame;
  if (enemySpawnTimer > nextEnemySpawn) { enemySpawnTimer = 0; spawnEnemy(); }

  player.velocityY += 0.84 * frame;
  player.y += player.velocityY * frame;
  if (player.y >= WORLD.groundY - player.height) { player.y = WORLD.groundY - player.height; player.velocityY = 0; player.grounded = true; }

  obstacles.forEach((obstacle) => { obstacle.x -= speed * frame; obstacle.phase += 0.08 * frame; });
  obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.width > -30);
  enemies.forEach((enemy) => { enemy.x -= speed * enemy.speed * frame; enemy.phase += 0.09 * frame; });
  enemies = enemies.filter((enemy) => enemy.x + enemy.width > -50);
  bullets.forEach((bullet) => { bullet.x += bullet.speed * frame; });
  bullets = bullets.filter((bullet) => bullet.x < WORLD.width + 30 && bullet.active);
  particles.forEach((particle) => { particle.x += particle.vx * frame; particle.y += particle.vy * frame; particle.vy += 0.15 * frame; particle.life -= 0.035 * frame; });
  particles = particles.filter((particle) => particle.life > 0);

  const playerBox = { x: player.x + 12, y: player.y + 7, width: player.width - 24, height: player.height - 11 };
  if (obstacles.some((obstacle) => playerBox.x < obstacle.x + obstacle.width - 5 && playerBox.x + playerBox.width > obstacle.x + 5 && playerBox.y < obstacle.y + obstacle.height && playerBox.y + playerBox.height > obstacle.y + 4)) endGame();
  if (enemies.some((enemy) => playerBox.x < enemy.x + enemy.width - 5 && playerBox.x + playerBox.width > enemy.x + 5 && playerBox.y < enemy.y + enemy.height && playerBox.y + playerBox.height > enemy.y + 4)) endGame();
  bullets.forEach((bullet) => {
    enemies.forEach((enemy) => {
      if (bullet.x < enemy.x + enemy.width && bullet.x + bullet.width > enemy.x && bullet.y < enemy.y + enemy.height && bullet.y + bullet.height > enemy.y) {
        enemy.health = 0; bullet.active = false; kills += 1;
        for (let i = 0; i < 12; i += 1) particles.push({ x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2, vx: (Math.random() - .5) * 7, vy: (Math.random() - .5) * 7, life: 1, size: Math.random() * 4 + 1 });
      }
    });
  });
  bullets = bullets.filter((bullet) => bullet.active);
  enemies = enemies.filter((enemy) => enemy.health > 0);
  updateHud();
}

function endGame() {
  gameOver = true; running = false; highScore = Math.max(highScore, Math.floor(score)); highKills = Math.max(highKills, kills);
  localStorage.setItem('neonRunnerBest', highScore); localStorage.setItem('neonRunnerHighKills', highKills); statusText.textContent = '行至卷終'; setOverlay('gameover');
  for (let i = 0; i < 22; i += 1) particles.push({ x: player.x + player.width / 2, y: player.y + player.height / 2, vx: (Math.random() - .5) * 8, vy: (Math.random() - .5) * 8, life: 1, size: Math.random() * 4 + 1 });
  updateHud();
}

function drawMountainRange(time, baseY, height, color, parallax) {
  const segmentWidth = 420;
  const offset = (time * speed * parallax) % segmentWidth;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = -2; i < 5; i += 1) {
    const x = i * segmentWidth - offset;
    const peakHeight = height * (0.72 + ((i * 7 + 19) % 5) * 0.07);
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + 18, baseY - 8);
    ctx.quadraticCurveTo(x + 94, baseY - peakHeight * 0.7, x + 194, baseY - peakHeight);
    ctx.quadraticCurveTo(x + 264, baseY - peakHeight * 0.82, x + 318, baseY - peakHeight * 0.39);
    ctx.quadraticCurveTo(x + 368, baseY - peakHeight * 0.17, x + segmentWidth, baseY);
  }
  ctx.lineTo(WORLD.width, WORLD.groundY);
  ctx.lineTo(0, WORLD.groundY);
  ctx.closePath();
  ctx.fill();
}

function drawBackground(time) {
  const paper = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  paper.addColorStop(0, '#f1ead9');
  paper.addColorStop(0.72, '#e9e1cf');
  paper.addColorStop(1, '#e0d7c2');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  stars.forEach((grain) => {
    ctx.globalAlpha = grain.alpha * 0.12;
    ctx.fillStyle = '#514b3d';
    ctx.fillRect(grain.x, grain.y, grain.size + 1, grain.size + 1);
  });
  ctx.globalAlpha = 1;

  const sun = ctx.createRadialGradient(967, 113, 4, 967, 113, 72);
  sun.addColorStop(0, 'rgba(164, 83, 65, 0.23)');
  sun.addColorStop(1, 'rgba(164, 83, 65, 0)');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(967, 113, 72, 0, Math.PI * 2);
  ctx.fill();

  drawMountainRange(time, 331, 158, 'rgba(92, 94, 84, 0.12)', 0.018);
  drawMountainRange(time, 361, 112, 'rgba(72, 75, 68, 0.19)', 0.042);

  ctx.strokeStyle = 'rgba(78, 79, 69, 0.12)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i += 1) {
    const cloudX = (i * 440 - time * speed * 0.035) % (WORLD.width + 180);
    const x = cloudX < -90 ? cloudX + WORLD.width + 180 : cloudX;
    const y = 201 + i * 35;
    ctx.beginPath();
    ctx.moveTo(x, y + 8);
    ctx.quadraticCurveTo(x + 34, y - 7, x + 75, y + 4);
    ctx.quadraticCurveTo(x + 111, y + 14, x + 148, y - 1);
    ctx.stroke();
  }

  const mist = ctx.createLinearGradient(0, 323, 0, WORLD.groundY);
  mist.addColorStop(0, 'rgba(240, 235, 220, 0)');
  mist.addColorStop(0.55, 'rgba(240, 235, 220, 0.68)');
  mist.addColorStop(1, 'rgba(240, 235, 220, 0.14)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, 310, WORLD.width, WORLD.groundY - 310);

  ctx.fillStyle = 'rgba(119, 110, 88, 0.08)';
  ctx.fillRect(0, WORLD.groundY, WORLD.width, WORLD.height - WORLD.groundY);
  ctx.strokeStyle = 'rgba(55, 57, 50, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, WORLD.groundY);
  ctx.quadraticCurveTo(290, WORLD.groundY - 2, 590, WORLD.groundY + 1);
  ctx.quadraticCurveTo(890, WORLD.groundY + 3, WORLD.width, WORLD.groundY);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(55, 57, 50, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, WORLD.groundY + 7);
  ctx.quadraticCurveTo(420, WORLD.groundY + 10, WORLD.width, WORLD.groundY + 5);
  ctx.stroke();
}

function drawPlayer() {
  playerSprite.style.left = `${player.x / WORLD.width * 100}%`;
  playerSprite.style.top = `${player.y / WORLD.height * 100}%`;
  playerSprite.style.width = `${player.width / WORLD.width * 100}%`;
  playerSprite.style.height = `${player.height / WORLD.height * 100}%`;
}

function drawObstacle(obstacle) {
  ctx.save();
  ctx.translate(obstacle.x, obstacle.y);
  ctx.fillStyle = 'rgba(54, 55, 49, 0.82)';
  ctx.strokeStyle = 'rgba(54, 55, 49, 0.68)';
  ctx.lineWidth = 2;
  if (obstacle.tall) {
    const sway = Math.sin(obstacle.phase) * 1.5;
    ctx.beginPath();
    ctx.moveTo(obstacle.width * 0.37, obstacle.height);
    ctx.quadraticCurveTo(obstacle.width * 0.3, obstacle.height * 0.52, obstacle.width * 0.47 + sway, 0);
    ctx.quadraticCurveTo(obstacle.width * 0.62, obstacle.height * 0.52, obstacle.width * 0.7, obstacle.height);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(obstacle.width * 0.42, obstacle.height * 0.55);
    ctx.quadraticCurveTo(obstacle.width * 0.12, obstacle.height * 0.36, 0, obstacle.height * 0.32);
    ctx.moveTo(obstacle.width * 0.52, obstacle.height * 0.37);
    ctx.quadraticCurveTo(obstacle.width * 0.78, obstacle.height * 0.2, obstacle.width, obstacle.height * 0.12);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, obstacle.height);
    ctx.quadraticCurveTo(3, obstacle.height * 0.55, obstacle.width * 0.2, obstacle.height * 0.54);
    ctx.quadraticCurveTo(obstacle.width * 0.3, obstacle.height * 0.03, obstacle.width * 0.56, obstacle.height * 0.25);
    ctx.quadraticCurveTo(obstacle.width * 0.96, obstacle.height * 0.32, obstacle.width, obstacle.height);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(230, 222, 203, 0.28)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(obstacle.width * 0.3, obstacle.height * 0.7);
    ctx.quadraticCurveTo(obstacle.width * 0.49, obstacle.height * 0.4, obstacle.width * 0.7, obstacle.height * 0.59);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEnemy(enemy) {
  const bob = enemy.type === 'kitsune' ? Math.sin(enemy.phase) * 2.5 : 0;
  ctx.save();
  ctx.translate(enemy.x, enemy.y + bob);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(45, 46, 41, 0.88)';
  ctx.strokeStyle = 'rgba(45, 46, 41, 0.78)';
  ctx.lineWidth = 2;

  if (enemy.type === 'tengu') {
    const w = enemy.width;
    const h = enemy.height;
    const cx = w * 0.53;

    ctx.beginPath();
    ctx.moveTo(w * 0.22, h * 0.38);
    ctx.quadraticCurveTo(w * 0.02, h * 0.2, w * 0.02, h * 0.07);
    ctx.quadraticCurveTo(w * 0.31, h * 0.22, w * 0.46, h * 0.31);
    ctx.quadraticCurveTo(w * 0.67, h * 0.18, w * 0.88, h * 0.08);
    ctx.quadraticCurveTo(w * 0.86, h * 0.32, w * 0.69, h * 0.43);
    ctx.fill();
    ctx.strokeStyle = 'rgba(241, 234, 217, 0.38)';
    ctx.lineWidth = 1.4;
    for (let feather = 0; feather < 3; feather += 1) {
      ctx.beginPath();
      ctx.moveTo(w * (0.2 + feather * 0.08), h * (0.3 + feather * 0.025));
      ctx.quadraticCurveTo(w * (0.12 + feather * 0.06), h * 0.18, w * (0.1 + feather * 0.075), h * 0.13);
      ctx.moveTo(w * (0.67 + feather * 0.055), h * 0.37);
      ctx.quadraticCurveTo(w * (0.82 + feather * 0.025), h * 0.25, w * (0.86 + feather * 0.012), h * 0.17);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(45, 46, 41, 0.94)';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.17, h * 0.2);
    ctx.quadraticCurveTo(cx - w * 0.2, h * 0.04, cx, h * 0.08);
    ctx.quadraticCurveTo(cx + w * 0.18, h * 0.08, cx + w * 0.17, h * 0.25);
    ctx.lineTo(cx + w * 0.09, h * 0.37);
    ctx.lineTo(cx - w * 0.12, h * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.27, h * 0.11);
    ctx.quadraticCurveTo(cx, h * 0.02, cx + w * 0.27, h * 0.11);
    ctx.quadraticCurveTo(cx + w * 0.1, h * 0.16, cx - w * 0.27, h * 0.11);
    ctx.fill();
    ctx.fillStyle = '#a64232';
    ctx.fillRect(cx - w * 0.13, h * 0.11, w * 0.26, h * 0.025);

    ctx.fillStyle = 'rgba(45, 46, 41, 0.9)';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.1, h * 0.34);
    ctx.quadraticCurveTo(cx + w * 0.18, h * 0.35, cx + w * 0.2, h * 0.57);
    ctx.lineTo(cx + w * 0.28, h * 0.87);
    ctx.lineTo(cx + w * 0.03, h * 0.87);
    ctx.lineTo(cx - w * 0.01, h * 0.65);
    ctx.lineTo(cx - w * 0.14, h * 0.87);
    ctx.lineTo(cx - w * 0.34, h * 0.87);
    ctx.lineTo(cx - w * 0.27, h * 0.56);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(241, 234, 217, 0.74)';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.08, h * 0.28);
    ctx.lineTo(cx + w * 0.08, h * 0.29);
    ctx.lineTo(cx + w * 0.03, h * 0.48);
    ctx.lineTo(cx - w * 0.08, h * 0.39);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(45, 46, 41, 0.9)';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.17, h * 0.18);
    ctx.quadraticCurveTo(cx - w * 0.31, h * 0.12, cx - w * 0.3, h * 0.02);
    ctx.quadraticCurveTo(cx - w * 0.17, h * 0.09, cx - w * 0.1, h * 0.15);
    ctx.fill();
    ctx.fillStyle = '#a64232';
    ctx.beginPath();
    ctx.arc(cx + w * 0.12, h * 0.22, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.type === 'kitsune') {
    const w = enemy.width;
    const h = enemy.height;
    const sway = Math.sin(enemy.phase) * 3;

    ctx.fillStyle = 'rgba(55, 56, 49, 0.72)';
    for (let tail = 0; tail < 5; tail += 1) {
      const rootX = w * (0.39 + tail * 0.025);
      const tipX = w * (0.015 + tail * 0.105);
      const tipY = h * (0.12 + tail * 0.105) + sway;
      ctx.beginPath();
      ctx.moveTo(rootX, h * 0.68);
      ctx.quadraticCurveTo(tipX + w * 0.25, h * (0.47 - tail * 0.045), tipX, tipY);
      ctx.quadraticCurveTo(tipX + w * 0.19, h * (0.5 - tail * 0.035), rootX + w * 0.13, h * 0.68);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(241, 234, 217, 0.64)';
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.quadraticCurveTo(tipX + w * 0.09, tipY + h * 0.035, tipX + w * 0.16, tipY + h * 0.07);
      ctx.quadraticCurveTo(tipX + w * 0.07, tipY + h * 0.035, tipX, tipY);
      ctx.fill();
      ctx.fillStyle = 'rgba(55, 56, 49, 0.72)';
    }

    ctx.fillStyle = 'rgba(45, 46, 41, 0.9)';
    ctx.beginPath();
    ctx.moveTo(w * 0.32, h * 0.53);
    ctx.quadraticCurveTo(w * 0.53, h * 0.34, w * 0.75, h * 0.49);
    ctx.quadraticCurveTo(w * 0.91, h * 0.51, w * 0.98, h * 0.65);
    ctx.lineTo(w * 0.83, h * 0.73);
    ctx.quadraticCurveTo(w * 0.61, h * 0.82, w * 0.37, h * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w * 0.76, h * 0.53);
    ctx.lineTo(w * 0.74, h * 0.26);
    ctx.lineTo(w * 0.83, h * 0.4);
    ctx.lineTo(w * 0.87, h * 0.27);
    ctx.lineTo(w * 0.9, h * 0.53);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w * 0.72, h * 0.7);
    ctx.lineTo(w * 0.69, h * 0.92);
    ctx.lineTo(w * 0.77, h * 0.92);
    ctx.lineTo(w * 0.82, h * 0.73);
    ctx.moveTo(w * 0.47, h * 0.71);
    ctx.lineTo(w * 0.43, h * 0.93);
    ctx.lineTo(w * 0.51, h * 0.93);
    ctx.lineTo(w * 0.56, h * 0.73);
    ctx.fill();

    ctx.fillStyle = '#a64232';
    ctx.beginPath();
    ctx.arc(w * 0.85, h * 0.55, 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(241, 234, 217, 0.58)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(w * 0.72, h * 0.66);
    ctx.quadraticCurveTo(w * 0.8, h * 0.59, w * 0.92, h * 0.65);
    ctx.stroke();
  } else {
    const w = enemy.width;
    const h = enemy.height;
    const cx = w * 0.51;

    ctx.beginPath();
    ctx.moveTo(cx - w * 0.14, h * 0.28);
    ctx.quadraticCurveTo(cx - w * 0.43, h * 0.16, cx - w * 0.37, h * 0.015);
    ctx.quadraticCurveTo(cx - w * 0.15, h * 0.055, cx - w * 0.02, h * 0.22);
    ctx.moveTo(cx + w * 0.14, h * 0.28);
    ctx.quadraticCurveTo(cx + w * 0.43, h * 0.16, cx + w * 0.37, h * 0.015);
    ctx.quadraticCurveTo(cx + w * 0.15, h * 0.055, cx + w * 0.02, h * 0.22);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w * 0.2, h * 0.88);
    ctx.lineTo(w * 0.22, h * 0.54);
    ctx.quadraticCurveTo(w * 0.19, h * 0.36, cx - w * 0.18, h * 0.31);
    ctx.quadraticCurveTo(cx, h * 0.22, cx + w * 0.18, h * 0.31);
    ctx.quadraticCurveTo(w * 0.83, h * 0.37, w * 0.78, h * 0.58);
    ctx.lineTo(w * 0.8, h * 0.88);
    ctx.lineTo(w * 0.64, h * 0.96);
    ctx.lineTo(w * 0.56, h * 0.68);
    ctx.lineTo(w * 0.45, h * 0.68);
    ctx.lineTo(w * 0.36, h * 0.96);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w * 0.24, h * 0.43);
    ctx.quadraticCurveTo(w * 0.08, h * 0.39, w * 0.04, h * 0.64);
    ctx.quadraticCurveTo(w * 0.1, h * 0.73, w * 0.29, h * 0.61);
    ctx.moveTo(w * 0.76, h * 0.43);
    ctx.quadraticCurveTo(w * 0.95, h * 0.39, w * 0.96, h * 0.61);
    ctx.quadraticCurveTo(w * 0.88, h * 0.72, w * 0.72, h * 0.6);
    ctx.fill();

    ctx.fillStyle = '#e7deca';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.17, h * 0.39);
    ctx.lineTo(cx - w * 0.05, h * 0.43);
    ctx.lineTo(cx - w * 0.1, h * 0.49);
    ctx.moveTo(cx + w * 0.17, h * 0.39);
    ctx.lineTo(cx + w * 0.05, h * 0.43);
    ctx.lineTo(cx + w * 0.1, h * 0.49);
    ctx.fill();
    ctx.fillStyle = '#a64232';
    ctx.beginPath();
    ctx.arc(cx, h * 0.49, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 2, h * 0.56, 4, h * 0.075);

    ctx.strokeStyle = 'rgba(241, 234, 217, 0.43)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.25, h * 0.59);
    ctx.quadraticCurveTo(cx, h * 0.66, cx + w * 0.24, h * 0.58);
    ctx.moveTo(cx - w * 0.13, h * 0.75);
    ctx.lineTo(cx + w * 0.13, h * 0.75);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBullets() {
  bullets.forEach((bullet) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(166, 66, 50, 0.84)';
    ctx.lineWidth = bullet.height + 1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bullet.x - 4, bullet.y + bullet.height / 2);
    ctx.quadraticCurveTo(bullet.x + 7, bullet.y - 2, bullet.x + bullet.width, bullet.y + bullet.height / 2);
    ctx.stroke();
    ctx.restore();
  });
}

function drawParticles() {
  particles.forEach((particle) => {
    ctx.globalAlpha = particle.life * 0.7;
    ctx.fillStyle = particle.life > .45 ? '#494a42' : '#a64232';
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}
function render(time) { drawBackground(time); obstacles.forEach(drawObstacle); enemies.forEach(drawEnemy); drawBullets(); drawParticles(); drawPlayer(); }
function loop(time) { const delta = lastTime ? time - lastTime : 16.67; lastTime = time; update(delta); render(time); animationFrame = requestAnimationFrame(loop); }

function togglePause() {
  if (!running || gameOver) return; paused = !paused; statusText.textContent = paused ? '山中暫歇' : '奔行中';
  if (paused) { overlayKicker.textContent = '山靜雲停・稍作歇息'; overlayTitle.textContent = '且聽松風'; overlayMessage.textContent = '按下 P，繼續踏上山河長路。'; startButton.querySelector('span').textContent = '繼續前行'; overlay.classList.remove('is-hidden'); }
  else overlay.classList.add('is-hidden');
}

startButton.addEventListener('click', () => { if (paused) togglePause(); else resetGame(); });
document.addEventListener('keydown', (event) => {
  if (event.code === 'Space' || event.key.toLowerCase() === 'w') { event.preventDefault(); if (!running || gameOver) resetGame(); else jump(); }
  if (event.key.toLowerCase() === 'x') { event.preventDefault(); fire(); }
  if (event.key.toLowerCase() === 'p') togglePause();
  if (event.key.toLowerCase() === 'r') resetGame();
});
canvas.addEventListener('pointerdown', () => { if (!running || gameOver) resetGame(); else jump(); });
updateHud(); render(0); animationFrame = requestAnimationFrame(loop);
