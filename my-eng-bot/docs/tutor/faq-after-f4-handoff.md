# FAQ after F4 — handoff (в следующий чат)

Скопируй блок **COPY FROM HERE … COPY END** в новый чат в `my-eng-bot`.

Правила chip: [faq-questionru-rewrite-guide.md](./faq-questionru-rewrite-guide.md)

---

```text
COPY FROM HERE
=== Engvo FAQ handoff (после F4 дубли EN) ===

Контекст: my-eng-bot, tutor localFaq + localExplain stubs.
НЕ архив. НЕ Supabase FAQ. НЕ F7.
Data = SoT; НЕ generateLocalFaq.mjs.
Explain — только после «можно генерировать Explain».

Модель: id стабильный (не сливать); questionRu = display; aliases = старые.
Правила: docs/tutor/faq-questionru-rewrite-guide.md

## Уже СДЕЛАНО

wave1…10: F1–F3 как раньше.
F3: 12 residual — wave10.ts
F4: карта 17 групп; чинили 1–8 (11 rewrite); 9–17 KEEP.
  wave11.ts (11 pending). Id не сливали — развели chip по уровню/углу.

Пары (оба id живы):
- some/any: a1.099 ↔ a2.042
- How much/many: a1.100 ↔ a2.043
- a little/a few: a1.101 ↔ a2.040
- remember locking: a2.059 Чем ↔ b1.057 Когда
- suggested going: a2.105 KEEP ↔ b1.112 + that we go
- According to me: b1.115 KEEP ↔ b1.166 «почти всегда» ↔ b2.104 «в тексте / From my point of view»
- yesterday: a2.mistakes.103 KEEP ↔ a2.past_simple.009 + Present Perfect

Каталог: 584.
pending НЕ в lookup/GOLDEN_PATH.
F6: дедуп faqId, приоритет более новой wave (10/11).

## Что осталось

F4 закрыт (9–17 не трогали).
F5 gate: idle+pending approved + фраза «можно генерировать Explain».
F6 generate via tutor-explain → LocalExplainPack → wire lookup только с answer
   (matchQueries новый+старый; wave1…wave11; дедуп faqId).
F7 userQ→faq_id — НЕ начинать.

Процесс:
1) Таблица — БЕЗ кода до OK.
2) После OK — questionRu + aliases + stub.
3) Explain — только по явной фразе.

Первая команда новому чату:
Начни F5: gate перед Explain — сверка idleEligible + pending stubs wave1…11;
чеклист что approved; БЕЗ генерации Explain до фразы «можно генерировать Explain».
COPY END
```

## Smoke (человек)

1. A1/A2 some·any / How much / a little — разные chip, старые в aliases match.
2. b1.115 vs b2.104 According — разные.
3. Каталог 584; wave11 = 11 pending.
