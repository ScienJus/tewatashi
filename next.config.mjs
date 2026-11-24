import { lstatSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const publicDir = fileURLToPath(new URL('./public', import.meta.url))
if (lstatSync(publicDir).isSymbolicLink()) throw new Error('public must be a directory, not a symlink')
for (const entry of readdirSync(publicDir, { withFileTypes: true, recursive: true })) {
  if (entry.isSymbolicLink()) throw new Error(`Symlink in static content: ${join(entry.parentPath, entry.name)}`)
}
const projects = readdirSync(publicDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
for (const name of projects) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name) || name === 'api') {
    throw new Error(`Invalid project directory: ${name}`)
  }
}

export default {
  skipTrailingSlashRedirect: true,
  env: { TEWATASHI_PROJECTS: JSON.stringify(projects) },
  async rewrites() {
    return projects.map(project => ({
      source: `/${project}/:folder*/`,
      destination: `/${project}/:folder*/index.html`
    }))
  },
  async headers() {
    return [{ source: '/:path+', headers: [
      { key: 'Cache-Control', value: 'private, no-store' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Content-Type-Options', value: 'nosniff' }
    ] }]
  }
}
