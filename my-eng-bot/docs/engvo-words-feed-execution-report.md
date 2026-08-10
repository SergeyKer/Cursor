# Engvo Words Feed — отчёт о выполнении

**Дата:** 2026-08-10  
**Канон плана:** `engvo_words_feed_65e88499.plan.md`  
**Статус:** **done (A–G)** — W1–W4 закрыты в коде; награды XP/монеты по-прежнему out of scope

## Волны

### W1 — done
- Домен WordFeed: `feedStatus`, soft-fail SRS (−1), `pickNextSessionWords`, tempo Sprint/Full
- Thin loop + Path A банк + живой handoff **«Закрепить в переводе»**

### W2 — done
- Полки **«Слова в деле»**, custom pack → thin loop
- Тумблер **«Подгружать изучаемые»** (Перевод + Engvo call settings) → `pickFocusLemmasForMode` / `resolveSmartMixFocusLemmas`
- `recordFeedUse` / `recordFeedFail` → `useStreak ≥ 2` = **Умею** (перевод + успех хода звонка)
- Finale secondary **«В звонок»** + `openCallFromVocabHandoff` + focus cue в realtime instructions

### W3 — done
- Mistakes inbox: запись из translation soft/hard fail; вкладка **«Из ошибок»**
- My Plan nag: `vocab-mistakes-inbox` / `vocab-bank-waiting` (48ч) → перевод с тумблером ON
- Photo → `CustomWordPack` `source: 'photo'` (AdaptiveDailyHub + `/api/analyze-image`)

### W4 — done
- Produce (собери EN из букв) между Check и SpeakEn; stage +1 / −2
- Не трогает Path A bank gate

## Ключевые новые файлы

- `lib/vocabulary/loadStudyingPref.ts`, `catalogCache.ts`, `resolveSmartMix.ts`, `applyFocusOutcome.ts`, `producePuzzle.ts`
- UI/wiring: Feed mistakes tab, Menu toggle, Call handoff, My Plan nag, photo import, Produce UI

## Тесты

```text
npx vitest run lib/vocabulary
→ 12 files, 41 tests passed
```

## Ручной smoke

1. Тумблер ON → старт перевода → в промпте focus lemmas  
2. Success×2 focus → вкладка **Умею**  
3. Finale → **В звонок** (при `engvoVoiceV1`)  
4. Soft/hard fail перевода → **Из ошибок**  
5. My Plan nag банка/ошибок → перевод  
6. Фото списка → pack → Учить  
7. Loop: Check✓ → Produce → Speak  

## Commit

Не создавался (пользователь не просил).
