#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

async function fileExists(filePath) {
  if (!filePath) return false;
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadArtifactTool() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const home = process.env.HOME || "";
  const candidates = [
    process.env.OAI_ARTIFACT_TOOL_MODULE,
    path.resolve(path.dirname(process.execPath), "../node_modules/@oai/artifact-tool/dist/artifact_tool.mjs"),
    path.resolve(scriptDir, "../node_modules/@oai/artifact-tool/dist/artifact_tool.mjs"),
    home ? path.join(home, ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs") : "",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return import(pathToFileURL(candidate).href);
    }
  }

  try {
    return await import("@oai/artifact-tool/dist/artifact_tool.mjs");
  } catch {
    throw new Error([
      "Cannot find @oai/artifact-tool.",
      "Run this script inside a Codex/OpenAI primary runtime, or set OAI_ARTIFACT_TOOL_MODULE to artifact_tool.mjs.",
      "Other agents can still use this skill by following SKILL.md and generating PPTX with their native presentation tools.",
    ].join(" "));
  }
}

const { Presentation, PresentationFile } = await loadArtifactTool();

const palette = [
  { line: "#0f766e", fill: "#ccfbf1" },
  { line: "#c2410c", fill: "#ffedd5" },
  { line: "#2563eb", fill: "#dbeafe" },
  { line: "#9333ea", fill: "#f3e8ff" },
  { line: "#be123c", fill: "#ffe4e6" },
  { line: "#4d7c0f", fill: "#ecfccb" },
];

function usage() {
  const script = path.basename(fileURLToPath(import.meta.url));
  return [
    `Usage: node ${script} --input lesson.json --output-dir outputs`,
    "",
    "Required:",
    "  --input       JSON file with lesson/title/source/slides",
    "",
    "Optional:",
    "  --output-dir  Output directory. Defaults to ./outputs",
  ].join("\n");
}

function parseArgs(argv) {
  const args = { outputDir: path.resolve("outputs") };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === "--input") {
      args.input = value;
      i += 1;
    } else if (key === "--output-dir") {
      args.outputDir = path.resolve(value);
      i += 1;
    } else if (key === "--help" || key === "-h") {
      console.log(usage());
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${key}\n${usage()}`);
    }
  }
  if (!args.input) throw new Error(`Missing --input\n${usage()}`);
  args.input = path.resolve(args.input);
  return args;
}

function hasKanji(text) {
  return /[\u3400-\u9fff々]/u.test(text);
}

function textWidth(text, fontSize) {
  let width = 0;
  for (const ch of Array.from(text)) {
    if (/[0-9A-Za-z]/.test(ch)) width += fontSize * 0.58;
    else if (/[、。，．「」『』（）()・]/u.test(ch)) width += fontSize * 0.56;
    else width += fontSize * 0.98;
  }
  return width;
}

function expandParts(parts) {
  const out = [];
  for (const part of parts) {
    const text = part[0];
    const ruby = part[1] || "";
    if (ruby) out.push({ text, ruby });
    else for (const ch of Array.from(text)) out.push({ text: ch, ruby: "" });
  }
  return out;
}

function fontForSentence(text) {
  const len = Array.from(text).length;
  if (len <= 28) return 50;
  if (len <= 58) return 39;
  if (len <= 88) return 32;
  return 29;
}

function chineseFontFor(text) {
  const len = Array.from(text).length;
  if (len <= 32) return 28;
  if (len <= 62) return 24;
  return 22;
}

function addTextbox(slide, name, text, position, style = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name,
    position,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    typeface: style.typeface || "Hiragino Sans",
    fontSize: style.fontSize || 20,
    color: style.color || "#111827",
    bold: style.bold || false,
    lineSpacing: style.lineSpacing || 1.1,
    alignment: style.alignment || "left",
    verticalAlignment: "top",
    wrap: "square",
    autoFit: "shrinkText",
    insets: style.insets || { top: 0, right: 0, bottom: 0, left: 0 },
  };
  return shape;
}

function addRule(slide, name, left, top, width, color = "#d9d5cc") {
  slide.shapes.add({
    geometry: "rect",
    name,
    position: { left, top, width, height: 1.2 },
    fill: color,
    line: { style: "solid", fill: color, width: 0 },
  });
}

function addLabel(slide, name, text, top, color) {
  addTextbox(slide, name, text, { left: 88, top, width: 430, height: 26 }, {
    fontSize: 20,
    bold: true,
    color,
    typeface: "PingFang SC",
    lineSpacing: 1,
  });
}

function addPanel(slide, name, position, fill, stroke) {
  slide.shapes.add({
    geometry: "roundRect",
    name,
    position,
    fill,
    line: { style: "solid", fill: stroke, width: 1.2 },
    borderRadius: 9,
  });
}

function layoutSentence(parts, frame, mainFont) {
  const rubyFont = Math.max(10, Math.round(mainFont * 0.42));
  const lineHeight = Math.round(rubyFont + mainFont * 1.15 + 10);
  const units = expandParts(parts).map((part) => {
    const mainWidth = textWidth(part.text, mainFont);
    const rubyWidth = part.ruby ? textWidth(part.ruby, rubyFont) : 0;
    return { ...part, chars: Array.from(part.text), width: Math.max(mainWidth, rubyWidth) + 4 };
  });
  const lines = [];
  let cur = [];
  let curW = 0;
  for (const unit of units) {
    const isClosingPunctuation = /^[、。，．）」』]/u.test(unit.text);
    if (cur.length && curW + unit.width > frame.width && !isClosingPunctuation) {
      lines.push(cur);
      cur = [];
      curW = 0;
    }
    cur.push(unit);
    curW += unit.width;
  }
  if (cur.length) lines.push(cur);

  const totalHeight = lines.length * lineHeight;
  const top = frame.top + Math.max(0, Math.floor((frame.height - totalHeight) / 2));
  const positioned = [];
  const flatChars = [];
  let charIndex = 0;
  lines.forEach((line, lineIndex) => {
    const lineTop = top + lineIndex * lineHeight;
    const lineWidth = line.reduce((sum, unit) => sum + unit.width, 0);
    let x = frame.left + Math.max(0, (frame.width - lineWidth) / 2);
    for (const unit of line) {
      const start = charIndex;
      for (const ch of unit.chars) {
        flatChars.push(ch);
        charIndex += 1;
      }
      positioned.push({
        ...unit,
        start,
        end: charIndex,
        lineIndex,
        x,
        lineTop,
        mainY: lineTop + rubyFont + 4,
        rubyFont,
        mainFont,
        lineHeight,
      });
      x += unit.width;
    }
  });
  return { units: positioned, flat: flatChars.join(""), rubyFont, lineHeight, mainFont };
}

function findNth(haystack, needle, occurrence = 1) {
  let from = 0;
  for (let i = 0; i < occurrence; i += 1) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) return -1;
    if (i === occurrence - 1) return idx;
    from = idx + needle.length;
  }
  return -1;
}

function rectsForTarget(layout, target, occurrence = 1) {
  const start = findNth(layout.flat, target, occurrence);
  if (start === -1) throw new Error(`Target not found: ${target}`);
  const end = start + Array.from(target).length;
  const selected = layout.units.filter((unit) => unit.start < end && unit.end > start);
  const byLine = new Map();
  for (const unit of selected) {
    if (!byLine.has(unit.lineIndex)) byLine.set(unit.lineIndex, []);
    byLine.get(unit.lineIndex).push(unit);
  }
  return [...byLine.values()].map((units) => {
    const left = Math.min(...units.map((u) => u.x));
    const right = Math.max(...units.map((u) => u.x + u.width));
    const hasRuby = units.some((u) => u.ruby);
    const top = hasRuby ? Math.min(...units.map((u) => u.lineTop)) - 2 : Math.min(...units.map((u) => u.mainY)) - 5;
    const bottom = Math.max(...units.map((u) => u.mainY + u.mainFont * 1.22));
    return { left, top, width: right - left, height: bottom - top };
  });
}

function drawSentenceWithHighlights(slide, item, annos, frame, mainFont) {
  const layout = layoutSentence(item.parts, frame, mainFont);
  const anchors = [];
  annos.forEach((anno, index) => {
    const color = palette[index % palette.length];
    const rects = rectsForTarget(layout, anno.target, anno.occurrence || 1);
    let anchor = null;
    rects.forEach((rect, rectIndex) => {
      const shape = slide.shapes.add({
        geometry: "roundRect",
        name: `target-${index + 1}-${rectIndex + 1}`,
        position: { left: rect.left - 4, top: rect.top - 2, width: rect.width + 8, height: rect.height + 3 },
        fill: color.fill,
        line: { style: "solid", fill: color.line, width: 1.3 },
        borderRadius: 7,
      });
      if (!anchor) anchor = shape;
    });
    anchors[index] = anchor;
  });

  for (const unit of layout.units) {
    if (unit.ruby) {
      addTextbox(slide, `ruby-${unit.start}`, unit.ruby, {
        left: unit.x,
        top: unit.lineTop,
        width: unit.width,
        height: unit.rubyFont + 6,
      }, {
        fontSize: unit.rubyFont,
        color: "#047857",
        bold: true,
        alignment: "center",
        typeface: "Hiragino Sans",
        lineSpacing: 1,
      });
    }
    addTextbox(slide, `main-${unit.start}`, unit.text, {
      left: unit.x,
      top: unit.mainY,
      width: unit.width,
      height: unit.mainFont * 1.28,
    }, {
      fontSize: unit.mainFont,
      color: "#111827",
      bold: true,
      alignment: unit.ruby ? "center" : "left",
      typeface: "Hiragino Mincho ProN",
      lineSpacing: 1,
    });
  }
  return anchors;
}

function grammarLayout(count) {
  if (count <= 2) return { cols: count, rows: 1, top: 530 };
  if (count <= 4) return { cols: 2, rows: 2, top: 510 };
  return { cols: 3, rows: 2, top: 512 };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function grammarCardWidth(anno, index, count) {
  if (count <= 2) return 520;
  if (count <= 4) return 500;
  const titleFont = 16;
  const bodyFont = 14;
  const titleWidth = textWidth(`${index + 1}. ${anno.title}`, titleFont) + 28;
  const bodyLen = Array.from(anno.body).length;
  const bodyLineChars = 24;
  const bodyWidth = Math.min(bodyLen, bodyLineChars) * bodyFont * 0.52 + 42;
  return clamp(Math.max(titleWidth, bodyWidth), 250, 360);
}

function cardTextLines(text, fontSize, width) {
  const capacity = Math.max(8, Math.floor((width - 24) / (fontSize * 0.54)));
  return Math.ceil(Array.from(text).length / capacity);
}

function grammarCardMetrics(anno, index, count) {
  const titleFont = count <= 2 ? 22 : count <= 4 ? 19 : 16;
  const bodyFont = count <= 2 ? 17 : count <= 4 ? 15 : 14;
  const width = grammarCardWidth(anno, index, count);
  const title = `${index + 1}. ${anno.title}`;
  const titleHeight = cardTextLines(title, titleFont, width) * (titleFont + 4);
  const bodyHeight = cardTextLines(anno.body, bodyFont, width) * (bodyFont + 4);
  const minHeight = count <= 2 ? 112 : count <= 4 ? 78 : 68;
  const maxHeight = count <= 2 ? 126 : count <= 4 ? 86 : 78;
  const height = clamp(14 + titleHeight + bodyHeight + 12, minHeight, maxHeight);
  return { width, height, titleFont, bodyFont, titleHeight, bodyHeight };
}

function drawGrammarCards(slide, annos, anchors) {
  const { cols, rows, top } = grammarLayout(annos.length);
  const left = 80;
  const width = 1120;
  const gap = 12;
  const rowsOfCards = [];
  for (let row = 0; row < rows; row += 1) rowsOfCards.push(annos.slice(row * cols, row * cols + cols));
  const rowMetrics = rowsOfCards.map((rowAnnos, row) =>
    rowAnnos.map((anno, col) => grammarCardMetrics(anno, row * cols + col, annos.length))
  );
  let y = top;
  rowsOfCards.forEach((rowAnnos, row) => {
    let desiredWidths = rowMetrics[row].map((metrics) => metrics.width);
    const desiredTotal = desiredWidths.reduce((sum, value) => sum + value, 0) + gap * (rowAnnos.length - 1);
    if (desiredTotal > width) {
      const scale = (width - gap * (rowAnnos.length - 1)) / desiredWidths.reduce((sum, value) => sum + value, 0);
      desiredWidths = desiredWidths.map((value) => value * scale);
    }
    const rowTotal = desiredWidths.reduce((sum, value) => sum + value, 0) + gap * (rowAnnos.length - 1);
    let x = left + (width - rowTotal) / 2;
    const rowHeight = Math.max(...rowMetrics[row].map((metrics) => metrics.height));
    rowAnnos.forEach((anno, col) => {
      const index = row * cols + col;
      const metrics = rowMetrics[row][col];
      const cardW = desiredWidths[col];
      const color = palette[index % palette.length];
      const card = slide.shapes.add({
        geometry: "roundRect",
        name: `grammar-card-${index + 1}`,
        position: { left: x, top: y, width: cardW, height: rowHeight },
        fill: "#ffffff",
        line: { style: "solid", fill: color.line, width: 2 },
        borderRadius: 8,
      });
      addTextbox(slide, `grammar-title-${index + 1}`, `${index + 1}. ${anno.title}`, {
        left: x + 12,
        top: y + 8,
        width: cardW - 24,
        height: metrics.titleHeight + 4,
      }, {
        fontSize: metrics.titleFont,
        bold: true,
        color: color.line,
        typeface: "PingFang SC",
        lineSpacing: 1,
      });
      addTextbox(slide, `grammar-body-${index + 1}`, anno.body, {
        left: x + 12,
        top: y + 12 + metrics.titleHeight,
        width: cardW - 24,
        height: rowHeight - metrics.titleHeight - 18,
      }, {
        fontSize: metrics.bodyFont,
        color: "#334155",
        typeface: "PingFang SC",
        lineSpacing: 1.1,
      });
      if (anchors[index]) {
        slide.shapes.connect(card, anchors[index], {
          kind: "straight",
          fromSide: "top",
          toSide: "bottom",
          line: { style: "solid", fill: color.line, width: 1.5 },
          head: { type: "arrow", width: "sm", length: "sm" },
        });
      }
      x += cardW + gap;
    });
    y += rowHeight + gap;
  });
}

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

function normalizePlacement(visual) {
  return visual.placement || "visual-slide";
}

function allVisuals(data) {
  return Array.isArray(data.visuals) ? data.visuals : [];
}

function deckVisuals(data) {
  return allVisuals(data).filter((visual) => {
    const placement = normalizePlacement(visual);
    return visual.show !== false && placement !== "hidden" && placement !== "guide" && placement !== "inline";
  });
}

function guideVisuals(data) {
  const visuals = allVisuals(data).filter((visual) => visual.show !== false && normalizePlacement(visual) !== "hidden");
  const guideOnly = visuals.filter((visual) => normalizePlacement(visual) === "guide");
  return (guideOnly.length ? guideOnly : visuals).slice(0, 3);
}

function visualById(data, id) {
  return allVisuals(data).find((visual) => visual.id === id);
}

function resolveAssetPath(assetPath, inputDir) {
  if (!assetPath) return "";
  if (/^https?:\/\//i.test(assetPath)) return assetPath;
  if (assetPath.startsWith("file://")) return fileURLToPath(assetPath);
  return path.isAbsolute(assetPath) ? assetPath : path.resolve(inputDir, assetPath);
}

function imageContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

async function prepareVisualAssets(data, inputDir) {
  for (const visual of allVisuals(data)) {
    if (!visual.path) continue;
    const resolved = resolveAssetPath(visual.path, inputDir);
    visual.__resolvedPath = resolved;
    if (!/^https?:\/\//i.test(resolved)) {
      await fs.access(resolved);
      visual.__imageData = await fs.readFile(resolved);
      visual.__contentType = imageContentType(resolved);
    }
  }
}

function imagePayloadFor(visual, position, overrides = {}) {
  const resolved = visual.__resolvedPath || visual.path;
  if (!resolved) return null;
  const payload = visual.__imageData
    ? { data: visual.__imageData, contentType: visual.__contentType || imageContentType(resolved) }
    : /^https?:\/\//i.test(resolved) ? { uri: resolved } : { path: resolved };
  return {
    ...payload,
    position,
    fit: visual.fit || overrides.fit || "cover",
    borderRadius: overrides.borderRadius ?? 12,
    alt: visual.alt || visual.title || visual.id || "visual asset",
  };
}

function addImageFrame(slide, visual, position, options = {}) {
  const payload = imagePayloadFor(visual, position, options);
  if (!payload) return false;
  slide.images.add(payload);
  return true;
}

function normalizeChartSeries(chart, visualTitle = "chart") {
  if (!chart || typeof chart !== "object") throw new Error(`Visual chart is missing for ${visualTitle}.`);
  const categories = chart.categories || chart.x;
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error(`Visual chart ${visualTitle} must include categories or x.`);
  }
  let series = [];
  if (Array.isArray(chart.series) && chart.series.length) {
    series = chart.series.map((item, index) => ({
      name: item.name || `系列 ${index + 1}`,
      values: Array.isArray(item.values) ? item.values.map(Number) : [],
    }));
  } else if (Array.isArray(chart.values)) {
    series = [{ name: chart.name || chart.label || "数值", values: chart.values.map(Number) }];
  }
  if (!series.length) throw new Error(`Visual chart ${visualTitle} must include values or series.`);
  for (const item of series) {
    if (item.values.length !== categories.length) {
      throw new Error(`Visual chart ${visualTitle} series length must match categories length.`);
    }
    if (item.values.some((value) => !Number.isFinite(value))) {
      throw new Error(`Visual chart ${visualTitle} includes non-numeric values.`);
    }
  }
  return {
    type: chart.type || "bar",
    unit: chart.unit || "",
    categories: categories.map(String),
    series,
    min: typeof chart.min === "number" ? chart.min : 0,
    max: typeof chart.max === "number" ? chart.max : undefined,
  };
}

function validateVisuals(data) {
  if (data.visuals === undefined) return;
  if (!Array.isArray(data.visuals)) throw new Error("visuals must be an array when supplied.");
  const ids = new Set();
  for (const [index, visual] of data.visuals.entries()) {
    if (!visual || typeof visual !== "object") throw new Error(`Visual ${index + 1} must be an object.`);
    if (!visual.id || typeof visual.id !== "string") throw new Error(`Visual ${index + 1} must include id.`);
    if (ids.has(visual.id)) throw new Error(`Duplicate visual id: ${visual.id}`);
    ids.add(visual.id);
    const kind = visual.kind || "image";
    if (!["scene", "image", "chart", "diagram"].includes(kind)) {
      throw new Error(`Visual ${visual.id} has unsupported kind: ${kind}`);
    }
    if (!visual.title) throw new Error(`Visual ${visual.id} must include title.`);
    if (kind === "chart" && visual.render !== "image") normalizeChartSeries(visual.chart, visual.title);
    if (kind !== "chart" && !visual.path && !Array.isArray(visual.points) && !Array.isArray(visual.labels) && !visual.caption) {
      throw new Error(`Visual ${visual.id} needs path, points, labels, or caption.`);
    }
  }
  for (const [index, item] of data.slides.entries()) {
    if (item.visualId && !visualById(data, item.visualId)) {
      throw new Error(`Slide ${index + 1} references missing visualId: ${item.visualId}`);
    }
  }
}

function validateDeck(data) {
  if (!data || typeof data !== "object") throw new Error("Input JSON must be an object.");
  if (!data.lesson || !data.title || !data.source) throw new Error("Input must include lesson, title, and source.");
  if (!Array.isArray(data.slides) || data.slides.length === 0) throw new Error("Input must include non-empty slides array.");
  if (data.questions && !Array.isArray(data.questions)) throw new Error("questions must be an array when supplied.");
  for (const [index, item] of data.slides.entries()) {
    if (!item.jp || !item.zh) throw new Error(`Slide ${index + 1} must include jp and zh.`);
    if (!Array.isArray(item.parts) || item.parts.length === 0) throw new Error(`Slide ${index + 1} must include parts.`);
    if (!Array.isArray(item.annotations) || item.annotations.length < 2 || item.annotations.length > 6) {
      throw new Error(`Slide ${index + 1} must include 2-6 annotations.`);
    }
    const joined = item.parts.map((part) => part[0]).join("");
    if (joined !== item.jp) throw new Error(`Slide ${index + 1} parts do not match jp.`);
    for (const [partIndex, part] of item.parts.entries()) {
      if (!Array.isArray(part) || typeof part[0] !== "string") throw new Error(`Slide ${index + 1} part ${partIndex + 1} is invalid.`);
      const text = part[0];
      const ruby = part[1] || "";
      if (!ruby && hasKanji(text)) throw new Error(`Slide ${index + 1} has kanji without ruby: ${text}`);
    }
    for (const [annoIndex, anno] of item.annotations.entries()) {
      if (!anno.target || !anno.title || !anno.body) throw new Error(`Slide ${index + 1} annotation ${annoIndex + 1} is incomplete.`);
      if (!item.jp.includes(anno.target)) throw new Error(`Slide ${index + 1} target is missing: ${anno.target}`);
      if (!anno.body.startsWith("作用：")) throw new Error(`Slide ${index + 1} annotation ${annoIndex + 1} body must start with 作用：`);
    }
  }
  validateVisuals(data);
}

function safeName(text) {
  return text
    .replace(/課/g, "课")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function totalSlideCount(data) {
  return 2 + deckVisuals(data).length + data.slides.length + (Array.isArray(data.questions) ? data.questions.length : 0) + 1;
}

function pageNo(value) {
  return String(value).padStart(2, "0");
}

function drawHeader(slide, data, index, total, section = "精读课件") {
  addTextbox(slide, `header-${index}`, `${data.lesson}  ${data.title}`, {
    left: 72,
    top: 30,
    width: 760,
    height: 34,
  }, {
    fontSize: 24,
    bold: true,
    color: "#172033",
    typeface: "Hiragino Sans",
    lineSpacing: 1,
  });
  addTextbox(slide, `section-${index}`, section, {
    left: 850,
    top: 34,
    width: 150,
    height: 28,
  }, {
    fontSize: 15,
    bold: true,
    color: "#b45309",
    alignment: "right",
    typeface: "PingFang SC",
    lineSpacing: 1,
  });
  addTextbox(slide, `page-${index}`, `${pageNo(index)} / ${total}`, {
    left: 1050,
    top: 34,
    width: 158,
    height: 28,
  }, {
    fontSize: 18,
    bold: true,
    color: "#64748b",
    alignment: "right",
    typeface: "Aptos",
    lineSpacing: 1,
  });
  addRule(slide, `header-rule-${index}`, 72, 78, 1136, "#ddd8cd");
}

function drawFooter(slide, data, index) {
  addTextbox(slide, `footer-${index}`, `来源：${data.source}`, {
    left: 80,
    top: 690,
    width: 1120,
    height: 20,
  }, {
    fontSize: 14,
    color: "#9ca3af",
    alignment: "right",
    typeface: "PingFang SC",
    lineSpacing: 1,
  });
}

function inferGoals(data) {
  if (Array.isArray(data.readingGoals) && data.readingGoals.length) return data.readingGoals.slice(0, 5);
  const goals = [];
  if (data.theme) goals.push(`抓住主题：${data.theme}`);
  goals.push("先看段落推进，再进入逐句精讲。");
  goals.push("遇到长句，先找主语、谓语和修饰范围。");
  goals.push("做题时回到原文，用依据排除干扰项。");
  return goals.slice(0, 5);
}

function drawCover(presentation, data, total) {
  const slide = presentation.slides.add();
  slide.background.fill = "#f5efe4";
  slide.shapes.add({
    geometry: "rect",
    name: "cover-ink-band",
    position: { left: 0, top: 0, width: 1280, height: 172 },
    fill: "#172033",
    line: { style: "solid", fill: "#172033", width: 0 },
  });
  slide.shapes.add({
    geometry: "rect",
    name: "cover-rust-rule",
    position: { left: 72, top: 148, width: 328, height: 8 },
    fill: "#b45309",
    line: { style: "solid", fill: "#b45309", width: 0 },
  });
  addTextbox(slide, "cover-kicker", "JAPANESE INTENSIVE READING", {
    left: 72,
    top: 44,
    width: 560,
    height: 28,
  }, {
    fontSize: 18,
    bold: true,
    color: "#f8fafc",
    typeface: "Aptos",
    lineSpacing: 1,
  });
  addTextbox(slide, "cover-lesson", data.lesson, {
    left: 72,
    top: 84,
    width: 680,
    height: 44,
  }, {
    fontSize: 30,
    bold: true,
    color: "#fef3c7",
    typeface: "PingFang SC",
    lineSpacing: 1,
  });
  addTextbox(slide, "cover-page", `${pageNo(1)} / ${total}`, {
    left: 1068,
    top: 44,
    width: 140,
    height: 28,
  }, {
    fontSize: 18,
    bold: true,
    color: "#cbd5e1",
    alignment: "right",
    typeface: "Aptos",
    lineSpacing: 1,
  });
  addPanel(slide, "cover-title-panel", { left: 72, top: 214, width: 1136, height: 290 }, "#fffaf1", "#ead6be");
  addTextbox(slide, "cover-title", data.title, {
    left: 112,
    top: 254,
    width: 1056,
    height: 104,
  }, {
    fontSize: Array.from(data.title).length > 18 ? 46 : 58,
    bold: true,
    color: "#172033",
    alignment: "center",
    typeface: "Hiragino Mincho ProN",
    lineSpacing: 1.05,
  });
  addTextbox(slide, "cover-theme", data.theme || "文章结构、重点句型、语法作用与阅读依据", {
    left: 148,
    top: 384,
    width: 984,
    height: 46,
  }, {
    fontSize: 25,
    bold: true,
    color: "#0f766e",
    alignment: "center",
    typeface: "PingFang SC",
    lineSpacing: 1.1,
  });
  const stats = [
    { label: "逐句精讲", value: `${data.slides.length} 句` },
    { label: "视觉锚点", value: deckVisuals(data).length ? `${deckVisuals(data).length} 页` : "按需配置" },
    { label: "输出形式", value: "视觉课件" },
  ];
  stats.forEach((item, i) => {
    const left = 120 + i * 360;
    addPanel(slide, `cover-stat-${i}`, { left, top: 545, width: 300, height: 82 }, "#f8fafc", "#d5dce8");
    addTextbox(slide, `cover-stat-label-${i}`, item.label, { left: left + 22, top: 560, width: 256, height: 22 }, {
      fontSize: 16,
      bold: true,
      color: "#64748b",
      typeface: "PingFang SC",
      lineSpacing: 1,
    });
    addTextbox(slide, `cover-stat-value-${i}`, item.value, { left: left + 22, top: 586, width: 256, height: 34 }, {
      fontSize: 26,
      bold: true,
      color: i === 1 ? "#b45309" : "#172033",
      typeface: "PingFang SC",
      lineSpacing: 1,
    });
  });
  drawFooter(slide, data, 1);
}

function drawGuide(presentation, data, total) {
  const slide = presentation.slides.add();
  slide.background.fill = "#f5efe4";
  drawHeader(slide, data, 2, total, "读前导入");
  const visuals = guideVisuals(data);
  const hasVisualPanel = visuals.length > 0;
  addTextbox(slide, "guide-title", "这篇文章先这样读", {
    left: 88,
    top: 118,
    width: hasVisualPanel ? 650 : 640,
    height: 46,
  }, {
    fontSize: 34,
    bold: true,
    color: "#172033",
    typeface: "PingFang SC",
    lineSpacing: 1,
  });
  addTextbox(slide, "guide-theme", data.theme || "先抓主题，再看逻辑推进，最后回到原文依据。", {
    left: 88,
    top: 170,
    width: hasVisualPanel ? 690 : 1000,
    height: 40,
  }, {
    fontSize: 24,
    bold: true,
    color: "#0f766e",
    typeface: "PingFang SC",
    lineSpacing: 1.1,
  });
  const goals = inferGoals(data);
  goals.forEach((goal, i) => {
    const top = 250 + i * 76;
    const color = palette[i % palette.length];
    const cardLeft = hasVisualPanel ? 88 : 120;
    const cardWidth = hasVisualPanel ? 706 : 1040;
    addPanel(slide, `guide-card-${i}`, { left: cardLeft, top, width: cardWidth, height: 58 }, i % 2 ? "#fffaf1" : "#f8fafc", color.line);
    addTextbox(slide, `guide-no-${i}`, String(i + 1).padStart(2, "0"), {
      left: cardLeft + 25,
      top: top + 14,
      width: 54,
      height: 30,
    }, {
      fontSize: 22,
      bold: true,
      color: color.line,
      typeface: "Aptos",
      lineSpacing: 1,
    });
    addTextbox(slide, `guide-text-${i}`, goal, {
      left: cardLeft + 94,
      top: top + 13,
      width: cardWidth - 148,
      height: 36,
    }, {
      fontSize: hasVisualPanel ? 20 : 23,
      bold: true,
      color: "#172033",
      typeface: "PingFang SC",
      lineSpacing: 1.05,
    });
  });
  if (hasVisualPanel) drawGuideVisualPanel(slide, visuals);
  drawFooter(slide, data, 2);
}

function visualKindLabel(visual) {
  const kind = visual.kind || "image";
  if (kind === "chart") return "数据图解";
  if (kind === "diagram") return "结构图解";
  if (kind === "scene") return "场景导入";
  return "视觉锚点";
}

function drawGuideVisualPanel(slide, visuals) {
  addPanel(slide, "guide-visual-panel", { left: 832, top: 232, width: 340, height: 360 }, "#172033", "#172033");
  addTextbox(slide, "guide-visual-kicker", "VISUAL MODE", {
    left: 858,
    top: 258,
    width: 280,
    height: 20,
  }, {
    fontSize: 14,
    bold: true,
    color: "#fef3c7",
    typeface: "Aptos",
    lineSpacing: 1,
  });
  addTextbox(slide, "guide-visual-title", "先建立视觉入口", {
    left: 858,
    top: 286,
    width: 280,
    height: 34,
  }, {
    fontSize: 25,
    bold: true,
    color: "#ffffff",
    typeface: "PingFang SC",
    lineSpacing: 1,
  });

  const first = visuals[0];
  if (first?.path) {
    addImageFrame(slide, first, { left: 858, top: 336, width: 288, height: 148 }, { borderRadius: 10, fit: "cover" });
    addTextbox(slide, "guide-visual-caption", first.caption || first.title, {
      left: 858,
      top: 502,
      width: 288,
      height: 54,
    }, {
      fontSize: 18,
      bold: true,
      color: "#e2e8f0",
      typeface: "PingFang SC",
      lineSpacing: 1.18,
    });
    return;
  }

  visuals.forEach((visual, i) => {
    const top = 342 + i * 66;
    const color = palette[i % palette.length].line;
    slide.shapes.add({
      geometry: "roundRect",
      name: `guide-visual-dot-${i}`,
      position: { left: 858, top: top + 2, width: 42, height: 42 },
      fill: color,
      line: { style: "solid", fill: color, width: 0 },
      borderRadius: 8,
    });
    addTextbox(slide, `guide-visual-no-${i}`, String(i + 1), {
      left: 858,
      top: top + 9,
      width: 42,
      height: 24,
    }, {
      fontSize: 18,
      bold: true,
      color: "#ffffff",
      alignment: "center",
      typeface: "Aptos",
      lineSpacing: 1,
    });
    addTextbox(slide, `guide-visual-item-${i}`, `${visualKindLabel(visual)}：${visual.title}`, {
      left: 914,
      top,
      width: 220,
      height: 48,
    }, {
      fontSize: 17,
      bold: true,
      color: "#e2e8f0",
      typeface: "PingFang SC",
      lineSpacing: 1.12,
    });
  });
}

function defaultVisualNotes(visual) {
  if (Array.isArray(visual.notes) && visual.notes.length) return visual.notes.slice(0, 4);
  if (visual.kind === "chart") {
    return [
      "先看标题和单位。",
      "再找最高值、最低值和明显差距。",
      "最后回到原文，判断作者想说明什么。",
    ];
  }
  if (visual.kind === "diagram") {
    return [
      "先看顺序或层级。",
      "再抓转折、原因和结果。",
      "最后带着结构进入逐句精讲。",
    ];
  }
  return [
    visual.caption || "先用场景建立文章语境。",
    "观察人物、地点、物品和动作。",
    "读句子时回到这些线索。",
  ];
}

function drawVisualNotes(slide, visual, position, accent = "#0f766e") {
  addPanel(slide, `visual-note-panel-${visual.id}`, position, "#fffaf1", "#ead6be");
  addTextbox(slide, `visual-note-title-${visual.id}`, "课堂读法", {
    left: position.left + 24,
    top: position.top + 24,
    width: position.width - 48,
    height: 30,
  }, {
    fontSize: 23,
    bold: true,
    color: accent,
    typeface: "PingFang SC",
    lineSpacing: 1,
  });
  defaultVisualNotes(visual).slice(0, 4).forEach((note, i) => {
    const top = position.top + 78 + i * 66;
    addTextbox(slide, `visual-note-no-${visual.id}-${i}`, String(i + 1).padStart(2, "0"), {
      left: position.left + 24,
      top,
      width: 42,
      height: 24,
    }, {
      fontSize: 18,
      bold: true,
      color: accent,
      typeface: "Aptos",
      lineSpacing: 1,
    });
    addTextbox(slide, `visual-note-body-${visual.id}-${i}`, note, {
      left: position.left + 76,
      top: top - 2,
      width: position.width - 108,
      height: 46,
    }, {
      fontSize: 18,
      bold: true,
      color: "#172033",
      typeface: "PingFang SC",
      lineSpacing: 1.12,
    });
  });
}

function drawImageVisual(slide, visual) {
  addPanel(slide, `visual-image-frame-${visual.id}`, { left: 80, top: 198, width: 780, height: 390 }, "#172033", "#172033");
  if (visual.path) {
    addImageFrame(slide, visual, { left: 100, top: 218, width: 740, height: 350 }, { borderRadius: 12, fit: "contain" });
  } else {
    drawDiagramInside(slide, visual, { left: 116, top: 226, width: 708, height: 326 }, "#f8fafc");
  }
  drawVisualNotes(slide, visual, { left: 900, top: 198, width: 300, height: 390 }, "#b45309");
  if (visual.source) {
    addTextbox(slide, `visual-source-${visual.id}`, `素材：${visual.source}`, {
      left: 100,
      top: 604,
      width: 740,
      height: 22,
    }, {
      fontSize: 14,
      color: "#94a3b8",
      alignment: "right",
      typeface: "PingFang SC",
      lineSpacing: 1,
    });
  }
}

function drawDiagramInside(slide, visual, frame, fill = "#fffaf1") {
  const points = (Array.isArray(visual.points) && visual.points.length ? visual.points : visual.labels) || [];
  const items = points.length ? points.slice(0, 6).map(String) : [visual.caption || visual.title];
  const cols = items.length <= 3 ? items.length : 3;
  const rows = Math.ceil(items.length / cols);
  const gap = 16;
  const cardW = (frame.width - gap * (cols - 1)) / cols;
  const cardH = Math.min(96, (frame.height - gap * (rows - 1)) / rows);
  items.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const left = frame.left + col * (cardW + gap);
    const top = frame.top + row * (cardH + gap) + Math.max(0, (frame.height - (rows * cardH + (rows - 1) * gap)) / 2);
    const color = palette[i % palette.length];
    addPanel(slide, `diagram-item-${visual.id}-${i}`, { left, top, width: cardW, height: cardH }, fill, color.line);
    addTextbox(slide, `diagram-item-no-${visual.id}-${i}`, String(i + 1).padStart(2, "0"), {
      left: left + 16,
      top: top + 14,
      width: 48,
      height: 24,
    }, {
      fontSize: 18,
      bold: true,
      color: color.line,
      typeface: "Aptos",
      lineSpacing: 1,
    });
    addTextbox(slide, `diagram-item-text-${visual.id}-${i}`, item, {
      left: left + 20,
      top: top + 42,
      width: cardW - 40,
      height: cardH - 50,
    }, {
      fontSize: items.length <= 3 ? 25 : 21,
      bold: true,
      color: "#172033",
      alignment: "center",
      typeface: "PingFang SC",
      lineSpacing: 1.08,
    });
  });
}

function drawDiagramVisual(slide, visual) {
  addPanel(slide, `visual-diagram-frame-${visual.id}`, { left: 80, top: 198, width: 780, height: 390 }, "#f8fafc", "#d5dce8");
  drawDiagramInside(slide, visual, { left: 116, top: 234, width: 708, height: 300 }, "#ffffff");
  drawVisualNotes(slide, visual, { left: 900, top: 198, width: 300, height: 390 }, "#0f766e");
}

function niceMax(value) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const scaled = value / power;
  const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return nice * power;
}

function formatValue(value, unit = "") {
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded}${unit}`;
}

function chartBounds(chart) {
  const values = chart.series.flatMap((item) => item.values);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const min = chart.min === undefined ? Math.min(0, minValue) : chart.min;
  const max = chart.max === undefined ? niceMax(maxValue) : chart.max;
  return { min, max: max <= min ? min + 1 : max };
}

function yForValue(value, plot, min, max) {
  return plot.top + plot.height - ((value - min) / (max - min)) * plot.height;
}

function drawChartAxes(slide, chart, plot, min, max) {
  const ticks = 4;
  for (let i = 0; i <= ticks; i += 1) {
    const value = min + (max - min) * (i / ticks);
    const y = yForValue(value, plot, min, max);
    addRule(slide, `chart-grid-${chart.type}-${i}`, plot.left, y, plot.width, i === 0 ? "#94a3b8" : "#d8dee8");
    addTextbox(slide, `chart-tick-${chart.type}-${i}`, formatValue(value, chart.unit), {
      left: plot.left - 76,
      top: y - 10,
      width: 62,
      height: 20,
    }, {
      fontSize: 13,
      color: "#64748b",
      alignment: "right",
      typeface: "Aptos",
      lineSpacing: 1,
    });
  }
  slide.shapes.add({
    geometry: "rect",
    name: `chart-y-axis-${chart.type}`,
    position: { left: plot.left, top: plot.top, width: 1.4, height: plot.height },
    fill: "#64748b",
    line: { style: "solid", fill: "#64748b", width: 0 },
  });
}

function drawChartLegend(slide, chart, left, top) {
  if (chart.series.length <= 1) return;
  chart.series.forEach((item, i) => {
    const color = palette[i % palette.length].line;
    slide.shapes.add({
      geometry: "roundRect",
      name: `chart-legend-dot-${i}`,
      position: { left: left + i * 150, top, width: 18, height: 18 },
      fill: color,
      line: { style: "solid", fill: color, width: 0 },
      borderRadius: 4,
    });
    addTextbox(slide, `chart-legend-text-${i}`, item.name, {
      left: left + 24 + i * 150,
      top: top - 2,
      width: 116,
      height: 22,
    }, {
      fontSize: 15,
      bold: true,
      color: "#334155",
      typeface: "PingFang SC",
      lineSpacing: 1,
    });
  });
}

function drawBarChart(slide, chart, frame) {
  const plot = { left: frame.left + 84, top: frame.top + 58, width: frame.width - 116, height: frame.height - 126 };
  const { min, max } = chartBounds(chart);
  drawChartAxes(slide, chart, plot, min, max);
  const groupW = plot.width / chart.categories.length;
  const barGap = 8;
  const barW = Math.min(46, Math.max(12, (groupW - 28 - barGap * (chart.series.length - 1)) / chart.series.length));
  chart.categories.forEach((category, categoryIndex) => {
    const groupLeft = plot.left + categoryIndex * groupW + groupW / 2;
    chart.series.forEach((item, seriesIndex) => {
      const color = palette[seriesIndex % palette.length];
      const value = item.values[categoryIndex];
      const y = yForValue(value, plot, min, max);
      const zeroY = yForValue(0, plot, min, max);
      const height = Math.abs(zeroY - y);
      const left = groupLeft - ((chart.series.length * barW + (chart.series.length - 1) * barGap) / 2) + seriesIndex * (barW + barGap);
      slide.shapes.add({
        geometry: "roundRect",
        name: `bar-${categoryIndex}-${seriesIndex}`,
        position: { left, top: Math.min(y, zeroY), width: barW, height: Math.max(3, height) },
        fill: color.line,
        line: { style: "solid", fill: color.line, width: 0 },
        borderRadius: 6,
      });
      addTextbox(slide, `bar-value-${categoryIndex}-${seriesIndex}`, formatValue(value, chart.unit), {
        left: left - 22,
        top: Math.min(y, zeroY) - 24,
        width: barW + 44,
        height: 18,
      }, {
        fontSize: 13,
        bold: true,
        color: color.line,
        alignment: "center",
        typeface: "Aptos",
        lineSpacing: 1,
      });
    });
    addTextbox(slide, `bar-category-${categoryIndex}`, category, {
      left: plot.left + categoryIndex * groupW + 4,
      top: plot.top + plot.height + 16,
      width: groupW - 8,
      height: 34,
    }, {
      fontSize: chart.categories.length > 5 ? 13 : 15,
      bold: true,
      color: "#334155",
      alignment: "center",
      typeface: "PingFang SC",
      lineSpacing: 1.05,
    });
  });
  drawChartLegend(slide, chart, frame.left + 92, frame.top + frame.height - 36);
}

function drawLineChart(slide, chart, frame) {
  const plot = { left: frame.left + 84, top: frame.top + 58, width: frame.width - 116, height: frame.height - 126 };
  const { min, max } = chartBounds(chart);
  drawChartAxes(slide, chart, plot, min, max);
  chart.series.forEach((item, seriesIndex) => {
    const color = palette[seriesIndex % palette.length];
    const points = item.values.map((value, i) => {
      const x = plot.left + (chart.categories.length === 1 ? plot.width / 2 : (plot.width * i) / (chart.categories.length - 1));
      const y = yForValue(value, plot, min, max);
      const dot = slide.shapes.add({
        geometry: "ellipse",
        name: `line-dot-${seriesIndex}-${i}`,
        position: { left: x - 6, top: y - 6, width: 12, height: 12 },
        fill: color.line,
        line: { style: "solid", fill: "#ffffff", width: 2 },
      });
      addTextbox(slide, `line-value-${seriesIndex}-${i}`, formatValue(value, chart.unit), {
        left: x - 32,
        top: y - 31,
        width: 64,
        height: 18,
      }, {
        fontSize: 12,
        bold: true,
        color: color.line,
        alignment: "center",
        typeface: "Aptos",
        lineSpacing: 1,
      });
      return dot;
    });
    for (let i = 1; i < points.length; i += 1) {
      slide.shapes.connect(points[i - 1], points[i], {
        kind: "straight",
        fromSide: "right",
        toSide: "left",
        line: { style: "solid", fill: color.line, width: 2.4 },
      });
    }
  });
  chart.categories.forEach((category, i) => {
    const x = plot.left + (chart.categories.length === 1 ? plot.width / 2 : (plot.width * i) / (chart.categories.length - 1));
    addTextbox(slide, `line-category-${i}`, category, {
      left: x - 48,
      top: plot.top + plot.height + 16,
      width: 96,
      height: 28,
    }, {
      fontSize: chart.categories.length > 5 ? 13 : 15,
      bold: true,
      color: "#334155",
      alignment: "center",
      typeface: "PingFang SC",
      lineSpacing: 1.05,
    });
  });
  drawChartLegend(slide, chart, frame.left + 92, frame.top + frame.height - 36);
}

function drawChartVisual(slide, visual) {
  if (visual.path && visual.render === "image") {
    drawImageVisual(slide, visual);
    return;
  }
  const chart = normalizeChartSeries(visual.chart, visual.title);
  const frame = { left: 80, top: 198, width: 780, height: 390 };
  addPanel(slide, `visual-chart-frame-${visual.id}`, frame, "#ffffff", "#d5dce8");
  addTextbox(slide, `visual-chart-type-${visual.id}`, chart.type === "line" ? "LINE CHART" : "BAR CHART", {
    left: frame.left + 24,
    top: frame.top + 22,
    width: 200,
    height: 22,
  }, {
    fontSize: 13,
    bold: true,
    color: "#64748b",
    typeface: "Aptos",
    lineSpacing: 1,
  });
  if (chart.type === "line") drawLineChart(slide, chart, frame);
  else drawBarChart(slide, chart, frame);
  drawVisualNotes(slide, visual, { left: 900, top: 198, width: 300, height: 390 }, "#2563eb");
}

function drawVisualSlide(presentation, data, visual, visualIndex, pageIndex, total) {
  const slide = presentation.slides.add();
  slide.background.fill = "#f5efe4";
  drawHeader(slide, data, pageIndex, total, `${visualKindLabel(visual)} ${visualIndex + 1}`);
  addTextbox(slide, `visual-title-${visual.id}`, visual.title, {
    left: 88,
    top: 112,
    width: 760,
    height: 46,
  }, {
    fontSize: 34,
    bold: true,
    color: "#172033",
    typeface: "PingFang SC",
    lineSpacing: 1,
  });
  addTextbox(slide, `visual-caption-${visual.id}`, visual.caption || "先看图，再进入原文。", {
    left: 88,
    top: 154,
    width: 1000,
    height: 32,
  }, {
    fontSize: 20,
    bold: true,
    color: "#0f766e",
    typeface: "PingFang SC",
    lineSpacing: 1.05,
  });

  if ((visual.kind || "image") === "chart") drawChartVisual(slide, visual);
  else if ((visual.kind || "image") === "diagram") drawDiagramVisual(slide, visual);
  else drawImageVisual(slide, visual);

  drawFooter(slide, data, pageIndex);
}

function drawSentenceSlide(presentation, data, item, sentenceIndex, pageIndex, total) {
  const slide = presentation.slides.add();
  slide.background.fill = "#f5efe4";
  const n = pageNo(pageIndex);
  const annos = item.annotations;
  drawHeader(slide, data, pageIndex, total, `逐句精讲 ${sentenceIndex + 1}`);

  slide.shapes.add({
    geometry: "rect",
    name: `accent-strip-${n}`,
    position: { left: 64, top: 92, width: 8, height: 588 },
    fill: "#b45309",
    line: { style: "solid", fill: "#b45309", width: 0 },
  });
  addPanel(slide, `jp-panel-${n}`, { left: 80, top: 92, width: 1136, height: 274 }, "#fffaf1", "#ead6be");
  addPanel(slide, `zh-panel-${n}`, { left: 80, top: 376, width: 1136, height: 94 }, "#f8fafc", "#d5dce8");
  addPanel(slide, `grammar-panel-${n}`, { left: 80, top: 482, width: 1136, height: 198 }, "#fff8f1", "#ead6be");

  addTextbox(slide, `sentence-pill-${n}`, `SENTENCE ${sentenceIndex + 1}`, {
    left: 1018,
    top: 108,
    width: 174,
    height: 24,
  }, {
    fontSize: 14,
    bold: true,
    color: "#b45309",
    alignment: "right",
    typeface: "Aptos",
    lineSpacing: 1,
  });
  addLabel(slide, `jp-label-${n}`, "日语原文（注音 + 结构标注）", 108, "#b45309");
  const anchors = drawSentenceWithHighlights(slide, item, annos, {
    left: 98,
    top: 140,
    width: 1094,
    height: 206,
  }, fontForSentence(item.jp));

  addLabel(slide, `zh-label-${n}`, "中文翻译", 392, "#334155");
  addTextbox(slide, `zh-text-${n}`, item.zh, {
    left: 104,
    top: 420,
    width: 1080,
    height: 46,
  }, {
    fontSize: chineseFontFor(item.zh),
    color: "#1f2937",
    typeface: "PingFang SC",
    lineSpacing: 1.08,
  });

  addLabel(slide, `grammar-label-${n}`, "句子结构与语法作用", 496, "#7c2d12");
  drawGrammarCards(slide, annos, anchors);
  drawFooter(slide, data, pageIndex);
}

function drawQuestionSlide(presentation, data, question, questionIndex, pageIndex, total) {
  const slide = presentation.slides.add();
  slide.background.fill = "#f5efe4";
  drawHeader(slide, data, pageIndex, total, `题目解析 ${question.no || questionIndex + 1}`);
  addTextbox(slide, `question-title-${pageIndex}`, `第 ${question.no || questionIndex + 1} 题`, {
    left: 88,
    top: 112,
    width: 300,
    height: 44,
  }, {
    fontSize: 34,
    bold: true,
    color: "#172033",
    typeface: "PingFang SC",
    lineSpacing: 1,
  });
  addPanel(slide, `question-main-${pageIndex}`, { left: 88, top: 176, width: 1104, height: 110 }, "#fffaf1", "#ead6be");
  addTextbox(slide, `question-text-${pageIndex}`, question.question || "题干解析", {
    left: 120,
    top: 206,
    width: 860,
    height: 48,
  }, {
    fontSize: 27,
    bold: true,
    color: "#172033",
    typeface: "PingFang SC",
    lineSpacing: 1.1,
  });
  addTextbox(slide, `question-answer-${pageIndex}`, `答案：${question.answer || ""}`, {
    left: 1000,
    top: 202,
    width: 160,
    height: 58,
  }, {
    fontSize: 30,
    bold: true,
    color: "#b45309",
    alignment: "center",
    typeface: "PingFang SC",
    lineSpacing: 1,
  });
  const rows = [
    { title: "原文依据", body: question.evidence || "回到原文定位依据。", color: palette[0] },
    { title: "解题思路", body: question.explanation || "根据依据排除干扰项。", color: palette[2] },
  ];
  rows.forEach((row, i) => {
    const top = 330 + i * 128;
    addPanel(slide, `question-card-${pageIndex}-${i}`, { left: 120, top, width: 1040, height: 92 }, "#f8fafc", row.color.line);
    addTextbox(slide, `question-card-title-${pageIndex}-${i}`, row.title, {
      left: 150,
      top: top + 16,
      width: 180,
      height: 28,
    }, {
      fontSize: 22,
      bold: true,
      color: row.color.line,
      typeface: "PingFang SC",
      lineSpacing: 1,
    });
    addTextbox(slide, `question-card-body-${pageIndex}-${i}`, row.body, {
      left: 340,
      top: top + 16,
      width: 780,
      height: 58,
    }, {
      fontSize: 22,
      bold: true,
      color: "#172033",
      typeface: "PingFang SC",
      lineSpacing: 1.12,
    });
  });
  drawFooter(slide, data, pageIndex);
}

function collectTakeaways(data) {
  const seen = new Set();
  const items = [];
  for (const slide of data.slides) {
    for (const anno of slide.annotations || []) {
      const title = anno.title.replace(/^\d+\.\s*/, "");
      const key = title.replace(/：.*/, "");
      if (!seen.has(key)) {
        seen.add(key);
        items.push(title);
      }
      if (items.length >= 8) return items;
    }
  }
  return items;
}

function drawSummary(presentation, data, pageIndex, total) {
  const slide = presentation.slides.add();
  slide.background.fill = "#f5efe4";
  drawHeader(slide, data, pageIndex, total, "课堂收束");
  addTextbox(slide, "summary-title", "这节课带走什么", {
    left: 88,
    top: 116,
    width: 620,
    height: 52,
  }, {
    fontSize: 36,
    bold: true,
    color: "#172033",
    typeface: "PingFang SC",
    lineSpacing: 1,
  });
  addTextbox(slide, "summary-theme", data.theme || "从句子结构进入文章理解，再回到原文依据。", {
    left: 88,
    top: 170,
    width: 1040,
    height: 38,
  }, {
    fontSize: 23,
    bold: true,
    color: "#0f766e",
    typeface: "PingFang SC",
    lineSpacing: 1.1,
  });
  const takeaways = collectTakeaways(data);
  const display = takeaways.length ? takeaways : ["主题定位", "结构拆分", "原文依据", "选项排除"];
  display.slice(0, 8).forEach((text, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const left = 110 + col * 540;
    const top = 248 + row * 84;
    const color = palette[i % palette.length];
    addPanel(slide, `summary-card-${i}`, { left, top, width: 500, height: 62 }, i % 2 ? "#fffaf1" : "#f8fafc", color.line);
    addTextbox(slide, `summary-no-${i}`, String(i + 1), { left: left + 18, top: top + 16, width: 34, height: 28 }, {
      fontSize: 22,
      bold: true,
      color: color.line,
      alignment: "center",
      typeface: "Aptos",
      lineSpacing: 1,
    });
    addTextbox(slide, `summary-text-${i}`, text, { left: left + 62, top: top + 16, width: 400, height: 30 }, {
      fontSize: 21,
      bold: true,
      color: "#172033",
      typeface: "PingFang SC",
      lineSpacing: 1.05,
    });
  });
  addTextbox(slide, "summary-footer-note", "讲解顺序：先整体读懂，再拆长句，最后用原文依据完成判断。", {
    left: 126,
    top: 610,
    width: 1028,
    height: 34,
  }, {
    fontSize: 23,
    bold: true,
    color: "#b45309",
    alignment: "center",
    typeface: "PingFang SC",
    lineSpacing: 1,
  });
  drawFooter(slide, data, pageIndex);
}

function buildPresentation(data) {
  const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });
  const total = totalSlideCount(data);
  drawCover(presentation, data, total);
  drawGuide(presentation, data, total);
  const visualPages = deckVisuals(data);
  visualPages.forEach((visual, index) => drawVisualSlide(presentation, data, visual, index, index + 3, total));
  const sentenceStart = visualPages.length + 3;
  data.slides.forEach((item, index) => drawSentenceSlide(presentation, data, item, index, sentenceStart + index, total));
  const questionStart = sentenceStart + data.slides.length;
  if (Array.isArray(data.questions)) {
    data.questions.forEach((question, index) => drawQuestionSlide(presentation, data, question, index, questionStart + index, total));
  }
  drawSummary(presentation, data, total, total);
  return presentation;
}

async function main() {
  const args = parseArgs(process.argv);
  const data = JSON.parse(await fs.readFile(args.input, "utf8"));
  validateDeck(data);
  await prepareVisualAssets(data, path.dirname(args.input));

  const baseName = `${safeName(data.lesson)}_${safeName(data.title)}_视觉精讲`;
  const pptxPath = path.join(args.outputDir, `${baseName}.pptx`);
  const slideImageDir = path.join(args.outputDir, baseName);
  const overviewPath = path.join(args.outputDir, `${baseName}_总览.png`);

  await fs.mkdir(args.outputDir, { recursive: true });
  await fs.rm(slideImageDir, { recursive: true, force: true });
  await fs.mkdir(slideImageDir, { recursive: true });

  const presentation = buildPresentation(data);
  for (const [index, slide] of presentation.slides.items.entries()) {
    await writeBlob(
      path.join(slideImageDir, `slide-${index + 1}.png`),
      await presentation.export({ slide, format: "png", scale: 1 })
    );
  }
  await writeBlob(overviewPath, await presentation.export({ format: "png", montage: true, scale: 1 }));

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(pptxPath);

  console.log(JSON.stringify({
    pptx: pptxPath,
    slides: slideImageDir,
    overview: overviewPath,
    slideCount: presentation.slides.items.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
