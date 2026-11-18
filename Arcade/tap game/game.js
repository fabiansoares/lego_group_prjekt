import { drawBackground } from "./background.js";
import { createBuilding, drawBuildings, updateBuildings } from "./buildings.js";
import { burstConfetti, drawConfetti, updateConfetti } from "./confetti.js";
import { getTopScores, isLeaderboardConfigured, submitScore } from "./leaderboard-api.js";
import {
  playSoundEffect,
  prepareAudio,
  setBackgroundMusicEnabled,
  startBackgroundMusic,
  stopBackgroundMusic
} from "./background-music.js";
import {
  createPlayer,
  crashPlayer,
  drawPlayer,
  jumpPlayer,
  PLAYER_SKINS,
  resetPlayer,
  updatePlayer
} from "./player.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const pauseButton = document.getElementById("pause");
const musicToggle = document.getElementById("music-toggle");
const startScreen = document.getElementById("start-screen");
const startTitle = document.getElementById("start-title");
const startMessage = document.getElementById("start-message");
const leaderboardList = document.getElementById("leaderboard-list");
const leaderboardStatus = document.getElementById("leaderboard-status");
const startLeaderboardList = document.getElementById("start-leaderboard-list");
const startLeaderboardStatus = document.getElementById("start-leaderboard-status");
const skinShopToggle = document.getElementById("skin-shop-toggle");
const skinShop = document.getElementById("skin-shop");
const skinItems = document.getElementById("skin-items");
const shopCoinBalance = document.getElementById("shop-coin-balance");
const skinShopStatus = document.getElementById("skin-shop-status");
const scoreForm = document.getElementById("score-form");
const playerNameInput = document.getElementById("player-name");
const submitScoreButton = document.getElementById("submit-score");
const DAY_NIGHT_CYCLE_SECONDS = 120;
const SHIELD_SPAWN_CHANCE = {
easy: 0.3,
normal: 0.2,
hard: 0.12
};
const SHIELD_SIZE = 24;
const SHIELD_INVULNERABILITY_FRAMES = 90;
const COIN_SIZE = 20;
const COIN_MIN_X_OFFSET = 30;
const COIN_MAX_X_OFFSET = 150;
const DIFFICULTY_LABELS = new Map([
["easy", "Easy"],
["normal", "Normal"],
["hard", "Hard"]
]);
const player = createPlayer(canvas.height);
const buildings = [];
const confetti = [];
const floatingScores = [];
const powerups = [];
const coinPickups = [];
const checkedBuildings = new WeakSet();
const skinById = new Map(PLAYER_SKINS.map((skin) => [skin.id, skin]));
const storedCoinBalance = Number(localStorage.getItem("buildingCoins"));
let coinBalance = Number.isSafeInteger(storedCoinBalance) && storedCoinBalance >= 0
  ? storedCoinBalance
  : 0;
const ownedSkinIds = new Set([
  "classic",
  ...(localStorage.getItem("buildingOwnedSkins") || "")
    .split(",")
    .filter((skinId) => skinById.has(skinId))
]);
let equippedSkinId = localStorage.getItem("buildingEquippedSkin") || "classic";
if (!ownedSkinIds.has(equippedSkinId)) equippedSkinId = "classic";
let gameOver = false;
let gameStarted = false;
let paused = document.hidden;
let difficulty = "normal";
let score = 0;
let extraLives = 0;
let invulnerabilityFrames = 0;
let dayNightTime = DAY_NIGHT_CYCLE_SECONDS * 0.25;
let lastFrameTime;
let scoreSubmitted = false;
let musicEnabled = localStorage.getItem("gameMusicEnabled") !== "false";
const storedHighScore = Number(localStorage.getItem("buildingHighScore"));
let highScore = Number.isSafeInteger(storedHighScore) && storedHighScore >= 0
  ? storedHighScore
  : 0;

function updatePauseButton() {
pauseButton.textContent = paused ? "Resume" : "Pause";
pauseButton.setAttribute("aria-pressed", String(paused));
}

function updateMusicButton() {
musicToggle.textContent = musicEnabled ? "Music: On" : "Music: Off";
musicToggle.setAttribute("aria-pressed", String(musicEnabled));
}

function setLeaderboardStatus(message, isError = false) {
for (const status of [leaderboardStatus, startLeaderboardStatus]) {
status.textContent = message;
status.classList.toggle("error", isError);
}
}

function renderLeaderboard(scores) {
for (const list of [leaderboardList, startLeaderboardList]) {
list.replaceChildren();
if (scores.length === 0) {
const emptyEntry = document.createElement("li");
emptyEntry.textContent = "No scores yet.";
list.append(emptyEntry);
continue;
}

for (const entry of scores) {
const row = document.createElement("li");
row.className = "leaderboard-row";
const name = document.createElement("span");
name.textContent = entry.player_name;
const scoreValue = document.createElement("strong");
scoreValue.textContent = String(entry.score);
name.className = "leaderboard-player";
const difficultyValue = document.createElement("span");
difficultyValue.className = "leaderboard-difficulty";
difficultyValue.textContent = `Difficulty: ${DIFFICULTY_LABELS.get(entry.difficulty) || "Unknown"}`;
row.append(name, difficultyValue, scoreValue);
list.append(row);
}
}
}

function updateSkinShop() {
shopCoinBalance.textContent = String(coinBalance);
skinShopToggle.textContent = `Skin shop - ${coinBalance} coins`;
skinItems.replaceChildren();

for (const skin of PLAYER_SKINS) {
const isOwned = ownedSkinIds.has(skin.id);
const isEquipped = equippedSkinId === skin.id;
const button = document.createElement("button");
button.type = "button";
button.className = "skin-option";
button.dataset.skinId = skin.id;
button.setAttribute("aria-pressed", String(isEquipped));
button.disabled = isEquipped || (!isOwned && coinBalance < skin.price);

const preview = document.createElement("canvas");
preview.className = "skin-preview";
preview.width = 34;
preview.height = 48;
preview.setAttribute("aria-hidden", "true");
const previewPlayer = createPlayer(preview.height);
previewPlayer.x = 0;
drawPlayer(preview.getContext("2d"), previewPlayer, skin);

const name = document.createElement("span");
name.textContent = skin.name;
const action = document.createElement("span");
action.className = "skin-option-action";
action.textContent = isEquipped
  ? "Equipped"
  : isOwned
    ? "Equip"
    : coinBalance >= skin.price
      ? `Buy - ${skin.price} coins`
      : `Need ${skin.price}`;
button.append(preview, name, action);
skinItems.append(button);
}
}

function errorMessage(error) {
return error instanceof Error ? error.message : "An unexpected error occurred.";
}

async function loadLeaderboard() {
if (!isLeaderboardConfigured()) {
setLeaderboardStatus("Configure Supabase to enable the worldwide leaderboard.");
return;
}

setLeaderboardStatus("Loading top scores...");
try {
const scores = await getTopScores();
renderLeaderboard(scores);
setLeaderboardStatus(scores.length ? "Top five scores worldwide." : "No scores yet.");
} catch (error) {
setLeaderboardStatus(`Couldn't load scores: ${errorMessage(error)}`, true);
}
}

scoreForm.addEventListener("submit", async (event) => {
event.preventDefault();
if (!gameOver || !isLeaderboardConfigured() || scoreSubmitted) return;

submitScoreButton.disabled = true;
setLeaderboardStatus("Submitting your score...");
try {
await submitScore(playerNameInput.value, score, difficulty);
scoreSubmitted = true;
} catch (error) {
setLeaderboardStatus(`Couldn't submit score: ${errorMessage(error)}`, true);
submitScoreButton.disabled = false;
return;
}

try {
const scores = await getTopScores();
renderLeaderboard(scores);
setLeaderboardStatus("Score submitted.");
} catch (error) {
setLeaderboardStatus(
  `Score submitted, but couldn't refresh the leaderboard: ${errorMessage(error)}`,
  true
);
}
});

startScreen.addEventListener("click", (event) => {
const shopToggle = event.target.closest("#skin-shop-toggle");
if (shopToggle) {
skinShop.hidden = !skinShop.hidden;
shopToggle.setAttribute("aria-expanded", String(!skinShop.hidden));
return;
}

const skinButton = event.target.closest("[data-skin-id]");
if (skinButton) {
const skin = skinById.get(skinButton.dataset.skinId);
if (!skin || skinButton.disabled) return;

if (!ownedSkinIds.has(skin.id)) {
coinBalance -= skin.price;
ownedSkinIds.add(skin.id);
localStorage.setItem("buildingCoins", String(coinBalance));
localStorage.setItem("buildingOwnedSkins", [...ownedSkinIds].join(","));
}
equippedSkinId = skin.id;
localStorage.setItem("buildingEquippedSkin", equippedSkinId);
skinShopStatus.textContent = `${skin.name} skin equipped.`;
updateSkinShop();
return;
}

const difficultyButton = event.target.closest("[data-difficulty]");
if (difficultyButton) startGame(difficultyButton.dataset.difficulty);
});

pauseButton.addEventListener("click", () => {
paused = !paused;
updatePauseButton();
if (paused) {
stopBackgroundMusic();
} else if (gameStarted && !gameOver && musicEnabled) {
startBackgroundMusic();
}
});

musicToggle.addEventListener("click", () => {
musicEnabled = !musicEnabled;
localStorage.setItem("gameMusicEnabled", String(musicEnabled));
setBackgroundMusicEnabled(musicEnabled);
if (musicEnabled) startBackgroundMusic();
updateMusicButton();
});

document.addEventListener("visibilitychange", () => {
if (document.hidden) {
paused = true;
updatePauseButton();
stopBackgroundMusic();
}
});

function startGame(selectedDifficulty) {
resetPlayer(player, canvas.height);
buildings.length = 0;
difficulty = selectedDifficulty;
paused = false;
updatePauseButton();
buildings.push(createBuilding(canvas.width + 80, undefined, false, difficulty));
confetti.length = 0;
floatingScores.length = 0;
powerups.length = 0;
coinPickups.length = 0;
gameOver = false;
gameStarted = true;
startScreen.hidden = true;
skinShop.hidden = true;
skinShopToggle.setAttribute("aria-expanded", "false");
prepareAudio();
if (musicEnabled) startBackgroundMusic();
score = 0;
extraLives = 0;
invulnerabilityFrames = 0;
scoreSubmitted = false;
submitScoreButton.disabled = true;
scoreForm.hidden = true;
}

function addFloatingMessage(text) {
floatingScores.push({
x: player.x + player.width / 2,
y: player.y - 8,
age: 0,
lifetime: 45,
text
});
}

function spawnShield(building) {
if (Math.random() >= SHIELD_SPAWN_CHANCE[difficulty]) return;

const gapTop = building.gapTopPosition * canvas.height + building.gapOffset;
const gapBottom = gapTop + building.gapHeight;
const y = (gapTop + gapBottom) / 2;
powerups.push({
building,
x: building.x + building.width / 2,
y,
size: SHIELD_SIZE
});
}

function spawnCoin(building) {
const xOffset =
  COIN_MIN_X_OFFSET + Math.random() * (COIN_MAX_X_OFFSET - COIN_MIN_X_OFFSET);
coinPickups.push({
building,
x: building.x - xOffset,
y: COIN_SIZE / 2 + Math.random() * (canvas.height - COIN_SIZE),
xOffset,
size: COIN_SIZE
});
}

function updatePowerups() {
const activeBuildings = new Set(buildings);
for (let index = powerups.length - 1; index >= 0; index--) {
const powerup = powerups[index];
if (!activeBuildings.has(powerup.building)) {
powerups.splice(index, 1);
continue;
}

powerup.x = powerup.building.x + powerup.building.width / 2;
powerup.y =
  powerup.building.gapTopPosition * canvas.height +
  powerup.building.gapOffset +
  powerup.building.gapHeight / 2;
const left = powerup.x - powerup.size / 2;
const top = powerup.y - powerup.size / 2;
const overlapsPlayer =
  player.x < left + powerup.size &&
  player.x + player.width > left &&
  player.y < top + powerup.size &&
  player.y + player.height > top;
if (overlapsPlayer) {
extraLives += 1;
playSoundEffect("shield");
addFloatingMessage("EXTRA LIFE!");
powerups.splice(index, 1);
}
}
}

function updateCoins() {
const activeBuildings = new Set(buildings);
for (let index = coinPickups.length - 1; index >= 0; index--) {
const coin = coinPickups[index];
if (!activeBuildings.has(coin.building)) {
coinPickups.splice(index, 1);
continue;
}

coin.x = coin.building.x - coin.xOffset;
const left = coin.x - coin.size / 2;
const top = coin.y - coin.size / 2;
const overlapsPlayer =
  player.x < left + coin.size &&
  player.x + player.width > left &&
  player.y < top + coin.size &&
  player.y + player.height > top;
if (!overlapsPlayer) continue;

if (coinBalance < Number.MAX_SAFE_INTEGER) {
coinBalance += 1;
localStorage.setItem("buildingCoins", String(coinBalance));
updateSkinShop();
addFloatingMessage("+1 COIN");
}
playSoundEffect("coin");
coinPickups.splice(index, 1);
}
}

function drawCoin(x, y, size) {
ctx.fillStyle = "#facc15";
ctx.strokeStyle = "#a16207";
ctx.lineWidth = 2;
ctx.beginPath();
ctx.arc(x, y, size / 2, 0, Math.PI * 2);
ctx.fill();
ctx.stroke();
ctx.fillStyle = "#fff3a3";
ctx.beginPath();
ctx.arc(x - size * 0.15, y - size * 0.17, size * 0.12, 0, Math.PI * 2);
ctx.fill();
}

function drawShield(x, y, size) {
ctx.save();
ctx.translate(x, y);
ctx.fillStyle = "#56d5f5";
ctx.strokeStyle = "#075985";
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(0, -size / 2);
ctx.lineTo(size * 0.42, -size * 0.34);
ctx.lineTo(size * 0.34, size * 0.08);
ctx.quadraticCurveTo(size * 0.2, size * 0.38, 0, size / 2);
ctx.quadraticCurveTo(-size * 0.2, size * 0.38, -size * 0.34, size * 0.08);
ctx.lineTo(-size * 0.42, -size * 0.34);
ctx.closePath();
ctx.fill();
ctx.stroke();
ctx.strokeStyle = "#fff";
ctx.lineWidth = 3;
ctx.beginPath();
ctx.moveTo(0, -size * 0.22);
ctx.lineTo(0, size * 0.22);
ctx.moveTo(-size * 0.2, 0);
ctx.lineTo(size * 0.2, 0);
ctx.stroke();
ctx.restore();
}

function updateFloatingScores() {
for (let index = floatingScores.length - 1; index >= 0; index--) {
const popup = floatingScores[index];
popup.y -= 1.2;
popup.age += 1;
if (popup.age >= popup.lifetime) floatingScores.splice(index, 1);
}
}

function drawFloatingScores() {
for (const popup of floatingScores) {
ctx.save();
ctx.globalAlpha = 1 - popup.age / popup.lifetime;
ctx.font = "bold 24px sans-serif";
ctx.textAlign = "center";
ctx.lineWidth = 3;
ctx.strokeStyle = "#263238";
const text = popup.text || "+1";
ctx.strokeText(text, popup.x, popup.y);
ctx.fillStyle = "#fff";
ctx.fillText(text, popup.x, popup.y);
ctx.restore();
}
ctx.textAlign = "left";
}

function handleAction() {
if (paused || !gameStarted || gameOver) return;
jumpPlayer(player);
}

document.addEventListener("keydown", (event) => {
if (event.code === "Space") {
event.preventDefault();
if (!event.repeat) handleAction();
}
});
canvas.addEventListener("pointerdown", handleAction);

function update(deltaSeconds) {
if (paused || !gameStarted) return;
dayNightTime = (dayNightTime + deltaSeconds) % DAY_NIGHT_CYCLE_SECONDS;
updateConfetti(confetti, canvas.height);
updateFloatingScores();
if (gameOver) {
updatePlayer(player, canvas.height);
return;
}

updatePlayer(player, canvas.height);
const result = updateBuildings(
  buildings,
  player,
  canvas.width,
  canvas.height,
  score,
  difficulty
);
for (const building of buildings) {
if (checkedBuildings.has(building)) continue;
checkedBuildings.add(building);
spawnShield(building);
spawnCoin(building);
}
updatePowerups();
updateCoins();
if (invulnerabilityFrames > 0) invulnerabilityFrames -= 1;
const previousScore = score;
score += result.passed;
if (score > highScore) {
highScore = score;
localStorage.setItem("buildingHighScore", String(highScore));
}
for (let index = 0; index < result.passed; index++) {
addFloatingMessage("+1");
}
for (let milestone = Math.floor(previousScore / 20) + 1;
  milestone <= Math.floor(score / 20);
  milestone++) {
  burstConfetti(confetti, canvas.width, canvas.height);
}
if (result.collided && invulnerabilityFrames === 0) {
if (extraLives > 0) {
extraLives -= 1;
invulnerabilityFrames = SHIELD_INVULNERABILITY_FRAMES;
addFloatingMessage("SAVED!");
} else {
crashPlayer(player);
gameOver = true;
stopBackgroundMusic();
playSoundEffect("crash");
submitScoreButton.disabled = !isLeaderboardConfigured();
scoreForm.hidden = !isLeaderboardConfigured();
startTitle.textContent = "Game over";
startMessage.textContent = "Enter your name to submit your score, or choose a difficulty to play again";
startScreen.hidden = false;
}
}

}

function draw() {
ctx.clearRect(0, 0, canvas.width, canvas.height);
drawBackground(ctx, canvas.width, canvas.height, dayNightTime / DAY_NIGHT_CYCLE_SECONDS);
ctx.fillStyle = "#487a49";
ctx.fillRect(0, canvas.height - 8, canvas.width, 8);

if (gameStarted) {
drawBuildings(ctx, buildings, canvas.height);
for (const powerup of powerups) {
drawShield(powerup.x, powerup.y, powerup.size);
}
for (const coin of coinPickups) {
drawCoin(coin.x, coin.y, coin.size);
}
if (invulnerabilityFrames > 0) {
ctx.beginPath();
ctx.arc(
  player.x + player.width / 2,
  player.y + player.height / 2,
  32,
  0,
  Math.PI * 2
);
ctx.fillStyle = "rgba(86, 213, 245, 0.35)";
ctx.fill();
ctx.strokeStyle = "#56d5f5";
ctx.lineWidth = 2;
ctx.stroke();
}
drawPlayer(ctx, player, skinById.get(equippedSkinId));
}

if (paused) {
ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = "#fff";
ctx.textAlign = "center";
ctx.font = "bold 32px sans-serif";
ctx.fillText("Paused", canvas.width / 2, canvas.height / 2);
}

if (gameStarted) {
ctx.textAlign = "left";
ctx.fillStyle = gameOver ? "#fff" : "#222";
ctx.font = "20px sans-serif";
ctx.fillText(`Buildings: ${score}`, 12, 28);
ctx.fillText(`High score: ${highScore}`, 12, 52);
ctx.fillText(`Extra lives: ${extraLives}`, 12, 76);
ctx.fillText(`Coins: ${coinBalance}`, 12, 100);

drawConfetti(ctx, confetti);
drawFloatingScores();
}
}

function loop(timestamp) {
const deltaSeconds = lastFrameTime === undefined
  ? 0
  : Math.min((timestamp - lastFrameTime) / 1000, 0.1);
lastFrameTime = timestamp;
update(deltaSeconds);
draw();
requestAnimationFrame(loop);
}

updatePauseButton();
setBackgroundMusicEnabled(musicEnabled);
updateMusicButton();
updateSkinShop();
loadLeaderboard();
loop();