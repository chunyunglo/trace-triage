"""Free-text radio reports: the same casualties, but described the way people actually talk.

Each field value has two phrasing pools:
  A (anticipated)  - wording a rule designer would plan for; the rule parser (rules_parser.py) is written from these.
  B (unanticipated) - colloquial, indirect or negated wording the parser was never written for.
Every reported field draws from B with probability NOVEL (default 0.5); field order is shuffled; a missing field
is either said to be unreported or simply not mentioned. The rule parser may only use pool A.

Usage: python3 generate_messy.py --cases data/cases.jsonl --out data_messy [--seed S] [--novel 0.5]
       python3 generate_messy.py --new-cases 600 --seed 777 --out data_confirm   (fresh casualties for confirmation)
"""
import argparse, json, random
from pathlib import Path

import generate_cases as G

ROOT = Path(__file__).parent
ZH = "零一二三四五六七八九"


def zh_num(n: int) -> str:
    if n < 10:
        return ZH[n]
    t, o = divmod(n, 10)
    return ("" if t == 1 else ZH[t]) + "十" + ("" if o == 0 else ZH[o])


def zh_sec(s: float) -> str:
    i, d = divmod(round(s * 10), 10)
    return ZH[i] + ("點" + ZH[d] if d else "")


A = {
    "bleed1": ["有大量出血，正在加壓止血", "大出血", "出血不止"],
    "bleed0": ["無明顯大出血", "沒有大出血", "出血已控制"],
    "walk1": ["可自行行走", "能自己走"],
    "walk0": ["無法自行行走", "不能走"],
    "rr": ["呼吸每分鐘 {n} 次", "呼吸 {n} 次每分鐘"],
    "apnea_ok": ["無自發呼吸，暢通呼吸道後恢復呼吸"],
    "apnea_dead": ["無自發呼吸，暢通呼吸道後仍無呼吸"],
    "radial1": ["橈動脈可觸及", "摸得到橈動脈"],
    "radial0": ["橈動脈摸不到", "無橈動脈脈搏"],
    "cap": ["微血管回填 {s} 秒", "微血管回填時間 {s} 秒"],
    "cmd1": ["可遵從簡單指令", "意識清楚可配合指令"],
    "cmd0": ["無法遵從簡單指令", "意識不清"],
}
B = {
    "bleed1": ["血一直噴出來，止血帶綁上去了", "地上一大灘血，止不住", "傷口血用壓的也壓不住"],
    "bleed0": ["只有一點滲血", "血流得不多", "沒看到在噴血"],
    "walk1": ["他是自己走過來的", "還能一跛一跛地移動", "扶著東西可以走到收集點"],
    "walk0": ["躺著起不來", "要用擔架抬", "腿軟站不起來"],
    "rr": ["喘得很快，一分鐘大概{zn}下", "一分鐘喘了{zn}下左右", "數了一下一分鐘差不多 {n} 口氣"],
    "apnea_ok": ["本來沒在吸氣，頭往後仰打開呼吸道以後又開始喘了"],
    "apnea_dead": ["打開呼吸道還是沒有在吸氣，胸口沒起伏"],
    "radial1": ["手腕脈搏摸得到", "手腕還有脈"],
    "radial0": ["手腕那邊摸不太到脈", "手腕找不到脈搏"],
    "cap": ["按指甲大概{zs}秒才變回紅色", "指甲壓下去要{zs}秒左右才回來"],
    "cmd1": ["叫他握手他有握", "問他名字答得出來"],
    "cmd0": ["叫他都沒反應", "講話亂七八糟，叫他動手指也不會"],
}
MISSING_SAID = {"massive_hemorrhage": "出血狀況未回報", "walk": "行走能力未回報", "respiration": "呼吸次數未回報",
                "radial_pulse": "橈動脈未回報", "cap_refill": "微血管回填未回報", "follows_commands": "意識狀態未回報"}


def phrase(rng, key, novel, **kw):
    pool = B if rng.random() < novel else A
    return rng.choice(pool[key]).format(**kw), pool is B


def render(case, visible, rng, novel):
    t = case["truth"]
    parts, novel_used = [], []
    for f in G.FIELDS:
        if not visible[f]:
            if rng.random() < 0.5:
                parts.append(MISSING_SAID[f])
            continue
        if f == "massive_hemorrhage":
            s, b = phrase(rng, "bleed1" if t[f] else "bleed0", novel)
        elif f == "walk":
            s, b = phrase(rng, "walk1" if t[f] else "walk0", novel)
        elif f == "respiration":
            if not t["breathing"]:
                s, b = phrase(rng, "apnea_ok" if t["breathes_after_airway"] else "apnea_dead", novel)
            else:
                s, b = phrase(rng, "rr", novel, n=t[f], zn=zh_num(t[f]))
        elif f == "radial_pulse":
            s, b = phrase(rng, "radial1" if t[f] else "radial0", novel)
        elif f == "cap_refill":
            s, b = phrase(rng, "cap", novel, s=t[f], zs=zh_sec(t[f]))
        else:
            s, b = phrase(rng, "cmd1" if t[f] else "cmd0", novel)
        parts.append(s)
        novel_used.append(f) if b else None
    rng.shuffle(parts)
    text = f"{case['unit']}於{case['site']}回報，傷員一名，{case['injury']}。" + "，".join(parts) + "。"
    return text, novel_used


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cases", default="data/cases.jsonl")
    ap.add_argument("--new-cases", type=int)
    ap.add_argument("--out", required=True)
    ap.add_argument("--seed", type=int, default=20261117)
    ap.add_argument("--novel", type=float, default=0.5)
    a = ap.parse_args()
    out = ROOT / a.out
    out.mkdir(exist_ok=True)
    if a.new_cases:
        crng = random.Random(a.seed)
        cases = [G.draw_case(crng, i) for i in range(a.new_cases)]
    else:
        cases = [json.loads(l) for l in (ROOT / a.cases).open()]
    with open(out / "cases.jsonl", "w") as f:
        for c in cases:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")
    rng = random.Random(f"{a.seed}-text")
    with open(out / "trials.jsonl", "w") as f:
        for level in G.MASK_LEVELS:
            mrng = random.Random(f"{G.SEED if not a.new_cases else a.seed}-{level}")
            for c in cases:
                visible = {k: mrng.random() >= level for k in G.FIELDS}
                text, nov = render(c, visible, rng, a.novel)
                f.write(json.dumps({"trial_id": f"{c['case_id']}-m{int(level * 100):02d}", "case_id": c["case_id"], "mask": level,
                                    "visible": visible, "novel_fields": nov, "report": text, "signal": c["category"] == "red"},
                                   ensure_ascii=False) + "\n")
    print(out, len(cases), {k: sum(c["category"] == k for c in cases) for k in ["red", "yellow", "green", "black"]})


if __name__ == "__main__":
    main()
