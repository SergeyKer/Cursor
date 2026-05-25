function stripMarkdownFence(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return m ? m[1].trim() : s;
}

function parseLlmAnswer(content) {
  const trimmed = stripMarkdownFence(content);
  try {
    const parsed = JSON.parse(trimmed);
    const answer = String(parsed.answer || '').trim();
    if (answer) return { answer };
  } catch {
    /* fallback below */
  }

  if (trimmed && !trimmed.startsWith('{')) {
    return { answer: trimmed };
  }

  return { answer: null };
}

module.exports = { parseLlmAnswer, stripMarkdownFence };
