const { CALL_COMPANY_NAME, CALL_OPERATOR_NAME } = require('./constants');

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function applyBrandPlaceholders(text) {
  return normalizeText(text)
    .replace(/Наша Компания/gi, CALL_COMPANY_NAME)
    .replace(/оператор \[Имя\]/gi, `меня зовут ${CALL_OPERATOR_NAME}`)
    .replace(/оператор \[имя\]/gi, `меня зовут ${CALL_OPERATOR_NAME}`);
}

module.exports = {
  normalizeText,
  applyBrandPlaceholders,
};
