"""Best-effort keyword/regex parser for free-text reports, written only from the anticipated phrasings (pool A
in generate_messy.py). Anything it cannot parse counts as unreported; then START/MARCH rules apply with
missing fields treated as normal (naive) or abnormal (conservative).

Usage: python3 rules_parser.py --data data_messy  -> results/<data>/rules_naive.jsonl, rules_conservative.jsonl
"""
import argparse, json, re
from pathlib import Path

ROOT = Path(__file__).parent


def parse(r: str) -> dict:
    """field -> True (abnormal) / False (normal) / None (unknown). respiration may be 'black'."""
    f = dict.fromkeys(["bleed", "walk", "resp", "radial", "cap", "cmd"])
    if re.search(r"無明顯大出血|沒有大出血|出血已控制", r):
        f["bleed"] = False
    elif re.search(r"大量出血|大出血|出血不止", r):
        f["bleed"] = True
    if re.search(r"無法自行行走|不能走|無法行走", r):
        f["walk"] = True
    elif re.search(r"可自行行走|能自己走", r):
        f["walk"] = False
    if "無自發呼吸" in r:
        f["resp"] = "black" if "仍無呼吸" in r else True
    elif m := re.search(r"呼吸(?:每分鐘)? ?(\d+) ?次", r):
        f["resp"] = int(m.group(1)) > 30
    if re.search(r"橈動脈摸不到|無橈動脈", r):
        f["radial"] = True
    elif re.search(r"橈動脈可觸及|摸得到橈動脈", r):
        f["radial"] = False
    if m := re.search(r"微血管回填(?:時間)? ?([\d.]+) ?秒", r):
        f["cap"] = float(m.group(1)) > 2
    if re.search(r"無法遵從|意識不清", r):
        f["cmd"] = True
    elif re.search(r"可遵從|意識清楚", r):
        f["cmd"] = False
    return f


def decide(f: dict, conservative: bool) -> float:
    v = lambda k: conservative if f[k] is None else f[k]
    if v("bleed"):
        return 1.0
    if f["walk"] is False:
        return 0.0
    if f["resp"] == "black":
        return 0.0
    if v("resp") or v("radial") or v("cap") or v("cmd"):
        return 1.0
    return 0.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    a = ap.parse_args()
    out = ROOT / "results" / a.data
    out.mkdir(parents=True, exist_ok=True)
    trials = [json.loads(l) for l in (ROOT / a.data / "trials.jsonl").open()]
    for name, cons in [("rules_naive", False), ("rules_conservative", True)]:
        with open(out / f"{name}.jsonl", "w") as fh:
            for t in trials:
                fh.write(json.dumps({"trial_id": t["trial_id"], "p": decide(parse(t["report"]), cons), "ms": 0.0}) + "\n")


if __name__ == "__main__":
    main()
