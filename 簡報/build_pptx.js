// Build the TRACE final-report deck as an editable PowerPoint file (triage-tag style).
// Usage: NODE_PATH=<dir with pptxgenjs> node build_pptx.js  ->  TRACE_期末簡報.pptx
const path = require("path");
const pptxgen = require("pptxgenjs");

const HERE = __dirname;
const OUT = path.join(HERE, "TRACE_期末簡報.pptx");
const FIG = (f) => path.join(HERE, "figures", f);
// Author line shown on the cover and closing slides; kept out of the repository in author.txt.
const fs = require("fs");
const AUTHOR = fs.existsSync(path.join(HERE, "author.txt")) ? fs.readFileSync(path.join(HERE, "author.txt"), "utf8").trim() : "";
const REPO = "https://github.com/chunyunglo/trace-triage";

// === THEME ===
const COL = {
  bg: "2F3829", bgDark: "1C211A", paper: "EDE4CC", ink: "222222", cream: "EFE9D8",
  muted: "C9B98A", dim: "8F8A72", red: "D8352A", redText: "E8452C", yel: "E8B923",
  grn: "3F8F4A", grnText: "5FAE68", black: "1A1A1A", hl: "F6D7CF", card: "3A4434",
};
const SANS = "Microsoft JhengHei";
const MONO = "Courier New";
const W = 13.333, H = 7.5;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.title = "TRACE｜人工智慧輔助戰傷檢傷之國軍衛勤門檻政策評估";
pres.author = AUTHOR.split(/\s+/)[1] || "";
pres.theme = { headFontFace: SANS, bodyFontFace: SANS };

// === LAYOUTS ===
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: COL.bg },
  objects: [
    { line: { x: 0.76, y: 6.95, w: W - 1.52, h: 0, line: { color: "4A5442", width: 0.75 } } },
    { text: { text: "TRACE · 期末報告", options: { x: 0.76, y: 7.0, w: 6, h: 0.3, fontFace: MONO, fontSize: 10, color: COL.dim, margin: 0 } } },
    { placeholder: { options: { name: "kicker", type: "body", x: 0.76, y: 0.42, w: 11.8, h: 0.35, fontFace: MONO, fontSize: 13, bold: true, color: COL.muted, margin: 0, charSpacing: 3 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: 0.76, y: 0.8, w: 11.8, h: 0.75, fontFace: SANS, fontSize: 30, bold: true, color: COL.cream, margin: 0, valign: "middle", align: "left" }, text: "" } },
  ],
  slideNumber: { x: W - 1.3, y: 7.0, w: 0.54, h: 0.3, fontFace: MONO, fontSize: 10, color: COL.dim, align: "right" },
});
pres.defineSlideMaster({ title: "COVER", background: { color: COL.bg } });

let n = 0;
function content(kicker, title) {
  const s = pres.addSlide({ masterName: "CONTENT" });
  s.addText(kicker, { placeholder: "kicker" });
  s.addText(title, { placeholder: "title" });
  n++;
  return s;
}

// === COMPONENTS ===
const shadow = () => ({ type: "outer", color: "000000", blur: 8, offset: 3, angle: 90, opacity: 0.35 });

function bullets(s, items, x, y, w, h, size = 18) {
  items = items.map((t) => t.replace(/。$/, ""));
  s.addText(items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1, paraSpaceAfter: 12 } })),
    { x, y, w, h, fontSize: size, color: COL.cream, valign: "top", margin: 0.05, isTextBox: true, lineSpacingMultiple: 1.25 });
}

// Rich text: "**bold**" segments become bold; "!!red!!" segments red.
function rich(str, base = {}) {
  const parts = [];
  str.split(/(\*\*[^*]+\*\*|!![^!]+!!)/).forEach((p) => {
    if (!p) return;
    if (p.startsWith("**")) parts.push({ text: p.slice(2, -2), options: { ...base, bold: true } });
    else if (p.startsWith("!!")) parts.push({ text: p.slice(2, -2), options: { ...base, bold: true, color: "C7321C" } });
    else parts.push({ text: p, options: { ...base } });
  });
  return parts;
}

function note(s, x, y, w, h, heading, paras, size = 18) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: COL.paper }, rectRadius: 0.1, shadow: shadow() });
  const runs = [];
  if (heading) runs.push({ text: heading, options: { bold: true, fontSize: size + 3, color: "1D1D1D", breakLine: true, paraSpaceAfter: 10 } });
  paras.forEach((p, i) => {
    rich(p, { fontSize: size, color: COL.ink }).forEach((r, j, arr) => runs.push(j === arr.length - 1 && i < paras.length - 1 ? { ...r, options: { ...r.options, breakLine: true } } : r));
    if (i < paras.length - 1) runs[runs.length - 1].options.paraSpaceAfter = 10;
  });
  s.addText(runs, { x: x + 0.35, y: y + 0.25, w: w - 0.7, h: h - 0.5, valign: "middle", margin: 0, isTextBox: true, lineSpacingMultiple: 1.3 });
}

function card(s, x, y, w, h, heading, text, accent = COL.muted, size = 16) {
  text = text.replace(/。$/, "");
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: COL.card }, line: { color: "56604E", width: 0.75 }, rectRadius: 0.08 });
  s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: y + 0.28, w: 0.2, h: 0.2, fill: { color: accent } });
  s.addText(heading, { x: x + 0.55, y: y + 0.18, w: w - 0.75, h: 0.42, fontSize: size + 2, bold: true, color: COL.paper, margin: 0, valign: "middle", isTextBox: true });
  s.addText(text, { x: x + 0.25, y: y + 0.75, w: w - 0.5, h: h - 0.9, fontSize: size, color: "EAE3CF", valign: "top", margin: 0, isTextBox: true, lineSpacingMultiple: 1.3 });
}

function table(s, head, rows, x, y, w, opts = {}) {
  const size = opts.size || 13;
  const hl = opts.hl || [];
  const data = [head.map((c) => ({ text: c, options: { bold: true, color: COL.paper, fill: { color: COL.black }, fontFace: SANS } }))];
  rows.forEach((r, i) => data.push(r.map((c) => ({ text: c, options: { color: COL.ink, fill: { color: hl.includes(i) ? COL.hl : COL.paper } } }))));
  s.addTable(data, { x, y, w, colW: opts.colW, fontSize: size, fontFace: SANS, border: { type: "solid", color: "CFC4A6", pt: 0.5 },
    margin: [0.05, 0.1, 0.05, 0.1], rowH: opts.rowH || 0.36, valign: "middle" });
}

function caption(s, text, x, y, w, h = 0.4, size = 14, align = "left") {
  s.addText(rich(text, { fontSize: size, color: "D8D0B8" }), { x, y, w, h, margin: 0, isTextBox: true, align, valign: "top", lineSpacingMultiple: 1.2 });
}

function tag(s, lines) {
  const x = 8.95, y = 0.95, w = 3.5, h = 5.45;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: COL.paper }, rectRadius: 0.12, shadow: shadow(), objectName: "Triage tag" });
  s.addShape(pres.shapes.OVAL, { x: x + w / 2 - 0.2, y: y + 0.3, w: 0.4, h: 0.4, fill: { color: COL.bg }, line: { color: "B9AD8C", width: 5 } });
  s.addText("TRIAGE TAG", { x: x + 0.35, y: y + 0.95, w: 2.8, h: 0.35, fontFace: MONO, fontSize: 15, bold: true, color: COL.ink, charSpacing: 3, margin: 0, isTextBox: true });
  s.addText(lines.join("\n"), { x: x + 0.35, y: y + 1.4, w: 2.85, h: 1.95, fontFace: SANS, fontSize: 13, color: "333333", margin: 0, valign: "top", isTextBox: true, lineSpacingMultiple: 1.3 });
  [["BLACK", COL.black, "EEEEEE"], ["GREEN", COL.grn, "FFFFFF"], ["YELLOW", COL.yel, COL.ink], ["RED · 立即處置", COL.red, "FFFFFF"]].forEach(([t, f, c], i) => {
    const sy = y + h - 0.5 * (4 - i);
    s.addShape(pres.shapes.RECTANGLE, { x, y: sy, w, h: 0.5, fill: { color: f }, line: { color: f, width: 0 } });
    s.addText(t, { x: x + 0.35, y: sy, w: w - 0.5, h: 0.5, color: c, fontFace: SANS, fontSize: 14, bold: true, charSpacing: 2, margin: 0, valign: "middle", isTextBox: true });
  });
}

// Numbered rows: [title, detail] pairs, one per line, for step-by-step explanations.
function rows(s, items, y0 = 1.85, rowH = 1.0, size = 17, start = 1) {
  items.forEach(([t, d], i) => {
    const y = y0 + i * rowH;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.76, y, w: 11.8, h: rowH - 0.14, fill: { color: COL.card }, rectRadius: 0.06 });
    s.addText(String(i + start), { x: 0.95, y, w: 0.55, h: rowH - 0.14, fontFace: MONO, fontSize: 24, bold: true, color: COL.redText, margin: 0, valign: "middle", isTextBox: true });
    s.addText(t, { x: 1.55, y, w: 3.2, h: rowH - 0.14, fontSize: size + 1, bold: true, color: COL.paper, margin: 0, valign: "middle", isTextBox: true });
    s.addText(rich(d, { fontSize: size, color: "EAE3CF" }), { x: 4.95, y, w: 7.25, h: rowH - 0.14, margin: 0, valign: "middle", isTextBox: true, lineSpacingMultiple: 1.2 });
  });
}


// author.txt holds "系級　姓名　學號"; the cover shows them as labelled fields.
const [DEPT = "", NAME = "", SID = ""] = AUTHOR.split(/\s+/);
const BYLINE = AUTHOR ? `姓名：${NAME}　　學號：${SID}　　系級：${DEPT}` : "";

// The deck follows the midterm research plan (動機、問題、方法), then reports results and
// policy recommendations: 15 slides in total. The 43-slide version is in the git history.

// === 01 COVER ===
{
  const s = pres.addSlide({ masterName: "COVER" }); n++;
  s.addText("期末報告", { x: 0.9, y: 0.75, w: 6, h: 0.35, fontFace: MONO, fontSize: 13, bold: true, color: COL.muted, charSpacing: 3, margin: 0, isTextBox: true });
  s.addText("TRACE", { x: 0.9, y: 1.15, w: 6, h: 0.9, fontFace: MONO, fontSize: 60, bold: true, color: COL.paper, charSpacing: 12, margin: 0, isTextBox: true });
  s.addText("Triage Recommendation Assessment under Communication Errors", { x: 0.9, y: 2.05, w: 7.6, h: 0.3, fontFace: MONO, fontSize: 12, color: COL.muted, margin: 0, isTextBox: true });
  s.addText([{ text: "人工智慧輔助戰傷檢傷之", options: { breakLine: true } }, { text: "國軍衛勤" }, { text: "門檻政策", options: { color: COL.redText } }, { text: "評估" }],
    { x: 0.9, y: 2.55, w: 7.8, h: 1.7, fontSize: 40, bold: true, color: COL.cream, margin: 0, isTextBox: true, lineSpacingMultiple: 1.15 });
  s.addText("在通訊受損、回報以口語傳達的條件下，可離線的小型 AI 檢傷模型何時優於規則式檢傷？\n本研究以合成傷員、口語化無線電回報與預先登記的確認資料進行評估。", { x: 0.9, y: 4.5, w: 7.6, h: 0.9, fontSize: 17, color: "D8D0B8", margin: 0, isTextBox: true, lineSpacingMultiple: 1.3 });
  s.addText(BYLINE, { x: 0.9, y: 6.2, w: 7.8, h: 0.45, fontSize: 18, bold: true, color: COL.paper, margin: 0, valign: "middle", isTextBox: true });
  s.addText([{ text: "程式與資料：" }, { text: REPO, options: { hyperlink: { url: REPO } } }], { x: 0.9, y: 6.8, w: 8, h: 0.35, fontFace: MONO, fontSize: 12, color: COL.paper, margin: 0, isTextBox: true });
  tag(s, ["步一營二連／傷患收集點A", "左大腿遭砲彈破片貫穿", "出血狀況：未回報", "呼吸：每分鐘 34 次", "橈動脈：未回報"]);
}

// === 02 MOTIVATION ===
{
  const s = content("01 · 研究動機", "檢傷數位化之後，下一步是 AI 建議");
  bullets(s, ["國防部將「全社會防衛韌性」與軍民醫療體系整合列為施政重點（國防部，2025）。",
    "2026 年漢光 42 號演習驗證衛勤「2 段 3 級」後送體系，並投入驗證軍醫局研發的電子傷票系統（游凱翔，2026）。",
    "電子傷票使傷情回報得以結構化，後續極可能由 AI 提供檢傷建議。"], 0.76, 2.1, 5.9, 4.0, 19);
  note(s, 7.0, 2.05, 5.55, 3.4, "為什麼門檻是政策問題",
    ["戰時後送量能有限：!!低估傷勢!!將延誤救治，**過度檢傷**則排擠救護車與手術量能。",
     "AI 建議門檻的設定，實質上決定這兩類錯誤如何取捨，屬於**資源配置政策**，不宜交由廠商預設"], 17);
}

// === 03 BASICS ===
{
  const s = content("01 · 基本概念", "檢傷分類與 AI 門檻");
  caption(s, "大量傷患同時出現時，必須依傷勢排定處置順序：紅色（立即處置）、黃色（延後處置）、綠色（輕傷）、黑色（無法救治）。本研究聚焦最關鍵的判斷：**這名傷員是否屬於紅色**。AI 讀完回報後給出 0 到 1 的機率，機率大於或等於「門檻」就判為紅色。", 0.76, 1.8, 11.8, 1.2, 17);
  table(s, ["傷員", "AI 給出的機率", "門檻設為 0.5 時", "門檻設為 0.3 時"],
    [["傷員甲", "0.80", "判為紅色", "判為紅色"], ["傷員乙", "0.45", "判為非紅色", "判為紅色"], ["傷員丙", "0.10", "判為非紅色", "判為非紅色"]],
    0.76, 3.25, 6.6, { size: 16, rowH: 0.55, colW: [1.4, 1.7, 1.75, 1.75] });
  note(s, 7.7, 3.25, 4.85, 3.3, "門檻造成兩種錯誤", ["**漏報（低估）**：真正的紅色傷員被判為非紅色，可能延誤救治而死亡。", "**誤報（過度檢傷）**：不是紅色的傷員被判為紅色，佔用救護車與手術資源。", "門檻**越低**，漏報越少但誤報越多；門檻**越高**則相反。"], 15);
  caption(s, "因此，門檻設在哪裡不是技術細節，而是決定「寧可多送，還是寧可少送」的政策選擇。", 0.76, 5.65, 6.6, 0.9, 16);
}

// === 04 GAP AND QUESTIONS ===
{
  const s = content("02 · 研究問題", "規則式檢傷的前提，與三個研究問題");
  table(s, ["規則讀得懂的制式說法", "規則讀不懂的口語說法"],
    [["有大量出血，正在加壓止血", "血一直噴出來，止血帶綁上去了"], ["橈動脈摸不到", "手腕那邊摸不太到脈"],
     ["呼吸每分鐘 34 次", "一分鐘大概三十四下"], ["無法遵從簡單指令", "叫他都沒反應"]],
    0.76, 1.9, 5.7, { size: 14, rowH: 0.55, colW: [2.75, 2.95] });
  caption(s, "START 檢傷流程只要知道生命徵象就能判斷，看似不需要 AI。但戰場無線電回報多半是口語，規則程式只認得預先寫好的用語，其他說法只能當成資料缺漏。", 0.76, 4.9, 5.7, 1.6, 16);
  [["Q1", "回報是**口語**且部分生命徵象缺漏時，可離線的**小型 AI** 是否優於規則式檢傷？在哪些後送量能下？"],
   ["Q2", "AI 的誤差來自**辨識力不足**，還是**門檻偏移**？應如何依量能設定門檻與人工覆核？"],
   ["Q3", "考量斷網、資安與**計算成本**，前線應使用本機模型，還是需要連網的雲端模型？"]]
    .forEach(([q, t], i) => {
      const y = 1.9 + i * 1.6;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.8, y, w: 5.76, h: 1.42, fill: { color: COL.card }, rectRadius: 0.08 });
      s.addText(q, { x: 7.0, y, w: 0.95, h: 1.42, fontFace: MONO, fontSize: 28, bold: true, color: COL.redText, margin: 0, valign: "middle", isTextBox: true });
      s.addText(rich(t, { fontSize: 16, color: COL.cream }), { x: 7.95, y, w: 4.4, h: 1.42, margin: 0, valign: "middle", isTextBox: true, lineSpacingMultiple: 1.2 });
    });
}

// === 05 PIPELINE AND GOLD STANDARD ===
{
  const s = content("03 · 研究方法", "方法一：TRACE 流程與標準答案");
  [["生成傷員", "依 START 流程與 MARCH 原則生成合成傷員及標準答案"], ["通訊受損", "轉為制式或口語回報，各欄位以 0%～50% 機率缺漏"],
   ["判斷", "規則式與 AI 模型分別輸出屬紅色的機率"], ["評估", "計算 d'、c、AUC 與政策總成本"],
   ["政策推算", "推算量能情境門檻、人工覆核區間與部署成本"]].forEach(([h, t], i) => {
    const x = 0.76 + i * 2.39;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.9, w: 2.2, h: 2.5, fill: { color: COL.paper }, rectRadius: 0.1, shadow: shadow() });
    s.addText(String(i + 1), { x: x + 0.25, y: 2.0, w: 1, h: 0.7, fontFace: MONO, fontSize: 34, bold: true, color: "C7321C", margin: 0, isTextBox: true });
    s.addText(h, { x: x + 0.25, y: 2.7, w: 1.8, h: 0.42, fontSize: 18, bold: true, color: "1D1D1D", margin: 0, isTextBox: true });
    s.addText(t, { x: x + 0.22, y: 3.15, w: 1.8, h: 1.2, fontSize: 14, color: COL.ink, margin: 0, valign: "top", isTextBox: true, lineSpacingMultiple: 1.2 });
    if (i < 4) s.addShape(pres.shapes.CHEVRON, { x: x + 2.22, y: 3.0, w: 0.15, h: 0.3, fill: { color: COL.muted } });
  });
  note(s, 0.76, 4.65, 11.8, 2.1, null,
    ["**標準答案由準則直接決定**：大量出血、呼吸每分鐘超過 30 次、橈動脈摸不到或微血管回填超過 2 秒、無法遵從簡單指令，判為紅色；可自行行走為綠色；暢通呼吸道後仍無呼吸為黑色；其餘為黃色（Benson et al., 1996；Butler, 2017）。",
     "600 名合成傷員中紅色 225 名（37.5%）。每名傷員以 0%、10%、30%、50% 四種遮蔽比例各產生一筆回報，共 2,400 筆；全部由程式生成，不涉及真實病患，可完整重現"], 15);
}

// === 06 SPOKEN REPORTS AND PARSER ===
{
  const s = content("03 · 研究方法", "方法二：口語回報與規則解析器");
  table(s, ["欄位狀態", "A 組：規則可預期的說法", "B 組：口語、間接或否定說法"],
    [["大量出血", "有大量出血，正在加壓止血", "血一直噴出來，止血帶綁上去了"], ["無大出血", "無明顯大出血", "沒看到在噴血"],
     ["無法行走", "無法自行行走", "要用擔架抬"], ["呼吸 34 次", "呼吸每分鐘 34 次", "一分鐘喘了三十四下左右"],
     ["無法遵從指令", "無法遵從簡單指令", "叫他都沒反應"]],
    0.76, 1.9, 7.6, { size: 13, rowH: 0.5, colW: [1.6, 2.8, 3.2] });
  caption(s, "每個已回報欄位以 50% 機率採用 B 組說法；缺漏欄位半數註明「未回報」，半數直接省略。結果 92% 的回報至少含一個 B 組說法。規則讀不出來的欄位視為缺漏，分為「當作正常」與「當作異常」兩個版本。", 0.76, 5.1, 7.6, 1.6, 15);
  note(s, 8.7, 1.9, 3.86, 4.7, "公平性檢驗", ["解析器只依 A 組說法撰寫，但已能處理否定句與兩種數字寫法。", "回報全部採用 A 組說法時，解析器與直接讀取欄位的規則在 2,400 筆中判斷完全一致。", "規則表現下降，來自未能預期的說法，**而非**解析器撰寫不周"], 15);
}

// === 07 DESIGN AND JUDGES ===
{
  const s = content("03 · 研究方法", "方法三：研究設計與比較對象");
  note(s, 0.76, 1.8, 3.7, 2.45, "探索", ["以原 600 名傷員的口語回報比較多種作法（英文提示、拆分問題等），最後選定由模型直接判斷"], 14);
  note(s, 4.8, 1.8, 3.7, 2.45, "預先登記", ["在確認資料上執行 AI 模型**之前**，寫定假設與所有設定，存於專案的 PREREGISTRATION.md，隨程式公開"], 14);
  note(s, 8.85, 1.8, 3.7, 2.45, "確認", ["以新的隨機種子生成**全新** 600 名傷員，一次定案，不再調整設定。", "H1 量能緊繃、H2 量能充足：Kev 優於規則；H3 大量傷患：Kev 不優於規則"], 14);
  table(s, ["判斷者", "內容", "執行位置"],
    [["規則式 2 種", "讀不出的欄位「視為正常」或「視為異常」", "前線電腦，不需網路"],
     ["本機 AI 3 個", "Kev-0.8B（8 億參數；Palmer, 2026）、Qwen3-4B（40 億）、Apple 裝置端（約 30 億）", "前線電腦，不需網路"],
     ["雲端 AI 1 個", "Jev 1.14，與 Kev 同類型的商用模型，按使用量付費（TypeSafe, 2026）", "廠商伺服器，必須連網"]],
    0.76, 4.5, 11.8, { size: 13, rowH: 0.44, colW: [1.7, 7.7, 2.4] });
  caption(s, "主實驗（口語回報）比較兩種規則與 Kev；基準實驗（制式回報）比較全部六種。四個 AI 接收逐字相同的準則與問題。", 0.76, 6.45, 11.8, 0.35, 13);
}

// === 08 METRICS AND SCENARIOS ===
{
  const s = content("03 · 研究方法", "方法四：評估指標與三種量能情境");
  table(s, ["指標", "意思"],
    [["低估率（漏報率）", "真正的紅色傷員中，被判為非紅色的比例"],
     ["過度檢傷率", "被判為紅色的傷員中，實際不是紅色的比例"],
     ["AUC", "不受門檻影響的整體分辨能力；0.5 等於亂猜，1.0 完全正確（Swets, 1988）"],
     ["d'（辨識力）", "能否把紅色與非紅色傷員分開，越大越好"],
     ["c（判斷傾向）", "門檻 0.5 時偏向多判（小於 0）或少判（大於 0）紅色"]],
    0.76, 1.9, 7.5, { size: 13, rowH: 0.52, colW: [2.1, 5.4] });
  table(s, ["情境", "漏報 : 誤報成本"], [["量能充足", "10 : 1"], ["量能緊繃", "3 : 1"], ["大量傷患", "1 : 1"]], 8.6, 1.9, 3.96, { size: 16, rowH: 0.62, colW: [2.0, 1.96] });
  caption(s, "量能越緊繃，多送一人的代價越高，成本比越小。本研究取三個代表值，實務上可由衛勤單位依量能設定。", 8.6, 4.5, 3.96, 0.75, 12);
  note(s, 0.76, 5.25, 11.8, 1.45, null, ["**政策總成本 ＝ 成本比 × 漏報筆數 ＋ 誤報筆數**，越低越好。AI 的門檻取使總成本最低者，並以兩折交叉驗證決定；所有差異附 95% 信賴區間（以傷員為單位重複抽樣 1,000 次）。"], 16);
}

// === 09 MAIN RESULT ===
{
  const s = content("04 · 研究結果", "結果一：口語回報、量能緊繃時，Kev 顯著優於規則");
  table(s, ["情境", "判斷者", "總成本", "低估率", "過度檢傷率", "判紅比例", "Kev 減規則（95% CI）"],
    [["量能充足（10:1）", "規則（缺漏視為異常）", "1,308", "0.0%", "58.9%", "92.5%", ""], ["量能充足（10:1）", "Kev-0.8B", "1,280", "2.0%", "55.2%", "83.1%", "−28（−115，+69）"],
     ["量能緊繃（3:1）", "規則（缺漏視為異常）", "1,308", "0.0%", "58.9%", "92.5%", ""], ["量能緊繃（3:1）", "規則（缺漏視為正常）", "1,410", "51.0%", "3.2%", "19.3%", ""],
     ["量能緊繃（3:1）", "Kev-0.8B", "964", "15.5%", "41.2%", "54.7%", "−344（−464，−227）"],
     ["大量傷患（1:1）", "規則（缺漏視為正常）", "480", "51.0%", "3.2%", "19.3%", ""], ["大量傷患（1:1）", "Kev-0.8B", "527", "33.2%", "26.9%", "34.7%", "+47（−14，+108）"]],
    0.76, 1.85, 11.8, { size: 13, rowH: 0.44, hl: [4], colW: [2.0, 2.6, 1.1, 1.1, 1.5, 1.3, 2.2] });
  caption(s, "確認資料：全新 600 名傷員 × 4 種遮蔽比例，共 2,400 筆口語回報。最右欄為 Kev 減去最佳規則的成本差，整個信賴區間小於 0 才代表 Kev 確實較好。\n**AUC（遮蔽 0% → 50%）**：Kev 0.925 → 0.791；規則（缺漏視為正常）0.776 → 0.648；規則（缺漏視為異常）0.597 → 0.528。制式回報下，規則在資訊完整時 AUC 為 1.000；改為口語後只剩 0.776，因為規則讀不懂許多說法。", 0.76, 5.5, 11.8, 1.35, 13);
}

// === 10 VERDICTS ===
{
  const s = content("04 · 研究結果", "結果二：三項預先登記假設的檢驗結果");
  [["H1 量能緊繃：成立", "Kev 總成本較最佳規則低 344（約 26%），95% 信賴區間完全低於 0。規則不是判紅 92.5%，就是漏掉半數紅色傷患", COL.red],
   ["H2 量能充足：差異不顯著", "Kev 的成本仍較低（−28），信賴區間涵蓋 0。漏報代價極高時，兩種作法都傾向幾乎全部判紅，表現相當", COL.yel],
   ["H3 大量傷患：成立", "規則與 Kev 的成本相近（差 47，不顯著），符合預期。寧可少後送時，簡單規則即可勝任", COL.grn]]
    .forEach(([h, t, c], i) => card(s, 0.76 + i * 3.98, 1.85, 3.8, 2.2, h, t, c, 14));
  s.addImage({ path: FIG("messy_confirm.png"), x: 0.76, y: 4.2, w: 6.6, h: 2.65, sizing: { type: "contain", w: 6.6, h: 2.65 }, altText: "口語回報下的 AUC 與政策總成本" });
  note(s, 7.7, 4.25, 4.86, 1.75, null, ["量能緊繃的優勢在探索（−374）與確認（−344）兩批資料重複出現，**結果穩定、可重現**。"], 15);
  caption(s, "左圖：確認資料的 AUC 與政策總成本（＊表示 Kev 顯著低於最佳規則）。", 7.7, 6.12, 4.86, 0.75, 12);
}

// === 11 BASELINE: FAILURE MODES, THRESHOLDS, REVIEW BAND ===
{
  const s = content("04 · 研究結果", "結果三：制式回報下，誤差來源各異，門檻隨量能移動");
  table(s, ["判斷者", "AUC（完整／缺一半）", "門檻 0.5 的低估率", "資訊缺漏一半時的主要問題"],
    [["雲端 Jev 1.14", "0.996／0.926", "0.0% → 33.3%", "門檻偏移：仍能分辨，但轉為少判紅色，調整門檻即可改善"],
     ["Kev-0.8B", "0.982／0.826", "48.9% → 72.4%", "機率集中在 0.20～0.83，調低門檻即可發揮辨識力"],
     ["Qwen3-4B", "0.939／0.824", "1.3% → 8.4%", "辨識力下降，始終偏向多判紅色"],
     ["Apple 裝置端", "0.951／0.777", "4.0% → 31.6%", "辨識力下降，同時轉為少判紅色"],
     ["規則（缺漏視為正常）", "1.000／0.802", "0.0% → 38.2%", "缺漏的欄位一律當作正常，直接漏判"]],
    0.76, 1.85, 11.8, { size: 13, rowH: 0.43, hl: [0, 1], colW: [2.5, 2.2, 2.0, 5.1] });
  table(s, ["模型", "最適門檻（充足 → 大量傷患）", "需人工覆核", "其餘自動判定正確率"],
    [["雲端 Jev", "0.17 → 0.85", "17.4%", "96.0%"], ["Kev-0.8B", "0.32 → 0.41", "32.1%", "91.0%"], ["Qwen3-4B", "0.35 → 0.95", "35.6%", "90.8%"], ["Apple", "0.20 → 0.70", "61.2%", "83.8%"]],
    0.76, 4.7, 7.3, { size: 13, rowH: 0.4, colW: [1.5, 2.6, 1.3, 1.9] });
  note(s, 8.35, 4.7, 4.21, 2.05, null, ["同一模型的最適門檻隨量能大幅移動；機率介於兩門檻之間者交由軍醫覆核。", "制式回報下，**規則式檢傷是成本最低的離線方案**；雲端 Jev 在量能充足與緊繃時成本更低"], 13);
}

// === 12 DEPLOYMENT AND OUTAGE ===
{
  const s = content("04 · 研究結果", "結果四：前線不需要大型模型，雲端在斷線時失效");
  table(s, ["項目", "Kev-0.8B", "Qwen3-4B", "Apple 裝置端", "雲端 Jev"],
    [["參數量", "8 億", "40 億", "約 30 億", "未公開"], ["每筆處理時間（中位數）", "183 毫秒", "1,328 毫秒", "755 毫秒", "441 毫秒"],
     ["執行時記憶體", "3.0 GB", "約 3～4 GB", "系統管理", "不佔本機"], ["斷網時能否運作", "可以", "可以", "可以", "不行"],
     ["資料是否傳出裝置", "否", "否", "否", "是"], ["AUC（完整／缺一半）", "0.982／0.826", "0.939／0.824", "0.951／0.777", "0.996／0.926"]],
    0.76, 1.85, 7.5, { size: 12, rowH: 0.45, hl: [], colW: [2.1, 1.35, 1.35, 1.35, 1.35] });
  table(s, ["斷線比例", "低估率", "過度檢傷率", "判紅比例"],
    [["0%", "33.3%", "12.3%", "28.5%"], ["30%", "23.3%", "37.1%", "45.7%"], ["70%", "10.0%", "50.8%", "68.6%"], ["100%", "0.0%", "56.3%", "85.8%"]],
    8.6, 1.85, 3.96, { size: 12, rowH: 0.45, hl: [3], colW: [0.92, 0.84, 1.16, 1.04] });
  caption(s, "斷線的回報改由「缺漏視為異常」規則判斷（資訊缺漏一半、門檻 0.5）", 8.6, 4.2, 3.96, 0.7, 12);
  note(s, 0.76, 5.15, 11.8, 1.65, null, ["Kev 每筆 183 毫秒、記憶體 3 GB，一般筆電即可離線執行；資訊完整時 AUC 0.982，接近雲端 Jev 的 0.996，而規模為五倍的 Qwen3-4B 並未較高。",
    "雲端斷線改由保守規則接手後，判紅比例由 28.5% 升至 85.8%，判紅者過半不需立即處置：**雲端模型在最需要時最可能失效**，且傷員資料須傳至境外商業伺服器"], 15);
}

// === 13 RECOMMENDATIONS ===
{
  const s = content("05 · 政策建議", "可納入衛勤準則與採購規格的五項建議");
  rows(s, [["依回報方式決定是否導入 AI", "前線能確實依制式格式填寫電子傷票時，以規則式檢傷為主即可，它是成本最低的離線方案；仍以無線電口語回報為主時，部署本機 AI 的效益最明確。"],
    ["依後送量能切換判斷方式", "小型 AI 在**量能緊繃**時優勢最明確，總成本降低 26%；量能充足時與規則相當，大量傷患時規則較省。由衛勤指揮官依當下量能，決定使用規則或 AI，以及門檻高低。"],
    ["明定人工覆核條件", "AI 機率落在「量能充足門檻」與「大量傷患門檻」之間，或回報缺少兩個以上重要欄位時，交由軍醫判斷；AI 提供參考意見，最終判斷權在醫療人員。"],
    ["驗收須含口語與缺漏測試", "要求廠商以口語化、含缺漏、事先未曾看過的回報測試，並報告漏報率、誤報率及與規則相比的政策總成本，而不只是正確率。"],
    ["前線本機為主，雲端為輔", "前線使用可離線的小型模型，雲端模型只用於後方；斷線時的備用規則，必須同時規定後送的優先順序。"]], 1.8, 1.0, 14);
}

// === 14 CONCLUSION AND NEXT STEPS ===
{
  const s = pres.addSlide({ masterName: "COVER" }); n++;
  s.addText("CONCLUSION", { x: 0.9, y: 0.6, w: 6, h: 0.35, fontFace: MONO, fontSize: 13, bold: true, color: COL.muted, charSpacing: 3, margin: 0, isTextBox: true });
  s.addText([{ text: "小型 AI 的價值在於理解口語回報，", options: { breakLine: true } }, { text: "門檻由指揮官決定", options: { color: COL.redText } }],
    { x: 0.9, y: 1.0, w: 7.8, h: 1.5, fontSize: 32, bold: true, color: COL.cream, margin: 0, isTextBox: true, lineSpacingMultiple: 1.15 });
  s.addText("制式回報下，規則式檢傷是成本最低的離線方案。\n回報為口語且量能緊繃時，可離線的 8 億參數模型 Kev 在全新資料上顯著優於規則，政策總成本降低 26%。\n門檻應由指揮官依後送量能設定，不確定案例交由軍醫覆核。",
    { x: 0.9, y: 2.65, w: 7.6, h: 1.75, fontSize: 16, color: "D8D0B8", margin: 0, valign: "top", isTextBox: true, lineSpacingMultiple: 1.35 });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.9, y: 4.55, w: 7.6, h: 1.7, fill: { color: COL.card }, rectRadius: 0.06 });
  s.addText(rich("**後續研究方向**　以演習的真實無線電錄音（含語音辨識）驗證本評估框架；用演習資料估計實際的口語比例；把口語回報的比較擴大到 Qwen3-4B（已預先登記）、Apple 與雲端模型；由衛勤專業訂定各量能情境的成本比。", { fontSize: 13, color: "EAE3CF" }),
    { x: 1.1, y: 4.6, w: 7.2, h: 1.6, margin: 0, valign: "middle", isTextBox: true, lineSpacingMultiple: 1.25 });
  s.addText(BYLINE, { x: 0.9, y: 6.4, w: 7.8, h: 0.35, fontSize: 13, color: COL.muted, margin: 0, isTextBox: true });
  s.addText([{ text: "程式、資料與重現步驟：" }, { text: REPO, options: { hyperlink: { url: REPO } } }], { x: 0.9, y: 6.8, w: 8, h: 0.35, fontFace: MONO, fontSize: 12, color: COL.paper, margin: 0, isTextBox: true });
  tag(s, ["左大腿遭砲彈破片貫穿", "「血一直噴出來，", "　止血帶綁上去了」", "Kev 機率 0.55（案例 C0353）", "量能緊繃門檻約 0.41", "建議：紅色，立即後送"]);
}

// === 15 REFERENCES ===
{
  const s = content("REFERENCES", "參考文獻");
  const refs = [
    [{ text: "國防部（2025）。" }, { text: "中華民國 114 年國防報告書", options: { italic: true } }, { text: "。國防部。https://www.mnd.gov.tw/InformationServices/NDR/85288" }],
    [{ text: "游凱翔（2026 年 8 月 13 日）。漢光演練 2 段 3 級衛勤　驗證傷患處置流程與電子傷票。" }, { text: "經濟日報", options: { italic: true } }, { text: "（中央社稿）。https://money.udn.com/money/story/7307/9688903" }],
    [{ text: (NAME || "本研究程式與資料") + "（2026）。" }, { text: "TRACE", options: { italic: true } }, { text: "［程式與資料］。GitHub。" + REPO }],
    [{ text: "Benson, M., Koenig, K. L., & Schultz, C. H. (1996). Disaster triage: START, then SAVE—A new method of dynamic triage for victims of a catastrophic earthquake. " }, { text: "Prehospital and Disaster Medicine, 11", options: { italic: true } }, { text: "(2), 117–124. https://doi.org/10.1017/S1049023X0004276X" }],
    [{ text: "Butler, F. K. (2017). Two decades of saving lives on the battlefield: Tactical combat casualty care turns 20. " }, { text: "Military Medicine, 182", options: { italic: true } }, { text: "(3), e1563–e1568. https://doi.org/10.7205/MILMED-D-16-00214" }],
    [{ text: "Palmer, J. (2026). " }, { text: "Kev-0.8B", options: { italic: true } }, { text: " [Computer software]. Hugging Face. https://huggingface.co/jaredpalmer/kev-0.8b" }],
    [{ text: "Swets, J. A. (1988). Measuring the accuracy of diagnostic systems. " }, { text: "Science, 240", options: { italic: true } }, { text: "(4857), 1285–1293. https://doi.org/10.1126/science.3287615" }],
    [{ text: "TypeSafe. (2026). " }, { text: "Models", options: { italic: true } }, { text: ". TypeSafe documentation. https://docs.typesafe.ai/models" }],
  ];
  let ry = 1.7;
  const LINES = [1, 2, 1, 2, 2, 1, 1, 1];
  refs.forEach((r, i) => {
    const h = 0.3 * LINES[i] + 0.05;
    s.addText(r.map((p) => ({ text: p.text, options: p.options || {} })), { x: 0.76, y: ry, w: 11.8, h, fontSize: 13, color: COL.cream, valign: "top", margin: 0, isTextBox: true, lineSpacingMultiple: 1.2 });
    ry += h + 0.1;
  });
}

// Mark the text as Traditional Chinese so PowerPoint applies East Asian line-breaking rules
// (no punctuation at the start of a line); pptxgenjs tags every run as en-US by default.
pres.write({ outputType: "nodebuffer" }).then(async (buf) => {
  const zip = await require("jszip").loadAsync(buf);
  for (const f of Object.keys(zip.files).filter((f) => /^ppt\/(slides|slideLayouts|slideMasters)\/[^/]+\.xml$/.test(f)))
    zip.file(f, (await zip.file(f).async("string")).replace(/lang="en-US"/g, 'lang="zh-TW" altLang="en-US"'));
  fs.writeFileSync(OUT, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  console.log(OUT, n, "slides");
});
