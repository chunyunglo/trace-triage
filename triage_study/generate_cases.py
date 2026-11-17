"""Generate synthetic combat-casualty cases and masked radio reports.

Gold labels come straight from the rules below (MARCH massive-hemorrhage
first, then START), so no expert annotation is involved and every case can
be regenerated from the seed.
"""

import json
import random
from pathlib import Path

SEED = 20261116
N_CASES = 600
MASK_LEVELS = [0.0, 0.1, 0.3, 0.5]
FIELDS = ["walk", "respiration", "radial_pulse", "cap_refill", "follows_commands", "massive_hemorrhage"]
OUT = Path(__file__).parent / "data"

# Injury patterns: (description, base risk). Hidden vitals are drawn with
# probabilities that depend on the pattern, so the description carries real
# but imperfect information when a vital sign goes unreported.
PATTERNS = [
    ("左大腿遭砲彈破片貫穿", "limb"), ("右上臂槍傷", "limb"), ("小腿遭爆炸破片擊中", "limb"),
    ("腹股溝區破片傷", "junctional"), ("腋下穿刺傷", "junctional"),
    ("胸部爆炸傷", "chest"), ("右胸槍傷", "chest"),
    ("頭部遭碎石擊中", "head"), ("建物倒塌致頭部鈍傷", "head"),
    ("腹部破片傷", "abdomen"),
    ("手部輕微擦傷", "minor"), ("腳踝扭傷", "minor"), ("臉部表淺割傷", "minor"),
    ("爆炸震波後耳鳴", "minor"),
]
RISK = {  # P(massive hemorrhage), P(cannot walk), P(resp abnormal), P(perfusion bad), P(not following)
    "limb":       (0.30, 0.65, 0.10, 0.30, 0.10),
    "junctional": (0.35, 0.70, 0.10, 0.40, 0.15),
    "chest":      (0.05, 0.80, 0.45, 0.30, 0.15),
    "head":       (0.03, 0.75, 0.15, 0.15, 0.50),
    "abdomen":    (0.08, 0.80, 0.15, 0.40, 0.15),
    "minor":      (0.00, 0.10, 0.03, 0.03, 0.02),
}
UNITS = ["步一營二連", "砲指部", "海陸九九旅", "後備206旅", "憲兵202指揮部", "工兵群"]
SITES = ["傷患收集點A", "傷患收集點B", "營救護站", "前進集結區", "橋頭陣地"]


def draw_case(rng: random.Random, idx: int) -> dict:
    desc, kind = rng.choice(PATTERNS)
    p_hem, p_nowalk, p_resp, p_perf, p_mental = RISK[kind]
    hemorrhage = rng.random() < p_hem
    walk = not hemorrhage and rng.random() > p_nowalk
    if walk:
        # Walking wounded are usually stable.
        p_resp, p_perf, p_mental = p_resp / 4, p_perf / 4, p_mental / 4
    breathing = rng.random() > 0.04
    breathes_after_airway = breathing or rng.random() < 0.4
    if not breathing:
        rr = 0
    elif rng.random() < p_resp:
        rr = rng.randint(31, 44)
    else:
        rr = rng.randint(12, 28)
    pulse_bad = rng.random() < p_perf
    radial_pulse = not pulse_bad or rng.random() < 0.3
    cap_refill = round(rng.uniform(2.5, 5.0), 1) if pulse_bad else round(rng.uniform(0.8, 2.0), 1)
    follows = rng.random() > p_mental
    truth = {
        "walk": walk, "breathing": breathing, "breathes_after_airway": breathes_after_airway,
        "respiration": rr, "radial_pulse": radial_pulse, "cap_refill": cap_refill,
        "follows_commands": follows, "massive_hemorrhage": hemorrhage,
    }
    return {
        "case_id": f"C{idx:04d}", "injury": desc, "pattern": kind,
        "unit": rng.choice(UNITS), "site": rng.choice(SITES),
        "truth": truth, "category": gold_category(truth),
    }


def gold_category(t: dict) -> str:
    """MARCH (massive hemorrhage first) followed by START."""
    if t["massive_hemorrhage"]:
        return "red"
    if t["walk"]:
        return "green"
    if not t["breathing"]:
        return "red" if t["breathes_after_airway"] else "black"
    if t["respiration"] > 30:
        return "red"
    if not t["radial_pulse"] or t["cap_refill"] > 2:
        return "red"
    if not t["follows_commands"]:
        return "red"
    return "yellow"


def render_report(case: dict, visible: dict) -> str:
    """Radio-style Chinese report built only from the fields that got through."""
    t = case["truth"]
    parts = [f"{case['unit']}於{case['site']}回報：傷員一名，{case['injury']}。"]
    if visible["massive_hemorrhage"]:
        parts.append("有大量出血，正在加壓止血。" if t["massive_hemorrhage"] else "無明顯大出血。")
    else:
        parts.append("出血狀況未回報。")
    if visible["walk"]:
        parts.append("可自行行走。" if t["walk"] else "無法自行行走。")
    else:
        parts.append("行走能力未回報。")
    if visible["respiration"]:
        if not t["breathing"]:
            parts.append("無自發呼吸，" + ("暢通呼吸道後恢復呼吸。" if t["breathes_after_airway"] else "暢通呼吸道後仍無呼吸。"))
        else:
            parts.append(f"呼吸每分鐘 {t['respiration']} 次。")
    else:
        parts.append("呼吸次數未回報。")
    if visible["radial_pulse"]:
        parts.append("橈動脈可觸及。" if t["radial_pulse"] else "橈動脈摸不到。")
    else:
        parts.append("橈動脈未回報。")
    if visible["cap_refill"]:
        parts.append(f"微血管回填 {t['cap_refill']} 秒。")
    else:
        parts.append("微血管回填未回報。")
    if visible["follows_commands"]:
        parts.append("可遵從簡單指令。" if t["follows_commands"] else "無法遵從簡單指令。")
    else:
        parts.append("意識狀態未回報。")
    return "".join(parts)


def main() -> None:
    rng = random.Random(SEED)
    cases = [draw_case(rng, i) for i in range(N_CASES)]
    OUT.mkdir(exist_ok=True)
    with open(OUT / "cases.jsonl", "w") as f:
        for c in cases:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")
    with open(OUT / "trials.jsonl", "w") as f:
        for level in MASK_LEVELS:
            mrng = random.Random(f"{SEED}-{level}")
            for c in cases:
                visible = {k: mrng.random() >= level for k in FIELDS}
                f.write(json.dumps({
                    "trial_id": f"{c['case_id']}-m{int(level * 100):02d}",
                    "case_id": c["case_id"], "mask": level, "visible": visible,
                    "report": render_report(c, visible), "signal": c["category"] == "red",
                }, ensure_ascii=False) + "\n")
    counts = {k: sum(c["category"] == k for c in cases) for k in ["red", "yellow", "green", "black"]}
    print(counts)


if __name__ == "__main__":
    main()
