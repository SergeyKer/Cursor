# FAQ after F2 — handoff (в следующий чат)

Скопируй блок **COPY FROM HERE … COPY END** в новый чат в `my-eng-bot`.

Правила chip: [faq-questionru-rewrite-guide.md](./faq-questionru-rewrite-guide.md)

---

```text
COPY FROM HERE
=== Engvo FAQ handoff (после F2 grammar-meaning) ===

Контекст: my-eng-bot, tutor localFaq + localExplain stubs.
НЕ архив. НЕ Supabase FAQ. НЕ F7.
Data = SoT; НЕ generateLocalFaq.mjs.
Explain — только после «можно генерировать Explain».

Модель: id стабильный (не сливать); questionRu = display; aliases = старые.
Правила формулировок: docs/tutor/faq-questionru-rewrite-guide.md
  EN обязателен; anti-spoiler; ситуация→форма; не BrE/AmE; не amn’t в chip.

## Уже СДЕЛАНО

wave1: 31 mistake — wave1.ts
idle wave2: 75 — wave2.ts
F1 phrase wave3: 46 — wave3.ts
F2 Round1 micro phrase: 48 — wave4.ts (genre→phrase)
F2 Round2 A1 grammar: 75 — wave5.ts
F2 Round3 A1+A2: 75 — wave6.ts
F2 Round4 A2+B1: 75 (+ BrE fix micro.162, articles.025) — wave7.ts
F2 Round5 B1: 75 — wave8.ts
F2 Round6 B1+B2: 54 rewrite + KEEP past_simple.006 + NEW past_simple.007 — wave9.ts (56 stubs)

Каталог: 584 FAQ (+1 new: b1.past_simple.007).
Rewrite/закрыто по очередям: wave1…9 ≈ 556 stub/faq touches; F2 «голый Почему» non-idle grammar|contrast — закрыт.

Ключевые новые:
- b1.past_simple.003 — опыт been to vs конкретная поездка (popularity 92)
- b1.past_simple.007 — today/this week/this month/this year vs точная дата
- b1.past_simple.005 — I’ve known… а не I’ve been knowing…
- b1.past_simple.006 — KEEP оригинал (BrE just/already/yet)

pending stubs НЕ в lookup/GOLDEN_PATH.

## Что осталось

F3 vs/коллокации/мета non-idle residual (класс 5 уже частично тронут в F2):
  ещё смотреть формулировки без ситуации / жёсткие vs;
  b1/b2 mistakes «неестественно»/«избыточно» — уже переписаны в F2 R5/R6, не дублировать без причины.
F4 карта дублей по EN-кавычкам (~17 групп); id НЕ сливать.
F5 gate: idle+pending approved + фраза «можно генерировать Explain».
F6 generate via tutor-explain → LocalExplainPack → wire lookup только с answer
   (matchQueries: новый+старый; wave1…wave9 stubs).
F7 userQ→faq_id — НЕ начинать.

Процесс:
1) Таблица id|было|предлагаю — БЕЗ кода до OK.
2) После OK — questionRu + aliases + stub (wave10+).
3) Explain — только по явной фразе.

Первая команда новому чату:
Начни F3: инвентаризация non-idle vs/коллокации/мета, ещё не закрытые волнами 1–9;
таблица батчами (~75) → OK → правка + stub; без OK код не писать.
Следуй docs/tutor/faq-questionru-rewrite-guide.md (ситуация→форма).
COPY END
```

## Smoke (человек)

1. MyPlan / match: «I’ve been to Japan» / this week → новые формулировки.
2. Старые Почему* в aliases всё ещё match.
3. Каталог 584; wave9 56 pending.
