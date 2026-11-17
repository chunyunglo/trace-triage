"""SDT, ROC and policy-threshold analysis of the judge results.

Writes results/summary.json, results/tables.md and figures/*.png.
"""

import json
import random
from pathlib import Path
from statistics import NormalDist

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).parent
RES = ROOT / "results"
FIG = ROOT / "figures"
JUDGES = {
    "rules_naive": "規則式（缺漏視為正常）",
    "rules_conservative": "規則式（缺漏視為異常）",
    "qwen": "本機開源 Qwen3-4B",
    "apple": "Apple 裝置端模型",
    "kev": "本機開源 Kev-0.8B",
    "jev": "雲端 Jev 1.14",
}
MASKS = [0.0, 0.1, 0.3, 0.5]
# Cost of a missed red casualty relative to one unnecessary red call.
COLORS = {"rules_naive": "#1f77b4", "rules_conservative": "#ff7f0e", "qwen": "#2ca02c", "apple": "#d62728", "jev": "#9467bd", "kev": "#8c564b"}
SCENARIOS = {"量能充足": 10.0, "量能緊繃": 3.0, "大量傷患": 1.0}
Z = NormalDist().inv_cdf
B = 1000

plt.rcParams["font.family"] = ["Heiti TC", "Arial Unicode MS"]


def load() -> tuple[dict, dict]:
    trials = {}
    for line in (ROOT / "data" / "trials.jsonl").open():
        t = json.loads(line)
        trials[t["trial_id"]] = t
    preds = {}
    for j in JUDGES:
        path = RES / f"{j}.jsonl"
        if not path.exists():
            continue
        recs = {}
        for line in path.open():
            r = json.loads(line)
            if "p" in r:
                recs[r["trial_id"]] = r
        preds[j] = recs
    return trials, preds


def sdt(rows: list[tuple[bool, float]], thr: float = 0.5) -> dict:
    s = [p for sig, p in rows if sig]
    n = [p for sig, p in rows if not sig]
    hits = sum(p >= thr for p in s)
    fas = sum(p >= thr for p in n)
    # Log-linear correction keeps z finite at rates of 0 or 1.
    h = (hits + 0.5) / (len(s) + 1)
    f = (fas + 0.5) / (len(n) + 1)
    called = hits + fas
    return {
        "n": len(rows), "d": Z(h) - Z(f), "c": -(Z(h) + Z(f)) / 2,
        "sens": hits / len(s), "spec": 1 - fas / len(n),
        "under": 1 - hits / len(s),
        "over": fas / called if called else 0.0,
        "red_rate": called / len(rows),
    }


def auc(rows: list[tuple[bool, float]]) -> float:
    s = [p for sig, p in rows if sig]
    n = [p for sig, p in rows if not sig]
    wins = sum((a > b) + 0.5 * (a == b) for a in s for b in n)
    return wins / (len(s) * len(n))


def rows_for(trials, recs, mask=None):
    return [(trials[k]["signal"], r["p"]) for k, r in recs.items()
            if mask is None or trials[k]["mask"] == mask]


def boot_ci(trials, recs, mask, stat, seed=7):
    by_case: dict[str, list] = {}
    for k, r in recs.items():
        t = trials[k]
        if t["mask"] == mask:
            by_case.setdefault(t["case_id"], []).append((t["signal"], r["p"]))
    cases = list(by_case)
    rng = random.Random(seed)
    vals = []
    for _ in range(B):
        sample = [row for c in rng.choices(cases, k=len(cases)) for row in by_case[c]]
        vals.append(stat(sample))
    vals.sort()
    return vals[int(0.025 * B)], vals[int(0.975 * B) - 1]


def best_threshold(rows, ratio):
    """Threshold minimising ratio*FN + FP, searched over the observed scores."""
    cands = sorted({p for _, p in rows} | {1.01})
    best = None
    for thr in cands:
        fn = sum(sig and p < thr for sig, p in rows)
        fp = sum((not sig) and p >= thr for sig, p in rows)
        cost = ratio * fn + fp
        if best is None or cost < best[1]:
            best = (thr, cost)
    return best[0]


def roc_points(rows):
    s = sum(sig for sig, _ in rows)
    n = len(rows) - s
    pts = [(0.0, 0.0)]
    for thr in sorted({p for _, p in rows}, reverse=True):
        tp = sum(sig and p >= thr for sig, p in rows)
        fp = sum((not sig) and p >= thr for sig, p in rows)
        pts.append((fp / n, tp / s))
    pts.append((1.0, 1.0))
    return pts


def main() -> None:
    trials, preds = load()
    FIG.mkdir(exist_ok=True)
    summary = {"by_mask": {}, "policy": {}, "review_band": {}, "outage": {}, "latency": {}, "coverage": {}}

    for j, recs in preds.items():
        summary["coverage"][j] = len(recs)
        ms = sorted(r["ms"] for r in recs.values())
        summary["latency"][j] = {"p50": ms[len(ms) // 2], "p95": ms[int(len(ms) * 0.95)]}
        summary["by_mask"][j] = {}
        for m in MASKS:
            rows = rows_for(trials, recs, m)
            if not rows:
                continue
            st = sdt(rows)
            st["auc"] = auc(rows)
            st["d_ci"] = boot_ci(trials, recs, m, lambda x: sdt(x)["d"])
            st["c_ci"] = boot_ci(trials, recs, m, lambda x: sdt(x)["c"])
            summary["by_mask"][j][str(m)] = st

    # Policy thresholds: fitted on all mask levels pooled, since the field
    # never knows in advance how much of a report will be lost.
    for j in ["qwen", "apple", "kev", "jev"]:
        if j not in preds:
            continue
        pooled = rows_for(trials, preds[j])
        summary["policy"][j] = {}
        thrs = {}
        for name, ratio in SCENARIOS.items():
            thr = best_threshold(pooled, ratio)
            thrs[name] = thr
            st = sdt(pooled, thr)
            st["threshold"] = thr
            st["by_mask_under"] = {str(m): sdt(rows_for(trials, preds[j], m), thr)["under"] for m in MASKS}
            summary["policy"][j][name] = st
        lo, hi = thrs["量能充足"], thrs["大量傷患"]
        band = [(sig, p) for sig, p in pooled if lo <= p < hi]
        auto = [(sig, p) for sig, p in pooled if not (lo <= p < hi)]
        summary["review_band"][j] = {
            "low": lo, "high": hi, "share": len(band) / len(pooled),
            "auto_accuracy": sum(sig == (p >= hi) for sig, p in auto) / len(auto) if auto else None,
            "band_signal_rate": sum(sig for sig, _ in band) / len(band) if band else None,
        }

    # Missing-field-aware thresholds: the number of "未回報" fields is visible
    # to the unit, so the threshold can be set per group instead of once.
    summary["adaptive"] = {}
    for j in ["qwen", "apple", "kev", "jev"]:
        if j not in preds:
            continue
        summary["adaptive"][j] = {}
        for name, ratio in SCENARIOS.items():
            # Two-fold cross-validation by case: thresholds fitted on one half
            # of the casualties are scored on the other half.
            res = {"fn_fp_fixed": [0, 0], "fn_fp_adaptive": [0, 0], "thresholds": {}}
            for fold in (0, 1):
                fit, test = {}, {}
                for k, r in preds[j].items():
                    t = trials[k]
                    g = str(min(sum(not v for v in t["visible"].values()), 3))
                    bucket = fit if int(t["case_id"][1:]) % 2 == fold else test
                    bucket.setdefault(g, []).append((t["signal"], r["p"]))
                fixed = best_threshold([x for rows in fit.values() for x in rows], ratio)
                for g, rows in test.items():
                    thr = best_threshold(fit[g], ratio)
                    res["thresholds"].setdefault(g, []).append(thr)
                    for key, th in (("fn_fp_fixed", fixed), ("fn_fp_adaptive", thr)):
                        res[key][0] += sum(sig and p < th for sig, p in rows)
                        res[key][1] += sum((not sig) and p >= th for sig, p in rows)
            for g, ths in res["thresholds"].items():
                res[g] = {"threshold": sum(ths) / len(ths)}
            res["cost_fixed"] = ratio * res["fn_fp_fixed"][0] + res["fn_fp_fixed"][1]
            res["cost_adaptive"] = ratio * res["fn_fp_adaptive"][0] + res["fn_fp_adaptive"][1]
            summary["adaptive"][j][name] = res

    # Cloud outage: Jev answers when the link is up, otherwise the unit falls
    # back to the conservative rules. Expected counts mix linearly in the outage
    # share q. The over-triage rate is a ratio whose denominator (reports called
    # red) differs between the two judges, so it is recomputed from the mixed
    # counts instead of being averaged.
    if "jev" in preds:
        def counts(rows, thr=0.5):
            tp = sum(sig and p >= thr for sig, p in rows)
            fp = sum((not sig) and p >= thr for sig, p in rows)
            fn = sum(sig and p < thr for sig, p in rows)
            return tp, fp, fn

        for q in [0.0, 0.3, 0.7, 1.0]:
            out = {}
            for m in MASKS:
                a = counts(rows_for(trials, preds["jev"], m))
                b = counts(rows_for(trials, preds["rules_conservative"], m))
                n_rows = len(rows_for(trials, preds["jev"], m))
                tp, fp, fn = ((1 - q) * x + q * y for x, y in zip(a, b))
                out[str(m)] = {"under": fn / (tp + fn), "over": fp / (tp + fp) if tp + fp else 0.0,
                               "red_rate": (tp + fp) / n_rows}
            summary["outage"][str(q)] = out

    (RES / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1))
    write_tables(summary)
    plot(summary, trials, preds)
    print((RES / "tables.md").read_text())


def write_tables(s: dict) -> None:
    L = ["## 表一　各判斷者在不同遮蔽比例下的 SDT 指標（門檻 0.5）", "",
         "| 判斷者 | 遮蔽 | d′ [95% CI] | c [95% CI] | AUC | 敏感度 | 特異度 | 低估率 | 過度檢傷率 |",
         "|---|---|---|---|---|---|---|---|---|"]
    for j, by in s["by_mask"].items():
        for m, st in by.items():
            L.append(f"| {JUDGES[j]} | {int(float(m) * 100)}% | {st['d']:.2f} [{st['d_ci'][0]:.2f}, {st['d_ci'][1]:.2f}] "
                     f"| {st['c']:.2f} [{st['c_ci'][0]:.2f}, {st['c_ci'][1]:.2f}] | {st['auc']:.3f} | {st['sens']:.3f} "
                     f"| {st['spec']:.3f} | {st['under']:.3f} | {st['over']:.3f} |")
    L += ["", "## 表二　三種政策情境的最適門檻（各遮蔽比例合併）", "",
          "| 判斷者 | 情境（漏報:誤報成本） | 門檻 | 敏感度 | 低估率 | 過度檢傷率 | 判紅比例 | 50% 遮蔽下低估率 |",
          "|---|---|---|---|---|---|---|---|"]
    for j, by in s["policy"].items():
        for name, st in by.items():
            L.append(f"| {JUDGES[j]} | {name}（{SCENARIOS[name]:g}:1） | {st['threshold']:.2f} | {st['sens']:.3f} "
                     f"| {st['under']:.3f} | {st['over']:.3f} | {st['red_rate']:.3f} | {st['by_mask_under']['0.5']:.3f} |")
    L += ["", "## 表三　人工覆核區間（介於「量能充足」與「大量傷患」兩門檻之間者送人工覆核）", "",
          "| 判斷者 | 區間 | 需覆核比例 | 區間內紅色比例 | 其餘自動判定正確率 |", "|---|---|---|---|---|"]
    for j, b in s["review_band"].items():
        acc = f"{b['auto_accuracy']:.3f}" if b["auto_accuracy"] is not None else "—"
        sig = f"{b['band_signal_rate']:.3f}" if b["band_signal_rate"] is not None else "—"
        L.append(f"| {JUDGES[j]} | [{b['low']:.2f}, {b['high']:.2f}) | {b['share']:.3f} | {sig} | {acc} |")
    L += ["", "## 表四　雲端斷線時改用保守規則的混合表現", "",
          "| 斷線比例 | 遮蔽 | 低估率 | 過度檢傷率 | 判紅比例 |", "|---|---|---|---|---|"]
    for q, by in s["outage"].items():
        for m, st in by.items():
            L.append(f"| {int(float(q) * 100)}% | {int(float(m) * 100)}% | {st['under']:.3f} | {st['over']:.3f} | {st['red_rate']:.3f} |")
    L += ["", "## 表六　依未回報欄位數分組設定門檻（兩折交叉驗證，門檻為兩折平均）", "",
          "| 判斷者 | 情境 | 缺 0 欄 | 缺 1 欄 | 缺 2 欄 | 缺 3 欄以上 | 漏報/誤報（單一門檻） | 漏報/誤報（分組門檻） | 總成本降幅 |",
          "|---|---|---|---|---|---|---|---|---|"]
    for j, by in s["adaptive"].items():
        for name, r in by.items():
            th = " | ".join(f"{r[g]['threshold']:.2f}" if g in r else "—" for g in ["0", "1", "2", "3"])
            drop = 1 - r["cost_adaptive"] / r["cost_fixed"] if r["cost_fixed"] else 0
            L.append(f"| {JUDGES[j]} | {name} | {th} | {r['fn_fp_fixed'][0]}/{r['fn_fp_fixed'][1]} "
                     f"| {r['fn_fp_adaptive'][0]}/{r['fn_fp_adaptive'][1]} | {drop:.1%} |")
    L += ["", "## 表五　每例處理時間（毫秒）", "", "| 判斷者 | 筆數 | P50 | P95 |", "|---|---|---|---|"]
    for j, lat in s["latency"].items():
        L.append(f"| {JUDGES[j]} | {s['coverage'][j]} | {lat['p50']:.1f} | {lat['p95']:.1f} |")
    (RES / "tables.md").write_text("\n".join(L) + "\n")


def plot(s: dict, trials, preds) -> None:
    fig, axes = plt.subplots(1, 2, figsize=(10, 4))
    for j, by in s["by_mask"].items():
        xs = [int(float(m) * 100) for m in by]
        axes[0].plot(xs, [by[m]["d"] for m in by], marker="o", color=COLORS[j], label=JUDGES[j])
        axes[1].plot(xs, [by[m]["c"] for m in by], marker="o", color=COLORS[j], label=JUDGES[j])
    axes[0].set(title="辨識力 d′", xlabel="欄位遮蔽比例（%）")
    axes[1].set(title="判斷準則 c（負值＝偏向判紅）", xlabel="欄位遮蔽比例（%）")
    axes[1].axhline(0, color="gray", lw=0.6)
    axes[1].legend(fontsize=7)
    fig.tight_layout()
    fig.savefig(FIG / "sdt_by_mask.png", dpi=200)

    fig, axes = plt.subplots(1, 2, figsize=(10, 4.4))
    for ax, m in zip(axes, [0.0, 0.5]):
        for j in ["qwen", "apple", "kev", "jev", "rules_naive", "rules_conservative"]:
            if j not in preds:
                continue
            pts = roc_points(rows_for(trials, preds[j], m))
            style = {"marker": "s", "ls": ":"} if j.startswith("rules") else {}
            ax.plot([p[0] for p in pts], [p[1] for p in pts], color=COLORS[j], label=JUDGES[j], **style)
        ax.plot([0, 1], [0, 1], color="gray", lw=0.6)
        ax.set(title=f"ROC（遮蔽 {int(m * 100)}%）", xlabel="誤報率", ylabel="命中率")
    axes[1].legend(fontsize=7, loc="lower right")
    fig.tight_layout()
    fig.savefig(FIG / "roc.png", dpi=200)


if __name__ == "__main__":
    main()
