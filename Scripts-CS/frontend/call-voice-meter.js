(function (global) {
  const BAR_COUNT = 9;
  const BAR_PIXEL_MAX = 22;

  const METER_TUNING = {
    user: { baselineScale: 0.08, rmsToLevel: 14, analyserSmoothing: 0.28, levelAttack: 0.52 },
    assistant: { baselineScale: 0.16, rmsToLevel: 5.6, analyserSmoothing: 0.42, levelAttack: 0.42 },
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

  CallVoiceMeter.prototype._ensureAnalyser = function () {
    if (!this.stream) return;
    if (this.analyser && this.source) return;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!this.audioContext) this.audioContext = new AudioContextCtor();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = this.tuning.analyserSmoothing;
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.source.connect(this.analyser);
    this.timeData = new Uint8Array(this.analyser.fftSize);
  };

  CallVoiceMeter.prototype._tick = function () {
    if (!this.active || this.frozen || !this.analyser) {
      this.smoothedLevel *= 0.85;
    } else {
      this.analyser.getByteTimeDomainData(this.timeData);
      let sum = 0;
      for (let i = 0; i < this.timeData.length; i += 1) {
        const v = (this.timeData[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / this.timeData.length);
      const target = clamp(rms * this.tuning.rmsToLevel, this.tuning.baselineScale, 1);
      this.smoothedLevel += (target - this.smoothedLevel) * this.tuning.levelAttack;
    }

    for (let i = 0; i < BAR_COUNT; i += 1) {
      const center = (BAR_COUNT - 1) / 2;
      const dist = Math.abs(i - center) / center;
      const level = this.smoothedLevel * (1 - dist * 0.35);
      this.levels[i] = level;
      const h = Math.max(2, level * BAR_PIXEL_MAX);
      if (this.bars[i]) this.bars[i].style.height = `${h}px`;
    }

    this.rafId = window.requestAnimationFrame(this._tick.bind(this));
  };

  CallVoiceMeter.prototype.setStream = function (stream) {
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
  };

  global.CallVoiceMeter = CallVoiceMeter;
})(window);
