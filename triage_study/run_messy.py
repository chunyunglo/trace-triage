"""Run Kev-0.8B or Qwen3-4B on a free-text dataset. Same prompt for both; finished trials are skipped.
Usage: python3 run_messy.py {kev|qwen} --data data_messy  -> results/<data>/<model>.jsonl"""
import argparse, json
from pathlib import Path
import judges

judges.INSTRUCTIONS += "回報中沒有提到的欄位，同樣代表資訊缺漏。"
ap = argparse.ArgumentParser(); ap.add_argument("model", choices=["kev", "qwen"]); ap.add_argument("--data", required=True)
a = ap.parse_args()
root = Path(__file__).parent
out = root / "results" / a.data; out.mkdir(parents=True, exist_ok=True)
path = out / f"{a.model}.jsonl"
done = judges.done_ids(path)
with path.open("a") as f:
    for line in (root / a.data / "trials.jsonl").open():
        t = json.loads(line)
        if t["trial_id"] in done: continue
        rec = judges.jev_call(t, "local", None, "http://127.0.0.1:8008/v1/systemone", "kev-latest") if a.model == "kev" else judges.qwen_call(t)
        f.write(json.dumps(rec, ensure_ascii=False) + "\n"); f.flush()
