"""Compare judges on a free-text dataset: AUC by mask, policy cost (AI threshold by 2-fold CV by case), bootstrap vs best rule.
Usage: python3 score_messy.py --data data_messy"""
import argparse, json, random
from pathlib import Path
import analyze
ap = argparse.ArgumentParser(); ap.add_argument("--data", required=True); a = ap.parse_args()
root = Path(__file__).parent
T = {t["trial_id"]: t for t in map(json.loads, (root / a.data / "trials.jsonl").open())}
P = {}
for n in ["rules_naive", "rules_conservative", "kev", "qwen"]:
    f = root / "results" / a.data / f"{n}.jsonl"
    if f.exists(): P[n] = {r["trial_id"]: r["p"] for r in map(json.loads, f.open()) if "p" in r}
print("coverage", {n: len(v) for n, v in P.items()}); P = {n: v for n, v in P.items() if len(v) == len(T)}
ids = [k for k in T if all(k in v for v in P.values())]
print("\nAUC by mask (0/10/30/50%)")
for n, v in P.items():
    print(f"  {n:20s}", " ".join(f"{analyze.auc([(T[k]['signal'], v[k]) for k in ids if T[k]['mask'] == m]):.3f}" for m in (0, .1, .3, .5)))
def calls(n, ratio):
    if n.startswith("rules"): return {k: P[n][k] >= .5 for k in ids}
    out = {}
    for fold in (0, 1):
        thr = analyze.best_threshold([(T[k]["signal"], P[n][k]) for k in ids if int(T[k]["case_id"][1:]) % 2 == fold], ratio)
        out.update({k: P[n][k] >= thr for k in ids if int(T[k]["case_id"][1:]) % 2 != fold})
    return out
def cost(c, ratio, keys): return sum(ratio * (T[k]["signal"] and not c[k]) + ((not T[k]["signal"]) and c[k]) for k in keys)
for name, r in analyze.SCENARIOS.items():
    C = {n: calls(n, r) for n in P}
    best = min(["rules_naive", "rules_conservative"], key=lambda n: cost(C[n], r, ids))
    print(f"\n{name} ({r:g}:1)  " + "  ".join(f"{n} {cost(C[n], r, ids):.0f}" for n in P) + f"   best rule = {best}")
    for ai in [n for n in ("kev", "qwen") if n in P]:
        by = {}
        for k in ids: by.setdefault(T[k]["case_id"], []).append(k)
        d = {c: cost(C[ai], r, ks) - cost(C[best], r, ks) for c, ks in by.items()}
        rng = random.Random(7); cs = list(d)
        bs = sorted(sum(d[c] for c in rng.choices(cs, k=len(cs))) for _ in range(1000))
        print(f"   {ai} - best rule: {sum(d.values()):+.0f}  95% CI [{bs[25]:+.0f}, {bs[974]:+.0f}]")
