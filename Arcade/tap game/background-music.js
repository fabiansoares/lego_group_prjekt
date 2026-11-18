const BEATS_PER_MINUTE = 112;
const BEAT_DURATION = 60 / BEATS_PER_MINUTE;
const LOOP_BEATS = 16;
const LOOP_DURATION = BEAT_DURATION * LOOP_BEATS;
const MELODY = [
523.25, 659.25, 783.99, 659.25,
587.33, 698.46, 880, 698.46,
523.25, 659.25, 783.99, 1046.5,
880, 783.99, 659.25, 523.25
];
const BASS = [
130.81, 0, 130.81, 0,
174.61, 0, 174.61, 0,
196, 0, 196, 0,
130.81, 0, 130.81, 0
];
const SOUND_EFFECTS = {
coin: [
  { frequency: 880, offset: 0, duration: 0.09, waveform: "square", volume: 0.14 },
  { frequency: 1318.51, offset: 0.08, duration: 0.16, waveform: "square", volume: 0.12 }
],
crash: [
  { frequency: 220, offset: 0, duration: 0.16, waveform: "sawtooth", volume: 0.18 },
  { frequency: 146.83, offset: 0.12, duration: 0.2, waveform: "sawtooth", volume: 0.16 },
  { frequency: 98, offset: 0.26, duration: 0.28, waveform: "triangle", volume: 0.18 }
],
shield: [
  { frequency: 659.25, offset: 0, duration: 0.12, waveform: "triangle", volume: 0.14 },
  { frequency: 880, offset: 0.08, duration: 0.12, waveform: "triangle", volume: 0.14 },
  { frequency: 1174.66, offset: 0.16, duration: 0.2, waveform: "sine", volume: 0.16 }
]
};

let audioContext;
let masterGain;
let effectsGain;
let loopTimer;
let enabled = true;
let playing = false;
const activeOscillators = new Set();

function createAudioContext() {
if (audioContext) return true;
if (!window.AudioContext) return false;

audioContext = new window.AudioContext();
masterGain = audioContext.createGain();
masterGain.gain.value = 0;
masterGain.connect(audioContext.destination);
effectsGain = audioContext.createGain();
effectsGain.gain.value = 0.65;
effectsGain.connect(audioContext.destination);
return true;
}

function playTone(frequency, startTime, duration, waveform, volume, output = masterGain) {
const oscillator = audioContext.createOscillator();
const gain = audioContext.createGain();
oscillator.type = waveform;
oscillator.frequency.setValueAtTime(frequency, startTime);
gain.gain.setValueAtTime(0.0001, startTime);
gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
gain.gain.setTargetAtTime(0.0001, startTime + Math.max(duration - 0.04, 0.02), 0.025);
oscillator.connect(gain);
gain.connect(output);
activeOscillators.add(oscillator);
oscillator.addEventListener("ended", () => activeOscillators.delete(oscillator), { once: true });
oscillator.start(startTime);
oscillator.stop(startTime + duration);
}

function scheduleLoop() {
if (!audioContext || !playing || !enabled) return;

const startTime = audioContext.currentTime + 0.05;
for (let beat = 0; beat < LOOP_BEATS; beat++) {
const noteTime = startTime + beat * BEAT_DURATION;
playTone(MELODY[beat], noteTime, BEAT_DURATION * 0.8, "square", 0.12);
if (BASS[beat]) {
playTone(BASS[beat], noteTime, BEAT_DURATION * 1.5, "triangle", 0.16);
}
}
}

export function prepareAudio() {
return createAudioContext();
}

export function playSoundEffect(name) {
const notes = SOUND_EFFECTS[name];
if (!notes || !createAudioContext()) return false;

const startTime = audioContext.currentTime + 0.02;
for (const note of notes) {
playTone(
  note.frequency,
  startTime + note.offset,
  note.duration,
  note.waveform,
  note.volume,
  effectsGain
);
}
return true;
}

export function startBackgroundMusic() {
if (!enabled || !createAudioContext()) return false;
if (!playing) {
playing = true;
masterGain.gain.setTargetAtTime(0.22, audioContext.currentTime, 0.08);
scheduleLoop();
loopTimer = window.setInterval(scheduleLoop, LOOP_DURATION * 1000);
}
return true;
}

export function stopBackgroundMusic() {
playing = false;
if (loopTimer !== undefined) {
window.clearInterval(loopTimer);
loopTimer = undefined;
}
if (audioContext) {
const stopTime = audioContext.currentTime + 0.05;
for (const oscillator of activeOscillators) {
oscillator.stop(stopTime);
}
activeOscillators.clear();
masterGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.05);
}
}

export function setBackgroundMusicEnabled(value) {
enabled = value;
if (!enabled) stopBackgroundMusic();
}
