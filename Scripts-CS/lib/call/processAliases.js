/** Дубликаты meta → canonical code для resolve и prompt. */
const PROCESS_CODE_ALIASES = {
  'Когда будет/была замена?': 'Когда будет была замена',
  'Претензии на качество': 'Претензия по качеству',
  'Разрешение претензии по качеству ковров': 'Претензия по качеству',
  'Разрешение претензии по доставке ковров': 'Претензия по доставке ',
  'Разрешение претензии по сотрудникам': 'Жалоба на водителя',
  'Претензия по сотрудникам': 'Жалоба на водителя',
  'Утери ковров': 'Утеря ковров',
  'По вопросам оплаты и задолженности': 'Оплата и задолженность',
  'Уточнение адреса электронной почты': 'Уточнение адреса эл. почты',
  'Уточнение нового маршрута': 'Уточнение/согласование нового дня замены / маршрута',
  'Подтверждение замены': 'Подтверждение замен',
};

function canonicalProcessCode(code) {
  const trimmed = String(code || '').trim();
  return PROCESS_CODE_ALIASES[trimmed] || trimmed;
}

function isSparseProcessMeta(meta) {
  if (!meta) return true;
  const text = String(meta.searchable_text || '').replace(/\s+/g, ' ').trim();
  return text.length < 80;
}

module.exports = {
  PROCESS_CODE_ALIASES,
  canonicalProcessCode,
  isSparseProcessMeta,
};
