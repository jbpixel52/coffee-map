"""Generate the watercolor sprite sheet (MapLibre sprite).

    uv run --with pillow python scripts/make_sprite.py

Writes web/public/styles/sprite.png + sprite.json. Sheet is 768x256, three
256x256 tiles:
  - "paper"  (0,0)   : 2x2-block fiber grain + sparse darker flecks + soft
    blotches; drawn as a low-opacity overlay so the basemap reads as paper.
  - "mottle" (256,0) : denser speckle; fill-pattern over building washes.
  - "wash"   (512,0) : soft blurred blotches; overlay on water and greens so
    fills pool like a wash.
Seeded, so regeneration is deterministic.
"""
import json
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

random.seed(11)

TILE = 256
TILES = 3
SHEET = Image.new("RGBA", (TILE * TILES, TILE), (0, 0, 0, 0))
px = SHEET.load()
assert px is not None


def blotch_mask(count: int, r_min: int, r_max: int, a_min: int, a_max: int, blur: int) -> Image.Image:
    """Soft low-frequency blotches as an L image."""
    mask = [[0] * TILE for _ in range(TILE)]
    for _ in range(count):
        cx, cy = random.randint(0, TILE - 1), random.randint(0, TILE - 1)
        r = random.randint(r_min, r_max)
        a = random.randint(a_min, a_max)
        for yy in range(max(0, cy - r), min(TILE, cy + r + 1)):
            for xx in range(max(0, cx - r), min(TILE, cx + r + 1)):
                if (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r:
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


# paper: block grain + soft tonal drift underneath
paper = grain_tile((60, 50, 36), base=24, fleck_p=0.02, fleck_min=30, fleck_max=90)
paper.putalpha(ImageChops.lighter(paper.getchannel("A"), blotch_mask(60, 24, 48, 4, 12, 8)))
SHEET.paste(paper, (0, 0))

# mottle: denser speckle for building fills
SHEET.paste(grain_tile((94, 72, 46), base=30, fleck_p=0.03, fleck_min=40, fleck_max=95), (TILE, 0))

# wash: strong-ish soft blotches (alpha is tamed by the layer's own opacity)
wash = blotch_mask(220, 10, 30, 26, 60, 4)
wash_rgba = Image.new("RGBA", (TILE, TILE), (60, 80, 105, 0))
wash_rgba.putalpha(wash)
SHEET.paste(wash_rgba, (TILE * 2, 0))

out = Path(__file__).resolve().parents[1] / "web" / "public" / "styles"
out.mkdir(parents=True, exist_ok=True)
SHEET.save(out / "sprite.png")

sprite = {
    name: {"width": TILE, "height": TILE, "x": TILE * i, "y": 0, "pixelRatio": 1}
    for i, name in enumerate(["paper", "mottle", "wash"])
}
(out / "sprite.json").write_text(json.dumps(sprite, indent=1) + "\n")
print(f"wrote {out}/sprite.png + sprite.json")
