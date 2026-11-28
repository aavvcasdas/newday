/** 设置 → 鲸鲸 · 自动回复：一键开关。 */
window.__ModuleLoader__.load({
  id: "dafy-auto-reply-toggle",
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");
    const { createElement: h, useCallback, useEffect, useState } = React;
    const API = new URL("dafy-auto-reply/api", document.baseURI).pathname;

    const CSS_TAG = "dafy-auto-reply-toggle/section.css";
    const CSS = [
      ".dar{font-size:14px;line-height:1.5;max-width:720px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:10px}",
      ".dar-title{margin:0;font-weight:500;line-height:24px}",
      ".dar-intro{color:var(--dsw-alias-label-tertiary);margin:0;line-height:20px}",
      ".dar-row{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:12px;display:flex;justify-content:space-between;align-items:center;gap:12px}",
      ".dar-state{font-weight:600}",
      ".dar-on{color:#2ecc71}", ".dar-off{color:#e74c3c}",
      ".dar-hint{color:var(--dsw-alias-label-tertiary);line-height:17px}",
      ".dar-actions{display:flex;gap:8px;align-items:center;margin-top:6px}",
      ".dar-btn{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-foreground,#fff);border:none;border-radius:6px;height:30px;padding:0 12px;cursor:pointer}",
      ".dar-btn2{background:transparent;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}",
      ".dar-err{color:var(--dsw-alias-state-error-primary)}",
      ".dar-switch{position:relative;width:46px;height:26px;border-radius:999px;background:rgba(127,127,127,.3);cursor:pointer;transition:.2s}",
      ".dar-switch.dar-checked{background:#2ecc71}",
      ".dar-knob{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:.2s}",
      ".dar-switch.dar-checked .dar-knob{left:23px}",
    ];
    if (typeof document !== "undefined" && !document.querySelector(`style[data-tag="${CSS_TAG}"]`)) {
      const s = document.createElement("style");
      s.dataset.tag = CSS_TAG; s.textContent = CSS.join("\n"); document.head.appendChild(s);
    }

    function Section() {
      const [enabled, setEnabled] = useState(true);
      const [watchCount, setWatchCount] = useState(0);
      const [lastSeen, setLastSeen] = useState(null);
      const [loading, setLoading] = useState(true);
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState("");
      const [msg, setMsg] = useState("");

      const load = useCallback(async () => {
        setLoading(true); setErr("");
        try {
          const r = await fetch(`${API}/state`, { headers: { accept: "application/json" } });
          const j = await r.json();
          if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
          setEnabled(!!j.enabled); setWatchCount(j.watchCount || 0); setLastSeen(j.lastSeen);
        } catch (e) { setErr(`读取失败：${e.message || e}`) } finally { setLoading(false) }
      }, []);
      useEffect(() => { load(); }, [load]);

      const apply = useCallback(async (next) => {
        setBusy(true); setErr(""); setMsg("");
        try {
          const r = await fetch(`${API}/set`, {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ enabled: next }),
          });
          const j = await r.json();
          if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
          setEnabled(!!j.enabled); setMsg(next ? "已开启自动回复" : "已关闭自动回复");
        } catch (e) { setErr(`保存失败：${e.message || e}`) } finally { setBusy(false) }
      }, []);

      const fmt = ts => ts ? new Date(ts * 1000).toLocaleString() : "—";

      return h("div", { className: "dar" },
        h("h3", { className: "dar-title" }, "鲸鲸 · 自动回复"),
        h("p", { className: "dar-intro" }, "一键开关 B 站评论自动回复。关闭后只推进水位、不回复；重新打开不会补发关闭期间的历史评论。"),
        h("div", { className: "dar-row" },
          h("div", null,
            h("div", { className: `dar-state ${enabled ? "dar-on" : "dar-off"}` }, loading ? "读取中…" : enabled ? "自动回复：开" : "自动回复：关"),
            h("div", { className: "dar-hint" }, `监控视频 ${watchCount} 个 · 水位 ${fmt(lastSeen)}`),
          ),
          h("div", { className: `dar-switch ${enabled ? "dar-checked" : ""}`, onClick: () => !busy && !loading && apply(!enabled), role: "switch", "aria-checked": enabled },
            h("div", { className: "dar-knob" }),
          ),
        ),
        h("div", { className: "dar-actions" },
          h("button", { className: "dar-btn dar-btn2", onClick: load, disabled: busy }, "刷新"),
          h("span", { className: "dar-hint" }, "调度器每 60 秒读一次开关，改完立即生效（首次装插件需重启 DSH）。"),
        ),
        err ? h("div", { className: "dar-err" }, err) : null,
        msg ? h("div", { className: "dar-hint" }, msg) : null,
      );
    }

    const inject = ["slots"];
    const NS = "dafy-auto-reply";
    function apply(ctx) {
      ctx.effect(
        () => ctx.slots.inject("settings.section", () => ctx.slots.register(
          { name: "settings.section", id: NS, order: 9, label: () => "鲸鲸 · 自动回复" },
          Section,
        ), "dafy-auto-reply: settings section"),
        "dafy-auto-reply: settings section",
      );
    }
    exports.apply = apply;
    exports.inject = inject;
    exports.Section = Section;
    return module.exports;
  },
});
