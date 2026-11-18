// Game settings
const config = {
type: Phaser.AUTO,
width: 800,
height: 450,
backgroundColor: "#87ceeb",
physics: {
default: "arcade",
arcade: { gravity: { y: 1500 }, debug: false }
},
scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
scene: { create, update }
};
const game = new Phaser.Game(config);
const LEVEL_WIDTH = 2400;
let player, platforms, cursors;
function create() {
// Make simple colored blocks as graphics, so we don't need image files yet
const g = this.make.graphics({ x: 0, y: 0, add: false });
g.fillStyle(0xff4d4d);
g.fillRect(0, 0, 32, 48);
g.generateTexture("player", 32, 48);
g.clear();
g.fillStyle(0x4caf50);
g.fillRect(0, 0, 64, 32);
g.generateTexture("ground", 64, 32);
g.destroy();
// The level is wider than the screen
this.physics.world.setBounds(0, 0, LEVEL_WIDTH, 450);
this.cameras.main.setBounds(0, 0, LEVEL_WIDTH, 450);
// Platforms: the ground along the bottom, plus some floating ones
platforms = this.physics.add.staticGroup();
for (let x = 32; x < LEVEL_WIDTH; x += 64) {
platforms.create(x, 434, "ground");
}
platforms.create(400, 330, "ground");
platforms.create(464, 330, "ground");
platforms.create(700, 260, "ground");
platforms.create(764, 260, "ground");
platforms.create(1000, 330, "ground");
// The player
player = this.physics.add.sprite(100, 300, "player");
player.setCollideWorldBounds(true);
this.physics.add.collider(player, platforms);
// The camera follows the player
this.cameras.main.startFollow(player);
// Arrow keys and space
cursors = this.input.keyboard.createCursorKeys();
}
function update() {
// Run left and right
if (cursors.left.isDown) {
player.setVelocityX(-190);
} else if (cursors.right.isDown) {
player.setVelocityX(190);
} else {
 player.setVelocityX(0);
}
// Jump, but only when standing on something
const onGround = player.body.blocked.down || player.body.touching.down;
if ((cursors.up.isDown || cursors.space.isDown) && onGround) {
player.setVelocityY(-480);
}
}   