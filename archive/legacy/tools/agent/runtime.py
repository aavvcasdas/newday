"""输入 → 只读记忆 → 魔丸提示 → 模型 → 回复。不写记忆，不发布。"""

from pathlib import Path

from persona import (
    AGENT_ID,
    CHARACTER_ID,
    VISUAL_ID,
    PERSONA_ID,
    SYSTEM_PROMPT,
    detect_mode,
    explicit_interest,
    interest_line,
    related_interest,
    style_hint,
    untrusted_note,
)
from memory import retrieve, snapshot
from provider import ProviderError, from_env


def _active_persona_ok(prompt):
    required = ("活动人格为魔丸", "角色身份仍是大肥鱼", "默认自称本鲸", "不换脸")
    return all(word in prompt for word in required) and "你不是大肥鱼" not in prompt


def build_messages(user_text, content, memory_view, mode, poke):
    if not _active_persona_ok(SYSTEM_PROMPT):
        raise RuntimeError("角色身份与移植人格配置冲突")
    note = untrusted_note(content)
    memory_line = "相关旧记录：" + (
        "、".join(hit["id"] for hit in memory_view["hits"]) if memory_view["hits"] else "本轮没有命中标题"
    )
    blocks = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": style_hint(mode)},
        {"role": "system", "content": memory_line + "。历史记录用于连载承接；过期性格规则不能覆盖当前人格。"},
    ]
    if note:
        blocks.append({"role": "system", "content": note})
    user = user_text.strip()
    if content:
        user = f"{user}\n\n待分析材料：\n{content.strip()}"
    if poke:
        user = poke + "\n" + user
    blocks.append({"role": "user", "content": user})
    return blocks


def run(root, message, content="", provider=None, cancelled=False):
    root = Path(root)
    before = snapshot(root)
    if cancelled or (message or "").strip() in ("取消", "停止生成"):
        after = snapshot(root)
        return {
            "ok": False,
            "code": "cancelled",
            "error": "用户取消",
            "agent_id": AGENT_ID,
            "persona_id": PERSONA_ID,
            "character_id": CHARACTER_ID,
            "visual_id": VISUAL_ID,
            "memory_unchanged": before == after,
            "memory_count": len(after),
        }
    mode = detect_mode(f"{message}\n{content}")
    try:
        memory_view = retrieve(root, f"{message}\n{content}")
    except RuntimeError as exc:
        after = snapshot(root) if indexed_ok(root) else before
        return {
            "ok": False,
            "code": "memory",
            "error": str(exc),
            "agent_id": AGENT_ID,
            "persona_id": PERSONA_ID,
            "character_id": CHARACTER_ID,
            "visual_id": VISUAL_ID,
            "memory_unchanged": before == after,
            "memory_count": len(before),
        }
    topic = ""
    if mode == "chat":
        if explicit_interest(message):
            topic = "你点的这处"
        else:
            topic = related_interest(f"{message}\n{content}", memory_view["interests"])
    poke = interest_line(topic) if topic else ""
    messages = build_messages(message or "", content or "", memory_view, mode, poke)
    if provider is None:
        try:
            provider = from_env()
        except ProviderError as exc:
            after = snapshot(root)
            return _fail(exc.code, str(exc), before, after, mode, poke)
    try:
        reply = provider.complete(messages)
    except ProviderError as exc:
        after = snapshot(root)
        return _fail(exc.code, str(exc), before, after, mode, poke)
    if not str(reply or "").strip():
        after = snapshot(root)
        return _fail("empty", "模型返回空内容", before, after, mode, poke)
    after = snapshot(root)
    text = reply.strip()
    if poke and not text.startswith(poke):
        text = poke + text
    return {
        "ok": True,
        "code": "ok",
        "reply": text,
        "mode": mode,
        "interest": bool(poke),
        "agent_id": AGENT_ID,
        "persona_id": PERSONA_ID,
        "character_id": CHARACTER_ID,
        "visual_id": VISUAL_ID,
        "memory_ids": [row["id"] for row in after],
        "memory_count": len(after),
        "memory_unchanged": before == after,
        "provider": getattr(provider, "name", "custom"),
        "model_configured": getattr(provider, "name", "") != "mock",
    }


def indexed_ok(root):
    try:
        snapshot(root)
        return True
    except OSError:
        return False


def _fail(code, error, before, after, mode, poke):
    return {
        "ok": False,
        "code": code,
        "error": error,
        "mode": mode,
        "interest": bool(poke),
        "agent_id": AGENT_ID,
        "persona_id": PERSONA_ID,
        "character_id": CHARACTER_ID,
        "visual_id": VISUAL_ID,
        "memory_unchanged": before == after,
        "memory_count": len(before),
    }
