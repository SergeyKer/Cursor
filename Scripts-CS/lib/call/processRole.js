const DEFAULT_CALL_ROLE = 'client_manager';

const INCOMING_OPERATOR_CODES = new Set([
  'Ответ оператора',
  'Вопрос по стоимости',
  'Вопрос по сотрудничеству',
  'Уточнение по заявке',
  'Изменение условий в рамках дого',
  'Новые клиенты',
  'Претензии на качество',
  'Претензия по качеству',
  'Жалоба на водителя',
  'Забрали чужие ковры',
  'Входящий запрос документов',
  'Запрос о направлении счета',
]);

const CODE_MENU_GROUP = {
  'Подтверждение замен': 'outgoing_manager',
  'Знакомство с новым клиентом': 'outgoing_manager',
  'Знакомство при смене менеджера': 'outgoing_manager',
  'Уточнение по претензии': 'incoming_manager',
  'Ускорение процесса': 'incoming_manager',
  'Когда будет была замена': 'incoming_manager',
  'Когда будет/была замена?': 'incoming_manager',
  'Претензия по доставке ': 'incoming_manager',
  'Претензия по качеству': 'incoming_manager',
  'Оплата и задолженность': 'incoming_manager',
  'Запрос документов в бухгалтерии': 'incoming_manager',
  'Информация о Компании': 'incoming_manager',
  'Уточнение/согласование нового дня замены / маршрута': 'incoming_manager',
  'Уточнение нового маршрута': 'incoming_manager',
  'Заказ пропуска': 'outgoing_manager',
  'Уточнение графика работы': 'outgoing_manager',
  'Уточнение адреса эл. почты': 'outgoing_manager',
  'Расторжение договора': 'incoming_manager',
  'Составление и согласование ДС': 'incoming_manager',
  'Новые клиенты': 'incoming_operator',
  'Вопрос по сотрудничеству': 'incoming_operator',
};

function normalizeCode(code) {
  return String(code || '').trim();
}

function resolveMenuGroup(meta) {
  if (!meta) return 'other';
  const explicit = meta.menu_group;
  if (explicit && explicit !== 'other') return explicit;
  const fromMap = CODE_MENU_GROUP[normalizeCode(meta.code)];
  if (fromMap) return fromMap;
  if (INCOMING_OPERATOR_CODES.has(normalizeCode(meta.code))) return 'incoming_operator';
  const text = `${meta.name || ''} ${meta.code || ''}`.toLowerCase();
  if (/исходящ|знакомств|пропуск|акци|тариф|сезон|повышен|возобновлен/i.test(text)) {
    return 'outgoing_manager';
  }
  return explicit || 'incoming_manager';
}

function isOperatorTierProcess(processCode) {
  return INCOMING_OPERATOR_CODES.has(normalizeCode(processCode));
}

function shouldInjectBaseOperatorRecs(callRole, processCode) {
  if (callRole !== 'client_manager') return true;
  return false;
}

module.exports = {
  DEFAULT_CALL_ROLE,
  INCOMING_OPERATOR_CODES,
  resolveMenuGroup,
  isOperatorTierProcess,
  shouldInjectBaseOperatorRecs,
};
