/**
 * dsh-bili-whale-persona-toggle — Host 半。
 *
 * 作用：把「鲸鲸人设 skill」做成一个可随时启动/停止的插件。
 *  - 设置 → 鲸鲸 · 人设：总开关（启动/停止）+ 孙吧味档位（off/light/on）
 *  - 启动时：把对应档位的人设写入 ~/.bili-ai/persona.md（dsh-bili-whale 读取的内部通道），
 *            同时通过 ctx.systemPrompt.context() 注入当前会话。
 *  - 停止时：清空 persona.md，并让 systemPrompt 注入返回空。
 *
 * 状态：~/.dsh/bili-whale-persona.json = { enabled: boolean, sunba: "off"|"light"|"on" }
 * 默认：enabled=false, sunba="off"
 *
 * 不碰 dsh-bili-whale 的 node_modules；只写它读取的 persona.md 与本插件自己的状态文件。
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
    return {
      enabled: raw?.enabled === true,
      sunba: TIERS.includes(raw?.sunba) ? raw.sunba : 'off',
      updatedAt: raw?.updatedAt ?? null,
    }
  } catch {
    return { enabled: false, sunba: 'off', updatedAt: null }
  }
}

function writeState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true })
  const body = JSON.stringify({
    enabled: state.enabled === true,
    sunba: TIERS.includes(state.sunba) ? state.sunba : 'off',
    updatedAt: new Date().toISOString(),
  }, null, 2) + '\n'
  const tmp = `${STATE_FILE}.tmp-${process.pid}`
  fs.writeFileSync(tmp, body, { mode: 0o600 })
  fs.renameSync(tmp, STATE_FILE)
}

function personaTextFor(tier) {
  const file = path.join(HERE, 'personas', TIER_FILE[tier] ?? TIER_FILE.off)
  try { return fs.readFileSync(file, 'utf8') } catch { return '' }
}

function writePersonaFile(text) {
  fs.mkdirSync(PERSONA_DIR, { recursive: true })
  if (fs.existsSync(PERSONA_FILE)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    try { fs.copyFileSync(PERSONA_FILE, `${PERSONA_FILE}.bak-${stamp}`) } catch {}
  }
  const tmp = `${PERSONA_FILE}.tmp-${process.pid}`
  fs.writeFileSync(tmp, text, 'utf8')
  fs.renameSync(tmp, PERSONA_FILE)
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

const PROMPT_HEADER = [
  '［鲸鲸人设 · 已启动］',
  '以下是本次会话的角色设定。请以「鲸鲸」的身份和口吻回应。',
  '只改变说话方式与态度，不改变事实、工具结果、权限与安全规则。',
  '详细技能在 00_运营总览/skills/dsh-bili-whale-persona/（SKILL.md 与 references/）。',
  '',
  '---',
  '',
].join('\n')

export default {
  name: 'dsh-bili-whale-persona-toggle',
  inject: ['webServer', 'connection', 'systemPrompt'],
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

    // 当前会话的 systemPrompt 注入（每次组装时读状态，启动/停止即时生效）
    try {
      if (ctx.systemPrompt && typeof ctx.systemPrompt.context === 'function') {
        ctx.effect(() => ctx.systemPrompt.context({
          name: 'bili-whale-persona',
          order: 120,
          text: () => {
            const s = readState()
            if (!s.enabled) return ''
            const body = personaTextFor(s.sunba)
            return body ? PROMPT_HEADER + body : ''
          },
        }), 'bili-whale-persona: prompt context')
      }
    } catch (e) {
      console.warn('[bili-whale-persona] systemPrompt 注入不可用：' + (e?.message ?? e))
    }

    route('exact', '/whale-persona-v2/api/state', async (req, res) => {
      if (req.method !== 'GET') { json(res, 405, { ok: false }); return }
      const state = readState()
      json(res, 200, {
        ok: true,
        enabled: state.enabled,
        sunba: state.sunba,
        updatedAt: state.updatedAt,
        personaFile: PERSONA_FILE,
        personaExists: fs.existsSync(PERSONA_FILE),
        tiers: TIERS,
      })
    })

    route('exact', '/whale-persona-v2/api/set', async (req, res) => {
      if (req.method !== 'POST') { json(res, 405, { ok: false }); return }
      const body = JSON.parse((await readBody(req)) || '{}')
      const current = readState()
      const enabled = typeof body.enabled === 'boolean' ? body.enabled : current.enabled
      const sunba = TIERS.includes(body.sunba) ? body.sunba : current.sunba

      writeState({ enabled, sunba })

      if (enabled) {
        writePersonaFile(personaTextFor(sunba))
      } else {
        writePersonaFile('')
      }

      json(res, 200, { ok: true, enabled, sunba, personaFile: PERSONA_FILE })
    })

    if (typeof ctx.on === 'function') {
      ctx.on('dispose', () => { for (const d of disposers) { try { d() } catch {} } })
    }
  },
}
