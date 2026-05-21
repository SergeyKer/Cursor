(function (global) {
  const VOICES = [
    'alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse', 'marin', 'cedar',
  ];
  const VOICE_STORAGE_KEY = 'cs-call-realtime-voice';
  const REALTIME_MODEL = 'gpt-realtime-2';
  const BASE_OPERATOR_CODE = 'Ответ оператора';
  const CALL_WELCOME_HINT =
    'Чтобы позвонить в клиентский отдел компании E-liss, нажмите кнопку «Вызов».';

  const state = {
    phase: 'idle',
    screen: 'start',
    voice: localStorage.getItem(VOICE_STORAGE_KEY) || 'coral',
    messages: [],
    activeProcessCode: BASE_OPERATOR_CODE,
    activeProcessPrompt: '',
    activeSessionInstructions: '',
    activeProcessName: '',
    error: null,
    callStartedAt: null,
    timerInterval: null,
    pendingAssistantText: '',
    greetingTriggered: false,
    assistantResponseActive: false,
    lastResolvedQuery: '',
  };

  let refs = {};
  /** Сколько сообщений уже отрисовано — чтобы не переигрывать enter-анимацию при «Почему так?». */
  let renderedMessageCount = 0;
  let rtc = {
    pc: null,
    dc: null,
    localStream: null,
    remoteStream: null,
    remoteAudio: null,
    aiMeter: null,
    userMeter: null,
  };

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function apiBase() {
    return '';
  }

  function setPhase(phase) {
    state.phase = phase;
    renderStatus();
    updateMeters();
  }

  function formatDuration(seconds) {
    const safe = Math.max(0, Math.floor(seconds));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function startTimer() {
    stopTimer();
    state.callStartedAt = Date.now();
    state.timerInterval = window.setInterval(function () {
      if (refs.timerEl && state.callStartedAt) {
        const elapsed = Math.floor((Date.now() - state.callStartedAt) / 1000);
        refs.timerEl.textContent = formatDuration(elapsed);
      }
    }, 1000);
  }

  function stopTimer() {
    if (state.timerInterval) {
      window.clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
    state.callStartedAt = null;
    if (refs.timerEl) refs.timerEl.textContent = '00:00';
  }

  function renderStatus() {
    if (!refs.statusEl) return;
    const labels = {
      idle: 'Готов к звонку',
      connecting: 'Соединение…',
      listening: 'Слушаю',
      userFinalizing: 'Слушаю',
      assistantPending: 'Оператор отвечает…',
      assistantSpeaking: 'Оператор говорит',
      ended: 'Звонок завершён',
    };
    refs.statusEl.textContent = labels[state.phase] || '';
  }

  function updateMeters() {
    const inCall = ['connecting', 'listening', 'userFinalizing', 'assistantPending', 'assistantSpeaking'].includes(state.phase);
    const aiActive = inCall && (state.phase === 'assistantPending' || state.phase === 'assistantSpeaking' || state.phase === 'listening' || state.phase === 'userFinalizing');
    const userActive = inCall && (state.phase === 'connecting' || state.phase === 'listening' || state.phase === 'userFinalizing');
    if (rtc.aiMeter) {
      rtc.aiMeter.setStream(rtc.remoteStream);
      rtc.aiMeter.setActive(aiActive);
      rtc.aiMeter.setFrozen(state.phase === 'ended');
    }
    if (rtc.userMeter) {
      rtc.userMeter.setStream(rtc.localStream);
      rtc.userMeter.setActive(userActive);
      rtc.userMeter.setFrozen(state.phase === 'ended');
    }
  }

  function explanationDotState(msg) {
    if (msg.explanationError) return 'error';
    if (msg.explanationLoading) return 'loading';
    if (msg.explanation) return 'ready';
    return 'idle';
  }

  function explanationPanelText(msg) {
    if (msg.explanationLoading) return 'Загрузка объяснения…';
    if (msg.explanationError) return msg.explanationError;
    if (msg.explanation) return msg.explanation;
    return 'Нажмите «Почему так?» ещё раз.';
  }

  function getLogScrollDistanceFromBottom() {
    if (!refs.logEl) return 0;
    return refs.logEl.scrollHeight - refs.logEl.scrollTop - refs.logEl.clientHeight;
  }

  function restoreLogScrollDistanceFromBottom(distFromBottom) {
    if (!refs.logEl) return;
    refs.logEl.scrollTop = Math.max(0, refs.logEl.scrollHeight - refs.logEl.clientHeight - distFromBottom);
  }

  function appendExplainChip(row, msg, index) {
    const actions = document.createElement('div');
    actions.className = 'call-bubble__actions';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'call-chip-btn';
    const dot = document.createElement('span');
    dot.className = 'call-chip-btn__dot call-chip-btn__dot--' + explanationDotState(msg);
    if (!msg.explanationExpanded) btn.appendChild(dot);
    btn.appendChild(document.createTextNode(msg.explanationExpanded ? 'Скрыть' : 'Почему так?'));
    btn.addEventListener('click', function () {
      toggleExplanation(index);
    });
    actions.appendChild(btn);
    row.appendChild(actions);
    if (msg.explanationExpanded) {
      const panel = document.createElement('div');
      panel.className = 'call-bubble__explain';
      panel.textContent = explanationPanelText(msg);
      row.appendChild(panel);
    }
  }

  function patchMessageExplanation(index) {
    if (!refs.logEl) return;
    const msg = state.messages[index];
    if (!msg || msg.role !== 'assistant') return;

    const wrap = refs.logEl.querySelector('[data-call-msg-index="' + index + '"]');
    if (!wrap) {
      renderMessages({ keepScroll: true });
      return;
    }

    const row = wrap.querySelector('.call-bubble');
    if (!row) return;

    const distFromBottom = getLogScrollDistanceFromBottom();
    let btn = row.querySelector('.call-chip-btn');
    let panel = row.querySelector('.call-bubble__explain');

    if (!msg.content || msg.content === CALL_WELCOME_HINT) return;

    if (!btn) {
      appendExplainChip(row, msg, index);
      restoreLogScrollDistanceFromBottom(distFromBottom);
      return;
    }

    const dot = btn.querySelector('.call-chip-btn__dot');
    if (dot) {
      dot.className = 'call-chip-btn__dot call-chip-btn__dot--' + explanationDotState(msg);
      dot.style.display = msg.explanationExpanded ? 'none' : '';
    } else if (!msg.explanationExpanded) {
      const newDot = document.createElement('span');
      newDot.className = 'call-chip-btn__dot call-chip-btn__dot--' + explanationDotState(msg);
      btn.insertBefore(newDot, btn.firstChild);
    }

    const labelNode = btn.childNodes[btn.childNodes.length - 1];
    if (labelNode && labelNode.nodeType === Node.TEXT_NODE) {
      labelNode.textContent = msg.explanationExpanded ? 'Скрыть' : 'Почему так?';
    }

    if (msg.explanationExpanded) {
      if (!panel) {
        panel = document.createElement('div');
        panel.className = 'call-bubble__explain';
        row.appendChild(panel);
      }
      panel.textContent = explanationPanelText(msg);
    } else if (panel) {
      panel.remove();
    }

    requestAnimationFrame(function () {
      restoreLogScrollDistanceFromBottom(distFromBottom);
    });
  }

  function renderMessages(options) {
    if (!refs.logEl) return;
    const keepScroll = options && options.keepScroll;
    const distFromBottom = keepScroll ? getLogScrollDistanceFromBottom() : 0;
    const animateFromIndex = renderedMessageCount;

    refs.logEl.innerHTML = '';
    state.messages.forEach(function (msg, index) {
      if (msg.serviceLine) {
        const row = document.createElement('div');
        row.className =
          'call-log__service' + (index >= animateFromIndex ? ' call-bubble-enter' : '');
        const line = document.createElement('p');
        line.className = 'call-log__service-text';
        line.textContent = msg.content;
        row.appendChild(line);
        refs.logEl.appendChild(row);
        return;
      }
      const rowWrap = document.createElement('div');
      rowWrap.className = 'call-bubble-row call-bubble-row--' + msg.role;
      rowWrap.dataset.callMsgIndex = String(index);
      const row = document.createElement('div');
      row.className =
        'call-bubble call-bubble--' +
        msg.role +
        (index >= animateFromIndex ? ' call-bubble-enter' : '');

      const text = document.createElement('p');
      text.className = 'call-bubble__text';
      text.textContent = msg.content;
      row.appendChild(text);

      if (msg.role === 'assistant' && msg.content && msg.content !== CALL_WELCOME_HINT) {
        appendExplainChip(row, msg, index);
      }

      rowWrap.appendChild(row);
      refs.logEl.appendChild(rowWrap);
    });
    renderedMessageCount = state.messages.length;

    if (keepScroll) {
      restoreLogScrollDistanceFromBottom(distFromBottom);
    } else {
      refs.logEl.scrollTop = refs.logEl.scrollHeight;
    }
  }

  function toggleExplanation(index) {
    const msg = state.messages[index];
    if (!msg || msg.role !== 'assistant') return;
    msg.explanationExpanded = !msg.explanationExpanded;
    if (msg.explanationExpanded && !msg.explanation && !msg.explanationLoading) {
      requestExplanation(index);
      return;
    }
    patchMessageExplanation(index);
  }

  async function requestExplanation(index) {
    const msg = state.messages[index];
    if (!msg || msg.role !== 'assistant') return;
    msg.explanationLoading = true;
    msg.explanationError = null;
    patchMessageExplanation(index);
    try {
      const res = await fetch(apiBase() + '/api/call-explain-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: msg.content,
          processCode: state.activeProcessCode,
          processPromptContext: state.activeProcessPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.userMessage || data.error || 'Не удалось получить объяснение');
      msg.explanation = data.explanation;
    } catch (err) {
      msg.explanationError = err.message || 'Ошибка объяснения';
    } finally {
      msg.explanationLoading = false;
      patchMessageExplanation(index);
    }
  }

  function pushMessage(message) {
    const atBottom = getLogScrollDistanceFromBottom() < 72;
    state.messages.push(message);
    renderMessages({ keepScroll: true });
    if (atBottom && refs.logEl) {
      refs.logEl.scrollTop = refs.logEl.scrollHeight;
    }
  }

  function commitAssistantText(text) {
    const clean = (text || '').trim();
    if (!clean) return;
    const last = state.messages[state.messages.length - 1];
    if (last && last.role === 'assistant' && last.content === clean) return;
    pushMessage({ role: 'assistant', content: clean });
    state.pendingAssistantText = '';
  }

  function sendRealtimeEvent(payload) {
    if (!rtc.dc || rtc.dc.readyState !== 'open') return false;
    rtc.dc.send(JSON.stringify(payload));
    return true;
  }

  function buildClientSessionUpdate(instructions) {
    return {
      type: 'realtime',
      model: REALTIME_MODEL,
      instructions: instructions,
      output_modalities: ['audio'],
      audio: {
        input: {
          transcription: { model: 'gpt-4o-mini-transcribe', language: 'ru' },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.72,
            prefix_padding_ms: 300,
            silence_duration_ms: 900,
            create_response: true,
            interrupt_response: false,
          },
        },
        output: { voice: state.voice },
      },
    };
  }

  async function resolveProcess(query) {
    if (!query || query === state.lastResolvedQuery) return;
    try {
      const res = await fetch(apiBase() + '/api/call-resolve-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query }),
      });
      const data = await res.json();
      if (!res.ok) return;
      state.lastResolvedQuery = query;
      state.activeProcessCode = data.processCode || BASE_OPERATOR_CODE;
      state.activeProcessName = data.name || state.activeProcessCode;
      state.activeProcessPrompt = data.processPrompt || '';
      state.activeSessionInstructions = data.sessionInstructions || '';
      if (refs.processBadge) {
        refs.processBadge.textContent = state.activeProcessName;
        refs.processBadge.classList.remove('hidden');
      }
      await updateSessionWithProcess();
    } catch (_) {
      // keep current process
    }
  }

  async function fetchBaseInstructions() {
    const res = await fetch(apiBase() + '/api/call-base-instructions');
    if (!res.ok) throw new Error('Не удалось загрузить базовые инструкции');
    const data = await res.json();
    return data.instructions || '';
  }

  async function updateSessionWithProcess() {
    if (!state.activeProcessPrompt && !state.activeSessionInstructions) return;
    if (state.assistantResponseActive) return;
    let instructions = (state.activeSessionInstructions || '').trim();
    if (!instructions) {
      let base = '';
      try {
        base = await fetchBaseInstructions();
      } catch (_) {
        return;
      }
      instructions = [base, 'Активный процесс для этого звонка (приоритет №1):', state.activeProcessPrompt]
        .filter(Boolean)
        .join('\n\n');
    }
    sendRealtimeEvent({
      type: 'session.update',
      session: buildClientSessionUpdate(instructions),
    });
  }

  function extractTextFromResponseDone(event) {
    const output = event.response && event.response.output;
    if (!Array.isArray(output)) return '';
    for (let i = 0; i < output.length; i += 1) {
      const item = output[i];
      if (item && Array.isArray(item.content)) {
        for (let j = 0; j < item.content.length; j += 1) {
          const part = item.content[j];
          if (part && typeof part.transcript === 'string' && part.transcript.trim()) return part.transcript.trim();
          if (part && typeof part.text === 'string' && part.text.trim()) return part.text.trim();
        }
      }
    }
    return '';
  }

  function isAudioTranscriptDone(type) {
    return type === 'response.output_audio_transcript.done' || type === 'response.audio_transcript.done';
  }

  function isAudioTranscriptDelta(type) {
    return type === 'response.output_audio_transcript.delta' || type === 'response.audio_transcript.delta';
  }

  function handleRealtimeMessage(raw) {
    if (!raw) return;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      return;
    }

    if (parsed.type === 'error') {
      state.error = parsed.error && parsed.error.message ? parsed.error.message : 'Ошибка Realtime';
      renderError();
      return;
    }

    if (parsed.type === 'session.created' || parsed.type === 'session.updated') {
      setPhase('listening');
      if (parsed.type === 'session.created' && !state.greetingTriggered) {
        state.greetingTriggered = true;
        sendRealtimeEvent({
          type: 'response.create',
          response: {
            instructions:
              'Начни звонок одной короткой репликой: «Добрый день, компания E-liss. Слушаю Вас.» Больше ничего не добавляй. Не называй своё имя.',
          },
        });
      }
      return;
    }

    if (parsed.type === 'input_audio_buffer.speech_started') {
      setPhase('listening');
      return;
    }

    if (parsed.type === 'input_audio_buffer.speech_stopped') {
      setPhase('userFinalizing');
      return;
    }

    if (parsed.type === 'conversation.item.input_audio_transcription.completed') {
      const transcript = (parsed.transcript || '').trim();
      if (transcript) {
        pushMessage({ role: 'user', content: transcript });
        void resolveProcess(transcript);
        setPhase('assistantPending');
      } else {
        setPhase('listening');
      }
      return;
    }

    if (parsed.type === 'response.created') {
      state.assistantResponseActive = true;
      state.pendingAssistantText = '';
      setPhase('assistantPending');
      return;
    }

    if (parsed.type === 'response.output_text.delta' || isAudioTranscriptDelta(parsed.type)) {
      if (typeof parsed.delta === 'string' && parsed.delta) {
        state.pendingAssistantText += parsed.delta;
        setPhase('assistantSpeaking');
      }
      return;
    }

    if (parsed.type === 'response.output_text.done' || isAudioTranscriptDone(parsed.type)) {
      const finalText =
        (typeof parsed.text === 'string' && parsed.text.trim()) ||
        (typeof parsed.transcript === 'string' && parsed.transcript.trim()) ||
        state.pendingAssistantText.trim();
      if (finalText) state.pendingAssistantText = finalText;
      return;
    }

    if (parsed.type === 'response.done') {
      state.assistantResponseActive = false;
      const extracted = extractTextFromResponseDone(parsed) || state.pendingAssistantText;
      commitAssistantText(extracted);
      setPhase('listening');
      return;
    }
  }

  function cleanupRtc() {
    stopTimer();
    if (rtc.aiMeter) rtc.aiMeter.stop();
    if (rtc.userMeter) rtc.userMeter.stop();
    if (rtc.dc) {
      try { rtc.dc.close(); } catch (_) {}
    }
    if (rtc.pc) {
      try { rtc.pc.close(); } catch (_) {}
    }
    if (rtc.localStream) {
      rtc.localStream.getTracks().forEach(function (t) { t.stop(); });
    }
    if (rtc.remoteAudio) {
      rtc.remoteAudio.srcObject = null;
    }
    rtc = {
      pc: null,
      dc: null,
      localStream: null,
      remoteStream: null,
      remoteAudio: rtc.remoteAudio,
      aiMeter: rtc.aiMeter,
      userMeter: rtc.userMeter,
    };
    state.greetingTriggered = false;
    state.assistantResponseActive = false;
    state.pendingAssistantText = '';
  }

  function renderError() {
    if (!refs.errorEl) return;
    if (state.error) {
      refs.errorEl.textContent = state.error;
      refs.errorEl.classList.remove('hidden');
    } else {
      refs.errorEl.textContent = '';
      refs.errorEl.classList.add('hidden');
    }
  }

  /** Ждём ICE (null-candidate или complete). По таймауту не падаем — отправляем текущий SDP, как в my-eng-bot. */
  function waitForIceGathering(pc, timeoutMs) {
    return new Promise(function (resolve) {
      if (pc.iceGatheringState === 'complete') {
        resolve({ timedOut: false, iceState: pc.iceGatheringState });
        return;
      }
      var finished = false;
      function done(timedOut) {
        if (finished) return;
        finished = true;
        window.clearTimeout(timer);
        pc.removeEventListener('icegatheringstatechange', onGatheringChange);
        pc.removeEventListener('icecandidate', onIceCandidate);
        resolve({ timedOut: timedOut, iceState: pc.iceGatheringState });
      }
      var timer = window.setTimeout(function () {
        done(true);
      }, timeoutMs);
      function onGatheringChange() {
        if (pc.iceGatheringState === 'complete') done(false);
      }
      function onIceCandidate(event) {
        if (!event.candidate) done(false);
      }
      pc.addEventListener('icegatheringstatechange', onGatheringChange);
      pc.addEventListener('icecandidate', onIceCandidate);
    });
  }

  async function startCall() {
    if (['connecting', 'listening', 'assistantPending', 'assistantSpeaking', 'userFinalizing'].includes(state.phase)) return;
    state.error = null;
    renderError();
    state.messages = [];
    renderedMessageCount = 0;
    state.lastResolvedQuery = '';
    state.activeProcessCode = BASE_OPERATOR_CODE;
    state.activeProcessPrompt = '';
    state.activeSessionInstructions = '';
    if (refs.processBadge) refs.processBadge.classList.add('hidden');
    renderMessages();
    setPhase('connecting');
    startTimer();

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      rtc.localStream = mediaStream;

      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      const dc = pc.createDataChannel('oai-events');
      rtc.pc = pc;
      rtc.dc = dc;

      if (!rtc.remoteAudio) {
        rtc.remoteAudio = document.createElement('audio');
        rtc.remoteAudio.autoplay = true;
      }

      mediaStream.getTracks().forEach(function (track) {
        pc.addTrack(track, mediaStream);
      });

      pc.ontrack = function (event) {
        const stream = event.streams && event.streams[0];
        if (stream) {
          rtc.remoteStream = stream;
          rtc.remoteAudio.srcObject = stream;
          rtc.remoteAudio.play().catch(function () {});
          updateMeters();
        }
      };

      dc.onopen = async function () {
        try {
          const base = await fetchBaseInstructions();
          sendRealtimeEvent({
            type: 'session.update',
            session: buildClientSessionUpdate(base),
          });
        } catch (err) {
          state.error = err.message || 'Не удалось настроить сессию';
          renderError();
        }
      };

      dc.onmessage = function (event) {
        handleRealtimeMessage(typeof event.data === 'string' ? event.data : '');
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      var iceWait = await waitForIceGathering(pc, 12000);
      const localSdp = pc.localDescription && pc.localDescription.sdp;
      if (!localSdp) throw new Error('Не удалось подготовить SDP offer');
      if (!/m=audio/i.test(localSdp)) {
        throw new Error('SDP без аудио-линии. Проверьте микрофон и разрешения браузера.');
      }
      // #region agent log
      fetch('http://127.0.0.1:7504/ingest/1c893e2e-1189-4005-a895-a8c44a156288',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6a780e'},body:JSON.stringify({sessionId:'6a780e',location:'call.js:startCall:before-sdp-fetch',message:'local sdp ready',data:{sdpLen:localSdp.length,hasAudioLine:true,iceState:pc.iceGatheringState,iceTimedOut:iceWait.timedOut},timestamp:Date.now(),hypothesisId:'H1-H2',runId:'sdp-debug'})}).catch(function(){});
      // #endregion

      const sessionResponse = await fetch(apiBase() + '/api/realtime-session/sdp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sdp: localSdp, voice: state.voice }),
      });
      const sessionData = await sessionResponse.json();
      // #region agent log
      fetch('http://127.0.0.1:7504/ingest/1c893e2e-1189-4005-a895-a8c44a156288',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6a780e'},body:JSON.stringify({sessionId:'6a780e',location:'call.js:startCall:sdp-response',message:'sdp response received',data:{status:sessionResponse.ok?sessionResponse.status:'ok',httpStatus:sessionResponse.status,hasSdp:Boolean(sessionData&&sessionData.sdp),errorSnippet:String((sessionData&& (sessionData.userMessage||sessionData.error))||'').slice(0,160),voice:state.voice},timestamp:Date.now(),hypothesisId:'H1-H5',runId:'post-fix'})}).catch(function(){});
      // #endregion
      if (!sessionResponse.ok) {
        throw new Error(sessionData.userMessage || sessionData.error || 'Ошибка SDP');
      }

      await pc.setRemoteDescription({ type: 'answer', sdp: sessionData.sdp });
      updateMeters();
    } catch (err) {
      state.error = err.message || 'Не удалось начать звонок';
      // #region agent log
      fetch('http://127.0.0.1:7504/ingest/1c893e2e-1189-4005-a895-a8c44a156288',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6a780e'},body:JSON.stringify({sessionId:'6a780e',location:'call.js:startCall:catch',message:'startCall failed',data:{errorMessage:String(err&&err.message||err||'').slice(0,200),phase:state.phase},timestamp:Date.now(),hypothesisId:'H1-H5',runId:'post-fix'})}).catch(function(){});
      // #endregion
      renderError();
      cleanupRtc();
      setPhase('idle');
    }
  }

  function hangUp() {
    cleanupRtc();
    pushMessage({ role: 'assistant', content: 'Звонок завершён', serviceLine: true });
    setPhase('ended');
    updateMeters();
  }

  function syncCallVoiceSelectWidth() {
    const select = refs.voicePicker;
    if (!select || !select.options.length) return;

    const probe = document.createElement('span');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.whiteSpace = 'nowrap';
    probe.style.pointerEvents = 'none';
    const computed = global.getComputedStyle(select);
    probe.style.font = computed.font;
    document.body.appendChild(probe);

    let maxTextWidth = 0;
    for (let i = 0; i < select.options.length; i += 1) {
      probe.textContent = select.options[i].textContent;
      maxTextWidth = Math.max(maxTextWidth, probe.offsetWidth);
    }
    document.body.removeChild(probe);

    const horizontalPadding = 24;
    const arrowSpace = 28;
    select.style.width = `${Math.ceil(maxTextWidth + horizontalPadding + arrowSpace)}px`;
  }

  function initVoicePicker() {
    if (!refs.voicePicker) return;
    refs.voicePicker.innerHTML = '';
    VOICES.forEach(function (voice) {
      const option = document.createElement('option');
      option.value = voice;
      option.textContent = voice;
      refs.voicePicker.appendChild(option);
    });
    if (VOICES.indexOf(state.voice) < 0) state.voice = VOICES[0];
    refs.voicePicker.value = state.voice;
    syncCallVoiceSelectWidth();
    refs.voicePicker.addEventListener('change', function () {
      state.voice = refs.voicePicker.value;
      localStorage.setItem(VOICE_STORAGE_KEY, state.voice);
    });
  }

  function getExpectedCallAccessCode() {
    return String(new Date().getDate()).padStart(2, '0');
  }

  function normalizeCallAccessCodeInput(value) {
    return String(value || '')
      .replace(/\D/g, '')
      .slice(0, 2);
  }

  function clearCallAccessCodeError() {
    if (!refs.accessCodeError || !refs.accessCodeInput) return;
    refs.accessCodeError.textContent = '';
    refs.accessCodeError.classList.add('hidden');
    refs.accessCodeInput.classList.remove('call-access-code-input--invalid');
  }

  function showCallAccessCodeError() {
    if (!refs.accessCodeError || !refs.accessCodeInput) return;
    refs.accessCodeError.textContent = 'Код неверный.';
    refs.accessCodeError.classList.remove('hidden');
    refs.accessCodeInput.classList.add('call-access-code-input--invalid');
    refs.accessCodeInput.focus();
  }

  function validateCallAccessCode() {
    const entered = refs.accessCodeInput
      ? normalizeCallAccessCodeInput(refs.accessCodeInput.value)
      : '';
    if (entered === getExpectedCallAccessCode()) {
      clearCallAccessCodeError();
      return true;
    }
    showCallAccessCodeError();
    return false;
  }

  function bindAccessCodeInput() {
    if (!refs.accessCodeInput) return;
    refs.accessCodeInput.addEventListener('input', function () {
      refs.accessCodeInput.value = normalizeCallAccessCodeInput(refs.accessCodeInput.value);
      clearCallAccessCodeError();
    });
    refs.accessCodeInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (validateCallAccessCode()) showScreen('call');
      }
    });
  }

  function seedWelcomeHint() {
    state.messages = [{ role: 'assistant', content: CALL_WELCOME_HINT }];
    renderedMessageCount = 0;
    renderMessages();
  }

  function showScreen(screen) {
    state.screen = screen;
    if (refs.startScreen) refs.startScreen.classList.toggle('hidden', screen !== 'start');
    if (refs.callScreen) refs.callScreen.classList.toggle('hidden', screen !== 'call');
    if (screen === 'call' && (state.phase === 'idle' || state.phase === 'ended')) {
      seedWelcomeHint();
    }
  }

  function bindEvents() {
    if (refs.goToCallBtn) {
      refs.goToCallBtn.addEventListener('click', function () {
        if (!validateCallAccessCode()) return;
        showScreen('call');
      });
    }
    if (refs.backBtn) {
      refs.backBtn.addEventListener('click', function () {
        if (state.phase !== 'idle' && state.phase !== 'ended') hangUp();
        showScreen('start');
      });
    }
    if (refs.startBtn) {
      refs.startBtn.addEventListener('click', function () {
        void startCall();
      });
    }
    if (refs.hangupBtn) {
      refs.hangupBtn.addEventListener('click', function () {
        hangUp();
      });
    }
  }

  function initCallView() {
    refs = {
      startScreen: document.getElementById('callStartScreen'),
      callScreen: document.getElementById('callActiveScreen'),
      voicePicker: document.getElementById('callVoicePicker'),
      accessCodeInput: document.getElementById('callAccessCodeInput'),
      accessCodeError: document.getElementById('callAccessCodeError'),
      goToCallBtn: document.getElementById('callGoToCallBtn'),
      backBtn: document.getElementById('callBackBtn'),
      startBtn: document.getElementById('callStartBtn'),
      hangupBtn: document.getElementById('callHangupBtn'),
      logEl: document.getElementById('callLog'),
      statusEl: document.getElementById('callStatusText'),
      timerEl: document.getElementById('callTimer'),
      errorEl: document.getElementById('callError'),
      processBadge: document.getElementById('callProcessBadge'),
      aiMeterEl: document.getElementById('callAiMeter'),
      userMeterEl: document.getElementById('callUserMeter'),
    };

    if (refs.aiMeterEl && global.CallVoiceMeter) {
      rtc.aiMeter = new global.CallVoiceMeter(refs.aiMeterEl, 'assistant');
      rtc.aiMeter.start();
    }
    if (refs.userMeterEl && global.CallVoiceMeter) {
      rtc.userMeter = new global.CallVoiceMeter(refs.userMeterEl, 'user');
      rtc.userMeter.start();
    }

    initVoicePicker();
    bindAccessCodeInput();
    bindEvents();
    renderStatus();
    renderMessages();
    showScreen('start');
  }

  global.initCallView = initCallView;
})(window);
