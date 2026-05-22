/**
 * Локальный сервер без vercel dev: статика + API для звонка.
 * Запуск: node scripts/local-dev.js
 * Перед запуском заполните .env.local (OPENAI_API_KEY и HTTPS_PROXY).
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');

const ROOT = path.join(__dirname, '..');
const FRONTEND = path.join(ROOT, 'frontend');
const PORT = Number(process.env.PORT) || 3000;

function loadEnvLocal() {
  const filePath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

const API_ROUTES = {
  '/api/realtime-session/sdp': '../api/realtime-session/sdp.js',
  '/api/realtime/transcription': '../api/realtime/transcription.js',
  '/api/call-base-instructions': '../api/call-base-instructions.js',
  '/api/call-resolve-process': '../api/call-resolve-process.js',
  '/api/call-explain-reply': '../api/call-explain-reply.js',
  '/api/assistant-coach': '../api/assistant-coach.js',
};

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
  };
  return map[ext] || 'application/octet-stream';
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function createRes(nativeRes) {
  let statusCode = 200;
  const headers = {};
  return {
    status(code) {
      statusCode = code;
      return this;
    },
    setHeader(name, value) {
      headers[name] = value;
      return this;
    },
    json(data) {
      headers['Content-Type'] = 'application/json; charset=utf-8';
      const body = JSON.stringify(data);
      nativeRes.writeHead(statusCode, headers);
      nativeRes.end(body);
    },
    end(body) {
      nativeRes.writeHead(statusCode, headers);
      nativeRes.end(body);
    },
  };
}

function invalidateCallModules() {
  const apiDir = path.join(ROOT, 'api') + path.sep;
  const callLibDir = path.join(ROOT, 'lib', 'call') + path.sep;
  for (const cacheKey of Object.keys(require.cache)) {
    if (cacheKey.startsWith(apiDir) || cacheKey.startsWith(callLibDir)) {
      delete require.cache[cacheKey];
    }
  }
}

async function handleApi(req, res, pathname) {
  const rel = API_ROUTES[pathname];
  if (!rel) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  const handlerPath = path.join(__dirname, rel);
  invalidateCallModules();
  const handler = require(handlerPath);
  const raw = await readBody(req);
  let body = {};
  if (raw.length) {
    try {
      body = JSON.parse(raw.toString('utf8'));
    } catch {
      body = {};
    }
  }

  const vercelReq = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body,
  };
  const vercelRes = createRes(res);
  await handler(vercelReq, vercelRes);
}

function serveStatic(req, res, pathname) {
  let rel = pathname === '/' ? '/index.html' : pathname;
  if (rel.startsWith('/data/')) {
    rel = rel.replace('/data/', '/data/');
  }
  const filePath = path.join(FRONTEND, rel.replace(/^\//, '').split('/').join(path.sep));
  if (!filePath.startsWith(FRONTEND) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': contentType(filePath) });
  fs.createReadStream(filePath).pipe(res);
}

async function main() {
  loadEnvLocal();
  require(path.join(__dirname, 'copy-data.js'));

  const hasKey = Boolean((process.env.OPENAI_API_KEY || '').trim());
  const hasProxy = Boolean(
    process.env.HTTPS_PROXY ||
      process.env.HTTP_PROXY ||
      process.env.https_proxy ||
      process.env.http_proxy
  );

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
      const pathname = url.pathname;

      if (pathname.startsWith('/api/')) {
        await handleApi(req, res, pathname);
        return;
      }
      serveStatic(req, res, pathname);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'Server error' }));
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error('');
      console.error(`Порт ${PORT} уже занят — вероятно, старый локальный сервер без /api/assistant-coach.`);
      console.error('Остановите его (Ctrl+C в том терминале) или завершите процесс:');
      console.error(`  netstat -ano | findstr :${PORT}`);
      console.error('Затем снова: npm run dev');
      console.error('');
      process.exit(1);
    }
    throw err;
  });

  server.listen(PORT, () => {
    console.log('');
    console.log('Scripts CS — локальный сервер');
    console.log(`  Сайт:    http://localhost:${PORT}/`);
    console.log(`  Звонок:  http://localhost:${PORT}/  → вкладка «Звонок»`);
    console.log(`  Коуч:    POST http://localhost:${PORT}/api/assistant-coach`);
    console.log('');
    console.log(`  OPENAI_API_KEY: ${hasKey ? 'задан' : 'НЕ ЗАДАН — добавьте в .env.local'}`);
    console.log(`  HTTPS_PROXY:    ${hasProxy ? 'задан' : 'не задан (нужен как в my-eng-bot, если geo-block)'}`);
    console.log('');
    console.log('Остановка: Ctrl+C');
    console.log('');
  });
}

main();
