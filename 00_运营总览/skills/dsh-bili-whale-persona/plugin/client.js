/** 设置 → 鲸鲸 · 人设：孙吧味档位开关。 */
window.__ModuleLoader__.load({
  id: "dsh-bili-whale-persona-toggle",
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");
    const { createElement: h, useCallback, useEffect, useState } = React;

    const API = new URL("whale-persona-v4/api", document.baseURI).pathname;

    const CSS_TAG = "dsh-bili-whale-persona-toggle/section.css";
    const CSS = [
      ".bwp{font-size:14px;line-height:1.5;max-width:760px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:10px}",
      ".bwp-title{margin:0;font-weight:500;line-height:24px}",
      ".bwp-intro{color:var(--dsw-alias-label-tertiary);margin:0;line-height:20px}",
      ".bwp-row{display:flex;flex-direction:column;gap:6px;padding:10px 0;border-bottom:.5px solid var(--dsw-alias-border-l2)}",
      ".bwp-label{line-height:19px;font-weight:500}",
      ".bwp-hint{color:var(--dsw-alias-label-tertiary);line-height:17px}",
      ".bwp-choices{display:flex;flex-direction:column;gap:8px;margin-top:6px}",
      ".bwp-choice{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;cursor:pointer}",
      ".bwp-choice.bwp-on{border-color:var(--dsw-alias-brand-primary)}",
      ".bwp-dot{margin-top:2px}",
      ".bwp-name{line-height:19px}",
      ".bwp-desc{color:var(--dsw-alias-label-tertiary);line-height:17px;margin-top:2px}",
      ".bwp-actions{display:flex;gap:8px;align-items:center;margin-top:4px}",
      ".bwp-btn{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-foreground,#fff);border:none;border-radius:6px;height:30px;padding:0 12px;cursor:pointer}",
      ".bwp-btn:disabled{opacity:.5;cursor:default}",
      ".bwp-btn2{background:transparent;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}",
      ".bwp-out{white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;line-height:17px;color:var(--dsw-alias-label-secondary);background:rgba(127,127,127,.08);border-radius:8px;padding:10px 12px;max-height:200px;overflow:auto}",
      ".bwp-err{color:var(--dsw-alias-state-error-primary);line-height:18px;white-space:pre-line}",
      ".bwr{font-size:14px;line-height:1.5;max-width:820px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:10px}",
      ".bwr-title{margin:0;font-weight:500;line-height:24px}",
      ".bwr-intro{color:var(--dsw-alias-label-tertiary);margin:0;line-height:20px}",
      ".bwr-banner{background:rgba(255,176,32,.12);border:1px solid rgba(255,176,32,.35);border-radius:8px;padding:8px 12px;line-height:18px}",
      ".bwr-counts{display:flex;gap:14px;flex-wrap:wrap;color:var(--dsw-alias-label-secondary)}",
      ".bwr-filters{display:flex;gap:6px;flex-wrap:wrap}",
      ".bwr-tab{border:1px solid var(--dsw-alias-border-l2);background:transparent;border-radius:999px;height:26px;padding:0 10px;cursor:pointer;color:var(--dsw-alias-label-primary)}",
      ".bwr-tab.bwr-active{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-foreground,#fff);border-color:transparent}",
      ".bwr-item{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:8px}",
      ".bwr-meta{display:flex;justify-content:space-between;gap:10px;color:var(--dsw-alias-label-tertiary);line-height:17px}",
      ".bwr-text{line-height:20px;white-space:pre-wrap}",
      ".bwr-draft{width:100%;box-sizing:border-box;background:transparent;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:8px;color:var(--dsw-alias-label-primary);font-family:inherit;line-height:1.6;resize:vertical;min-height:56px}",
      ".bwr-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}",
      ".bwr-status{font-size:12px;padding:0 8px;border-radius:999px;line-height:20px}",
      ".bwr-status.pending{background:rgba(127,127,127,.16)}",
      ".bwr-status.approved{background:rgba(46,204,113,.2)}",
      ".bwr-status.skipped{background:rgba(231,76,60,.18)}",
      ".bwr-link{color:var(--dsw-alias-brand-primary);text-decoration:none}",
    ];

    if (typeof document !== "undefined" && !document.querySelector(`style[data-tag="${CSS_TAG}"]`)) {
      const style = document.createElement("style");
      style.dataset.tag = CSS_TAG;
      style.textContent = CSS.join("\n");
      document.head.appendChild(style);
    }

    const TIERS = [
      { value: "off", name: "中性（默认）", desc: "损友但友好，会吐槽、有立场、短句带梗，不阴阳、不设局、不搞抽象对线。" },
      { value: "light", name: "轻损", desc: "加一点「鉴定」式短评，损事不损人，点到为止。" },
      { value: "on", name: "孙吧全损（备用）", desc: "只加载去攻击子集：鉴定体/抽象词/自嘲。骂人、人身攻击、真人梗、地域梗一律不加载。" },
    ];

    function WhalePersonaSection() {
      const [enabled, setEnabled] = useState(false);
      const [sunba, setSunba] = useState("off");
      const [personaFile, setPersonaFile] = useState("");
      const [personaExists, setPersonaExists] = useState(false);
      const [loading, setLoading] = useState(true);
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState("");
      const [out, setOut] = useState("");

      const load = useCallback(async () => {
        setLoading(true); setErr("");
        try {
          const r = await fetch(`${API}/state`, { headers: { accept: "application/json" } });
          const j = await r.json();
          if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
          setSunba(j.sunba || "off");
          setEnabled(!!j.enabled);
          setPersonaFile(j.personaFile || "");
          setPersonaExists(!!j.personaExists);
        } catch (e) {
          setErr(`读取失败：${e.message || e}`);
        } finally {
          setLoading(false);
        }
      }, []);

      useEffect(() => { load(); }, [load]);

      const apply = useCallback(async () => {
        setBusy(true); setErr(""); setOut("");
        try {
          const r = await fetch(`${API}/set`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ enabled, sunba }),
          });
          const j = await r.json();
          if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
          setOut(`${enabled ? "已启动人设" : "已停止人设"}｜档位：${sunba}\n写入：${j.personaFile}`);
          setPersonaExists(true);
          setPersonaFile(j.personaFile);
        } catch (e) {
          setErr(`应用失败：${e.message || e}`);
        } finally {
          setBusy(false);
        }
      }, [enabled, sunba]);

      return h("div", { className: "bwp" },
        h("h3", { className: "bwp-title" }, "鲸鲸 · 人设（skill 插件）"),
        h("p", { className: "bwp-intro" },
          "人设来自 skill，不再写在 B 站插件里。总开关可以随时启动/停止；孙吧味是档位，默认关闭。"),

        h("div", { className: "bwp-row" },
          h("div", { className: "bwp-label" }, "人设总开关"),
          h("div", { className: "bwp-hint" },
            loading ? "读取中…" : enabled ? "已启动：她按当前档位说话（当前会话与她的内部会话都会带上）" : "已停止：不注入任何人设"),
          h("div", { className: "bwp-choices" },
            h("label", { className: `bwp-choice${enabled ? " bwp-on" : ""}` },
              h("input", {
                className: "bwp-dot",
                type: "checkbox",
                checked: enabled,
                onChange: (e) => setEnabled(!!e.target.checked),
              }),
              h("span", null,
                h("div", { className: "bwp-name" }, "启动鲸鲸人设"),
                h("div", { className: "bwp-desc" }, "打开＝按下面档位加载 skill 人设；关闭＝完全不加载。"),
              ),
            ),
          ),
        ),

        h("div", { className: "bwp-row" },
          h("div", { className: "bwp-label" }, "孙吧味档位"),
          h("div", { className: "bwp-hint" }, loading ? "读取中…" : `当前：${sunba}`),
          h("div", { className: "bwp-choices" },
            ...TIERS.map((t) => h("label", {
              key: t.value,
              className: `bwp-choice${sunba === t.value ? " bwp-on" : ""}`,
            },
              h("input", {
                className: "bwp-dot",
                type: "radio",
                name: "sunba-tier",
                value: t.value,
                checked: sunba === t.value,
                onChange: () => setSunba(t.value),
              }),
              h("span", null,
                h("div", { className: "bwp-name" }, t.name),
                h("div", { className: "bwp-desc" }, t.desc),
              ),
            )),
          ),
        ),

        h("div", { className: "bwp-row" },
          h("div", { className: "bwp-label" }, "她读取的人设文件"),
          h("div", { className: "bwp-hint" }, personaFile || "（未检测到 skill 生成文件）"),
          h("div", { className: "bwp-hint" },
            !enabled ? "停止状态下写入空内容（她不会带人设）。" : personaExists ? "文件存在，应用时会先自动备份。" : "文件不存在，应用时会创建。"),
        ),

        h("div", { className: "bwp-actions" },
          h("button", { className: "bwp-btn", onClick: apply, disabled: busy || loading },
            busy ? "应用中…" : "应用"),
          h("button", { className: "bwp-btn bwp-btn2", onClick: load, disabled: busy }, "重新读取"),
        ),

        err ? h("div", { className: "bwp-err" }, err) : null,
        out ? h("div", { className: "bwp-out" }, out) : null,
        h("div", { className: "bwp-hint" },
          "档位同时记录在 ~/.dsh/bili-whale-persona.json，供 agent 与 skill 读取。"),
      );
    }

    function ReviewSection() {
      const [items, setItems] = useState([]);
      const [counts, setCounts] = useState({});
      const [loading, setLoading] = useState(true);
      const [busy, setBusy] = useState("");
      const [err, setErr] = useState("");
      const [filter, setFilter] = useState("pending");
      const [out, setOut] = useState("");

      const load = useCallback(async () => {
        setLoading(true); setErr("");
        try {
          const r = await fetch(`${API}/review`, { headers: { accept: "application/json" } });
          const j = await r.json();
          if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
          setItems(j.items || []);
          setCounts(j.counts || {});
        } catch (e) {
          setErr(`读取失败：${e.message || e}`);
        } finally {
          setLoading(false);
        }
      }, []);

      useEffect(() => { load(); }, [load]);

      const act = useCallback(async (item, action) => {
        setBusy(item.id); setErr(""); setOut("");
        try {
          const r = await fetch(`${API}/review`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: item.id, action, draft: item.draft }),
          });
          const j = await r.json();
          if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
          setCounts(j.counts || {});
          setItems((arr) => arr.map((x) => String(x.id) === String(item.id) ? { ...x, status: j.item.status, draft: j.item.draft } : x));
          setOut(action === "approve" ? "已标记通过（审核模式：没有发送）" : action === "skip" ? "已跳过" : "已重置为待审");
        } catch (e) {
          setErr(`操作失败：${e.message || e}`);
        } finally {
          setBusy("");
        }
      }, []);

      const shown = items.filter((x) => filter === "all" ? true : (x.status || "pending") === filter);
      const tab = (key, label) => h("button", {
        className: `bwr-tab${filter === key ? " bwr-active" : ""}`,
        onClick: () => setFilter(key),
      }, label);

      return h("div", { className: "bwr" },
        h("h3", { className: "bwr-title" }, "评论审核（全损黑话）"),
        h("p", { className: "bwr-intro" }, "审核模式：这里只做决定，不会发送任何内容。通过 = 排队待发，仍需下一步确认。"),
        h("div", { className: "bwr-banner" }, "⚠️ 当前为审核模式：所有草稿都不会发到 B 站。"),
        h("div", { className: "bwr-counts" },
          h("span", null, `共 ${counts.total || 0} 条`),
          h("span", null, `待审 ${counts.pending || 0}`),
          h("span", null, `已通过 ${counts.approved || 0}`),
          h("span", null, `已跳过 ${counts.skipped || 0}`),
        ),
        h("div", { className: "bwr-filters" },
          tab("pending", "待审"), tab("approved", "已通过"), tab("skipped", "已跳过"), tab("all", "全部"),
          h("button", { className: "bwr-tab", onClick: load }, loading ? "刷新中…" : "刷新"),
        ),
        err ? h("div", { className: "bwp-err" }, err) : null,
        out ? h("div", { className: "bwp-hint" }, out) : null,
        loading ? h("div", { className: "bwp-hint" }, "读取中…") : null,
        shown.length === 0 ? h("div", { className: "bwp-hint" }, "没有符合条件的评论。") : null,
        ...shown.map((it) => h("div", { className: "bwr-item", key: it.id },
          h("div", { className: "bwr-meta" },
            h("span", null, `${it.who || "匿名"} · ${String(it.time || "").replace("T", " ").slice(0, 16)}`),
            h("span", { className: `bwr-status ${it.status || "pending"}` }, it.status === "approved" ? "已通过" : it.status === "skipped" ? "已跳过" : "待审"),
          ),
          h("div", { className: "bwr-text" }, it.text),
          h("textarea", {
            className: "bwr-draft",
            value: it.draft || "",
            onChange: (e) => {
              const v = e.target.value;
              setItems((arr) => arr.map((x) => String(x.id) === String(it.id) ? { ...x, draft: v } : x));
            },
          }),
          h("div", { className: "bwr-actions" },
            h("button", { className: "bwp-btn", onClick: () => act(it, "approve"), disabled: busy === it.id }, busy === it.id ? "…" : "通过（不发送）"),
            h("button", { className: "bwp-btn bwp-btn2", onClick: () => act(it, "skip"), disabled: busy === it.id }, "跳过"),
            h("button", { className: "bwp-btn bwp-btn2", onClick: () => act(it, "reset"), disabled: busy === it.id }, "重置"),
            it.uri ? h("a", { className: "bwr-link", href: it.uri, target: "_blank", rel: "noreferrer" }, "打开 B 站") : null,
          ),
        )),
      );
    }

    const inject = ["slots"];
    const NS = "bili-whale-persona";
    const NS_REVIEW = "bili-whale-review";
    const NAMES = { nav: "鲸鲸 · 人设", review: "鲸鲸 · 评论审核" };

    function apply(ctx) {
      ctx.effect(
        () =>
          ctx.slots.inject("settings.section", () =>
            ctx.slots.register(
              { name: "settings.section", id: NS, order: 7, label: () => NAMES.nav },
              WhalePersonaSection,
            ),
            "bili-whale-persona: settings section",
          ),
        "bili-whale-persona: settings section",
      );
      ctx.effect(
        () =>
          ctx.slots.inject("settings.section", () =>
            ctx.slots.register(
              { name: "settings.section", id: NS_REVIEW, order: 8, label: () => NAMES.review },
              ReviewSection,
            ),
            "bili-whale-review: settings section",
          ),
        "bili-whale-review: settings section",
      );
    }

    exports.apply = apply;
    exports.inject = inject;
    exports.WhalePersonaSection = WhalePersonaSection;
    exports.ReviewSection = ReviewSection;
    return module.exports;
  },
});
