"""Re-draw the report figures in the deck's dark olive style -> 簡報/figures/."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "triage_study"))
import analyze
import matplotlib.pyplot as plt

BG, FG, GRID = "#2F3829", "#EFE9D8", "#56604E"
plt.rcParams.update({"figure.facecolor": BG, "axes.facecolor": BG, "savefig.facecolor": BG,
    "axes.edgecolor": GRID, "axes.labelcolor": FG, "axes.titlecolor": FG, "text.color": FG,
    "xtick.color": FG, "ytick.color": FG, "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.5,
    "legend.facecolor": "#262C22", "legend.edgecolor": GRID, "savefig.bbox": "tight", "font.size": 15, "axes.titlesize": 17, "axes.labelsize": 15, "lines.linewidth": 2.4, "lines.markersize": 8,
    "font.family": ["Heiti TC", "Arial Unicode MS"]})
analyze.COLORS.update({"rules_naive": "#7FB3E0", "rules_conservative": "#F2994A", "qwen": "#6CC070",
    "apple": "#E8452C", "kev": "#C9B98A", "jev": "#E8B923"})
analyze.FIG = Path(__file__).parent / "figures"
from matplotlib.axes import Axes
_leg = Axes.legend
def _big_legend(self, *a, **k):
    k["fontsize"] = 12
    k["loc"] = "center left"
    k["bbox_to_anchor"] = (1.02, 0.5)
    return _leg(self, *a, **k)
Axes.legend = _big_legend
trials, preds = analyze.load()
analyze.plot(json.loads((analyze.RES / "summary.json").read_text()), trials, preds)
print("ok")
