"""只读记忆目录。不创建、不改写、不重建任何已有记录。"""

from pathlib import Path

# 稳定命名空间。ID 用相对路径，不新建空库，也不改旧文件。
NAMESPACE = "ops-notes"
INDEXED = (
    "00_运营总览/连续更新记忆.md",
    "agent.md",
    "00_运营总览/风格_黑话放开_2026-10-28.md",
)


def memory_id(rel):
    return f"{NAMESPACE}:{rel}"


def indexed_paths(root):
    base = Path(root)
    found = []
    for rel in INDEXED:
        path = base / rel
        if path.is_file():
            found.append((rel, path))
    return found


def snapshot(root):
    """迁移核对用：只含 id、大小、时间。不含正文。"""
    rows = []
    for rel, path in indexed_paths(root):
        stat = path.stat()
        rows.append({
            "id": memory_id(rel),
            "namespace": NAMESPACE,
            "bytes": stat.st_size,
            "mtime_ns": stat.st_mtime_ns,
        })
    return rows


def _headings(text):
    heads = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            heads.append(stripped.lstrip("#").strip())
    return heads


def _interests(text):
    found = []
    for line in text.splitlines():
        stripped = line.strip()
        for prefix in ("兴趣：", "兴趣:"):
            if stripped.startswith(prefix):
                value = stripped[len(prefix):].strip()
                if value:
                    found.append(value)
    return found


def retrieve(root, query, limit=3):
    """按标题相关性取旧记录。失败时抛错，不改文件。"""
    hits = []
    interests = []
    try:
        files = indexed_paths(root)
    except OSError as exc:
        raise RuntimeError("记忆目录不可读") from exc
    if not files:
        raise RuntimeError("记忆目录为空，拒绝新建替代库")
    needle = query or ""
    for rel, path in files:
        try:
            text = path.read_text(encoding="utf-8")
        except OSError as exc:
            raise RuntimeError("记忆检索失败") from exc
        interests.extend(_interests(text))
        for head in _headings(text):
            score = 1 if head and head in needle else 0
            if score:
                hits.append({
                    "id": memory_id(rel),
                    "namespace": NAMESPACE,
                    "heading": head[:40],
                })
    hits.sort(key=lambda row: row["id"])
    return {
        "hits": hits[:limit],
        "interests": list(dict.fromkeys(interests)),
        "count": len(files),
    }
