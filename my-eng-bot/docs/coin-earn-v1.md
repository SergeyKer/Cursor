# Монеты: earn в уроках (v1)

См. также: [coin-error-forgiveness-v1.md](./coin-error-forgiveness-v1.md) (трата на forgiveness).

## Earn

| Правило | Значение |
|---------|----------|
| Условие | Золото по **core XP** (≥90%), `resolveMedalFromCoreXp` |
| Награда | **+1 🪙** |
| Лимит | 1 раз на `lessonId` (`coinLedger.lessonGoldClaimed`) |
| Не даём | Silver/bronze; повторное gold на теме с уже выданной монетой |

Критерий начисления **не** зависит от `capLessonMedalForRun`: сгенерированный вариант с gold core засчитывается.

## Spend (уже в проде)

| Правило | Значение |
|---------|----------|
| Действие | Forgiveness одной ошибки на шагах **4–7** |
| Стоимость | **1 🪙**, 1 раз за проход урока |

## Информирование

### Briefing перед уроком

Все сценарии (`first_run`, `cycle1`, `medal_repeat`) используют единые тезисы в [`lib/lessonRepeatBriefingThesisCopy.ts`](../lib/lessonRepeatBriefingThesisCopy.ts) на стадии `briefing` после intro.

| Ситуация | Верхние строки | Остальное |
|----------|----------------|-----------|
| Первый заход / в процессе (`first_run`) | Золото - при отличном результате | монета, комбо 3/5/7, XP-рекорд, forgiveness |
| Перезаход local + silver cap (`cycle1`, `medal_repeat`) | Серебро → Жми Новый вариант | то же (6 строк) |
| Новый вариант от ИИ (generated) | В новом варианте золото снова в цели | то же (5 строк) |
| Reopen с медалью без cap | Жми Новый вариант | то же (5 строк) |
| Монета уже есть | - | «Уже получена» вместо «+1» |

Dual CTA («Новый вариант» / «Повтор варианта») - при `menu_reopen` + silver cap (`cycle1` local, `medal_repeat` local).

### Кнопки (меню + briefing)

Единые подписи в [`lib/lessonVariantCtaCopy.ts`](../lib/lessonVariantCtaCopy.ts):

| Прогресс темы | Сверху (тёмно-синий) | Снизу (светло-синий) |
|---------------|------------------------|----------------------|
| Не начинали / в процессе | Начать урок | Новый вариант (фриз) |
| Бросил (`cycle1Closed`) или есть медаль | Новый вариант | Повтор варианта |

Триггер разблокировки «Новый вариант» в меню: `medal || cycle1Closed`. Фриз - светло-синий secondary, не серый.

- **Меню** - выбор при входе; подписи и порядок меняются при переключении урока в списке.
- **Briefing** (silver cap) - после старта урока: тёмная кнопка «Новый вариант» вызывает `openGeneratedLearningLesson`.
- **Intro / tips** - одна кнопка **«К уроку»** ([`lib/lessonIntroCtaCopy.ts`](../lib/lessonIntroCtaCopy.ts)).

### Финал (`LessonFinalePanel`)

Отдельная строка `coinLine`:

- `+1 🪙 за золотую медаль.`
- `Монета за эту тему уже получена.`
- `До монеты: золото (90%+ по уроку).`

Footer ticker при начислении: `Золотая медаль. +1 🪙.`

## Код

| Модуль | Роль |
|--------|------|
| `lib/coinAwards.ts` | `resolveLessonCoinAward` |
| `lib/rewardsState.ts` | `awardCoins`, `coinLedger`, `isLessonGoldCoinClaimed` |
| `lib/rewardsEvents.ts` | `coins_earned` (только UI, баланс меняет `awardCoins`) |
| `lib/lessonCoinIntroCopy.ts` | Bubble на первом проходе |
| `lib/lessonRepeatBriefingThesisCopy.ts` | Тезисы return briefing |
| `lib/lessonVariantCtaCopy.ts` | Подписи меню / dual briefing |
| `lib/lessonIntroCtaCopy.ts` | «К уроку» на intro/tips |
| `lib/lessonCoinAwardCopy.ts` | Тексты финала |
| `app/page.tsx` | Effect при `completed`, пропсы в UI |

## Регрессия

- Паттерн как у `spendCoins` / `coins_spent`: баланс в чистой функции, event - ticker и `lastReward`.
- Dedupe по `lessonId:runKey` в effect.
- Практика (`practice_completed` effect) не меняется в v1.

## Фаза 2 (не реализовано)

Практика: Challenge 12 ≥90% → +1; кубок 5×90% → +2; skip ошибки в Challenge.
