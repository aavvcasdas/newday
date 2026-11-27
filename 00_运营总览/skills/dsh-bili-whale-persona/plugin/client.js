/** 设置 → 鲸鲸 · 人设：孙吧味档位开关。 */
window.__ModuleLoader__.load({
  id: "dsh-bili-whale-persona-toggle",
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");
    const { createElement: h, useCallback, useEffect, useState } = React;

    const API = new URL("whale-persona-v3/api", document.baseURI).pathname;

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
          h("div", { className: "bwp-hint" }, personaFile || "（未检测到 ~/.bili-ai/）"),
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

    const inject = ["slots"];
    const NS = "bili-whale-persona";
    const NAMES = { nav: "鲸鲸 · 人设" };

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
    }

    exports.apply = apply;
    exports.inject = inject;
    exports.WhalePersonaSection = WhalePersonaSection;
    return module.exports;
  },
});
