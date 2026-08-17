/**
 * SpeakHero - Web Audio API Sound Synthesizer
 * Zero-dependency sound effects (Countdown beeps, Task complete, Streak fanfare).
 */

class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playBeep(freq = 440, type = 'sine', duration = 0.1, gainVal = 0.15) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // 3-2-1 Countdown Beep
  countdownBeep(isFinal = false) {
    if (isFinal) {
      this.playBeep(880, 'triangle', 0.25, 0.25);
    } else {
      this.playBeep(440, 'sine', 0.12, 0.15);
    }
  }

  // Start recording sound
  startRecord() {
    this.playBeep(523.25, 'sine', 0.1, 0.2); // C5
    setTimeout(() => this.playBeep(659.25, 'sine', 0.15, 0.2), 80); // E5
  }

  // Stop recording sound
  stopRecord() {
    this.playBeep(659.25, 'sine', 0.1, 0.2); // E5
    setTimeout(() => this.playBeep(523.25, 'sine', 0.15, 0.2), 80); // C5
  }

  // Task completed ding
  taskComplete() {
    if (!this.enabled) return;
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => this.playBeep(freq, 'triangle', 0.2, 0.15), i * 70);
    });
  }

  // Streak/Daily fully complete celebratory fanfare
  celebrateFanfare() {
    if (!this.enabled) return;
    this.init();
    const chords = [
      { f: 523.25, d: 0.15 }, // C
      { f: 659.25, d: 0.15 }, // E
      { f: 783.99, d: 0.15 }, // G
      { f: 1046.50, d: 0.35 } // High C
    ];
    chords.forEach((c, idx) => {
      setTimeout(() => this.playBeep(c.f, 'triangle', c.d, 0.25), idx * 100);
    });
  }
}

export const sound = new SoundFX();
