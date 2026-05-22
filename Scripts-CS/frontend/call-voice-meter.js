(function (global) {
  const BAR_COUNT = 9;
  const BAR_PIXEL_MAX = 22;

  const METER_TUNING = {
    user: {
      baselineScale: 0,
      rmsToLevel: 24,
      peakScale: 20,
      analyserSmoothing: 0.12,
      levelAttack: 0.72,
      levelDecay: 0.82,
    },
    assistant: {
      baselineScale: 0,
      rmsToLevel: 14,
      peakScale: 16,
      analyserSmoothing: 0.18,
      levelAttack: 0.68,
      levelDecay: 0.82,
    },
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function CallVoiceMeter(container, role) {
    this.container = container;
    this.role = role === 'user' ? 'user' : 'assistant';
    this.tuning = METER_TUNING[this.role];
    this.stream = null;
    this.active = false;
    this.frozen = false;
    this.levels = new Array(BAR_COUNT).fill(0);
    this.smoothedLevel = 0;
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.silentGain = null;
    this._outputConnected = false;
    this.rafId = null;
    this.bars = [];
    this._build();
  }

  CallVoiceMeter.prototype._build = function () {
    this.container.innerHTML = '';
    this.container.className = 'call-voice-meter';
    for (let i = 0; i < BAR_COUNT; i += 1) {
      const bar = document.createElement('span');
      bar.className = 'call-voice-meter__bar';
      bar.style.height = '2px';
      this.container.appendChild(bar);
      this.bars.push(bar);
    }
  };

  CallVoiceMeter.prototype._resumeContext = function () {
    if (!this.audioContext || this.audioContext.state !== 'suspended') {
      return Promise.resolve();
    }
    return this.audioContext.resume().catch(function () {});
  };

  CallVoiceMeter.prototype._ensureAnalyser = function () {
    if (!this.stream) return;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!this.audioContext) {
      this.audioContext = new AudioContextCtor();
      this.silentGain = this.audioContext.createGain();
      this.silentGain.gain.value = 0;
    }
    if (this.source) {
      try {
        this.source.disconnect();
      } catch (_) {}
    }
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = this.tuning.analyserSmoothing;
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.source.connect(this.analyser);
    this.analyser.connect(this.silentGain);
    if (!this._outputConnected) {
      this.silentGain.connect(this.audioContext.destination);
      this._outputConnected = true;
    }
    this.timeData = new Uint8Array(this.analyser.fftSize);
    void this._resumeContext();
  };

  CallVoiceMeter.prototype._tick = function () {
    const decay = this.tuning.levelDecay || 0.82;
    if (!this.active || this.frozen || !this.analyser) {
      this.smoothedLevel *= decay;
    } else {
      this.analyser.getByteTimeDomainData(this.timeData);
      let sum = 0;
      let peak = 0;
      for (let i = 0; i < this.timeData.length; i += 1) {
        const v = Math.abs((this.timeData[i] - 128) / 128);
        if (v > peak) peak = v;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / this.timeData.length);
      const energy = Math.max(
        rms * this.tuning.rmsToLevel,
        peak * (this.tuning.peakScale || 14)
      );
      const target = clamp(energy, this.tuning.baselineScale, 1);
      const rate = target > this.smoothedLevel ? this.tuning.levelAttack : decay;
      this.smoothedLevel += (target - this.smoothedLevel) * rate;
    }

    const now = performance.now();
    for (let i = 0; i < BAR_COUNT; i += 1) {
      const center = (BAR_COUNT - 1) / 2;
      const dist = Math.abs(i - center) / center;
      let level = this.smoothedLevel * (1 - dist * 0.22);
      if (level > 0.06) {
        level *= 0.88 + 0.24 * Math.sin(now / 95 + i * 1.15);
      }
      this.levels[i] = clamp(level, 0, 1);
      const h = Math.max(2, this.levels[i] * BAR_PIXEL_MAX);
      if (this.bars[i]) this.bars[i].style.height = `${h}px`;
    }

    this.rafId = window.requestAnimationFrame(this._tick.bind(this));
  };

  CallVoiceMeter.prototype.setStream = function (stream) {
    if (this.stream === stream && this.analyser) {
      void this._resumeContext();
      return;
    }
    this.stream = stream;
    if (this.source) {
      try {
        this.source.disconnect();
      } catch (_) {}
    }
    this.analyser = null;
    this.source = null;
    if (stream) this._ensureAnalyser();
  };

  CallVoiceMeter.prototype.setActive = function (active) {
    this.active = Boolean(active);
  };

  CallVoiceMeter.prototype.setFrozen = function (frozen) {
    this.frozen = Boolean(frozen);
  };

  CallVoiceMeter.prototype.start = function () {
    if (this.rafId) return;
    this.rafId = window.requestAnimationFrame(this._tick.bind(this));
  };

  CallVoiceMeter.prototype.stop = function () {
    if (this.rafId) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.source) {
      try {
        this.source.disconnect();
      } catch (_) {}
    }
    if (this.audioContext) {
      this.audioContext.close().catch(function () {});
    }
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.silentGain = null;
    this._outputConnected = false;
  };

  global.CallVoiceMeter = CallVoiceMeter;
})(window);
