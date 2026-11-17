# TRACE：通訊受損下的 AI 戰傷檢傷評估

**TRACE**（Triage Recommendation Assessment under Communication Errors）是「人工智慧輔助戰傷檢傷之國軍衛勤門檻政策評估」研究的程式與資料。研究以程式生成的合成傷員評估：當戰場無線電回報是口語、且部分生命徵象沒有傳到時，可在前線離線執行的小型 AI 模型，是否比依 START／MARCH 準則逐條判斷的規則式檢傷更好。

全部資料都是合成的，沒有使用真實病患資料。

## 主要結果

- 回報為口語時，在全新的 600 名傷員（預先登記的確認資料）上，8 億參數的開源模型 Kev-0.8B 在「後送量能緊繃」情境下的政策總成本比最佳規則低 26%（差距 −344，95% 信賴區間 −464 至 −227）。
- 量能充足時差異未獲確認；大量傷患時規則略好但不顯著。
- 制式（固定格式）回報下，規則式檢傷已足夠，本機小型模型都不如規則。

## 資料夾

| 路徑 | 內容 |
|---|---|
| `triage_study/` | 案例生成、判斷者、分析與報告排版程式；重跑步驟見 [triage_study/README.md](triage_study/README.md) |
| `triage_study/PREREGISTRATION.md` | 確認階段的預先登記（在產生確認資料前寫定） |
| `triage_study/data*/` | 合成傷員與回報（`data` 制式、`data_messy` 口語探索、`data_confirm` 口語確認） |
| `triage_study/results/` | 各判斷者的逐筆輸出與彙整數字 |
| `簡報/` | 期末簡報產生程式（pptxgenjs）與深色版圖表 |

## 執行需求

- Python 3.11 以上，套件：`matplotlib`、`python-docx`、`certifi`
- Kev-0.8B：`git clone https://github.com/jaredpalmer/kev triage_study/kev`，再依其說明以 `uv run --extra serve python -m kev.serve --run jaredpalmer/kev-0.8b --port 8008` 啟動
- Qwen3-4B：Ollama 與 `ollama pull qwen3:4b`
- Apple 裝置端模型：macOS，`swiftc -O triage_study/apple_fm/main.swift -o triage_study/apple_fm/fm_triage`
- Jev：TypeSafe API 金鑰，放在環境變數 `JEV_API_KEY`
- 簡報：Node.js 與 `pptxgenjs`，執行 `node 簡報/build_pptx.js`

## 授權

程式以 MIT 授權釋出，見 [LICENSE](LICENSE)。
