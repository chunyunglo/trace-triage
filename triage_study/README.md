# AI 戰傷檢傷合成案例評估

期末報告「人工智慧輔助戰傷檢傷之國軍衛勤門檻政策評估」的程式與資料。

## 重跑步驟

```bash
python3 generate_cases.py          # 600 名合成傷員、2,400 筆遮蔽回報 → data/
python3 judges.py rules            # 兩種規則式
python3 judges.py jev              # 雲端 Jev 1.14（金鑰放在環境變數 JEV_API_KEY，或 jev_api_key.txt）
python3 judges.py apple            # Apple 裝置端模型（先 swiftc -O apple_fm/main.swift -o apple_fm/fm_triage）
python3 judges.py qwen             # 本機 Qwen3-4B（需 ollama serve 與 ollama pull qwen3:4b）
python3 judges.py kev              # 本機 Kev-0.8B（先在 kev/ 執行 uv sync --extra serve，再 uv run --extra serve python -m kev.serve --run jaredpalmer/kev-0.8b --host 127.0.0.1 --port 8008）
python3 analyze.py                 # → results/summary.json、results/tables.md、figures/
python3 build_report.py ../人工智慧輔助戰傷檢傷之國軍衛勤門檻政策評估_期末報告.md ../人工智慧輔助戰傷檢傷之國軍衛勤門檻政策評估_期末報告.docx
```

`judges.py` 會跳過已完成的回報，中斷後可直接續跑。

## 檔案

- `generate_cases.py`：依 MARCH（大量出血優先）與 START 產生案例；隨機種子固定為 20261116。
- `judges.py`：六種判斷者（兩種規則式、Qwen、Apple、Kev、Jev），共用同一段準則說明。`decider` 選項為試過但未採用的 decider-4b（GGUF 版在 8 GB Mac 上只輸出 0.5）。
- `analyze.py`：d′、c、AUC、1,000 次 bootstrap、三種政策情境門檻、人工覆核區間、分組門檻（兩折交叉驗證）、斷線模擬。
- `build_report.py`：以課程提供的 Word 檔為模板排版報告（模板不在 repo 中，以環境變數 REPORT_TEMPLATE 指定）。

Jev 共用 1,578,086 個 input token，依每百萬 token 0.042 美元計約 0.07 美元。

## 主實驗：口語回報（以這部分為報告主軸）

```bash
python3 generate_messy.py --out data_messy --novel 0.5                                   # 探索資料（原 600 名傷員）
python3 generate_messy.py --new-cases 600 --seed 777 --out data_confirm --novel 0.5      # 確認資料（全新傷員）
python3 rules_parser.py --data data_messy                                                # 規則解析器（只依 A 組說法撰寫）
python3 run_messy.py kev --data data_messy                                               # Kev-0.8B（需先啟動 kev 伺服器）
python3 score_messy.py --data data_confirm                                               # AUC、政策成本與 bootstrap
python3 messy_tables.py                                                                  # 報告表格數字與圖一
```

確認階段的假設與固定設定寫在 `PREREGISTRATION.md`，於產生確認資料前登記。
`data_messy_novel0/` 是公平性檢查：全部用 A 組說法時，解析器與原規則 2,400 筆完全一致。
探索階段試過但未採用的作法：`kev_variants.py`（英文提示、拆題、溫度）、`impute.py`（只估缺漏欄位）、`hybrid_analysis.py`。
