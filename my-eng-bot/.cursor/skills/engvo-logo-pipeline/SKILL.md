---
name: engvo-logo-pipeline
description: Создание и экспорт логотипов Engvo (square 652, plus5, 1024, выравнивание эквалайзера по буквам n/g/v). Использовать при работе с engvo-logo, логотипом Engvo, assets PNG, апскейлом знака, eqletters, plus5/plus10, экспортом 1024.
---

# Engvo Logo Pipeline

## Когда применять

- Правка/экспорт `engvo-logo-*.png`
- Выравнивание эквалайзера, масштаб знака (+5% / +10%), экспорт 1024
- Любая задача «сделай новую версию логотипа без перезаписи старых»

## Папка ассетов

По умолчанию:

```
C:/Users/serk/.cursor/projects/c-dev-Cursor-my-eng-bot/assets/
```

Переопределение: переменная окружения `ENGVO_ASSETS`.

На Windows запускать Python через PowerShell here-string:

```powershell
@'
# python code
'@ | python -
```

Не использовать bash heredoc `<<'EOF'`.

## Золотое правило (критично)

**Геометрию эквалайзера править только на square 652×652.**  
Никогда не перерисовывать столбцы на уже апскейленных `plus5` / `1024` — линии станут резче текста.

Порядок:

```
square (652) → [опц. правка EQ] → [опц. +5% знака] → 1024 через LANCZOS
```

## Имена файлов

| Суффикс | Значение |
|---------|----------|
| *(без)* | Базовый мастер `652×652` |
| `-plus5` | Белый знак увеличен ~5% от предыдущей базы |
| `-plus10` | Ещё +5% от `plus5` |
| `-eqletters` | Столбцы EQ по ширине букв (min n/g/v) |
| `-tailsoft` | Смягчённый хвост пузыря (~2px) |

Примеры рекомендуемых финалов:

- `engvo-logo-square-eqletters.png` — эталон с выровненным EQ
- `engvo-logo-square-plus5-eqletters.png` — иконка +5%
- `engvo-logo-1024-plus5-eqletters.png` — 1024 с +5%
- `engvo-logo-1024-eqletters.png` — 1024 без +5%, только LANCZOS

**Не перезаписывать** существующие файлы без явной просьбы — создавать новые копии с суффиксом.

## Быстрые команды

Из корня проекта (`my-eng-bot`), при установленном Pillow:

```powershell
python .cursor/skills/engvo-logo-pipeline/scripts/engvo_logo.py measure
python .cursor/skills/engvo-logo-pipeline/scripts/engvo_logo.py upscale --input engvo-logo-square-eqletters.png --suffix plus5-eqletters --scale 1.05
python .cursor/skills/engvo-logo-pipeline/scripts/engvo_logo.py export-1024 --input engvo-logo-square-eqletters.png --output engvo-logo-1024-eqletters.png
python .cursor/skills/engvo-logo-pipeline/scripts/engvo_logo.py eqletters --input engvo-logo-square.png --output engvo-logo-square-eqletters.png
python .cursor/skills/engvo-logo-pipeline/scripts/engvo_logo.py pipeline-eqletters
```

`pipeline-eqletters` — полный цикл: eqletters square → plus5 → 1024 (новые файлы, старые не трогает).

## Workflow: выравнивание EQ по буквам

1. **Измерить** bbox букв `n`, `g`, `v` и текущих столбцов на `652×652`
2. **Ширина столбца** = `min(width_n, width_g, width_v)` (эталон: **54px** при n=54, g=58, v=57)
3. **Позиции** (эталонные координаты на 652):
   - левый: выровнять по `n` (x ≈ 237–290)
   - центр: центр под `g` (x ≈ 302–355)
   - правый: центр под `v` (x ≈ 369–422)
4. **Перерисовать** только ROI эквалайзера: очистка локальным синим градиентом (linear fit), rounded rects с 8× supersampling
5. **Проверить**: нет белых пикселей вне новых блоков; вертикальные зазоры и нижнее выравнивание колонок не менять
6. Сохранить `*-eqletters.png`
7. **Апскейл +5%** всего белого знака (не маской!) → `*-plus5-eqletters.png`
8. **1024** — только `Image.LANCZOS` от нужного square

## Workflow: апскейл знака (+5% / +10%)

Масштабировать **весь белый знак** (пузырь + текст + EQ) как единую группу:

1. Bounding box всех белых пикселей
2. Вырезать RGB-фрагмент с мягкими краями (не пороговая маска)
3. Очистить старую область: локальный синий градиент (plane fit по не-белым пикселям), feather на вставке
4. Вставить масштабированный фрагмент по центру bbox
5. Холст **652×652**, `RGB`, без альфа
6. Для 1024 — LANCZOS от square-результата

База для `plus10`: `engvo-logo-square-plus5.png` → новые `*-plus10.png`.

## Workflow: экспорт 1024

```python
Image.open(src).resize((1024, 1024), Image.LANCZOS).save(dst, "PNG")
```

Без перерисовки слоёв. Источник — уже готовый square (с нужным суффиксом).

## Workflow: квадрат из исходника с шахматкой

1. Найти bbox синего блока, обрезать до квадрата
2. Залить углы синим градиентом (не оставлять прозрачность)
3. Белый знак — отдельные connected components, не трогать текст/EQ при сдвиге только пузыря
4. Отступы пузыря L/R должны быть равны (эталон: **106px** на 652)

## Чеклист проверки

```
- [ ] mode=RGB, has_alpha=False
- [ ] размер 652×652 или 1024×1024
- [ ] исходники (watch list) не изменились — sha256 до/после
- [ ] отступы пузыря L/R ≈ равны (допуск ~1px)
- [ ] EQ: равные горизонтальные зазоры, нижние края колонок на одной линии
- [ ] нет белых ореолов / синих прямоугольных заплаток
- [ ] края знака мягкие, не «ступенчатые»
```

## Антипаттерны

| Нельзя | Почему |
|--------|--------|
| Рисовать EQ на 1024/plus5 | Резкие линии vs мягкий текст |
| Пороговая маска для апскейла | Ступеньки на контуре |
| Плоская синяя заливка под знаком | Пятно на градиентном фоне |
| Перезапись без суффикса | Потеря рабочих версий |
| Правка только одной колонки пиксельным сдвигом | Неравные зазоры |

## Дополнительно

Детали API скрипта: [reference.md](reference.md)
