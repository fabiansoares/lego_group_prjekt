const CONFETTI_COLORS = ["#ef4444", "#f4c430", "#168bd2", "#36a852", "#f28c28", "#ffffff"];

export function burstConfetti(particles, canvasWidth, canvasHeight) {
for (let index = 0; index < 110; index++) {
particles.push({
x: canvasWidth / 2 + (Math.random() - 0.5) * 100,
y: canvasHeight * 0.4,
velocityX: (Math.random() - 0.5) * 9,
velocityY: -3 - Math.random() * 8,
size: 4 + Math.random() * 6,
rotation: Math.random() * Math.PI,
spin: (Math.random() - 0.5) * 0.3,
color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
shape: Math.random() < 0.75 ? "rectangle" : "circle",
age: 0,
lifetime: 150 + Math.random() * 90
});
}
}

export function updateConfetti(particles, canvasHeight) {
for (let index = particles.length - 1; index >= 0; index--) {
const particle = particles[index];
particle.velocityY += 0.16;
particle.x += particle.velocityX;
particle.y += particle.velocityY;
particle.rotation += particle.spin;
particle.age += 1;

if (particle.age >= particle.lifetime || particle.y > canvasHeight + 20) {
particles.splice(index, 1);
}
}
}

export function drawConfetti(ctx, particles) {
for (const particle of particles) {
ctx.save();
ctx.translate(particle.x, particle.y);
ctx.rotate(particle.rotation);
ctx.fillStyle = particle.color;

if (particle.shape === "circle") {
ctx.beginPath();
ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
ctx.fill();
} else {
ctx.fillRect(-particle.size / 2, -particle.size / 3, particle.size, particle.size * 0.66);
}

ctx.restore();
}
}