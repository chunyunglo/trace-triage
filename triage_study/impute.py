"""Model-as-imputer: the model only estimates unreported fields; START/MARCH rules make the call.

For each trial, every field marked 未回報 becomes a question ("Is X abnormal?") answered from the report.
P(red) is then computed from the rules with visible fields fixed at their reported values and missing ones
at the model's probability (fields treated as independent).

Usage: python3 impute.py {kev|qwen} [--data DIR] [--out NAME]
  writes results/impute/<out or model>.jsonl with the per-field probabilities and P(red).
"""
import argparse, json, re, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).parent
CONTEXT = "以下是一段戰場無線電傷患回報，標示「未回報」的欄位代表資訊缺漏，請依傷勢描述與其他已回報的資訊推估。"
QUESTIONS = {  # field -> question whose YES means "abnormal / pushes toward red"
    "massive_hemorrhage": "這名傷員是否有大量出血？",
    "walk": "這名傷員是否無法自行行走？",
    "respiration": "這名傷員的呼吸是否異常（每分鐘超過 30 次，或需暢通呼吸道才恢復呼吸）？",
    "radial_pulse": "這名傷員的橈動脈是否摸不到？",
    "cap_refill": "這名傷員的微血管回填是否超過 2 秒？",
    "follows_commands": "這名傷員是否無法遵從簡單指令？",
}


def visible_abnormal(report: str, field: str) -> float:
    """1/0 from a reported field (same parsing as the rule judges)."""
    if field == "massive_hemorrhage":
        return float("有大量出血" in report)
    if field == "walk":
        return float("無法自行行走" in report)
    if field == "respiration":
        if "無自發呼吸" in report:
            return 1.0 if "恢復呼吸" in report else -1.0  # -1 = black (expectant)
        return float(int(re.search(r"呼吸每分鐘 (\d+)", report).group(1)) > 30)
    if field == "radial_pulse":
        return float("橈動脈摸不到" in report)
    if field == "cap_refill":
        return float(float(re.search(r"微血管回填 ([\d.]+)", report).group(1)) > 2)
    return float("無法遵從" in report)


def p_red(a: dict) -> float:
    """START/MARCH with probabilities, independence assumed. a[field] in [0,1]; respiration -1 = black."""
    if a["respiration"] == -1.0:  # reported apnoea that did not resolve: black unless bleeding
        return a["massive_hemorrhage"]
    sign = 1 - (1 - a["respiration"]) * (1 - a["radial_pulse"]) * (1 - a["cap_refill"]) * (1 - a["follows_commands"])
    return a["massive_hemorrhage"] + (1 - a["massive_hemorrhage"]) * a["walk"] * sign


def ask_kev(report: str, fields: list[str]) -> dict:
    body = {"model": "kev-latest", "state": report,
            "questions": {f: {"type": "noul", "instructions": CONTEXT + "\n" + QUESTIONS[f]} for f in fields}}
    req = urllib.request.Request("http://127.0.0.1:8008/v1/systemone", data=json.dumps(body, ensure_ascii=False).encode(),
                                 headers={"Content-Type": "application/json"})
    out = json.loads(urllib.request.urlopen(req, timeout=120).read())
    return {f: out["answers"][f]["noul"] for f in fields}


def ask_qwen(report: str, fields: list[str]) -> dict:
    schema = {"type": "object", "properties": {f: {"type": "number"} for f in fields}, "required": fields}
    qs = "\n".join(f"- {f}：{QUESTIONS[f]}" for f in fields)
    body = {"model": "qwen3:4b", "stream": False, "think": False, "format": schema, "options": {"temperature": 0, "seed": 1},
            "messages": [{"role": "system", "content": CONTEXT + "\n只輸出 JSON，每個鍵的值為答案為「是」的機率（0 到 1）。"},
                         {"role": "user", "content": report + "\n\n請回答：\n" + qs}]}
    req = urllib.request.Request("http://127.0.0.1:11434/api/chat", data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    out = json.loads(json.loads(urllib.request.urlopen(req, timeout=180).read())["message"]["content"])
    return {f: min(max(float(out[f]), 0.0), 1.0) for f in fields}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("model", choices=["kev", "qwen"])
    ap.add_argument("--data", default="data")
    ap.add_argument("--out")
    a = ap.parse_args()
    out_dir = ROOT / "results" / "impute"
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{a.out or a.model}.jsonl"
    done = {json.loads(l)["trial_id"] for l in path.open()} if path.exists() else set()
    ask = ask_kev if a.model == "kev" else ask_qwen
    with path.open("a") as f:
        for line in (ROOT / a.data / "trials.jsonl").open():
            t = json.loads(line)
            if t["trial_id"] in done:
                continue
            missing = [k for k, v in t["visible"].items() if not v]
            vals = {k: visible_abnormal(t["report"], k) for k, v in t["visible"].items() if v}
            t0 = time.time()
            est = ask(t["report"], missing) if missing else {}
            vals.update(est)
            f.write(json.dumps({"trial_id": t["trial_id"], "mask": t["mask"], "signal": t["signal"], "est": est,
                                "p": p_red(vals), "ms": (time.time() - t0) * 1000}, ensure_ascii=False) + "\n")
            f.flush()


if __name__ == "__main__":
    main()
