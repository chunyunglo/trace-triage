"""Run each judge over data/trials.jsonl and append results to results/<judge>.jsonl.

Usage: python3 judges.py {rules|jev|apple|qwen|decider|kev} [--limit N]
Every judge sees only the radio report text (rules read the visible fields),
never the gold category. Finished trials are skipped, so runs can resume.
"""

import argparse
import os
import json
import ssl
import subprocess
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import certifi

ROOT = Path(__file__).parent
TRIALS = ROOT / "data" / "trials.jsonl"
RESULTS = ROOT / "results"
# Jev API key: environment variable JEV_API_KEY, or a file named by JEV_KEY_FILE (default: ./jev_api_key.txt, git-ignored).
JEV_KEY = Path(os.environ.get("JEV_KEY_FILE", Path(__file__).parent / "jev_api_key.txt"))
JEV_MODEL = "jev-1.14.0"
QWEN_MODEL = "qwen3:4b"

INSTRUCTIONS = (
    "你是國軍戰傷檢傷輔助系統。依下列準則判斷傷員是否屬於「立即處置（紅色）」：\n"
    "1. 有大量出血者為紅色（MARCH 原則）。\n"
    "2. 可自行行走者為綠色。\n"
    "3. 無自發呼吸者：暢通呼吸道後恢復呼吸為紅色，仍無呼吸為黑色。\n"
    "4. 呼吸每分鐘超過 30 次為紅色。\n"
    "5. 橈動脈摸不到或微血管回填超過 2 秒為紅色。\n"
    "6. 無法遵從簡單指令為紅色。\n"
    "7. 其餘為黃色。\n"
    "報告中標示「未回報」的欄位代表資訊缺漏，請依傷勢描述與其他資訊推估。"
)
QUESTION = "這名傷員是否屬於需要立即處置的紅色傷患？"


def load_trials() -> list[dict]:
    return [json.loads(line) for line in TRIALS.open()]


def done_ids(path: Path) -> set[str]:
    if not path.exists():
        return set()
    return {json.loads(line)["trial_id"] for line in path.open() if line.strip()}


def rules_judge(trial: dict, conservative: bool) -> float:
    """Structured-field rules; unreported fields count as normal (naive) or abnormal (conservative)."""
    v, r = trial["visible"], trial["report"]

    def flag(field: str, abnormal: bool) -> bool:
        return abnormal if v[field] else conservative

    if flag("massive_hemorrhage", "有大量出血" in r):
        return 1.0
    if v["walk"] and "可自行行走" in r:
        return 0.0
    if v["respiration"] and "無自發呼吸" in r:
        return 1.0 if "恢復呼吸" in r else 0.0
    rr_high = False
    if v["respiration"] and "呼吸每分鐘" in r:
        rr_high = int(r.split("呼吸每分鐘 ")[1].split(" ")[0]) > 30
    if flag("respiration", rr_high):
        return 1.0
    if flag("radial_pulse", "橈動脈摸不到" in r):
        return 1.0
    cr_bad = False
    if v["cap_refill"]:
        cr_bad = float(r.split("微血管回填 ")[1].split(" ")[0]) > 2
    if flag("cap_refill", cr_bad):
        return 1.0
    if flag("follows_commands", "無法遵從" in r):
        return 1.0
    return 0.0


def jev_call(trial: dict, key: str, ctx: ssl.SSLContext, url: str = "https://api.typesafe.ai/v1/systemone",
             model: str = JEV_MODEL) -> dict:
    body = {
        "model": model,
        "state": trial["report"],
        "questions": {"immediate": {
            "type": "noul",
            "instructions": {"guideline": INSTRUCTIONS, "question": QUESTION},
            "criteria": {"true": "依準則屬於紅色、需要立即處置", "false": "屬於黃色、綠色或黑色"},
        }},
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body, ensure_ascii=False).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    for attempt in range(4):
        t0 = time.time()
        try:
            with urllib.request.urlopen(req, timeout=60, context=ctx) as resp:
                out = json.loads(resp.read())
            return {"trial_id": trial["trial_id"], "p": out["answers"]["immediate"]["noul"],
                    "ms": (time.time() - t0) * 1000, "tokens": out.get("usage", {}).get("input_tokens"),
                    "model": out.get("model")}
        except Exception as error:  # noqa: BLE001 - retried, then recorded
            last = repr(error)[:200]
            time.sleep(2 ** attempt)
    return {"trial_id": trial["trial_id"], "error": last}


def qwen_call(trial: dict) -> dict:
    schema = {"type": "object", "properties": {"probability": {"type": "number"}}, "required": ["probability"]}
    body = {
        "model": QWEN_MODEL, "stream": False, "think": False, "format": schema,
        "options": {"temperature": 0, "seed": 1},
        "messages": [
            {"role": "system", "content": INSTRUCTIONS + "\n只輸出 JSON，probability 為此傷員屬於紅色的機率（0 到 1）。"},
            {"role": "user", "content": trial["report"] + "\n" + QUESTION},
        ],
    }
    req = urllib.request.Request("http://127.0.0.1:11434/api/chat", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            out = json.loads(resp.read())
        p = float(json.loads(out["message"]["content"])["probability"])
        return {"trial_id": trial["trial_id"], "p": min(max(p, 0.0), 1.0), "ms": (time.time() - t0) * 1000}
    except Exception as error:  # noqa: BLE001
        return {"trial_id": trial["trial_id"], "error": repr(error)[:200]}


def run_apple(todo: list[dict], out) -> None:
    proc = subprocess.Popen([str(ROOT / "apple_fm" / "fm_triage"), INSTRUCTIONS + "\n" + QUESTION],
                            stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    for trial in todo:
        proc.stdin.write(json.dumps({"id": trial["trial_id"], "text": trial["report"]}, ensure_ascii=False) + "\n")
        proc.stdin.flush()
        res = json.loads(proc.stdout.readline())
        rec = {"trial_id": res["id"], "ms": res["ms"]}
        if "error" in res:
            rec["error"] = res["error"][:200]
        else:
            rec["p"] = min(max(res["p"], 0.0), 1.0)
            rec["immediate"] = res["immediate"]
        out.write(json.dumps(rec, ensure_ascii=False) + "\n")
        out.flush()
    proc.stdin.close()
    proc.wait()


def run_decider(todo: list[dict], out) -> None:
    """decider-4b v3 (Q8_0 GGUF, Metal) from Mapika/decider-4b-GGUF, local and offline after download."""
    from decider.infer import Decider
    d = Decider("Mapika/decider-4b-GGUF", gguf_file="decider-4b-v3-Q8_0.gguf")
    q = {"immediate": {"type": "noul", "instructions": INSTRUCTIONS + "\n" + QUESTION,
                       "criteria": {"true": "依準則屬於紅色、需要立即處置", "false": "屬於黃色、綠色或黑色"}}}
    for trial in todo:
        t0 = time.time()
        try:
            res = d.system_one(trial["report"], q)
            rec = {"trial_id": trial["trial_id"], "p": float(res["immediate"]["noul"]), "ms": (time.time() - t0) * 1000}
        except Exception as error:  # noqa: BLE001
            rec = {"trial_id": trial["trial_id"], "error": repr(error)[:200]}
        out.write(json.dumps(rec, ensure_ascii=False) + "\n")
        out.flush()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("judge", choices=["rules", "jev", "apple", "qwen", "decider", "kev"])
    ap.add_argument("--limit", type=int)
    args = ap.parse_args()
    RESULTS.mkdir(exist_ok=True)
    trials = load_trials()

    if args.judge == "rules":
        for name, cons in [("rules_naive", False), ("rules_conservative", True)]:
            with open(RESULTS / f"{name}.jsonl", "w") as out:
                for t in trials:
                    t0 = time.perf_counter()
                    p = rules_judge(t, cons)
                    out.write(json.dumps({"trial_id": t["trial_id"], "p": p,
                                          "ms": (time.perf_counter() - t0) * 1000}) + "\n")
        return

    path = RESULTS / f"{args.judge}.jsonl"
    done = done_ids(path)
    todo = [t for t in trials if t["trial_id"] not in done][: args.limit]
    print(f"{args.judge}: {len(todo)} to run", file=sys.stderr)
    with open(path, "a") as out:
        if args.judge == "decider":
            run_decider(todo, out)
        elif args.judge == "kev":
            # Kev-0.8B served locally: cd kev && uv run --extra serve python -m kev.serve --run jaredpalmer/kev-0.8b --port 8008
            for t in todo:
                rec = jev_call(t, "local", None, "http://127.0.0.1:8008/v1/systemone", "kev-latest")
                out.write(json.dumps(rec, ensure_ascii=False) + "\n")
                out.flush()
        elif args.judge == "apple":
            run_apple(todo, out)
        elif args.judge == "jev":
            key = os.environ.get("JEV_API_KEY") or JEV_KEY.read_text().strip()
            ctx = ssl.create_default_context(cafile=certifi.where())
            with ThreadPoolExecutor(8) as pool:
                for rec in pool.map(lambda t: jev_call(t, key, ctx), todo):
                    out.write(json.dumps(rec, ensure_ascii=False) + "\n")
                    out.flush()
        else:
            for t in todo:
                out.write(json.dumps(qwen_call(t), ensure_ascii=False) + "\n")
                out.flush()


if __name__ == "__main__":
    main()
