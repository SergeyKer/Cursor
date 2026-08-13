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

## Exit chips (после 8/8)

Sticky nav-chips над composer, пока сессия `completed` и чат перевода открыт:

- **Готово** → Мой план (`myPlanSpaceV1` или меню `myPlan`)
- **Практика** → меню практики (без автостарта)

Нет chip «Продолжить». Поле ввода не блокируется. Copy: [`lib/uiCopy/translationSessionExit.ts`](../lib/uiCopy/translationSessionExit.ts). Resolve: [`lib/translation/resolveTranslationSessionExitChips.ts`](../lib/translation/resolveTranslationSessionExitChips.ts).

## Футер

- Верх: комментарий момента (≤ 38 символов, `FOOTER_DYNAMIC_MAX_LENGTH`). До 8/8 — раунд, не дневной кап XP.
- Низ: одна линия `AppFooter.sessionMeter` (высота chrome без изменений). Разметка:
  - LEFT: `⭐ +{sessionXp} XP`
  - CENTER: `0` + continuous progressbar + `{target}` (`role=progressbar`, fill = `current/target`)
  - RIGHT glyphs: `🎯{remaining}` / `🔁` (error) / `🏁` (complete)
- Дневной кап XP остаётся в данных; до 8/8 не меняет TOP и RIGHT (чат не запрещает).
- Prop: `{ current, target, sessionXp, statusLabel, fillPercent? }`; default `null`.
- `sessionMeter` XOR `lessonFooterSegments`; без `variantProgress` dots.
- Урок/практика/другие режимы: `sessionMeter=null` → без регрессии.

## Mastery

Кубок темы / матрица режимов — вне этого документа. Complete сессии совместим с later `topicModeCleared.translation`.
