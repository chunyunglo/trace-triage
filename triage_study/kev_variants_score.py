"""Score results/kev_variants/*.jsonl: AUC by mask level, plus spread of probabilities."""
import json
from pathlib import Path
def auc(r):
    s=[p for y,p in r if y]; n=[p for y,p in r if not y]
    return sum((a>b)+.5*(a==b) for a in s for b in n)/(len(s)*len(n))
for f in sorted((Path(__file__).parent/"results"/"kev_variants").glob("*.jsonl")):
    R=[json.loads(l) for l in f.open()]
    row=[f"{auc([(r['signal'],r['p']) for r in R if r['mask']==m]):.3f}" for m in (0.0,0.1,0.3,0.5)]
    ps=[r["p"] for r in R]; ms=sorted(r["ms"] for r in R)
    print(f"{f.stem:12s} AUC 0/10/30/50%: {' '.join(row)}  all {auc([(r['signal'],r['p']) for r in R]):.3f}  p range {min(ps):.2f}-{max(ps):.2f}  P50 {ms[len(ms)//2]:.0f} ms")
