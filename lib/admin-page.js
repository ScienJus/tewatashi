const styles = `
:root{color-scheme:light;font-family:"Inter",system-ui,sans-serif;color:#302d28;background:#f6f4ed}
*{box-sizing:border-box}
body{margin:0}
header{padding:24px clamp(20px,6vw,80px);border-bottom:1px solid #d9d5ca;font:600 23px Georgia,serif;letter-spacing:-1px}
main{width:min(92%,470px);margin:clamp(50px,12vh,140px) auto;padding:clamp(24px,5vw,42px);background:#fffefa;border:1px solid #d9d5ca;border-radius:12px}
h1{font-size:26px;margin:0 0 28px}
label{display:grid;gap:8px;margin:18px 0;font-size:14px;font-weight:600}
input,select,button{font:inherit;border-radius:6px;padding:11px 13px}
input,select{width:100%;background:white;color:inherit;border:1px solid #bdb9ad}
button{border:0;background:#315640;color:white;cursor:pointer}
form>button{width:100%;margin-top:8px}
:focus-visible{outline:3px solid #aa7823;outline-offset:2px}
a{color:#315640}
footer,.result{border-top:1px solid #dedacf;margin-top:24px;padding-top:18px}
footer{display:flex;align-items:center;justify-content:space-between;font-size:14px}
footer button{background:transparent;color:#555;padding:4px}
small{display:block;margin-top:12px;overflow-wrap:anywhere;color:#5a584f}
[role=alert]{color:#943c2c}
`

const login = `<form method="post">
  <input type="hidden" name="action" value="login">
  <label>Admin token<input type="password" name="token" autocomplete="current-password" required autofocus></label>
  <button>登录</button></form>`

// Project names are validated as ASCII slugs in next.config.mjs.
// The only other interpolated fields are server-issued tokens, UUIDs and fixed messages.
export function adminPage({ projects, result, message } = {}) {
  let panel = login
  if (projects) {
    const options = projects.map(project => `<option>${project}</option>`).join('')
    panel = `<form method="post"><input type="hidden" name="action" value="share">
      <label>项目<select id="project" name="project" required>${options}</select></label>
      <label>有效期<select name="days"><option value="1">1 天</option><option value="7" selected>7 天</option><option value="30">30 天</option></select></label>
      <button>生成访问链接</button></form>`
    if (result) {
      panel += `<section class="result"><label>分享链接<input id="link" readonly value="/${result.project}/?share=${result.token}"></label>
        <button id="copy" type="button">复制链接</button><small>撤销 ID · <code>${result.id}</code></small></section>`
    }
    panel += `<footer><a id="open" href="/${result?.project ?? projects[0]}/">打开项目 ↗</a>
      <form method="post"><input type="hidden" name="action" value="logout"><button>退出登录</button></form></footer>
      <script>
        const project = document.querySelector('#project')
        const openProject = document.querySelector('#open')
        project.value = openProject.pathname.split('/')[1]
        project.onchange = () => { openProject.href = '/' + project.value + '/' }
        const link = document.querySelector('#link')
        if (link) {
          link.value = new URL(link.value, location.origin).href
          document.querySelector('#copy').onclick = async event => {
            try { await navigator.clipboard.writeText(link.value); event.target.textContent = '已复制' }
            catch { link.select() }
          }
        }
      </script>`
  }
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Tewatashi · ${projects ? '项目分享' : '管理员登录'}</title><style>${styles}</style>
    <header>Tewatashi</header><main><h1>${projects ? '项目分享' : '管理员登录'}</h1>
    ${message ? `<p role="alert">${message}</p>` : ''}${panel}</main></html>`
}
