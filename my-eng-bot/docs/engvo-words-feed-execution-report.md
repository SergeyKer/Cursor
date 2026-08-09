# Engvo Words Feed — отчёт о выполнении

**Дата:** 2026-08-09  
**Канон плана:** `engvo_words_feed_65e88499.plan.md`  
**Статус:** **partial** — W1 + ядро W2 + задел W3; W3 wiring в режимы / W4 Produce не закрыты

## Волны

### W1 — done
- Домен WordFeed: `feedStatus`, soft-fail SRS (−1), `pickNextSessionWords`, tempo Sprint/Full
- Thin loop: ShowRu (Full) → RevealEn → Check → fail-say → SpeakEn → SayPhrase → VocabFinale
- Path A банк: Check✓ + Speak✓ (+ Phrase где шаг был); «Я повторил» не даёт Speak✓
- UI Engvo dock: chips / voice / finale CTA без монет и clipboard
- ByLevel + Worlds на одном engine
- Живой handoff **«Закрепить в переводе»** → LS packet → AppShell → `/api/chat` `focusLemmas`

### W2 — partial
- Меню: 4-й пункт **«Слова в деле»**, rename «Сегодня и мои списки»
- Browse `VocabularyFeedBrowseScreen` (К изучению / В деле / Умею) + handoff
- Custom pack → thin vocab session (`onOpenVocabCustomPack`, `VocabularyPackSessionScreen`)
- **Не сделано в полном объёме:** тумблер «Подгружать изучаемые» в UI старта Перевода/Звонка; `useStreak`/`recordFeedUse` на успешный focus-use в Переводе; Call secondary CTA

### W3 — partial (задел)
- `mistakesList.ts` + `extractLemmaMistake` + тесты
- **Не сделано:** запись mistakes из translation/call, секция «Из ошибок» в browse, My Plan nag, photo OCR pack

### W4 — not done
- Produce letter puzzle
- Полная зачистка legacy reward path (уже вырезан из новых экранов)

## Ключевые файлы

**Добавлено / существенно:**
- `types/vocabulary.ts`
- `lib/vocabulary/srs.ts`, `wordFeed.ts`, `voiceAccept.ts`, `phraseTemplates.ts`, `sessionEngine.ts`, `translationHandoff.ts`, `mistakesList.ts`, `customPackAdapter.ts`, `storage.ts`, `learned.ts`
- `hooks/useVocabularyThinSession.ts`
- `components/vocabulary/VocabularyThinSession.tsx`, `VocabularyByLevelScreen.tsx`, `VocabularyWorldsScreen.tsx`, `VocabularyFeedBrowseScreen.tsx`, `VocabularyPackSessionScreen.tsx`
- `components/app/AppShell.tsx` (handoff + ветки feed/pack)
- `components/MenuSectionPanels.tsx`, `components/adaptiveRetention/AdaptiveDailyHub.tsx`
- `app/api/chat/route.ts` (`focusLemmas` → system prompt)

## Тесты (gates)

```text
npx vitest run lib/vocabulary
→ 10 files, 34 tests passed
```

Покрыто: soft fail, pickNext, Path A bank, pickFocus caps, voiceAccept, handoff LS, mistakes extract, chatStub.

## Регрессии (проверка)

| Зона | Статус |
|------|--------|
| Vocab unit | green |
| Перевод handoff | wired (focusLemmas в API) |
| Диалог WordFeed | не добавлялся |
| Practice / Lesson | shared chips/composer reuse only |
| Menu 3→4 пункта | добавлен wordsFeed |
| tsc project | pre-existing errors вне vocab; vocab props compile |

## Отклонения / решения агента

1. Tempo default **Sprint**; preference в `engvo_vocab_tempo`
2. SayPhrase в Sprint на среднем индексе порции
3. Legacy strict-learned → `feedStatus: mastered` при normalize (continuity вкладки Умею)
4. Handoff TTL 30 мин; open translation через `ensureFirstMessageRef` после `setSettings(mode=translation)`
5. Custom pack word ids = stable hash от `packId:itemId:en`
6. W3/W4 урезаны по времени: сначала живой B′ (W1), затем полки/pack

## Не сделано / next

- Тумблер smart mix + Call secondary + recordFeedUse/fail в Переводе
- Mistakes inbox UI + запись из режимов
- My Plan nag банка 48ч
- Photo → CustomWordPack (`source: 'photo'`)
- Produce между Check и SpeakEn
- Награды XP/монеты — **отдельный чат** (out of scope)

## Ручной smoke

1. Уроки → Слова → уровни/миры → Sprint → **Учить**
2. Пройти слово: Check✓ → Speak → (Phrase) → в деле
3. Finale → **Закрепить в переводе** → открывается перевод с focus lemmas
4. Check✗ → слово не в банке
5. «Я повторил» двигает шаг, но без Check✓+реальный Speak банк не открывается
6. Меню → **Слова в деле** → вкладки
7. Хаб → свой список → **Учить** открывает thin vocab (не practice topic)

## Commit

Не создавался (пользователь не просил).
