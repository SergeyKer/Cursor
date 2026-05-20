# Отчёт: анти-фарм уроков + футер

**Дата:** 2026-05-20  
**Статус:** этапы 1–3 выполнены; P3 (пороги медалей) пропущен.

---

## Этапы

| Этап | Статус | Что сделано |
|------|--------|-------------|
| 1. XP прирост | сделано | `bestTotalXp`, `resolveGlobalLessonXpDelta`, `page.tsx` |
| 2. P1 медали + hint | сделано | `capMedalForRepeatRun`, `lessonReturnHint`, RewardPopup 10 с |
| 3. P2-B combo | сделано | `getComboMilestoneXp` при core ≥ 50% |
| 4. P3 пороги | пропущен | по решению продукта |
| Футер | сделано | `lessonFooterTopLine`, сегменты ⭐/🔥, тексты |

---

## Изменённые файлы

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
