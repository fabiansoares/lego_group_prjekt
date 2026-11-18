const symbols = ["🧱", "🪙", "🚀", "🦖", "⭐", "💎", "🍒", "🎮"];
const memoryGrid = document.querySelector("#memory-grid");
const pairCount = document.querySelector("#pair-count");
const moveCountDisplay = document.querySelector("#move-count");
const timerDisplay = document.querySelector("#timer-display");
const gameStatus = document.querySelector("#game-status");
const restartButton = document.querySelector("#restart");
const winScreen = document.querySelector("#win-screen");
const winSummary = document.querySelector("#win-summary");
const playAgainButton = document.querySelector("#play-again");

let openCards = [];
let matchedPairs = 0;
let moveCount = 0;
let locked = false;
let mismatchTimer;
let timerInterval;
let gameStartedAt;
let winAudioContext;
const cardFlipAudio = new Audio("card-flip.mp3");
cardFlipAudio.preload = "auto";
cardFlipAudio.volume = 0.45;

function playFlipSound() {
  cardFlipAudio.currentTime = 0;
  cardFlipAudio.play().catch((error) => {
    console.error("Memory Match card flip audio could not be played.", error);
  });
}

function playWinSound() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) return;
  if (!winAudioContext) {
    try {
      winAudioContext = new AudioContextConstructor();
    } catch (error) {
      console.error("Memory Match victory audio could not be initialized.", error);
      return;
    }
  }

  const playFanfare = () => {
    if (winAudioContext.state !== "running") return;

    const playTone = (frequency, startTime, duration, waveform, volume) => {
      const oscillator = winAudioContext.createOscillator();
      const gain = winAudioContext.createGain();
      oscillator.type = waveform;
      oscillator.frequency.setValueAtTime(frequency, startTime);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      oscillator.connect(gain);
      gain.connect(winAudioContext.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const melody = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51];
    const firstNoteTime = winAudioContext.currentTime + 0.24;
    melody.forEach((frequency, index) => {
      playTone(frequency, firstNoteTime + index * 0.1, 0.2, "square", 0.14);
    });

    const chordTime = firstNoteTime + melody.length * 0.1;
    for (const frequency of [261.63, 523.25, 659.25, 783.99, 1046.5]) {
      playTone(frequency, chordTime, 0.65, "triangle", frequency === 261.63 ? 0.1 : 0.055);
    }
  };

  if (winAudioContext.state === "suspended") {
    winAudioContext.resume().then(playFanfare).catch((error) => {
      console.error("Memory Match victory audio could not be enabled.", error);
    });
  } else {
    playFanfare();
  }
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateTimer() {
  if (gameStartedAt === undefined) return;
  const elapsedSeconds = Math.floor((Date.now() - gameStartedAt) / 1000);
  timerDisplay.textContent = formatTime(elapsedSeconds);
}

function startTimer() {
  if (gameStartedAt !== undefined) return;
  gameStartedAt = Date.now();
  updateTimer();
  timerInterval = window.setInterval(updateTimer, 1000);
}

function stopTimer() {
  if (gameStartedAt === undefined) return 0;
  const elapsedSeconds = Math.floor((Date.now() - gameStartedAt) / 1000);
  window.clearInterval(timerInterval);
  timerInterval = undefined;
  gameStartedAt = undefined;
  timerDisplay.textContent = formatTime(elapsedSeconds);
  return elapsedSeconds;
}

function shuffle(cards) {
  for (let index = cards.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
  }
  return cards;
}

function setCardOpen(button, card, cardNumber, isOpen) {
  button.classList.toggle("is-open", isOpen);
  button.setAttribute("aria-pressed", String(isOpen || button.disabled));
  button.setAttribute(
    "aria-label",
    isOpen || button.disabled
      ? `Card ${cardNumber}, ${card.symbol}${button.disabled ? ", matched" : ""}`
      : `Card ${cardNumber}, face down`
  );
}

function revealCard(button, card, cardNumber) {
  if (locked || button.disabled || button.classList.contains("is-open")) return;

  playFlipSound();
  startTimer();
  setCardOpen(button, card, cardNumber, true);
  openCards.push({ button, card, cardNumber });

  if (openCards.length < 2) {
    gameStatus.textContent = "Choose one more card.";
    return;
  }

  moveCount += 1;
  moveCountDisplay.textContent = String(moveCount);
  const [first, second] = openCards;
  if (first.card.symbol === second.card.symbol) {
    first.button.disabled = true;
    second.button.disabled = true;
    matchedPairs += 1;
    pairCount.textContent = String(matchedPairs);
    openCards = [];
    if (matchedPairs === symbols.length) {
      gameStatus.textContent = "You win!";
      const elapsedSeconds = stopTimer();
      winSummary.textContent =
        `You found all 8 pairs in ${moveCount} moves and ${formatTime(elapsedSeconds)}.`;
      winScreen.showModal();
      playWinSound();
      playAgainButton.focus();
    } else {
      gameStatus.textContent = "It's a match!";
    }
    return;
  }

  locked = true;
  gameStatus.textContent = "Not a match. Try to remember them!";
  mismatchTimer = window.setTimeout(() => {
    for (const openedCard of openCards) {
      setCardOpen(
        openedCard.button,
        openedCard.card,
        openedCard.cardNumber,
        false
      );
    }
    openCards = [];
    locked = false;
    gameStatus.textContent = "Cards flipped back. Find another pair!";
  }, 850);
}

function startGame() {
  window.clearTimeout(mismatchTimer);
  window.clearInterval(timerInterval);
  openCards = [];
  matchedPairs = 0;
  moveCount = 0;
  locked = false;
  gameStartedAt = undefined;
  timerInterval = undefined;
  pairCount.textContent = "0";
  moveCountDisplay.textContent = "0";
  timerDisplay.textContent = "00:00";
  gameStatus.textContent = "Flip any two cards to find a pair.";
  if (winScreen.open) winScreen.close();

  const deck = shuffle(
    symbols.flatMap((symbol) => [
      { symbol },
      { symbol }
    ])
  );
  const cardElements = deck.map((card, index) => {
    const cardNumber = index + 1;
    const button = document.createElement("button");
    button.className = "memory-card";
    button.type = "button";
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `Card ${cardNumber}, face down`);
    button.innerHTML = `
      <span class="card-inner">
        <span class="card-face card-back" aria-hidden="true">?</span>
        <span class="card-face card-front" aria-hidden="true">${card.symbol}</span>
      </span>
    `;
    button.addEventListener("click", () => revealCard(button, card, cardNumber));
    return button;
  });

  memoryGrid.replaceChildren(...cardElements);
}

restartButton.addEventListener("click", startGame);
playAgainButton.addEventListener("click", startGame);
startGame();
