"""Generate the watercolor sprite sheet (MapLibre sprite).

    uv run --with pillow python scripts/make_sprite.py

Writes web/public/styles/sprite.png + sprite.json. Sheet is 1280x256, five
256x256 tiles (all seamless — blobs are drawn with wrap-around copies):
  - "paper"  (0,0)    : 2x2-block fiber grain + paper-fiber dashes + soft
    low-frequency blotches; low-opacity overlay so the basemap reads as paper.
  - "mottle" (256,0)  : dense speckle + granulation clusters; overlay on
    building fills.
  - "wash"   (512,0)  : warm dark blotches; pooling overlay for greens and
    urban blocks.
  - "drift"  (768,0)  : large multi-color blobs (rose / ochre / sage /
    azure / mauve); low-opacity overlay so whole regions carry uneven pigment.
  - "bloom"  (1024,0) : deep blue blotches; pooling overlay for water.
Seeded, so regeneration is deterministic.
"""
import json
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

random.seed(23)

TILE = 256
NAMES = ["paper", "mottle", "wash", "drift", "bloom"]
SHEET = Image.new("RGBA", (TILE * len(NAMES), TILE), (0, 0, 0, 0))


def blotch_mask(count: int, r_min: int, r_max: int, a_min: int, a_max: int, blur: int) -> Image.Image:
    """Soft seamless blotches as an L image (wrap-around copies)."""
    mask = [[0] * TILE for _ in range(TILE)]
    for _ in range(count):
        cx, cy = random.randint(0, TILE - 1), random.randint(0, TILE - 1)
        r = random.randint(r_min, r_max)
        a = random.randint(a_min, a_max)
        for oy in (-TILE, 0, TILE):
            for ox in (-TILE, 0, TILE):
                for yy in range(max(0, cy + oy - r), min(TILE, cy + oy + r + 1)):
                    for xx in range(max(0, cx + ox - r), min(TILE, cx + ox + r + 1)):
                        if (xx - cx - ox) ** 2 + (yy - cy - oy) ** 2 <= r * r:
                            mask[yy][xx] = max(mask[yy][xx], a)
    img = Image.frombytes("L", (TILE, TILE), bytes(v for row in mask for v in row))
    return img.filter(ImageFilter.GaussianBlur(blur))


def grain_tile(color: tuple[int, int, int], base: int, fleck_p: float, fleck_min: int, fleck_max: int) -> Image.Image:
    """2x2-block grain built as raw bytes (coarse enough to read on-screen)."""
    rows = []
    for _ in range(TILE // 2):
        row = []
        for _ in range(TILE // 2):
            a = random.randint(0, base)
            if random.random() < fleck_p:
                a = random.randint(fleck_min, fleck_max)
            row.extend([*color, a, *color, a])  # one block = 2px across
        rows.append(bytes(row))
    return Image.frombytes("RGBA", (TILE, TILE), b"".join(r * 2 for r in rows))


def fiber_mask(count: int) -> Image.Image:
    """Paper fibers: short 1px dashes, half horizontal, half vertical."""
    img = Image.new("L", (TILE, TILE), 0)
    d = ImageDraw.Draw(img)
    for _ in range(count):
        x, y = random.randint(0, TILE - 1), random.randint(0, TILE - 1)
        ln = random.randint(3, 10)
        a = random.randint(26, 74)
        if random.random() < 0.5:
            d.line([(x, y), (min(x + ln, TILE - 1), y)], fill=a)
        else:
            d.line([(x, y), (x, min(y + ln, TILE - 1))], fill=a)
    return img


# paper: block grain + fibers + medium blotches, over low-frequency mottle
paper = grain_tile((66, 54, 38), base=42, fleck_p=0.035, fleck_min=46, fleck_max=118)
paper.putalpha(ImageChops.lighter(paper.getchannel("A"), blotch_mask(70, 20, 50, 4, 12, 8)))
paper.putalpha(ImageChops.lighter(paper.getchannel("A"), fiber_mask(260)))
paper.putalpha(ImageChops.lighter(paper.getchannel("A"), blotch_mask(26, 40, 90, 4, 12, 18)))
# light fibers: paper showing through — visible on dark fills like water
light = Image.new("RGBA", (TILE, TILE), (255, 248, 232, 0))
light.putalpha(fiber_mask(220))
paper = Image.alpha_composite(paper, light)
# uneven absorbency: grain fades out over broad patches instead of being uniform
absorb = blotch_mask(14, 70, 120, 130, 235, 26)
paper.putalpha(ImageChops.multiply(paper.getchannel("A"), absorb))
SHEET.paste(paper, (0, 0))

# mottle: dense speckle + granulation clusters for building fills
mottle = grain_tile((100, 76, 48), base=40, fleck_p=0.04, fleck_min=55, fleck_max=120)
mottle.putalpha(ImageChops.lighter(mottle.getchannel("A"), blotch_mask(22, 6, 16, 20, 52, 3)))
SHEET.paste(mottle, (TILE, 0))

# wash: warm dark blotches — broad pooling on greens and urban blocks
wash_rgba = Image.new("RGBA", (TILE, TILE), (74, 62, 44, 0))
wash_rgba.putalpha(blotch_mask(190, 10, 40, 30, 80, 5))
SHEET.paste(wash_rgba, (TILE * 2, 0))

# drift: large soft multi-color blobs (seamless), for uneven pigment regions
drift = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
drift_colors = [(206, 138, 120), (208, 168, 96), (150, 180, 118), (128, 168, 184), (188, 148, 140)]
for _ in range(64):
    cx, cy = random.randint(0, TILE - 1), random.randint(0, TILE - 1)
    r = random.randint(40, 96)
    col = random.choice(drift_colors)
    a = random.randint(14, 34)
    blob = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
    d = ImageDraw.Draw(blob)
    for oy in (-TILE, 0, TILE):
        for ox in (-TILE, 0, TILE):
            d.ellipse([cx + ox - r, cy + oy - r, cx + ox + r, cy + oy + r], fill=(*col, a))
    drift = Image.alpha_composite(drift, blob)
drift = drift.filter(ImageFilter.GaussianBlur(6))
SHEET.paste(drift, (TILE * 3, 0))

# bloom: deep blue blotches — pooling inside water fills
bloom = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
for _ in range(30):
    cx, cy = random.randint(0, TILE - 1), random.randint(0, TILE - 1)
    r = random.randint(18, 64)
    a = random.randint(40, 110)
    col = random.choice([(18, 78, 112), (28, 104, 140), (12, 64, 96)])
    blob = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
    d = ImageDraw.Draw(blob)
    for oy in (-TILE, 0, TILE):
        for ox in (-TILE, 0, TILE):
            d.ellipse([cx + ox - r, cy + oy - r, cx + ox + r, cy + oy + r], fill=(*col, a))
    bloom = Image.alpha_composite(bloom, blob)
bloom = bloom.filter(ImageFilter.GaussianBlur(4))
SHEET.paste(bloom, (TILE * 4, 0))

out = Path(__file__).resolve().parents[1] / "web" / "public" / "styles"
out.mkdir(parents=True, exist_ok=True)
SHEET.save(out / "sprite.png")

sprite = {
    name: {"width": TILE, "height": TILE, "x": TILE * i, "y": 0, "pixelRatio": 1}
    for i, name in enumerate(NAMES)
}
(out / "sprite.json").write_text(json.dumps(sprite, indent=1) + "\n")
print(f"wrote {out}/sprite.png + sprite.json")
