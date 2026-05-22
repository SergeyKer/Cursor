const { CALL_COMPANY_NAME } = require('./constants');

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function applyBrandPlaceholders(text) {
  const assistantLabel = `голосовой помощник компании ${CALL_COMPANY_NAME}`;
  return normalizeText(text)
    .replace(/Наша Компания/gi, CALL_COMPANY_NAME)
    .replace(/оператор \[Имя\]/gi, assistantLabel)
    .replace(/оператор \[имя\]/gi, assistantLabel)
    .replace(/клиентский менеджер \[Имя\]/gi, assistantLabel)
    .replace(/Это \[Имя\],?\s*(ваш )?клиентский менеджер/gi, `Голосовой помощник компании ${CALL_COMPANY_NAME}`)
    .replace(/Это \[Имя\],?\s*ваш менеджер/gi, `Голосовой помощник компании ${CALL_COMPANY_NAME}`)
    .replace(/Это \[Имя\],?\s*компания/gi, `Голосовой помощник компании ${CALL_COMPANY_NAME}, компания`);
}

module.exports = {
  normalizeText,
  applyBrandPlaceholders,
};
