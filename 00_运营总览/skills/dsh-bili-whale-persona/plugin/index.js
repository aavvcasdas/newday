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
const PERSONA_FILE = path.join(HOME, '.dsh', 'whale-persona-skill.md')
const REVIEW_FILE = path.join(HOME, '.dsh', 'whale-review-queue.json')
const TIERS = ['off', 'light', 'on']
const TIER_FILE = { off: 'neutral.md', light: 'light.md', on: 'sunba.md' }
const SKILL_ROOT = path.join(HERE, '..')

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

/**
 * 从 skill 本体拼出「她内部会话」要读的人设：
 * 档位角色卡 + 黑话说话法 + 伦理边界 + 发言门禁。
 * 不读 ~/.bili-ai/persona.md（原装那条通道已弃用）。
 */
function skillBundleFor(tier) {
  const parts = []
  const tierText = personaTextFor(tier)
  if (tierText) parts.push(`# 当前档位角色卡\n\n${tierText}`)
  for (const rel of ['references/black-talk.md', 'references/boundaries.md', 'references/gate.md']) {
    try {
      const txt = fs.readFileSync(path.join(SKILL_ROOT, rel), 'utf8')
      parts.push(`\n\n# 技能文件：${rel}\n\n${txt}`)
    } catch {}
  }
  return parts.join('\n')
}

function writePersonaFile(text) {
  fs.mkdirSync(path.dirname(PERSONA_FILE), { recursive: true })
  if (fs.existsSync(PERSONA_FILE)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    try { fs.copyFileSync(PERSONA_FILE, `${PERSONA_FILE}.bak-${stamp}`) } catch {}
  }
  const tmp = `${PERSONA_FILE}.tmp-${process.pid}`
  fs.writeFileSync(tmp, text, 'utf8')
  fs.renameSync(tmp, PERSONA_FILE)
}

function readReview() {
  try {
    const d = JSON.parse(fs.readFileSync(REVIEW_FILE, 'utf8'))
    return d && typeof d === 'object' && Array.isArray(d.items) ? d : { mode: 'review-only', items: [] }
  } catch {
    return { mode: 'review-only', items: [] }
  }
}

function writeReview(data) {
  fs.mkdirSync(path.dirname(REVIEW_FILE), { recursive: true })
  const tmp = `${REVIEW_FILE}.tmp-${process.pid}`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 1), 'utf8')
  fs.renameSync(tmp, REVIEW_FILE)
}

function reviewCounts(items) {
  const c = { pending: 0, approved: 0, skipped: 0, total: items.length }
  for (const it of items) c[it.status] = (c[it.status] || 0) + 1
  return c
}

// ── 黑话引擎：cnmeme.wiki 公开 API（像梗才查 / 同词 10 分钟一次 / 带缓存）──
const MEME_API = 'https://cnmeme.wiki/api/v1/public/memes'
const MEME_CACHE_FILE = path.join(HOME, '.dsh', 'whale-meme-cache.json')
const MEME_TTL = 600
const QUESTION_RE = /(是什么梗|啥梗|什么梗|梗是什么|这梗|那个梗|求科普|科普一下|出处|啥意思|什么意思|怎么理解|有人知道吗|谁懂|是什么|干啥的|哪来的)/

function readMemeCache() {
  try { const o = JSON.parse(fs.readFileSync(MEME_CACHE_FILE, 'utf8')); return o && typeof o === 'object' ? o : {} } catch { return {} }
}
function writeMemeCache(cache) {
  try {
    fs.mkdirSync(path.dirname(MEME_CACHE_FILE), { recursive: true })
    const tmp = `${MEME_CACHE_FILE}.tmp-${process.pid}`
    fs.writeFileSync(tmp, JSON.stringify(cache, null, 1), 'utf8')
    fs.renameSync(tmp, MEME_CACHE_FILE)
  } catch {}
}
function looksLikeMeme(text) {
  const t = String(text || '').trim()
  if (!t) return false
  if (QUESTION_RE.test(t)) return true
  return t.length <= 12 && !/[，。！？,.!?；;：:\s]/.test(t)
}
function extractMemeTerms(text) {
  const t = String(text || '').trim()
  const quoted = [...t.matchAll(/[「“"‘]([^」”"’]{1,30})[」”"’]/g)].map(m => m[1].trim()).filter(Boolean)
  if (quoted.length) return quoted
  let c = t
  c = c.replace(QUESTION_RE, '')
  c = c.replace(/[，。！？,.!?；;：:\s]+/g, ' ').trim()
  c = c.replace(/^(这个|那个|请问|我想问|问一下|有没有人)/, '').trim()
  const parts = c.split(/\s+/).filter(Boolean)
  return parts.length ? [parts[0].slice(0, 30)] : []
}
function stripHtml(html) {
  let s = String(html || '')
  s = s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
  s = s.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  s = s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  return s.replace(/\n{3,}/g, '\n\n').trim()
}
function splitSections(html) {
  const out = {}
  const re = /<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2|$)/gi
  let m
  while ((m = re.exec(String(html || '')))) {
    const title = stripHtml(m[1]).trim()
    if (title) out[title] = stripHtml(m[2]).trim()
  }
  return out
}
async function fetchMemeJson(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'dsh-bili-whale-persona' }, signal: AbortSignal.timeout(20000) })
      if (r.status === 404) return { __not_found__: true }
      if ([429, 500, 502, 503, 504].includes(r.status) && i < retries) { await new Promise(x => setTimeout(x, 1500 * (i + 1))); continue }
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return await r.json()
    } catch (e) {
      if (i >= retries) throw e
      await new Promise(x => setTimeout(x, 1000 * (i + 1)))
    }
  }
  throw new Error('retry exhausted')
}
async function lookupMeme({ text, term, force } = {}) {
  let terms = []
  let skipped = false
  let reason = null
  if (term) terms = [String(term).trim()]
  else {
    if (!looksLikeMeme(text)) return { ok: true, skipped: true, reason: '不像在问梗/说梗，未查', checked: [] }
    terms = extractMemeTerms(text)
    if (!terms.length) return { ok: true, skipped: true, reason: '没提取到可查的词', checked: [] }
  }
  const cache = readMemeCache()
  const now = Date.now() / 1000
  const checked = []
  for (const t of terms) {
    const key = t.toLowerCase()
    const hit = cache[key]
    if (hit && !force && now - Number(hit.at || 0) < MEME_TTL) {
      checked.push({ term: t, found: !!hit.found, cached: true, entry: hit.entry || null })
      continue
    }
    try {
      const data = await fetchMemeJson(`${MEME_API}/${encodeURIComponent(t)}`)
      if (data && data.__not_found__) {
        cache[key] = { at: now, found: false, entry: null }
        checked.push({ term: t, found: false, cached: false, entry: null })
        continue
      }
      const item = data && data.item && typeof data.item === 'object' ? data.item : data
      const sections = splitSections(item?.content_html)
      const entry = {
        title: item?.title || '',
        summary: item?.summary || '',
        usage: sections['用法'] || item?.usage || '',
        origin: sections['来源'] || item?.origin || '',
        tags: Array.isArray(item?.tags) ? item.tags : [],
        aliases: Array.isArray(item?.aliases) ? item.aliases : [],
      }
      const found = !!entry.title
      cache[key] = { at: now, found, entry: found ? entry : null }
      checked.push({ term: t, found, cached: false, entry: found ? entry : null })
    } catch (e) {
      checked.push({ term: t, found: false, cached: false, error: String(e?.message ?? e).slice(0, 200) })
    }
  }
  writeMemeCache(cache)
  return { ok: true, skipped, reason, checked, cache_ttl: MEME_TTL }
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
  inject: ['webServer', 'connection', 'systemPrompt', 'tools'],
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

    // 查梗工具：像梗才查 / 同词 10 分钟一次 / 带缓存
    try {
      if (ctx.tools && typeof ctx.tools.register === 'function') {
        ctx.effect(() => ctx.tools.register({
          name: 'whale_meme_lookup',
          description: '查 cnmeme.wiki 公开梗库。像梗才查、同词 10 分钟一次、带缓存。输入 text（原句）或 term（词）。写黑话评论前用它；查不到就不硬接。',
          parameters: {
            type: 'object',
            properties: {
              text: { type: 'string', description: '原句，例如「哈基米是什么梗」' },
              term: { type: 'string', description: '直接指定要查的词，例如「电子榨菜」' },
              force: { type: 'boolean', description: '忽略缓存强制查询' },
            },
            additionalProperties: false,
          },
          output: {
            schema: { type: 'object', additionalProperties: true },
            render(args, value) { return [{ type: 'text', text: JSON.stringify(value) }] },
          },
          async execute(args) { return await lookupMeme(args || {}) },
        }), 'bili-whale-persona: meme lookup tool')
      }
    } catch (e) {
      console.warn('[bili-whale-persona] 查梗工具注册失败：' + (e?.message ?? e))
    }

    route('exact', '/whale-persona-v4/api/state', async (req, res) => {
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

    route('exact', '/whale-persona-v4/api/set', async (req, res) => {
      if (req.method !== 'POST') { json(res, 405, { ok: false }); return }
      const body = JSON.parse((await readBody(req)) || '{}')
      const current = readState()
      const enabled = typeof body.enabled === 'boolean' ? body.enabled : current.enabled
      const sunba = TIERS.includes(body.sunba) ? body.sunba : current.sunba

      writeState({ enabled, sunba })

      if (enabled) {
        writePersonaFile(skillBundleFor(sunba))
      } else {
        writePersonaFile('')
      }

      json(res, 200, { ok: true, enabled, sunba, personaFile: PERSONA_FILE })
    })

    // ── 评论审核：只审不发 ──
    route('exact', '/whale-persona-v4/api/review', async (req, res) => {
      if (req.method === 'GET') {
        const data = readReview()
        json(res, 200, {
          ok: true,
          mode: 'review-only',
          file: REVIEW_FILE,
          counts: reviewCounts(data.items),
          items: data.items,
        })
        return
      }
      if (req.method !== 'POST') { json(res, 405, { ok: false }); return }
      const body = JSON.parse((await readBody(req)) || '{}')
      const data = readReview()
      const it = data.items.find(x => String(x.id) === String(body.id))
      if (!it) { json(res, 404, { ok: false, error: '找不到这条评论' }); return }
      const action = String(body.action || '')
      if (typeof body.draft === 'string' && body.draft.trim()) it.draft = body.draft.trim().slice(0, 500)
      if (action === 'approve') it.status = 'approved'
      else if (action === 'skip') it.status = 'skipped'
      else if (action === 'reset') it.status = 'pending'
      else if (action !== 'update') { json(res, 400, { ok: false, error: 'action 须为 approve/skip/reset/update' }); return }
      it.updatedAt = new Date().toISOString()
      writeReview(data)
      json(res, 200, { ok: true, mode: 'review-only', counts: reviewCounts(data.items), item: it })
    })

    if (typeof ctx.on === 'function') {
      ctx.on('dispose', () => { for (const d of disposers) { try { d() } catch {} } })
    }
  },
}
