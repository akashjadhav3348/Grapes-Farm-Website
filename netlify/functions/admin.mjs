import { createHash, createHmac, pbkdf2Sync, timingSafeEqual } from 'node:crypto';
import { familyRequest } from './family-store.mjs';

const base = '/api/admin';
export const config = { path: '/api/admin/:action' };
const clock = () => Math.floor(Date.now() / 1000);
const cookies = { refresh: 'af_refresh', access: 'af_access' };
const credential = {
  emailHash: '4c343b28a1b24bdadfe4f404d8d725186c4d069f0f6d08f1f653527767200255',
  passwordSalt: 'efc1e69cac96ad3a847eca51548cf19c',
  passwordHash: '04300afd41c90da1f7488199622367bbff68eb6803d7d047626ba52a81ea3fa9',
};

function reply(data, status = 200, headers = new Headers()) {
  headers.set('Cache-Control', 'no-store');
  return Response.json(data, { status, headers });
}

function setCookie(headers, name, value, age) {
  const secure = process.env.ADMIN_ORIGIN?.startsWith('https://') ? '; Secure' : '';
  headers.append('Set-Cookie', `${name}=${value}; Max-Age=${age}; Path=${base}; HttpOnly${secure}; SameSite=Lax`);
}

function readCookie(request, name) {
  return (request.headers.get('cookie') ?? '').split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

function sign(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}

function check(token, kind, secret) {
  if (!token || token.length > 4096 || !/^[\w-]+\.[\w-]+$/.test(token)) return null;
  const [body, signature] = token.split('.');
  const expected = createHmac('sha256', secret).update(body).digest();
  const supplied = Buffer.from(signature, 'base64url');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const value = JSON.parse(Buffer.from(body, 'base64url').toString());
    return value.kind === kind && Number.isSafeInteger(value.exp) && value.exp > clock() ? value : null;
  } catch {
    return null;
  }
}

function issue(headers, kind, session, until, secret) {
  const age = until - clock();
  setCookie(headers, cookies[kind], sign({ kind, exp: until, ...session }, secret), age);
}

async function requestJSON(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Upstream request failed');
  return response.json();
}

async function activity() {
  const token = process.env.NETLIFY_API_TOKEN;
  const site = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  if (!token || !site) return reply({ error: 'telemetry_setup' }, 503);
  const root = `https://api.netlify.com/api/v1/sites/${encodeURIComponent(site)}`;
  const options = { headers: { Authorization: `Bearer ${token}` } };
  const results = await Promise.allSettled([
    requestJSON(`${root}/deploys?per_page=10`, options),
    requestJSON(`${root}/builds?per_page=10`, options),
    requestJSON(`${root}/files`, options),
  ]);
  const [deploys, builds, files] = results.map((result) => result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : null);
  if (results.every((result) => result.status === 'rejected')) return reply({ error: 'telemetry_unavailable' }, 502);
  return reply({
    checkedAt: new Date().toISOString(),
    deploys: deploys?.map(({ id, state, created_at, context, branch }) => ({ id, state, created_at, context, branch })) ?? null,
    builds: builds?.map(({ id, done, error, created_at }) => ({ id, state: error ? 'error' : done ? 'ready' : 'running', created_at })) ?? null,
    files: files && { count: files.length, bytes: files.every((file) => Number.isFinite(file.size)) ? files.reduce((total, file) => total + file.size, 0) : null },
  });
}

function sameDigest(left, rightHex) {
  const right = Buffer.from(rightHex, 'hex');
  if (!Buffer.isBuffer(left) || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function validCredentials(email, password) {
  if (typeof email !== 'string' || typeof password !== 'string' || password.length > 256) return false;
  const emailDigest = createHash('sha256').update(email.trim().toLowerCase()).digest();
  const passwordDigest = pbkdf2Sync(password, Buffer.from(process.env.ADMIN_PASSWORD_SALT || credential.passwordSalt, 'hex'), 310000, 32, 'sha256');
  const emailMatch = sameDigest(emailDigest, process.env.ADMIN_EMAIL_HASH || credential.emailHash);
  const passwordMatch = sameDigest(passwordDigest, process.env.ADMIN_PASSWORD_HASH || credential.passwordHash);
  return emailMatch && passwordMatch;
}

export default async function handler(request) {
  const url = new URL(request.url);
  const action = url.pathname.slice(base.length + 1);
  const secret = process.env.ADMIN_SESSION_SECRET;
  const origin = process.env.ADMIN_ORIGIN?.replace(/\/$/, '');
  if (!secret || secret.length < 43 || origin !== url.origin) {
    return reply({ error: 'auth_setup' }, 503);
  }
  const methods = {
    login: ['POST'],
    refresh: ['POST'],
    logout: ['POST'],
    activity: ['GET'],
    family: ['GET', 'POST', 'PATCH', 'DELETE'],
  }[action];
  if (!methods) return reply({ error: 'not_found' }, 404);
  if (!methods.includes(request.method)) return reply({ error: 'method' }, 405);
  if (request.method !== 'GET' && request.headers.get('origin') !== origin) return reply({ error: 'origin' }, 403);

  if (action === 'login') {
    try {
      if (Number(request.headers.get('content-length') || 0) > 4096) return reply({ error: 'invalid_credentials' }, 401);
      const body = await request.json();
      if (!validCredentials(body?.email, body?.password)) {
        return reply({ error: 'invalid_credentials' }, 401);
      }
      const headers = new Headers();
      const user = { sub: 'owner', role: 'admin' };
      issue(headers, 'refresh', user, clock() + 8 * 3600, secret);
      issue(headers, 'access', user, clock() + 90, secret);
      return reply({ name: 'Administrator', role: 'admin' }, 200, headers);
    } catch {
      return reply({ error: 'invalid_request' }, 400);
    }
  }

  if (action === 'logout') {
    const headers = new Headers();
    setCookie(headers, cookies.refresh, '', 0);
    setCookie(headers, cookies.access, '', 0);
    return reply({ ok: true }, 200, headers);
  }

  const kind = action === 'refresh' ? 'refresh' : 'access';
  const user = check(readCookie(request, cookies[kind]), kind, secret);
  if (!user || user.role !== 'admin' || user.sub !== 'owner') return reply({ error: 'unauthorized' }, 401);
  if (action === 'family') return familyRequest(request, user);
  if (action === 'refresh') {
    const headers = new Headers();
    issue(headers, 'access', { sub: 'owner', role: 'admin' }, Math.min(user.exp, clock() + 90), secret);
    return reply({ name: 'Administrator', role: 'admin' }, 200, headers);
  }
  if (action === 'activity') return activity();
  return reply({ error: 'not_found' }, 404);
}
