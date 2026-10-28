/**
 * Replacement for the claude.ai artifact runtime (window.claude).
 *
 * The original page called two runtime capabilities:
 *   - window.claude.use('sample')    → AI text generation, with optional tools
 *   - window.claude.use('downloads') → save a file to the viewer's device
 *
 * This shim offers the same interface so app.js runs unchanged:
 *   - 'sample' calls this project's Node server (/api/messages), which
 *     talks to the Anthropic API with your own API key. Tools still run
 *     here in the browser, because the portfolio data lives in the page.
 *   - 'downloads' triggers a normal browser download.
 *
 * If the server has no API key configured, use('sample') rejects and the
 * app falls back to its built-in local answers, exactly as it did on
 * claude.ai when the capability was unavailable.
 */

const MAX_TOOL_ROUNDS = 8;

function err(code, message, extra = {}) {
  const e = new Error(message || code);
  e.code = code;
  Object.assign(e, extra);
  return e;
}

// The API wants alternating roles; the app sometimes sends two user turns in a row.
function normalizeTurns(input) {
  const turns = typeof input === 'string' ? [{ role: 'user', content: input }] : input;
  const out = [];
  for (const t of turns) {
    const prev = out[out.length - 1];
    if (prev && prev.role === t.role && typeof prev.content === 'string' && typeof t.content === 'string') {
      prev.content += '\n\n' + t.content;
    } else {
      out.push({ role: t.role, content: t.content });
    }
  }
  // A conversation must start with the user.
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

async function callServer(body) {
  const res = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw err(data.code || 'sample_failed', data.error || `HTTP ${res.status}`);
  return data;
}

function makeSample(config) {
  async function sample(input, opts = {}) {
    const { modelTier = 'quick', tools = [], onText } = opts;
    const messages = normalizeTurns(input);
    const toolSpecs = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema || { type: 'object', properties: {} },
    }));
    let text = '';

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const resp = await callServer({ messages, tools: toolSpecs, modelTier });
      const blocks = resp.content || [];
      const roundText = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('');
      if (roundText) {
        text = roundText;
        onText?.({ text });
      }
      const calls = blocks.filter((b) => b.type === 'tool_use');
      if (resp.stop_reason !== 'tool_use' || !calls.length) return text;

      messages.push({ role: 'assistant', content: blocks });
      const results = [];
      for (const call of calls) {
        const tool = tools.find((t) => t.name === call.name);
        let content, is_error = false;
        try {
          if (!tool) throw new Error(`Ferramenta desconhecida: ${call.name}`);
          content = JSON.stringify(await tool.execute(call.input || {}));
        } catch (e) {
          content = String(e.message || e);
          is_error = true;
        }
        results.push({ type: 'tool_result', tool_use_id: call.id, content, is_error });
      }
      messages.push({ role: 'user', content: results });
    }
    throw err('tool_loop_limit', 'Muitas chamadas de ferramenta', text ? { text } : {});
  }
  sample.limits = async () => ({ tools: !!config.tools });
  return sample;
}

const downloads = {
  async save({ filename, data, mimeType }) {
    const type = mimeType || (filename.endsWith('.csv') ? 'text/csv;charset=utf-8'
      : filename.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/octet-stream');
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

let configPromise = null;
const getConfig = () =>
  (configPromise ||= fetch('/api/config').then((r) => (r.ok ? r.json() : { ai: false })).catch(() => ({ ai: false })));

window.claude = {
  async use(name) {
    if (name === 'downloads') return downloads;
    if (name === 'sample') {
      const cfg = await getConfig();
      if (!cfg.ai) throw err('sampling_disabled', 'AI is not configured on the server');
      return makeSample(cfg);
    }
    throw err('not_declared', `Capability "${name}" is not available`);
  },
};
