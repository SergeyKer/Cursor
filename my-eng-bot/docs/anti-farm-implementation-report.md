# Отчёт: анти-фарм уроков + футер

**Дата:** 2026-05-20 (P4: 2026-05-29)  
**Статус:** этапы 1–3 и **P4 (цикл 1 / локальное серебро)** выполнены; P3 (пороги медалей) пропущен.

---

## Этапы

| Этап | Статус | Что сделано |
|------|--------|-------------|
| 1. XP прирост | сделано | `bestTotalXp`, `resolveGlobalLessonXpDelta`, `page.tsx` |
| 2. P1 медали + hint | сделано | `capMedalForRepeatRun`, `lessonReturnHint`, RewardPopup 10 с |
| 3. P2-B combo | сделано | `getComboMilestoneXp` при core ≥ 50% |
| 4. P3 пороги | пропущен | по решению продукта |
| **5. P4 цикл 1** | **сделано** | `cycle1Started` / `cycle1Closed`, `lessonAntiFarm.ts`, серый слот в меню, cap gold→silver на локальном v1 после броска |
| Футер | сделано | `lessonFooterTopLine`, сегменты ⭐/🔥, тексты |

---

## P4: цикл 1 / брошенный урок (2026-05-29)

### Правила

- Цикл 1 **начинается после первого отправленного ответа** (не по клику «Начать урок»).
- Уход без золотого финиша → `cycle1Closed: true`, в меню **приглушённая бронза** (серый слот).
- Повтор **локального** урока (`menu_reopen`, variant 1) после закрытия цикла 1 → **максимум серебро**.
- **«Сгенерировать урок»** (`menu_generate`) → золото снова возможно при высоком счёте.
- Пороги 90%/50%, XP к уровню, движок шагов — **не менялись**.

### Файлы P4

- `types/userProgress.ts` — `cycle1Started`, `cycle1Closed`, `lessonCycle`
- `lib/lessonAntiFarm.ts` (новый), `lib/featureFlags.ts` — `lessonLocalSilverCapV1`
- `lib/lessonProgressMigration.ts` — cap через `capLessonMedalForRun`
- `lib/lessonFooter.ts` — `resolveLessonCardMedal` при `cycle1Closed`
- `app/page.tsx` — begin/close цикла, `structuredLessonSilverCap`, reveal/footer
- `components/MenuSectionPanels.tsx` — подпись в профиле
- Тесты: `lessonAntiFarm.test.ts`, обновлены `lessonProgressMigration.test.ts`, `lessonFooter.test.ts`

### Тесты P4

```bash
npx vitest run lib/lessonAntiFarm.test.ts lib/lessonProgressMigration.test.ts lib/lessonFooter.test.ts lib/lessonScore.test.ts
```

**Результат:** 46/46 passed.

### QA P4 (вручную)

1. Intro → выход, 0 ответов → **нет** серого слота.
2. 1 ответ → выход → серый слот, `cycle1Closed`.
3. После (2) локальный идеал → **серебро**, не золото.
4. После (2) «Сгенерировать» → золото возможно.
5. «Сгенерировать» → intro без ответа → без метки.

---

## Изменённые файлы (этапы 1–3)

- `types/userProgress.ts` — `bestTotalXp`
- `lib/lessonGlobalXpAward.ts`, `lib/lessonReturnHint.ts`, `lib/lessonFooterTopLine.ts`
- `lib/lessonProgressMigration.ts`, `lib/lessonScore.ts`
- `lib/lessonFooter.ts`, `lib/footerTopLinePhrases.ts`, `lib/rewardsEvents.ts`
- `hooks/useLessonEngine.ts`
- `app/page.tsx`
- Тесты: `lessonGlobalXpAward.test.ts`, `lessonReturnHint.test.ts`, `lessonFooterTopLine.test.ts`, обновлены migration/score/footer/phrases

---

## Тесты

```bash
npx vitest run lib/lessonGlobalXpAward.test.ts lib/lessonReturnHint.test.ts lib/lessonFooterTopLine.test.ts lib/lessonProgressMigration.test.ts lib/lessonScore.test.ts lib/lessonFooter.test.ts lib/footerTopLinePhrases.test.ts lib/rewardsEvents.test.ts
```

**Результат:** 51/51 passed (scope анти-фарм).

Полный `npm test`: 10 падений **вне scope** (tutor-resolve-topic, translation routes — были до изменений).

---

## Поведение до/после

| Действие | До | После |
|----------|-----|-------|
| Повтор идеала 170 | +170 global, gold снова | **+0** global, gold в профиле, за 🔁 max silver |
| Улучшение 100→130 | +130 за сессию | **+30** к уровню |
| Бронза 31 + combo | +61 global | **~+31** global |
| Всплывашка | только 🔁 (в плане) | при **любой** медали в профиле: меню 2 строки, 🔁 3 строки |
| Верхняя строка футера | «+N к прогрессу» = шаг | «+N **к уровню**» = global delta; при 0 — без ложного XP |

---

## Футер: до/после

- **⭐** — очки прохода; title поясняет отличие от уровня.
- **🔥** — `(+N)` без «XP» в сегменте; при blocked combo — «веха».
- **Верхняя строка** — `resolveLessonFooterTopLine` вместо тикера `lesson_xp_awarded` в уроке.

---

## QA вручную

1. Первый идеал → «+N к уровню».
2. Повтор 170/170 → 0 XP к уровню, hint про рекорд.
3. Улучшение счёта → только дельта.
4. COMBO 3 при core &lt; 50% → без «+5 XP» в 🔥.
5. Gold в профиле → меню: hint 2 строки; 🔁: 3 строки + silver за проход.
6. Ошибка / checking — «Почти» / «Смотрю ответ».

---

## Ограничения

- `isStructuredLessonRepeatRun` опирается на `variantNumber` и ref происхождения run.
- Два `RewardPopup` могут теоретически пересечься по времени с наградой за шаг (редко).
