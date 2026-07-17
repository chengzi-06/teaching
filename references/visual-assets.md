# Visual Assets

Use this reference when a Japanese reading PPT needs configured images, charts, diagrams, or Guizang/Dashi-inspired visual polish.

## Routing

Pick the visual mode internally. Do not ask the user to choose unless the source is ambiguous and the choice changes the deck materially.

- **Data article**: numbers, percentages, survey results, ranking, yearly/monthly change, quantity comparison, population, money, time, or score. Create `kind: "chart"` and preserve exact values.
- **Scene article**: people, place, object, action, memory, everyday situation, travel, school, family, work, environment, or emotional turn. Create `kind: "scene"` with a real image path when possible.
- **Structure article**: process, cause/effect, contrast, timeline, opinion shift, problem/solution, or method. Create `kind: "diagram"` with short `points` or `labels`.
- **Plain grammar-heavy article**: no visual asset is required. Keep the deck text-first.

Use 1-3 visual anchors for a normal exam reading passage. More than 4 visual pages is usually too much for classroom reading.

## JSON Contract

Add a top-level `visuals` array:

```json
{
  "visuals": [
    {
      "id": "scene-obachan",
      "kind": "scene",
      "title": "祖母との思い出",
      "caption": "先把人物关系和回忆场景建立起来。",
      "path": "assets/obachan-scene.png",
      "placement": "visual-slide",
      "source": "Guizang generated image"
    },
    {
      "id": "survey-result",
      "kind": "chart",
      "title": "アンケート結果",
      "caption": "看最高项、最低项和差距，再回到文章判断作者观点。",
      "placement": "visual-slide",
      "chart": {
        "type": "bar",
        "unit": "%",
        "categories": ["便利", "安い", "安心"],
        "values": [42, 31, 27]
      }
    },
    {
      "id": "logic-flow",
      "kind": "diagram",
      "title": "文章逻辑",
      "caption": "问题提出后，文章按原因、影响、解决办法推进。",
      "placement": "visual-slide",
      "points": ["问题", "原因", "影响", "办法"]
    }
  ]
}
```

Fields:

- `id`: required, unique, lowercase or readable slug.
- `kind`: `scene`, `image`, `chart`, or `diagram`.
- `title`: required. Use classroom-facing wording.
- `caption`: optional but recommended. State how to read the visual.
- `path`: local image file for `scene` / `image`, or for a Guizang-rendered chart.
- `placement`: default `visual-slide`. Use `guide` only for a guide-page image cue; use `hidden` to keep the asset record without rendering it.
- `source`: optional provenance, such as `Guizang generated image`, `teacher asset`, or `web reference`.

## Chart Contract

For script-drawn charts, use:

```json
{
  "chart": {
    "type": "bar",
    "unit": "%",
    "categories": ["A", "B", "C"],
    "values": [12, 18, 9]
  }
}
```

For multiple series:

```json
{
  "chart": {
    "type": "line",
    "unit": "人",
    "categories": ["2022", "2023", "2024"],
    "series": [
      {"name": "城市", "values": [12, 16, 21]},
      {"name": "农村", "values": [9, 11, 14]}
    ]
  }
}
```

Rules:

- Keep category order exactly as the article/table gives it.
- Do not round values unless the source does.
- If the source only says "about" or "approximately", mark that in `caption`.
- Prefer shape charts for exact classroom reading. Use generated chart images only when the user wants a richer Guizang-style data illustration.

## Guizang Pairing

Use `guizang-material-illustration` for the visual asset layer only:

1. Identify 1-3 cognitive anchors from the article.
2. For chart/table data, write an exact data block before prompting Guizang.
3. Generate a wide 16:9 or 4:3 image with short Chinese labels.
4. Inspect the image for wrong labels, wrong values, clipping, watermarks, or fake UI.
5. Save the image under the task `assets/` folder and reference it with `visuals[].path`.

Do not let image generation infer chart values. For charts, the prompt must include exact category labels, value labels, unit, and "do not add categories".

## Dashi/PPT Role Borrowing

Borrow DashiAI's page-role thinking:

- `image` for scene anchors.
- `metrics` for one key number.
- `trend` for time series.
- `comparison` for ranking or A/B contrast.
- `process` for article flow.
- `case` for concrete people/objects/places.

Borrow its media-slot discipline:

- Every image slot must contain a real local asset.
- Do not point to remote URLs or temporary files.
- Do not reuse one image repeatedly unless it is intentionally the article's main anchor.
- If no asset exists, render a diagram/text visual page instead of an empty picture frame.

## Style Guardrails

- Keep the Japanese sentence slides text-first.
- Keep visual pages calm and readable, not a business dashboard.
- Avoid AI-default purple gradients, emoji decoration, stock-photo filler, and too many icon cards.
- Do not use visuals that introduce facts not present in the article.
- For exam passages, every visual should help with one of these: scene entry, structure understanding, data reading, evidence定位, or question reasoning.
