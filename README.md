# 日语视觉精讲 PPT Skill

这是给日语老师备课用的 agent skill。它把一篇日语课文、考试阅读或 PDF 阅读材料，整理成一套有设计感的课文精讲 PPT：封面、阅读导入、场景图/数据图/结构图、逐句讲解、语法标注、题目解析和总结页。

## 适合做什么

- 高中日语阅读理解讲解 PPT
- 课文逐句精讲 PPT
- 带中文翻译、假名、语法高亮的课堂课件
- 数据型文章的图表页
- 场景型文章的配图页
- 结构型文章的流程图/对比图页

## 安装

如果你的 agent 支持 skills CLI，可以直接让 agent 执行：

```bash
npx skills add chengzi-06/teaching
```

如果需要手动安装，先克隆仓库：

```bash
git clone https://github.com/chengzi-06/teaching.git
cd teaching
```

安装到 Codex：

```bash
bash install.sh codex
```

安装到 WorkBuddy：

```bash
bash install.sh workbuddy
```

安装到 QClaw / OpenClaw / Claude Code 等项目级 agent：

```bash
bash install.sh agents /path/to/your/project
```

## 触发方式

安装后，可以对 agent 说：

```text
使用 japanese-visual-lesson-ppt，把这篇日语阅读做成视觉精讲 PPT。
```

也可以更具体：

```text
把这份 PDF 的阅读三做成日语课文精讲 PPT，要有逐句解析、题目依据、数据图表或场景配图。
```

## 输出结果

agent 应该交付：

- `.pptx` 课件文件
- 生成的页面总数
- PPTX 可打开性检查结果
- 如有需要，附带一张全页缩略预览图

## 视觉模态

这个 skill 不只是把文字排进 PPT。它会按文章类型选择视觉表达：

- 场景型文章：生成或配置一张场景/人物/物品图，帮助学生进入语境。
- 数据型文章：把百分比、排名、变化趋势做成图表页。
- 结构型文章：把原因结果、对比关系、时间线、问题解决做成结构图。
- 语法密集型文章：少用图片，把版面重点放在句子结构和语法高亮。

## 仓库结构

```text
SKILL.md
agents/openai.yaml
references/visual-style.md
references/visual-assets.md
scripts/build_visual_lesson_ppt.mjs
scripts/make_overview.py
install.sh
```

`SKILL.md` 是 agent 读取的主说明；`references/` 负责视觉风格和图片/图表规则；`scripts/` 是 Codex/OpenAI 运行时下的 PPTX 生成脚本。
