import { mapRange } from './utils.js';

export class AudioController {
  constructor() {
    this.ctx = null;
    this.osc = null;
    this.filter = null;
    this.gainNode = null;
    this.compressor = null;
    this.initialized = false;
    this.isPlaying = false;
    this.muted = false;
    
    this.currentWaveform = 'triangle';
    this.maxVolume = 0.15;
    this.baseFreqRange = { min: 120, max: 600 };
    this.filterRange = { min: 200, max: 3000 };
  }

  // Set up synth routing: Osc -> Filter -> Gain -> Compressor -> Destination
  init() {
    if (this.initialized) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      this.gainNode.connect(this.compressor);

      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.Q.setValueAtTime(3.0, this.ctx.currentTime);
      this.filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
      this.filter.connect(this.gainNode);

      this.osc = this.ctx.createOscillator();
      this.osc.type = this.currentWaveform;
      this.osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      this.osc.connect(this.filter);
      
      this.osc.start(0);
      this.initialized = true;
      this.isPlaying = true;
    } catch (e) {
      console.error('Audio initialization failed:', e);
    }
  }

  async resume() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  setWaveform(type) {
    this.currentWaveform = type;
    if (this.osc) {
      this.osc.type = type;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted && this.gainNode) {
      this.gainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.01);
    }
    return this.muted;
  }

  // Modulate synth based on index finger position and speed
  update(x, y, speed, isDrawing) {
    if (!this.initialized || this.muted) return;
    
    const now = this.ctx.currentTime;
    if (this.ctx.state === 'suspended') return;

    if (!isDrawing) {
      this.gainNode.gain.setTargetAtTime(0, now, 0.04);
      return;
    }

    // Map Y position to pitch, adding a modulation factor based on speed
    const invertY = 1.0 - y;
    const baseFreq = mapRange(invertY, 0, 1, this.baseFreqRange.min, this.baseFreqRange.max);
    const speedPitchMod = mapRange(speed, 0, 0.08, 0, 200); 
    const targetFreq = baseFreq + speedPitchMod;

    // Map X position to lowpass filter cutoff
    const targetCutoff = mapRange(x, 0, 1, this.filterRange.min, this.filterRange.max);

    // Map speed to volume level
    const targetGain = mapRange(speed, 0.002, 0.05, 0, this.maxVolume);

    // Apply sweeps exponentially to prevent clicks
    this.osc.frequency.setTargetAtTime(targetFreq, now, 0.05);
    this.filter.frequency.setTargetAtTime(targetCutoff, now, 0.06);
    this.gainNode.gain.setTargetAtTime(targetGain, now, 0.03);
  }

  destroy() {
    if (!this.initialized) return;
    try {
      if (this.osc) {
        this.osc.stop();
        this.osc.disconnect();
      }
      if (this.filter) this.filter.disconnect();
      if (this.gainNode) this.gainNode.disconnect();
      if (this.compressor) this.compressor.disconnect();
      if (this.ctx) this.ctx.close();
      this.initialized = false;
    } catch (e) {
      console.error(e);
    }
  }
}
