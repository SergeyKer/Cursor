# FAQ wave2+ handoff (после волны 1+1b)

Скопируй блок **COPY FROM HERE … COPY END** в новый чат в `my-eng-bot`.

---

```text
COPY FROM HERE
=== Engvo FAQ wave2+ handoff ===

Контекст проекта: my-eng-bot, tutor localFaq.
Волна 1+1b СДЕЛАНА: 31 mistake-чип переписаны в
«Почему «правильно», а не «ошибка»?».

Модель эталона (одна запись FAQ):
- id = стабильный ключ (будущий faq_id / дедуп)
- questionRu = единственный display-эталон
- aliases = старые/другие формулировки для match
- normalizeFaqText + matchLocalFaq (exact/alias/needle; без fuzzy)
НЕ архив файлов. НЕ проектировать Supabase FAQ в этой задаче.

Закрытые id (не трогать повторно):
a1.mistakes.131, a1.mistakes.132, a1.mistakes.133, a1.mistakes.134,
a1.mistakes.135, a1.mistakes.136, a1.mistakes.137, a1.mistakes.138,
a1.mistakes.139, a1.mistakes.140,
a2.mistakes.103, a2.mistakes.104, a2.mistakes.105,
b1.mistakes.111, b1.mistakes.112, b1.mistakes.113, b1.mistakes.114,
b1.mistakes.116, b1.mistakes.117, b1.mistakes.118, b1.mistakes.119,
b1.common_errors_still_made_at_b1.161, b1.common_errors_still_made_at_b1.162,
b1.common_errors_still_made_at_b1.167, b1.common_errors_still_made_at_b1.168,
b1.common_errors_still_made_at_b1.169, b1.common_errors_still_made_at_b1.170,
b2.mistakes.099, b2.mistakes.101, b2.mistakes.102, b2.mistakes.103

Итог волны 1+1b (файлы):
- lib/tutor/localFaq/data/a1.ts | a2.ts | b1_nuance.ts | b2_gems.ts — новые questionRu, старые в aliases
- lib/tutor/localExplain/explainPackStub.ts — тип очереди
- lib/tutor/localExplain/explainPackQueue.wave1.ts — 31 stub (30 pending, 131=saved)
- lib/tutor/localExplain/goldenPathPacks.ts — matchQueries для 131 обновлены (новый + старый)
- НЕ запускать scripts/generateLocalFaq.mjs — сотрёт выверенные questionRu
- Data-файлы = SoT для выверенных строк; English_Grammar_QA_*.txt — справочник до отдельной синхронизации

Очередь Explain stubs: lib/tutor/localExplain/explainPackQueue.wave1.ts
Тип: lib/tutor/localExplain/explainPackStub.ts
Правило: status pending НЕ в lookup/GOLDEN_PATH; только saved с полным answer.
Уже live: a1.mistakes.131 → gp-mistakes-age-be.

Регрессия (важно):
- FAQ questionRu рисуется в TutorIdleMenu (над composer), не в idle footer chips (chips=[]).
- MyPlan selectTutorTask показывает questionRu в reasonLine/prefill.
- НЕ трогать LessonChoiceChips, practice, lesson, AppShell, generateLocalFaq.mjs без задачи.
- Контраст EN в micro/golden (I have 20 years / I am 20 years old) — не путать с RU chip label.

Таксономия оставшихся формулировок:
1) Голый «Почему «фраза»?» → Как спросить / Когда говорят / Что значит (НЕ «а не»)
2) Ложный «Почему» у объяснительной грамматики → Что значит / почему форма = смысл
3) vs/≠ канцелярит → Чем A отличается от B / Когда A, когда B
4) Списки коллокаций → явный вопрос про предлог/выбор
5) Мета без примера → пример или idleEligible false
6) Дубли уровней (suggested / difficulty / explained…) → карта; id не сливать в этой фазе
   Вне волны 1b остались: «звучит неестественно», «избыточно», «часто лишнее» — класс в F0.

Будущий план (этот чат):
F0 инвентаризация id|level|genre|idleEligible|questionRu + класс 1–6; done_wave1 пометить.
F1 phrase (idle сначала) — таблица → моё OK → правка + stub.
F2 grammar-meaning.
F3 vs / коллокации / мета.
F4 карта дублей (id не сливать).
F5 gate: idle+pending approved + моя фраза «можно генерировать Explain».
F6 generate via tutor-explain recipe → LocalExplainPack → wire lookup только с answer.
F7 позже userQ → faq_id (не Supabase сейчас).

Задание этому чату:
1) F0: выгрузить все FAQ; пометить done_wave1; класс 1–6.
2) Сначала idleEligible. Таблица id|было|предлагаю|класс — БЕЗ правок кода, пока я не утвержу.
3) После OK — волны F1→F4 (phrase отдельно от grammar-meaning).
4) F5 gate, затем F6 только по фразе «можно генерировать Explain».
5) F7 не начинать.

Первая команда: начни F0, режим Plan/Ask, правки не применять.
COPY END
```

## Smoke после волны 1 (для человека)

1. Tutor idle: 3 примера + composer снизу — ввод не перекрыт.
2. Клик примера → тред с новым `questionRu`.
3. MyPlan «Спросить Репетитора» — prefill = эталон.
4. Practice/lesson choice chips — не связаны; не ломались.
