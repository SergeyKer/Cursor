const { buildFacts } = require('../lib/cabinet/buildFacts');
const { parseLlmAnswer } = require('../lib/cabinet/parseLlmAnswer');
const { chatMini } = require('../lib/openai/chatMini');

const REPHRASE_SYSTEM = `Ты помощник клиента сервиса E-liss в личном кабинете.
Переформулируй черновик ответа дружелюбно и кратко на русском языке.
ЗАПРЕЩЕНО добавлять даты, суммы, адреса, объекты или факты, которых нет в черновике.
Сохрани все числа и даты из черновика без изменений.
Ответь строго JSON без markdown: {"answer":"текст ответа"}`;

async function rephraseDraft(draftAnswer) {
  const result = await chatMini({
    system: REPHRASE_SYSTEM,
    user: `Черновик ответа:\n\n${draftAnswer}\n\nПереформулируй для клиента.`,
    maxTokens: 600,
    temperature: 0.2,
  });

  if (result.error === 'no_api_key') {
    return { answer: draftAnswer, source: 'facts', llmSkippedReason: 'no_api_key' };
  }

  if (result.httpError) {
    return {
      answer: draftAnswer,
      source: 'facts',
      llmSkippedReason: result.apiMessage,
      userMessage: result.userMessage,
    };
  }

  const parsed = parseLlmAnswer(result.content);
  if (parsed.answer) {
    return { answer: parsed.answer, source: 'facts+llm', llmSkippedReason: null };
  }

  return { answer: draftAnswer, source: 'facts', llmSkippedReason: 'parse_error' };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const query = String((req.body && req.body.query) || '').trim();
    if (!query) {
      res.status(400).json({ error: 'query is required', userMessage: 'Введите вопрос.' });
      return;
    }

    const siteId = req.body && req.body.siteId ? String(req.body.siteId).trim() : null;
    const { intent, citations, draftAnswer } = buildFacts(query, siteId || null);
    const llm = await rephraseDraft(draftAnswer);

    res.status(200).json({
      intent,
      answer: llm.answer,
      citations,
      draftAnswer,
      source: llm.source,
      llmSkippedReason: llm.llmSkippedReason,
      userMessage: llm.userMessage || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: message,
      userMessage: 'Не удалось получить ответ. Перезапустите сервер и попробуйте снова.',
    });
  }
};
