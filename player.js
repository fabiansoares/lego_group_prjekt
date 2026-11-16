const GRAVITY = 0.50
const JUMP_STRENGTH = -10 

export function createPlayer(canvasHeight) {
return {
x: 70,
y: canvasHeight - 48,
width: 34,
height: 48,
velocity: 0,
grounded: true,
animationTime: 0
};
}

export function resetPlayer(player, canvasHeight) {
player.y = canvasHeight - player.height;
player.velocity = 0;
player.grounded = true;
player.animationTime = 0;
}


export function jumpPlayer(player) {
player.velocity = JUMP_STRENGTH;
player.grounded = false;
}

export function updatePlayer(player, canvasHeight) {
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

export function drawPlayer(ctx, player) {
const stride = player.grounded ? Math.sin(player.animationTime) * 0.55 : 0.5;
const armSwing = player.grounded ? -stride : -0.7;
const legSwing = player.grounded ? stride : 0.65;
const centerX = player.x + player.width / 2;
const blue = "#1769aa";
const yellow = "#ffd52a";

drawLimb(ctx, player.x + 12, player.y + 35, 9, 13, legSwing, blue);
drawLimb(ctx, player.x + 23, player.y + 35, 9, 13, -legSwing, blue);
drawLimb(ctx, player.x + 5, player.y + 23, 8, 17, armSwing, yellow);
drawLimb(ctx, player.x + 29, player.y + 23, 8, 17, -armSwing, yellow);

ctx.fillStyle = "#ed2939";
ctx.strokeStyle = "#263238";
ctx.lineWidth = 2;
ctx.fillRect(centerX - 12, player.y + 22, 24, 16);
ctx.strokeRect(centerX - 12, player.y + 22, 24, 16);

ctx.fillStyle = yellow;
ctx.fillRect(centerX - 10, player.y + 4, 20, 18);
ctx.strokeRect(centerX - 10, player.y + 4, 20, 18);
ctx.beginPath();
ctx.ellipse(centerX, player.y + 4, 5, 2.5, 0, 0, Math.PI * 2);
ctx.fill();
ctx.stroke();

ctx.fillStyle = "#263238";
ctx.beginPath();
ctx.arc(centerX - 4, player.y + 12, 1.3, 0, Math.PI * 2);
ctx.arc(centerX + 4, player.y + 12, 1.3, 0, Math.PI * 2);
ctx.fill();
ctx.beginPath();
ctx.arc(centerX, player.y + 14, 4, 0.2, Math.PI - 0.2);
ctx.stroke();
}