/**
 * dafy-auto-reply-toggle — Host 半。
 * 设置 → 鲸鲸 · 自动回复：读写 ~/.dsh/whale-auto-reply.json {enabled}.
 * 调度器每次 tick 读取该文件；关闭时只推进水位、不回复。
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const HOME = os.homedir()
const STATE_FILE = path.join(HOME, '.dsh', 'whale-auto-reply.json')
const WATCH_FILE = path.join(HOME, '.dsh', 'whale-watch-videos.json')
const LISTEN_FILE = path.join(HOME, '.dsh', 'whale-listen.json')

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return fallback }
}
function writeJson(p, v) {
  fs.mkdirSync(path.dirname(p), { recursive: true })
  const tmp = `${p}.tmp-${process.pid}`
  fs.writeFileSync(tmp, JSON.stringify(v, null, 2) + '\n')
  fs.renameSync(tmp, p)
}
function readState() {
  const d = readJson(STATE_FILE, {})
  return { enabled: d?.enabled !== false }
}
function json(res, code, data) {
  res.statusCode = code
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}
function isLoopback(req) {
  const host = String(req.headers?.host ?? '').toLowerCase()
  const h = host.startsWith('[') ? host.slice(0, host.indexOf(']') + 1) : host.split(':')[0]
  return h === '127.0.0.1' || h === 'localhost' || h === '[::1]' || h === '::1'
}

export default {
  name: 'dafy-auto-reply-toggle',
  inject: ['webServer'],
  apply(ctx) {
    const disposers = []
    function route(pathname, handler) {
      disposers.push(ctx.webServer.register({
        kind: 'exact', path: pathname,
        handler: async (req, res) => {
          if (!isLoopback(req)) { json(res, 403, { ok: false, error: '不受信任的访问来源' }); return }
          try { await handler(req, res) } catch (e) { try { json(res, 500, { ok: false, error: String(e?.message ?? e) }) } catch {} }
        },
      }))
    }

    route('/dafy-auto-reply/api/state', async (req, res) => {
      if (req.method !== 'GET') { json(res, 405, { ok: false }); return }
      const st = readState()
      const watch = readJson(WATCH_FILE, { videos: [] })
      const listen = readJson(LISTEN_FILE, {})
      json(res, 200, {
        ok: true,
        enabled: st.enabled,
        watchCount: Array.isArray(watch?.videos) ? watch.videos.length : 0,
        lastSeen: listen?.lastSeen ?? null,
        stateFile: STATE_FILE,
      })
    })

    route('/dafy-auto-reply/api/set', async (req, res) => {
      if (req.method !== 'POST') { json(res, 405, { ok: false }); return }
      const body = JSON.parse((await readBody(req)) || '{}')
      if (typeof body.enabled !== 'boolean') { json(res, 400, { ok: false, error: 'enabled 须为布尔值' }); return }
      writeJson(STATE_FILE, { enabled: body.enabled })
      json(res, 200, { ok: true, enabled: body.enabled, stateFile: STATE_FILE })
    })

    if (typeof ctx.on === 'function') {
      ctx.on('dispose', () => { for (const d of disposers) { try { d() } catch {} } })
    }
  },
}
