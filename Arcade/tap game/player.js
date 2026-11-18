const GRAVITY = 0.50
const JUMP_STRENGTH = -10 
export const PLAYER_SKINS = [
{ id: "classic", name: "Builder", figure: "builder", price: 0, body: "#ed2939", legs: "#1769aa", accent: "#ffd52a" },
{ id: "emerald", name: "Explorer", figure: "explorer", price: 10, body: "#168b55", legs: "#14532d", accent: "#f0c45a" },
{ id: "royal", name: "Astronaut", figure: "astronaut", price: 20, body: "#e5e7eb", legs: "#64748b", accent: "#ffd52a" },
{ id: "sunset", name: "Pirate", figure: "pirate", price: 30, body: "#f97316", legs: "#1f2937", accent: "#fef08a" }
];

export function createPlayer(canvasHeight) {
return {
x: 70,
y: canvasHeight - 48,
width: 34,
height: 48,
velocity: 0,
grounded: true,
animationTime: 0,
rotation: 0,
crashed: false
};
}

export function resetPlayer(player, canvasHeight) {
player.y = canvasHeight - player.height;
player.velocity = 0;
player.grounded = true;
player.animationTime = 0;
player.rotation = 0;
player.crashed = false;
}


export function jumpPlayer(player) {
if (player.crashed) return;
player.velocity = JUMP_STRENGTH;
player.grounded = false;
}

export function crashPlayer(player) {
if (player.crashed) return;
player.crashed = true;
player.grounded = false;
player.velocity = Math.max(player.velocity, 1.5);
}

export function updatePlayer(player, canvasHeight) {
if (player.crashed) {
player.rotation = Math.max(player.rotation - 0.12, -Math.PI / 2);
if (!player.grounded) {
player.velocity += GRAVITY;
player.y += player.velocity;
}

const centerY = player.y + player.height / 2;
const verticalRadius =
  (Math.abs(Math.sin(player.rotation)) * player.width +
    Math.abs(Math.cos(player.rotation)) * player.height) / 2;
const groundY = canvasHeight - verticalRadius;
if (centerY >= groundY) {
player.y = groundY - player.height / 2;
player.velocity = 0;
player.grounded = true;
}
return;
}

player.velocity += GRAVITY;
player.y += player.velocity;
player.animationTime += 0.22;
player.grounded = false;

if (player.y + player.height >= canvasHeight) {
player.y = canvasHeight - player.height;
player.velocity = 0;
player.grounded = true;
}
}

function drawLimb(ctx, x, y, width, height, angle, color) {
ctx.save();
ctx.translate(x, y);
ctx.rotate(angle);
ctx.fillStyle = color;
ctx.strokeStyle = "#263238";
ctx.lineWidth = 2;
ctx.fillRect(-width / 2, 0, width, height);
ctx.strokeRect(-width / 2, 0, width, height);
ctx.restore();
}

export function drawPlayer(ctx, player, skin = PLAYER_SKINS[0]) {
const stride = player.grounded ? Math.sin(player.animationTime) * 0.55 : 0.5;
const armSwing = player.grounded ? -stride : -0.7;
const legSwing = player.grounded ? stride : 0.65;
const centerX = player.x + player.width / 2;
const headY = player.y + 4;
if (player.crashed) {
ctx.save();
ctx.translate(centerX, player.y + player.height / 2);
ctx.rotate(player.rotation);
ctx.translate(-centerX, -(player.y + player.height / 2));
}
if (skin.figure === "explorer" || skin.figure === "astronaut") {
ctx.fillStyle = skin.figure === "explorer" ? "#70451f" : "#64748b";
ctx.strokeStyle = "#263238";
ctx.lineWidth = 2;
ctx.fillRect(player.x - 1, player.y + 24, 6, 12);
ctx.strokeRect(player.x - 1, player.y + 24, 6, 12);
}
drawLimb(ctx, player.x + 12, player.y + 35, 9, 13, legSwing, skin.legs);
drawLimb(ctx, player.x + 23, player.y + 35, 9, 13, -legSwing, skin.legs);
drawLimb(ctx, player.x + 5, player.y + 23, 8, 17, armSwing, skin.accent);
drawLimb(ctx, player.x + 29, player.y + 23, 8, 17, -armSwing, skin.accent);

ctx.fillStyle = skin.body;
ctx.strokeStyle = "#263238";
ctx.lineWidth = 2;
ctx.fillRect(centerX - 12, player.y + 22, 24, 16);
ctx.strokeRect(centerX - 12, player.y + 22, 24, 16);

if (skin.figure === "builder") {
ctx.strokeStyle = "#fff3a3";
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(centerX - 5, player.y + 23);
ctx.lineTo(centerX - 2, player.y + 34);
ctx.moveTo(centerX + 5, player.y + 23);
ctx.lineTo(centerX + 2, player.y + 34);
ctx.stroke();
} else if (skin.figure === "explorer") {
ctx.strokeStyle = "#f0c45a";
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(centerX - 7, player.y + 23);
ctx.lineTo(centerX + 4, player.y + 37);
ctx.stroke();
ctx.strokeRect(centerX + 2, player.y + 27, 6, 6);
} else if (skin.figure === "astronaut") {
ctx.fillStyle = "#334155";
ctx.fillRect(centerX - 6, player.y + 25, 12, 9);
ctx.strokeStyle = "#f8fafc";
ctx.lineWidth = 1;
ctx.strokeRect(centerX - 6, player.y + 25, 12, 9);
ctx.fillStyle = "#38bdf8";
ctx.fillRect(centerX - 3, player.y + 27, 3, 3);
ctx.fillStyle = "#facc15";
ctx.fillRect(centerX + 1, player.y + 27, 3, 3);
} else if (skin.figure === "pirate") {
ctx.fillStyle = "#111827";
ctx.fillRect(centerX - 12, player.y + 33, 24, 5);
ctx.fillStyle = "#facc15";
ctx.fillRect(centerX - 2, player.y + 33, 5, 5);
ctx.fillStyle = "#fff3a3";
ctx.fillRect(centerX - 10, player.y + 25, 20, 2);
}

ctx.fillStyle = skin.accent;
ctx.fillRect(centerX - 10, headY, 20, 18);
ctx.strokeRect(centerX - 10, headY, 20, 18);
ctx.beginPath();
ctx.ellipse(centerX, headY, 5, 2.5, 0, 0, Math.PI * 2);
ctx.fill();
ctx.stroke();

if (skin.figure === "builder") {
ctx.fillStyle = "#f59e0b";
ctx.fillRect(centerX - 9, headY - 3, 18, 5);
ctx.fillRect(centerX - 12, headY + 1, 24, 3);
ctx.strokeStyle = "#263238";
ctx.lineWidth = 1;
ctx.strokeRect(centerX - 9, headY - 3, 18, 5);
ctx.strokeRect(centerX - 12, headY + 1, 24, 3);
} else if (skin.figure === "explorer") {
ctx.fillStyle = "#a16207";
ctx.fillRect(centerX - 9, headY - 3, 18, 5);
ctx.fillRect(centerX - 13, headY + 1, 26, 3);
ctx.strokeStyle = "#263238";
ctx.lineWidth = 1;
ctx.strokeRect(centerX - 9, headY - 3, 18, 5);
ctx.strokeRect(centerX - 13, headY + 1, 26, 3);
} else if (skin.figure === "astronaut") {
ctx.strokeStyle = "#94a3b8";
ctx.lineWidth = 3;
ctx.beginPath();
ctx.ellipse(centerX, headY + 9, 13, 12, 0, 0, Math.PI * 2);
ctx.stroke();
ctx.strokeStyle = "#38bdf8";
ctx.lineWidth = 2;
ctx.beginPath();
ctx.arc(centerX, headY + 9, 10, Math.PI * 1.15, Math.PI * 1.85);
ctx.stroke();
} else if (skin.figure === "pirate") {
ctx.fillStyle = "#b91c1c";
ctx.fillRect(centerX - 11, headY + 1, 22, 5);
ctx.fillRect(centerX + 7, headY + 4, 6, 4);
ctx.strokeStyle = "#263238";
ctx.lineWidth = 1;
ctx.strokeRect(centerX - 11, headY + 1, 22, 5);
}

ctx.fillStyle = "#263238";
ctx.beginPath();
ctx.arc(centerX - 4, player.y + 12, 1.3, 0, Math.PI * 2);
if (skin.figure !== "pirate") {
ctx.arc(centerX + 4, player.y + 12, 1.3, 0, Math.PI * 2);
}
ctx.fill();
if (skin.figure === "pirate") {
ctx.beginPath();
ctx.moveTo(centerX - 10, player.y + 11);
ctx.lineTo(centerX + 10, player.y + 11);
ctx.strokeStyle = "#263238";
ctx.lineWidth = 1.5;
ctx.stroke();
ctx.fillStyle = "#111827";
ctx.fillRect(centerX + 1, player.y + 9, 7, 6);
ctx.strokeRect(centerX + 1, player.y + 9, 7, 6);
}
ctx.beginPath();
ctx.arc(centerX, player.y + 14, 4, 0.2, Math.PI - 0.2);
ctx.stroke();
if (skin.figure === "pirate") {
ctx.beginPath();
ctx.moveTo(centerX + 1, player.y + 9);
ctx.lineTo(centerX + 8, player.y + 16);
ctx.strokeStyle = "#263238";
ctx.lineWidth = 1.5;
ctx.stroke();
}
if (player.crashed) ctx.restore();
}