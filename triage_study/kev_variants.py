"""Exploratory: which Kev-0.8B settings help? Runs a fixed 400-trial subset (100 cases x 4 mask levels).

Variants (served model must already be running on 127.0.0.1:8008):
  zh          the main study's Chinese instructions (baseline)
  en_prompt   English instructions/question, report still Chinese
  en_all      English instructions and an English rendering of the same report
  decompose   six English yes/no questions about the report, combined by the START/MARCH rule
Usage: python3 kev_variants.py <variant> [--tag NAME]   -> results/kev_variants/<tag or variant>.jsonl
"""
import argparse, json, random, time, urllib.request
from pathlib import Path

from judges import INSTRUCTIONS, QUESTION

ROOT = Path(__file__).parent
OUT = ROOT / "results" / "kev_variants"
URL = "http://127.0.0.1:8008/v1/systemone"

EN_INSTR = ("You are a military combat-casualty triage assistant. Decide whether the casualty is RED (immediate treatment) using these rules:\n"
            "1. Massive hemorrhage -> red (MARCH).\n2. Able to walk -> green.\n"
            "3. Not breathing: breathes after airway opened -> red; still not breathing -> black (expectant).\n"
            "4. Respiratory rate over 30 per minute -> red.\n5. No radial pulse or capillary refill over 2 seconds -> red.\n"
            "6. Cannot follow simple commands -> red.\n7. Otherwise -> yellow.\n"
            "Fields marked 'not reported' / 未回報 are missing; infer them from the injury description and the other information.")
EN_Q = "Is this casualty RED, needing immediate treatment?"
INJ = {"左大腿遭砲彈破片貫穿": "shell fragment through the left thigh", "右上臂槍傷": "gunshot wound to the right upper arm",
       "小腿遭爆炸破片擊中": "lower leg hit by blast fragments", "腹股溝區破片傷": "fragment wound to the groin",
       "腋下穿刺傷": "penetrating wound to the armpit", "胸部爆炸傷": "blast injury to the chest", "右胸槍傷": "gunshot wound to the right chest",
       "頭部遭碎石擊中": "head struck by debris", "建物倒塌致頭部鈍傷": "blunt head injury from a building collapse",
       "腹部破片傷": "fragment wound to the abdomen", "手部輕微擦傷": "minor abrasion on the hand", "腳踝扭傷": "sprained ankle",
       "臉部表淺割傷": "superficial cut on the face", "爆炸震波後耳鳴": "ringing ears after a blast wave"}


def en_report(case: dict, v: dict) -> str:
    t = case["truth"]
    p = [f"Radio report: one casualty, {INJ[case['injury']]}."]
    p.append(("Massive bleeding, pressure being applied." if t["massive_hemorrhage"] else "No major bleeding.") if v["massive_hemorrhage"] else "Bleeding: not reported.")
    p.append(("Can walk." if t["walk"] else "Cannot walk.") if v["walk"] else "Walking: not reported.")
    if v["respiration"]:
        p.append(f"Respiratory rate {t['respiration']} per minute." if t["breathing"] else
                 "Not breathing; " + ("breathing resumed after airway opened." if t["breathes_after_airway"] else "still not breathing after airway opened."))
    else:
        p.append("Breathing: not reported.")
    p.append(("Radial pulse present." if t["radial_pulse"] else "No radial pulse.") if v["radial_pulse"] else "Radial pulse: not reported.")
    p.append(f"Capillary refill {t['cap_refill']} seconds." if v["cap_refill"] else "Capillary refill: not reported.")
    p.append(("Follows simple commands." if t["follows_commands"] else "Cannot follow simple commands.") if v["follows_commands"] else "Mental status: not reported.")
    return " ".join(p)


DECOMP = {  # each question is answered from the report; missing fields must be inferred
    "bleed": "Does the casualty have massive bleeding?",
    "walk": "Can the casualty walk?",
    "apnea_black": "Is the casualty not breathing even after the airway is opened?",
    "rr": "Is the respiratory rate over 30 per minute, or was breathing restored only after opening the airway?",
    "perf": "Is the radial pulse absent or capillary refill longer than 2 seconds?",
    "mental": "Is the casualty unable to follow simple commands?",
}


def call(state: str, questions: dict) -> tuple[dict, float]:
    body = {"model": "kev-latest", "state": state, "questions": questions}
    req = urllib.request.Request(URL, data=json.dumps(body, ensure_ascii=False).encode(), headers={"Content-Type": "application/json"})
    t0 = time.time()
    out = json.loads(urllib.request.urlopen(req, timeout=120).read())
    return {k: v["noul"] for k, v in out["answers"].items()}, (time.time() - t0) * 1000


def noul(instr: str, q: str) -> dict:
    return {"type": "noul", "instructions": instr + "\n" + q}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("variant", choices=["zh", "zh_live", "en_prompt", "en_all", "decompose"])
    ap.add_argument("--tag")
    a = ap.parse_args()
    cases = {c["case_id"]: c for c in map(json.loads, (ROOT / "data" / "cases.jsonl").open())}
    trials = [json.loads(l) for l in (ROOT / "data" / "trials.jsonl").open()]
    keep = set(random.Random(7).sample(sorted(cases), 100))
    sub = [t for t in trials if t["case_id"] in keep]
    OUT.mkdir(parents=True, exist_ok=True)
    if a.variant == "zh":  # baseline = the main study's own Kev run on the same trials
        base = {r["trial_id"]: r for r in map(json.loads, (ROOT / "results" / "kev.jsonl").open())}
        with open(OUT / f"{a.tag or 'zh'}.jsonl", "w") as f:
            for t in sub:
                f.write(json.dumps({"trial_id": t["trial_id"], "mask": t["mask"], "signal": t["signal"], "p": base[t["trial_id"]]["p"], "ms": base[t["trial_id"]]["ms"]}) + "\n")
        return
    with open(OUT / f"{a.tag or a.variant}.jsonl", "w") as f:
        for t in sub:
            c = cases[t["case_id"]]
            if a.variant == "zh_live":  # same request body as the main study, sent to whatever server is running
                from judges import jev_call
                r = jev_call(t, "local", None, URL, "kev-latest")
                p, ms = r["p"], r["ms"]
            elif a.variant == "zh":
                ans, ms = call(t["report"], {"immediate": {"type": "noul", "instructions": {"guideline": INSTRUCTIONS, "question": QUESTION}}})
                p = ans["immediate"]
            elif a.variant in ("en_prompt", "en_all"):
                state = t["report"] if a.variant == "en_prompt" else en_report(c, t["visible"])
                ans, ms = call(state, {"immediate": noul(EN_INSTR, EN_Q)})
                p = ans["immediate"]
            else:
                ans, ms = call(en_report(c, t["visible"]), {k: noul("Answer from the casualty report; infer fields marked not reported.", q) for k, q in DECOMP.items()})
                # START/MARCH logic with probabilities: red if bleeding, else (not walking) and (any red sign) and not black.
                other = 1 - (1 - ans["rr"]) * (1 - ans["perf"]) * (1 - ans["mental"])
                p = ans["bleed"] + (1 - ans["bleed"]) * (1 - ans["walk"]) * (1 - ans["apnea_black"]) * other
            f.write(json.dumps({"trial_id": t["trial_id"], "mask": t["mask"], "signal": t["signal"], "p": p, "ms": ms}) + "\n")


if __name__ == "__main__":
    main()
