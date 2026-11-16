const MIN_BUILDING_SPEED = 2;
const MAX_BUILDING_SPEED = 6;
const MIN_BUILDING_GAP_HEIGHT = 150;
const MAX_BUILDING_GAP_HEIGHT = 190;
const ROOF_STYLES = ["gable", "flat"];
const BODY_COLORS = ["#ef4444", "#f4c430", "#168bd2", "#36a852", "#f28c28"];
const ROOF_COLORS = ["#d62828", "#2255aa", "#e5a900", "#258341"];
const WINDOW_COLORS = ["#8be2f2", "#fff0a8", "#b8e4ff"];
const DOOR_COLORS = ["#1769aa", "#d62828", "#258341", "#f28c28"];

function randomItem(items) {
return items[Math.floor(Math.random() * items.length)];
}

function drawBrickPattern(ctx, x, y, width, height, color) {
const brickWidth = 22;
const brickHeight = 20;

ctx.fillStyle = color;
ctx.fillRect(x, y, width, height);

for (let row = 0; row < height; row += brickHeight) {
const rowHeight = Math.min(brickHeight, height - row);
const offset = row % (brickHeight * 2) === 0 ? 0 : brickWidth / 2;

ctx.strokeStyle = "rgba(45, 40, 35, 0.4)";
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(x, y + row + rowHeight);
ctx.lineTo(x + width, y + row + rowHeight);

for (let seam = offset; seam < width; seam += brickWidth) {
ctx.moveTo(x + seam, y + row);
ctx.lineTo(x + seam, y + row + rowHeight);
}
ctx.stroke();

for (let stud = offset; stud < width; stud += brickWidth) {
const studX = x + stud + brickWidth / 2;
if (studX < x + 3 || studX > x + width - 3) continue;

ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
ctx.beginPath();
ctx.ellipse(studX, y + row + 3, 5, 2.5, 0, 0, Math.PI * 2);
ctx.fill();
ctx.strokeStyle = "rgba(45, 40, 35, 0.35)";
ctx.stroke();
}
}
}

export function createBuilding(x) {
const width = 64 + Math.floor(Math.random() * 33);
const height = 85 + Math.floor(Math.random() * 66);
const roofStyle = randomItem(ROOF_STYLES);

return {
x,
width,
height,
speed: MIN_BUILDING_SPEED + Math.random() * (MAX_BUILDING_SPEED - MIN_BUILDING_SPEED),
gapHeight: MIN_BUILDING_GAP_HEIGHT +
  Math.random() * (MAX_BUILDING_GAP_HEIGHT - MIN_BUILDING_GAP_HEIGHT),
roofStyle,
roofHeight: roofStyle === "gable" ? 25 + Math.floor(Math.random() * 16) : 14,
bodyColor: randomItem(BODY_COLORS),
hangingColor: randomItem(BODY_COLORS),
roofColor: randomItem(ROOF_COLORS),
windowColor: randomItem(WINDOW_COLORS),
doorColor: randomItem(DOOR_COLORS),
windowColumns: width > 82 ? 2 : 1,
windowRows: height > 118 ? 2 : 1,
passed: false
};
}

function drawBuilding(ctx, building, canvasHeight) {
const bodyTop = canvasHeight - building.height;
const hangingBottom = bodyTop - building.roofHeight - building.gapHeight;
drawBrickPattern(ctx, building.x, 0, building.width, hangingBottom, building.hangingColor);

const hangingWindowY = 20;
ctx.fillStyle = "#263238";
ctx.fillRect(building.x + building.width / 2 - 10, hangingWindowY - 3, 20, 24);
ctx.fillStyle = building.windowColor;
ctx.fillRect(building.x + building.width / 2 - 7, hangingWindowY, 14, 18);

ctx.strokeStyle = "rgba(45, 40, 35, 0.6)";
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(building.x, hangingBottom);
ctx.lineTo(building.x + building.width, hangingBottom);
ctx.stroke();

drawBrickPattern(ctx, building.x, bodyTop, building.width, building.height, building.bodyColor);

if (building.roofStyle === "gable") {
ctx.save();
ctx.beginPath();
ctx.moveTo(building.x - 8, bodyTop);
ctx.lineTo(building.x + building.width / 2, bodyTop - building.roofHeight);
ctx.lineTo(building.x + building.width + 8, bodyTop);
ctx.closePath();
ctx.clip();
drawBrickPattern(
ctx,
building.x - 8,
bodyTop - building.roofHeight,
building.width + 16,
building.roofHeight + 2,
building.roofColor
);
ctx.restore();
ctx.strokeStyle = "rgba(45, 40, 35, 0.6)";
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(building.x - 8, bodyTop);
ctx.lineTo(building.x + building.width / 2, bodyTop - building.roofHeight);
ctx.lineTo(building.x + building.width + 8, bodyTop);
ctx.stroke();
} else {
drawBrickPattern(
ctx,
building.x - 4,
bodyTop - building.roofHeight,
building.width + 8,
building.roofHeight,
building.roofColor
);
}

ctx.fillStyle = building.windowColor;
for (let row = 0; row < building.windowRows; row++) {
for (let column = 0; column < building.windowColumns; column++) {
const windowX = building.x + building.width * (column + 1) / (building.windowColumns + 1) - 7;
const windowY = bodyTop + 18 + row * 30;
ctx.fillStyle = "#263238";
ctx.fillRect(windowX - 3, windowY - 3, 20, 24);
ctx.fillStyle = building.windowColor;
ctx.fillRect(windowX, windowY, 14, 18);
ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
ctx.fillRect(windowX + 2, windowY + 2, 3, 14);
}
}

const doorWidth = 16;
ctx.fillStyle = "#263238";
ctx.fillRect(building.x + (building.width - doorWidth) / 2 - 3, canvasHeight - 45, doorWidth + 6, 45);
ctx.fillStyle = building.doorColor;
ctx.fillRect(building.x + (building.width - doorWidth) / 2, canvasHeight - 42, doorWidth, 42);
ctx.fillStyle = "#ffd52a";
ctx.beginPath();
ctx.arc(building.x + building.width / 2 + 4, canvasHeight - 22, 1.5, 0, Math.PI * 2);
ctx.fill();
}

export function drawBuildings(ctx, buildings, canvasHeight) {
for (const building of buildings) {
drawBuilding(ctx, building, canvasHeight);
}
}

export function updateBuildings(buildings, player, canvasWidth, canvasHeight) {
let passed = 0;
let collided = false;

for (const building of buildings) {
building.x -= building.speed;

if (!building.passed && building.x + building.width < player.x) {
building.passed = true;
passed += 1;
}

const roofOverhang = building.roofStyle === "gable" ? 8 : 0;
const buildingTop = canvasHeight - building.height - building.roofHeight;
const hangingBottom = buildingTop - building.gapHeight;
const overlapsHorizontally = player.x + player.width > building.x - roofOverhang &&
player.x < building.x + building.width + roofOverhang;
const overlapsHangingHorizontally = player.x + player.width > building.x &&
player.x < building.x + building.width;

if ((overlapsHorizontally && player.y + player.height > buildingTop) ||
  (overlapsHangingHorizontally && player.y < hangingBottom)) {
collided = true;
}
}

while (buildings.length && buildings[0].x + buildings[0].width < 0) {
buildings.shift();
}

const lastBuilding = buildings[buildings.length - 1];
if (lastBuilding && lastBuilding.x < canvasWidth - 220) {
buildings.push(createBuilding(canvasWidth + 260 + Math.random() * 140));
}

return { passed, collided };
}