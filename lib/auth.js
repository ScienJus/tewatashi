import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import revoked from '../revoked.json' with { type: 'json' }

export const adminCookie = 'tewatashi_admin'
export const shareCookie = 'tewatashi_share'
export const now = () => Math.floor(Date.now() / 1000)
export const projects = () => JSON.parse(process.env.TEWATASHI_PROJECTS)

function secret(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

export function acceptsAdminToken(input) {
  const hash = text => createHash('sha256').update(text).digest()
  return typeof input === 'string' && timingSafeEqual(hash(input), hash(secret('ADMIN_TOKEN')))
}

function signature(payload, key) {
  return createHmac('sha256', secret(key)).update(payload).digest('base64url')
}

function sign(claims, key) {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `${payload}.${signature(payload, key)}`
}

function verify(token, key) {
  if (!token || token.length > 2048) return null
  const parts = token.split('.')
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return null
  const expected = signature(parts[0], key)
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(parts[1]))) return null
  try {
    const claims = JSON.parse(Buffer.from(parts[0], 'base64url').toString())
    return Number.isSafeInteger(claims?.exp) ? claims : null
  } catch {
    return null
  }
}

export function issueAdminSession() {
  return sign({ role: 'admin', exp: now() + 8 * 3600 }, 'ADMIN_TOKEN')
}

export function adminStatus(token) {
  const claims = verify(token, 'ADMIN_TOKEN')
  if (claims?.role !== 'admin') return 'invalid'
  return claims.exp > now() ? 'valid' : 'expired'
}

export function isAdmin(token) {
  return adminStatus(token) === 'valid'
}

export function issueShare(project, seconds) {
  const claims = { project, exp: now() + seconds, id: randomUUID() }
  return { ...claims, token: sign(claims, 'SHARE_SIGNING_KEY') }
}

export function verifyShare(token, project, revokedIds = revoked) {
  const claims = verify(token, 'SHARE_SIGNING_KEY')
  if (claims?.project !== project || !claims?.id) return { status: 'invalid' }
  if (revokedIds.includes(claims.id)) return { status: 'revoked' }
  if (claims.exp <= now()) return { status: 'expired' }
  return { status: 'valid', exp: claims.exp }
}

export function cookieOptions(path, maxAge) {
  return { path, maxAge, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' }
}
