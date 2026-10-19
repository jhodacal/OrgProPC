class AudioService {
  private coinAudio: HTMLAudioElement | null = null;
  private levelUpAudio: HTMLAudioElement | null = null;
  private alarmAudio: HTMLAudioElement | null = null;
  private timerAudio: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.coinAudio = new Audio('./assets/coin.wav');
        this.levelUpAudio = new Audio('./assets/levelup.wav');
        this.alarmAudio = new Audio('./assets/alarm.wav');
        this.timerAudio = new Audio('./assets/timer_ring.ogg');
      } catch (_) {}
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch (_) {
      return null;
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.15) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  }

  playCheck() {
    try {
      this.playTone(587.33, 0.1, 'sine', 0.2); // D5
      setTimeout(() => this.playTone(880, 0.15, 'sine', 0.2), 60); // A5
    } catch (_) {}
  }

  playDelete() {
    try {
      this.playTone(329.63, 0.12, 'triangle', 0.2); // E4
      setTimeout(() => this.playTone(220, 0.18, 'triangle', 0.2), 70); // A3
    } catch (_) {}
  }

  playTrash() {
    this.playDelete();
  }

  playCoin() {
    try {
      if (this.coinAudio) {
        this.coinAudio.currentTime = 0;
        this.coinAudio.volume = 0.6;
        this.coinAudio.play().catch(() => {
          this.playTone(987.77, 0.12, 'sine', 0.2); // B5
        });
      } else {
        this.playTone(987.77, 0.12, 'sine', 0.2);
      }
    } catch (_) {
      this.playTone(987.77, 0.12, 'sine', 0.2);
    }
  }

  playLevelUp() {
    try {
      if (this.levelUpAudio) {
        this.levelUpAudio.currentTime = 0;
        this.levelUpAudio.volume = 0.8;
        this.levelUpAudio.play().catch(() => {
          this.playTone(523.25, 0.1, 'triangle', 0.2);
          setTimeout(() => this.playTone(659.25, 0.1, 'triangle', 0.2), 80);
          setTimeout(() => this.playTone(783.99, 0.2, 'triangle', 0.25), 160);
        });
      } else {
        this.playTone(523.25, 0.1, 'triangle', 0.2);
        setTimeout(() => this.playTone(659.25, 0.1, 'triangle', 0.2), 80);
        setTimeout(() => this.playTone(783.99, 0.2, 'triangle', 0.25), 160);
      }
    } catch (_) {}
  }

  playAlarm() {
    try {
      if (this.alarmAudio) {
        this.alarmAudio.currentTime = 0;
        this.alarmAudio.volume = 0.9;
        this.alarmAudio.play().catch(() => {});
      }
    } catch (_) {}
  }

  playTimerEnd() {
    try {
      if (this.timerAudio) {
        this.timerAudio.currentTime = 0;
        this.timerAudio.volume = 0.7;
        this.timerAudio.play().catch(() => {});
      }
    } catch (_) {}
  }

  speak(text: string) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-PE';
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      } catch (_) {}
    }
  }
}

export default new AudioService();
