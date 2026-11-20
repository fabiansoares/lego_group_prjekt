// ===== Settings =====
const COLS = 10; // board width in blocks
const ROWS = 20; // board height in blocks
const BLOCK = 30; // size of one block in pixels
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
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
// ===== The board =====
// A matrix of 20 rows x 10 columns.
// 0 = empty, a color = a block that has already landed there.
function createBoard() {
return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}
let board = createBoard();
// Some example bricks on the board, to show how it the matrix works
const R = "#ff3b3b", B = "#3d6bff", G = "#33cc33";
board[18] = [0, R, 0, 0, 0, B, 0, 0, G, 0];
board[19] = [R, R, 0, B, B, B, 0, G, G, 0];
// ===== The falling piece =====
// Which shape it is, its color, and where it is on the board (column x, row
y)
let piece = {
shape: SHAPES[2], // the T piece
color: COLORS[2],
x: 4,
y: 0,
};
// ===== Drawing =====
function drawBlock(x, y, color) {
ctx.fillStyle = color;
ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK - 1, BLOCK - 1); // -1 leaves a
small gap
}
function draw() {
ctx.clearRect(0, 0, canvas.width, canvas.height);
// 1. The blocks that have landed
board.forEach((row, y) => {
row.forEach((cell, x) => {
   if (cell) drawBlock(x, y, cell);
});
});
// 2. The falling piece: its own grid, moved to its position on the board
piece.shape.forEach((row, r) => {
row.forEach((value, c) => {
if (value) drawBlock(piece.x + c, piece.y + r, piece.color);
});
});
}
draw(); // draw once. Nothing moves yet: that's your job! 