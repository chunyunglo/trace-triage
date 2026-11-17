"""When is Kev worth using? Pre-specified hybrid: rules decide when the two rule variants agree
(missing fields do not matter); the AI decides only the 'undetermined' cases where they disagree.
AI thresholds inside the undetermined zone are fitted with 2-fold cross-validation by case."""
import analyze
tr, pr = analyze.load()
cases = {}
for k, t in tr.items():
    cases.setdefault(t["case_id"], []).append(k)

def zone(k):  # True = undetermined (rules disagree)
    return pr["rules_naive"][k]["p"] != pr["rules_conservative"][k]["p"]

def run(ai, ratio, masks=(0.0, 0.1, 0.3, 0.5)):
    fn = fp = 0; n_und = 0
    for fold in (0, 1):
        fit = [(tr[k]["signal"], pr[ai][k]["p"]) for k in tr if zone(k) and int(tr[k]["case_id"][1:]) % 2 == fold]
        thr = analyze.best_threshold(fit, ratio)
        for k, t in tr.items():
            if int(t["case_id"][1:]) % 2 == fold or t["mask"] not in masks:
                continue
            if zone(k):
                n_und += 1; call = pr[ai][k]["p"] >= thr
            else:
                call = pr["rules_naive"][k]["p"] >= 0.5
            fn += t["signal"] and not call; fp += (not t["signal"]) and call
    return ratio * fn + fp, fn, fp, n_und

def rule_cost(rule, ratio, masks=(0.0, 0.1, 0.3, 0.5)):
    rows = [(t["signal"], pr[rule][k]["p"]) for k, t in tr.items() if t["mask"] in masks]
    fn = sum(y and p < .5 for y, p in rows); fp = sum((not y) and p >= .5 for y, p in rows)
    return ratio * fn + fp, fn, fp

und = [k for k in tr if zone(k)]
print(f"undetermined share: {len(und)/len(tr):.1%}  (red within: {sum(tr[k]['signal'] for k in und)/len(und):.1%})")
for m in [0.1, 0.3, 0.5]:
    u = [k for k in und if tr[k]["mask"] == m]; print(f"  mask {m}: {len(u)} undetermined of 600")
for name, r in analyze.SCENARIOS.items():
    print(f"\n{name} ({r:g}:1)")
    for rule in ["rules_naive", "rules_conservative"]:
        c, fn, fp = rule_cost(rule, r); print(f"  {rule:20s} cost {c:6.0f}  missed {fn:3d}  over {fp:4d}")
    for ai in ["kev", "qwen", "apple", "jev"]:
        c, fn, fp, n = run(ai, r); print(f"  hybrid rules+{ai:6s}   cost {c:6.0f}  missed {fn:3d}  over {fp:4d}  (AI decided {n})")

# Bootstrap by case: cost difference hybrid(Kev) - best single rule, thresholds as fitted above (CV).
import random
def per_case_calls(ai, ratio):
    calls = {}
    for fold in (0, 1):
        fit = [(tr[k]["signal"], pr[ai][k]["p"]) for k in tr if zone(k) and int(tr[k]["case_id"][1:]) % 2 == fold]
        thr = analyze.best_threshold(fit, ratio)
        for k, t in tr.items():
            if int(t["case_id"][1:]) % 2 != fold:
                calls[k] = (pr[ai][k]["p"] >= thr) if zone(k) else (pr["rules_naive"][k]["p"] >= .5)
    return calls
print("\nbootstrap (1,000 resamples of casualties): hybrid cost minus best rule cost")
for name, r in analyze.SCENARIOS.items():
    best = min(["rules_naive", "rules_conservative"], key=lambda x: rule_cost(x, r)[0])
    for ai in ["kev", "jev"]:
        calls = per_case_calls(ai, r)
        def c_of(k, call): y = tr[k]["signal"]; return r * (y and not call) + ((not y) and call)
        d = {cid: sum(c_of(k, calls[k]) - c_of(k, pr[best][k]["p"] >= .5) for k in ks) for cid, ks in cases.items()}
        ids = list(d); rng = random.Random(7)
        bs = sorted(sum(d[i] for i in rng.choices(ids, k=len(ids))) for _ in range(1000))
        print(f"  {name} {ai}: diff {sum(d.values()):+.0f}  95% CI [{bs[25]:+.0f}, {bs[974]:+.0f}]  (vs {best})")
