const MIN_WAIT_MS = 2000;
const MAX_WAIT_MS = 5000;
const BEST_TIME_KEY = "reactionRushBestTimeMs";

const gameSurface = document.querySelector("#game-surface");
const gameMessage = document.querySelector("#game-message");
const bestTimeDisplay = document.querySelector("#best-time");
const gameHint = document.querySelector("#game-hint");
const storedBestTime = localStorage.getItem(BEST_TIME_KEY);
let bestTime = storedBestTime === null ? null : Number(storedBestTime);
if (!Number.isSafeInteger(bestTime) || bestTime < 0) bestTime = null;

let state = "ready";
let startTimer;
let greenAt;

function updateBestTimeDisplay() {
  bestTimeDisplay.textContent = bestTime === null ? "Best: —" : `Best: ${bestTime} ms`;
}

function showState(nextState, message, hint) {
  state = nextState;
  document.body.dataset.state = nextState;
  gameSurface.dataset.state = nextState;
  gameMessage.textContent = message;
  gameHint.textContent = hint;
}

updateBestTimeDisplay();

function startRound() {
  window.clearTimeout(startTimer);
  const wait = Math.floor(Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS + 1)) + MIN_WAIT_MS;

  showState("waiting", "Wait for green...", "Don't tap until the screen turns green.");
  startTimer = window.setTimeout(() => {
    greenAt = performance.now();
    showState("go", "TAP NOW!", "Tap the screen!");
  }, wait);
}

gameSurface.addEventListener("click", () => {
  if (state === "ready" || state === "too-soon" || state === "result") {
    startRound();
    return;
  }

  if (state === "waiting") {
    window.clearTimeout(startTimer);
    showState("too-soon", "Too soon!", "Tap anywhere to try again.");
    return;
  }

  if (state === "go") {
    const reactionTime = Math.round(performance.now() - greenAt);
    const isNewBest = bestTime === null || reactionTime < bestTime;
    if (isNewBest) {
      bestTime = reactionTime;
      localStorage.setItem(BEST_TIME_KEY, String(bestTime));
      updateBestTimeDisplay();
    }

    showState(
      "result",
      `${reactionTime} ms`,
      isNewBest ? "New best! Tap anywhere to play again." : "Tap anywhere to play again."
    );
  }
});
