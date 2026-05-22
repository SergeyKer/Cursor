(function (global) {
  const BAR_COUNT = 9;
  const BAR_PIXEL_MAX = 22;
  const MIN_BAR_PX = 2;

  /** Единые параметры для микрофона и удалённого потока — одинаковая громкость и темп отклика. */
  const METER_TUNING = {
    rmsToLevel: 18,
    peakScale: 16,
    analyserSmoothing: 0.15,
    levelAttack: 0.62,
    levelDecay: 0.76,
    silenceLevel: 0.035,
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function CallVoiceMeter(container) {
    this.container = container;
    this.tuning = METER_TUNING;
    this.stream = null;
    this.active = false;
    this.frozen = false;
    this.barLevels = new Array(BAR_COUNT).fill(0);
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
      bar.style.height = `${MIN_BAR_PX}px`;
      this.container.appendChild(bar);
      this.bars.push(bar);
    }
  };

  CallVoiceMeter.prototype._applyBarHeights = function () {
    for (let i = 0; i < BAR_COUNT; i += 1) {
      const level = this.barLevels[i] <= this.tuning.silenceLevel ? 0 : this.barLevels[i];
      const h = Math.max(MIN_BAR_PX, level * BAR_PIXEL_MAX);
      if (this.bars[i]) this.bars[i].style.height = `${h}px`;
    }
  };

  CallVoiceMeter.prototype.reset = function () {
    for (let i = 0; i < BAR_COUNT; i += 1) {
      this.barLevels[i] = 0;
    }
    this._applyBarHeights();
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

  CallVoiceMeter.prototype._measureBarTargets = function () {
    const sliceSize = Math.max(1, Math.floor(this.timeData.length / BAR_COUNT));
    const targets = new Array(BAR_COUNT);
    for (let i = 0; i < BAR_COUNT; i += 1) {
      const start = i * sliceSize;
      const end = i === BAR_COUNT - 1 ? this.timeData.length : start + sliceSize;
      let sum = 0;
      let peak = 0;
      for (let j = start; j < end; j += 1) {
        const v = Math.abs((this.timeData[j] - 128) / 128);
        if (v > peak) peak = v;
        sum += v * v;
      }
      const count = Math.max(1, end - start);
      const rms = Math.sqrt(sum / count);
      const energy = Math.max(
        rms * this.tuning.rmsToLevel,
        peak * this.tuning.peakScale
      );
      targets[i] = clamp(energy, 0, 1);
    }
    return targets;
  };

  CallVoiceMeter.prototype._tick = function () {
    const decay = this.tuning.levelDecay;
    const attack = this.tuning.levelAttack;

    if (!this.active || this.frozen || !this.analyser) {
      for (let i = 0; i < BAR_COUNT; i += 1) {
        this.barLevels[i] *= decay;
        if (this.barLevels[i] < this.tuning.silenceLevel) this.barLevels[i] = 0;
      }
    } else {
      this.analyser.getByteTimeDomainData(this.timeData);
      const targets = this._measureBarTargets();
      for (let i = 0; i < BAR_COUNT; i += 1) {
        const rate = targets[i] > this.barLevels[i] ? attack : decay;
        this.barLevels[i] += (targets[i] - this.barLevels[i]) * rate;
        if (this.barLevels[i] < this.tuning.silenceLevel) this.barLevels[i] = 0;
      }
    }

    this._applyBarHeights();
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
    const wasFrozen = this.frozen;
    this.frozen = Boolean(frozen);
    if (this.frozen && !wasFrozen) this.reset();
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
    this.reset();
  };

  global.CallVoiceMeter = CallVoiceMeter;
  global.CALL_VOICE_METER_TUNING = METER_TUNING;
})(window);
