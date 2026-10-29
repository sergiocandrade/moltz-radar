import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import IMask from 'imask';
import { brazilianPhoneMaskOptions, isValidBrazilianPhone } from './phone.js';
import { signIn, signUp, signOut, restoreSession, authRequest, apiRequest, requestPasswordReset, completePasswordReset } from './auth.js';

const originalFetch = globalThis.fetch;
const originalStorage = globalThis.localStorage;
const originalDispatch = globalThis.dispatchEvent;
const token = (expires = Math.floor(Date.now() / 1000) + 3600) =>
  `header.${Buffer.from(JSON.stringify({ exp: expires })).toString('base64url')}.signature`;
let storage;
let events;
beforeEach(() => {
  storage = new Map();
  events = [];
  globalThis.dispatchEvent = event => { events.push(event.type); return true; };
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  };
  signOut();
});
afterEach(() => {
  signOut();
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalStorage;
  globalThis.dispatchEvent = originalDispatch;
});

test('sign-in sends the API contract and verifies the bearer token with /me', async () => {
  const calls = [];
  const accessToken = token();
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return Response.json(url.endsWith('/sign-in')
      ? { access_token: accessToken }
        : { name: 'Broker Example', email: 'broker@example.com' });
  };
  const user = await signIn('broker@example.com', 'password');
      assert.equal(user.name, 'Broker Example');
  assert.equal(user.email, 'broker@example.com');
  assert.equal(calls[0].url, '/api/auth/sign-in');
  assert.equal(calls[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].options.body), { username: 'broker@example.com', password: 'password' });
  assert.equal(calls[1].url, '/api/auth/me');
  assert.equal(calls[1].options.headers.Authorization, `Bearer ${accessToken}`);
  assert.equal(storage.get('moltz3:access-token'), accessToken);
});

test('Brazilian phone mask formats landlines and mobile numbers', () => {
  const mask = IMask.createMask(brazilianPhoneMaskOptions);
  for (const [digits, formatted] of [['1133331234', '(11) 3333-1234'], ['21999991234', '(21) 99999-1234']]) {
    mask.resolve(digits);
    assert.equal(mask.value, formatted);
  }
});

test('Brazilian phone validation accepts valid landlines and mobile numbers', () => {
  for (const phone of ['(11) 3333-1234', '(21) 99999-1234', '31987654321']) {
    assert.equal(isValidBrazilianPhone(phone), true, phone);
  }
});

test('Brazilian phone validation rejects incomplete numbers, invalid DDDs and invalid prefixes', () => {
  for (const phone of ['', '(11) 3333-123', '(00) 99999-1234', '(20) 99999-1234', '(11) 89999-1234', '(11) 1111-1111']) {
    assert.equal(Boolean(isValidBrazilianPhone(phone)), false, phone);
  }
});

test('sign-up sends email, phone, insurance categories and region without a password or session', async () => {
  const registration = {
    email: 'broker@example.com', phone: '(21) 99999-1234',
    insurance_categories: ['Auto', 'Residencial'], region: 'Rio de Janeiro',
  };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/auth/sign-up');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(options.body), { ...registration, insurance_categories: 'Auto,Residencial' });
    return Response.json({ ok: true });
  };
  await signUp({ ...registration, username: 'must-not-be-sent', password: 'must-not-be-sent' });
  assert.equal(storage.has('moltz3:access-token'), false);
});

test('sign-up includes trimmed custom categories in the comma-separated string', async () => {
  const registration = { email: 'broker@example.com', phone: '21999991234', region: 'Rio de Janeiro' };
  for (const categories of [['Auto', ' Seguro rural '], [' Seguro rural ']]) {
    globalThis.fetch = async (_url, options) => {
      const payload = JSON.parse(options.body);
      assert.equal(payload.insurance_categories, categories.length === 2 ? 'Auto,Seguro rural' : 'Seguro rural');
      return Response.json({ ok: true });
    };
    await signUp({ ...registration, insurance_categories: categories });
  }
});

test('sign-up reports registration errors from the API', async () => {
  globalThis.fetch = async () => Response.json({ detail: 'Dados de cadastro inválidos.' }, { status: 400 });
  await assert.rejects(signUp({ email: 'broker@example.com', phone: '21999991234', insurance_categories: ['Auto'], region: 'Rio de Janeiro' }), /Dados de cadastro inválidos/);
});

test('sign-up conflict responses explain the user is registered and will be contacted', async () => {
  for (const response of [Response.json({ detail: 'Conflict' }, { status: 409 }), new Response(null, { status: 409 })]) {
    globalThis.fetch = async () => response;
    await assert.rejects(signUp({ email: 'broker@example.com', phone: '21999991234', insurance_categories: ['Auto'], region: 'Rio de Janeiro' }), {
      message: 'Você já está cadastrado. Entraremos em contato em breve.',
    });
  }
  assert.equal(storage.has('moltz3:access-token'), false);
  assert.deepEqual(events, []);
});

test('sign-up forbidden responses display the waiting-list message without opening a session', async () => {
  for (const response of [Response.json({ detail: 'Forbidden' }, { status: 403 }), new Response(null, { status: 403 })]) {
    globalThis.fetch = async () => response;
    await assert.rejects(signUp({ email: 'broker@example.com', phone: '21999991234', insurance_categories: ['Auto'], region: 'Rio de Janeiro' }), {
      message: 'Vamos incluir você na lista de espera e entraremos em contato em breve.',
    });
  }
  assert.equal(storage.has('moltz3:access-token'), false);
  assert.deepEqual(events, []);
});

test('invalid credentials do not open a session', async () => {
  globalThis.fetch = async () => Response.json({ detail: 'Unauthorized' }, { status: 401 });
  await assert.rejects(signIn('broker@example.com', 'wrong'), /inválidos/);
  assert.deepEqual(events, []);
});

test('password reset sends the username to the auth API', async () => {
  let call;
  globalThis.fetch = async (url, options) => {
    call = { url, options };
    return Response.json({ ok: true });
  };
  await requestPasswordReset('broker@example.com');
  assert.equal(call.url, '/api/auth/reset-password');
  assert.equal(call.options.method, 'POST');
  assert.deepEqual(JSON.parse(call.options.body), { username: 'broker@example.com' });
});

test('password reset completion sends code and new password to the confirm endpoint', async () => {
  let call;
  globalThis.fetch = async (url, options) => {
    call = { url, options };
    return Response.json({ ok: true });
  };
  await completePasswordReset('broker@example.com', 'new-password', '123456');
  assert.equal(call.url, '/api/auth/reset-password/confirm');
  assert.equal(call.options.method, 'POST');
  assert.deepEqual(JSON.parse(call.options.body), {
    username: 'broker@example.com', new_password: 'new-password', code: '123456',
  });
});

test('authentication challenges and malformed tokens are rejected', async () => {
  globalThis.fetch = async () => Response.json({ challenge_name: 'NEW_PASSWORD_REQUIRED' });
  await assert.rejects(signIn('broker@example.com', 'password'), /nova senha/);
  globalThis.fetch = async () => Response.json({});
  await assert.rejects(signIn('broker@example.com', 'password'), /token/);
});

test('failed user verification clears the access token', async () => {
  globalThis.fetch = async url => Response.json(url.endsWith('/sign-in') ? { access_token: token() } : {});
  await assert.rejects(signIn('broker@example.com', 'password'), /usuário/);
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.Authorization, undefined);
    return Response.json({ ok: true });
  };
  await authRequest('/me');
});

test('network failures and non-JSON errors produce readable errors', async () => {
  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
  await assert.rejects(signIn('broker@example.com', 'password'), /conectar/);
  globalThis.fetch = async () => new Response('Bad Gateway', { status: 502 });
  await assert.rejects(signIn('broker@example.com', 'password'), /Não foi possível carregar/);
});

test('customers requests preserve pagination and use the login bearer token', async () => {
  const accessToken = token();
  globalThis.fetch = async url => Response.json(url.endsWith('/sign-in')
    ? { access_token: accessToken }
    : { name: 'Broker Example', email: 'broker@example.com' });
  await signIn('broker@example.com', 'password');
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/customers?page=2&page_size=15&view=detailed');
    assert.equal(options.headers.Authorization, `Bearer ${accessToken}`);
    return Response.json({ items: [], total: 15, page: 2, page_size: 15 });
  };
  assert.equal((await apiRequest('/customers?page=2&page_size=15&view=detailed')).page, 2);
});

test('expired customer sessions return an actionable error', async () => {
  globalThis.fetch = async () => Response.json({ detail: 'Unauthorized' }, { status: 401 });
  await assert.rejects(apiRequest('/customers'), /Sessão expirada/);
});

test('restores a valid stored JWT after verifying it with the API', async () => {
  const accessToken = token();
  storage.set('moltz3:access-token', accessToken);
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/auth/me');
    assert.equal(options.headers.Authorization, `Bearer ${accessToken}`);
    return Response.json({ name: 'Broker Example', email: 'broker@example.com' });
  };
  assert.equal((await restoreSession()).name, 'Broker Example');
});

test('expired or malformed stored JWTs are removed without an API call', async () => {
  globalThis.fetch = async () => { assert.fail('Expired tokens must not be sent'); };
  for (const value of [token(1), 'invalid', 'header.e30.signature']) {
    storage.set('moltz3:access-token', value);
    assert.equal(await restoreSession(), null);
    assert.equal(storage.has('moltz3:access-token'), false);
  }
  assert.deepEqual(events, ['auth:expired', 'auth:expired', 'auth:expired']);
});

test('logout removes the persisted token and bearer header', async () => {
  storage.set('moltz3:access-token', token());
  globalThis.fetch = async () => Response.json({ name: 'Broker Example', email: 'broker@example.com' });
  await restoreSession();
  signOut();
  assert.equal(storage.has('moltz3:access-token'), false);
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.Authorization, undefined);
    return Response.json({ ok: true });
  };
  await apiRequest('/customers');
});

test('API rejection clears a restored session, but forbidden access does not', async () => {
  storage.set('moltz3:access-token', token());
  globalThis.fetch = async () => Response.json({ name: 'Broker Example', email: 'broker@example.com' });
  await restoreSession();
  globalThis.fetch = async () => Response.json({}, { status: 403 });
  await assert.rejects(apiRequest('/customers'));
  assert.equal(storage.has('moltz3:access-token'), true);
  globalThis.fetch = async () => Response.json({}, { status: 401 });
  await assert.rejects(apiRequest('/customers'));
  assert.equal(storage.has('moltz3:access-token'), false);
});

test('JWT expiration clears the session before sending another request', async context => {
  const now = Date.now();
  storage.set('moltz3:access-token', token(Math.floor(now / 1000) + 60));
  globalThis.fetch = async () => Response.json({ name: 'Broker Example', email: 'broker@example.com' });
  await restoreSession();
  context.mock.method(Date, 'now', () => now + 120000);
  globalThis.fetch = async () => { assert.fail('Expired tokens must not be sent'); };
  await assert.rejects(apiRequest('/customers'), /Sessão expirada/);
  assert.deepEqual(events, ['auth:expired']);
  assert.equal(storage.has('moltz3:access-token'), false);
});

test('temporary API failure does not delete a still-valid stored session', async () => {
  storage.set('moltz3:access-token', token());
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  await assert.rejects(restoreSession(), /conectar/);
  assert.equal(storage.has('moltz3:access-token'), true);
});

test('idle sessions are cleared automatically at JWT expiration', async context => {
  const now = 1800000000000;
  context.mock.timers.enable({ apis: ['Date', 'setTimeout'], now });
  storage.set('moltz3:access-token', token(now / 1000 + 2));
  globalThis.fetch = async () => Response.json({ name: 'Broker Example', email: 'broker@example.com' });
  await restoreSession();
  context.mock.timers.tick(1999);
  assert.equal(storage.has('moltz3:access-token'), true);
  context.mock.timers.tick(1);
  assert.equal(storage.has('moltz3:access-token'), false);
});