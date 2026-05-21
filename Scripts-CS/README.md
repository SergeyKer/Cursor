# Процессы Клиентского сервиса

Веб-приложение со списком процессов, поиском по меню и детальными карточками (описание, этапы, скрипты, шаблоны писем).

## Структура

- **frontend/** — статический сайт: `index.html`, `styles.css`, `app.js`.
- **data/** — JSON с процессами и метаданными (`processes.json`, `processes_meta.json`, `communication_tools.json` и др.).

### Маркер обработанных пунктов меню

В `processes_meta.json` у каждого процесса есть поле **`menu_done`**:
- `false` или отсутствует — пункт ещё не приведён в соответствие со скриншотами; его можно править.
- `true` — пункт обработан; **не менять** название и блок при правках по скриншотам. В меню в конце строки показывается зелёная галочка ✓.

Когда вы говорите, что пункт обработан, в данных выставляется `menu_done: true` (в `data/` и `frontend/data/`), после чего изменения по этому пункту не вносятся.

Для деплоя на Vercel используется корень репозитория; при сборке папка `data/` копируется в `frontend/`, чтобы запросы к `/data/` работали.

## Локальный запуск

Через HTTP (чтобы работала загрузка JSON):

- Открой папку в терминале и запусти любой простой сервер, например:
  - `python -m http.server 8000` или
  - `npx serve .`
- Открой в браузере: для корня репозитория — `http://localhost:8000/frontend/`, либо укажи корень как корень сервера и открой `http://localhost:8000/`.

## Деплой на Vercel

Монорепозиторий: [github.com/SergeyKer/Cursor](https://github.com/SergeyKer/Cursor).

1. **Add New → Project** → импорт репозитория, либо ссылка с корнем:  
   [Import scripts-cs](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSergeyKer%2FCursor&root-directory=Scripts-CS)
2. **Root Directory:** `Scripts-CS` (обязательно; старое имя `Scripts CS` больше не существует).
3. Сборка и выход задаются в `vercel.json`: `node scripts/copy-data.js`, output `frontend`.
4. **Deploy**. Production URL: `https://scripts-cs-sergeys-projects-8f5f4f29.vercel.app` (или ваш домен).

Если деплой падает с «Root Directory Scripts CS does not exist» — в **Project Settings → General → Root Directory** укажите `Scripts-CS` и сделайте **Redeploy**.

## Git — как не терять изменения

- **Сохранять снимки:**  
  `git add .` → `git commit -m "краткое описание"` → `git push`
- **Перед началом работы:**  
  `git pull`
- **История:**  
  `git log --oneline`
- **Вернуть файл к последнему коммиту:**  
  `git restore путь/к/файлу`
- **Откатить все правки в файлах:**  
  `git restore .`

Регулярные коммиты и пуш в GitHub защищают от потери правок и дают возможность откатиться к любой версии.
