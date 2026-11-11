"""可配置模型调用。不写密钥，不假装未配置时已经生成。"""

import json
import os
import urllib.error
import urllib.request


class ProviderError(RuntimeError):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


class MockProvider:
    name = "mock"

    def complete(self, messages):
        last = ""
        for item in messages:
            if item.get("role") == "user":
                last = item.get("content") or ""
        if not str(last).strip():
            return ""
        return "按你的要求处理完了。"


class OpenAICompatibleProvider:
    name = "openai"

    def __init__(self, base, key, model, timeout=30):
        self.base = base.rstrip("/")
        self.key = key
        self.model = model
        self.timeout = timeout

    def complete(self, messages):
        payload = json.dumps({
            "model": self.model,
            "messages": messages,
            "temperature": 0.4,
        }).encode("utf-8")
        req = urllib.request.Request(
            f"{self.base}/chat/completions",
            data=payload,
            headers={
                "Authorization": f"Bearer {self.key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                raw = resp.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            raise ProviderError("network", "模型请求失败") from exc
        except urllib.error.URLError as exc:
            raise ProviderError("network", "模型网络不可用") from exc
        try:
            data = json.loads(raw)
            text = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
            raise ProviderError("empty", "模型响应无法读取") from exc
        if not str(text or "").strip():
            raise ProviderError("empty", "模型返回空内容")
        return str(text).strip()


def from_env():
    kind = os.environ.get("MOWAN_PROVIDER", "").strip().lower()
    if not kind:
        raise ProviderError("unconfigured", "未配置模型。设置 MOWAN_PROVIDER=openai 及端点、密钥、模型名后才能生成回复")
    if kind == "mock":
        return MockProvider()
    if kind in ("openai", "compatible"):
        base = os.environ.get("MOWAN_API_BASE", "").strip()
        key = os.environ.get("MOWAN_API_KEY", "").strip()
        model = os.environ.get("MOWAN_MODEL", "").strip()
        if not base or not key or not model:
            raise ProviderError("unconfigured", "缺少 MOWAN_API_BASE、MOWAN_API_KEY 或 MOWAN_MODEL")
        return OpenAICompatibleProvider(base, key, model)
    raise ProviderError("unconfigured", "未知的 MOWAN_PROVIDER")
