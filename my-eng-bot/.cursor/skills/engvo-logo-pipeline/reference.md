# Engvo Logo Script Reference

Скрипт: `scripts/engvo_logo.py`

## Зависимости

- Python 3
- Pillow (`pip install pillow`)

## Переменные

| Переменная | По умолчанию |
|------------|--------------|
| `ENGVO_ASSETS` | `C:/Users/serk/.cursor/projects/c-dev-Cursor-my-eng-bot/assets` |

## Команды

### `measure`

Печатает bbox букв n/g/v, столбцов EQ, ширины и рекомендуемый `col_w = min(...)`.

```powershell
python .cursor/skills/engvo-logo-pipeline/scripts/engvo_logo.py measure
python .cursor/skills/engvo-logo-pipeline/scripts/engvo_logo.py measure --input engvo-logo-square.png
```

### `eqletters`

Перерисовывает столбцы на square 652 по правилу min(n,g,v). Вертикальная геометрия сохраняется.

```powershell
python .cursor/skills/engvo-logo-pipeline/scripts/engvo_logo.py eqletters --input engvo-logo-square.png --output engvo-logo-square-eqletters.png
```

### `upscale`

+5% (или `--scale`) всего белого знака. Новый файл, исходник не меняется.

```powershell
python .cursor/skills/engvo-logo-pipeline/scripts/engvo_logo.py upscale --input engvo-logo-square-eqletters.png --suffix plus5-eqletters
```

Создаёт: `engvo-logo-square-plus5-eqletters.png` (имя строится из stem + suffix).

### `export-1024`

LANCZOS resize до 1024×1024.

```powershell
python .cursor/skills/engvo-logo-pipeline/scripts/engvo_logo.py export-1024 --input engvo-logo-square-eqletters.png --output engvo-logo-1024-eqletters.png
```

### `pipeline-eqletters`

Полный цикл от `engvo-logo-square.png`:

1. `engvo-logo-square-eqletters.png`
2. `engvo-logo-square-plus5-eqletters.png`
3. `engvo-logo-1024-plus5-eqletters.png`

Не изменяет `engvo-logo-square.png` и `engvo-logo-square-plus5.png`.

### `verify`

Техническая проверка: размер, mode, alpha, sha256 опционально.

```powershell
python .cursor/skills/engvo-logo-pipeline/scripts/engvo_logo.py verify --input engvo-logo-1024-eqletters.png
```

## Константы геометрии (652, эталон)

При смене композиции — пересчитать через `measure`, не полагаться слепо:

| Элемент | Значение |
|---------|----------|
| ROI EQ | y ≈ 166–250, x ≈ 236–422 |
| col_w | min ширин n,g,v (54) |
| gap между столбцами | 5px |
| radius блоков | 4px (8× supersample) |
| отступ пузыря L/R | 106px |

## Масштаб 652 → 1024

Коэффициент ≈ `1.57055`. Ожидаемая ширина столбца на 1024 после plus5: ~56–57px из-за антиалиасинга — это нормально, если все три столбца одинаковы.
