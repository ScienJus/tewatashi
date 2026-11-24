import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import test from 'node:test'
import { adminStatus, isAdmin, issueAdminSession, issueShare, verifyShare } from '../lib/auth.js'

process.env.ADMIN_TOKEN = randomBytes(32).toString('hex')
process.env.SHARE_SIGNING_KEY = randomBytes(32).toString('hex')

test('only the signed project can use a share, including after redemption', () => {
  const { token, id, exp } = issueShare('example', 60)
  assert.deepEqual(verifyShare(token, 'example'), { status: 'valid', exp })
  assert.equal(verifyShare(token, 'example-two').status, 'invalid')
  assert.equal(verifyShare(token, 'example', [id]).status, 'revoked')
  assert.equal(isAdmin(token), false)
  assert.equal(verifyShare(issueAdminSession(), 'example').status, 'invalid')
})

test('rejects an expired share and edited claims', () => {
  const expired = issueShare('example', -1)
  assert.equal(verifyShare(expired.token, 'example').status, 'expired')
  const signature = expired.token.split('.')[1]
  const forged = Buffer.from(JSON.stringify({ project: 'example', id: expired.id, exp: 9999999999 })).toString('base64url')
  assert.equal(verifyShare(`${forged}.${signature}`, 'example').status, 'invalid')
})

test('distinguishes expired admin sessions from invalid credentials', t => {
  const start = Date.now()
  t.mock.method(Date, 'now', () => start)
  const session = issueAdminSession()
  assert.equal(adminStatus(session), 'valid')
  t.mock.method(Date, 'now', () => start + 8 * 3600 * 1000)
  assert.equal(adminStatus(session), 'expired')
  assert.equal(isAdmin(session), false)
  assert.equal(adminStatus(''), 'invalid')
})
