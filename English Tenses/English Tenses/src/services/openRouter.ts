const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function explainAnswerWithAI(params: {
  tenseName: string;
  russian: string;
  correctAnswer: string;
  userAnswer: string;
}): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Не найден ключ VITE_OPENROUTER_API_KEY. Добавьте его в файл .env и перезапустите dev-сервер.'
    );
  }

  const systemPrompt =
    'Ты объясняешь английскую грамматику по-русски. Отвечай кратко (2–4 предложения), с конкретным разбором формы глагола и порядка слов.';

  const userPrompt = [
    `Время: ${params.tenseName}.`,
    `Русское предложение: "${params.russian}".`,
    `Правильный вариант: "${params.correctAnswer}".`,
    params.userAnswer
      ? `Ответ ученика: "${params.userAnswer}".`
      : 'Ответ ученика не указан (он только смотрит на правильный вариант).',
    '',
    '1) Объясни, почему этот английский вариант правильный именно для этого времени.',
    params.userAnswer
      ? '2) Укажи, что не так в ответе ученика (по смыслу / по грамматике / по форме глагола).'
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 320,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ошибка OpenRouter: ${response.status} ${text}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content || typeof content !== 'string') {
    throw new Error('Не удалось прочитать ответ модели.');
  }

  return content.trim();
}

