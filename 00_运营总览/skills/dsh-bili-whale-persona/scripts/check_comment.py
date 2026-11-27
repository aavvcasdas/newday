#!/usr/bin/env python3
"""发言前自检：敏感词 + 攻击性 + 灌水 + 语气词 + 长度。

用法：
  python scripts/check_comment.py --text "看了，前10秒就劝退。"
  python scripts/check_comment.py --text "..." --tier off|light|on
  python scripts/check_comment.py --file draft.txt --tier light

退出码：0 = PASS；1 = REJECT。

设计原则：脚本只挡「明显的脏词、攻击词、引战词、灌水、真人梗、地域梗」；
阴阳怪气、人身攻击的隐性变体挡不住，必须再过 references/boundaries.md 的人工清单。
"""
import argparse
import json
import os
import re
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# —— 永久禁用（过审，agent.md 第 7/15 条口径）——
BAN_PERMANENT = ["擦屁股", "屁股", "屎", "拉屎", "尿", "粪便", "排泄", "屁"]

# —— 脏话 / 辱骂（任何档位）——
PROFANITY = [
    "nmsl", "你妈", "尼玛", "傻x", "傻逼", "煞笔", "sb", "nt", "去死", "该死",
    "妈的", "他妈", "我tm", "野种", "杂种", "贱", "狗东西", "畜生", "废物",
]

# —— 人身攻击 / 贬低 ——
INSULT = [
    "丑", "肥猪", "死胖子", "矮子", "智障", "脑残", "弱智", "精神病", "有病",
    "没文化", "没教养", "穷鬼", "乡巴佬", "土狗", "小丑", "傻子", "蠢", "笨死",
]

# —— 引战 / 煽动 ——
FLAME = [
    "都给我骂", "冲了他", "网暴", "开盒", "人肉", "挂人", "举报他", "一起来骂",
    "站队", "滚出", "封杀",
]

# —— 地域 / 身份 / 性别攻击 ——
DISCRIMINATION = [
    "地域黑", "外地狗", "乡下人", "河南人", "东北人", "江西人", "贵州人", "广西人",
    "女拳", "男的都", "女的都", "娘炮", "死基佬",
]

# —— 真人梗 / 真实人物（热梗库里需排除的）——
REAL_PERSON_MEMES = [
    "张美玉", "里奥·哟西", "里奥哟西", "甲亢哥", "撒贝宁老鼠干", "吴京被电击",
    "梅西", "马云你听我说",
]

# —— 灌水 / 低质 ——
SPAM = ["支持", "不错", "学习了", "顶", "路过", "沙发", "666", "哈哈哈哈"]
SPAM_EXACT = {"6", "乐", "呃", "麻", "确实", "字多", "笑死", "哈哈哈", "。"}

# —— 封存重词（任何档位都不允许，boundaries.md R2/R4/R5）——
SEALED = [
    "爹", "给你脸了", "你几把谁", "闹麻了", "你可以爬了",
    "反串", "孝出强大", "小肥羊",
]

# —— 黑话信号（黑话密度检查用）——
SLANG = [
    "绷不住", "蚌埠住", "笑不活", "笑死", "麻了", "无语", "破防", "emo",
    "上头", "下头", "社死", "尴尬", "脚趾抠地", "泪目", "好活", "烂活", "整活",
    "节目效果", "拉满", "拉胯", "翻车", "名场面", "万恶之源", "就这",
    "很难评", "逆天", "离谱", "离大谱", "抽象", "魔性", "下饭", "电子榨菜",
    "纯纯的", "属于是", "要素过多", "缝合怪", "DNA动了", "刻进DNA", "高开低走",
    "答辩", "一坨", "吃瓜", "前排", "插眼", "考古", "挖坟", "补课", "省流",
    "课代表", "太长不看", "一键三连", "白嫖", "下次一定", "催更", "鸽子",
    "爷青回", "入坑", "避雷", "踩雷", "真香", "打脸", "反转", "塌房", "实锤",
    "凉了", "寄了", "润了", "开摆", "摆烂", "躺平", "摸鱼", "划水", "内卷",
    "卷王", "牛马", "打工人", "社畜", "好家伙", "我超", "绝了", "yyds",
    "awsl", "xswl", "u1s1", "有一说一", "说人话", "别急", "整不会", "属于是",
    "属实", "格局", "成分复杂",
]

# —— 句尾语气词（新稿口径）——
TAIL_PARTICLES = ["呀", "啦", "吧", "嘛", "诶", "呜", "呢", "哦", "哇", "啊", "哼", "嘿"]


def load_memes():
    p = os.path.join(ROOT, "data", "hot_memes.json")
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"memes": []}


def check(text, tier="off"):
    reasons = []
    low = text.lower()

    def hit(words, label):
        for w in words:
            if w.lower() in low:
                reasons.append(f"{label}：命中「{w}」")
                return True
        return False

    hit(BAN_PERMANENT, "永久禁用词")
    hit(PROFANITY, "脏话/辱骂")
    hit(INSULT, "人身攻击/贬低")
    hit(FLAME, "引战/煽动")
    hit(DISCRIMINATION, "地域/身份/性别攻击")
    hit(REAL_PERSON_MEMES, "真人梗（涉真实人物）")
    hit(SEALED, "封存重词（boundaries.md R2/R4）")

    # 灌水：整条是无信息量的空话
    if text.strip() in SPAM_EXACT:
        reasons.append(f"灌水：整条是无信息量的空话「{text.strip()}」")
    elif len(text.strip()) <= 6 and any(s == text.strip() for s in SPAM):
        reasons.append("灌水：整条是无信息量的空话")

    # 句尾语气词
    stripped = text.strip().rstrip("。！？!?…~ ")
    if stripped and stripped[-1] in TAIL_PARTICLES:
        reasons.append(f"句尾语气词：结尾是「{stripped[-1]}」")

    # 长度
    if len(text.strip()) > 500:
        reasons.append("长度：超过 500 字")

    # 档位约束
    if tier == "off":
        for w in ["鉴定为"]:
            if w in text:
                reasons.append(f"档位 off 不允许鉴定体「{w}」（改用 light/on）")
                break

    # 黑话密度：公开评论至少一个黑话信号
    slang_hits = [w for w in SLANG if w in text]
    if not slang_hits:
        reasons.append("黑话密度：没有一个黑话信号（黑话是默认语言，不是可选装饰）")

    return reasons


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--text")
    ap.add_argument("--file")
    ap.add_argument("--tier", default="off", choices=["off", "light", "on"])
    args = ap.parse_args()

    if args.file:
        with open(args.file, encoding="utf-8") as f:
            text = f.read()
    elif args.text is not None:
        text = args.text
    else:
        ap.error("需要 --text 或 --file")

    reasons = check(text, args.tier)
    if reasons:
        print("REJECT")
        for r in reasons:
            print(" -", r)
        print("\n提示：脚本挡不住的阴阳/人身攻击，请对照 references/boundaries.md 人工再过一遍。")
        return 1
    print("PASS")
    print(f" - 档位：{args.tier}")
    print(f" - 长度：{len(text.strip())} 字")
    return 0


if __name__ == "__main__":
    sys.exit(main())
