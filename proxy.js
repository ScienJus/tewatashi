import { NextResponse } from 'next/server'
import { adminCookie, adminStatus, cookieOptions, now, projects, shareCookie, verifyShare } from './lib/auth.js'

export function proxy(request) {
  const url = new URL(request.url)
  url.host = request.headers.get('host') ?? url.host
  const path = url.pathname
  if (path === '/') return NextResponse.next()

  const project = path.split('/')[1]
  if (!projects().includes(project)) return new Response('Project not found.', { status: 404 })
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } })

  // Reject ambiguous separators before the static file server decodes the URL.
  try {
    if (path.split('/').some(segment => {
      const name = decodeURIComponent(segment)
      return name === '.' || name === '..' || /[/\\%\x00]/.test(name)
    })) return new Response(null, { status: 400 })
  } catch {
    return new Response(null, { status: 400 })
  }

  if (url.searchParams.has('share')) {
    const token = url.searchParams.get('share')
    const share = verifyShare(token, project)
    if (share.status !== 'valid') return accessError(share.status)
    url.searchParams.delete('share')
    if (path === `/${project}`) url.pathname += '/'
    const response = NextResponse.redirect(url, 303)
    response.headers.set('Cache-Control', 'private, no-store')
    response.headers.set('Referrer-Policy', 'no-referrer')
    response.cookies.set(shareCookie, token, cookieOptions(`/${project}/`, share.exp - now()))
    return response
  }

  const admin = request.cookies.get(adminCookie)
  const guest = request.cookies.get(shareCookie)
  const adminResult = admin && adminStatus(admin.value)
  const guestResult = guest && verifyShare(guest.value, project).status
  const authorized = adminResult === 'valid' || guestResult === 'valid'
  if (!authorized && (guestResult || adminResult)) return accessError(guestResult ?? adminResult)

  // Browsers only send the project-scoped cookie on the canonical directory URL.
  if (path === `/${project}`) {
    url.pathname += '/'
    return NextResponse.redirect(url, 307)
  }
  if (authorized) return NextResponse.next()

  const destination = request.headers.get('sec-fetch-dest')
  const pageRequest = destination ? destination === 'document' :
    request.headers.get('accept')?.includes('text/html') || /(?:\/|\.html?)$/i.test(path)
  if (!pageRequest) return new Response('You need permission to access this project.', { status: 403 })

  const login = new URL('/', url)
  login.searchParams.set('next', path + url.search)
  return NextResponse.redirect(login, 303)
}

function accessError(status) {
  const messages = {
    invalid: 'Your access credential is invalid.',
    expired: 'Your access credential has expired.',
    revoked: 'This share link has been revoked.'
  }
  return new Response(messages[status] + ' Contact the author for a new share link.', {
    status: 403,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' }
  })
}
