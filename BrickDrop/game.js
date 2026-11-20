// ===== Settings =====
const COLS = 10; // board width in blocks
const ROWS = 20; // board height in blocks
const BLOCK = 30; // size of one block in pixels
const PREVIEW_BLOCK = 20;
const START_COLUMN = 4;
const START_ROW = 0;
const BASE_DROP_DELAY = 800;
const DROP_SPEED_FACTOR = 0.85;
const MIN_DROP_DELAY = 50;
const LINES_PER_LEVEL = 10;
const ROW_FLASH_DURATION = 150;
const ROW_FADE_DURATION = 300;
const BEST_SCORE_KEY = "brickDropBestScore";
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const previewCanvas = document.getElementById("next-piece");
const previewCtx = previewCanvas.getContext("2d");
const soundToggle = document.getElementById("sound-toggle");
const messageDisplay = document.getElementById("message");
const bestScoreDisplay = document.getElementById("best-score");
// ===== The pieces =====
// Each piece is a small grid (matrix): 1 = block, 0 = empty
const SHAPES = [
[[1, 1, 1, 1]], // I
[[1, 1], [1, 1]], // O
[[0, 1, 0], [1, 1, 1]], // T
[[1, 0, 0], [1, 1, 1]], // J
[[0, 0, 1], [1, 1, 1]], // L
[[0, 1, 1], [1, 1, 0]], // S
[[1, 1, 0], [0, 1, 1]], // Z
];
const COLORS = ["#00c8ff", "#ffd500", "#b34dff", "#3d6bff", "#ff8c1a",
"#33cc33", "#ff3b3b"];
const LINE_CLEAR_SCORES = [0, 100, 300, 500, 800];
const R = "#ff3b3b", B = "#3d6bff", G = "#33cc33";
// ===== The board =====
// A matrix of 20 rows x 10 columns.
// 0 = empty, a color = a block that has already landed there.
function createBoard() {
const newBoard = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
newBoard[18] = [0, R, 0, 0, 0, B, 0, 0, G, 0];
newBoard[19] = [R, R, 0, B, B, B, 0, G, G, 0];
return newBoard;
}
let board = createBoard();
let score = 0;
let lines = 0;
let level = 1;
let bestScore = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
let gravityTimer;
// ===== The falling piece =====
function createPiece() {
const index = Math.floor(Math.random() * SHAPES.length);
return {
shape: SHAPES[index],
color: COLORS[index],
x: START_COLUMN,
y: START_ROW,
};
}
let piece = {
shape: SHAPES[2],
color: COLORS[2],
x: START_COLUMN,
y: START_ROW,
};
let nextPiece = createPiece();
let gameState = "title";
let clearingRows = false;
let flashingRows = new Set();
let rowFadeOpacity = 1;
let rowFlashOpacity = 0;
let soundsMuted = false;
let soundContext;
let soundOutput;
const SOUND_EFFECTS = {
rotate: [{ frequency: 660, delay: 0, duration: 0.06 }],
drop: [{ frequency: 180, delay: 0, duration: 0.12 }],
lineClear: [
{ frequency: 523, delay: 0, duration: 0.12 },
{ frequency: 659, delay: 0.08, duration: 0.12 },
{ frequency: 784, delay: 0.16, duration: 0.16 },
],
gameOver: [
{ frequency: 392, delay: 0, duration: 0.15 },
{ frequency: 330, delay: 0.12, duration: 0.15 },
{ frequency: 262, delay: 0.24, duration: 0.22 },
],
};
// ===== Drawing =====
function drawBlock(x, y, color) {
ctx.fillStyle = color;
ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK - 1, BLOCK - 1); // -1 leaves a small gap.
}
function drawPiece(shape, x, y, color) {
shape.forEach((row, r) => {
row.forEach((value, c) => {
if (value) drawBlock(x + c, y + r, color);
});
});
}
function getLandingRow() {
let landingY = piece.y;
while (canMoveTo(piece.x, landingY + 1)) {
landingY++;
}
return landingY;
}
function draw() {
ctx.clearRect(0, 0, canvas.width, canvas.height);
// 1. The blocks that have landed
board.forEach((row, y) => {
ctx.save();
if (flashingRows.has(y)) ctx.globalAlpha = rowFadeOpacity;
row.forEach((cell, x) => {
   if (cell) drawBlock(x, y, cell);
});
ctx.restore();
});
if (flashingRows.size > 0) {
ctx.save();
ctx.globalAlpha = rowFlashOpacity;
ctx.fillStyle = "#ffffff";
flashingRows.forEach((row) => {
ctx.fillRect(0, row * BLOCK, canvas.width, BLOCK - 1);
});
ctx.restore();
}
// 2. The falling piece: its own grid, moved to its position on the board
if ((gameState === "playing" || gameState === "paused") && !clearingRows) {
ctx.save();
ctx.globalAlpha = 0.25;
drawPiece(piece.shape, piece.x, getLandingRow(), piece.color);
ctx.restore();
drawPiece(piece.shape, piece.x, piece.y, piece.color);
}
if (gameState !== "playing") drawStatusOverlay();
drawNextPiece();
}
function drawStatusOverlay() {
const overlayText = {
title: ["BrickDrop", "Press any key to start"],
paused: ["Paused", "Press P to resume"],
gameover: ["Game over!", "Press any key to restart"],
}[gameState];
ctx.save();
ctx.fillStyle = "rgba(15, 15, 30, 0.78)";
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = "#ffffff";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.font = "bold 30px system-ui, sans-serif";
ctx.fillText(overlayText[0], canvas.width / 2, canvas.height / 2 - 20);
ctx.font = "16px system-ui, sans-serif";
ctx.fillText(overlayText[1], canvas.width / 2, canvas.height / 2 + 20);
ctx.restore();
}
function drawNextPiece() {
previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
if (gameState === "gameover") return;
const shapeWidth = nextPiece.shape[0].length * PREVIEW_BLOCK;
const shapeHeight = nextPiece.shape.length * PREVIEW_BLOCK;
const offsetX = (previewCanvas.width - shapeWidth) / 2;
const offsetY = (previewCanvas.height - shapeHeight) / 2;
nextPiece.shape.forEach((row, r) => {
row.forEach((value, c) => {
if (value) {
previewCtx.fillStyle = nextPiece.color;
previewCtx.fillRect(
offsetX + c * PREVIEW_BLOCK,
offsetY + r * PREVIEW_BLOCK,
PREVIEW_BLOCK - 1,
PREVIEW_BLOCK - 1
);
}
});
});
}
function canMoveTo(x, y, shape = piece.shape) {
return shape.every((row, r) =>
row.every((value, c) => {
if (!value) return true;
const nextX = x + c;
const nextY = y + r;
return nextX >= 0 && nextX < COLS && nextY >= 0 && nextY < ROWS &&
!board[nextY][nextX];
})
);
}
function initializeAudio() {
if (!soundContext) {
soundContext = new AudioContext();
soundOutput = soundContext.createGain();
soundOutput.gain.value = 1;
soundOutput.connect(soundContext.destination);
}
if (soundContext.state === "suspended") soundContext.resume();
}
function playSound(effect) {
if (soundsMuted) return;
initializeAudio();
const now = soundContext.currentTime;
SOUND_EFFECTS[effect].forEach(({ frequency, delay, duration }) => {
const oscillator = soundContext.createOscillator();
const volume = soundContext.createGain();
const startTime = now + delay;
oscillator.type = "sine";
oscillator.frequency.setValueAtTime(frequency, startTime);
volume.gain.setValueAtTime(0.0001, startTime);
volume.gain.exponentialRampToValueAtTime(0.12, startTime + 0.01);
volume.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
oscillator.connect(volume);
volume.connect(soundOutput);
oscillator.start(startTime);
oscillator.stop(startTime + duration);
});
}
function getDropDelay() {
return Math.max(MIN_DROP_DELAY, BASE_DROP_DELAY * DROP_SPEED_FACTOR ** (level - 1));
}
function resetGravityTimer() {
clearInterval(gravityTimer);
gravityTimer = undefined;
if (gameState === "playing") {
gravityTimer = setInterval(dropPiece, getDropDelay());
}
}
soundToggle.addEventListener("click", () => {
soundsMuted = !soundsMuted;
soundToggle.textContent = soundsMuted ? "Unmute sounds" : "Mute sounds";
soundToggle.setAttribute("aria-pressed", String(soundsMuted));
if (soundOutput) {
soundOutput.gain.setValueAtTime(soundsMuted ? 0 : 1, soundContext.currentTime);
}
});
function findFullRows() {
return board.reduce((fullRows, row, index) => {
if (row.every((cell) => cell !== 0)) fullRows.push(index);
return fullRows;
}, []);
}
function clearFullRows(rowsToClear) {
const rowsToRemove = new Set(rowsToClear);
board = board.filter((_, index) => !rowsToRemove.has(index));
board.unshift(...Array.from({ length: rowsToClear.length }, () => Array(COLS).fill(0)));
score += LINE_CLEAR_SCORES[rowsToClear.length] * level;
lines += rowsToClear.length;
document.getElementById("score").textContent = score;
document.getElementById("lines").textContent = lines;
if (score > bestScore) {
bestScore = score;
bestScoreDisplay.textContent = bestScore;
localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
}
playSound("lineClear");
const newLevel = Math.floor(lines / LINES_PER_LEVEL) + 1;
if (newLevel !== level) {
level = newLevel;
document.getElementById("level").textContent = level;
resetGravityTimer();
}
}
function spawnNextPiece() {
piece = { ...nextPiece, x: START_COLUMN, y: START_ROW };
nextPiece = createPiece();
if (!canMoveTo(piece.x, piece.y)) {
gameState = "gameover";
messageDisplay.textContent = "Game over!";
resetGravityTimer();
playSound("gameOver");
}
}
function lockPiece() {
piece.shape.forEach((row, r) => {
row.forEach((value, c) => {
if (value) board[piece.y + r][piece.x + c] = piece.color;
});
});
const fullRows = findFullRows();
if (fullRows.length === 0) {
spawnNextPiece();
return;
}
clearingRows = true;
flashingRows = new Set(fullRows);
rowFadeOpacity = 1;
rowFlashOpacity = 0.85;
const animationStart = performance.now();
function animateRows(timestamp) {
const elapsed = timestamp - animationStart;
if (elapsed < ROW_FLASH_DURATION) {
rowFadeOpacity = 1;
rowFlashOpacity = 0.85;
} else {
const fadeProgress = Math.min(1, (elapsed - ROW_FLASH_DURATION) / ROW_FADE_DURATION);
rowFadeOpacity = 1 - fadeProgress;
rowFlashOpacity = 0.85 * (1 - fadeProgress);
}
draw();
if (elapsed < ROW_FLASH_DURATION + ROW_FADE_DURATION) {
requestAnimationFrame(animateRows);
return;
}
clearFullRows(fullRows);
flashingRows.clear();
rowFadeOpacity = 1;
rowFlashOpacity = 0;
clearingRows = false;
spawnNextPiece();
draw();
}
requestAnimationFrame(animateRows);
}
function startNewGame() {
board = createBoard();
score = 0;
lines = 0;
level = 1;
piece = {
shape: SHAPES[2],
color: COLORS[2],
x: START_COLUMN,
y: START_ROW,
};
nextPiece = createPiece();
gameState = "playing";
clearingRows = false;
flashingRows.clear();
rowFadeOpacity = 1;
rowFlashOpacity = 0;
document.getElementById("score").textContent = score;
document.getElementById("lines").textContent = lines;
document.getElementById("level").textContent = level;
messageDisplay.textContent = "";
resetGravityTimer();
draw();
}
function handleAction(action) {
if (gameState === "title" || gameState === "gameover") {
startNewGame();
return;
}
if (action === "pause") {
if (clearingRows) return;
gameState = gameState === "paused" ? "playing" : "paused";
messageDisplay.textContent = gameState === "paused" ? "Paused - press P to resume" : "";
resetGravityTimer();
draw();
return;
}
if (gameState !== "playing" || clearingRows) return;
if (!soundsMuted) initializeAudio();
if (action === "drop") {
while (canMoveTo(piece.x, piece.y + 1)) {
piece.y++;
}
playSound("drop");
lockPiece();
draw();
return;
}
if (action === "rotate") {
const rotatedShape = piece.shape[0].map((_, column) =>
piece.shape.map((row) => row[column]).reverse()
);
if (canMoveTo(piece.x, piece.y, rotatedShape)) {
piece.shape = rotatedShape;
playSound("rotate");
draw();
}
return;
}
const moves = {
left: [-1, 0],
right: [1, 0],
down: [0, 1],
};
const move = moves[action];
if (!move) return;
const nextX = piece.x + move[0];
const nextY = piece.y + move[1];
if (canMoveTo(nextX, nextY)) {
piece.x = nextX;
piece.y = nextY;
draw();
}
}
document.addEventListener("keydown", (event) => {
if (gameState === "title" || gameState === "gameover") {
if (event.code === "Space" || event.key.startsWith("Arrow")) event.preventDefault();
startNewGame();
return;
}
if (event.key.toLowerCase() === "p") {
event.preventDefault();
handleAction("pause");
return;
}
const actions = {
ArrowLeft: "left",
ArrowRight: "right",
ArrowDown: "down",
ArrowUp: "rotate",
};
const action = event.code === "Space" ? "drop" : actions[event.key];
if (!action) return;
event.preventDefault();
if (action === "drop" && event.repeat) return;
handleAction(action);
});
// ===== Mobile touch controls =====

const touchButtons = document.querySelectorAll(
    ".touch-controls [data-action]"
);

touchButtons.forEach((button) => {
    const action = button.dataset.action;

    let holdTimer = null;
    let repeatTimer = null;

    function stopHolding() {
        clearTimeout(holdTimer);
        clearInterval(repeatTimer);

        holdTimer = null;
        repeatTimer = null;
    }

    button.addEventListener("pointerdown", (event) => {
        event.preventDefault();

        if (gameState === "title" || gameState === "gameover") {
            handleAction(action);
            return;
        }

        if (action === "rotate" || action === "drop") {
            handleAction(action);
            return;
        }

        handleAction(action);

        // Wait briefly before repeating movement
        holdTimer = setTimeout(() => {
            repeatTimer = setInterval(() => {
                handleAction(action);
            }, 90);
        }, 180);
    });

    button.addEventListener("pointerup", stopHolding);
    button.addEventListener("pointerleave", stopHolding);
    button.addEventListener("pointercancel", stopHolding);
    button.addEventListener("lostpointercapture", stopHolding);
});
function dropPiece() {
if (gameState !== "playing" || clearingRows) return;
const nextY = piece.y + 1;
if (canMoveTo(piece.x, nextY)) {
piece.y = nextY;
} else {
lockPiece();
}
draw();
}
bestScoreDisplay.textContent = bestScore;
messageDisplay.textContent = "Press any key to start";
draw();