const GRID_SIZE = 20;
const CELL_SIZE = 20;
const START_TICK_MS = 125;
const MIN_TICK_MS = 55;
const SPEED_UP_PER_FOOD_MS = 5;
const HIGH_SCORE_KEY = "pixelPalaceSnakeHighScore";
const MUSIC_STORAGE_KEY = "pixelPalaceSnakeMusicEnabled";
const MUSIC_TEMPO = 112;
const MUSIC_NOTES = [
  659.25, 783.99, 987.77, 783.99,
  698.46, 880, 1046.5, 880,
  659.25, 783.99, 987.77, 1174.66,
  1046.5, 880, 783.99, 659.25
];
const BASS_NOTES = [
  164.81, 0, 164.81, 0,
  196, 0, 196, 0,
  146.83, 0, 146.83, 0,
  174.61, 0, 164.81, 0
];
const MUSIC_STEP_SECONDS = 60 / MUSIC_TEMPO / 2;
const MUSIC_LOOP_SECONDS = MUSIC_STEP_SECONDS * MUSIC_NOTES.length;
const DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }
};

const canvas = document.querySelector("#game-board");
const context = canvas.getContext("2d");
const scoreDisplay = document.querySelector("#score");
const highScoreDisplay = document.querySelector("#best-score");
const gameStatus = document.querySelector("#game-status");
const gameOverlay = document.querySelector("#game-overlay");
const overlayLabel = document.querySelector("#overlay-label");
const overlayTitle = document.querySelector("#overlay-title");
const overlayMessage = document.querySelector("#overlay-message");
const startButton = document.querySelector("#start-game");
const restartButton = document.querySelector("#restart");
const musicToggle = document.querySelector("#music-toggle");

let snake;
let food;
let direction;
let nextDirection;
let turnQueued;
let score;
const storedHighScore = localStorage.getItem(HIGH_SCORE_KEY);
let highScore = storedHighScore === null ? 0 : Number(storedHighScore);
if (!Number.isSafeInteger(highScore) || highScore < 0) highScore = 0;
let gameState = "ready";
let gameTimer;
let swipeStart;
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
      console.error("Snake audio could not be enabled.", error);
    }).then(() => {
      if (musicEnabled && gameState === "running") startBackgroundMusic();
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
  if (!audioContext || audioContext.state !== "running" || gameState !== "running") return;

  const startTime = audioContext.currentTime + 0.05;
  for (let step = 0; step < MUSIC_NOTES.length; step++) {
    const noteTime = startTime + step * MUSIC_STEP_SECONDS;
    playMusicTone(MUSIC_NOTES[step], noteTime, MUSIC_STEP_SECONDS * 0.8, "square", 0.07);
    if (BASS_NOTES[step]) {
      playMusicTone(BASS_NOTES[step], noteTime, MUSIC_STEP_SECONDS * 1.4, "triangle", 0.08);
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

  musicGain.gain.setTargetAtTime(0.1, audioContext.currentTime, 0.04);
  scheduleMusicLoop();
  musicTimer = window.setInterval(scheduleMusicLoop, MUSIC_LOOP_SECONDS * 1000);
}

function updateMusicButton() {
  musicToggle.textContent = musicEnabled ? "Music: On" : "Music: Off";
  musicToggle.setAttribute("aria-pressed", String(musicEnabled));
}

function playFoodSound() {
  if (!audioContext || audioContext.state !== "running") return;

  const startTime = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(420, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(840, startTime + 0.08);
  gain.gain.setValueAtTime(0.12, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + 0.12);
}

function playDeathSound() {
  if (!audioContext || audioContext.state !== "running") return;

  const startTime = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(360, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(70, startTime + 0.35);
  gain.gain.setValueAtTime(0.16, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + 0.35);
}

function getTickInterval() {
  return Math.max(MIN_TICK_MS, START_TICK_MS - score * SPEED_UP_PER_FOOD_MS);
}

function drawBoard() {
  context.fillStyle = "#15132d";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "rgb(255 255 255 / 5%)";
  context.lineWidth = 1;
  for (let line = 1; line < GRID_SIZE; line++) {
    const position = line * CELL_SIZE + 0.5;
    context.beginPath();
    context.moveTo(position, 0);
    context.lineTo(position, canvas.height);
    context.moveTo(0, position);
    context.lineTo(canvas.width, position);
    context.stroke();
  }

  if (food) {
    context.fillStyle = "#ff557a";
    context.beginPath();
    context.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE * 0.36,
      0,
      Math.PI * 2
    );
    context.fill();
    context.fillStyle = "#ffd1dc";
    context.fillRect(food.x * CELL_SIZE + 6, food.y * CELL_SIZE + 5, 3, 3);
  }

  snake.forEach((segment, index) => {
    context.fillStyle = index === 0 ? "#a4ff6b" : index % 2 ? "#50d978" : "#38bd68";
    context.fillRect(
      segment.x * CELL_SIZE + 2,
      segment.y * CELL_SIZE + 2,
      CELL_SIZE - 4,
      CELL_SIZE - 4
    );
  });

  drawSnakeEyes();
}

function drawSnakeEyes() {
  const head = snake[0];
  if (!head) return;

  context.fillStyle = "#111026";
  let eyes;
  if (direction.x === 1) {
    eyes = [[head.x * CELL_SIZE + 14, head.y * CELL_SIZE + 6], [head.x * CELL_SIZE + 14, head.y * CELL_SIZE + 12]];
  } else if (direction.x === -1) {
    eyes = [[head.x * CELL_SIZE + 4, head.y * CELL_SIZE + 6], [head.x * CELL_SIZE + 4, head.y * CELL_SIZE + 12]];
  } else if (direction.y === -1) {
    eyes = [[head.x * CELL_SIZE + 6, head.y * CELL_SIZE + 4], [head.x * CELL_SIZE + 12, head.y * CELL_SIZE + 4]];
  } else {
    eyes = [[head.x * CELL_SIZE + 6, head.y * CELL_SIZE + 14], [head.x * CELL_SIZE + 12, head.y * CELL_SIZE + 14]];
  }

  for (const [x, y] of eyes) context.fillRect(x, y, 3, 3);
}

function createFood() {
  const emptyCells = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!snake.some((segment) => segment.x === x && segment.y === y)) {
        emptyCells.push({ x, y });
      }
    }
  }

  if (emptyCells.length === 0) return null;
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function updateScore() {
  scoreDisplay.textContent = String(score);
}

function updateHighScore() {
  highScoreDisplay.textContent = String(highScore);
}

function startGame() {
  stopBackgroundMusic();
  const audioAvailable = prepareAudio();
  window.clearInterval(gameTimer);
  snake = [
    { x: 9, y: 10 },
    { x: 8, y: 10 },
    { x: 7, y: 10 }
  ];
  direction = DIRECTIONS.ArrowRight;
  nextDirection = direction;
  turnQueued = false;
  score = 0;
  food = createFood();
  gameState = "running";
  gameOverlay.hidden = true;
  overlayLabel.textContent = "READY?";
  overlayTitle.textContent = "Snake";
  overlayMessage.textContent = "Use arrow keys or swipe to eat food and grow.";
  updateScore();
  updateHighScore();
  gameStatus.textContent = audioAvailable
    ? "Use arrow keys or swipe on the board to steer."
    : "Audio is unavailable in this browser. Use arrow keys or swipe to play.";
  if (musicEnabled) startBackgroundMusic();
  drawBoard();
  canvas.focus({ preventScroll: true });
  gameTimer = window.setInterval(moveSnake, getTickInterval());
}

function endGame(reason) {
  window.clearInterval(gameTimer);
  stopBackgroundMusic();
  if (reason !== "win") playDeathSound();
  gameState = "over";
  gameOverlay.hidden = false;
  overlayLabel.textContent = reason === "win" ? "BOARD CLEARED" : "GAME OVER";
  overlayTitle.textContent = reason === "win" ? "You win!" : "Game over";
  overlayMessage.textContent = reason === "win"
    ? `You filled the board with a score of ${score}!`
    : `${reason === "wall" ? "You hit a wall" : "You ran into yourself"} · Score: ${score}`;
  startButton.textContent = "Play again";
  gameStatus.textContent = overlayMessage.textContent;
  startButton.focus();
}

function moveSnake() {
  if (gameState !== "running") return;
  direction = nextDirection;
  turnQueued = false;

  const head = snake[0];
  const nextHead = { x: head.x + direction.x, y: head.y + direction.y };
  if (
    nextHead.x < 0 ||
    nextHead.x >= GRID_SIZE ||
    nextHead.y < 0 ||
    nextHead.y >= GRID_SIZE
  ) {
    endGame("wall");
    return;
  }

  const willEat = nextHead.x === food.x && nextHead.y === food.y;
  const bodyToCheck = willEat ? snake : snake.slice(0, -1);
  if (bodyToCheck.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y)) {
    endGame("self");
    return;
  }

  snake.unshift(nextHead);
  if (willEat) {
    playFoodSound();
    const previousTickInterval = getTickInterval();
    score += 1;
    food = createFood();
    updateScore();
    if (score > highScore) {
      highScore = score;
      localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
      updateHighScore();
    }

    const newTickInterval = getTickInterval();
    gameStatus.textContent = newTickInterval < previousTickInterval
      ? `Speed increased! Score: ${score}.`
      : `Maximum speed! Score: ${score}.`;
    if (newTickInterval < previousTickInterval) {
      window.clearInterval(gameTimer);
      gameTimer = window.setInterval(moveSnake, newTickInterval);
    }
    if (!food) {
      drawBoard();
      endGame("win");
      return;
    }
  } else {
    snake.pop();
  }

  drawBoard();
}

function setDirection(candidate) {
  if (gameState !== "running" || turnQueued) return;
  if (candidate.x === -direction.x && candidate.y === -direction.y) return;
  nextDirection = candidate;
  turnQueued = true;
}

document.addEventListener("keydown", (event) => {
  const candidate = DIRECTIONS[event.key];
  if (!candidate || gameState !== "running") return;
  event.preventDefault();
  setDirection(candidate);
});

canvas.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "touch" || gameState !== "running") return;
  swipeStart = { x: event.clientX, y: event.clientY };
});

canvas.addEventListener("pointerup", (event) => {
  if (!swipeStart) return;
  const deltaX = event.clientX - swipeStart.x;
  const deltaY = event.clientY - swipeStart.y;
  swipeStart = undefined;
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 20) return;

  const candidate = Math.abs(deltaX) > Math.abs(deltaY)
    ? { x: Math.sign(deltaX), y: 0 }
    : { x: 0, y: Math.sign(deltaY) };
  setDirection(candidate);
});

canvas.addEventListener("pointercancel", () => {
  swipeStart = undefined;
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);
musicToggle.addEventListener("click", () => {
  musicEnabled = !musicEnabled;
  localStorage.setItem(MUSIC_STORAGE_KEY, String(musicEnabled));
  updateMusicButton();
  if (musicEnabled) {
    if (!prepareAudio()) {
      gameStatus.textContent = "Background music is unavailable in this browser.";
    } else if (gameState === "running") {
      startBackgroundMusic();
    }
  } else {
    stopBackgroundMusic();
  }
});

snake = [
  { x: 9, y: 10 },
  { x: 8, y: 10 },
  { x: 7, y: 10 }
];
direction = DIRECTIONS.ArrowRight;
food = { x: 15, y: 10 };
score = 0;
updateScore();
updateHighScore();
drawBoard();
updateMusicButton();
