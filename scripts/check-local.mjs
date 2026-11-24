import assert from 'node:assert/strict'
import { adminCookie, issueShare, shareCookie } from '../lib/auth.js'

const origin = 'http://127.0.0.1:3000'
const get = (path, cookie) => fetch(new URL(path, origin), {
  redirect: 'manual', headers: cookie ? { cookie } : {}, signal: AbortSignal.timeout(5000)
})
const post = (fields, cookie, path = '/') => fetch(new URL(path, origin), {
  method: 'POST', redirect: 'manual', body: new URLSearchParams(fields),
  headers: { origin, ...(cookie && { cookie }) }, signal: AbortSignal.timeout(5000)
})
function cookieOf(response) {
  return response.headers.get('set-cookie').split(';')[0]
}
function check(response, status, description) {
  assert.equal(response.status, status, description)
  console.log('OK', description)
  return response
}

check(await get('/'), 200, 'Login page')
const projectPath = '/example/index.html?view=palette'
const anonymous = check(await get(projectPath), 303, 'Anonymous page redirects to login')
const loginPage = new URL(anonymous.headers.get('location'), origin)
assert.equal(loginPage.origin, origin)
assert.equal(loginPage.pathname, '/')
assert.equal(loginPage.searchParams.get('next'), projectPath)
assert.match(await (await get(loginPage)).text(), /name="token"/)
check(await get('/example/palette.css'), 403, 'Anonymous CSS denied')
check(await post({ action: 'login', token: 'invalid' }), 401, 'Invalid credentials denied')
const issue = { action: 'share', project: 'example', days: '1' }
check(await post(issue), 403, 'Anonymous signing denied')
const credentials = { action: 'login', token: process.env.ADMIN_TOKEN }
const signedIn = check(await post(credentials, null, loginPage), 303, 'Login returns to requested page')
assert.equal(signedIn.headers.get('location'), projectPath)
const admin = cookieOf(signedIn)
check(await get(projectPath, admin), 200, 'Original page loads after login')
assert.equal((await post(credentials, null, '/?next=//example.org/example/')).headers.get('location'), '/')
check(await get('/example/', admin), 200, 'Admin project access')
const form = await (await post(issue, admin)).text()
const sharePath = form.match(/id="link" readonly value="([^"]+)"/)?.[1]
assert.ok(sharePath, 'Missing share link')
const redeemed = check(await get(sharePath), 303, 'Redeem project link')
assert.equal(new URL(redeemed.headers.get('location'), origin).pathname, '/example/')
assert.equal(new URL(redeemed.headers.get('location'), origin).search, '')
assert.match(redeemed.headers.get('set-cookie'), /Path=\/example\//i)
assert.match(redeemed.headers.get('set-cookie'), /HttpOnly/i)
const visitor = cookieOf(redeemed)
const html = check(await get('/example/', visitor), 200, 'Guest project index')
assert.match(await html.text(), /秋日五色/)
const css = check(await get('/example/palette.css', visitor), 200, 'Guest CSS')
assert.match(css.headers.get('content-type'), /css/)
assert.match(css.headers.get('cache-control'), /no-store/)
check(await get('/example/index.html'), 303, 'Anonymous direct HTML redirects after guest access')
async function checkAccessError(path, cookie, message, label) {
  const response = check(await get(path, cookie), 403, label)
  assert.equal(response.headers.get('location'), null)
  assert.equal(response.headers.get('set-cookie'), null)
  const body = await response.text()
  assert.ok(body.includes(message))
  assert.ok(body.includes('请联系作者'))
}

await checkAccessError('/example/?share=', null, '无效', 'Empty share stays on page')
await checkAccessError('/example/?share=invalid', admin, '无效', 'Explicit invalid link is reported even with admin session')
const expired = issueShare('example', -1).token
await checkAccessError('/example/?share=' + expired, null, '已到期', 'Expired share stays on page')
await checkAccessError('/example/', shareCookie + '=' + expired, '已到期', 'Expired share cookie stays on page')
await checkAccessError('/example/palette.css', adminCookie + '=invalid', '无效', 'Invalid session gets a resource error')
check(await get('/example/', adminCookie + '=invalid; ' + visitor), 200, 'Valid guest cookie still grants access')
check(await post(issue, visitor), 403, 'Guest signing denied')
check(await post({ action: 'logout' }, admin), 303, 'Admin logout')
