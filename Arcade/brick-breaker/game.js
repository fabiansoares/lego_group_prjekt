const BRICK_ROWS = 5;
const MAX_LEVEL = 3;
const BRICK_COLUMNS = 8;
const BRICK_GAP = 6;
const BRICK_MARGIN = 18;
const BRICK_HEIGHT = 18;
const BRICK_TOP = 58;
const PADDLE_WIDTH = 92;
const PADDLE_HEIGHT = 12;
const BALL_RADIUS = 8;
const BALL_SPEED_X = 185;
const BALL_SPEED_Y = 285;
const BRICK_COLORS = ["#ff5c86", "#ffae57", "#ffe66d", "#58e0a1", "#57c9ff"];
const MUSIC_TEMPO = 112;
const MUSIC_NOTES = [
  523.25, 659.25, 783.99, 659.25,
  587.33, 698.46, 880, 698.46,
  523.25, 659.25, 783.99, 1046.5,
  880, 783.99, 659.25, 523.25
];
const BASS_NOTES = [
  130.81, 0, 130.81, 0,
  174.61, 0, 174.61, 0,
  196, 0, 196, 0,
  174.61, 0, 130.81, 0
];
const MUSIC_STEP_SECONDS = 60 / MUSIC_TEMPO / 2;
const MUSIC_LOOP_SECONDS = MUSIC_STEP_SECONDS * MUSIC_NOTES.length;
const MUSIC_STORAGE_KEY = "brickBreakerMusicEnabled";

const canvas = document.querySelector("#game-board");
const context = canvas.getContext("2d");
const scoreDisplay = document.querySelector("#score");
const livesDisplay = document.querySelector("#lives");
const levelDisplay = document.querySelector("#level");
const gameStatus = document.querySelector("#game-status");
const gameOverlay = document.querySelector("#game-overlay");
const overlayLabel = document.querySelector("#overlay-label");
const overlayTitle = document.querySelector("#overlay-title");
const overlayMessage = document.querySelector("#overlay-message");
const startButton = document.querySelector("#start-game");
const restartButton = document.querySelector("#restart");
const musicToggle = document.querySelector("#music-toggle");

const paddle = {
  x: (canvas.width - PADDLE_WIDTH) / 2,
  y: canvas.height - 36,
  width: PADDLE_WIDTH,
  height: PADDLE_HEIGHT
};
const ball = {
  x: canvas.width / 2,
  y: paddle.y - BALL_RADIUS - 1,
  vx: 0,
  vy: 0,
  radius: BALL_RADIUS
};

let bricks = [];
let score = 0;
let lives = 3;
let level = 1;
let gameState = "ready";
let previousFrameTime;
let audioContext;
let musicGain;
let musicTimer;
let musicEnabled = localStorage.getItem(MUSIC_STORAGE_KEY) !== "false";
const musicOscillators = new Set();

function prepareAudio() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) return false;
  if (!audioContext) {
    audioContext = new AudioContextConstructor();
    musicGain = audioContext.createGain();
    musicGain.gain.value = 0.0001;
    musicGain.connect(audioContext.destination);
  }
  if (audioContext.state === "suspended") {
    audioContext.resume().catch((error) => {
      console.error("Brick Breaker audio could not be enabled.", error);
    }).then(() => {
      if (musicEnabled && gameState === "playing") startBackgroundMusic();
    });
  }
  return true;
}

function playMusicTone(frequency, startTime, duration, waveform, volume) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(musicGain);
  musicOscillators.add(oscillator);
  oscillator.addEventListener("ended", () => musicOscillators.delete(oscillator), { once: true });
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

function scheduleMusicLoop() {
  if (!audioContext || audioContext.state !== "running" || gameState !== "playing") return;

  const startTime = audioContext.currentTime + 0.05;
  for (let step = 0; step < MUSIC_NOTES.length; step++) {
    const noteTime = startTime + step * MUSIC_STEP_SECONDS;
    playMusicTone(MUSIC_NOTES[step], noteTime, MUSIC_STEP_SECONDS * 0.8, "square", 0.1);
    if (BASS_NOTES[step]) {
      playMusicTone(BASS_NOTES[step], noteTime, MUSIC_STEP_SECONDS * 1.4, "triangle", 0.12);
    }
  }
}

function stopBackgroundMusic() {
  if (musicTimer !== undefined) {
    window.clearInterval(musicTimer);
    musicTimer = undefined;
  }
  if (!audioContext || !musicGain) return;

  const stopTime = audioContext.currentTime + 0.02;
  for (const oscillator of musicOscillators) oscillator.stop(stopTime);
  musicOscillators.clear();
  musicGain.gain.cancelScheduledValues(audioContext.currentTime);
  musicGain.gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.025);
}

function startBackgroundMusic() {
  if (!musicEnabled || !audioContext || audioContext.state !== "running" || musicTimer !== undefined) {
    return;
  }

  musicGain.gain.setTargetAtTime(0.14, audioContext.currentTime, 0.04);
  scheduleMusicLoop();
  musicTimer = window.setInterval(scheduleMusicLoop, MUSIC_LOOP_SECONDS * 1000);
}

function updateMusicButton() {
  musicToggle.textContent = musicEnabled ? "Music: On" : "Music: Off";
  musicToggle.setAttribute("aria-pressed", String(musicEnabled));
}

function playBrickSound() {
  if (!audioContext || audioContext.state !== "running") return;

  const startTime = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const frequency = 620 + level * 70;
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(frequency, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.62, startTime + 0.08);
  gain.gain.setValueAtTime(0.12, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + 0.09);
}

function playLifeLostSound() {
  if (!audioContext || audioContext.state !== "running") return;

  const startTime = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(330, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(75, startTime + 0.32);
  gain.gain.setValueAtTime(0.16, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.32);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + 0.32);
}

function createBricks() {
  const brickWidth =
    (canvas.width - BRICK_MARGIN * 2 - BRICK_GAP * (BRICK_COLUMNS - 1)) / BRICK_COLUMNS;
  bricks = [];
  for (let row = 0; row < BRICK_ROWS + level - 1; row++) {
    for (let column = 0; column < BRICK_COLUMNS; column++) {
      bricks.push({
        x: BRICK_MARGIN + column * (brickWidth + BRICK_GAP),
        y: BRICK_TOP + row * (BRICK_HEIGHT + BRICK_GAP),
        width: brickWidth,
        height: BRICK_HEIGHT,
        color: BRICK_COLORS[row % BRICK_COLORS.length]
      });
    }
  }
}

function drawBoard() {
  context.fillStyle = "#15132d";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "rgb(255 255 255 / 5%)";
  context.lineWidth = 1;
  for (let x = 20; x < canvas.width; x += 20) {
    context.beginPath();
    context.moveTo(x + 0.5, 0);
    context.lineTo(x + 0.5, canvas.height);
    context.stroke();
  }

  for (const brick of bricks) {
    context.fillStyle = brick.color;
    context.fillRect(brick.x, brick.y, brick.width, brick.height);
    context.fillStyle = "rgb(255 255 255 / 28%)";
    context.fillRect(brick.x + 3, brick.y + 3, brick.width - 6, 3);
  }

  context.fillStyle = "#45e8e0";
  context.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  context.fillStyle = "#fff";
  context.beginPath();
  context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  context.fill();
}

function updateScoreboard() {
  scoreDisplay.textContent = String(score);
  livesDisplay.textContent = String(lives);
  levelDisplay.textContent = String(level);
}

function placeBallOnPaddle() {
  ball.x = paddle.x + paddle.width / 2;
  ball.y = paddle.y - BALL_RADIUS - 1;
  ball.vx = 0;
  ball.vy = 0;
}

function showOverlay(label, title, message, buttonText) {
  overlayLabel.textContent = label;
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  startButton.textContent = buttonText;
  gameOverlay.hidden = false;
}

function resetGame() {
  stopBackgroundMusic();
  score = 0;
  lives = 3;
  level = 1;
  paddle.x = (canvas.width - paddle.width) / 2;
  createBricks();
  placeBallOnPaddle();
  gameState = "ready";
  updateScoreboard();
  gameStatus.textContent = "Use the arrow keys or drag the paddle to play.";
  showOverlay(
    "READY?",
    "Break the bricks",
    "Keep the ball bouncing with your paddle. Clear every brick to win!",
    "Start game"
  );
  drawBoard();
}

function startGame() {
  if (gameState === "over" || gameState === "won") resetGame();
  if (gameState !== "ready") return;

  gameState = "playing";
  gameOverlay.hidden = true;
  const speedMultiplier = 1 + (level - 1) * 0.12;
  ball.vx = BALL_SPEED_X * speedMultiplier;
  ball.vy = -BALL_SPEED_Y * speedMultiplier;
  previousFrameTime = undefined;
  gameStatus.textContent = "Break the bricks and keep the ball in play!";
  if (!prepareAudio()) {
    gameStatus.textContent = "Sound is unavailable in this browser. Break the bricks and keep playing!";
  }
  if (musicEnabled) startBackgroundMusic();
  canvas.focus({ preventScroll: true });
}

function endGame(state, title, message) {
  stopBackgroundMusic();
  gameState = state;
  ball.vx = 0;
  ball.vy = 0;
  gameStatus.textContent = message;
  showOverlay(state === "won" ? "BOARD CLEARED" : "GAME OVER", title, message, "Play again");
}

function finishLife() {
  stopBackgroundMusic();
  lives -= 1;
  playLifeLostSound();
  updateScoreboard();
  if (lives <= 0) {
    endGame("over", "Game over", `No lives left · Final score: ${score}`);
    return;
  }

  gameState = "ready";
  placeBallOnPaddle();
  const message = `Ball lost · ${lives} ${lives === 1 ? "life" : "lives"} left`;
  gameStatus.textContent = message;
  showOverlay("TRY AGAIN", "Ready?", message, "Continue");
}

function advanceLevel() {
  if (level >= MAX_LEVEL) {
    endGame("won", "You win!", `All levels cleared · Final score: ${score}`);
    return;
  }

  stopBackgroundMusic();
  level += 1;
  createBricks();
  updateScoreboard();
  gameState = "ready";
  placeBallOnPaddle();
  const message = `Level ${level} has more bricks and a faster ball.`;
  gameStatus.textContent = message;
  showOverlay(`LEVEL ${level}`, "Level up!", message, "Start level");
}

function movePaddleTo(clientX) {
  const bounds = canvas.getBoundingClientRect();
  const canvasX = (clientX - bounds.left) * (canvas.width / bounds.width);
  paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, canvasX - paddle.width / 2));
  if (gameState === "ready") placeBallOnPaddle();
}

function hitBrick(previousY) {
  for (let index = 0; index < bricks.length; index++) {
    const brick = bricks[index];
    const overlaps =
      ball.x + ball.radius > brick.x &&
      ball.x - ball.radius < brick.x + brick.width &&
      ball.y + ball.radius > brick.y &&
      ball.y - ball.radius < brick.y + brick.height;
    if (!overlaps) continue;

    if (
      previousY + ball.radius <= brick.y ||
      previousY - ball.radius >= brick.y + brick.height
    ) {
      ball.vy *= -1;
    } else {
      ball.vx *= -1;
    }

    bricks.splice(index, 1);
    score += 10;
    playBrickSound();
    updateScoreboard();
    gameStatus.textContent = `Brick broken · Score: ${score}`;
    if (bricks.length === 0) advanceLevel();
    return true;
  }

  return false;
}

function updateGame(deltaSeconds) {
  if (gameState !== "playing") return;

  const previousY = ball.y;
  ball.x += ball.vx * deltaSeconds;
  ball.y += ball.vy * deltaSeconds;

  if (ball.x - ball.radius <= 0) {
    ball.x = ball.radius;
    ball.vx = Math.abs(ball.vx);
  } else if (ball.x + ball.radius >= canvas.width) {
    ball.x = canvas.width - ball.radius;
    ball.vx = -Math.abs(ball.vx);
  }

  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.vy = Math.abs(ball.vy);
  }

  if (
    ball.vy > 0 &&
    ball.x + ball.radius >= paddle.x &&
    ball.x - ball.radius <= paddle.x + paddle.width &&
    ball.y + ball.radius >= paddle.y &&
    ball.y - ball.radius < paddle.y + paddle.height
  ) {
    const hitPosition = Math.max(
      -1,
      Math.min(1, (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2))
    );
    const speed = Math.hypot(ball.vx, ball.vy);
    const angle = hitPosition * (Math.PI / 3);
    ball.vx = speed * Math.sin(angle);
    ball.vy = -Math.abs(speed * Math.cos(angle));
    ball.y = paddle.y - ball.radius;
  }

  hitBrick(previousY);
  if (gameState !== "playing") return;

  if (ball.y - ball.radius > canvas.height) {
    finishLife();
    return;
  }

}

function frame(timestamp) {
  const deltaSeconds = previousFrameTime === undefined
    ? 0
    : Math.min((timestamp - previousFrameTime) / 1000, 0.032);
  previousFrameTime = timestamp;
  updateGame(deltaSeconds);
  drawBoard();
  window.requestAnimationFrame(frame);
}

document.addEventListener("keydown", (event) => {
  if (gameState !== "playing") return;
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    event.preventDefault();
    paddle.x = Math.max(0, paddle.x - 30);
  } else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    event.preventDefault();
    paddle.x = Math.min(canvas.width - paddle.width, paddle.x + 30);
  }
});

canvas.addEventListener("pointermove", (event) => {
  if (event.pointerType === "mouse" || event.pointerType === "touch") {
    movePaddleTo(event.clientX);
  }
});

canvas.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch") movePaddleTo(event.clientX);
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", resetGame);
musicToggle.addEventListener("click", () => {
  musicEnabled = !musicEnabled;
  localStorage.setItem(MUSIC_STORAGE_KEY, String(musicEnabled));
  updateMusicButton();
  if (musicEnabled) {
    if (!prepareAudio()) {
      gameStatus.textContent = "Background music is unavailable in this browser.";
    } else if (gameState === "playing") {
      startBackgroundMusic();
    }
  } else {
    stopBackgroundMusic();
  }
});

resetGame();
updateMusicButton();
window.requestAnimationFrame(frame);
