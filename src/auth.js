let accessToken = null;
let expiryTimer = null;
const SESSION_KEY = 'moltz3:access-token';

function tokenExpiry(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return 0;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export function signOut() {
  accessToken = null;
  clearTimeout(expiryTimer);
  expiryTimer = null;
  try { globalThis.localStorage?.removeItem(SESSION_KEY); } catch {}
}

function expireSession() {
  signOut();
  globalThis.dispatchEvent?.(new Event('auth:expired'));
}

function scheduleExpiry() {
  clearTimeout(expiryTimer);
  const remaining = tokenExpiry(accessToken) - Date.now();
  if (remaining <= 0) {
    expireSession();
    return;
  }
  expiryTimer = setTimeout(scheduleExpiry, Math.min(remaining, 2147483647));
  expiryTimer.unref?.();
}

async function currentUser() {
  const user = await authRequest('/me');
  if (typeof user.name !== 'string' || typeof user.email !== 'string') {
    throw new Error('O serviço não retornou um usuário válido.');
  }
  return user;
}

export async function restoreSession() {
  let token;
  try { token = globalThis.localStorage?.getItem(SESSION_KEY); } catch {}
  if (!token || tokenExpiry(token) <= Date.now()) {
    if (token) expireSession();
    else signOut();
    return null;
  }
  accessToken = token;
  scheduleExpiry();
  return currentUser();
}

export async function apiRequest(path, options = {}) {
  if (accessToken && tokenExpiry(accessToken) <= Date.now()) {
    expireSession();
    throw new Error('Sessão expirada. Entre novamente.');
  }
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        ...options.headers,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error('Não foi possível conectar à API. Tente novamente.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 409 && path === '/auth/sign-up') {
      throw new Error('Você já está cadastrado. Entraremos em contato em breve.');
    }
    if (response.status === 403 && path === '/auth/sign-up') {
      throw new Error('Vamos incluir você na lista de espera e entraremos em contato em breve.');
    }
    if (response.status === 401 || response.status === 403) {
      if (response.status === 401 && path !== '/auth/sign-in') expireSession();
      throw new Error(path === '/auth/sign-in'
        ? 'E-mail ou senha inválidos, ou acesso não autorizado.'
        : 'Sessão expirada ou acesso não autorizado. Entre novamente.');
    }
    const detail = data?.detail;
    throw new Error(typeof detail === 'string' ? detail : 'Não foi possível carregar os dados. Tente novamente.');
  }
  if (!data) throw new Error('Resposta inválida do serviço de autenticação.');
  return data;
}

export function authRequest(path, options = {}) {
  return apiRequest(`/auth${path}`, options);
}

export function signUp({ email, phone, insurance_categories, region }) {
  return authRequest('/sign-up', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, phone, insurance_categories: insurance_categories.map(category => category.trim()).filter(Boolean).join(','), region }),
  });
}

export async function signIn(username, password) {
  signOut();
  const data = await authRequest('/sign-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (data.challenge_name) {
    throw new Error(data.challenge_name === 'NEW_PASSWORD_REQUIRED'
      ? 'É necessário definir uma nova senha antes de entrar. Contate o administrador.'
      : 'Sua conta exige uma etapa adicional de autenticação. Contate o administrador.');
  }
  if (typeof data.access_token !== 'string' || tokenExpiry(data.access_token) <= Date.now()) {
    throw new Error('O serviço não retornou um token de acesso válido.');
  }
  accessToken = data.access_token;
  try {
    const user = await currentUser();
    if (accessToken !== data.access_token || tokenExpiry(accessToken) <= Date.now()) {
      throw new Error('Sessão expirada. Entre novamente.');
    }
    try { globalThis.localStorage?.setItem(SESSION_KEY, accessToken); } catch {}
    scheduleExpiry();
    return user;
  } catch (error) {
    signOut();
    throw error;
  }
}

export function requestPasswordReset(username) {
  return authRequest('/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
}

export function completePasswordReset(username, newPassword, code) {
  return authRequest('/reset-password/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, new_password: newPassword, code }),
  });
}