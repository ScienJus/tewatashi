import { NextResponse } from 'next/server'
import { acceptsAdminToken, adminCookie, cookieOptions, isAdmin, issueAdminSession, issueShare, projects } from '../lib/auth.js'
import { adminPage } from '../lib/admin-page.js'

export const dynamic = 'force-dynamic'

function projectReturnPath(request) {
  const path = request.nextUrl.searchParams.get('next')
  if (!path?.startsWith('/') || !URL.canParse(path, request.url)) return '/'
  const target = new URL(path, request.url)
  if (target.origin !== request.nextUrl.origin || !projects().includes(target.pathname.split('/')[1])) return '/'
  target.searchParams.delete('share')
  return target.pathname + target.search
}

function render(options, status = 200) {
  return new NextResponse(adminPage(options), { status, headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'same-origin',
    'X-Frame-Options': 'DENY'
  } })
}

export function GET(request) {
  const loggedIn = isAdmin(request.cookies.get(adminCookie)?.value)
  const next = projectReturnPath(request)
  if (loggedIn && next !== '/') return new NextResponse(null, { status: 303, headers: { Location: next, 'Cache-Control': 'no-store' } })
  if (loggedIn) return render({ projects: projects() })
  return render({})
}

export async function POST(request) {
  const origin = request.headers.get('origin')
  if (origin !== `${request.nextUrl.protocol}//${request.headers.get('host')}`) {
    return new Response('Invalid origin', { status: 403 })
  }
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/x-www-form-urlencoded') {
    return new Response(null, { status: 415 })
  }
  const form = await request.formData()
  const action = form.get('action')
  const redirect = new NextResponse(null, { status: 303, headers: { Location: '/', 'Cache-Control': 'no-store' } })
  if (action === 'login') {
    if (!acceptsAdminToken(form.get('token'))) return render({ message: 'Admin token 无效。' }, 401)
    redirect.headers.set('Location', projectReturnPath(request))
    redirect.cookies.set(adminCookie, issueAdminSession(), cookieOptions('/', 8 * 3600))
    return redirect
  }
  if (!isAdmin(request.cookies.get(adminCookie)?.value)) return render({ message: '请先登录。' }, 403)
  if (action === 'logout') {
    redirect.cookies.set(adminCookie, '', cookieOptions('/', 0))
    return redirect
  }
  const project = form.get('project')
  const days = form.get('days')
  const available = projects()
  if (action !== 'share' || !available.includes(project) || !['1', '7', '30'].includes(days)) {
    return render({ projects: available, message: '请选择有效的项目和期限。' }, 400)
  }
  return render({ projects: available, result: issueShare(project, Number(days) * 86400) })
}
