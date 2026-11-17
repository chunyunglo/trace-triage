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
    { text: { text: "TRACE · 國防（三）期末報告", options: { x: 0.76, y: 7.0, w: 6, h: 0.3, fontFace: MONO, fontSize: 10, color: COL.dim, margin: 0 } } },
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

// === 01 TITLE ===
{
  const s = pres.addSlide({ masterName: "COVER" }); n++;
  s.addText("國防（三）／期末報告", { x: 0.9, y: 0.75, w: 6, h: 0.35, fontFace: MONO, fontSize: 13, bold: true, color: COL.muted, charSpacing: 3, margin: 0, isTextBox: true });
  s.addText("TRACE", { x: 0.9, y: 1.15, w: 6, h: 0.9, fontFace: MONO, fontSize: 60, bold: true, color: COL.paper, charSpacing: 12, margin: 0, isTextBox: true });
  s.addText("Triage Recommendation Assessment under Communication Errors", { x: 0.9, y: 2.05, w: 7.6, h: 0.3, fontFace: MONO, fontSize: 12, color: COL.muted, margin: 0, isTextBox: true });
  s.addText([{ text: "人工智慧輔助戰傷檢傷之", options: { breakLine: true } }, { text: "國軍衛勤" }, { text: "門檻政策", options: { color: COL.redText } }, { text: "評估" }],
    { x: 0.9, y: 2.55, w: 7.8, h: 1.7, fontSize: 40, bold: true, color: COL.cream, margin: 0, isTextBox: true, lineSpacingMultiple: 1.15 });
  s.addText("在通訊受損、回報以口語傳達的條件下，可離線的小型 AI 檢傷模型何時優於規則式檢傷？\n本研究以合成傷員、口語化無線電回報與預先登記的確認資料進行評估。", { x: 0.9, y: 4.5, w: 7.6, h: 0.9, fontSize: 17, color: "D8D0B8", margin: 0, isTextBox: true, lineSpacingMultiple: 1.3 });
  s.addText(AUTHOR, { x: 0.9, y: 6.4, w: 6, h: 0.35, fontFace: MONO, fontSize: 13, color: COL.muted, margin: 0, isTextBox: true });
  s.addText([{ text: "程式與資料：" }, { text: REPO, options: { hyperlink: { url: REPO } } }], { x: 0.9, y: 6.8, w: 8, h: 0.35, fontFace: MONO, fontSize: 12, color: COL.paper, margin: 0, isTextBox: true });
  tag(s, ["步一營二連／傷患收集點A", "左大腿遭砲彈破片貫穿", "出血狀況：未回報", "呼吸：每分鐘 34 次", "橈動脈：未回報"]);
}

// === 02 AGENDA ===
{
  const s = content("CONTENTS", "簡報大綱");
  [["01 背景與問題", "國防政策脈絡、電子傷票的推行現況，以及本研究的三個研究問題"],
   ["02 TRACE 方法", "合成傷員生成、制式與口語兩種回報、規則解析器的公平性檢驗、探索與確認設計、評估指標"],
   ["03 研究結果", "主實驗：口語回報下 Kev 與規則之比較；基準實驗：誤差來源與門檻設定；部署與計算成本"],
   ["04 政策建議", "可納入衛勤準則與採購規格的五項建議，以及研究限制"]]
    .forEach(([h, t], i) => card(s, 0.76 + i * 3.0, 2.3, 2.8, 2.9, h, t, [COL.red, COL.yel, COL.grn, COL.muted][i], 17));
}

// === 03 BACKGROUND ===
{
  const s = content("01 · BACKGROUND", "檢傷數位化之後，下一步是 AI 建議");
  bullets(s, ["國防部將「全社會防衛韌性」與軍民醫療體系整合列為施政重點（國防部，2025）。",
    "2026 年漢光 42 號演習驗證衛勤「2 段 3 級」後送體系，並投入驗證軍醫局研發的電子傷票系統（游凱翔，2026）。",
    "電子傷票使傷情回報得以結構化，後續極可能由 AI 提供檢傷建議。"], 0.76, 2.1, 5.9, 4.0, 19);
  note(s, 7.0, 2.05, 5.55, 3.4, "為什麼門檻是政策問題",
    ["戰時後送量能有限：!!低估傷勢!!將延誤救治，**過度檢傷**則排擠救護車與手術量能。",
     "AI 建議門檻的設定，實質上決定這兩類錯誤如何取捨，屬於**資源配置政策**，不宜交由廠商預設"], 17);
}

// === 03a TRIAGE BASICS ===
{
  const s = content("01 · BASICS", "基本概念一：什麼是檢傷分類");
  caption(s, "大量傷患同時出現、醫療人力與救護車不足時，必須先決定誰優先處置與後送。這個依傷勢嚴重程度排定順序的程序稱為「檢傷分類」，每名傷員會被標上下列四種顏色之一：", 0.76, 1.8, 11.8, 0.9, 17);
  [["紅色：立即處置", "有生命危險，但立即處置就有機會存活，例如大量出血、呼吸過快、休克徵象。", COL.red],
   ["黃色：延後處置", "傷勢嚴重、無法自行行走，但生命徵象暫時穩定，可以等候一段時間。", COL.yel],
   ["綠色：輕傷", "能自行行走的輕傷者，可以最後處理。", COL.grn],
   ["黑色：無法救治", "暢通呼吸道後仍無呼吸，判定為死亡或無法救治。", COL.muted]].forEach(([h, t, c], i) => card(s, 0.76 + i * 3.0, 2.85, 2.8, 2.45, h, t, c, 16));
  note(s, 0.76, 5.55, 11.8, 1.15, null, ["本研究只評估一個問題：**這名傷員是否屬於紅色（需要立即處置）**。把紅色傷員漏判，或把其他傷員誤判為紅色，都會造成後果。"], 17);
}

// === 03a2 PROBABILITY AND THRESHOLD ===
{
  const s = content("01 · BASICS", "基本概念二：AI 如何給出檢傷建議");
  caption(s, "AI 讀完傷員的回報後，不會直接說「紅色」或「不是紅色」，而是給出一個 0 到 1 之間的數字，代表它估計這名傷員是紅色的機率。接著要設定一個「門檻」：機率大於或等於門檻就判為紅色，小於門檻就判為非紅色。", 0.76, 1.8, 11.8, 1.2, 17);
  table(s, ["傷員", "AI 給出的機率", "門檻設為 0.5 時", "門檻設為 0.3 時"],
    [["傷員甲", "0.80", "判為紅色", "判為紅色"], ["傷員乙", "0.45", "判為非紅色", "判為紅色"], ["傷員丙", "0.10", "判為非紅色", "判為非紅色"]],
    0.76, 3.15, 6.6, { size: 16, rowH: 0.55, colW: [1.4, 1.7, 1.75, 1.75] });
  note(s, 7.7, 3.15, 4.85, 3.4, "門檻造成兩種錯誤", ["**漏報（低估）**：真正的紅色傷員被判為非紅色，可能延誤救治而死亡。", "**誤報（過度檢傷）**：不是紅色的傷員被判為紅色，佔用救護車與手術資源。", "門檻**越低**，漏報越少但誤報越多；門檻**越高**則相反。"], 15);
  caption(s, "因此，門檻設在哪裡不是技術細節，而是決定「寧可多送，還是寧可少送」的政策選擇。", 0.76, 5.5, 6.6, 1.0, 16);
}

// === 03b RULE ASSUMPTION ===
{
  const s = content("01 · THE GAP", "規則式檢傷的隱含前提：回報須符合制式格式");
  note(s, 0.76, 1.95, 5.75, 3.35, "規則可解析的制式說法", ["有大量出血，正在加壓止血", "橈動脈摸不到", "呼吸每分鐘 34 次", "無法遵從簡單指令"], 20);
  note(s, 6.8, 1.95, 5.75, 3.35, "規則無法解析的口語說法", ["血一直噴出來，止血帶綁上去了", "手腕那邊摸不太到脈", "一分鐘大概三十四下", "叫他都沒反應"], 20);
  caption(s, "START 檢傷流程（本研究另依戰傷救護的 MARCH 原則，將大出血列為優先）只要知道傷員的生命徵象就能判斷，看似不需要 AI。但戰場無線電回報多半是口語，規則程式只認得預先寫好的用語，遇到其他說法就無法判讀，只能當成資料缺漏。**本研究要回答：在什麼條件下，前線值得用 AI 取代規則式檢傷？**", 0.76, 5.55, 11.8, 1.2, 18);
}

// === 04 QUESTIONS ===
{
  const s = content("01 · RESEARCH QUESTIONS", "三個研究問題");
  [["Q1", "當戰場回報是**口語**、而且部分生命徵象沒有傳到時，可在前線離線運作的**小型 AI** 是否比規則式檢傷更好？在哪些後送量能情況下更好？"],
   ["Q2", "AI 判斷錯誤的主要原因，是**無法分辨傷勢**，還是**門檻設得不對**？國軍應如何依後送量能設定 **AI 門檻並安排人工覆核**？"],
   ["Q3", "考量斷網、資料安全與**計算成本**，前線應使用在本機執行的模型，還是需要連網的雲端模型？"]]
    .forEach(([q, t], i) => {
      const y = 1.95 + i * 1.6;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.76, y, w: 11.8, h: 1.35, fill: { color: COL.card }, rectRadius: 0.08 });
      s.addText(q, { x: 1.05, y, w: 1.2, h: 1.35, fontFace: MONO, fontSize: 36, bold: true, color: COL.redText, margin: 0, valign: "middle", isTextBox: true });
      s.addText(rich(t, { fontSize: 20, color: COL.cream }), { x: 2.3, y, w: 10.0, h: 1.35, margin: 0, valign: "middle", isTextBox: true, lineSpacingMultiple: 1.2 });
    });
}

// === 05 SDT ===
{
  const s = content("01 · FRAMEWORK", "基本概念三：評估 AI 的兩個角度");
  note(s, 0.76, 1.85, 5.75, 2.75, "辨識力（以 d' 表示）", ["AI 能否把紅色傷員和其他傷員分開：紅色傷員得到的機率，是否普遍高於非紅色傷員。", "d' 越大表示分得越清楚。d' 下降時，只能換更好的模型或補充資訊。"], 16);
  note(s, 6.8, 1.85, 5.75, 2.75, "判斷傾向（以 c 表示）", ["在門檻固定為 0.5 時，AI 偏向多判紅色還是少判紅色。", "!!c 小於 0!! 表示偏向多判紅色；**c 大於 0** 表示偏向少判紅色。c 偏離 0 時，只要調整門檻就能修正。"], 16);
  note(s, 0.76, 4.85, 11.8, 1.8, "AUC：不受門檻影響的整體分辨能力", ["從紅色傷員與非紅色傷員中各隨機抽一人，比較兩人的機率，紅色那位機率較高的比例。**0.5 表示與隨機猜測相同，1.0 表示完全正確**，越接近 1 越好。（理論依據：Swets, 1988）"], 16);
}

// === 06 PIPELINE ===
{
  const s = content("02 · TRACE PIPELINE", "TRACE 的五個步驟");
  [["生成傷員", "依 START 流程與 MARCH 原則生成合成傷員及標準答案"], ["通訊受損", "轉為制式或口語回報，各欄位以 0%～50% 機率缺漏"],
   ["判斷", "規則式與 AI 模型分別輸出屬紅色的機率"], ["評估", "計算 d'、c、AUC 與政策總成本"],
   ["政策推算", "推算量能情境門檻、人工覆核區間與部署成本"]].forEach(([h, t], i) => {
    const x = 0.76 + i * 2.39;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.0, w: 2.2, h: 2.75, fill: { color: COL.paper }, rectRadius: 0.1, shadow: shadow() });
    s.addText(String(i + 1), { x: x + 0.25, y: 2.15, w: 1, h: 0.8, fontFace: MONO, fontSize: 38, bold: true, color: "C7321C", margin: 0, isTextBox: true });
    s.addText(h, { x: x + 0.25, y: 2.95, w: 1.8, h: 0.45, fontSize: 18, bold: true, color: "1D1D1D", margin: 0, isTextBox: true });
    s.addText(t, { x: x + 0.22, y: 3.45, w: 1.8, h: 1.85, fontSize: 15, color: COL.ink, margin: 0, valign: "top", isTextBox: true, lineSpacingMultiple: 1.2 });
    if (i < 4) s.addShape(pres.shapes.CHEVRON, { x: x + 2.22, y: 3.2, w: 0.15, h: 0.3, fill: { color: COL.muted } });
  });
  caption(s, "主實驗：以口語回報比較規則式檢傷與 Kev，並以預先登記的全新資料確認。基準實驗：以制式回報比較六種判斷者。全部採用合成資料，無需倫理審查，且可完整重現。", 0.76, 5.15, 11.8, 0.8, 17);
}

// === 06b GLOSSARY ===
{
  const s = content("02 · TERMS", "本簡報使用的名詞");
  table(s, ["名詞", "意思"],
    [["規則式檢傷", "不使用 AI，直接依 START 檢傷流程與 MARCH 原則的條文逐項判斷，例如呼吸每分鐘超過 30 次就判為紅色"],
     ["制式回報／口語回報", "制式回報依固定格式與固定用語填寫；口語回報是無線電中自然講出的話，用語不固定"],
     ["欄位缺漏（遮蔽）", "回報中某些生命徵象沒有傳到，例如通訊中斷而缺少「呼吸次數」。遮蔽比例 30% 表示每個欄位有 30% 機率缺漏"],
     ["本機模型／雲端模型", "本機模型在前線的電腦上執行，不需網路；雲端模型必須連網，把資料傳到廠商伺服器處理"],
     ["參數量", "AI 模型內部可調整數值的數量，大致代表模型規模；越大通常需要越多記憶體與運算時間"],
     ["預先登記", "在取得驗證資料之前，先把要檢驗的假設與分析方法寫下並保存，避免看到結果後才改變說法"],
     ["交叉驗證", "把資料分成兩半，用一半決定門檻、用另一半評估表現，再交換，避免結果過於樂觀"],
     ["95% 信賴區間", "考量抽樣誤差後，真實差異可能落在的範圍。區間不包含 0，表示差異不太可能是偶然造成"]],
    0.76, 1.8, 11.8, { size: 14, rowH: 0.56, colW: [2.6, 9.2] });
}

// === 07 CASES ===
{
  const s = content("02 · METHOD · 合成案例", "依傷勢型態生成生命徵象");
  table(s, ["傷勢型態", "大出血", "不能走", "呼吸異常", "灌流不良", "意識異常"],
    [["四肢", "30%", "65%", "10%", "30%", "10%"], ["交界區（腹股溝、腋下）", "35%", "70%", "10%", "40%", "15%"],
     ["胸部", "5%", "80%", "45%", "30%", "15%"], ["頭部", "3%", "75%", "15%", "15%", "50%"],
     ["腹部", "8%", "80%", "15%", "40%", "15%"], ["輕傷", "0%", "10%", "3%", "3%", "2%"]],
    0.76, 2.05, 8.05, { size: 15, rowH: 0.52, colW: [2.75, 1.0, 1.0, 1.1, 1.1, 1.1] });
  bullets(s, ["14 種傷勢描述，分屬六類型態", "可自行行走者，其呼吸、灌流與意識異常機率再降為四分之一",
    "4% 傷員無自發呼吸，其中 40% 於暢通呼吸道後恢復", "呼吸異常者每分鐘 31～44 次；灌流不良者微血管回填 2.5～5.0 秒，僅 30% 可觸及橈動脈",
    "傷勢描述提供線索但不決定答案，用以檢驗 AI 能否合理推估缺漏資訊"], 9.1, 2.05, 3.45, 4.6, 15);
}

// === 08 GOLD ===
{
  const s = content("02 · METHOD · 標準答案", "標準答案由準則直接決定");
  const rules = ["大量出血 → 紅色（MARCH 原則，Butler, 2017）", "可自行行走 → 綠色", "無自發呼吸：暢通呼吸道後恢復 → 紅色；仍無 → 黑色",
    "呼吸每分鐘超過 30 次 → 紅色", "橈動脈摸不到或微血管回填超過 2 秒 → 紅色", "無法遵從簡單指令 → 紅色", "其餘 → 黃色（START，Benson et al., 1996）"];
  s.addText(rules.map((t, i) => ({ text: t, options: { bullet: { type: "number" }, breakLine: i < rules.length - 1, paraSpaceAfter: 8 } })),
    { x: 0.76, y: 2.0, w: 6.2, h: 4.5, fontSize: 17, color: COL.cream, valign: "top", margin: 0.05, isTextBox: true });
  let x = 7.3; const total = 600, bw = 5.25;
  [[225, "紅 37.5%", COL.red, "FFFFFF"], [104, "黃", COL.yel, COL.ink], [262, "綠", COL.grn, "FFFFFF"], [9, "黑", COL.black, "FFFFFF"]].forEach(([v, l, f, c]) => {
    const w = Math.max(bw * v / total, 0.42);
    s.addText([{ text: String(v), options: { bold: true, fontSize: 20, fontFace: MONO, breakLine: true } }, { text: l, options: { fontSize: 11 } }],
      { x, y: 2.05, w, h: 1.0, fill: { color: f }, color: c, align: "center", valign: "middle", margin: 0, isTextBox: true });
    x += w;
  });
  caption(s, "600 名合成傷員的檢傷分布", 7.3, 3.15, 5.25, 0.35, 12, "center");
  note(s, 7.3, 3.75, 5.25, 2.85, null, ["本研究將「訊號」定義為**紅色**，即需立即處置者。", "標準答案由準則直接決定，無需專家標註，可依同一隨機種子重新生成。",
    "START 是大量傷患檢傷流程；MARCH 是戰傷救護的處置順序，本研究借用其「大出血優先」原則，置於 START 流程之前"], 15);
}

// === 09 MASKING ===
{
  const s = content("02 · METHOD · 通訊受損", "將傷員資料轉為含缺漏的無線電回報");
  s.addShape(pres.shapes.RECTANGLE, { x: 0.76, y: 1.95, w: 11.8, h: 1.45, fill: { color: COL.bgDark } });
  s.addText([{ text: "步一營二連於傷患收集點A回報：傷員一名，左大腿遭砲彈破片貫穿。" }, { text: "出血狀況未回報。", options: { color: COL.redText, bold: true } },
    { text: "無法自行行走。呼吸每分鐘 34 次。" }, { text: "橈動脈未回報。", options: { color: COL.redText, bold: true } }, { text: "微血管回填 1.4 秒。可遵從簡單指令。" }],
    { x: 1.05, y: 1.95, w: 11.3, h: 1.45, fontSize: 16, color: "E9E2C8", valign: "middle", margin: 0, isTextBox: true, lineSpacingMultiple: 1.3 });
  [["四種遮蔽比例", "0%、10%、30%、50%，模擬通訊由完整至嚴重中斷"], ["欄位獨立遮蔽", "出血、行走、呼吸、橈動脈、微血管回填、意識六欄，各自依比例改為「未回報」"],
   ["同一傷員比較", "同一傷員在四種比例下的真實狀態相同，僅可見資訊不同，可直接比較缺漏的影響"], ["傷勢描述一律保留", "AI 可依傷勢推估缺漏欄位但無法確知；600 名傷員 × 4 種比例，共 2,400 筆"]]
    .forEach(([h, t], i) => card(s, 0.76 + i * 3.0, 3.75, 2.8, 2.6, h, t, [COL.yel, COL.red, COL.grn, COL.muted][i], 16));
}

// === 09b SPOKEN REPORTS ===
{
  const s = content("02 · METHOD · 口語回報", "口語回報：同一傷情的不同表述方式");
  table(s, ["欄位狀態", "A 組：規則設計者可預期的說法", "B 組：口語、間接或否定說法"],
    [["大量出血", "有大量出血，正在加壓止血", "血一直噴出來，止血帶綁上去了"], ["無大出血", "無明顯大出血", "沒看到在噴血"],
     ["無法行走", "無法自行行走", "要用擔架抬"], ["呼吸 34 次", "呼吸每分鐘 34 次", "一分鐘喘了三十四下左右"],
     ["橈動脈摸不到", "橈動脈摸不到", "手腕那邊摸不太到脈"], ["無法遵從指令", "無法遵從簡單指令", "叫他都沒反應"]],
    0.76, 1.85, 11.8, { size: 14, rowH: 0.5, colW: [2.4, 4.3, 5.1] });
  caption(s, "每個已回報欄位以 50% 機率採用 B 組說法，欄位順序隨機排列；缺漏欄位半數註明「未回報」，半數直接省略。結果 92% 的回報至少含一個 B 組說法。", 0.76, 5.5, 11.8, 0.9, 15);
}

// === 09c FAIR PARSER ===
{
  const s = content("02 · METHOD · 公平性", "規則解析器：僅依 A 組說法撰寫，並力求完善");
  bullets(s, ["以關鍵字比對程式讀取回報，找出各項生命徵象，再依 START 流程與 MARCH 原則判斷；讀不出來的欄位視為缺漏，分為「當作正常」與「當作異常」兩個版本",
    "程式只依 A 組說法撰寫，但已能處理否定句（如「無明顯大出血」）與兩種數字寫法",
    "公平性檢驗：回報全部採用 A 組說法時，解析器與直接讀取欄位的規則在 2,400 筆中判斷完全一致"], 0.76, 2.0, 6.6, 4.6, 17);
  note(s, 7.7, 2.2, 4.85, 2.8, "因此，規則表現下降的原因在於", ["實際通訊中難免出現、但規則未能預期的說法，**而非**解析器撰寫不周"], 20);
}

// === 09d EXPLORE / CONFIRM ===
{
  const s = content("02 · METHOD · 探索與確認", "研究設計：先行探索，再以預先登記的全新資料確認");
  note(s, 0.76, 1.85, 3.7, 4.75, "探索", ["使用原 600 名傷員的口語回報。", "比較多種作法（英文提示、拆分問題、僅估計缺漏欄位等），最後選定由模型直接判斷"], 17);
  note(s, 4.8, 1.85, 3.7, 4.75, "預先登記", ["於確認資料上執行 AI 模型**之前**，將假設與所有固定設定寫入 PREREGISTRATION.md。", "屬自行登記，沒有第三方時間戳記"], 17);
  note(s, 8.85, 1.85, 3.7, 4.75, "確認", ["以隨機種子 777 生成**全新** 600 名傷員，僅執行一次，不再調整設定。", "H1 量能緊繃：Kev 優於規則", "H2 量能充足：Kev 優於規則", "H3 大量傷患：Kev 不優於規則", "H4（探索性）Kev 對 Qwen3-4B：**未執行**"], 14);
}

// === 10 JUDGES ===
{
  const s = content("02 · METHOD · 判斷者", "比較對象：兩種規則與四個 AI 模型");
  table(s, ["判斷者", "是什麼", "在哪裡執行"],
    [["規則式（缺漏視為正常）", "依檢傷準則逐條判斷；回報沒提到的生命徵象，一律當作正常", "前線電腦，不需網路"],
     ["規則式（缺漏視為異常）", "同上，但回報沒提到的生命徵象，一律當作異常（寧可多判紅色）", "前線電腦，不需網路"],
     ["Qwen3-4B", "通用型 AI 對話模型，規模 40 億參數", "前線電腦，不需網路"],
     ["Apple 裝置端模型", "Apple 電腦作業系統內建的 AI 模型，規模約 30 億參數", "前線電腦，不需網路"],
     ["Kev-0.8B", "專門回答是非題、直接輸出機率的開源 AI 模型，規模 8 億參數，可免費使用", "前線電腦，不需網路"],
     ["Jev 1.14", "商業公司提供的同類型 AI 模型，按使用量付費（TypeSafe, 2026）", "廠商雲端伺服器，必須連網"]],
    0.76, 1.8, 11.8, { size: 14, rowH: 0.52, hl: [4, 5], colW: [2.8, 6.4, 2.6] });
  caption(s, "主實驗（口語回報）比較前兩種規則與 Kev；基準實驗（制式回報）比較全部六種。選擇 Kev 的原因是：Jev 只能連網使用，Kev 是同類型、可在前線離線執行的開源模型（Palmer, 2026）。", 0.76, 5.95, 11.8, 0.9, 15);
}

// === 11 PROMPT ===
{
  const s = content("02 · METHOD · 共同條件", "四個 AI 模型接收逐字相同的準則與問題");
  s.addShape(pres.shapes.RECTANGLE, { x: 0.76, y: 1.9, w: 6.6, h: 4.2, fill: { color: COL.bgDark } });
  s.addText([
    { text: "你是國軍戰傷檢傷輔助系統。依下列準則判斷傷員是否屬於「立即處置（紅色）」：", options: { breakLine: true } },
    { text: "1. 有大量出血者為紅色（MARCH 原則）。", options: { breakLine: true } }, { text: "2. 可自行行走者為綠色。", options: { breakLine: true } },
    { text: "3. 無自發呼吸者：暢通呼吸道後恢復呼吸為紅色，仍無呼吸為黑色。", options: { breakLine: true } },
    { text: "4. 呼吸每分鐘超過 30 次為紅色。", options: { breakLine: true } }, { text: "5. 橈動脈摸不到或微血管回填超過 2 秒為紅色。", options: { breakLine: true } },
    { text: "6. 無法遵從簡單指令為紅色。", options: { breakLine: true } }, { text: "7. 其餘為黃色。", options: { breakLine: true } },
    { text: "報告中標示「未回報」的欄位代表資訊缺漏，請依傷勢描述與其他資訊推估。", options: { breakLine: true, paraSpaceAfter: 8 } },
    { text: "問題：這名傷員是否屬於需要立即處置的紅色傷患？", options: { bold: true, color: COL.yel } }],
    { x: 1.0, y: 2.05, w: 6.15, h: 3.95, fontSize: 14, color: "E9E2C8", valign: "top", margin: 0, isTextBox: true, lineSpacingMultiple: 1.25 });
  bullets(s, ["模型僅能讀取回報文字，無法得知標準答案與遮蔽比例", "每個模型輸出「屬紅色傷患的機率」（0～1）",
    "四個模型的 2,400 筆回報全部完成，無遺漏或錯誤", "程式支援中斷後續跑，已完成的回報不重複送出"], 7.75, 2.05, 4.8, 4.4, 18);
}

// === 12 METRICS ===
{
  const s = content("02 · METHOD · 分析指標", "本研究報告的各項數字");
  table(s, ["指標", "意思", "怎麼判斷好壞"],
    [["低估率（漏報率）", "真正的紅色傷員中，被判為非紅色的比例", "越低越好"],
     ["過度檢傷率", "被判為紅色的傷員中，實際不是紅色的比例", "越低越好"],
     ["判紅比例", "被判為紅色的傷員佔全部傷員的比例", "比例越高，後送負擔越重"],
     ["AUC", "隨機各抽一名紅色與非紅色傷員，紅色那位機率較高的比例", "0.5 等於亂猜，1.0 完全正確"],
     ["d'（辨識力）", "由命中率與誤報率換算，代表分開兩群傷員的程度", "越大越好"],
     ["c（判斷傾向）", "由命中率與誤報率換算，代表偏向多判或少判紅色", "0 為不偏；小於 0 偏向多判紅色"],
     ["政策總成本", "成本比 × 漏報筆數 ＋ 誤報筆數", "越低越好"]],
    0.76, 1.8, 11.8, { size: 14, rowH: 0.48, colW: [2.6, 6.1, 3.1] });
  caption(s, "所有差異都附上 95% 信賴區間：從傷員中重複抽樣 1,000 次並重新計算，取中間 95% 的範圍（同一傷員的四筆回報一起抽）。命中率是紅色傷員被正確判紅的比例，誤報率是非紅色傷員被誤判紅色的比例；誤報率以非紅色傷員為分母，過度檢傷率以被判紅色者為分母，兩者不同。", 0.76, 5.95, 11.8, 0.9, 13);
}

// === 13 POLICY METHOD ===
{
  const s = content("02 · METHOD · 政策情境", "三種後送量能情境與門檻推算方式");
  table(s, ["情境", "漏報 : 誤報成本"], [["量能充足", "10 : 1"], ["量能緊繃", "3 : 1"], ["大量傷患", "1 : 1"]], 0.76, 2.1, 4.6, { size: 19, rowH: 0.75 });
  caption(s, "成本比表示「漏掉 1 名紅色傷員」相當於「多送幾名非紅色傷員」。量能越緊繃，多送一人的代價越高，所以成本比越小。數值為本研究設定的示範值", 0.76, 5.3, 4.6, 0.8, 16);
  bullets(s, ["最適門檻：把 AI 給出的每一個機率值都試一次當作門檻，分別算出政策總成本，選擇成本最低的那一個。四種缺漏程度合併計算，因為前線事先無法知道回報會缺多少",
    "人工覆核：AI 機率介於「量能充足門檻」與「大量傷患門檻」之間的傷員，代表 AI 沒有把握，交由軍醫判斷；其餘依 AI 結果處理",
    "分組門檻：依回報缺少的欄位數（0、1、2、3 個以上）分組，各組分別找最適門檻，再以交叉驗證檢查是否真的有幫助"], 5.8, 2.1, 6.75, 4.6, 19);
}

// === 14 OUTAGE / COST METHOD ===
{
  const s = content("02 · METHOD · 斷線與成本", "雲端斷線模擬與計算成本測量");
  note(s, 0.76, 1.95, 5.75, 3.6, "雲端斷線模擬", ["假設有一部分回報因為斷線無法送到雲端的 Jev，這些回報改用「缺漏視為異常」規則判斷；其餘回報仍由 Jev 判斷。", "斷線的比例分別設為 0%、30%、70%、100%，觀察整體結果如何變化。"], 17);
  note(s, 6.8, 1.95, 5.75, 3.6, "計算成本", ["記錄每筆回報從送出到取得結果所花的時間，以及模型規模、模型檔案大小、執行時佔用的記憶體、跑完全部回報的總時間與費用。",
    "所有本機模型都在同一台記憶體 **8 GB**、沒有獨立顯示卡的 Apple 筆電上執行；Jev 的費用依官方價格計算。"], 17);
}

// === M1 MAIN AUC ===
{
  const s = content("03 · 主實驗 · Q1", "口語回報下，規則的辨識力明顯下降，Kev 維持較高水準");
  table(s, ["判斷者", "遮蔽 0%", "遮蔽 10%", "遮蔽 30%", "遮蔽 50%"],
    [["規則式（缺漏視為正常）", "0.776", "0.802", "0.734", "0.648"], ["規則式（缺漏視為異常）", "0.597", "0.570", "0.547", "0.528"], ["Kev-0.8B", "0.925", "0.885", "0.811", "0.791"]],
    0.76, 2.0, 11.8, { size: 16, rowH: 0.6, hl: [2], colW: [4.2, 1.9, 1.9, 1.9, 1.9] });
  caption(s, "表中數字為 AUC（0.5 等於隨機猜測，1.0 為完全正確），資料為全新的 600 名傷員。固定格式的回報下，規則在資訊完整時 AUC 為 1.000；改為口語回報後，即使資訊完整也只剩 0.776，因為規則讀不懂許多說法。Kev 在各種缺漏程度下都高於規則。規則（缺漏視為正常）在遮蔽 10% 時略高於 0%，差異 0.025 在抽樣誤差範圍內（95% 信賴區間 −0.018～+0.069）。", 0.76, 4.7, 11.8, 1.6, 15);
}

// === M1b HOW COST WORKS ===
{
  const s = content("03 · 主實驗 · Q1", "如何比較優劣：政策總成本的計算方式");
  caption(s, "單看正確率無法反映實際後果，因為漏掉一名紅色傷員和多送一名非紅色傷員的代價不同。本研究用「政策總成本」比較：", 0.76, 1.8, 11.8, 0.8, 17);
  note(s, 0.76, 2.65, 11.8, 1.0, null, ["**政策總成本 ＝ 成本比 × 漏報筆數 ＋ 誤報筆數**　　以「量能緊繃」為例，成本比為 3，即漏掉 1 名紅色傷員的代價，等於多送 3 名非紅色傷員。"], 17);
  table(s, ["判斷方式（量能緊繃）", "漏報筆數", "誤報筆數", "計算", "政策總成本"],
    [["規則式（缺漏視為正常）", "465", "15", "3 × 465 ＋ 15", "1,410"],
     ["規則式（缺漏視為異常）", "0", "1,308", "3 × 0 ＋ 1,308", "1,308"],
     ["Kev-0.8B", "141", "541", "3 × 141 ＋ 541", "964"]],
    0.76, 3.85, 11.8, { size: 16, rowH: 0.5, hl: [2], colW: [4.4, 1.5, 1.5, 2.6, 1.8] });
  caption(s, "總成本越低越好。兩種規則各走一個極端：一個漏掉 465 筆紅色傷員的回報，另一個把 1,308 筆非紅色傷員的回報也判為紅色；Kev 在兩者之間取得較好的平衡。（確認資料為 600 名傷員 × 4 種遮蔽比例，共 2,400 筆回報）", 0.76, 6.0, 11.8, 0.8, 16);
}

// === M2 MAIN COST ===
{
  const s = content("03 · 主實驗 · Q1", "政策總成本：量能緊繃時，Kev 顯著優於規則式檢傷");
  table(s, ["情境", "判斷者", "總成本", "低估率", "過度檢傷率", "判紅比例", "Kev 減規則（95% CI）"],
    [["量能充足（10:1）", "規則（缺漏視為異常）", "1,308", "0.0%", "58.9%", "92.5%", ""], ["量能充足（10:1）", "Kev-0.8B", "1,280", "2.0%", "55.2%", "83.1%", "−28（−115，+69）"],
     ["量能緊繃（3:1）", "規則（缺漏視為異常）", "1,308", "0.0%", "58.9%", "92.5%", ""], ["量能緊繃（3:1）", "規則（缺漏視為正常）", "1,410", "51.0%", "3.2%", "19.3%", ""],
     ["量能緊繃（3:1）", "Kev-0.8B", "964", "15.5%", "41.2%", "54.7%", "−344（−464，−227）"],
     ["大量傷患（1:1）", "規則（缺漏視為正常）", "480", "51.0%", "3.2%", "19.3%", ""], ["大量傷患（1:1）", "Kev-0.8B", "527", "33.2%", "26.9%", "34.7%", "+47（−14，+108）"]],
    0.76, 1.85, 11.8, { size: 13, rowH: 0.48, hl: [4], colW: [2.0, 2.6, 1.1, 1.1, 1.5, 1.3, 2.2] });
  caption(s, "各欄說明：低估率＝紅色傷員被漏判的比例；過度檢傷率＝被判紅色者中實際不是紅色的比例；判紅比例＝被判為紅色的傷員佔全部的比例。最右欄為 Kev 減去最佳規則的成本差，括號內為 95% 信賴區間，整個區間小於 0 才代表 Kev 確實較好。", 0.76, 5.9, 11.8, 0.6, 13);
}

// === M3 MAIN FIG ===
{
  const s = content("03 · 主實驗 · Q1", "確認資料：AUC 與政策總成本");
  s.addImage({ path: FIG("messy_confirm.png"), x: 1.15, y: 1.75, w: 11.0, h: 4.4, sizing: { type: "contain", w: 11.0, h: 4.4 }, altText: "口語回報下的 AUC 與政策總成本" });
  caption(s, "圖一　左：各遮蔽比例下的 AUC；右：三種情境的政策總成本（＊表示 Kev 顯著低於最佳規則）", 0.76, 6.3, 11.8, 0.4, 13, "center");
}

// === M4 VERDICTS ===
{
  const s = content("03 · 主實驗 · Q1", "預先登記假設的檢驗結果：兩項成立，一項未獲確認");
  [["H1 量能緊繃：成立", "Kev 總成本較最佳規則低 344（約 26%），95% 信賴區間完全低於 0。兩種規則皆趨於極端：判紅比例 92.5%，或漏掉半數紅色傷患；Kev 判紅比例 54.7%，低估率 15.5%", COL.red],
   ["H2 量能充足：未獲確認", "探索資料中差異顯著（−128），確認資料僅 −28，信賴區間涵蓋 0。漏報代價極高時，兩者皆傾向幾乎全部判紅，差異有限", COL.yel],
   ["H3 大量傷患：成立", "「缺漏視為正常」規則的成本略低於 Kev（差 47），差異不顯著，符合「Kev 不優於規則」的預期。在寧可少後送的情境下，簡單規則已足夠", COL.grn]]
    .forEach(([h, t, c], i) => card(s, 0.76 + i * 3.98, 1.9, 3.8, 3.1, h, t, c, 15));
  note(s, 0.76, 5.3, 11.8, 1.25, null, ["量能緊繃情境的優勢在探索（−374）與確認（−344）資料中一致出現，**並非事後挑選的結果**。另一項已登記的探索性假設 H4（Kev 與 Qwen3-4B 的比較）未執行。"], 16);
}

// === 15 Q1 TABLE ===
{
  const s = content("03 · 基準實驗 · Q2", "制式回報下，遮蔽 0% 與 50% 的 d'、c 與 AUC（門檻 0.5）");
  table(s, ["判斷者", "遮蔽", "d'", "c", "AUC", "低估率", "過度檢傷率"],
    [["規則式（缺漏視為正常）", "0%", "5.85", "0.08", "1.000", "0.0%", "0.0%"], ["規則式（缺漏視為正常）", "50%", "2.48", "0.94", "0.802", "38.2%", "3.5%"],
     ["規則式（缺漏視為異常）", "50%", "2.10", "−1.80", "0.613", "0.0%", "56.3%"], ["Qwen3-4B", "0%", "3.04", "−0.64", "0.939", "1.3%", "24.0%"],
     ["Qwen3-4B", "50%", "1.56", "−0.59", "0.824", "8.4%", "43.6%"], ["Apple 裝置端", "0%", "3.26", "−0.10", "0.951", "4.0%", "9.6%"],
     ["Apple 裝置端", "50%", "1.50", "0.27", "0.777", "31.6%", "27.0%"], ["Kev-0.8B", "0%", "2.68", "1.31", "0.982", "48.9%", "0.9%"],
     ["Kev-0.8B", "50%", "1.59", "1.39", "0.826", "72.4%", "7.5%"], ["Jev 1.14", "0%", "4.26", "−0.72", "0.996", "0.0%", "11.4%"],
     ["Jev 1.14", "50%", "2.01", "0.58", "0.926", "33.3%", "12.3%"]],
    0.76, 1.85, 11.8, { size: 13, rowH: 0.39, hl: [7, 8, 9, 10], colW: [3.4, 1.2, 1.3, 1.3, 1.3, 1.6, 1.7] });
  caption(s, "d' 越大表示越能分辨紅色與非紅色；c 小於 0 表示偏向多判紅色，大於 0 表示偏向少判紅色。規則式在資訊完整時完全正確，d' 5.85 是計算公式的上限。", 0.76, 6.55, 11.8, 0.3, 12);
}

// === 16 FIG1 ===
{
  const s = content("03 · 基準實驗 · Q2", "缺漏增加時，各判斷者的 d' 下降，c 則朝不同方向偏移");
  s.addImage({ path: FIG("sdt_by_mask.png"), x: 1.4, y: 1.8, w: 10.5, h: 4.1, sizing: { type: "contain", w: 10.5, h: 4.1 }, altText: "各判斷者的 d' 與 c 隨欄位遮蔽比例的變化" });
  caption(s, "圖二　左圖：缺漏越多，所有判斷者的辨識力（d'）都下降。右圖：判斷傾向（c）在 0 以上表示偏向少判紅色、在 0 以下表示偏向多判紅色；Jev 與 Apple 隨缺漏增加由多判轉為少判，Qwen 始終多判，Kev 始終少判", 0.76, 6.0, 11.8, 0.8, 14);
}

// === 17 Q1 FINDINGS ===
{
  const s = content("03 · 基準實驗 · Q2", "四種 AI 模型的失效機制各不相同");
  [["Jev：門檻偏移", "缺漏一半資訊時，分辨能力仍高（AUC 0.926），但判斷傾向由多判紅色轉為少判紅色，漏判率由 0% 升至 33.3%。問題出在門檻，調整門檻就能大幅改善", COL.red],
   ["Kev：尺度錯置", "分辨能力很高（AUC 0.982），但給出的機率都在 0.20 到 0.83 之間，用 0.5 當門檻會漏掉近一半紅色傷員。只要把門檻調低就能改善", COL.red],
   ["Apple：雙重退化", "分辨能力下降（AUC 0.777），同時偏向少判紅色，兩個問題同時出現", COL.yel],
   ["Qwen：辨識下降", "一直偏向多判紅色；主要問題是分辨能力隨缺漏下降，被判紅色者中有 43.6% 實際不是紅色", COL.grn]]
    .forEach(([h, t, c], i) => card(s, 0.76 + i * 3.0, 1.9, 2.8, 4.3, h, t, c, 15));
  caption(s, "規則式呈現典型的取捨：缺漏視為正常會漏掉 38.2% 的紅色傷患；缺漏視為異常雖無漏報，但判紅者中 56.3% 實際不需立即處置。", 0.76, 6.3, 11.8, 0.6, 14);
}

// === 18 ROC ===
{
  const s = content("03 · 基準實驗 · Q2", "資訊缺漏一半時，Jev 的 ROC 曲線仍明顯最高");
  s.addImage({ path: FIG("roc.png"), x: 1.7, y: 1.83, w: 9.9, h: 4.0, sizing: { type: "contain", w: 9.9, h: 4.0 }, altText: "遮蔽 0% 與 50% 時的 ROC 曲線" });
  caption(s, "圖三　ROC 曲線：把門檻從高到低逐一調整，橫軸為誤報率、縱軸為命中率；曲線越靠近左上角越好，斜對角線代表隨機猜測。資訊缺漏一半時（右圖），Jev 的曲線仍最高；Kev 與 Qwen 相近，但 Kev 規模只有 Qwen 的五分之一。\n**意涵：對 Jev 而言，缺漏時的主要問題不是無法分辨，而是原本的門檻不再適用；其餘模型則是辨識力與門檻同時受影響。**", 0.76, 6.0, 11.8, 0.85, 13, "center");
}

// === 19 Q2 TABLE ===
{
  const s = content("03 · 基準實驗 · Q2", "制式回報下，三種量能情境的最適門檻");
  table(s, ["模型", "情境（成本比）", "門檻", "低估率", "過度檢傷率", "判紅比例", "遮蔽 50% 低估率"],
    [["Jev", "量能充足（10:1）", "0.17", "0.7%", "28.0%", "51.7%", "1.8%"], ["Jev", "量能緊繃（3:1）", "0.21", "2.4%", "22.9%", "47.5%", "4.4%"],
     ["Jev", "大量傷患（1:1）", "0.85", "16.7%", "9.0%", "34.3%", "39.6%"], ["Qwen3-4B", "量能充足（10:1）", "0.35", "0.0%", "46.8%", "70.5%", "0.0%"],
     ["Qwen3-4B", "量能緊繃（3:1）", "0.65", "4.0%", "33.7%", "54.3%", "8.4%"], ["Qwen3-4B", "大量傷患（1:1）", "0.95", "22.9%", "17.1%", "34.9%", "41.3%"],
     ["Apple", "量能充足（10:1）", "0.20", "0.0%", "62.0%", "98.8%", "0.0%"], ["Apple", "緊繃與大量傷患", "0.70", "16.7%", "16.8%", "37.5%", "31.6%"],
     ["Kev-0.8B", "量能充足（10:1）", "0.32", "1.1%", "44.5%", "66.8%", "2.7%"], ["Kev-0.8B", "量能緊繃（3:1）", "0.35", "7.1%", "34.4%", "53.1%", "13.3%"],
     ["Kev-0.8B", "大量傷患（1:1）", "0.41", "22.7%", "16.4%", "34.7%", "39.6%"]],
    0.76, 1.8, 11.8, { size: 11, rowH: 0.33, hl: [0, 1, 2], colW: [1.7, 2.6, 1.1, 1.3, 1.6, 1.5, 2.0] });
  caption(s, "讀法：每個模型在三種情境下，政策總成本最低的門檻。同一模型的門檻隨情境大幅變化，例如 Jev 從 0.17 到 0.85；量能越緊繃，門檻越高、判紅越少，但漏報越多。最右欄是資訊缺漏一半時的漏報率。", 0.76, 6.2, 11.8, 0.7, 13);
}

// === 20 Q2 MEANING ===
{
  const s = content("03 · 基準實驗 · Q2", "門檻設定屬於指揮決策，而非單純的技術參數");
  note(s, 0.76, 1.95, 5.75, 3.9, "門檻隨量能大幅移動",
    ["以 Jev 為例，量能充足時門檻為 **0.17**，幾乎不漏報，但約半數傷員被判為紅色；大量傷患時門檻升至 **0.85**，判紅比例降至三分之一，代價是漏掉 16.7% 的紅色傷患，資訊缺漏一半時更接近四成。",
     "漏報與過度後送的取捨，必須由**指揮官**依後送量能決定，並明定於衛勤準則。"], 16);
  s.addText("機率輸出的解析度，決定門檻政策能否落實", { x: 6.8, y: 1.95, w: 5.75, h: 0.45, fontSize: 18, bold: true, color: COL.paper, margin: 0, isTextBox: true });
  table(s, ["模型", "2,400 筆中的機率值種類"], [["Apple", "6 種（0.2 佔 1,469 筆）"], ["Qwen3-4B", "11 種"], ["Jev", "79 種"], ["Kev-0.8B", "1,526 種"]],
    6.8, 2.5, 5.75, { size: 14, rowH: 0.45, colW: [2.0, 3.75] });
  caption(s, "Apple 門檻稍有變動，判紅比例即由 37.5% 跳升至 98.8%。Kev 重設門檻後漏報率接近 Qwen，但三種情境的門檻僅介於 0.32～0.41，尺度狹窄，設定稍有偏差即影響甚鉅。", 6.8, 4.95, 5.75, 1.6, 14);
}

// === 21 REVIEW BAND ===
{
  const s = content("03 · 基準實驗 · Q2", "人工覆核區間：將不確定的案例交由軍醫判斷");
  table(s, ["模型", "AI 沒有把握的機率範圍", "需交軍醫判斷的比例", "其餘由 AI 判斷的正確率"],
    [["Jev", "0.17～0.85", "17.4%", "96.0%"], ["Kev-0.8B", "0.32～0.41", "32.1%", "91.0%"], ["Qwen3-4B", "0.35～0.95", "35.6%", "90.8%"], ["Apple", "0.20～0.70", "61.2%", "83.8%"]],
    0.76, 1.9, 11.8, { size: 15, rowH: 0.48, hl: [0] });
  [["Jev", "僅需將 17.4% 的傷員交由人工覆核，其餘自動判定的正確率達 96.0%", COL.red], ["兩個本機開源模型", "約三分之一須人工覆核，自動判定的正確率約 91%", COL.grn],
   ["Apple", "須覆核六成以上，未能實質減輕人力負擔", COL.yel]].forEach(([h, t, c], i) => card(s, 0.76 + i * 3.98, 4.55, 3.8, 1.95, h, t, c, 16));
}

// === 22 GROUP THRESHOLD ===
{
  const s = content("03 · 基準實驗 · Q2", "依缺漏欄位數分組設定門檻：方向一致，但效益有限");
  bullets(s, ["前線可從電子傷票得知缺漏欄位數，因此測試依缺 0、1、2、3 個以上欄位分組設定門檻（兩折交叉驗證）",
    "各模型大致呈現相同方向：缺漏越多，最適門檻越低。例如 Jev 在量能緊繃時，缺 0 欄的門檻約 0.94，缺 3 欄以上則降至 0.20",
    "然而總成本降幅有限且不穩定（−4.9%～+27.8%，正值表示成本下降，多數在 ±15% 以內）",
    "分組門檻效益不穩定，實務上也難以維護，因此建議改採右側的簡化規定；此為政策推論，並非由本分析直接驗證"], 0.76, 1.95, 6.2, 4.8, 16);
  note(s, 7.3, 2.3, 5.25, 2.6, "建議採行的簡化規定", ["缺漏!!兩個以上!!關鍵欄位時，不論 AI 機率高低，**一律送交人工覆核**"], 22);
}

// === 22b STRUCTURED VS RULES ===
{
  const s = content("03 · 基準實驗 · Q2", "制式回報下，本機模型的政策成本皆高於規則");
  table(s, ["情境", "缺漏視為正常", "缺漏視為異常", "Jev", "Kev-0.8B", "Qwen3-4B", "Apple"],
    [["量能充足（10:1）", "1,465", "584", "407", "813", "791", "1,470"], ["量能緊繃（3:1）", "450", "584", "327", "630", "547", "601"], ["大量傷患（1:1）", "160", "584", "224", "341", "349", "301"]],
    0.76, 2.0, 11.8, { size: 15, rowH: 0.6, colW: [2.2, 2.2, 2.2, 1.1, 1.4, 1.4, 1.3] });
  caption(s, "政策總成本（制式回報，四種遮蔽比例合併；AI 門檻於同一批資料中求得，結果略偏樂觀）。僅雲端 Jev 在量能充足與緊繃時優於規則。**本機小型模型的價值不在制式回報，而在口語回報。**", 0.76, 4.7, 11.8, 1.4, 16);
}

// === 23 COST TABLE ===
{
  const s = content("03 · 部署 · Q3", "計算成本與部署條件比較");
  table(s, ["項目", "規則式", "Kev-0.8B", "Qwen3-4B", "Apple 裝置端", "雲端 Jev"],
    [["模型規模（參數量）", "無", "8 億", "40 億", "約 30 億", "未公開"], ["模型檔大小", "無", "約 1.6 GB", "2.5 GB", "隨作業系統", "不需下載"],
     ["執行時佔用記憶體", "可忽略", "3.0 GB（峰值 3.3）", "約 3～4 GB", "系統管理", "不佔本機"], ["每筆處理時間（毫秒）", "< 0.1", "183／231", "1,328／1,687", "755／4,673", "441／637"],
     ["2,400 筆總時間", "< 1 秒", "約 7 分鐘", "約 53 分鐘", "30 分鐘以上", "約 3 分鐘（8 路）"], ["2,400 筆金額", "0", "0", "0", "0", "約 0.07 美元"],
     ["斷網時能否運作", "可以", "可以", "可以", "可以", "不行"], ["資料是否傳出裝置", "否", "否", "否", "否", "是"],
     ["AUC（資訊完整／缺一半）", "1.000／0.802", "0.982／0.826", "0.939／0.824", "0.951／0.777", "0.996／0.926"]],
    0.76, 1.85, 11.8, { size: 13, rowH: 0.46, colW: [2.5, 1.6, 2.0, 1.8, 1.8, 2.1] });
  caption(s, "每筆處理時間為中位數／最慢 5%。Kev 記憶體為實測值；Qwen 記憶體、Kev 檔案大小與 Apple 參數量依公開規格估計。", 0.76, 6.5, 11.8, 0.35, 12);
}

// === 24 COST TAKEAWAY ===
{
  const s = content("03 · 部署 · Q3", "計算成本分析：前線部署不需要大型模型");
  [["183", "毫秒／筆", "四個 AI 模型中速度最快"], ["3 GB", "記憶體", "一般筆電或加固型平板即可負擔"],
   ["0.982", "AUC（資訊完整）", "接近雲端 Jev 的 0.996"], ["5×", "模型規模差距", "Qwen3-4B 規模為五倍、慢七倍，AUC 未較高"]].forEach(([v, l, t], i) => {
    const x = 0.76 + i * 3.0;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.95, w: 2.8, h: 0.05, fill: { color: COL.red }, line: { color: COL.red, width: 0 } });
    s.addText(v, { x, y: 2.1, w: 2.8, h: 1.0, fontFace: MONO, fontSize: 48, bold: true, color: COL.paper, margin: 0, isTextBox: true });
    s.addText(l, { x, y: 3.1, w: 2.8, h: 0.35, fontFace: MONO, fontSize: 13, bold: true, color: COL.muted, margin: 0, isTextBox: true });
    s.addText(t, { x, y: 3.5, w: 2.7, h: 1.0, fontSize: 15, color: COL.cream, margin: 0, valign: "top", isTextBox: true, lineSpacingMultiple: 1.2 });
  });
  note(s, 0.76, 4.85, 11.8, 1.55, null, ["Kev 可完全離線運作、資料不離開裝置，且正是主實驗中，口語回報、量能緊繃時優於規則的模型。**前線部署的關鍵不在模型規模，而在於事前以口語與缺漏情境校準門檻。**"], 18);
}

// === 25 OUTAGE ===
{
  const s = content("03 · 部署 · Q3", "雲端斷線：在最需要時最可能失效");
  table(s, ["斷線比例", "低估率", "過度檢傷率", "判紅比例"],
    [["0%", "33.3%", "12.3%", "28.5%"], ["30%", "23.3%", "37.1%", "45.7%"], ["70%", "10.0%", "50.8%", "68.6%"], ["100%", "0.0%", "56.3%", "85.8%"]],
    0.76, 2.0, 6.4, { size: 16, rowH: 0.6, hl: [3] });
  caption(s, "讀法：資訊缺漏一半、門檻 0.5 時，斷線比例越高，由保守規則接手的回報越多。漏報雖然減少，但判為紅色的傷員比例由 28.5% 升到 85.8%", 0.76, 5.15, 6.4, 0.4, 13);
  bullets(s, ["雲端 Jev 在資訊缺漏下的辨識力與覆核負擔表現最佳，但必須連網，且傷員資料將傳送至境外商業伺服器，戰時涉及資安與主權風險",
    "斷線越嚴重，由保守規則接手的比例越高：漏報雖下降，判紅比例卻升至 85.8%，幾乎所有傷員皆要求優先後送，將導致後送體系癱瘓"], 7.5, 2.0, 5.05, 4.6, 17);
}

// === 26 RECOMMENDATIONS ===
{
  const s = content("04 · POLICY", "政策建議（一）：何時使用 AI、如何設定門檻");
  rows(s, [["依回報方式決定是否導入 AI", "如果前線能確實依制式格式填寫電子傷票，本機小型 AI 並未優於規則式檢傷（僅雲端 Jev 在部分情境較佳）。前線仍以無線電口語回報為主時，才值得部署本機 AI。"],
    ["依後送量能切換判斷方式", "本研究中，小型 AI 只在**量能緊繃**時明確優於規則；量能充足時兩者相近，大量傷患時規則略好。應由衛勤指揮官依當下量能，決定使用規則或 AI，以及門檻高低。"],
    ["明定人工覆核條件", "AI 的機率落在「量能充足門檻」與「大量傷患門檻」之間，或回報缺少兩個以上重要欄位時，一律交由軍醫判斷。AI 只提供參考意見，最終責任仍屬醫療人員。"]], 1.85, 1.6, 16);
}
{
  const s = content("04 · POLICY", "政策建議（二）：採購驗收與部署方式");
  rows(s, [["驗收須含口語與缺漏測試", "採購 AI 檢傷系統時，應要求廠商以口語化、含缺漏、且事先未曾看過的回報資料測試，並報告漏報率、誤報率及與規則相比的政策總成本，而不只是報告正確率。"],
    ["前線本機為主，雲端為輔", "前線使用可離線運作的小型模型（Kev-0.8B 每筆約 0.2 秒、記憶體約 3 GB），不受斷網影響、資料不外流；需要連網的雲端模型只用於後方。斷線時的備用規則，必須同時規定後送的優先順序。"]], 1.85, 2.3, 17, 4);
}

// === 27 LIMITATIONS ===
{
  const s = content("04 · LIMITATIONS", "研究限制：哪些結論還需要進一步確認");
  rows(s, [["資料是合成的", "傷員資料、生命徵象與口語說法都由研究者以程式產生，不是真實戰場紀錄；口語說法未依傷勢部位調整，也未經語音辨識。結論證明的是評估方法可行，仍需用演習的真實無線電紀錄再驗證。"],
    ["口語比例是設定的", "本研究設定一半的說法是規則沒有預料到的。真實比例可能更高或更低，會直接影響規則與 AI 的差距，需要用演習資料估計，並測試不同比例。"],
    ["口語實驗只完成 Kev", "口語回報的確認實驗只完成 Kev。預先登記的 H4（Kev 與 Qwen3-4B 的比較）未執行，Apple 與 Jev 亦未納入；不同模型在口語回報下的表現，留待後續研究比較。"],
    ["預先登記未經第三方存證", "假設與固定設定寫在專案內的 PREREGISTRATION.md，沒有第三方時間戳記；後續研究應於公開平台登記。"],
    ["提示與成本比未調整", "所有 AI 使用相同的指示文字，沒有針對個別模型調整；模型更新後結果可能改變。成本比是示範值，實際數值應由衛勤專業與指揮體系決定。"]], 1.8, 1.0, 14);
}

// === 28 CONCLUSION ===
{
  const s = pres.addSlide({ masterName: "COVER" }); n++;
  s.addText("CONCLUSION", { x: 0.9, y: 0.75, w: 6, h: 0.35, fontFace: MONO, fontSize: 13, bold: true, color: COL.muted, charSpacing: 3, margin: 0, isTextBox: true });
  s.addText([{ text: "小型 AI 的價值", options: { breakLine: true } }, { text: "在於理解口語回報，", options: { breakLine: true } }, { text: "門檻由指揮官決定", options: { color: COL.redText } }],
    { x: 0.9, y: 1.25, w: 7.8, h: 2.5, fontSize: 40, bold: true, color: COL.cream, margin: 0, isTextBox: true, lineSpacingMultiple: 1.15 });
  s.addText("制式回報下，本機小型 AI 未優於規則式檢傷。\n回報為口語且量能緊繃時，可離線的 8 億參數模型 Kev\n在全新資料上顯著優於規則，政策總成本降低 26%。\n門檻應由指揮官依後送量能設定，不確定案例交由軍醫覆核。",
    { x: 0.9, y: 4.1, w: 7.6, h: 1.7, fontSize: 17, color: "D8D0B8", margin: 0, valign: "top", isTextBox: true, lineSpacingMultiple: 1.35 });
  s.addText("TRACE · " + AUTHOR, { x: 0.9, y: 6.4, w: 7, h: 0.35, fontFace: MONO, fontSize: 13, color: COL.muted, margin: 0, isTextBox: true });
  s.addText([{ text: "程式、資料與重現步驟：" }, { text: REPO, options: { hyperlink: { url: REPO } } }], { x: 0.9, y: 6.8, w: 8, h: 0.35, fontFace: MONO, fontSize: 12, color: COL.paper, margin: 0, isTextBox: true });
  tag(s, ["左大腿遭砲彈破片貫穿", "「血一直噴出來，", "　止血帶綁上去了」", "Kev 機率 0.55（案例 C0353）", "量能緊繃門檻約 0.41", "建議：紅色，立即後送"]);
}

// === 29 REFERENCES ===
{
  const s = content("REFERENCES", "參考文獻");
  const refs = [
    [{ text: "國防部（2025）。" }, { text: "中華民國 114 年國防報告書", options: { italic: true } }, { text: "。國防部。https://www.mnd.gov.tw/InformationServices/NDR/85288" }],
    [{ text: "游凱翔（2026 年 8 月 13 日）。漢光演練 2 段 3 級衛勤　驗證傷患處置流程與電子傷票。" }, { text: "經濟日報", options: { italic: true } }, { text: "（中央社稿）。https://money.udn.com/money/story/7307/9688903" }],
    [{ text: (pres.author || "本研究程式與資料") + "（2026）。" }, { text: "TRACE", options: { italic: true } }, { text: "［程式與資料］。GitHub。" + REPO }],
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
