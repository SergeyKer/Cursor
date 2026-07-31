# Dialogue session economy v1

Канон: [`lib/dialogue/dialogueSessionEconomy.ts`](../lib/dialogue/dialogueSessionEconomy.ts).
Wire: [`lib/rewardsEvents.ts`](../lib/rewardsEvents.ts), [`lib/rewardsState.ts`](../lib/rewardsState.ts), футер `sessionMeter`.

## Инвариант

Не меняет протокол диалога (ветки, карточки, API, `dialogueCorrect`).
Добавляет надстройку: счётчик закрытых drill-узлов → global XP + UI футера.
Engvo наверху **не запрещает разговор** — ограничивается только XP/цель сессии.

## Правила

| Параметр | Значение |
|----------|----------|
| Длина сессии | 8 |
| success (clean advance) | +3 XP, N+1 |
| recovered (после Повтори) | +1 XP, N+1 |
| freeze / meta / error | N без изменений |
| completion 8/8 | +10 XP (atomic с последним шагом) |
| Daily cap | 28 XP / день (только dialogue) |
| После 8/8 | чат можно; XP 0 до рестарта |

N = eligible `dialogueCorrect` advance (следующий вопрос), не сообщения пользователя и не ответы ИИ.

## Exit chips (после 8/8)

Sticky nav-chips над composer, пока сессия `completed` и чат диалога открыт:

- **Готово** → Мой план
- **Практика** → меню практики (без автостарта)

Нет chip «Продолжить». Поле ввода не блокируется.

## Футер

- Верх: комментарий момента (≤ 38).
- Низ: `AppFooter.sessionMeter` — LEFT `⭐ +XP` · CENTER bar · RIGHT glyph:
  - active: `🎯{remaining}`
  - error / Повтори: `🔁`
  - completed: `🏁`
  - daily cap (не completed): `👍`
- Смена RIGHT: crossfade ~200ms (`prefers-reduced-motion` = мгновенно).
- `sessionMeter` XOR `lessonFooterSegments`.

## Mastery

Кубок темы / матрица режимов — вне этого документа.
