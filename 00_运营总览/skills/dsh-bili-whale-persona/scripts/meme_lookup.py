#!/usr/bin/env python3
"""鲸鲸查梗引擎：cnmeme.wiki 公开 API + 像梗才查 + 同词 10 分钟一次 + 缓存。

用法：
  python scripts/meme_lookup.py --text "哈基米是什么梗"
  python scripts/meme_lookup.py --term "哈基米"
  python scripts/meme_lookup.py --text "这剪辑太抽象了" --force
  python scripts/meme_lookup.py --cache-status
  python scripts/meme_lookup.py --clear-cache

规则（按 dsh-memewiki 原版 AstrBot 的思路）：
  1. 像梗才查：问梗句式 / 裸词 / 引号里的词；普通长句默认不查。
  2. 同词 10 分钟一次：缓存 TTL=600 秒，命中缓存不发请求。
  3. 带缓存：~/.dsh/whale-meme-cache.json；失败的查询也会短期缓存，避免重试风暴。
  4. 只读公开 API，不提交任何内容。

输出：JSON（stdout），字段：
  {ok, checked:[{term, found, cached, entry?}], skipped?, reason?}
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

API = "https://cnmeme.wiki/api/v1/public/memes"
CACHE_FILE = os.path.join(os.path.expanduser("~"), ".dsh", "whale-meme-cache.json")
TTL_SECONDS = 600

QUESTION_PATTERNS = [
    r"是什么梗", r"啥梗", r"什么梗", r"梗是什么", r"这梗", r"那个梗",
    r"求科普", r"科普一下", r"出处", r"啥意思", r"什么意思", r"怎么理解",
    r"有人知道吗", r"谁懂", r"是什么", r"干啥的", r"哪来的",
]
STOPWORDS = {"这个", "那个", "什么", "怎么", "为什么", "就是", "不是", "可以", "一个", "没有", "知道", "有没有"}


def load_cache():
    try:
        with open(CACHE_FILE, encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def save_cache(cache):
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    tmp = CACHE_FILE + f".tmp-{os.getpid()}"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=1)
    os.replace(tmp, CACHE_FILE)


def looks_like_meme(text):
    t = (text or "").strip()
    if not t:
        return False
    for p in QUESTION_PATTERNS:
        if re.search(p, t):
            return True
    # 裸词：1-12 个字、无标点、不是停用词
    if len(t) <= 12 and not re.search(r"[，。！？,.!?；;：:\s]", t) and t not in STOPWORDS:
        return True
    return False


def extract_terms(text):
    t = (text or "").strip()
    quoted = re.findall(r"[「“\"‘]([^」”\"’]{1,30})[」”\"’]", t)
    if quoted:
        return [q.strip() for q in quoted if q.strip()]
    candidate = t
    for p in QUESTION_PATTERNS:
        candidate = re.sub(p, "", candidate)
    candidate = re.sub(r"[，。！？,.!?；;：:\s]+", " ", candidate).strip()
    candidate = re.sub(r"^(这个|那个|请问|我想问|问一下|有没有人)", "", candidate).strip()
    # 取第一个短语
    parts = [p for p in candidate.split() if p and p not in STOPWORDS]
    if not parts:
        return []
    return [parts[0][:30]]


def http_json(url, retries=2):
    for i in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={"user-agent": "dsh-whale-persona-meme-lookup"})
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return {"__not_found__": True}
            if e.code in (429, 500, 502, 503, 504) and i < retries:
                time.sleep(1.5 * (i + 1))
                continue
            raise
        except Exception:
            if i < retries:
                time.sleep(1.0 * (i + 1))
                continue
            raise
    raise RuntimeError("重试次数用尽")


def strip_html(html):
    s = str(html or "")
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", "", s)
    s = (s.replace("&nbsp;", " ").replace("&quot;", '"').replace("&apos;", "'")
         .replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&"))
    for n, name in [(r"&#(\d+);", None)]:
        pass
    s = re.sub(r"&#(\d+);", lambda m: chr(int(m.group(1))), s)
    s = re.sub(r"&#x([0-9a-f]+);", lambda m: chr(int(m.group(1), 16)), s, flags=re.I)
    return re.sub(r"\n{3,}", "\n\n", s).strip()


def split_sections(html):
    out = {}
    for m in re.finditer(r"<h2[^>]*>(.*?)</h2>([\s\S]*?)(?=<h2|$)", str(html or ""), re.I):
        title = strip_html(m.group(1)).strip()
        body = strip_html(m.group(2)).strip()
        if title:
            out[title] = body
    return out


def to_entry(item):
    sections = split_sections(item.get("content_html"))
    usage = sections.get("用法", "")
    origin = sections.get("来源", "")
    other = "\n\n".join(f"{k}\n{v}" for k, v in sections.items() if k not in ("用法", "来源") and v)
    return {
        "title": item.get("title") or "",
        "summary": item.get("summary") or "",
        "usage": usage or item.get("usage") or "",
        "origin": origin or item.get("origin") or "",
        "other": other,
        "tags": item.get("tags") if isinstance(item.get("tags"), list) else [],
        "aliases": item.get("aliases") if isinstance(item.get("aliases"), list) else [],
        "updated_at": item.get("updated_at") or "",
        "url": f"https://cnmeme.wiki/meme/{urllib.parse.quote(str(item.get('slug') or item.get('title') or ''))}",
    }


def lookup_term(term, cache, force=False):
    key = term.strip().lower()
    now = time.time()
    hit = cache.get(key)
    if hit and not force and now - float(hit.get("at", 0)) < TTL_SECONDS:
        return {"term": term, "found": bool(hit.get("found")), "cached": True, "entry": hit.get("entry")}

    url = f"{API}/{urllib.parse.quote(term.strip())}"
    try:
        data = http_json(url)
    except Exception as e:
        return {"term": term, "found": False, "cached": False, "error": str(e)[:200]}

    if isinstance(data, dict) and data.get("__not_found__"):
        cache[key] = {"at": now, "found": False, "entry": None}
        return {"term": term, "found": False, "cached": False, "entry": None}

    item = data.get("item") if isinstance(data, dict) and isinstance(data.get("item"), dict) else data
    entry = to_entry(item if isinstance(item, dict) else {})
    found = bool(entry["title"])
    cache[key] = {"at": now, "found": found, "entry": entry if found else None}
    return {"term": term, "found": found, "cached": False, "entry": entry if found else None}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--text")
    ap.add_argument("--term")
    ap.add_argument("--force", action="store_true", help="忽略缓存强制查询")
    ap.add_argument("--cache-status", action="store_true")
    ap.add_argument("--clear-cache", action="store_true")
    args = ap.parse_args()

    if args.clear_cache:
        try:
            os.remove(CACHE_FILE)
        except FileNotFoundError:
            pass
        print(json.dumps({"ok": True, "cleared": True}, ensure_ascii=False))
        return 0
    if args.cache_status:
        c = load_cache()
        now = time.time()
        fresh = sum(1 for v in c.values() if now - float(v.get("at", 0)) < TTL_SECONDS)
        print(json.dumps({"ok": True, "file": CACHE_FILE, "entries": len(c), "fresh": fresh, "ttl": TTL_SECONDS}, ensure_ascii=False, indent=1))
        return 0

    if args.term:
        terms = [args.term.strip()]
        skipped = False
        reason = None
    elif args.text is not None:
        if not looks_like_meme(args.text):
            print(json.dumps({"ok": True, "skipped": True, "reason": "不像在问梗/说梗，未查", "checked": []}, ensure_ascii=False, indent=1))
            return 0
        terms = extract_terms(args.text)
        skipped = False
        reason = None
        if not terms:
            print(json.dumps({"ok": True, "skipped": True, "reason": "没提取到可查的词", "checked": []}, ensure_ascii=False, indent=1))
            return 0
    else:
        ap.error("需要 --text 或 --term（或 --cache-status / --clear-cache）")

    cache = load_cache()
    checked = [lookup_term(t, cache, force=args.force) for t in terms]
    save_cache(cache)
    out = {"ok": True, "skipped": skipped, "reason": reason, "checked": checked, "cache_ttl": TTL_SECONDS}
    print(json.dumps(out, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
