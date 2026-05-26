const CLOSING_PHASE = {
  NONE: 'none',
  ASKED: 'asked',
  ANSWERED: 'answered',
  AI_FAREWELL: 'aiFarewell',
};

const CLOSING_QUESTIONS_RE =
  /остал[\p{L}]*\s+(?:ли\s+)?(?:у\s+вас\s+)?(?:ещ[её]\s+)?вопрос[\p{L}]*|есть\s+(?:ли\s+)?(?:у\s+вас\s+)?(?:ещ[её]\s+)?вопрос[\p{L}]*|что[\s-]нибудь\s+ещ[её]|что[\s-]то\s+ещ[её]|могу\s+ещ[её]\s+чем/iu;

const HAS_MORE_QUESTIONS_RE =
  /(?:^|[,.!?]\s*)да\s+есть\s+ещ[её]?\s*вопрос|(?:^|[,.!?]\s*)(?:да|ага|конечно|ну\s+да)[\s,!.?-]*(?:у\s+меня\s+|мне\s+)?(?:ещ[её]\s+)?(?:есть\s+)?вопрос|(?:^|[,.!?]\s*)(?:а\s+)?(?:ещ[её]\s+)(?:один\s+)?вопрос|(?:^|[,.!?]\s*)есть\s+(?:ещ[её]\s+)?вопрос/iu;

const NO_QUESTIONS_RE =
  /^(?:неа|нету|ничего|все(?:\s+понятно|\s+ясно)?(?:\s+спасибо)?|понятно(?:\s+спасибо)?|ясно(?:\s+спасибо)?|спасибо(?:\s+(?:все|это\s+все))?|больше\s+(?:нет|ничего)|вопросов\s+нет|нет\s+вопрос|нет\s+все\s+(?:понятно|ясно)|нет\s*,?\s*(?:вопросов\s+нет|все|спасибо|это\s+все)?|нет)$/iu;

const NO_QUESTIONS_CONTINUATION_RE = /^(?:нет\s*,?\s*но|нет\s*,?\s*а\s+|нет\s*,?\s*у\s+меня)/i;

const FAREWELL_RE =
  /до\s+свидан|всего\s+добр|хорошего\s+дн|хорошего\s+вечер|спасибо\s+за\s+(?:обращен|звонок)|удачи|всего\s+хорошего|был\s+рад\s+помоч|будем\s+ждать/i;

function normalizeCallClosingText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectClosingQuestionsPrompt(text) {
  const normalized = normalizeCallClosingText(text);
  if (!normalized) return false;
  return CLOSING_QUESTIONS_RE.test(normalized);
}

function detectHasMoreQuestions(text) {
  const normalized = normalizeCallClosingText(text);
  if (!normalized) return false;
  return HAS_MORE_QUESTIONS_RE.test(normalized);
}

function detectNoQuestionsAnswer(text) {
  const normalized = normalizeCallClosingText(text);
  if (!normalized) return false;
  if (detectHasMoreQuestions(normalized)) return false;
  if (NO_QUESTIONS_CONTINUATION_RE.test(normalized)) return false;
  if (/^нет\s+[\p{L}]+/iu.test(normalized) && !/^нет(?:\s*,?\s*(?:вопросов\s+нет|все|спасибо|вопрос))/iu.test(normalized)) {
    return false;
  }
  return NO_QUESTIONS_RE.test(normalized);
}

function detectFarewell(text) {
  const normalized = normalizeCallClosingText(text);
  if (!normalized) return false;
  return FAREWELL_RE.test(normalized);
}

function createCallClosingTracker() {
  let phase = CLOSING_PHASE.NONE;
  let pendingFarewellTimeout = false;
  let pendingUserFarewellHangup = false;

  function reset() {
    phase = CLOSING_PHASE.NONE;
    pendingFarewellTimeout = false;
    pendingUserFarewellHangup = false;
  }

  function getPhase() {
    return phase;
  }

  function onAssistant(text) {
    const normalized = normalizeCallClosingText(text);
    if (!normalized) return { changed: false, phase };

    if (detectClosingQuestionsPrompt(normalized)) {
      phase = CLOSING_PHASE.ASKED;
      pendingFarewellTimeout = false;
      pendingUserFarewellHangup = false;
      return { changed: true, phase, event: 'closing_asked' };
    }

    if (phase === CLOSING_PHASE.ANSWERED && detectFarewell(normalized)) {
      phase = CLOSING_PHASE.AI_FAREWELL;
      pendingFarewellTimeout = true;
      return { changed: true, phase, event: 'ai_farewell' };
    }

    return { changed: false, phase };
  }

  function onUser(text) {
    const normalized = normalizeCallClosingText(text);
    if (!normalized) return { changed: false, phase };

    if (phase === CLOSING_PHASE.ASKED) {
      if (detectHasMoreQuestions(normalized)) {
        phase = CLOSING_PHASE.NONE;
        pendingFarewellTimeout = false;
        pendingUserFarewellHangup = false;
        return { changed: true, phase, event: 'more_questions' };
      }
      if (detectNoQuestionsAnswer(normalized)) {
        phase = CLOSING_PHASE.ANSWERED;
        return { changed: true, phase, event: 'no_questions' };
      }
    }

    if (phase === CLOSING_PHASE.AI_FAREWELL && detectFarewell(normalized)) {
      pendingUserFarewellHangup = true;
      pendingFarewellTimeout = false;
      return { changed: true, phase, event: 'user_farewell' };
    }

    return { changed: false, phase };
  }

  function onAssistantResponseDone() {
    if (phase !== CLOSING_PHASE.AI_FAREWELL || !pendingFarewellTimeout) {
      return { changed: false, phase, event: null };
    }
    return { changed: true, phase, event: 'farewell_timeout_ready' };
  }

  function shouldScheduleUserFarewellHangup() {
    return pendingUserFarewellHangup;
  }

  function shouldScheduleFarewellTimeout() {
    return pendingFarewellTimeout && phase === CLOSING_PHASE.AI_FAREWELL;
  }

  function clearFarewellTimeoutFlag() {
    pendingFarewellTimeout = false;
  }

  function clearUserFarewellHangupFlag() {
    pendingUserFarewellHangup = false;
  }

  function isInClosingGrace() {
    return phase === CLOSING_PHASE.AI_FAREWELL;
  }

  return {
    reset,
    getPhase,
    onAssistant,
    onUser,
    onAssistantResponseDone,
    shouldScheduleUserFarewellHangup,
    shouldScheduleFarewellTimeout,
    clearFarewellTimeoutFlag,
    clearUserFarewellHangupFlag,
    isInClosingGrace,
  };
}

module.exports = {
  CLOSING_PHASE,
  normalizeCallClosingText,
  detectClosingQuestionsPrompt,
  detectHasMoreQuestions,
  detectNoQuestionsAnswer,
  detectFarewell,
  createCallClosingTracker,
};
