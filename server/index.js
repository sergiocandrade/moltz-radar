import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;
const AUTH_API_URL = (process.env.AUTH_API_URL || 'http://localhost:5002').replace(/\/$/, '');

const MODELS = {
  quick: process.env.ANTHROPIC_MODEL_QUICK || 'claude-haiku-5-5',
  default: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
};
const MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS) || 1024;

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

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
app.get('/api/auth/me', proxyApi);
app.get('/api/customers', proxyApi);

// Tells the browser shim whether AI features are on.
app.get('/api/config', (_req, res) => {
  res.json({ ai: !!anthropic, tools: !!anthropic });
});

// One round of the conversation. The browser runs the tools and calls again.
app.post('/api/messages', async (req, res) => {
  if (!anthropic) {
    return res.status(503).json({ code: 'sampling_disabled', error: 'ANTHROPIC_API_KEY is not set' });
  }
  const { messages, tools, modelTier } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ code: 'bad_request', error: 'messages is required' });
  }
  try {
    const resp = await anthropic.messages.create({
      model: modelTier === 'quick' ? MODELS.quick : MODELS.default,
      max_tokens: MAX_TOKENS,
      messages,
      ...(Array.isArray(tools) && tools.length ? { tools } : {}),
    });
    res.json({ content: resp.content, stop_reason: resp.stop_reason });
  } catch (e) {
    console.error('[anthropic]', e.status, e.message);
    res.status(502).json({ code: 'sample_failed', error: 'The AI request failed' });
  }
});

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
  if (!anthropic) console.log('AI off: set ANTHROPIC_API_KEY in .env to enable the assistant and call scripts.');
});
