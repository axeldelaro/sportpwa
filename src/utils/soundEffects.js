// Générateur sonore 100% local via Web Audio API (aucun fichier mp3/wav externe requis)

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx) {
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(freq = 880, durationSec = 0.12, type = 'sine', volume = 0.18, startTimeOffset = 0) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime + startTimeOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  } catch {
    // Ignore si l'audio est bloqué par le navigateur avant interaction
  }
}

export function playTickBeep() {
  playTone(660, 0.08, 'sine', 0.14, 0);
}

export function playRestFinishedAlert() {
  playTone(784, 0.12, 'triangle', 0.22, 0);
  playTone(1046.5, 0.22, 'triangle', 0.25, 0.14);
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([120, 60, 180]);
  }
}

export function playSetValidatedPop() {
  playTone(587.33, 0.07, 'sine', 0.12, 0);
  playTone(880, 0.1, 'sine', 0.14, 0.06);
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(35);
  }
}

export function playWorkoutCompleteFanfare() {
  playTone(523.25, 0.13, 'triangle', 0.2, 0);
  playTone(659.25, 0.13, 'triangle', 0.2, 0.13);
  playTone(783.99, 0.13, 'triangle', 0.22, 0.26);
  playTone(1046.5, 0.35, 'triangle', 0.25, 0.4);
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([100, 50, 100, 50, 250]);
  }
}
