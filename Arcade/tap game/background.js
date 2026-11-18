function drawCloud(ctx, x, y, scale, color) {
ctx.fillStyle = color;
ctx.beginPath();
ctx.arc(x + 14 * scale, y + 13 * scale, 12 * scale, 0, Math.PI * 2);
ctx.arc(x + 31 * scale, y + 8 * scale, 17 * scale, 0, Math.PI * 2);
ctx.arc(x + 49 * scale, y + 13 * scale, 12 * scale, 0, Math.PI * 2);
ctx.fillRect(x + 7 * scale, y + 13 * scale, 49 * scale, 13 * scale);
ctx.fill();
}

function mixColor(from, to, amount) {
const fromChannels = from.match(/\w\w/g).map((channel) => parseInt(channel, 16));
const toChannels = to.match(/\w\w/g).map((channel) => parseInt(channel, 16));
const channels = fromChannels.map((channel, index) =>
  Math.round(channel + (toChannels[index] - channel) * amount)
);
return `rgb(${channels.join(",")})`;
}

function drawStars(ctx, canvasWidth, canvasHeight, opacity) {
if (opacity <= 0) return;

ctx.save();
ctx.globalAlpha = opacity;
ctx.fillStyle = "#ffffff";
for (let index = 0; index < 28; index++) {
const x = (index * 137.5 + 23) % canvasWidth;
const y = (index * 71 + 19) % (canvasHeight * 0.58);
const radius = index % 4 === 0 ? 2 : 1;
ctx.beginPath();
ctx.arc(x, y, radius, 0, Math.PI * 2);
ctx.fill();
}
ctx.restore();
}

function drawSun(ctx, x, y, opacity) {
if (opacity <= 0) return;

ctx.save();
ctx.globalAlpha = opacity;
ctx.strokeStyle = "#ffd34e";
ctx.lineWidth = 4;
for (let ray = 0; ray < 8; ray++) {
const angle = ray * Math.PI / 4;
ctx.beginPath();
ctx.moveTo(x + Math.cos(angle) * 34, y + Math.sin(angle) * 34);
ctx.lineTo(x + Math.cos(angle) * 44, y + Math.sin(angle) * 44);
ctx.stroke();
}

ctx.fillStyle = "#ffdc62";
ctx.beginPath();
ctx.arc(x, y, 27, 0, Math.PI * 2);
ctx.fill();
ctx.restore();
}

function drawMoon(ctx, x, y, opacity) {
if (opacity <= 0) return;

ctx.save();
ctx.globalAlpha = opacity;
ctx.fillStyle = "#f4f0c8";
ctx.beginPath();
ctx.arc(x, y, 25, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = "rgba(120, 130, 160, 0.35)";
ctx.beginPath();
ctx.arc(x - 8, y - 5, 5, 0, Math.PI * 2);
ctx.arc(x + 9, y + 7, 4, 0, Math.PI * 2);
ctx.arc(x + 7, y - 12, 2.5, 0, Math.PI * 2);
ctx.fill();
ctx.restore();
}

export function drawBackground(ctx, canvasWidth, canvasHeight, dayNightPhase = 0.25) {
const phase = dayNightPhase % 1;
const dayAmount = (1 + Math.sin(phase * Math.PI * 2)) / 2;
ctx.fillStyle = mixColor("#101a3c", "#70c5ce", dayAmount);
ctx.fillRect(0, 0, canvasWidth, canvasHeight);

drawStars(ctx, canvasWidth, canvasHeight, 1 - dayAmount);

ctx.save();
ctx.globalAlpha = dayAmount;
drawCloud(ctx, 35, 115, 1, "#ffffff");
drawCloud(ctx, 175, 190, 0.8, "#ffffff");
drawCloud(ctx, 245, 105, 0.7, "#ffffff");
ctx.restore();

const horizonY = canvasHeight + 20;
const arcHeight = horizonY - 75;
if (phase < 0.5) {
const sunProgress = phase * 2;
const sunX = sunProgress * canvasWidth;
const sunY = horizonY - Math.sin(sunProgress * Math.PI) * arcHeight;
const sunOpacity = Math.min(1, sunProgress * 8, (1 - sunProgress) * 8);
drawSun(ctx, sunX, sunY, sunOpacity);
} else {
const moonProgress = (phase - 0.5) * 2;
const moonX = (1 - moonProgress) * canvasWidth;
const moonY = horizonY - Math.sin(moonProgress * Math.PI) * arcHeight;
const moonOpacity = Math.min(1, moonProgress * 8, (1 - moonProgress) * 8);
drawMoon(ctx, moonX, moonY, moonOpacity);
}
}