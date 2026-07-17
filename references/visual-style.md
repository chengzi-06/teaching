# Visual Style

## Direction

Create a polished Japanese classroom deck with editorial rhythm: warm paper background, restrained ink colors, strong hierarchy, large readable Japanese text, and colored grammar highlights. It should look designed, but still be practical for a teacher standing in front of a class.

The style target is "Japanese classroom editorial": a quiet teaching surface, magazine-like visual pages, and Guizang-compatible material illustrations when images are needed. Borrow DashiAI-style page roles and media-slot discipline, but do not turn the deck into a business report template.

Avoid generic AI presentation habits: no purple-blue gradient hero, no emoji decoration, no repeated icon cards, no stock-photo filler, no oversized empty hero pages, no one-note beige-only palette.

## Deck Structure

Default structure:

1. Cover: lesson/title/theme/source.
2. Reading guide: 3-5 reading goals or article logic points.
3. Visual/data anchors: only when `visuals` are supplied or clearly useful.
4. Sentence slides: one sentence per slide.
5. Question slides: only when `questions` are supplied.
6. Summary: key grammar and reading strategy takeaways.

## Canvas

- Slide size: 1280 x 720.
- Background: `#f5efe4`.
- Main ink: `#172033`.
- Accent green: `#0f766e`.
- Accent rust: `#b45309`.
- Accent blue: `#2563eb`.
- Accent plum: `#7c3aed`.
- Soft paper: `#fffaf1`.
- Soft cool panel: `#f8fafc`.
- Chart grid: `#d8dee8`.
- Deep field: `#22324a`.

## Typography

- Japanese main text: `Hiragino Mincho ProN`, bold.
- Japanese UI / ruby: `Hiragino Sans`, bold.
- Chinese text: `PingFang SC`.
- Page title: 24-32 px.
- Main Japanese sentence: 29-48 px depending on length.
- Chinese translation: 22-28 px.
- Card text: 14-18 px.

## Layout

Use fewer, larger regions:

- A clear header line with lesson, title, and page number.
- A large Japanese sentence area with visible highlight boxes.
- A translation strip directly below the sentence.
- A grammar/explanation area with compact cards.
- A small footer source line.

Do not nest cards inside cards. Use panels sparingly; the sentence, translation, and explanation zones should feel like intentional teaching surfaces, not a dashboard.

For visual/data pages, use one dominant image or chart region and one teaching note region. Do not split the page into many equal cards. Every image frame must contain a real asset; if no image exists, use a diagram/brief layout instead of a blank placeholder.

## Sentence Slides

Each sentence slide should answer three classroom needs:

- What does the sentence say?
- What structure makes it work?
- What should students learn from it?

Highlight exact Japanese chunks and connect them visually to explanation cards. Use 2-6 cards; avoid card bodies longer than one short sentence.

## Cover And Guide

The cover should look like the start of a lesson, not a marketing hero. Use a large Japanese title, a compact Chinese/lesson label, and a small theme line.

The reading guide should make the article easier to read before the sentence-by-sentence section begins. Use `readingGoals` when supplied; otherwise infer goals from the title, theme, and annotation patterns.

When visuals are supplied, the guide may show a compact visual-mode panel on the right. Keep the guide instructional: "先看什么、读图怎么读、读文章时带着什么问题", not decorative.

## Visual Pages

Use these page roles, adapted from DashiAI's role system:

- `image`: scene anchor, object anchor, mood anchor.
- `metrics`: one key number, proportion, or survey result.
- `trend`: time change, growth/decline, sequence.
- `comparison`: A/B contrast, ranking, before/after.
- `process`: cause/effect, workflow, timeline, article logic.
- `case`:人物、物品、地点或事件的具体化说明。

For Guizang-style images, prefer one 16:9 or wide 4:3 material illustration with short labels. Keep the image high-signal: setting, object, action, relationship, or data. Avoid stock-like atmosphere shots, decorative blobs, fake UI panels, and crowded legends.

For charts, preserve exact data. Use native shape charts for simple classroom reading charts. Use Guizang-generated chart illustrations only when the visual metaphor helps students understand the article and all values can be checked.

## Question Slides

Question-analysis slides should be clean and exam-oriented:

- question number and short prompt;
- answer;
- evidence from the article;
- explanation of the trap or reasoning.

Do not reproduce all four options unless the user asks for option-by-option analysis.
