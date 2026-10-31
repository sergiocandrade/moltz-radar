import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;
const AUTH_API_URL = (process.env.AUTH_API_URL || 'http://0.0.0.0:5002').replace(/\/$/, '');

const app = express();
app.use(express.json({ limit: '1mb' }));

async function proxyApi(req, res) {
  res.set('Cache-Control', 'no-store');
  try {
    const response = await fetch(`${AUTH_API_URL}${req.originalUrl.slice('/api'.length)}`, {
      method: req.method,
      headers: {
       'Content-Type': 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
      ...(req.method === 'POST' ? { body: JSON.stringify(req.body) } : {}),
      signal: AbortSignal.timeout(10000),
      redirect: 'error',
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch {
    res.status(502).json({ detail: 'API indisponível. Tente novamente.' });
  }
}

app.post('/api/auth/sign-in', proxyApi);
app.post('/api/auth/sign-up', proxyApi);
app.post('/api/auth/reset-password', proxyApi);
app.post('/api/auth/reset-password/confirm', proxyApi);
app.get('/api/auth/me', proxyApi);
app.get('/api/customers', proxyApi);
app.get('/api/policies', proxyApi);

if (isProd) {
  const dist = path.join(root, 'dist');
  app.use(express.static(dist));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}

app.listen(PORT, () => {
  console.log(`Møltz Radar on http://localhost:${PORT} (${isProd ? 'production' : 'dev'})`);
});
