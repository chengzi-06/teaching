---
name: japanese-visual-lesson-ppt
description: Create visually polished Japanese intensive-reading PowerPoint decks from textbook lessons, exam reading passages, provided Japanese articles, or exam reading PDFs. Use when the user asks for a good-looking Japanese lesson PPT, 课文精讲PPT, 阅读精讲课件, 日语文章讲解, 视觉化课文讲解, 数据型阅读图表页, 场景型阅读配图, visual lesson slides, or wants furigana, Chinese translation, grammar highlights, structure notes, visual anchors, configured images/charts, and optional question analysis in one designed PPTX.
---

# Japanese Visual Lesson PPT

## Purpose

Turn a Japanese article into a visually designed intensive-reading PPTX. The output should feel like a finished classroom deck, not a plain text handout: cover, reading guide, optional visual/data anchor pages, sentence-by-sentence explanation, grammar highlights, question analysis, and a final takeaway page.

Always read `references/visual-style.md` before generating a deck.

Read `references/visual-assets.md` when the article contains numbers, rankings, proportions, survey results, process logic, a strong scene, or when the user asks for 配图, 图表, 场景图, 数据图, 视觉化, or Guizang/Dashi-style polish.

Use `scripts/build_visual_lesson_ppt.mjs` for final PPTX generation.

## Input

Create a JSON file with this shape:

```json
{
  "lesson": "高二阅读（三）",
  "title": "文章标题",
  "source": "PDF 第5页 / 阅读（三）",
  "theme": "一句话概括文章核心",
  "readingGoals": ["读懂文章主张", "抓住关键转折", "定位题目依据"],
  "visuals": [
    {
      "id": "scene-anchor",
      "kind": "scene",
      "title": "场景导入",
      "caption": "用一张图先建立文章语境。",
      "path": "assets/scene-anchor.png",
      "placement": "visual-slide"
    },
    {
      "id": "survey-chart",
      "kind": "chart",
      "title": "调查结果",
      "caption": "先读横轴类别，再看最高值和差距。",
      "placement": "visual-slide",
      "chart": {
        "type": "bar",
        "unit": "%",
        "categories": ["A", "B", "C"],
        "values": [32, 45, 23]
      }
    }
  ],
  "slides": [
    {
      "jp": "日语原句",
      "zh": "中文翻译",
      "parts": [["漢字", "かんじ"], ["かな部分"]],
      "annotations": [
        {
          "target": "原文中的精确片段",
          "title": "语法/结构标题",
          "body": "作用：一句话讲清课堂作用。"
        }
      ]
    }
  ],
  "questions": [
    {
      "no": "31",
      "question": "题干简述",
      "answer": "C",
      "evidence": "原文依据",
      "explanation": "为什么选这个答案"
    }
  ]
}
```

`theme`, `readingGoals`, `visuals`, and `questions` are optional. `slides` is required.

## Rules

- Extract only the article body. Do not include headings, options, side notes, vocabulary lists, or Chinese glosses inside Japanese sentences.
- One complete Japanese sentence becomes one sentence-explanation slide.
- Add ruby only to kanji or kanji compounds. Do not add ruby to kana, katakana, particles, punctuation, numbers, or Latin text.
- `parts.map(part => part[0]).join("")` must exactly equal `jp`.
- Each sentence slide must include 2-6 annotation cards.
- Every annotation `target` must be an exact substring of `jp`.
- Annotation body must start with `作用：`.
- Prefer grammar and reading-function chunks: topic/comment, particles, conditionals, contrast, cause/result, quotation, passive, `ている`, `てくれる`, `てしまう`, `ように`, `こと`, `のです`, and sentence-level logic.

## Visual Modality

- Use visuals as cognitive anchors, not decoration. One article usually needs 0-3 visual pages; do not illustrate every sentence.
- For data-type articles, extract exact values into `visuals[].chart` and use script-drawn charts unless the user explicitly wants Guizang-style generated data illustrations.
- For scene-type articles, create or select one image that shows the setting, object, action, or emotional turn students must understand before reading.
- For structure-type articles, use `kind: "diagram"` with short `points` or `labels` to show process, contrast, cause/effect, or timeline logic.
- Local images must be referenced with `path`. Relative paths resolve from the input JSON file's folder. Do not leave empty image slots.
- When pairing with `guizang-material-illustration`, use Guizang to generate the visual asset first, save it under the task `assets/` folder, then reference that file in `visuals`.
- When borrowing DashiAI PPT thinking, borrow only page roles and media-slot discipline. This skill remains the owner of Japanese reading structure and sentence teaching.

## Generation

Resolve the skill folder first. In Codex this is usually the folder containing this `SKILL.md`; after a GitHub install it may be under `.codex/skills`, `.workbuddy/skills`, or `.agents/skills`.

```bash
SKILL_DIR=<path-to-japanese-visual-lesson-ppt>
node \
  "$SKILL_DIR/scripts/build_visual_lesson_ppt.mjs" \
  --input <lesson-json> \
  --output-dir <output-directory>
```

Then build the real overview grid:

```bash
python3 \
  "$SKILL_DIR/scripts/make_overview.py" \
  --slides-dir <generated-slide-image-dir> \
  --output <overview-png>
```

`build_visual_lesson_ppt.mjs` uses the OpenAI artifact presentation runtime when available. If the script cannot find `@oai/artifact-tool`, set `OAI_ARTIFACT_TOOL_MODULE` to the runtime module path, or use the host agent's native PPT generation tools while following this skill's JSON contract and visual references.

## Verify

Before delivery:

- Read the PPTX with `python-pptx` and confirm slide count and 16:9 page size.
- Run `unzip -t` on the PPTX.
- Inspect at least: cover, reading-guide page, first sentence slide, one short sentence slide, longest sentence slide, and final summary or question slide.
- Include the PPTX path, slide count, validation status, and a `::codex-file-citation` in the final response.
