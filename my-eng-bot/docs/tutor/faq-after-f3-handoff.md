# FAQ after F3 — handoff (в следующий чат)

Скопируй блок **COPY FROM HERE … COPY END** в новый чат в `my-eng-bot`.

Правила chip: [faq-questionru-rewrite-guide.md](./faq-questionru-rewrite-guide.md)

---

```text
COPY FROM HERE
=== Engvo FAQ handoff (после F3 residual) ===

Контекст: my-eng-bot, tutor localFaq + localExplain stubs.
НЕ архив. НЕ Supabase FAQ. НЕ F7.
Data = SoT; НЕ generateLocalFaq.mjs.
Explain — только после «можно генерировать Explain».

Модель: id стабильный (не сливать); questionRu = display; aliases = старые.
Правила: docs/tutor/faq-questionru-rewrite-guide.md
  EN обязателен; anti-spoiler; ситуация→форма; не BrE/AmE; не amn’t в chip.

## Уже СДЕЛАНО

wave1…9: как в after-f2 (≈556 stub touches; F2 grammar-meaning закрыт).
F3 Round1 residual: 12 — wave10.ts
  2 NOWAVE впервые: a1.to_be.013, a1.present_continuous.042
  10 re-touch (matchQueries синхронизированы в wave3/5/7/8/9):
    plurals.076/079/080, present_simple.037, a2.functional.162,
    relative_clauses.073, past_perfect.015, phrasal_verbs.098,
    reported_speech.044, b2.collocations.170

Ключевой rewrite:
- b2.collocations.170 — «I did a mistake» / «powerful coffee» (не make a decision — то .166)

Каталог: 584. Класс 5 / past_simple.006 — не трогали.

pending stubs НЕ в lookup/GOLDEN_PATH.
Заметка F6: faqId из F3 re-touch есть и в старой wave, и в wave10 — дедуп по faqId, приоритет wave10.

## Что осталось

F3 закрыт как residual-pass (не ~75: untouched non-idle было 2).
F4 карта дублей по EN-кавычкам (~17 групп); id НЕ сливать.
F5 gate: idle+pending approved + фраза «можно генерировать Explain».
F6 generate via tutor-explain → LocalExplainPack → wire lookup только с answer
   (matchQueries: новый+старый; wave1…wave10 stubs; дедуп faqId).
F7 userQ→faq_id — НЕ начинать.

Процесс:
1) Таблица id|было|предлагаю — БЕЗ кода до OK.
2) После OK — questionRu + aliases + stub.
3) Explain — только по явной фразе.

Первая команда новому чату:
Начни F4: карта дублей по EN-кавычкам (~17 групп);
таблица групп id|EN|уровни — БЕЗ слияния id; без OK код не писать.
Следуй docs/tutor/faq-questionru-rewrite-guide.md.
COPY END
```

## Smoke (человек)

1. Match: «I did a mistake» / powerful coffee → collocations.170 новая формулировка.
2. «В чём разница I work every day» / старые Почему* в aliases всё ещё match.
3. Каталог 584; wave10 = 12 pending.
