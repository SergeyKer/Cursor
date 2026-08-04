# FAQ after F5 — handoff (в следующий чат)

Скопируй блок **COPY FROM HERE … COPY END** в новый чат в `my-eng-bot`.

Правила chip: [faq-questionru-rewrite-guide.md](./faq-questionru-rewrite-guide.md)

---

```text
COPY FROM HERE
=== Engvo FAQ handoff (после F5 gate) ===

Контекст: my-eng-bot, tutor localFaq + localExplain stubs.
НЕ архив. НЕ Supabase FAQ.
Data = SoT; НЕ generateLocalFaq.mjs.
Explain — только после явной фразы «можно генерировать Explain».

Модель: id стабильный; questionRu = display; aliases = старые.
Правила: docs/tutor/faq-questionru-rewrite-guide.md

## Уже СДЕЛАНО (F0–F5)

F1–F4: chip rewrite + stubs wave1…11.
F5 gate (сверка, без Explain):
  Каталог 584 | idle 119 | non-idle 465
  Stubs wave1…11: 579 rows (578 pending + 1 saved)
  Уникальных faqId в stubs: 559
  Дубли faqId across waves: 20 (F3/F4 re-touch) — F6 дедуп, приоритет более новой wave
  packId дублей: 0
  missing faq / matchQueries≠questionRu: 0
  non-idle без stub: 0
  idle без stub: 25 (намеренные KEEP без очереди; часть в golden: a1.to_be.003)
  GOLDEN_PATH live: 5 packs
    a2.word_order.159, a2.word_order.099, b1.reported_speech.043,
    a1.to_be.003, a1.mistakes.131 (wave1 saved)

F5 статус: сверка зелёная → можно планировать F6.
Explain НЕ генерировали.

## Что осталось

F6 (СЛЕДУЮЩАЯ ФАЗА): генерация Explain.
  ОБЯЗАТЕЛЬНО: переключиться в режим Plan и составить точный план F6
  (tutor-explain → LocalExplainPack → wire lookup только с answer;
   matchQueries новый+старый; wave1…11; дедуп faqId).
  В тот же план F6 включить отложенный шаг F7 — выполнять только после F6.
F7 userQ→faq_id — НЕ начинать до завершения плана F6.

Не делать в Agent до плана: массовую генерацию Explain.

Первая команда новому чату / после Plan:
Переключись в Plan. Составь план F6 (генерация Explain) с дедупом stubs;
в конец плана — отложенный F7 после выполнения F6.
Без фразы «можно генерировать Explain» код генерации не писать.
COPY END
```

## Smoke / approve (человек)

1. Chip F1–F4 ок (aliases match старых формулировок).
2. Pending не в live lookup (кроме golden + mistakes.131 saved).
3. Перед F6: Plan mode → план → затем «можно генерировать Explain».
