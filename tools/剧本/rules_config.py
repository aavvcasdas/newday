"""共享口径；语速为同声线含气口的规划参考，非实测字幕依据。"""
import re
DEFAULT_RATE = 3.35
DEFAULT_SECONDS = 60.0
OPENER_BLACKLIST = ['大家好','哈喽','本鱼回来了','本鲸回来了','又见面','先统计','先复盘','复盘','结算','汇报','上一集','昨天那集','更新一下','说个事','今天给大家','先说一下']
PROMISE_WORDS = ['明天','下一集','下期','关注','评论区','留言','投票','点菜','帮我选','你们说','听你们的','接着','未完']
EVENT_SIGNALS = ['没','不','被','抢','摔','翻车','错','忘','扣','超','炸','迟到','失败','成功','发现','结果','居然','竟然','才','怎么','凭什么','反过来','？','?','！','!']
BAN_WORDS = ['擦屁股','屁股','屎','拉屎','撒尿','尿','粪便','排泄','放屁','狗屁']

def text_redlines(lines):
    """2026-11-09：零阿拉伯数字门禁已按用户要求删除；只保留自称口径。"""
    errors = []
    joined='\n'.join(lines)
    quoted=re.sub(r'「[^」]*」|“[^”]*”|『[^』]*』',lambda m:'\n'*m.group().count('\n'),joined).split('\n')
    for i, (text, plain) in enumerate(zip(lines,quoted), 1):
        # 只剥离完整引述；“大肥鱼”可为称呼，不将所有提及误判成自称。
        if '本鱼' in plain or re.search(r'(?:我是|我叫|自称|本小姐是|本鲸是)(?:一只)?大肥鱼', plain):
            errors.append(f'L{i} 自称口径：默认本鲸，旧称须明确引述')
    return errors

def tail_promises(lines):
    return [w for w in PROMISE_WORDS if any(w in x for x in lines[-3:])]
