function drawCloud(ctx, x, y, scale) {
ctx.fillStyle = "#ffffff";
ctx.beginPath();
ctx.arc(x + 14 * scale, y + 13 * scale, 12 * scale, 0, Math.PI * 2);
ctx.arc(x + 31 * scale, y + 8 * scale, 17 * scale, 0, Math.PI * 2);
ctx.arc(x + 49 * scale, y + 13 * scale, 12 * scale, 0, Math.PI * 2);
ctx.fillRect(x + 7 * scale, y + 13 * scale, 49 * scale, 13 * scale);
ctx.fill();
}

export function drawBackground(ctx, canvasWidth, canvasHeight) {
ctx.fillStyle = "#70c5ce";
ctx.fillRect(0, 0, canvasWidth, canvasHeight);

const sunX = canvasWidth - 80;
const sunY = 75;
ctx.strokeStyle = "#ffd34e";
ctx.lineWidth = 4;
for (let ray = 0; ray < 8; ray++) {
const angle = ray * Math.PI / 4;
ctx.beginPath();
ctx.moveTo(sunX + Math.cos(angle) * 34, sunY + Math.sin(angle) * 34);
ctx.lineTo(sunX + Math.cos(angle) * 44, sunY + Math.sin(angle) * 44);
ctx.stroke();
}

ctx.fillStyle = "#ffdc62";
ctx.beginPath();
ctx.arc(sunX, sunY, 27, 0, Math.PI * 2);
ctx.fill();

drawCloud(ctx, 35, 115, 1);
drawCloud(ctx, 175, 190, 0.8);
drawCloud(ctx, 245, 105, 0.7);
}