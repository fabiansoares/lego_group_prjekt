// Game settings
function shouldUseResponsiveViewport() {
return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 620 || window.innerHeight < 480 || window.innerHeight > window.innerWidth;
}
const useResponsiveViewport = shouldUseResponsiveViewport();
window.addEventListener("resize", () => {
if (shouldUseResponsiveViewport() !== useResponsiveViewport) {
window.location.reload();
}
});
const config = {
type: Phaser.AUTO,
width: 800,
height: 450,
parent: "game-container",
backgroundColor: "#080b1e",
physics: {
default: "arcade",
arcade: { gravity: { y: 910 }, debug: false }
},
scale: { mode: useResponsiveViewport ? Phaser.Scale.RESIZE : Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
input: { activePointers: 3 },
scene: { create, update }
};
const game = new Phaser.Game(config);
const WORLD_WIDTH = 10000000;
const START_X = 100;
const START_Y = 274;
const START_PLATFORM_Y = 330;
let startPlayerY = START_Y;
let startPlatformY = START_PLATFORM_Y;
const PLATFORM_WIDTH = 64;
const PLATFORM_HEIGHT = 48;
const PLATFORM_GENERATION_DISTANCE = 900;
const PLATFORMS_PER_LEVEL = 8;
const HIGH_SCORE_KEY = "asteroidPlatformerHighScore";
const PLAYER_NAME_KEY = "asteroidPlatformerPlayerName";
const COIN_BALANCE_KEY = "asteroidPlatformerCoins";
const UNLOCKED_CHARACTERS_KEY = "asteroidPlatformerUnlockedCharacters";
const SELECTED_CHARACTER_KEY = "asteroidPlatformerSelectedCharacter";
const MAX_LIVES = 3;
const SUPABASE_REST_URL = "https://eupbvguswztlaxcfrkgd.supabase.co/rest/v1";
const SUPABASE_ANON_KEY = "sb_publishable_SPLHqJhCjbDbgSZZ-KdNUw_T5Bg5Z3Y";
const SPACE_CHARACTERS = [
{ id: "astronaut", name: "Astronaut", cost: 0 },
{ id: "alien", name: "Martian", cost: 18 },
{ id: "robot", name: "Starbot", cost: 35 },
{ id: "spacecat", name: "Cosmic Cat", cost: 55 },
{ id: "moonknight", name: "Moon Knight", cost: 80 },
{ id: "spacepirate", name: "Space Pirate", cost: 110 },
{ id: "nebulamage", name: "Nebula Wizard", cost: 145 },
{ id: "cometfox", name: "Comet Fox", cost: 185 }
];
let player, platforms, coins, aliens, cursors, spaceBackground, scoreText, coinHudText, livesText, levelText;
let score = 0, highScore = 0, highScoreText, canScoreLanding = false;
let lives = MAX_LIVES, isRespawning = false;
let level = 1, platformsSinceLevel = 0;
let audioMuted = false;
let touchControls = { left: false, right: false, jump: false };
let touchPointerIds = { left: new Set(), right: new Set(), jump: new Set() };
let touchButtons = {}, touchControlLayer;
let coinBalance = 0, unlockedCharacters = [], selectedCharacter = "astronaut";
let characterShopContainer = null;
let levelCompleteOverlay = null;
let pauseButton, musicButton, muteButton, pauseOverlay, isGamePaused = false;
let gameStarted = false;
let nextPlatformX, lastPlatformY;
let musicContext, musicMaster, soundEffectsMaster, musicTimer, musicStep = 0, musicEnabled = true;
function isCompactLayout(width, height) {
return width < 620 || height > width || (useResponsiveViewport && height < 480);
}
function updateTouchButton(control) {
const button = touchButtons[control];
if (!button) {
return;
}
const pressed = touchControls[control];
button.background.setFillStyle(pressed ? 0x2d78a3 : 0x142b45, pressed ? 0.96 : 0.72);
button.background.setStrokeStyle(2, pressed ? 0x9ee5ff : 0x71d2f4, 0.9);
}
function setTouchControl(control, pointerId, pressed) {
if (pressed) {
touchPointerIds[control].add(pointerId);
} else {
touchPointerIds[control].delete(pointerId);
}
touchControls[control] = touchPointerIds[control].size > 0;
updateTouchButton(control);
}
function clearTouchControls() {
for (const control of Object.keys(touchPointerIds)) {
touchPointerIds[control].clear();
touchControls[control] = false;
updateTouchButton(control);
}
}
function getCharacterTexture(characterId, pose) {
if (characterId === "astronaut") {
return pose === "idle" ? "player" : `player_${pose}`;
}
return `player_${characterId}_${pose}`;
}
function readUnlockedCharacters() {
let stored;
try {
stored = JSON.parse(localStorage.getItem(UNLOCKED_CHARACTERS_KEY));
} catch (error) {
console.error("Could not read unlocked characters:", error);
}
const validIds = SPACE_CHARACTERS.map((character) => character.id);
return [...new Set(["astronaut", ...(Array.isArray(stored) ? stored.filter((id) => validIds.includes(id)) : [])])];
}
function saveUnlockedCharacters() {
localStorage.setItem(UNLOCKED_CHARACTERS_KEY, JSON.stringify(unlockedCharacters));
}
function openCharacterShop(scene) {
if (characterShopContainer) {
return;
}
const shop = scene.add.container(0, 0).setScrollFactor(0).setDepth(30);
characterShopContainer = shop;
const viewportWidth = scene.scale.width;
const viewportHeight = scene.scale.height;
const compact = viewportWidth < 620;
const centerX = viewportWidth / 2;
const centerY = viewportHeight / 2;
const panelWidth = Math.min(720, viewportWidth - 24);
const panelHeight = Math.min(compact ? 620 : 380, viewportHeight - 24);
const panelTop = centerY - panelHeight / 2;
const coinCounterWasVisible = coinHudText.visible;
coinHudText.setVisible(false);
const livesCounterWasVisible = livesText.visible;
livesText.setVisible(false);
const levelCounterWasVisible = levelText.visible;
levelText.setVisible(false);
const pauseButtonWasVisible = pauseButton.visible;
const musicButtonWasVisible = musicButton.visible;
const muteButtonWasVisible = muteButton.visible;
pauseButton.setVisible(false);
musicButton.setVisible(false);
muteButton.setVisible(false);
shop.add(scene.add.rectangle(centerX, centerY, viewportWidth, viewportHeight, 0x030916, 0.82));
shop.add(scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x071226, 1).setStrokeStyle(2, 0x71d2f4, 0.95));
shop.add(scene.add.text(centerX, panelTop + (compact ? 56 : 34), "SPACE CHARACTER SHOP", {
fontFamily: "Arial",
fontSize: compact ? "22px" : "28px",
fontStyle: "bold",
color: "#9ee5ff"
}).setOrigin(0.5));
const walletText = scene.add.text(centerX, panelTop + (compact ? 84 : 66), `Your coins: ${coinBalance}`, {
fontFamily: "Arial",
fontSize: "18px",
fontStyle: "bold",
color: "#ffe58a"
}).setOrigin(0.5);
shop.add(walletText);
const rows = SPACE_CHARACTERS.map((character, index) => {
const column = index % 2;
const rowCenterX = compact ? centerX : centerX + (column === 0 ? -panelWidth * 0.23 : panelWidth * 0.23);
const y = compact ? panelTop + 122 + index * 42 : panelTop + 122 + Math.floor(index / 2) * 51;
const rowWidth = compact ? Math.min(320, panelWidth - 24) : 320;
const background = scene.add.rectangle(rowCenterX, y, rowWidth, 40, 0x10233a, 1).setStrokeStyle(1, 0x34506b, 1);
shop.add(background);
const imageX = compact ? rowCenterX - rowWidth / 2 + 20 : rowCenterX - 127;
const labelX = compact ? rowCenterX - rowWidth / 2 + 42 : rowCenterX - 95;
const actionX = compact ? rowCenterX + rowWidth / 2 - 48 : rowCenterX + 105;
shop.add(scene.add.image(imageX, y, getCharacterTexture(character.id, "idle")).setScale(0.6));
shop.add(scene.add.text(labelX, y - 7, character.name, {
fontFamily: "Arial",
fontSize: compact ? "14px" : "15px",
fontStyle: "bold",
color: "#ffffff"
}).setOrigin(0, 0.5));
shop.add(scene.add.text(labelX, y + 10, character.cost === 0 ? "FREE" : `${character.cost} coins`, {
fontFamily: "Arial",
fontSize: "13px",
color: "#c5d6e8"
}).setOrigin(0, 0.5));
const action = scene.add.text(actionX, y, "", {
fontFamily: "Arial",
fontSize: "12px",
fontStyle: "bold",
color: "#71d2f4",
backgroundColor: "#142b45",
padding: { x: 7, y: 6 }
}).setOrigin(0.5);
shop.add(action);
return { character, background, action };
});
const statusText = scene.add.text(centerX, panelTop + panelHeight - 54, "Collect coins by landing on asteroids to unlock new pilots.", {
fontFamily: "Arial",
fontSize: compact ? "12px" : "14px",
color: "#c5d6e8"
}).setOrigin(0.5);
shop.add(statusText);
const closeButton = scene.add.text(centerX, panelTop + panelHeight - 24, "CLOSE", {
fontFamily: "Arial",
fontSize: "15px",
fontStyle: "bold",
color: "#71d2f4",
backgroundColor: "#142b45",
padding: { x: 18, y: 6 }
}).setOrigin(0.5);
shop.add(closeButton);
const refreshRows = () => {
walletText.setText(`Your coins: ${coinBalance}`);
for (const row of rows) {
const owned = unlockedCharacters.includes(row.character.id);
const equipped = selectedCharacter === row.character.id;
row.action.setText(equipped ? "EQUIPPED" : owned ? "SELECT" : `BUY ${row.character.cost}`);
row.action.setColor(equipped ? "#9ee5ff" : owned ? "#71d2f4" : coinBalance >= row.character.cost ? "#ffe58a" : "#c5d6e8");
row.background.setStrokeStyle(1, equipped ? 0x71d2f4 : 0x34506b, 1);
}
};
refreshRows();
const closeShop = () => {
if (characterShopContainer !== shop) {
return;
}
scene.input.off("pointerdown", handleShopPointer);
scene.input.keyboard.off("keydown", handleShopKey);
scene.events.off("shutdown", closeShop);
characterShopContainer = null;
shop.destroy();
coinHudText.setVisible(coinCounterWasVisible);
livesText.setVisible(livesCounterWasVisible);
levelText.setVisible(levelCounterWasVisible);
pauseButton.setVisible(pauseButtonWasVisible);
musicButton.setVisible(musicButtonWasVisible);
muteButton.setVisible(muteButtonWasVisible);
};
const handleShopPointer = (pointer) => {
if (Phaser.Geom.Rectangle.Contains(closeButton.getBounds(), pointer.x, pointer.y)) {
closeShop();
return;
}
const row = rows.find((item) => Phaser.Geom.Rectangle.Contains(item.action.getBounds(), pointer.x, pointer.y));
if (!row) {
return;
}
const character = row.character;
if (unlockedCharacters.includes(character.id)) {
selectedCharacter = character.id;
localStorage.setItem(SELECTED_CHARACTER_KEY, selectedCharacter);
player.setTexture(getCharacterTexture(selectedCharacter, "idle"));
statusText.setText(`${character.name} is ready for your next run!`);
} else if (coinBalance >= character.cost) {
coinBalance -= character.cost;
unlockedCharacters.push(character.id);
localStorage.setItem(COIN_BALANCE_KEY, String(coinBalance));
saveUnlockedCharacters();
if (coinHudText) {
coinHudText.setText(`Coins: ${coinBalance}`);
}
statusText.setText(`${character.name} unlocked! Select it to equip.`);
} else {
statusText.setText(`You need ${character.cost - coinBalance} more coins for ${character.name}.`);
}
refreshRows();
};
const handleShopKey = (event) => {
if (event.code === "Escape") {
closeShop();
}
};
scene.input.on("pointerdown", handleShopPointer);
scene.input.keyboard.on("keydown", handleShopKey);
scene.events.once("shutdown", closeShop);
}
function playMusicTone(frequency, duration, volume, waveform = "sine") {
const now = musicContext.currentTime;
const oscillator = musicContext.createOscillator();
const envelope = musicContext.createGain();
oscillator.type = waveform;
oscillator.frequency.setValueAtTime(frequency, now);
envelope.gain.setValueAtTime(0.0001, now);
envelope.gain.linearRampToValueAtTime(volume, now + Math.min(0.08, duration / 4));
envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
oscillator.connect(envelope);
envelope.connect(musicMaster);
oscillator.start(now);
oscillator.stop(now + duration + 0.05);
}
function playMusicChord(notes, duration) {
for (const note of notes) {
playMusicTone(note, duration, 0.035);
}
}
function playMusicKick() {
const now = musicContext.currentTime;
const oscillator = musicContext.createOscillator();
const envelope = musicContext.createGain();
oscillator.type = "sine";
oscillator.frequency.setValueAtTime(120, now);
oscillator.frequency.exponentialRampToValueAtTime(45, now + 0.16);
envelope.gain.setValueAtTime(0.16, now);
envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
oscillator.connect(envelope);
envelope.connect(musicMaster);
oscillator.start(now);
oscillator.stop(now + 0.22);
}
function playEffectTone(frequency, startTime, duration, volume, waveform = "sine", endFrequency = frequency) {
if (!musicContext || !soundEffectsMaster) {
return;
}
const oscillator = musicContext.createOscillator();
const envelope = musicContext.createGain();
oscillator.type = waveform;
oscillator.frequency.setValueAtTime(frequency, startTime);
if (endFrequency !== frequency) {
oscillator.frequency.exponentialRampToValueAtTime(endFrequency, startTime + duration);
}
envelope.gain.setValueAtTime(0.0001, startTime);
envelope.gain.linearRampToValueAtTime(volume, startTime + Math.min(0.012, duration / 4));
envelope.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
oscillator.connect(envelope);
envelope.connect(soundEffectsMaster);
oscillator.start(startTime);
oscillator.stop(startTime + duration + 0.01);
}
function playCoinSound() {
if (!musicContext) {
return;
}
const now = musicContext.currentTime;
for (const [index, frequency] of [880, 1174.66, 1567.98].entries()) {
playEffectTone(frequency, now + index * 0.07, 0.15, 0.3);
}
}
function playJumpSound() {
if (!musicContext) {
return;
}
playEffectTone(260, musicContext.currentTime, 0.13, 0.2, "triangle", 620);
}
function playEnemyDefeatSound() {
if (!musicContext) {
return;
}
const now = musicContext.currentTime;
playEffectTone(740, now, 0.11, 0.18, "square", 370);
playEffectTone(520, now + 0.07, 0.13, 0.14, "triangle", 260);
}
function playHurtSound() {
if (!musicContext) {
return;
}
const now = musicContext.currentTime;
playEffectTone(440, now, 0.55, 0.22, "triangle", 110);
playEffectTone(220, now, 0.58, 0.12, "sine", 55);
}
function playLevelCompleteSound() {
if (!musicContext) {
return;
}
const now = musicContext.currentTime;
for (const [index, frequency] of [523.25, 659.25, 783.99, 1046.5].entries()) {
playEffectTone(frequency, now + index * 0.1, 0.22, 0.2, "triangle");
}
}
function playBackgroundStep() {
if (!musicContext || !musicEnabled) {
return;
}
const chords = [
{ bass: 110, notes: [220, 261.63, 329.63] },
{ bass: 87.31, notes: [174.61, 220, 261.63] },
{ bass: 65.41, notes: [196, 261.63, 329.63] },
{ bass: 98, notes: [196, 246.94, 293.66] }
];
const melody = [
659.25, 0, 523.25, 440, 392, 0, 440, 523.25,
440, 0, 523.25, 659.25, 698.46, 0, 659.25, 523.25,
392, 0, 523.25, 659.25, 783.99, 0, 659.25, 523.25,
587.33, 0, 493.88, 392, 440, 0, 392, 329.63
];
const step = musicStep % melody.length;
const beat = step % 8;
const chord = chords[Math.floor(step / 8)];
if (beat === 0) {
playMusicChord(chord.notes, 2.2);
playMusicKick();
}
if (beat === 0 || beat === 4) {
playMusicTone(chord.bass, 0.48, 0.12, "triangle");
}
if (beat % 2 === 0) {
playMusicTone(chord.notes[(beat / 2) % chord.notes.length] * 2, 0.26, 0.025);
}
if (melody[step]) {
playMusicTone(melody[step], 0.27, 0.075, "triangle");
}
musicStep++;
}
function startBackgroundMusic() {
const AudioContextType = window.AudioContext || window.webkitAudioContext;
if (!AudioContextType) {
console.error("Background music is unavailable because Web Audio is not supported.");
return;
}
if (!musicContext) {
musicContext = new AudioContextType();
musicMaster = musicContext.createGain();
musicMaster.gain.value = musicEnabled && !audioMuted ? 0.18 : 0;
musicMaster.connect(musicContext.destination);
soundEffectsMaster = musicContext.createGain();
soundEffectsMaster.gain.value = audioMuted ? 0 : 0.4;
soundEffectsMaster.connect(musicContext.destination);
}
musicContext.resume().catch((error) => console.error("Could not start background music:", error));
if (!musicTimer) {
playBackgroundStep();
musicTimer = window.setInterval(playBackgroundStep, 300);
}
}
function toggleBackgroundMusic() {
musicEnabled = !musicEnabled;
if (musicButton) {
musicButton.setText(`MUSIC: ${musicEnabled ? "ON" : "OFF"}`);
}
if (!musicContext) {
if (musicEnabled) {
startBackgroundMusic();
}
return;
}
musicMaster.gain.setTargetAtTime(musicEnabled && !audioMuted ? 0.18 : 0, musicContext.currentTime, 0.08);
if (musicEnabled) {
musicContext.resume().catch((error) => console.error("Could not resume background music:", error));
}
}
function toggleMute() {
audioMuted = !audioMuted;
if (muteButton) {
muteButton.setText(audioMuted ? "UNMUTE" : "MUTE");
}
if (!musicContext) {
return;
}
const now = musicContext.currentTime;
if (audioMuted) {
musicMaster.gain.setValueAtTime(0, now);
soundEffectsMaster.gain.setValueAtTime(0, now);
} else {
musicMaster.gain.setTargetAtTime(musicEnabled ? 0.18 : 0, now, 0.08);
soundEffectsMaster.gain.setTargetAtTime(0.4, now, 0.04);
musicContext.resume().catch((error) => console.error("Could not resume audio:", error));
}
}
function toggleGamePause(scene) {
if (!gameStarted || isRespawning || levelCompleteOverlay) {
return;
}
isGamePaused = !isGamePaused;
if (isGamePaused) {
scene.physics.world.pause();
clearTouchControls();
touchControlLayer.setVisible(false);
const viewportWidth = scene.scale.width;
const viewportHeight = scene.scale.height;
const centerX = viewportWidth / 2;
const centerY = viewportHeight / 2;
const compact = isCompactLayout(viewportWidth, viewportHeight);
pauseOverlay = scene.add.container(0, 0).setScrollFactor(0).setDepth(20);
pauseOverlay.add(scene.add.rectangle(centerX, centerY, viewportWidth, viewportHeight, 0x030916, 0.72));
pauseOverlay.add(scene.add.rectangle(centerX, centerY, Math.min(380, viewportWidth - 32), 150, 0x071226, 1).setStrokeStyle(2, 0x71d2f4, 0.95));
pauseOverlay.add(scene.add.text(centerX, centerY - 20, "PAUSED", {
fontFamily: "Arial",
fontSize: "34px",
fontStyle: "bold",
color: "#9ee5ff"
}).setOrigin(0.5));
pauseOverlay.add(scene.add.text(centerX, centerY + 28, compact ? "Tap RESUME or press P" : "Click RESUME or press P", {
fontFamily: "Arial",
fontSize: "17px",
color: "#c5d6e8"
}).setOrigin(0.5));
pauseButton.setText("RESUME");
} else {
if (pauseOverlay) {
pauseOverlay.destroy();
pauseOverlay = null;
}
scene.physics.world.resume();
pauseButton.setText("PAUSE");
touchControlLayer.setVisible(true);
}
}
function drawAstronaut(g, pose, characterId = "astronaut") {
const palettes = {
astronaut: { suit: 0xe8eef2, trim: 0x9aa8b4, accent: 0x71d2f4, console: 0x35536d, helmet: 0xe8eef2, visor: 0x29475e, shine: 0x9ee5ff, badge: 0xffbd59 },
alien: { suit: 0x67d9a8, trim: 0x238b72, accent: 0xb5ffe1, console: 0x205d63, helmet: 0x8bf0bf, visor: 0x174c55, shine: 0xd4fff0, badge: 0xf3ff64 },
robot: { suit: 0xb9c9dc, trim: 0x62798f, accent: 0xffc857, console: 0x263954, helmet: 0xc3d0df, visor: 0x182b48, shine: 0x59e5ff, badge: 0xffc857 },
spacecat: { suit: 0xb08cff, trim: 0x7055aa, accent: 0xffa3e8, console: 0x493568, helmet: 0xc8aaff, visor: 0x312554, shine: 0xffd7f7, badge: 0xffd66e },
moonknight: { suit: 0x9ca9db, trim: 0x515e8d, accent: 0xb8e6ff, console: 0x263552, helmet: 0xd9e4ff, visor: 0x202c50, shine: 0xffffff, badge: 0xf7de7e },
spacepirate: { suit: 0x9d526b, trim: 0x512d4b, accent: 0xffc56a, console: 0x3e273c, helmet: 0xc27582, visor: 0x291e32, shine: 0xffe6c6, badge: 0xffc56a },
nebulamage: { suit: 0x6a58b5, trim: 0x382c71, accent: 0x8df8ff, console: 0x33256a, helmet: 0x8b70db, visor: 0x201842, shine: 0xd4fcff, badge: 0xffa8e8 },
cometfox: { suit: 0xe88c4a, trim: 0x9c4c32, accent: 0xffd36b, console: 0x68351f, helmet: 0xf3a760, visor: 0x472634, shine: 0xfff0cf, badge: 0x61e5ff }
};
const colors = palettes[characterId] || palettes.astronaut;
g.fillStyle(0x758594);
g.fillRect(3, 22, 6, 14);
g.fillStyle(colors.suit);
g.fillRect(8, 20, 16, 19);
if (pose === "jump") {
g.fillRect(2, 20, 7, 9);
g.fillRect(23, 20, 7, 9);
} else if (pose === "run1") {
g.fillRect(3, 20, 6, 11);
g.fillRect(23, 25, 6, 10);
} else if (pose === "run2") {
g.fillRect(3, 25, 6, 10);
g.fillRect(23, 20, 6, 11);
} else {
g.fillRect(4, 23, 5, 12);
g.fillRect(23, 23, 5, 12);
}
g.fillStyle(colors.trim);
if (pose === "jump") {
g.fillRect(0, 26, 6, 4);
g.fillRect(26, 26, 6, 4);
g.fillRect(9, 36, 6, 5);
g.fillRect(17, 36, 6, 5);
g.fillRect(12, 40, 7, 5);
g.fillRect(18, 40, 7, 5);
} else if (pose === "run1") {
g.fillRect(3, 30, 7, 4);
g.fillRect(23, 31, 7, 4);
g.fillRect(8, 35, 6, 7);
g.fillRect(18, 34, 6, 7);
g.fillRect(3, 41, 10, 5);
g.fillRect(18, 40, 10, 5);
} else if (pose === "run2") {
g.fillRect(3, 31, 7, 4);
g.fillRect(23, 30, 7, 4);
g.fillRect(8, 34, 6, 7);
g.fillRect(18, 35, 6, 7);
g.fillRect(2, 40, 10, 5);
g.fillRect(19, 41, 10, 5);
} else {
g.fillRect(3, 34, 7, 4);
g.fillRect(22, 34, 7, 4);
g.fillRect(9, 36, 6, 8);
g.fillRect(17, 36, 6, 8);
g.fillRect(8, 43, 8, 5);
g.fillRect(16, 43, 8, 5);
}
g.fillStyle(colors.console);
g.fillRect(12, 25, 8, 8);
g.fillStyle(colors.accent);
g.fillRect(14, 27, 4, 3);
g.fillStyle(colors.badge);
g.fillCircle(11, 24, 1);
g.fillCircle(21, 24, 1);
g.fillStyle(colors.helmet);
g.fillCircle(16, 11, 11);
g.lineStyle(2, colors.trim);
g.strokeCircle(16, 11, 10);
g.fillStyle(colors.visor);
g.fillCircle(16, 11, 7);
g.fillStyle(colors.shine);
g.fillCircle(13, 8, 2);
if (characterId === "alien") {
g.fillStyle(colors.helmet);
g.fillCircle(16, 11, 5);
g.fillStyle(colors.visor);
g.fillCircle(13, 11, 1.5);
g.fillCircle(19, 11, 1.5);
g.fillStyle(colors.accent);
g.fillCircle(16, 14, 1);
g.lineStyle(2, colors.accent);
g.lineBetween(16, 2, 16, 0);
g.fillCircle(16, 1, 2);
} else if (characterId === "robot") {
g.fillStyle(colors.accent);
g.fillRect(14, 1, 4, 3);
g.fillRect(15, 0, 2, 2);
g.fillStyle(colors.shine);
g.fillRect(12, 9, 3, 2);
g.fillRect(17, 9, 3, 2);
g.fillStyle(colors.trim);
g.fillRect(13, 14, 6, 1);
} else if (characterId === "spacecat") {
g.fillStyle(colors.helmet);
g.beginPath();
g.moveTo(7, 8);
g.lineTo(8, 0);
g.lineTo(14, 5);
g.closePath();
g.fillPath();
g.beginPath();
g.moveTo(18, 5);
g.lineTo(24, 0);
g.lineTo(25, 8);
g.closePath();
g.fillPath();
g.fillStyle(colors.accent);
g.fillCircle(13, 11, 1);
g.fillCircle(19, 11, 1);
} else if (characterId === "moonknight") {
g.lineStyle(2, colors.accent);
g.lineBetween(16, 3, 16, 18);
g.lineBetween(10, 7, 22, 7);
g.fillStyle(colors.badge);
g.fillCircle(22, 30, 2);
} else if (characterId === "spacepirate") {
g.lineStyle(2, colors.accent);
g.lineBetween(8, 8, 24, 14);
g.fillStyle(colors.trim);
g.fillCircle(16, 11, 3);
g.fillStyle(colors.badge);
g.fillCircle(16, 11, 1);
} else if (characterId === "nebulamage") {
g.fillStyle(colors.trim);
g.beginPath();
g.moveTo(6, 7);
g.lineTo(16, 0);
g.lineTo(26, 7);
g.closePath();
g.fillPath();
g.fillStyle(colors.accent);
g.fillCircle(16, 3, 2);
g.fillStyle(colors.badge);
g.fillCircle(11, 29, 1.5);
g.fillCircle(21, 33, 1.5);
} else if (characterId === "cometfox") {
g.fillStyle(colors.helmet);
g.beginPath();
g.moveTo(7, 8);
g.lineTo(8, 0);
g.lineTo(15, 6);
g.closePath();
g.fillPath();
g.beginPath();
g.moveTo(17, 6);
g.lineTo(24, 0);
g.lineTo(25, 8);
g.closePath();
g.fillPath();
g.fillStyle(colors.accent);
g.fillCircle(13, 11, 1);
g.fillCircle(19, 11, 1);
g.fillCircle(16, 30, 2);
}
}
function create() {
// Make simple colored blocks as graphics, so we don't need image files yet
const g = this.make.graphics({ x: 0, y: 0, add: false });
drawAstronaut(g, "idle");
g.generateTexture("player", 32, 48);
g.clear();
drawAstronaut(g, "run1");
g.generateTexture("player_run1", 32, 48);
g.clear();
drawAstronaut(g, "run2");
g.generateTexture("player_run2", 32, 48);
g.clear();
drawAstronaut(g, "jump");
g.generateTexture("player_jump", 32, 48);
for (const character of SPACE_CHARACTERS.slice(1)) {
for (const pose of ["idle", "run1", "run2", "jump"]) {
g.clear();
drawAstronaut(g, pose, character.id);
g.generateTexture(getCharacterTexture(character.id, pose), 32, 48);
}
}
g.clear();
g.fillStyle(0x080b1e);
g.fillRect(0, 0, 800, 450);
g.fillStyle(0x30245f, 0.2);
g.fillCircle(180, 130, 130);
g.fillStyle(0x174060, 0.18);
g.fillCircle(610, 300, 160);
const starColors = [0xffffff, 0xaadfff, 0xffe6b3];
for (let i = 0; i < 180; i++) {
g.fillStyle(starColors[Phaser.Math.Between(0, starColors.length - 1)]);
g.fillCircle(
Phaser.Math.Between(0, 799),
Phaser.Math.Between(0, 449),
Phaser.Math.Between(1, 2)
);
}
g.fillStyle(0xf6bd4b, 0.16);
g.fillCircle(690, 105, 55);
g.fillStyle(0xffa844);
g.fillCircle(690, 105, 37);
g.fillStyle(0xffe58a);
g.fillCircle(681, 96, 27);
g.lineStyle(4, 0xc98bff, 0.75);
g.strokeEllipse(265, 286, 104, 24);
g.fillStyle(0x527db8);
g.fillCircle(265, 286, 31);
g.fillStyle(0x82acd8, 0.8);
g.fillEllipse(256, 276, 34, 13);
g.fillStyle(0x365985, 0.75);
g.fillCircle(275, 294, 22);
g.lineStyle(3, 0x85d7ca, 0.7);
g.strokeEllipse(510, 185, 74, 19);
g.fillStyle(0x328c99);
g.fillCircle(510, 185, 23);
g.fillStyle(0x74c9bd, 0.8);
g.fillCircle(504, 178, 15);
g.fillStyle(0x246574, 0.75);
g.fillCircle(517, 190, 16);
g.fillStyle(0xffa344);
g.beginPath();
g.moveTo(405, 94);
g.lineTo(389, 89);
g.lineTo(396, 98);
g.lineTo(389, 107);
g.lineTo(405, 102);
g.closePath();
g.fillPath();
g.fillStyle(0xffe58a);
g.fillCircle(400, 98, 3);
g.fillStyle(0x70849b);
g.beginPath();
g.moveTo(416, 91);
g.lineTo(425, 77);
g.lineTo(441, 91);
g.closePath();
g.fillPath();
g.beginPath();
g.moveTo(416, 105);
g.lineTo(425, 119);
g.lineTo(441, 105);
g.closePath();
g.fillPath();
g.fillStyle(0xe8eef2);
g.beginPath();
g.moveTo(466, 98);
g.lineTo(447, 89);
g.lineTo(414, 89);
g.lineTo(404, 94);
g.lineTo(396, 94);
g.lineTo(401, 98);
g.lineTo(396, 102);
g.lineTo(404, 102);
g.lineTo(414, 107);
g.lineTo(447, 107);
g.closePath();
g.fillPath();
g.lineStyle(2, 0x52667d);
g.strokePath();
g.fillStyle(0x4ab4dc);
g.fillCircle(439, 98, 5);
g.fillStyle(0xc5f3ff);
g.fillCircle(437, 96, 2);
g.fillStyle(0xff7468);
g.fillRect(412, 96, 9, 4);
g.fillStyle(0x398bd0, 0.2);
g.fillCircle(145, 154, 54);
g.fillStyle(0x176fbd);
g.fillCircle(145, 154, 44);
g.fillStyle(0x55ad62);
g.beginPath();
g.moveTo(117, 137);
g.lineTo(126, 128);
g.lineTo(139, 131);
g.lineTo(144, 139);
g.lineTo(137, 146);
g.lineTo(133, 155);
g.lineTo(122, 150);
g.closePath();
g.fillPath();
g.beginPath();
g.moveTo(143, 156);
g.lineTo(154, 159);
g.lineTo(159, 167);
g.lineTo(153, 175);
g.lineTo(150, 188);
g.lineTo(144, 181);
g.lineTo(141, 171);
g.lineTo(136, 165);
g.closePath();
g.fillPath();
g.beginPath();
g.moveTo(151, 133);
g.lineTo(161, 137);
g.lineTo(166, 145);
g.lineTo(158, 150);
g.lineTo(151, 146);
g.closePath();
g.fillPath();
g.fillStyle(0xe4f7ff, 0.75);
g.fillEllipse(127, 128, 22, 6);
g.fillEllipse(158, 169, 23, 5);
g.fillEllipse(139, 190, 16, 4);
g.lineStyle(2, 0x8ed5ff, 0.8);
g.strokeCircle(145, 154, 44);
g.generateTexture("space", 800, 450);
g.clear();
g.fillStyle(0x626d78);
g.beginPath();
g.moveTo(14, 1);
g.lineTo(28, 0);
g.lineTo(43, 2);
g.lineTo(55, 6);
g.lineTo(63, 17);
g.lineTo(61, 30);
g.lineTo(54, 40);
g.lineTo(42, 46);
g.lineTo(27, 48);
g.lineTo(14, 44);
g.lineTo(4, 36);
g.lineTo(0, 24);
g.lineTo(4, 12);
g.closePath();
g.fillPath();
g.lineStyle(2, 0x414b55);
g.strokePath();
g.fillStyle(0x7b8791);
g.beginPath();
g.moveTo(8, 15);
g.lineTo(17, 7);
g.lineTo(30, 5);
g.lineTo(24, 14);
g.lineTo(15, 20);
g.closePath();
g.fillPath();
g.fillStyle(0x505a64);
g.beginPath();
g.moveTo(39, 13);
g.lineTo(54, 10);
g.lineTo(59, 20);
g.lineTo(50, 25);
g.lineTo(42, 22);
g.closePath();
g.fillPath();
g.fillStyle(0x48515b);
g.fillCircle(20, 29, 5);
g.fillCircle(46, 33, 4);
g.fillStyle(0x929ca6);
g.fillCircle(19, 28, 2);
g.fillCircle(45, 32, 1.5);
g.generateTexture("asteroid", PLATFORM_WIDTH, PLATFORM_HEIGHT);
g.clear();
g.fillStyle(0xffcf4a);
g.fillCircle(12, 12, 10);
g.fillStyle(0xfff0a3);
g.fillCircle(12, 12, 7);
g.fillStyle(0xffbd36);
g.fillRect(10, 4, 4, 16);
g.fillStyle(0xffffff, 0.9);
g.fillCircle(8, 7, 2);
g.generateTexture("coin", 24, 24);
g.clear();
g.fillStyle(0x55d96b);
g.fillEllipse(16, 11, 24, 22);
g.fillStyle(0x3aa64e);
g.fillRect(7, 18, 18, 14);
g.fillStyle(0x171b2e);
g.fillEllipse(11, 12, 6, 9);
g.fillEllipse(21, 12, 6, 9);
g.fillStyle(0xf4ffff);
g.fillCircle(12, 11, 1.5);
g.fillCircle(22, 11, 1.5);
g.fillStyle(0x8cff93);
g.fillRect(9, 29, 6, 5);
g.fillRect(17, 29, 6, 5);
g.lineStyle(2, 0x22653e);
g.lineBetween(13, 20, 19, 20);
g.generateTexture("enemy_alien", 32, 36);
g.clear();
g.fillStyle(0xd7e3ea);
g.fillRect(5, 3, 3, 29);
g.fillStyle(0xffcc48);
g.beginPath();
g.moveTo(8, 4);
g.lineTo(25, 10);
g.lineTo(8, 17);
g.closePath();
g.fillPath();
g.fillStyle(0xfff0a3);
g.fillCircle(12, 10, 2);
g.generateTexture("level_flag", 28, 34);
g.destroy();
const viewportWidth = this.scale.width;
const viewportHeight = this.scale.height;
startPlatformY = viewportHeight * (START_PLATFORM_Y / 450);
startPlayerY = startPlatformY - (START_PLATFORM_Y - START_Y);
spaceBackground = this.add.tileSprite(0, 0, viewportWidth, viewportHeight, "space")
.setOrigin(0)
.setScrollFactor(0)
.setDepth(-1);
// Keep the world wide so platforms can continue generating ahead.
this.physics.world.setBounds(0, 0, WORLD_WIDTH, viewportHeight);
this.cameras.main.setBounds(0, 0, WORLD_WIDTH, viewportHeight);
platforms = this.physics.add.staticGroup();
coins = this.physics.add.group();
aliens = this.physics.add.group();
const storedCoins = Number(localStorage.getItem(COIN_BALANCE_KEY));
coinBalance = Number.isSafeInteger(storedCoins) && storedCoins >= 0 ? storedCoins : 0;
unlockedCharacters = readUnlockedCharacters();
const storedCharacter = localStorage.getItem(SELECTED_CHARACTER_KEY);
selectedCharacter = unlockedCharacters.includes(storedCharacter) ? storedCharacter : "astronaut";
level = 1;
platformsSinceLevel = 0;
nextPlatformX = START_X;
lastPlatformY = startPlatformY;
platforms.create(START_X, startPlatformY, "asteroid");
generatePlatformsUntil(START_X + PLATFORM_GENERATION_DISTANCE, this);
// The player
player = this.physics.add.sprite(START_X, startPlayerY, getCharacterTexture(selectedCharacter, "idle"));
player.setCollideWorldBounds(true);
this.physics.add.collider(player, platforms, countAsteroidLanding);
this.physics.add.collider(aliens, platforms);
this.physics.add.collider(player, aliens, handlePlayerAlienCollision, null, this);
this.physics.add.overlap(player, coins, collectCoin, null, this);
scoreText = this.add.text(16, 16, "Asteroids: 0", {
fontFamily: "Arial",
fontSize: "22px",
fontStyle: "bold",
color: "#ffffff",
stroke: "#080b1e",
strokeThickness: 4
}).setScrollFactor(0).setDepth(10);
const storedHighScore = Number(localStorage.getItem(HIGH_SCORE_KEY));
highScore = Number.isSafeInteger(storedHighScore) && storedHighScore >= 0 ? storedHighScore : 0;
highScoreText = this.add.text(16, 44, `Highscore: ${highScore}`, {
fontFamily: "Arial",
fontSize: "18px",
fontStyle: "bold",
color: "#ffe58a",
stroke: "#080b1e",
strokeThickness: 4
}).setScrollFactor(0).setDepth(10);
scoreText.setVisible(false);
highScoreText.setVisible(false);
coinHudText = this.add.text(viewportWidth - 16, 58, `Coins: ${coinBalance}`, {
fontFamily: "Arial",
fontSize: "18px",
fontStyle: "bold",
color: "#ffe58a",
stroke: "#080b1e",
strokeThickness: 4
}).setOrigin(1, 0).setScrollFactor(0).setDepth(25);
lives = MAX_LIVES;
livesText = this.add.text(viewportWidth - 16, 84, `Lives: ${lives}`, {
fontFamily: "Arial",
fontSize: "18px",
fontStyle: "bold",
color: "#ff9b8e",
stroke: "#080b1e",
strokeThickness: 4
}).setOrigin(1, 0).setScrollFactor(0).setDepth(25);
levelText = this.add.text(40, 72, `Level: ${level}`, {
fontFamily: "Arial",
fontSize: "18px",
fontStyle: "bold",
color: "#9ee5ff",
stroke: "#080b1e",
strokeThickness: 4
}).setScrollFactor(0).setDepth(25);
coinHudText.setVisible(false);
livesText.setVisible(false);
levelText.setVisible(false);
pauseButton = this.add.text(viewportWidth - 155, viewportHeight - 30, "PAUSE", {
fontFamily: "Arial",
fontSize: "14px",
fontStyle: "bold",
color: "#9ee5ff",
backgroundColor: "#142b45",
padding: { x: 10, y: 6 }
}).setOrigin(0.5).setScrollFactor(0).setDepth(25).setInteractive({ useHandCursor: true }).setVisible(false);
musicButton = this.add.text(viewportWidth - 54, viewportHeight - 30, `MUSIC: ${musicEnabled ? "ON" : "OFF"}`, {
fontFamily: "Arial",
fontSize: "14px",
fontStyle: "bold",
color: "#ffe58a",
backgroundColor: "#142b45",
padding: { x: 8, y: 6 }
}).setOrigin(0.5).setScrollFactor(0).setDepth(25).setInteractive({ useHandCursor: true });
muteButton = this.add.text(viewportWidth - 245, viewportHeight - 30, audioMuted ? "UNMUTE" : "MUTE", {
fontFamily: "Arial",
fontSize: "14px",
fontStyle: "bold",
color: "#ff9b8e",
backgroundColor: "#142b45",
padding: { x: 10, y: 6 }
}).setOrigin(0.5).setScrollFactor(0).setDepth(25).setInteractive({ useHandCursor: true });
touchControls = { left: false, right: false, jump: false };
touchPointerIds = { left: new Set(), right: new Set(), jump: new Set() };
touchButtons = {};
touchControlLayer = this.add.container(0, 0).setScrollFactor(0).setDepth(25).setVisible(false);
const touchButtonSpecs = [
{ control: "left", x: 54, y: viewportHeight - 54, radius: 36, label: "◀" },
{ control: "right", x: 136, y: viewportHeight - 54, radius: 36, label: "▶" },
{ control: "jump", x: viewportWidth - 54, y: viewportHeight - 54, radius: 42, label: "JUMP" }
];
for (const spec of touchButtonSpecs) {
const background = this.add.circle(spec.x, spec.y, spec.radius, 0x142b45, 0.72)
.setStrokeStyle(2, 0x71d2f4, 0.9);
const label = this.add.text(spec.x, spec.y, spec.label, {
fontFamily: "Arial",
fontSize: spec.control === "jump" ? "14px" : "25px",
fontStyle: "bold",
color: "#ffffff"
}).setOrigin(0.5);
touchControlLayer.add([background, label]);
touchButtons[spec.control] = {
zone: new Phaser.Geom.Circle(spec.x, spec.y, spec.radius),
background,
label
};
}
const layoutGameUi = (width, height) => {
const compact = isCompactLayout(width, height);
if (compact) {
scoreText.setPosition(12, 44).setFontSize(18);
highScoreText.setPosition(12, 68).setFontSize(15);
levelText.setPosition(12, 92).setFontSize(15);
coinHudText.setPosition(width - 12, 12).setFontSize(15);
livesText.setPosition(width - 12, 35).setFontSize(15);
pauseButton.setPosition(width - 48, 82);
musicButton.setPosition(width - 58, 119).setFontSize(12);
muteButton.setPosition(width - 48, 155).setFontSize(12);
} else {
scoreText.setPosition(16, 16).setFontSize(22);
highScoreText.setPosition(16, 44).setFontSize(18);
levelText.setPosition(40, 72).setFontSize(18);
coinHudText.setPosition(width - 16, 58).setFontSize(18);
livesText.setPosition(width - 16, 84).setFontSize(18);
pauseButton.setPosition(width - 155, height - 30).setFontSize(14);
musicButton.setPosition(width - 54, height - 30).setFontSize(14);
muteButton.setPosition(width - 245, height - 30).setFontSize(14);
}
const controlY = height - 54;
const controlPositions = compact
? { left: 54, right: 136, jump: width - 54 }
: { left: 54, right: 136, jump: 238 };
for (const spec of touchButtonSpecs) {
spec.x = controlPositions[spec.control];
spec.y = controlY;
const button = touchButtons[spec.control];
button.background.setPosition(spec.x, spec.y);
button.label.setPosition(spec.x, spec.y);
button.zone.setTo(spec.x, spec.y, spec.radius);
}
spaceBackground.setSize(width, height);
this.physics.world.setBounds(0, 0, WORLD_WIDTH, height);
this.cameras.main.setBounds(0, 0, WORLD_WIDTH, height);
};
layoutGameUi(viewportWidth, viewportHeight);
// The camera follows the player
this.cameras.main.startFollow(player);
// Arrow keys and space
cursors = this.input.keyboard.createCursorKeys();
this.physics.world.pause();
const startScreen = this.add.container(0, 0).setScrollFactor(0).setDepth(20);
const startBackground = this.add.image(0, 0, "space");
startScreen.add(startBackground);
const startBackdrop = this.add.rectangle(0, 0, 800, 450, 0x030916, 0.3);
startScreen.add(startBackdrop);
const startPanel = this.add.rectangle(0, 0, 760, 370, 0x071226, 0.9).setStrokeStyle(2, 0x71d2f4, 0.8);
startScreen.add(startPanel);
const startDivider = this.add.rectangle(420, 230, 2, 270, 0x71d2f4, 0.6);
startScreen.add(startDivider);
const gameTitle = this.add.text(400, 78, "ASTEROID HOP", {
fontFamily: "Arial",
fontSize: "38px",
fontStyle: "bold",
color: "#9ee5ff",
stroke: "#080b1e",
strokeThickness: 5
}).setOrigin(0.5);
startScreen.add(gameTitle);
const nameLabel = this.add.text(220, 143, "Type your pilot name:", {
fontFamily: "Arial",
fontSize: "17px",
color: "#ffffff",
align: "center"
}).setOrigin(0.5);
startScreen.add(nameLabel);
const nameField = this.add.rectangle(220, 180, 260, 36, 0x0b1c31, 1)
.setStrokeStyle(1, 0x71d2f4, 1)
.setInteractive({ useHandCursor: true });
startScreen.add(nameField);
const playerNameText = this.add.text(220, 180, getPlayerName(), {
fontFamily: "Arial",
fontSize: "16px",
color: "#ffffff"
}).setOrigin(0.5);
startScreen.add(playerNameText);
const playerNameError = this.add.text(220, 208, "Please enter a name (letters, numbers, spaces, or hyphens).", {
fontFamily: "Arial",
fontSize: "12px",
color: "#ff9b8e"
}).setOrigin(0.5).setVisible(false);
startScreen.add(playerNameError);
const bestRunText = this.add.text(220, 234, `Best run: ${highScore}`, {
fontFamily: "Arial",
fontSize: "20px",
fontStyle: "bold",
color: "#ffe58a"
}).setOrigin(0.5);
startScreen.add(bestRunText);
const instructionsText = this.add.text(220, 266, "Move: LEFT / RIGHT\nJump: UP / SPACE\n3 LIVES PER RUN • M: Toggle music", {
fontFamily: "Arial",
fontSize: "16px",
color: "#c5d6e8",
align: "center"
}).setOrigin(0.5);
startScreen.add(instructionsText);
const shopButton = this.add.text(220, 315, `CHARACTER SHOP • ${coinBalance} COINS`, {
fontFamily: "Arial",
fontSize: "15px",
fontStyle: "bold",
color: "#ffe58a",
backgroundColor: "#142b45",
padding: { x: 14, y: 7 }
}).setOrigin(0.5).setInteractive({ useHandCursor: true });
startScreen.add(shopButton);
const startButton = this.add.text(220, 367, "CLICK OR PRESS ENTER TO START", {
fontFamily: "Arial",
fontSize: "17px",
fontStyle: "bold",
color: "#71d2f4",
backgroundColor: "#142b45",
padding: { x: 14, y: 8 }
}).setOrigin(0.5).setInteractive({ useHandCursor: true });
startScreen.add(startButton);
const leaderboardTitle = this.add.text(590, 120, "WORLD LEADERBOARD", {
fontFamily: "Arial",
fontSize: "18px",
fontStyle: "bold",
color: "#9ee5ff"
}).setOrigin(0.5);
startScreen.add(leaderboardTitle);
const startLeaderboardText = this.add.text(465, 145, "Loading leaderboard...", {
fontFamily: "monospace",
fontSize: "15px",
color: "#ffffff",
lineSpacing: 4
});
startScreen.add(startLeaderboardText);
let hasEditedName = false;
const pilotNameInput = document.getElementById("pilot-name-input");
const positionPilotNameInput = () => {
if (!startScreen.active) {
return;
}
const canvas = document.querySelector("canvas");
if (!canvas) {
return;
}
const bounds = canvas.getBoundingClientRect();
const scaleX = bounds.width / this.scale.width;
const scaleY = bounds.height / this.scale.height;
const fieldBounds = nameField.getBounds();
pilotNameInput.style.left = `${bounds.left + fieldBounds.x * scaleX}px`;
pilotNameInput.style.top = `${bounds.top + fieldBounds.y * scaleY}px`;
pilotNameInput.style.width = `${fieldBounds.width * scaleX}px`;
pilotNameInput.style.height = `${fieldBounds.height * scaleY}px`;
pilotNameInput.style.fontSize = `${Math.max(12, 16 * scaleY)}px`;
};
const commitPilotNameInput = () => {
if (!pilotNameInput.classList.contains("is-visible")) {
return;
}
const cleanName = sanitizePlayerName(pilotNameInput.value);
hasEditedName = true;
playerNameText.setText(cleanName);
playerNameError.setVisible(!cleanName);
pilotNameInput.classList.remove("is-visible");
pilotNameInput.blur();
};
const showPilotNameInput = () => {
positionPilotNameInput();
pilotNameInput.value = playerNameText.text;
pilotNameInput.classList.add("is-visible");
pilotNameInput.setSelectionRange(0, pilotNameInput.value.length);
pilotNameInput.focus();
};
pilotNameInput.addEventListener("input", () => {
const cleanName = sanitizePlayerName(pilotNameInput.value);
pilotNameInput.value = cleanName;
hasEditedName = true;
playerNameText.setText(cleanName);
playerNameError.setVisible(!cleanName);
});
pilotNameInput.addEventListener("blur", commitPilotNameInput);
pilotNameInput.addEventListener("keydown", (event) => {
if (event.key === "Enter" || event.code === "Enter" || event.keyCode === 13) {
event.preventDefault();
event.stopPropagation();
commitPilotNameInput();
}
});
window.addEventListener("resize", positionPilotNameInput);
nameField.on("pointerdown", () => {
showPilotNameInput();
});
const layoutStartScreen = (width, height) => {
if (!startScreen.active) {
return;
}
const compact = isCompactLayout(width, height);
const portraitLayout = width < 620 || height > width;
const centerX = width / 2;
const centerY = height / 2;
musicButton.setVisible(!portraitLayout);
muteButton.setVisible(!portraitLayout);
const backgroundScale = Math.max(width / 800, height / 450);
startBackground.setPosition(centerX, centerY).setDisplaySize(800 * backgroundScale, 450 * backgroundScale);
startBackdrop.setPosition(centerX, centerY).setSize(width, height);
startPanel.setPosition(centerX, centerY);
startPanel.setSize(compact ? width - 24 : width * 0.95, compact ? height - 24 : height * 0.82);
startDivider.setPosition(width * 0.525, centerY).setSize(2, height * 0.6).setVisible(!portraitLayout);
const leftX = portraitLayout ? centerX : width * 0.275;
const scaleY = height / 450;
const placeY = (compactY, desktopY) => portraitLayout ? height * compactY : desktopY * scaleY;
gameTitle.setPosition(centerX, placeY(0.11, 78));
gameTitle.setFontSize(compact ? 30 : 38);
nameLabel.setPosition(leftX, placeY(0.20, 143));
nameField.setPosition(leftX, placeY(0.245, 180)).setSize(Math.min(260, width - 40), 36);
playerNameText.setPosition(leftX, placeY(0.245, 180));
playerNameError.setPosition(leftX, placeY(0.28, 208)).setFontSize(compact ? 11 : 12).setWordWrapWidth(width - 32);
bestRunText.setPosition(leftX, placeY(0.33, 234));
bestRunText.setFontSize(compact ? 17 : 20);
instructionsText.setPosition(leftX, placeY(0.40, 266));
instructionsText.setFontSize(compact ? 14 : 16);
shopButton.setPosition(leftX, placeY(0.52, 315));
shopButton.setFontSize(compact ? 13 : 15);
startButton.setPosition(leftX, placeY(0.60, 367));
startButton.setFontSize(compact ? 14 : 17);
leaderboardTitle.setPosition(portraitLayout ? centerX : width * 0.7375, placeY(0.68, 120));
leaderboardTitle.setFontSize(compact ? 16 : 18);
startLeaderboardText.setPosition(portraitLayout ? 24 : width * 0.58125, placeY(0.72, 145));
startLeaderboardText.setOrigin(0, 0);
startLeaderboardText.setFontSize(compact ? 12 : 15).setLineSpacing(compact ? 1 : 4);
startLeaderboardText.setWordWrapWidth(portraitLayout ? width - 48 : width * 0.38);
};
layoutStartScreen(viewportWidth, viewportHeight);
this.scale.on(Phaser.Scale.Events.RESIZE, (gameSize) => {
layoutGameUi(gameSize.width, gameSize.height);
layoutStartScreen(gameSize.width, gameSize.height);
positionPilotNameInput();
});
this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
window.removeEventListener("resize", positionPilotNameInput);
});
refreshLeaderboard(startLeaderboardText);
const startGame = () => {
if (gameStarted || characterShopContainer) {
return;
}
const cleanName = sanitizePlayerName(playerNameText.text);
if (!cleanName) {
playerNameError.setVisible(true);
return;
}
playerNameText.setText(cleanName);
localStorage.setItem(PLAYER_NAME_KEY, cleanName);
 lives = MAX_LIVES;
livesText.setText(`Lives: ${lives}`);
gameStarted = true;
this.physics.world.resume();
startBackgroundMusic();
scoreText.setVisible(true);
highScoreText.setVisible(true);
coinHudText.setVisible(true);
livesText.setVisible(true);
levelText.setVisible(true);
pauseButton.setVisible(true);
musicButton.setVisible(true);
muteButton.setVisible(true);
touchControlLayer.setVisible(true);
startScreen.destroy();
this.input.keyboard.off("keydown", handleStartKey);
this.input.off("pointerdown", handleStartPointer);
};
const handleStartKey = (event) => {
if (event.repeat) {
return;
}
if (event.code === "KeyM") {
return;
}
if (event.code === "Enter") {
if (!characterShopContainer) {
startGame();
}
return;
}
if (event.code === "Backspace") {
if (!hasEditedName) {
playerNameText.setText("");
hasEditedName = true;
} else {
playerNameText.setText(playerNameText.text.slice(0, -1));
}
playerNameError.setVisible(false);
return;
}
if (event.key.length === 1 && /^[A-Za-z0-9 -]$/.test(event.key) && playerNameText.text.length < 20) {
if (!hasEditedName) {
playerNameText.setText("");
hasEditedName = true;
}
playerNameText.setText(playerNameText.text + event.key);
playerNameError.setVisible(false);
}
};
startButton.on("pointerdown", startGame);
const handleStartPointer = (pointer) => {
if (characterShopContainer) {
return;
}
if (Phaser.Geom.Rectangle.Contains(shopButton.getBounds(), pointer.x, pointer.y)) {
openCharacterShop(this);
return;
}
if (Phaser.Geom.Rectangle.Contains(startButton.getBounds(), pointer.x, pointer.y)) {
startGame();
}
};
this.input.keyboard.on("keydown", handleStartKey);
this.input.keyboard.on("keydown", (event) => {
if (event.code === "KeyM" && !event.repeat) {
toggleBackgroundMusic();
} else if (event.code === "KeyP" && !event.repeat) {
toggleGamePause(this);
}
});
this.input.on("pointerdown", handleStartPointer);
this.input.on("pointerdown", (pointer) => {
if (muteButton.visible && Phaser.Geom.Rectangle.Contains(muteButton.getBounds(), pointer.x, pointer.y)) {
toggleMute();
return;
}
if (musicButton.visible && Phaser.Geom.Rectangle.Contains(musicButton.getBounds(), pointer.x, pointer.y)) {
toggleBackgroundMusic();
return;
}
if (gameStarted && pauseButton.visible && Phaser.Geom.Rectangle.Contains(pauseButton.getBounds(), pointer.x, pointer.y)) {
toggleGamePause(this);
}
});
this.input.on("pointerdown", (pointer) => {
if (!gameStarted || isGamePaused || isRespawning || !touchControlLayer.visible) {
return;
}
const button = touchButtonSpecs.find((spec) =>
Phaser.Geom.Circle.Contains(touchButtons[spec.control].zone, pointer.x, pointer.y)
);
if (button) {
setTouchControl(button.control, pointer.id, true);
if (pointer.event && pointer.event.cancelable) {
pointer.event.preventDefault();
}
}
});
const releaseTouchPointer = (pointer) => {
for (const control of Object.keys(touchPointerIds)) {
if (touchPointerIds[control].has(pointer.id)) {
setTouchControl(control, pointer.id, false);
}
}
};
this.input.on("pointerup", releaseTouchPointer);
this.input.on("pointerupoutside", releaseTouchPointer);
this.input.on("gameout", clearTouchControls);
}
function generatePlatformsUntil(targetX, scene) {
while (nextPlatformX < targetX) {
const previousPlatformX = nextPlatformX;
const previousPlatformY = lastPlatformY;
const gap = Phaser.Math.Between(340, 430);
nextPlatformX += PLATFORM_WIDTH + gap;
const verticalVariation = Math.min(45 + (level - 1) * 2, 60);
const minY = Math.max(scene.scale.height * (250 / 450), lastPlatformY - verticalVariation);
const maxY = Math.min(scene.scale.height * 0.8, lastPlatformY + verticalVariation);
lastPlatformY = Phaser.Math.Between(minY, maxY);
const platform = platforms.create(nextPlatformX, lastPlatformY, "asteroid");
configureMovingPlatform(platform, gap);
platformsSinceLevel++;
if (platformsSinceLevel >= PLATFORMS_PER_LEVEL) {
addLevelFlag(platform, scene);
platformsSinceLevel = 0;
}
if (Phaser.Math.Between(0, 99) < 70) {
const spawnsInAir = Phaser.Math.Between(0, 1) === 0;
const gapStart = previousPlatformX + PLATFORM_WIDTH / 2 + 60;
const gapEnd = platform.x - PLATFORM_WIDTH / 2 - 60;
const coin = coins.create(
spawnsInAir
? Phaser.Math.Between(gapStart, gapEnd)
: Phaser.Math.Between(platform.x - 18, platform.x + 18),
spawnsInAir
? previousPlatformY - Phaser.Math.Between(155, 170)
: platform.y - Phaser.Math.Between(45, 70),
"coin"
);
coin.body.setAllowGravity(false);
coin.body.setImmovable(true);
coin.body.setCircle(9);
coin.setDepth(2);
if (!spawnsInAir) {
coin.movingPlatform = platform;
}
}
const alienSpawnChance = Math.min(35 + (level - 1) * 8, 80);
if (Phaser.Math.Between(0, 99) < alienSpawnChance) {
spawnAlienOnPlatform(platform, level);
}
}
}
function configureMovingPlatform(platform, gap) {
if (Phaser.Math.Between(0, 3) !== 0) {
return;
}
platform.movementAxis = Phaser.Math.Between(0, 1) === 0 ? "horizontal" : "vertical";
if (platform.movementAxis === "horizontal" && gap > 360) {
platform.movementAxis = "vertical";
}
platform.movementBaseX = platform.x;
platform.movementBaseY = platform.y;
platform.movementRange = Phaser.Math.Between(16, 20);
platform.movementPhase = Phaser.Math.FloatBetween(0, Math.PI * 2);
platform.movementSpeed = Phaser.Math.FloatBetween(0.7, 1.05);
platform.movementTime = 0;
}
function addLevelFlag(platform, scene) {
platform.isLevelGate = true;
platform.levelFlag = scene.add.image(
platform.x + 10,
platform.y - PLATFORM_HEIGHT / 2 + 4,
"level_flag"
).setOrigin(0.5, 1).setDepth(4);
}
function destroyPlatform(platform) {
if (player && player.standingPlatform === platform) {
player.standingPlatform = null;
}
if (platform.levelFlag) {
platform.levelFlag.destroy();
}
platform.destroy();
}
function updateMovingPlatforms(delta) {
if (player.standingPlatform &&
(!player.standingPlatform.active || !player.body.blocked.down)) {
player.standingPlatform = null;
}
platforms.children.iterate((platform) => {
if (!platform || !platform.active || !platform.movementAxis) {
return;
}
platform.movementTime += delta / 1000 * platform.movementSpeed;
const offset = Math.sin(platform.movementTime + platform.movementPhase) * platform.movementRange;
const nextX = platform.movementBaseX + (platform.movementAxis === "horizontal" ? offset : 0);
const nextY = platform.movementBaseY + (platform.movementAxis === "vertical" ? offset : 0);
const deltaX = nextX - platform.x;
const deltaY = nextY - platform.y;
if (deltaX === 0 && deltaY === 0) {
return;
}
platform.setPosition(nextX, nextY);
platform.refreshBody();
if (player.standingPlatform === platform && player.body.blocked.down &&
!(cursors.up.isDown || cursors.space.isDown || touchControls.jump)) {
player.setPosition(player.x + deltaX, player.y + deltaY);
}
if (platform.levelFlag) {
platform.levelFlag.setPosition(
platform.x + 10,
platform.y - PLATFORM_HEIGHT / 2 + 4
);
}
coins.children.iterate((coin) => {
if (coin && coin.active && coin.movingPlatform === platform) {
coin.setPosition(coin.x + deltaX, coin.y + deltaY);
}
});
aliens.children.iterate((alien) => {
if (!alien || !alien.active || alien.platform !== platform) {
return;
}
alien.setPosition(alien.x + deltaX, alien.y + deltaY);
alien.body.reset(alien.x, alien.y);
alien.patrolMinX += deltaX;
alien.patrolMaxX += deltaX;
});
});
}
function spawnAlienOnPlatform(platform, currentLevel) {
const alien = aliens.create(
platform.x + Phaser.Math.Between(-10, 10),
platform.y - PLATFORM_HEIGHT / 2 - 14,
"enemy_alien"
);
alien.setSize(24, 28);
alien.setCollideWorldBounds(true);
alien.direction = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
alien.patrolMinX = platform.x - PLATFORM_WIDTH / 2 + alien.body.width / 2;
alien.patrolMaxX = platform.x + PLATFORM_WIDTH / 2 - alien.body.width / 2;
alien.patrolSpeed = Math.min(55 + (currentLevel - 1) * 10, 145);
alien.platform = platform;
alien.setVelocityX(alien.direction * alien.patrolSpeed);
alien.setDepth(3);
}
function handlePlayerAlienCollision(playerObject, alien) {
if (!gameStarted || isRespawning || !alien.active) {
return;
}
const playerBody = playerObject.body;
const alienBody = alien.body;
const descendingFromAbove = playerBody.blocked.down &&
playerBody.prev.y + playerBody.height <= alienBody.prev.y + 8;
if (descendingFromAbove) {
playEnemyDefeatSound();
alien.destroy();
playerObject.setVelocityY(-350);
canScoreLanding = true;
return;
}
loseLife(this);
}
function loseLife(scene) {
if (!gameStarted || isRespawning) {
return;
}
lives = Math.max(0, lives - 1);
livesText.setText(`Lives: ${lives}`);
playHurtSound();
if (lives === 0) {
showGameOver(scene);
return;
}
isRespawning = true;
player.standingPlatform = null;
isGamePaused = true;
scene.physics.world.pause();
pauseButton.setVisible(false);
clearTouchControls();
touchControlLayer.setVisible(false);
const viewportWidth = scene.scale.width;
const viewportHeight = scene.scale.height;
const centerX = viewportWidth / 2;
const centerY = viewportHeight / 2;
pauseOverlay = scene.add.container(0, 0).setScrollFactor(0).setDepth(20);
pauseOverlay.add(scene.add.rectangle(centerX, centerY, viewportWidth, viewportHeight, 0x030916, 0.72));
pauseOverlay.add(scene.add.rectangle(centerX, centerY, Math.min(440, viewportWidth - 32), 150, 0x071226, 1).setStrokeStyle(2, 0xff9b8e, 0.95));
pauseOverlay.add(scene.add.text(centerX, centerY - 20, "LIFE LOST", {
fontFamily: "Arial",
fontSize: "32px",
fontStyle: "bold",
color: "#ff9b8e"
}).setOrigin(0.5));
pauseOverlay.add(scene.add.text(centerX, centerY + 26, `${lives} LIVES LEFT - RESPAWNING`, {
fontFamily: "Arial",
fontSize: "16px",
color: "#ffffff"
}).setOrigin(0.5));
scene.time.delayedCall(100, () => {
if (!gameStarted || !isRespawning) {
return;
}
player.setPosition(START_X, startPlayerY);
player.standingPlatform = null;
player.setVelocity(0, 0);
player.setTexture(getCharacterTexture(selectedCharacter, "idle"));
player.setFlipX(false);
canScoreLanding = false;
coins.clear(true, true);
aliens.clear(true, true);
platformsSinceLevel = 0;
platforms.children.iterate((platform) => {
if (platform && platform.x !== START_X) {
destroyPlatform(platform);
}
});
nextPlatformX = START_X;
lastPlatformY = startPlatformY;
generatePlatformsUntil(START_X + PLATFORM_GENERATION_DISTANCE, scene);
scene.cameras.main.stopFollow();
scene.cameras.main.setScroll(0, 0);
scene.cameras.main.startFollow(player);
scene.time.delayedCall(600, () => {
if (!gameStarted || !isRespawning) {
return;
}
pauseOverlay.destroy();
pauseOverlay = null;
isRespawning = false;
isGamePaused = false;
scene.physics.world.resume();
pauseButton.setText("PAUSE");
pauseButton.setVisible(true);
touchControlLayer.setVisible(true);
});
});
}
function collectCoin(_player, coin) {
if (!coin.active) {
return;
}
coin.destroy();
coinBalance++;
localStorage.setItem(COIN_BALANCE_KEY, String(coinBalance));
coinHudText.setText(`Coins: ${coinBalance}`);
playCoinSound();
}
function countAsteroidLanding(playerObject, platformObject) {
if (!playerObject.body.blocked.down) {
return;
}
playerObject.standingPlatform = platformObject;
let completedLevel = null;
if (platformObject.isLevelGate) {
platformObject.isLevelGate = false;
platformObject.levelFlag.destroy();
platformObject.levelFlag = null;
completedLevel = level;
level++;
levelText.setText(`Level: ${level}`);
playLevelCompleteSound();
}
if (canScoreLanding) {
canScoreLanding = false;
if (platformObject.x !== START_X) {
score++;
scoreText.setText(`Asteroids: ${score}`);
if (score > highScore) {
highScore = score;
highScoreText.setText(`Highscore: ${highScore}`);
localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
}
}
}
if (completedLevel !== null) {
showLevelComplete(playerObject.scene, completedLevel, score);
}
}
function showLevelComplete(scene, completedLevel, finalScore) {
if (levelCompleteOverlay) {
levelCompleteOverlay.destroy();
}
isGamePaused = true;
scene.physics.world.pause();
pauseButton.setVisible(false);
clearTouchControls();
touchControlLayer.setVisible(false);
const overlay = scene.add.container(0, 0).setScrollFactor(0).setDepth(35);
levelCompleteOverlay = overlay;
const centerX = scene.scale.width / 2;
const centerY = scene.scale.height / 2;
overlay.add(scene.add.rectangle(centerX, centerY, Math.min(470, scene.scale.width - 24), 190, 0x071226, 0.97).setStrokeStyle(3, 0x71d2f4, 1));
overlay.add(scene.add.text(centerX, centerY - 50, "Level complete!", {
fontFamily: "Arial",
fontSize: "30px",
fontStyle: "bold",
color: "#9ee5ff"
}).setOrigin(0.5));
overlay.add(scene.add.text(centerX, centerY - 5, `Score: ${finalScore}`, {
fontFamily: "Arial",
fontSize: "25px",
fontStyle: "bold",
color: "#ffe58a"
}).setOrigin(0.5));
overlay.add(scene.add.text(centerX, centerY + 40, `Level ${level} starting...`, {
fontFamily: "Arial",
fontSize: "16px",
color: "#c5d6e8"
}).setOrigin(0.5));
scene.time.delayedCall(2200, () => {
if (levelCompleteOverlay !== overlay) {
return;
}
overlay.destroy();
levelCompleteOverlay = null;
if (!gameStarted || isRespawning) {
return;
}
isGamePaused = false;
scene.physics.world.resume();
pauseButton.setText("PAUSE");
pauseButton.setVisible(true);
touchControlLayer.setVisible(true);
});
}
function getPlayerName() {
let playerName = localStorage.getItem(PLAYER_NAME_KEY);
if (!playerName) {
playerName = `Astro-${Phaser.Math.Between(1000, 9999)}`;
localStorage.setItem(PLAYER_NAME_KEY, playerName);
}
return playerName;
}
function sanitizePlayerName(value) {
return value.trim().replace(/[^A-Za-z0-9 -]/g, "").replace(/\s+/g, " ").slice(0, 20);
}
async function refreshLeaderboard(targetText, scoreToSubmit = 0) {
let submissionFailed = false;
if (scoreToSubmit > 0) {
try {
const submitResponse = await fetch(`${SUPABASE_REST_URL}/asteroid_scores`, {
method: "POST",
headers: {
apikey: SUPABASE_ANON_KEY,
Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
"Content-Type": "application/json",
Prefer: "return=minimal"
},
body: JSON.stringify({ player_name: getPlayerName(), score: scoreToSubmit })
});
if (!submitResponse.ok) {
throw new Error(`Score submission failed (${submitResponse.status})`);
}
} catch (error) {
console.error("Could not submit leaderboard score:", error);
submissionFailed = true;
}
}
try {
const response = await fetch(
`${SUPABASE_REST_URL}/asteroid_scores?select=player_name,score&order=score.desc,created_at.asc&limit=10`,
{ headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
);
if (!response.ok) {
throw new Error(`Leaderboard request failed (${response.status})`);
}
const rows = await response.json();
if (!Array.isArray(rows)) {
throw new Error("Unexpected leaderboard response");
}
if (!targetText.active) {
return;
}
const entries = rows
.filter((row) => row && typeof row.player_name === "string" && Number.isSafeInteger(row.score))
.slice(0, 10)
.map((row, index) => `${String(index + 1).padStart(2, " ")}  ${row.player_name.slice(0, 16).padEnd(16, " ")} ${row.score}`);
const status = submissionFailed ? "Score not submitted.\n" : "";
targetText.setText(`${status}${entries.length ? entries.join("\n") : "No scores yet. Be the first!"}`);
} catch (error) {
console.error("Could not load world leaderboard:", error);
if (targetText.active) {
targetText.setText("Leaderboard unavailable.\nCheck connection and Supabase setup.");
}
}
}
function restartRun(scene) {
player.setPosition(START_X, startPlayerY);
player.standingPlatform = null;
player.setVelocity(0, 0);
player.setTexture(getCharacterTexture(selectedCharacter, "idle"));
player.setFlipX(false);
score = 0;
canScoreLanding = false;
lives = MAX_LIVES;
livesText.setText(`Lives: ${lives}`);
level = 1;
platformsSinceLevel = 0;
levelText.setText(`Level: ${level}`);
scoreText.setText("Asteroids: 0");
coins.clear(true, true);
aliens.clear(true, true);
isGamePaused = false;
if (pauseOverlay) {
pauseOverlay.destroy();
pauseOverlay = null;
}
pauseButton.setText("PAUSE");
pauseButton.setVisible(true);
musicButton.setVisible(true);
muteButton.setVisible(true);
clearTouchControls();
touchControlLayer.setVisible(true);
platforms.children.iterate((platform) => {
if (platform && platform.x !== START_X) {
destroyPlatform(platform);
}
});
nextPlatformX = START_X;
lastPlatformY = startPlatformY;
generatePlatformsUntil(START_X + PLATFORM_GENERATION_DISTANCE, scene);
scoreText.setVisible(true);
highScoreText.setVisible(true);
coinHudText.setVisible(true);
livesText.setVisible(true);
levelText.setVisible(true);
gameStarted = true;
scene.physics.world.resume();
}
function showGameOver(scene) {
gameStarted = false;
isRespawning = false;
isGamePaused = false;
scene.physics.world.pause();
scoreText.setVisible(false);
highScoreText.setVisible(false);
coinHudText.setVisible(false);
livesText.setVisible(false);
levelText.setVisible(false);
pauseButton.setVisible(false);
musicButton.setVisible(true);
muteButton.setVisible(true);
clearTouchControls();
touchControlLayer.setVisible(false);
const gameOverScreen = scene.add.container(0, 0).setScrollFactor(0).setDepth(20);
const width = scene.scale.width;
const height = scene.scale.height;
const compact = isCompactLayout(width, height);
const portraitLayout = width < 620 || height > width;
const centerX = width / 2;
const centerY = height / 2;
if (portraitLayout) {
musicButton.setVisible(false);
muteButton.setVisible(false);
}
const backgroundScale = Math.max(width / 800, height / 450);
const gameOverBackground = scene.add.image(centerX, centerY, "space").setDisplaySize(800 * backgroundScale, 450 * backgroundScale);
gameOverScreen.add(gameOverBackground);
gameOverScreen.add(scene.add.rectangle(centerX, centerY, width, height, 0x030916, 0.3));
gameOverScreen.add(scene.add.rectangle(centerX, centerY, compact ? width - 24 : width * 0.95, compact ? height - 24 : height * 0.82, 0x071226, 0.9).setStrokeStyle(2, 0xff7468, 0.8));
const gameOverDivider = scene.add.rectangle(width * 0.525, centerY, 2, height * 0.6, 0xff7468, 0.6).setVisible(!portraitLayout);
gameOverScreen.add(gameOverDivider);
const scaleY = height / 450;
const leftX = portraitLayout ? centerX : width * 0.275;
const placeY = (compactY, desktopY) => portraitLayout ? height * compactY : desktopY * scaleY;
gameOverScreen.add(scene.add.text(leftX, placeY(0.14, 110), "GAME OVER", {
fontFamily: "Arial",
fontSize: "40px",
fontStyle: "bold",
color: "#ff9b8e",
stroke: "#080b1e",
strokeThickness: 5
}).setOrigin(0.5));
gameOverScreen.add(scene.add.text(leftX, placeY(0.25, 170), `Asteroids jumped: ${score}`, {
fontFamily: "Arial",
fontSize: "22px",
fontStyle: "bold",
color: "#ffffff"
}).setOrigin(0.5));
gameOverScreen.add(scene.add.text(leftX, placeY(0.30, 208), `Highscore: ${highScore}`, {
fontFamily: "Arial",
fontSize: "20px",
fontStyle: "bold",
color: "#ffe58a"
}).setOrigin(0.5));
gameOverScreen.add(scene.add.text(leftX, placeY(0.34, 238), `Level: ${level}  •  Lives: ${lives}`, {
fontFamily: "Arial",
fontSize: "18px",
fontStyle: "bold",
color: "#ff9b8e"
}).setOrigin(0.5));
const shopButton = scene.add.text(leftX, placeY(0.42, 264), `CHARACTER SHOP • ${coinBalance} COINS`, {
fontFamily: "Arial",
fontSize: compact ? "13px" : "15px",
fontStyle: "bold",
color: "#ffe58a",
backgroundColor: "#142b45",
padding: { x: 14, y: 7 }
}).setOrigin(0.5).setInteractive({ useHandCursor: true });
gameOverScreen.add(shopButton);
gameOverScreen.add(scene.add.text(leftX, placeY(0.48, 306), "Press M to toggle music", {
fontFamily: "Arial",
fontSize: "15px",
color: "#c5d6e8"
}).setOrigin(0.5));
const restartButton = scene.add.text(leftX, placeY(0.55, 353), "CLICK OR PRESS ENTER TO TRY AGAIN", {
fontFamily: "Arial",
fontSize: compact ? "13px" : "16px",
fontStyle: "bold",
color: "#71d2f4",
backgroundColor: "#142b45",
padding: { x: 14, y: 8 }
}).setOrigin(0.5).setInteractive({ useHandCursor: true });
gameOverScreen.add(restartButton);
gameOverScreen.add(scene.add.text(portraitLayout ? centerX : width * 0.7375, placeY(0.63, 120), "WORLD LEADERBOARD", {
fontFamily: "Arial",
fontSize: "18px",
fontStyle: "bold",
color: "#9ee5ff"
}).setOrigin(0.5));
const leaderboardText = scene.add.text(portraitLayout ? 24 : width * 0.58125, placeY(0.68, 145), score > 0 ? "Submitting score..." : "Loading leaderboard...", {
fontFamily: "monospace",
fontSize: "15px",
color: "#ffffff",
lineSpacing: 4
});
leaderboardText.setOrigin(0, 0).setFontSize(compact ? 12 : 15).setLineSpacing(compact ? 1 : 4).setWordWrapWidth(portraitLayout ? width - 48 : width * 0.38);
gameOverScreen.add(leaderboardText);
refreshLeaderboard(leaderboardText, score);
const restart = () => {
if (gameStarted || characterShopContainer) {
return;
}
scene.input.keyboard.off("keydown", handleRestartKey);
scene.input.off("pointerdown", handleRestartPointer);
gameOverScreen.destroy();
restartRun(scene);
};
const handleRestartKey = (event) => {
if (!characterShopContainer && (event.code === "Enter" || event.code === "Space")) {
restart();
}
};
const handleRestartPointer = (pointer) => {
if (characterShopContainer) {
return;
}
if (Phaser.Geom.Rectangle.Contains(shopButton.getBounds(), pointer.x, pointer.y)) {
openCharacterShop(scene);
return;
}
if (Phaser.Geom.Rectangle.Contains(restartButton.getBounds(), pointer.x, pointer.y)) {
restart();
}
};
restartButton.on("pointerdown", restart);
scene.input.keyboard.on("keydown", handleRestartKey);
scene.input.on("pointerdown", handleRestartPointer);
}
function update(_time, delta) {
if (!gameStarted || isGamePaused) {
return;
}
if (player.body.blocked.down && player.body.bottom >= this.physics.world.bounds.bottom) {
loseLife(this);
return;
}
generatePlatformsUntil(player.x + PLATFORM_GENERATION_DISTANCE, this);
updateMovingPlatforms(delta);
platforms.children.iterate((platform) => {
if (platform && platform.x !== START_X && platform.x < player.x - PLATFORM_GENERATION_DISTANCE) {
destroyPlatform(platform);
}
});
coins.children.iterate((coin) => {
if (coin && coin.active && coin.x < player.x - PLATFORM_GENERATION_DISTANCE) {
coin.destroy();
}
});
aliens.children.iterate((alien) => {
if (!alien || !alien.active) {
return;
}
if (alien.x < player.x - PLATFORM_GENERATION_DISTANCE) {
alien.destroy();
return;
}
if (alien.x <= alien.patrolMinX) {
alien.direction = 1;
} else if (alien.x >= alien.patrolMaxX) {
alien.direction = -1;
}
alien.setVelocityX(alien.direction * alien.patrolSpeed);
});
// Run left and right
if (cursors.left.isDown || touchControls.left) {
player.setVelocityX(-400);
} else if (cursors.right.isDown || touchControls.right) {
player.setVelocityX(400);
} else {
 player.setVelocityX(0);
}
// Jump, but only when standing on something
const onGround = player.body.blocked.down || player.body.touching.down;
if ((cursors.up.isDown || cursors.space.isDown || touchControls.jump) && onGround) {
player.setVelocityY(-500);
player.standingPlatform = null;
canScoreLanding = true;
playJumpSound();
}
if (player.body.velocity.x < 0) {
player.setFlipX(true);
} else if (player.body.velocity.x > 0) {
player.setFlipX(false);
}
const isAirborne = !onGround || player.body.velocity.y < 0;
const isRunning = player.body.velocity.x !== 0;
let texture = "player";
if (isAirborne) {
texture = "player_jump";
} else if (isRunning) {
texture = Math.floor(this.time.now / 120) % 2 === 0 ? "player_run1" : "player_run2";
}
if (player.texture.key !== texture) {
player.setTexture(texture);
}
}   