#!/usr/bin/env python3
import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def parse_args():
    parser = argparse.ArgumentParser(description="Create a grid overview image from generated slide PNGs.")
    parser.add_argument("--slides-dir", required=True, help="Directory containing slide-1.png, slide-2.png, ...")
    parser.add_argument("--output", required=True, help="Output overview PNG path")
    parser.add_argument("--thumb-width", type=int, default=520)
    return parser.parse_args()


def slide_number(path: Path) -> int:
    stem = path.stem
    try:
        return int(stem.split("-")[-1])
    except ValueError:
        return 10**9


def load_font(size: int):
    for path in [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    ]:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()


def main():
    args = parse_args()
    slides_dir = Path(args.slides_dir)
    output = Path(args.output)
    slide_paths = sorted(slides_dir.glob("slide-*.png"), key=slide_number)
    if not slide_paths:
        raise SystemExit(f"No slide PNGs found in {slides_dir}")

    thumb_w = args.thumb_width
    thumb_h = round(thumb_w * 9 / 16)
    cols = 3 if len(slide_paths) > 4 else 2
    rows = math.ceil(len(slide_paths) / cols)
    margin = 36
    gap = 26
    label_h = 30
    canvas_w = cols * thumb_w + (cols - 1) * gap + margin * 2
    canvas_h = rows * (thumb_h + label_h) + (rows - 1) * gap + margin * 2
    canvas = Image.new("RGB", (canvas_w, canvas_h), "#f5efe4")
    draw = ImageDraw.Draw(canvas)
    font = load_font(18)

    total = len(slide_paths)
    for index, path in enumerate(slide_paths, 1):
        img = Image.open(path).convert("RGB").resize((thumb_w, thumb_h), Image.LANCZOS)
        row = (index - 1) // cols
        col = (index - 1) % cols
        x = margin + col * (thumb_w + gap)
        y = margin + row * (thumb_h + label_h + gap)
        canvas.paste(img, (x, y))
        draw.rectangle([x, y, x + thumb_w, y + thumb_h], outline="#d6d3ca", width=2)
        draw.text((x + 4, y + thumb_h + 5), f"{index:02d} / {total}", fill="#334155", font=font)

    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output)
    print(output)
    print(canvas.size)


if __name__ == "__main__":
    main()
