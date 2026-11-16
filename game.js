import { drawBackground } from "./background.js";
import { createBuilding, drawBuildings, updateBuildings } from "./buildings.js";
import { burstConfetti, drawConfetti, updateConfetti } from "./confetti.js";
import { createPlayer, drawPlayer, jumpPlayer, resetPlayer, updatePlayer } from "./player.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const player = createPlayer(canvas.height);
const buildings = [];
const confetti = [];
let gameOver = false;
let score = 0;

function startGame() {
resetPlayer(player, canvas.height);
buildings.length = 0;
buildings.push(createBuilding(canvas.width + 80));
confetti.length = 0;
gameOver = false;
score = 0;
}

function handleAction() {
if (gameOver) {
startGame();
return;
}
jumpPlayer(player);
}

document.addEventListener("keydown", (event) => {
if (event.code === "Space") {
event.preventDefault();
if (!event.repeat) handleAction();
}
});
canvas.addEventListener("pointerdown", handleAction);

function update() {
updateConfetti(confetti, canvas.height);
if (gameOver) return;

updatePlayer(player, canvas.height);
const result = updateBuildings(buildings, player, canvas.width, canvas.height);
const previousScore = score;
score += result.passed;
for (let milestone = Math.floor(previousScore / 20) + 1;
  milestone <= Math.floor(score / 20);
  milestone++) {
  burstConfetti(confetti, canvas.width, canvas.height);
}
if (result.collided) {
gameOver = true;
}

}

function draw() {
ctx.clearRect(0, 0, canvas.width, canvas.height);
drawBackground(ctx, canvas.width, canvas.height);
ctx.fillStyle = "#487a49";
ctx.fillRect(0, canvas.height - 8, canvas.width, 8);

drawBuildings(ctx, buildings, canvas.height);
drawPlayer(ctx, player);
ctx.fillStyle = "#222";
ctx.font = "20px sans-serif";
ctx.fillText(`Buildings: ${score}`, 12, 28);

if (gameOver) {
ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = "#fff";
ctx.textAlign = "center";
ctx.font = "bold 32px sans-serif";
ctx.fillText("Game over", canvas.width / 2, canvas.height / 2);
ctx.font = "18px sans-serif";
ctx.fillText("Tap or press Space to try again", canvas.width / 2, canvas.height / 2 + 34);
ctx.textAlign = "left";
}

drawConfetti(ctx, confetti);
}

function loop() {
update();
draw();
requestAnimationFrame(loop);
}

startGame();
loop();