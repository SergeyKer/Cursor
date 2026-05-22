(function (global) {
  const VOICES = [
    'alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse', 'marin', 'cedar',
  ];
  const VOICE_STORAGE_KEY = 'cs-call-realtime-voice';
  const MODEL_STORAGE_KEY = 'cs-call-realtime-model';
  const REALTIME_MODEL_OPTIONS = [
    { id: 'gpt-realtime-mini', label: 'mini' },
    { id: 'gpt-realtime-1.5', label: '1.5' },
    { id: 'gpt-realtime-2', label: '2' },
  ];
  const DEFAULT_REALTIME_MODEL = 'gpt-realtime-2';
  const CALL_SILENCE_HANGUP_MS = 30000;
  const CALL_REALTIME_SERVER_VAD = {
    type: 'server_vad',
    threshold: 0.84,
    prefix_padding_ms: 300,
    silence_duration_ms: 1200,
    create_response: true,
    interrupt_response: false,
  };
  const BASE_OPERATOR_CODE = 'Ответ оператора';
  const CALL_WELCOME_HINT =
    'Чтобы позвонить в клиентский отдел компании E-liss, нажмите кнопку «Вызов».';
  const TRANSCRIPTION_RU_PROMPT =
    'Транскрибируй только русскую речь. Если слышишь не русский язык — не выводи латиницу, верни пустую строку.';

  const CYRILLIC_RE = /[\u0401\u0451\u0410-\u044F\u0400-\u04FF]/g;
  const LATIN_RE = /[A-Za-z\u00C0-\u00FF\u0100-\u017F\u0180-\u024F]/g;

  function isLikelyRussianTranscript(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return false;
    const cyrillic = (trimmed.match(CYRILLIC_RE) || []).length;
    const latin = (trimmed.match(LATIN_RE) || []).length;
    const letters = cyrillic + latin;
    if (cyrillic > 0) return true;
    if (letters === 0) return /^[\d\s+().,\-–—]+$/.test(trimmed);
    if (latin > 0 && cyrillic === 0) return false;
    return false;
  }

  const state = {
    phase: 'idle',
    screen: 'start',
    voice: localStorage.getItem(VOICE_STORAGE_KEY) || 'coral',
    realtimeModel: localStorage.getItem(MODEL_STORAGE_KEY) || DEFAULT_REALTIME_MODEL,
    messages: [],
    activeProcessCode: BASE_OPERATOR_CODE,
    activeProcessPrompt: '',
    activeSessionInstructions: '',
    activeProcessName: '',
    error: null,
    callStartedAt: null,
    lastCallDurationSec: 0,
    timerInterval: null,
    lastMeaningfulActivityAt: 0,
    silenceWatchInterval: null,
    pendingAssistantText: '',
    assistantPendingByResponseId: new Map(),
    committedAssistantResponseIds: new Set(),
    lastAssistantResponseId: null,
    assistantCommitFallbackTimers: new Map(),
    assistantMessageIndexByResponseId: new Map(),
    greetingTriggered: false,
    assistantResponseActive: false,
    lastResolvedQuery: '',
    lastResolvedNormalized: '',
    clarifyCount: 0,
    firstTurnInstructions: '',
    pendingSessionInstructions: null,
    dialogOrder: {
      nextSeq: 0,
      flushedThrough: 0,
      slots: new Map(),
      pendingUserTurns: [],
      assistantSeqByResponseId: new Map(),
    },
  };

  let refs = {};
  /** Сколько сообщений уже отрисовано — enter-анимация только для новых. */
  let renderedMessageCount = 0;
  /** Инкремент при старте/отмене звонка — отсекает устаревший async startCall после hangUp/перезвона. */
  let callGeneration = 0;
  let sessionAbortController = null;
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

  const CALL_ACTIVE_PHASES = [
    'connecting',
    'listening',
    'userFinalizing',
    'assistantPending',
    'assistantSpeaking',
  ];

  function isCallInProgress(phase) {
    return CALL_ACTIVE_PHASES.indexOf(phase || state.phase) >= 0;
  }

  function setCallButtonEnabled(button, enabled) {
    if (!button) return;
    button.disabled = !enabled;
    button.setAttribute('aria-disabled', enabled ? 'false' : 'true');
  }

  function updateCallControls() {
    const inCall = isCallInProgress(state.phase);
    setCallButtonEnabled(refs.startBtn, !inCall);
    setCallButtonEnabled(refs.hangupBtn, inCall);
  }

  function setPhase(phase) {
    state.phase = phase;
    renderStatus();
    updateMeters();
    updateCallControls();
  }

  function formatDuration(seconds) {
    const safe = Math.max(0, Math.floor(seconds));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function updateTimerDisplay(seconds) {
    if (refs.timerEl) refs.timerEl.textContent = formatDuration(seconds);
  }

  function stopTimerInterval() {
    if (state.timerInterval) {
      window.clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  function resetTimerForNewCall() {
    stopTimerInterval();
    state.callStartedAt = null;
    state.lastCallDurationSec = 0;
    updateTimerDisplay(0);
  }

  function startTimer() {
    stopTimerInterval();
    state.callStartedAt = Date.now();
    state.lastCallDurationSec = 0;
    updateTimerDisplay(0);
    state.timerInterval = window.setInterval(function () {
      if (!state.callStartedAt) return;
      const elapsed = Math.floor((Date.now() - state.callStartedAt) / 1000);
      updateTimerDisplay(elapsed);
    }, 1000);
  }

  /** После завершения звонка — показывать итог до следующего вызова. */
  function freezeTimerOnHangup() {
    stopTimerInterval();
    if (state.callStartedAt) {
      state.lastCallDurationSec = Math.floor((Date.now() - state.callStartedAt) / 1000);
      state.callStartedAt = null;
    }
    updateTimerDisplay(state.lastCallDurationSec);
  }

  function touchMeaningfulActivity() {
    state.lastMeaningfulActivityAt = Date.now();
  }

  function stopSilenceWatch() {
    if (state.silenceWatchInterval) {
      window.clearInterval(state.silenceWatchInterval);
      state.silenceWatchInterval = null;
    }
    state.lastMeaningfulActivityAt = 0;
  }

  function startSilenceWatch() {
    stopSilenceWatch();
    touchMeaningfulActivity();
    state.silenceWatchInterval = window.setInterval(function () {
      const inCall = ['listening', 'userFinalizing', 'assistantPending', 'assistantSpeaking'].includes(
        state.phase
      );
      if (!inCall || !state.lastMeaningfulActivityAt) return;
      if (Date.now() - state.lastMeaningfulActivityAt >= CALL_SILENCE_HANGUP_MS) {
        hangUp({ reason: 'silence' });
      }
    }, 1000);
  }

  function renderStatus() {
    if (!refs.statusEl) return;
    const labels = {
      idle: 'Готов к звонку',
      connecting: 'Соединение…',
      listening: 'Слушаю',
      userFinalizing: 'Слушаю',
      assistantPending: 'Менеджер отвечает…',
      assistantSpeaking: 'Менеджер говорит',
      ended: 'Звонок завершён',
    };
    refs.statusEl.textContent = labels[state.phase] || '';
  }

  function updateMeters() {
    const inCall = isCallInProgress(state.phase);
    const ended = state.phase === 'ended';
    if (rtc.aiMeter) {
      rtc.aiMeter.setStream(rtc.remoteStream);
      rtc.aiMeter.setActive(inCall);
      rtc.aiMeter.setFrozen(ended);
    }
    if (rtc.userMeter) {
      rtc.userMeter.setStream(rtc.localStream);
      rtc.userMeter.setActive(inCall);
      rtc.userMeter.setFrozen(ended);
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
        row.dataset.callMsgIndex = String(index);
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

      if (
        msg.role === 'assistant' &&
        !msg.streaming &&
        msg.content &&
        msg.content !== CALL_WELCOME_HINT
      ) {
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

  function scrollLogIfAtBottom() {
    if (!refs.logEl) return;
    if (getLogScrollDistanceFromBottom() < 72) {
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

  function resetDialogOrder() {
    state.dialogOrder.nextSeq = 0;
    state.dialogOrder.flushedThrough = 0;
    state.dialogOrder.slots.clear();
    state.dialogOrder.pendingUserTurns = [];
    state.dialogOrder.assistantSeqByResponseId.clear();
    state.assistantPendingByResponseId.clear();
    state.committedAssistantResponseIds.clear();
    state.lastAssistantResponseId = null;
    state.assistantCommitFallbackTimers.forEach(function (timer) {
      clearTimeout(timer);
    });
    state.assistantCommitFallbackTimers.clear();
    state.assistantMessageIndexByResponseId.clear();
  }

  function allocDialogSeq() {
    state.dialogOrder.nextSeq += 1;
    return state.dialogOrder.nextSeq;
  }

  function flushDialogMessages() {
    let next = state.dialogOrder.flushedThrough + 1;
    while (state.dialogOrder.slots.has(next)) {
      const msg = state.dialogOrder.slots.get(next);
      state.dialogOrder.slots.delete(next);
      state.dialogOrder.flushedThrough = next;
      if (!msg._skip) pushMessage(msg);
      next += 1;
    }
  }

  function skipPendingUserDialogSlot(itemId) {
    let turn = null;
    if (itemId) {
      const pending = state.dialogOrder.pendingUserTurns;
      const idx = pending.findIndex(function (t) {
        return t.itemId === itemId;
      });
      if (idx >= 0) turn = pending.splice(idx, 1)[0];
    }
    if (!turn && state.dialogOrder.pendingUserTurns.length) {
      turn = state.dialogOrder.pendingUserTurns.pop();
    }
    if (!turn) return;
    scheduleDialogMessage(turn.seq, { _skip: true });
  }

  function scheduleDialogMessage(seq, message) {
    if (!seq) {
      pushMessage(message);
      return;
    }
    state.dialogOrder.slots.set(seq, message);
    flushDialogMessages();
  }

  function registerUserTurn(itemId) {
    const seq = allocDialogSeq();
    state.dialogOrder.pendingUserTurns.push({
      seq: seq,
      itemId: itemId || null,
    });
    return seq;
  }

  function bindItemIdToPendingUserTurn(itemId) {
    if (!itemId) return;
    const pending = state.dialogOrder.pendingUserTurns;
    for (let i = pending.length - 1; i >= 0; i -= 1) {
      if (!pending[i].itemId) {
        pending[i].itemId = itemId;
        return;
      }
    }
  }

  function resolvePendingUserTurn(itemId) {
    const pending = state.dialogOrder.pendingUserTurns;
    if (itemId) {
      const idx = pending.findIndex(function (t) {
        return t.itemId === itemId;
      });
      if (idx >= 0) return pending.splice(idx, 1)[0];
    }
    return pending.shift() || null;
  }

  function enqueueUserTranscript(transcript, itemId) {
    const text = String(transcript || '').trim();
    if (!text) return false;
    let turn = resolvePendingUserTurn(itemId);
    if (!turn) {
      turn = { seq: allocDialogSeq(), itemId: itemId || null };
    }
    scheduleDialogMessage(turn.seq, { role: 'user', content: text });
    return true;
  }

  function registerAssistantResponse(responseId) {
    const id = responseId || 'response-' + String(allocDialogSeq());
    const seq = allocDialogSeq();
    state.dialogOrder.assistantSeqByResponseId.set(id, seq);
    return { responseId: id, seq: seq };
  }

  function resolveAssistantSeq(responseId) {
    if (responseId && state.dialogOrder.assistantSeqByResponseId.has(responseId)) {
      return state.dialogOrder.assistantSeqByResponseId.get(responseId);
    }
    if (state.dialogOrder.assistantSeqByResponseId.size === 1) {
      let onlySeq = null;
      state.dialogOrder.assistantSeqByResponseId.forEach(function (seq) {
        onlySeq = seq;
      });
      return onlySeq;
    }
    return null;
  }

  function resolveEventResponseId(parsed) {
    return (
      (parsed && parsed.response_id) ||
      (parsed && parsed.response && parsed.response.id) ||
      state.lastAssistantResponseId ||
      null
    );
  }

  function getAssistantPendingText(responseId) {
    if (responseId && state.assistantPendingByResponseId.has(responseId)) {
      return state.assistantPendingByResponseId.get(responseId);
    }
    return state.pendingAssistantText;
  }

  function setAssistantPendingText(responseId, text) {
    if (responseId) state.assistantPendingByResponseId.set(responseId, text);
    else state.pendingAssistantText = text;
  }

  function clearAssistantPendingText(responseId) {
    if (responseId) state.assistantPendingByResponseId.delete(responseId);
    state.pendingAssistantText = '';
  }

  function clearAssistantCommitFallback(responseId) {
    if (!responseId) return;
    const timer = state.assistantCommitFallbackTimers.get(responseId);
    if (timer) clearTimeout(timer);
    state.assistantCommitFallbackTimers.delete(responseId);
  }

  function releaseAssistantDialogSlot(responseId, seq) {
    const slotSeq = seq != null ? seq : resolveAssistantSeq(responseId);
    if (responseId) state.dialogOrder.assistantSeqByResponseId.delete(responseId);
    if (slotSeq) scheduleDialogMessage(slotSeq, { _skip: true });
  }

  function patchAssistantBubbleText(index, text) {
    if (!refs.logEl) return;
    const wrap = refs.logEl.querySelector('[data-call-msg-index="' + index + '"]');
    if (!wrap) return;
    const textEl = wrap.querySelector('.call-bubble__text');
    if (textEl) textEl.textContent = text;
  }

  function finalizeAssistantExplainChip(index) {
    const msg = state.messages[index];
    if (!msg || msg.role !== 'assistant' || msg.streaming || msg.content === CALL_WELCOME_HINT) return;
    if (!refs.logEl) return;
    const wrap = refs.logEl.querySelector('[data-call-msg-index="' + index + '"]');
    if (!wrap) return;
    const row = wrap.querySelector('.call-bubble');
    if (!row || row.querySelector('.call-chip-btn')) return;
    appendExplainChip(row, msg, index);
  }

  function trackAssistantMessageIndex(responseId, index) {
    if (responseId) state.assistantMessageIndexByResponseId.set(responseId, index);
  }

  function findAssistantMessageIndex(responseId) {
    if (!responseId) return null;
    if (state.assistantMessageIndexByResponseId.has(responseId)) {
      return state.assistantMessageIndexByResponseId.get(responseId);
    }
    for (let i = state.messages.length - 1; i >= 0; i -= 1) {
      const msg = state.messages[i];
      if (msg && msg.role === 'assistant' && msg._responseId === responseId) {
        trackAssistantMessageIndex(responseId, i);
        return i;
      }
    }
    return null;
  }

  function upsertAssistantStreamingTranscript(responseId, text) {
    const rid = responseId || null;
    const clean = String(text || '').trim();
    if (!rid || !clean) return;
    if (state.committedAssistantResponseIds.has(rid)) {
      updateAssistantMessageIfLonger(clean);
      return;
    }

    const existingIdx = findAssistantMessageIndex(rid);
    if (existingIdx != null && state.messages[existingIdx]) {
      state.messages[existingIdx].content = clean;
      state.messages[existingIdx].streaming = true;
      patchAssistantBubbleText(existingIdx, clean);
      scrollLogIfAtBottom();
      return;
    }

    const seq = resolveAssistantSeq(rid);
    if (seq && state.dialogOrder.slots.has(seq)) {
      const slotMsg = state.dialogOrder.slots.get(seq);
      slotMsg.content = clean;
      slotMsg.streaming = true;
      slotMsg._responseId = rid;
      flushDialogMessages();
      return;
    }

    if (seq) {
      scheduleDialogMessage(seq, {
        role: 'assistant',
        content: clean,
        streaming: true,
        _responseId: rid,
      });
    }
  }

  function updateAssistantMessageIfLonger(clean) {
    for (let i = state.messages.length - 1; i >= 0; i -= 1) {
      const msg = state.messages[i];
      if (!msg || msg.role !== 'assistant' || msg.serviceLine) continue;
      if (clean.length <= String(msg.content || '').length) return false;
      msg.content = clean;
      patchAssistantBubbleText(i, clean);
      return true;
    }
    return false;
  }

  function commitAssistantTranscript(text, responseId) {
    const rid = responseId || null;
    const clean = String(text || '').trim();
    clearAssistantCommitFallback(rid);

    const streamingIdx = rid != null ? findAssistantMessageIndex(rid) : null;
    if (streamingIdx != null && state.messages[streamingIdx]) {
      if (clean) {
        state.messages[streamingIdx].content = clean;
        state.messages[streamingIdx].streaming = false;
        patchAssistantBubbleText(streamingIdx, clean);
        finalizeAssistantExplainChip(streamingIdx);
      }
      if (rid) state.committedAssistantResponseIds.add(rid);
      if (rid) state.dialogOrder.assistantSeqByResponseId.delete(rid);
      if (rid) state.assistantMessageIndexByResponseId.delete(rid);
      clearAssistantPendingText(rid);
      scrollLogIfAtBottom();
      return;
    }

    if (rid && state.committedAssistantResponseIds.has(rid)) {
      if (clean) updateAssistantMessageIfLonger(clean);
      return;
    }

    const seq = resolveAssistantSeq(rid);

    if (!clean) {
      if (rid) state.committedAssistantResponseIds.add(rid);
      releaseAssistantDialogSlot(rid, seq);
      clearAssistantPendingText(rid);
      return;
    }

    if (rid) state.committedAssistantResponseIds.add(rid);
    if (rid) state.dialogOrder.assistantSeqByResponseId.delete(rid);
    if (seq) {
      scheduleDialogMessage(seq, { role: 'assistant', content: clean, _responseId: rid });
    } else {
      pushMessage({ role: 'assistant', content: clean, _responseId: rid });
    }
    clearAssistantPendingText(rid);
  }

  function scheduleAssistantCommitFallback(responseId) {
    if (!responseId) return;
    clearAssistantCommitFallback(responseId);
    const timer = setTimeout(function () {
      state.assistantCommitFallbackTimers.delete(responseId);
      if (state.committedAssistantResponseIds.has(responseId)) return;
      commitAssistantTranscript(getAssistantPendingText(responseId), responseId);
    }, 450);
    state.assistantCommitFallbackTimers.set(responseId, timer);
  }

  function pushMessage(message) {
    const atBottom = getLogScrollDistanceFromBottom() < 72;
    state.messages.push(message);
    const index = state.messages.length - 1;
    if (message._responseId) trackAssistantMessageIndex(message._responseId, index);
    renderMessages({ keepScroll: true });
    if (atBottom && refs.logEl) {
      refs.logEl.scrollTop = refs.logEl.scrollHeight;
    }
  }

  function commitAssistantText(text, responseId) {
    commitAssistantTranscript(text, responseId);
  }

  function sendRealtimeEvent(payload) {
    if (!rtc.dc || rtc.dc.readyState !== 'open') return false;
    rtc.dc.send(JSON.stringify(payload));
    return true;
  }

  function isBenignRealtimeError(message) {
    const text = String(message || '').toLowerCase();
    return (
      text.includes('active response in progress') ||
      text.includes('already has an active response')
    );
  }

  function handleRealtimeError(message) {
    const normalized = String(message || '').trim() || 'Ошибка Realtime';
    if (isBenignRealtimeError(normalized)) return;
    state.error = normalized;
    renderError();
  }

  function clearBenignRealtimeError() {
    if (state.error && isBenignRealtimeError(state.error)) {
      state.error = null;
      renderError();
    }
  }

  function sendSessionUpdate(instructions) {
    sendRealtimeEvent({
      type: 'session.update',
      session: buildClientSessionUpdate(instructions),
    });
  }

  function flushPendingSessionUpdate() {
    if (state.assistantResponseActive || !state.pendingSessionInstructions) return;
    const instructions = state.pendingSessionInstructions;
    state.pendingSessionInstructions = null;
    sendSessionUpdate(instructions);
  }

  function buildClientSessionUpdate(instructions) {
    return {
      type: 'realtime',
      model: state.realtimeModel,
      instructions: instructions,
      output_modalities: ['audio'],
      audio: {
        input: {
          transcription: {
            model: 'gpt-4o-mini-transcribe',
            language: 'ru',
            prompt: TRANSCRIPTION_RU_PROMPT,
          },
          turn_detection: Object.assign({}, CALL_REALTIME_SERVER_VAD),
        },
        output: { voice: state.voice },
      },
    };
  }

  function normalizeForResolve(query) {
    return String(query || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildUserConversationText() {
    return state.messages
      .filter(function (msg) {
        return msg && msg.role === 'user' && msg.content;
      })
      .map(function (msg) {
        return String(msg.content).trim();
      })
      .filter(Boolean)
      .join('\n');
  }

  async function resolveProcess(query) {
    const normalized = normalizeForResolve(query);
    if (!query || normalized === state.lastResolvedNormalized) return;
    try {
      const res = await fetch(apiBase() + '/api/call-resolve-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          voice: state.voice,
          clarifyCount: state.clarifyCount,
          conversationText: buildUserConversationText(),
        }),
      });
      const data = await res.json();
      if (!res.ok) return;
      state.lastResolvedQuery = query;
      state.lastResolvedNormalized = normalized;
      if (data.clarifyPrompt && state.clarifyCount < 2) {
        state.clarifyCount += 1;
      }
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
    const res = await fetch(
      apiBase() + '/api/call-base-instructions?voice=' + encodeURIComponent(state.voice)
    );
    if (!res.ok) throw new Error('Не удалось загрузить базовые инструкции');
    const data = await res.json();
    state.firstTurnInstructions = data.firstTurnInstructions || '';
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
    if (state.assistantResponseActive) {
      state.pendingSessionInstructions = instructions;
      return;
    }
    state.pendingSessionInstructions = null;
    sendSessionUpdate(instructions);
  }

  function extractTextFromResponseDone(event) {
    const output = event.response && event.response.output;
    if (!Array.isArray(output)) return '';
    const chunks = [];
    for (let i = 0; i < output.length; i += 1) {
      const item = output[i];
      if (!item || !Array.isArray(item.content)) continue;
      for (let j = 0; j < item.content.length; j += 1) {
        const part = item.content[j];
        if (part && typeof part.transcript === 'string' && part.transcript.trim()) {
          chunks.push(part.transcript.trim());
        } else if (part && typeof part.text === 'string' && part.text.trim()) {
          chunks.push(part.text.trim());
        }
      }
    }
    return chunks.join('\n').trim();
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
      handleRealtimeError(parsed.error && parsed.error.message ? parsed.error.message : 'Ошибка Realtime');
      return;
    }

    if (parsed.type === 'session.created' || parsed.type === 'session.updated') {
      setPhase('listening');
      startSilenceWatch();
      if (parsed.type === 'session.created' && !state.greetingTriggered) {
        state.greetingTriggered = true;
        sendRealtimeEvent({
          type: 'response.create',
          response: {
            instructions:
              state.firstTurnInstructions ||
              'Начни звонок одной короткой репликой. Пример: «Добрый день. Вас приветствует голосовой помощник компании E-liss. Чем могу помочь?» Не называй себя по имени.',
          },
        });
      }
      return;
    }

    if (parsed.type === 'input_audio_buffer.speech_started') {
      if (state.assistantResponseActive) {
        sendRealtimeEvent({ type: 'input_audio_buffer.clear' });
        return;
      }
      setPhase('listening');
      return;
    }

    if (parsed.type === 'input_audio_buffer.speech_stopped') {
      registerUserTurn(null);
      setPhase('userFinalizing');
      return;
    }

    if (parsed.type === 'conversation.item.created') {
      const item = parsed.item;
      if (item && item.id && item.role === 'user') {
        bindItemIdToPendingUserTurn(item.id);
      }
      return;
    }

    if (parsed.type === 'conversation.item.input_audio_transcription.completed') {
      const transcript = (parsed.transcript || '').trim();
      const itemId =
        parsed.item_id ||
        (parsed.item && parsed.item.id) ||
        (parsed.event && parsed.event.item_id) ||
        null;
      if (transcript && !isLikelyRussianTranscript(transcript)) {
        skipPendingUserDialogSlot(itemId);
        setPhase('listening');
        return;
      }
      if (transcript) {
        touchMeaningfulActivity();
        if (enqueueUserTranscript(transcript, itemId)) {
          void resolveProcess(transcript);
        }
        setPhase('assistantPending');
      } else {
        skipPendingUserDialogSlot(itemId);
        setPhase('listening');
      }
      return;
    }

    if (parsed.type === 'response.created') {
      state.assistantResponseActive = true;
      const responseId = parsed.response && parsed.response.id;
      state.lastAssistantResponseId = responseId || null;
      state.pendingAssistantText = '';
      if (responseId) state.assistantPendingByResponseId.set(responseId, '');
      registerAssistantResponse(responseId);
      touchMeaningfulActivity();
      setPhase('assistantPending');
      return;
    }

    if (parsed.type === 'response.output_audio.delta') {
      const responseId = resolveEventResponseId(parsed);
      if (findAssistantMessageIndex(responseId) == null) {
        upsertAssistantStreamingTranscript(responseId, '…');
      }
      touchMeaningfulActivity();
      setPhase('assistantSpeaking');
      return;
    }

    if (parsed.type === 'response.output_text.delta' || isAudioTranscriptDelta(parsed.type)) {
      if (typeof parsed.delta === 'string' && parsed.delta) {
        const responseId = resolveEventResponseId(parsed);
        const merged = getAssistantPendingText(responseId) + parsed.delta;
        setAssistantPendingText(responseId, merged);
        upsertAssistantStreamingTranscript(responseId, merged);
        touchMeaningfulActivity();
        setPhase('assistantSpeaking');
      }
      return;
    }

    if (parsed.type === 'response.output_text.done' || isAudioTranscriptDone(parsed.type)) {
      const responseId = resolveEventResponseId(parsed);
      const finalText =
        (typeof parsed.text === 'string' && parsed.text.trim()) ||
        (typeof parsed.transcript === 'string' && parsed.transcript.trim()) ||
        getAssistantPendingText(responseId).trim();
      if (finalText) setAssistantPendingText(responseId, finalText);
      if (isAudioTranscriptDone(parsed.type)) {
        if (finalText) touchMeaningfulActivity();
        commitAssistantTranscript(finalText, responseId);
      }
      return;
    }

    if (parsed.type === 'response.done') {
      state.assistantResponseActive = false;
      const responseId = parsed.response && parsed.response.id;
      const extracted =
        extractTextFromResponseDone(parsed) ||
        getAssistantPendingText(responseId) ||
        state.pendingAssistantText;
      if (extracted) {
        touchMeaningfulActivity();
        commitAssistantTranscript(extracted, responseId);
      } else if (responseId) {
        scheduleAssistantCommitFallback(responseId);
      } else {
        commitAssistantTranscript('', responseId);
      }
      clearBenignRealtimeError();
      flushPendingSessionUpdate();
      setPhase('listening');
      return;
    }
  }

  function isCallSessionStale(gen) {
    return gen !== callGeneration;
  }

  function isPeerConnectionUsable(pc) {
    return !!(pc && pc.signalingState !== 'closed' && pc.connectionState !== 'closed');
  }

  function abortPendingSessionRequest() {
    if (!sessionAbortController) return;
    try {
      sessionAbortController.abort();
    } catch (_) {}
    sessionAbortController = null;
  }

  function cleanupRtc(options) {
    callGeneration += 1;
    abortPendingSessionRequest();
    const preserveTimer = options && options.preserveTimer;
    stopSilenceWatch();
    if (preserveTimer) {
      stopTimerInterval();
    } else {
      resetTimerForNewCall();
    }
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
    state.pendingSessionInstructions = null;
    state.pendingAssistantText = '';
    state.lastAssistantResponseId = null;
    resetDialogOrder();
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
    if (isCallInProgress(state.phase)) return;
    const gen = callGeneration;
    state.error = null;
    renderError();
    state.messages = [];
    resetDialogOrder();
    renderedMessageCount = 0;
    state.lastResolvedQuery = '';
    state.lastResolvedNormalized = '';
    state.clarifyCount = 0;
    state.firstTurnInstructions = '';
    state.pendingSessionInstructions = null;
    state.activeProcessCode = BASE_OPERATOR_CODE;
    state.activeProcessPrompt = '';
    state.activeSessionInstructions = '';
    if (refs.processBadge) refs.processBadge.classList.add('hidden');
    renderMessages();
    resetTimerForNewCall();
    setPhase('connecting');
    startTimer();

    let pc = null;
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (isCallSessionStale(gen)) {
        mediaStream.getTracks().forEach(function (t) { t.stop(); });
        return;
      }

      pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      const dc = pc.createDataChannel('oai-events');
      rtc.pc = pc;
      rtc.dc = dc;
      rtc.localStream = mediaStream;

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
      if (isCallSessionStale(gen)) return;

      var iceWait = await waitForIceGathering(pc, 12000);
      if (isCallSessionStale(gen)) return;

      const localSdp = pc.localDescription && pc.localDescription.sdp;
      if (!localSdp) throw new Error('Не удалось подготовить SDP offer');
      if (!/m=audio/i.test(localSdp)) {
        throw new Error('SDP без аудио-линии. Проверьте микрофон и разрешения браузера.');
      }

      abortPendingSessionRequest();
      const abortController = new AbortController();
      sessionAbortController = abortController;
      const sessionResponse = await fetch(apiBase() + '/api/realtime-session/sdp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sdp: localSdp, voice: state.voice, model: state.realtimeModel }),
        signal: abortController.signal,
      });
      if (sessionAbortController === abortController) sessionAbortController = null;
      if (isCallSessionStale(gen)) return;

      const sessionData = await sessionResponse.json();
      if (!sessionResponse.ok) {
        throw new Error(sessionData.userMessage || sessionData.error || 'Ошибка SDP');
      }
      if (isCallSessionStale(gen) || !isPeerConnectionUsable(pc)) return;

      await pc.setRemoteDescription({ type: 'answer', sdp: sessionData.sdp });
      if (isCallSessionStale(gen)) return;
      updateMeters();
    } catch (err) {
      if (isCallSessionStale(gen) || err.name === 'AbortError') return;
      state.error = err.message || 'Не удалось начать звонок';
      renderError();
      cleanupRtc();
      setPhase('idle');
    }
  }

  function hangUp(options) {
    if (state.phase === 'ended') return;
    const reason = options && options.reason;
    freezeTimerOnHangup();
    cleanupRtc({ preserveTimer: true });
    const line =
      reason === 'silence'
        ? 'Звонок завершён: нет речи 30 сек.'
        : 'Звонок завершён';
    pushMessage({ role: 'assistant', content: line, serviceLine: true });
    setPhase('ended');
    updateMeters();
  }

  function resolveRealtimeModelId(modelId) {
    const found = REALTIME_MODEL_OPTIONS.find(function (entry) {
      return entry.id === modelId;
    });
    return found ? found.id : DEFAULT_REALTIME_MODEL;
  }

  function syncCallSelectWidth(select) {
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
    syncCallSelectWidth(refs.voicePicker);
    refs.voicePicker.addEventListener('change', function () {
      state.voice = refs.voicePicker.value;
      localStorage.setItem(VOICE_STORAGE_KEY, state.voice);
    });
  }

  function initModelPicker() {
    if (!refs.modelPicker) return;
    refs.modelPicker.innerHTML = '';
    REALTIME_MODEL_OPTIONS.forEach(function (entry) {
      const option = document.createElement('option');
      option.value = entry.id;
      option.textContent = entry.label;
      refs.modelPicker.appendChild(option);
    });
    state.realtimeModel = resolveRealtimeModelId(state.realtimeModel);
    refs.modelPicker.value = state.realtimeModel;
    syncCallSelectWidth(refs.modelPicker);
    refs.modelPicker.addEventListener('change', function () {
      state.realtimeModel = resolveRealtimeModelId(refs.modelPicker.value);
      refs.modelPicker.value = state.realtimeModel;
      localStorage.setItem(MODEL_STORAGE_KEY, state.realtimeModel);
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
        if (refs.startBtn.disabled) return;
        void startCall();
      });
    }
    if (refs.hangupBtn) {
      refs.hangupBtn.addEventListener('click', function () {
        if (refs.hangupBtn.disabled) return;
        hangUp();
      });
    }
  }

  function initCallView() {
    refs = {
      startScreen: document.getElementById('callStartScreen'),
      callScreen: document.getElementById('callActiveScreen'),
      voicePicker: document.getElementById('callVoicePicker'),
      modelPicker: document.getElementById('callModelPicker'),
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
      rtc.aiMeter = new global.CallVoiceMeter(refs.aiMeterEl);
      rtc.aiMeter.start();
    }
    if (refs.userMeterEl && global.CallVoiceMeter) {
      rtc.userMeter = new global.CallVoiceMeter(refs.userMeterEl);
      rtc.userMeter.start();
    }

    initVoicePicker();
    initModelPicker();
    bindAccessCodeInput();
    bindEvents();
    renderStatus();
    updateCallControls();
    renderMessages();
    showScreen('start');
  }

  global.initCallView = initCallView;
})(window);
