"""Tables and figures for the free-text experiment (exploration data_messy, confirmation data_confirm).
Writes results/messy_summary.json and figures/messy_*.png (light) + ../簡報/figures/messy_*.png (dark)."""
import json, random
from pathlib import Path
import analyze
import matplotlib.pyplot as plt

ROOT = Path(__file__).parent
NAMES = {"rules_naive": "規則式（缺漏視為正常）", "rules_conservative": "規則式（缺漏視為異常）", "kev": "Kev-0.8B"}

def load(d):
    T = {t["trial_id"]: t for t in map(json.loads, (ROOT / d / "trials.jsonl").open())}
    P = {n: {r["trial_id"]: r["p"] for r in map(json.loads, (ROOT / "results" / d / f"{n}.jsonl").open())} for n in NAMES}
    return T, P

def calls(T, P, n, ratio):
    if n.startswith("rules"): return {k: P[n][k] >= .5 for k in T}, None
    out, thr = {}, []
    for fold in (0, 1):
        t = analyze.best_threshold([(T[k]["signal"], P[n][k]) for k in T if int(T[k]["case_id"][1:]) % 2 == fold], ratio)
        thr.append(t); out.update({k: P[n][k] >= t for k in T if int(T[k]["case_id"][1:]) % 2 != fold})
    return out, thr

def rates(T, c, keys):
    s = [k for k in keys if T[k]["signal"]]; called = [k for k in keys if c[k]]
    return {"under": sum(not c[k] for k in s) / len(s), "over": sum(not T[k]["signal"] for k in called) / max(len(called), 1),
            "red_rate": len(called) / len(keys)}

summary = {}
for d in ["data_messy", "data_confirm"]:
    T, P = load(d); S = {"auc": {}, "scen": {}}
    for n in NAMES:
        S["auc"][n] = {str(m): analyze.auc([(T[k]["signal"], P[n][k]) for k in T if T[k]["mask"] == m]) for m in analyze.MASKS}
    nov = [k for k in T if T[k]["novel_fields"]]
    S["novel_share"] = len(nov) / len(T)
    for name, r in analyze.SCENARIOS.items():
        C = {n: calls(T, P, n, r) for n in NAMES}
        cost = {n: sum(r * (T[k]["signal"] and not C[n][0][k]) + ((not T[k]["signal"]) and C[n][0][k]) for k in T) for n in NAMES}
        best = min(["rules_naive", "rules_conservative"], key=cost.get)
        by = {}
        for k in T: by.setdefault(T[k]["case_id"], []).append(k)
        f = lambda n, ks: sum(r * (T[k]["signal"] and not C[n][0][k]) + ((not T[k]["signal"]) and C[n][0][k]) for k in ks)
        dd = {c: f("kev", ks) - f(best, ks) for c, ks in by.items()}
        rng = random.Random(7); cs = list(dd)
        bs = sorted(sum(dd[c] for c in rng.choices(cs, k=len(cs))) for _ in range(1000))
        S["scen"][name] = {"cost": cost, "best_rule": best, "diff": sum(dd.values()), "ci": [bs[25], bs[974]],
                           "kev_thr": C["kev"][1], "rates": {n: rates(T, C[n][0], list(T)) for n in NAMES},
                           "rates_m50": {n: rates(T, C[n][0], [k for k in T if T[k]["mask"] == .5]) for n in NAMES}}
    summary[d] = S
(ROOT / "results" / "messy_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1))

COL = {"rules_naive": "#1f77b4", "rules_conservative": "#ff7f0e", "kev": "#8c564b"}
DARK = {"rules_naive": "#7FB3E0", "rules_conservative": "#F2994A", "kev": "#E8B923"}
def fig(dark, out):
    plt.rcdefaults()
    plt.rcParams["font.family"] = ["Heiti TC", "Arial Unicode MS"]
    if dark:
        BG, FG, G = "#2F3829", "#EFE9D8", "#56604E"
        plt.rcParams.update({"figure.facecolor": BG, "axes.facecolor": BG, "savefig.facecolor": BG, "axes.edgecolor": G,
            "axes.labelcolor": FG, "axes.titlecolor": FG, "text.color": FG, "xtick.color": FG, "ytick.color": FG,
            "axes.grid": True, "grid.color": G, "grid.linewidth": .5, "legend.facecolor": "#262C22", "legend.edgecolor": G,
            "font.size": 15, "axes.titlesize": 17, "lines.linewidth": 2.4, "lines.markersize": 8})
    cols = DARK if dark else COL
    S = summary["data_confirm"]
    f, ax = plt.subplots(1, 2, figsize=(10, 4))
    for n in NAMES:
        ax[0].plot([0, 10, 30, 50], [S["auc"][n][str(m)] for m in analyze.MASKS], marker="o", color=cols[n], label=NAMES[n])
    ax[0].set(title="AUC（口語回報，確認資料）", xlabel="欄位遮蔽比例（%）", ylim=(0.45, 1.16 if dark else 1.0))
    if dark: ax[0].set_yticks([0.5, 0.6, 0.7, 0.8, 0.9, 1.0])  # headroom so the legend clears the lines
    ax[0].legend(fontsize=12 if dark else 8, loc="upper right" if dark else "best")
    sc = list(analyze.SCENARIOS); x = range(len(sc)); w = .27
    for i, n in enumerate(NAMES):
        ax[1].bar([j + (i - 1) * w for j in x], [S["scen"][s]["cost"][n] for s in sc], w, color=cols[n], label=NAMES[n])
    ax[1].set_xticks(list(x), [f"{s}\n({analyze.SCENARIOS[s]:g}:1)" for s in sc]); ax[1].set(title="政策總成本（越低越好）")
    for j, s in enumerate(sc):
        e = S["scen"][s]; mark = "＊" if e["ci"][1] < 0 else ("" if e["ci"][0] <= 0 else "†")
        if mark: ax[1].text(j + w, e["cost"]["kev"] + 40, mark, ha="center", fontsize=26 if dark else 14, color=FG if dark else cols["kev"])
    f.tight_layout(); f.savefig(out, dpi=200)
fig(False, ROOT / "figures" / "messy_confirm.png")
fig(True, ROOT.parent / "簡報" / "figures" / "messy_confirm.png")
for d, S in summary.items():
    print(d, "novel share", round(S["novel_share"], 3))
    for n in NAMES: print("  AUC", n, [round(S["auc"][n][str(m)], 3) for m in analyze.MASKS])
    for s, e in S["scen"].items():
        print(" ", s, {n: e["cost"][n] for n in NAMES}, "diff", e["diff"], e["ci"], "thr", [round(t, 2) for t in e["kev_thr"]])
        for n in NAMES: print("     ", n, {k: round(v, 3) for k, v in e["rates"][n].items()})
