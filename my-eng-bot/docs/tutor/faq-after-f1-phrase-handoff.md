# FAQ after F1 phrase — handoff (в следующий чат)

Скопируй блок **COPY FROM HERE … COPY END** в новый чат в `my-eng-bot`.

---

```text
COPY FROM HERE
=== Engvo FAQ handoff (после F1 phrase wave3) ===

Контекст: my-eng-bot, tutor localFaq + localExplain stubs.
НЕ архив файлов. НЕ проектировать Supabase FAQ. НЕ F7.

Модель эталона (одна запись FAQ):
- id = стабильный ключ (не сливать)
- questionRu = единственный display-эталон (TutorIdleMenu / MyPlan prefill)
- aliases = старые формулировки для match
- normalizeFaqText + matchLocalFaq (exact/alias/needle; без fuzzy)
- Data-файлы = SoT; НЕ запускать scripts/generateLocalFaq.mjs

## Уже СДЕЛАНО

### Волна 1+1b (31 mistake)
Закрытые id — не трогать:
a1.mistakes.131–140, a2.mistakes.103–105,
b1.mistakes.111–114,116–119,
b1.common_errors_still_made_at_b1.161,162,167–170,
b2.mistakes.099,101–103
Live Explain: a1.mistakes.131 → gp-mistakes-age-be (saved).
Очередь: explainPackQueue.wave1.ts (30 pending + 1 saved).

### Idle wave2 (75)
Файлы: data/* + explainPackQueue.wave2.ts (75 pending).
Закрытые id — см. docs/tutor/faq-after-idle-wave2-handoff.md (не переписывать без причины).

### F1 phrase / functional wave3 (этот чат) — 46
Батчи:
- A (18): A1 micro 173/174/185–189/191 + A1 functional 116–125
  * genre→phrase для mistag: 117,118,119,122,123,124,125
  * MyPlan canon functional A1: было ≈117, стало ≈116 (принятый побочный эффект)
- B (13): A2 functional 113–125
- C (11): A2 functional 161–170 + a2.word_order.196
- D (4): B2 functional 161–164; 161 = D1 «Когда «It’s not bad» значит «очень хорошо»?»

Файлы:
- lib/tutor/localFaq/data/a1.ts | a2.ts | b2_gems.ts
- lib/tutor/localExplain/explainPackQueue.wave3.ts — 46 stubs, все status: pending
- lib/tutor/localExplain/explainPackQueue.wave3.test.ts
Правило: pending НЕ в lookup/GOLDEN_PATH; только saved с полным answer.

Закрытые id F1 (46) — не переписывать снова без причины:
a1.еще_полезные_микро_вопросы_a1.173,174,185,186,187,188,189,191,
a1.functional.116–125,
a2.functional.113–125, a2.functional.161–170, a2.word_order.196,
b2.functional.161–164

Каталог: 583 FAQ; idleEligible=119.
Сделано rewrite: wave1=31 + wave2=75 + F1=46 → 152 id.
Без этой правки осталось: 583−152 = 431 (не все требуют rewrite).
Non-idle без F1/wave2-правки (оценка handoff): было ~451, минус F1 46 → ~405.

## Регрессия (не ломать)
- FAQ questionRu → TutorIdleMenu (над composer), idle footer chips=[].
- MyPlan selectTutorTask → questionRu в reasonLine/prefill.
- НЕ трогать LessonChoiceChips, practice, lesson, AppShell, generateLocalFaq.mjs без задачи.
- pickIdleFaq: только idleEligible && (grammar|contrast) — phrase в idle НЕ попадает.
- Контраст EN в micro/golden не путать с RU chip label.

## Что осталось (следующий чат)

Цифры: ~405 non-idle ещё без rewrite этой волны; не все требуют правки.
Остаток каталога без wave1/2/F1: 431.

Очередь:
F2 grammar-meaning остаток non-idle (голый Почему / ложный Почему).
  В т.ч. a1 micro grammar-tagged 175–184,190,192+ (не в F1: genre≠phrase).
F3 vs/коллокации/мета non-idle; класс 5 residual:
  b1.common_errors_still_made_at_b1.163–165, b1.mistakes.115,
  b2.mistakes.104, b2.mistakes.106 («неестественно»/«избыточно»/«часто лишнее»).
F4 карта дублей по EN-кавычкам (~17 групп); id НЕ сливать.
F5 gate: idle+pending approved + фраза человека «можно генерировать Explain».
F6 generate via tutor-explain recipe → LocalExplainPack → wire lookup только с answer
     (matchQueries: новый + старый; wave1+wave2+wave3 stubs).
F7 userQ→faq_id — НЕ начинать.

Процесс (как в F1 / idle wave2):
1) Сначала таблица id|было|предлагаю|класс — БЕЗ кода до OK.
2) После OK — questionRu + старый в aliases + stub pending
   (новый wave4 или дописать wave3 — не ломать wave1/wave2).
3) Explain — ТОЛЬКО после явной фразы «можно генерировать Explain».

Таксономия формулировок:
1) Голый «Почему «фраза»?» → Как спросить / Когда говорят / Что значит (НЕ «а не»)
2) Ложный Почему у грамматики → Что значит / форма=смысл
3) vs/≠ → Чем A отличается / Когда A, когда B
4) Коллокации → «Почему правильно говорить с предлогом: …» или Когда A, а когда B
5) Мета без примера → пример или idleEligible false
6) Дубли уровней → карта; id не сливать

Шаблоны (idle wave2 + F1):
- vs → Чем «A» отличается от «B»?
- ≠ → Когда «A», когда «B»? / Когда «A», а когда «B»?
- списки предлогов → Почему правильно говорить с предлогом: «…», «…»?
- голый Почему «форма»? → Что значит «…»?
- phrase ритуал → Когда говорят «…»?
- phrase просьба → Как спросить: «…»?
- jargon non-defining → детский пример с запятой (см. relative_clauses.053)

Первая команда новому чату:
Начни F2 non-idle grammar-meaning: инвентаризация голый/ложный Почему
(idleEligible false, genre grammar|contrast, ещё не wave1/wave2/F1);
таблица батчами → OK → правка + stub; режим Plan/Ask; без OK код не писать.
COPY END
```

## Smoke (человек, после F1)

1. MyPlan «Спросить Репетитора» по functional A1 — prefill может быть «Что значит «Nice to meet you»?» (canon 116).
2. Match старых формулировок phrase (aliases) всё ещё находит FAQ.
3. Tutor idle / practice / lesson chips — не связаны с phrase F1; не ломались.
