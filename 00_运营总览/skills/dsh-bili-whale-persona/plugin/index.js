/**
 * dsh-bili-whale-persona-toggle — Host 半。
 *
 * 作用：在「设置 → 鲸鲸 · 人设」提供一个孙吧味档位开关。
 *  - GET  /whale-persona/api/state   → 读当前档位与目标人设文件
 *  - POST /whale-persona/api/set     → 写档位，并把对应人设文本写入 ~/.bili-ai/persona.md
 *
 * 档位：off（默认，中性）/ light（轻损）/ on（孙吧全损，备用）
 * 状态文件：~/.dsh/bili-whale-persona.json
 * 目标人设文件：~/.bili-ai/persona.md（dsh-bili-whale 实际读取的那个）
 *
 * 不碰 dsh-bili-whale 的 node_modules；只写它本来就读取的人设文件与自己的状态文件。
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const HOME = os.homedir()
const STATE_FILE = path.join(HOME, '.dsh', 'bili-whale-persona.json')
const PERSONA_DIR = path.join(HOME, '.bili-ai')
const PERSONA_FILE = path.join(PERSONA_DIR, 'persona.md')
const TIERS = ['off', 'light', 'on']
const TIER_FILE = { off: 'neutral.md', light: 'light.md', on: 'sunba.md' }

function readState() {
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    const sunba = TIERS.includes(raw?.sunba) ? raw.sunba : 'off'
    return { sunba, updatedAt: raw?.updatedAt ?? null }
  } catch {
    return { sunba: 'off', updatedAt: null }
  }
}

function writeState(next) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true })
  const body = JSON.stringify({ sunba: next.sunba, updatedAt: new Date().toISOString() }, null, 2) + '\n'
  const tmp = `${STATE_FILE}.tmp-${process.pid}`
  fs.writeFileSync(tmp, body, { mode: 0o600 })
  fs.renameSync(tmp, STATE_FILE)
}

function personaTextFor(tier) {
  const file = path.join(HERE, 'personas', TIER_FILE[tier] ?? TIER_FILE.off)
  return fs.readFileSync(file, 'utf8')
}

function json(res, code, data) {
  res.statusCode = code
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
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
  name: 'dsh-bili-whale-persona-toggle',
  inject: ['webServer', 'connection'],
  apply(ctx) {
    const disposers = []

    function route(kind, pathname, handler) {
      disposers.push(ctx.webServer.register({
        kind,
        path: pathname,
        handler: async (req, res) => {
          if (!isLoopback(req)) { json(res, 403, { ok: false, error: '不受信任的访问来源' }); return }
          try { await handler(req, res) } catch (err) {
            try { json(res, 500, { ok: false, error: String(err?.message ?? err) }) } catch {}
          }
        },
      }))
    }

    route('exact', '/whale-persona/api/state', async (req, res) => {
      if (req.method !== 'GET') { json(res, 405, { ok: false }); return }
      const state = readState()
      json(res, 200, {
        ok: true,
        sunba: state.sunba,
        updatedAt: state.updatedAt,
        personaFile: PERSONA_FILE,
        personaExists: fs.existsSync(PERSONA_FILE),
        tiers: TIERS,
      })
    })

    route('exact', '/whale-persona/api/set', async (req, res) => {
      if (req.method !== 'POST') { json(res, 405, { ok: false }); return }
      const body = JSON.parse((await readBody(req)) || '{}')
      const tier = body?.sunba
      if (!TIERS.includes(tier)) { json(res, 400, { ok: false, error: '档位须为 off / light / on' }); return }

      // 1) 先把档位写进状态文件（这是 agent / skill 读的）
      writeState({ sunba: tier })

      // 2) 再把对应人设文本写入 dsh-bili-whale 读取的 persona.md
      fs.mkdirSync(PERSONA_DIR, { recursive: true })
      if (fs.existsSync(PERSONA_FILE)) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-')
        try { fs.copyFileSync(PERSONA_FILE, `${PERSONA_FILE}.bak-${stamp}`) } catch {}
      }
      const tmp = `${PERSONA_FILE}.tmp-${process.pid}`
      fs.writeFileSync(tmp, personaTextFor(tier), 'utf8')
      fs.renameSync(tmp, PERSONA_FILE)

      json(res, 200, { ok: true, sunba: tier, personaFile: PERSONA_FILE })
    })

    if (typeof ctx.on === 'function') {
      ctx.on('dispose', () => { for (const d of disposers) { try { d() } catch {} } })
    }
  },
}
