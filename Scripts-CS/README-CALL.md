# Звонок — локальный запуск

## В чём была проблема

Ошибка **«Country, region, or territory not supported»** — это не «ключ не вставлен», а **геоблокировка OpenAI** из вашего региона.  
В **my-eng-bot** запросы идут через **прокси** (`HTTPS_PROXY`). В Scripts CS прокси изначально не был подключён — это исправлено.

## Что нужно сделать вам (2 минуты)

### 1. Файл `.env.local` в папке проекта

Путь: `C:\dev\Cursor\Scripts-CS\.env.local`

Скопируйте из `C:\dev\Cursor\my-eng-bot\.env.local` строки **OPENAI_API_KEY** и **HTTPS_PROXY** / **HTTP_PROXY**, либо вставьте вручную:

```env
OPENAI_API_KEY=ваш_ключ_openai
HTTPS_PROXY=http://127.0.0.1:10801
HTTP_PROXY=http://127.0.0.1:10801
```

Порт `10801` — как в my-eng-bot. Если у вас другой прокси — подставьте свой адрес.

Шаблон: `.env.example` в корне проекта.

### 2. Запуск (без vercel, проще)

В терминале:

```powershell
cd "C:\dev\Cursor\Scripts-CS"
npm install
npm run dev
```

Откройте в браузере: **http://localhost:3000/** → вкладка **«Звонок»** → **«Перейти к звонку»** → зелёная кнопка.

### 3. Проверка прокси и ключа (по желанию)

```powershell
npm run verify:proxy
```

Должно быть: `OK: proxy reachability verified` (не 403 и не geo-block).

## Что НЕ нужно делать

- Не обязательно `vercel dev` — он у вас мог зависать на сборке yarn.
- Ключ в код не вставляют — только в `.env.local` (файл в `.gitignore`).

## Если снова «Country…»

1. Прокси/VPN включён (тот же, что для my-eng-bot).
2. В `.env.local` есть `HTTPS_PROXY=...`.
3. После правки `.env.local` — **остановите** сервер (Ctrl+C) и снова `npm run dev`.
