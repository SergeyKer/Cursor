# FAQ after idle wave2 — handoff (в следующий чат)

Скопируй блок **COPY FROM HERE … COPY END** в новый чат в `my-eng-bot`.

---

```text
COPY FROM HERE
=== Engvo FAQ handoff (после idle wave2) ===

Контекст: my-eng-bot, tutor localFaq + localExplain stubs.
НЕ архив файлов. НЕ проектировать Supabase FAQ. НЕ F7.

Модель эталона (одна запись FAQ):
- id = стабильный ключ (не сливать)
- questionRu = единственный display-эталон (TutorIdleMenu / MyPlan prefill)
- aliases = старые формулировки для match
- normalizeFaqText + matchLocalFaq (exact/alias/needle; без fuzzy)
- Data-файлы = SoT; НЕ запускать scripts/generateLocalFaq.mjs

## Уже СДЕЛАНО

### Волна 1+1b (31 mistake → «Почему «правильно», а не «ошибка»?»)
Закрытые id — не трогать:
a1.mistakes.131–140,
a2.mistakes.103–105,
b1.mistakes.111–114,116–119,
b1.common_errors_still_made_at_b1.161,162,167–170,
b2.mistakes.099,101–103
Live Explain: только a1.mistakes.131 → gp-mistakes-age-be (saved).
Очередь: lib/tutor/localExplain/explainPackQueue.wave1.ts (30 pending + 1 saved).

### Idle wave2 (этот чат) — 75 переписок
Батчи:
- A (17): vs/≠ → «Чем A отличается от B?» / «Когда A, когда B?»
- B (7): предлоги → «Почему правильно говорить с предлогом: …?»
  исключение: b1.prepositions.089 → «Когда «angry with someone», а когда «angry about something»?»
- C (51): F2 голый Почему → «Что значит…?» + точечные C2
  b1.relative_clauses.053 → «Почему после запятой «who/which», а не «that»: «My brother, who…»?»
KEEP без правки (уже ок): a1.articles.016/017/018, a1.modals.085, a2.articles.150;
плюс ~22 idle с эталоном wave1 «A, а не B».

Файлы:
- lib/tutor/localFaq/data/a1.ts | a2.ts | b1_nuance.ts | b2_gems.ts
- lib/tutor/localExplain/explainPackQueue.wave2.ts — 75 stubs, все status: pending
- lib/tutor/localExplain/explainPackQueue.wave2.test.ts
Правило: pending НЕ в lookup/GOLDEN_PATH; только saved с полным answer.

Закрытые id idle wave2 (75) — не переписывать снова без причины:
a1.еще_полезные_микро_вопросы_a1.141, a1.еще_полезные_микро_вопросы_a1.142,
a1.articles.019, a1.have_got.093, a1.have_got.094, a1.have_got.095, a1.have_got.096,
a1.modals.086, a1.modals.087, a1.present_continuous.041,
a1.present_simple.030, a1.present_simple.031, a1.present_simple.032, a1.to_be.004,
a2.articles.147, a2.articles.148, a2.articles.149,
a2.conditionals.060, a2.conditionals.061, a2.conditionals.062, a2.conditionals.063,
a2.gerunds_infinitives.054–057, a2.mistakes.106,
a2.modals.046–049, a2.prepositions.094–097,
a2.present_perfect.015–018, a2.used_to.064–067,
a2.word_order.099, a2.word_order.102, a2.word_order.153,
b1.articles.081, b1.articles.083, b1.articles.084, b1.articles.085,
b1.conditionals.021–024, b1.gerunds_infinitives.057–060,
b1.modals.030–033, b1.past_simple.001, b1.past_simple.004,
b1.prepositions.087–090, b1.present_perfect_continuous.009,
b1.relative_clauses.053,
b2.modals.014–016, b2.verb_patterns.065–067

Каталог всего: 583 FAQ; idleEligible ~119; done_wave1=31; idle wave2=75.

## Регрессия (не ломать)
- FAQ questionRu → TutorIdleMenu (над composer), idle footer chips=[].
- MyPlan selectTutorTask → questionRu в reasonLine/prefill.
- НЕ трогать LessonChoiceChips, practice, lesson, AppShell, generateLocalFaq.mjs без задачи.
- pickIdleFaq: только idleEligible && (grammar|contrast) — phrase в idle НЕ попадает.
- Контраст EN в micro/golden не путать с RU chip label.

## Что осталось (следующий чат)

Цифры: ~451 non-idle ещё без wave2-правки; не все требуют rewrite.

Очередь:
F1 phrase / functional (idleEligible false, genre phrase) — таблица → OK → правка + stub.
F2 grammar-meaning остаток non-idle (голый Почему / ложный Почему).
F3 vs/коллокации/мета non-idle; класс 5 residual:
  b1.common_errors_still_made_at_b1.163–165, b1.mistakes.115,
  b2.mistakes.104, b2.mistakes.106 («неестественно»/«избыточно»/«часто лишнее»).
F4 карта дублей по EN-кавычкам (~17 групп); id НЕ сливать.
F5 gate: idle+pending approved + фраза человека «можно генерировать Explain».
F6 generate via tutor-explain recipe → LocalExplainPack → wire lookup только с answer
     (обновить matchQueries: новый + старый; wave1+wave2 stubs).
F7 userQ→faq_id — НЕ начинать.

Процесс (как в idle wave2):
1) Сначала таблица id|было|предлагаю|класс — БЕЗ кода до OK.
2) После OK — questionRu + старый в aliases + stub pending
   (дописывать в explainPackQueue.wave2.ts или новый wave3 — не ломать wave1).
3) Explain — ТОЛЬКО после явной фразы «можно генерировать Explain».

Таксономия формулировок:
1) Голый «Почему «фраза»?» → Как спросить / Когда говорят / Что значит (НЕ «а не»)
2) Ложный Почему у грамматики → Что значит / форма=смысл
3) vs/≠ → Чем A отличается / Когда A, когда B
4) Коллокации → «Почему правильно говорить с предлогом: …» или Когда A, а когда B
5) Мета без примера → пример или idleEligible false
6) Дубли уровней → карта; id не сливать

Шаблоны, уже выверенные в idle wave2 (использовать):
- vs → Чем «A» отличается от «B»?
- ≠ → Когда «A», когда «B»? / Когда «A», а когда «B»?
- списки предлогов → Почему правильно говорить с предлогом: «…», «…»?
- голый Почему «форма»? → Что значит «…»?
- jargon non-defining → детский пример с запятой (см. 053)

Первая команда новому чату:
Начни F1 non-idle phrase: инвентаризация genre=phrase + functional idleEligible=false;
таблица предложений; режим Plan/Ask; правки не применять без OK.
COPY END
```

## Smoke (человек, после idle wave2)

1. Tutor idle: 3 примера с новыми формулировками + composer снизу.
2. Клик → тред с новым questionRu.
3. MyPlan «Спросить Репетитора» — prefill = эталон.
4. Practice/lesson choice chips — не связаны, не ломались.
