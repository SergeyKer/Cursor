# Translation session economy v1

Канон: [`lib/translation/translationSessionEconomy.ts`](../lib/translation/translationSessionEconomy.ts).
Wire: [`lib/rewardsEvents.ts`](../lib/rewardsEvents.ts), [`lib/rewardsState.ts`](../lib/rewardsState.ts), футер `sessionMeter`.

## Инвариант

Не меняет протокол перевода (success / error_repeat / junk_repeat / soft_fail_advance).
Добавляет надстройку: счётчик закрытых предложений → global XP + UI футера.

## Правила

| Параметр | Значение |
|----------|----------|
| Длина сессии | 8 |
| success | +4 XP, N+1 |
| soft_fail_advance | +1 XP, N+1 |
| error / junk | N без изменений |
| completion 8/8 | +12 XP (atomic с последним шагом) |
| Daily cap | 40 XP / день (только translation) |
| После 8/8 | чат можно; XP 0 до рестарта |

N = закрытые задания (новое RU после success/soft_fail), не сообщения пользователя и не ответы ИИ.

## Футер

- Верх: комментарий момента (≤ 38 символов).
- Низ (одна линия, высота chrome без изменений): `[bar] N/8 · ⭐+S · статус`.
- `AppFooter.sessionMeter` default `null` — урок/практика/другие режимы без регрессии.

## Mastery

Кубок темы / матрица режимов — вне этого документа. Complete сессии совместим с later `topicModeCleared.translation`.
