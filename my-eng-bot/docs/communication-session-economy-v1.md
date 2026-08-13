# Communication session economy v1

Канон: [`lib/communication/communicationSessionEconomy.ts`](../lib/communication/communicationSessionEconomy.ts).
Wire: [`lib/rewardsEvents.ts`](../lib/rewardsEvents.ts), [`lib/rewardsState.ts`](../lib/rewardsState.ts), футер `sessionMeter`.

## Product lock (v1)

- Внешние выходы OFF: OpenAI web search, Gismeteo, force `иии`/`iii`, sources, predict-internet UI.
- Ответ ИИ всегда EN + RU→EN paraphrase (как free_call).
- Вход RU/EN/mix OK; диктовка + Ru/En/Mix; default старт **Mix**.
- Уровни/CEFR и «подробнее» / «ещё подробнее» сохранены.

## Инвариант

Не меняет протокол общения (чат, mixed-input, translate-only, detail).
Добавляет надстройку: счётчик успешных ходов → global XP + UI футера.
Engvo наверху **не запрещает общение** — ограничивается только XP/цель сессии.

## Правила

| Параметр | Значение |
|----------|----------|
| Длина сессии | 8 |
| step (successful turn) | N+1 всегда; +2 XP только при английской попытке (mix / своё EN-слово) |
| bootstrap / API error / dup key | N без изменений |
| completion 8/8 | +8 XP, только если в сессии была ≥1 EN-попытка |
| Daily cap | 24 XP / день (только communication; максимум = 8×2+8 при всех EN) |
| После 8/8 | чат можно; XP 0 до рестарта |

N = успешный user→assistant turn (ответ бота EN). Чистый RU-вход двигает N, XP не даёт.

## Exit chips (после 8/8)

- **Готово** → Мой план
- **Практика** → меню практики (без автостарта)

Нет chip «Продолжить». Поле ввода не блокируется.

## Футер

- Верх: комментарий момента (≤ 38).
- Низ: `AppFooter.sessionMeter` — LEFT `⭐ +XP` · CENTER bar · RIGHT glyph:
  - active: `🎯{remaining}`
  - completed: `🏁`
  - daily cap (не completed): `👍`
- daily_cap TOP: «XP дня набран. Можно общаться.»
- Смена RIGHT: crossfade ~200ms.
- `sessionMeter` XOR `lessonFooterSegments`.

## Mastery

Кубок темы / матрица режимов — вне этого документа.
