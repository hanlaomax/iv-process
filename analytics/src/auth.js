/* Xác thực: verify Google ID token (JWKS + RS256) và ký/verify session token (HS256). */
import { b64urlToBytes, b64urlToJson, bytesToB64url, jsonToB64url, timingSafeEqual } from './lib.js';

const GOOGLE_ISS = new Set(['https://accounts.google.com', 'accounts.google.com']);
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
let jwksCache = null; // { at, keys: Map<kid, CryptoKey> }

async function googleKeys() {
  if (jwksCache && Date.now() - jwksCache.at < 3600000) return jwksCache.keys;
  const r = await fetch(JWKS_URL);
  if (!r.ok) throw new Error('jwks');
  const { keys } = await r.json();
  const map = new Map();
  for (const jwk of keys) {
    const key = await crypto.subtle.importKey(
      'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
    );
    map.set(jwk.kid, key);
  }
  jwksCache = { at: Date.now(), keys: map };
  return map;
}

/* Trả { sub, email, name, picture } nếu token hợp lệ, ngược lại throw. */
export async function verifyGoogleToken(idToken, clientId) {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw new Error('format');
  const header = b64urlToJson(parts[0]);
  if (header.alg !== 'RS256') throw new Error('alg');

  const keys = await googleKeys();
  const key = keys.get(header.kid);
  if (!key) throw new Error('kid');

  const signed = new TextEncoder().encode(parts[0] + '.' + parts[1]);
  const sig = b64urlToBytes(parts[2]);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sig, signed);
  if (!ok) throw new Error('signature');

  const p = b64urlToJson(parts[1]);
  if (!GOOGLE_ISS.has(p.iss)) throw new Error('iss');
  if (p.aud !== clientId) throw new Error('aud');
  if (typeof p.exp !== 'number' || p.exp * 1000 < Date.now()) throw new Error('expired');
  if (p.email && p.email_verified === false) throw new Error('email');

  return { sub: p.sub, email: p.email || null, name: p.name || p.email || 'Người dùng', picture: p.picture || null };
}

/* ---- Session token: JWT HS256 do Worker tự ký (localStorage phía client) ---- */
async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
}

export async function signSession(payload, secret, days = 30) {
  const body = { ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + days * 86400 };
  const head = jsonToB64url({ alg: 'HS256', typ: 'JWT' });
  const data = head + '.' + jsonToB64url(body);
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return data + '.' + bytesToB64url(sig);
}

export async function verifySession(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const key = await hmacKey(secret);
  const expected = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(parts[0] + '.' + parts[1]));
  if (!timingSafeEqual(parts[2], bytesToB64url(expected))) return null;
  let p;
  try { p = b64urlToJson(parts[1]); } catch { return null; }
  if (typeof p.exp !== 'number' || p.exp * 1000 < Date.now()) return null;
  return p;
}

/* Lấy session hợp lệ từ header Authorization: Bearer <token>. */
export async function currentUser(request, env) {
  const auth = request.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  return verifySession(m[1], env.SESSION_SECRET);
}
