#!/usr/bin/env python3
"""Engvo logo pipeline utilities. See SKILL.md in parent directory."""

from __future__ import annotations

import argparse
import hashlib
import os
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

DEFAULT_ASSETS = Path(
    os.environ.get(
        "ENGVO_ASSETS",
        r"C:/Users/serk/.cursor/projects/c-dev-Cursor-my-eng-bot/assets",
    )
)

# Equalizer geometry on 652 master (vertical layout fixed; horizontal from letters)
EQ_ROI = (236, 166, 422, 250)
EQ_GAP = 5
EQ_RADIUS = 4
EQ_SS = 8

# Letter search bands (y, x ranges) on 652 — adjust via measure if layout changes
LETTER_BANDS = {
    "n": (180, 230, 295),
    "g": (180, 295, 365),
    "v": (180, 365, 430),
}

COLUMN_BANDS = {
    "left": (180, 236, 295),
    "center": (180, 295, 365),
    "right": (180, 365, 422),
}


def assets_dir() -> Path:
    p = DEFAULT_ASSETS
    p.mkdir(parents=True, exist_ok=True)
    return p


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def is_whiteish(rgb: tuple[int, int, int], threshold: int = 145) -> bool:
    r, g, b = rgb
    return min(r, g, b) > threshold and max(r, g, b) - min(r, g, b) < 100


def white_components(im: Image.Image, region: tuple[int, int, int, int] | None = None):
    pix = im.load()
    w, h = im.size
    if region:
        x1, y1, x2, y2 = region
    else:
        x1, y1, x2, y2 = 0, 0, w, h

    seen: set[tuple[int, int]] = set()
    comps: list[list[tuple[int, int]]] = []

    for y in range(y1, y2):
        for x in range(x1, x2):
            if (x, y) in seen or not is_whiteish(pix[x, y]):
                continue
            q: deque[tuple[int, int]] = deque([(x, y)])
            seen.add((x, y))
            comp: list[tuple[int, int]] = []
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if x1 <= nx < x2 and y1 <= ny < y2 and (nx, ny) not in seen:
                        if is_whiteish(pix[nx, ny]):
                            seen.add((nx, ny))
                            q.append((nx, ny))
            comps.append(comp)
    return comps


def bbox_of_pixels(pixels: list[tuple[int, int]]) -> tuple[int, int, int, int]:
    xs = [p[0] for p in pixels]
    ys = [p[1] for p in pixels]
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def measure_letters(im: Image.Image) -> dict:
    pix = im.load()
    result: dict[str, dict] = {}

    for name, (y1, x1, x2) in LETTER_BANDS.items():
        pixels = [(x, y) for y in range(y1, y1 + 70) for x in range(x1, x2) if is_whiteish(pix[x, y])]
        if not pixels:
            result[name] = {"error": "no pixels"}
            continue
        x0, y0, x1b, y1b = bbox_of_pixels(pixels)
        result[name] = {"bbox": (x0, y0, x1b, y1b), "width": x1b - x0}

    col_w = min(v["width"] for v in result.values() if "width" in v)
    result["recommended_col_w"] = col_w
    return result


def measure_columns(im: Image.Image) -> dict:
    pix = im.load()
    out: dict[str, dict] = {}
    for name, (y1, x1, x2) in COLUMN_BANDS.items():
        pixels = [(x, y) for y in range(y1, y1 + 70) for x in range(x1, x2) if is_whiteish(pix[x, y])]
        if pixels:
            bb = bbox_of_pixels(pixels)
            out[name] = {"bbox": bb, "width": bb[2] - bb[0]}
    return out


def fit_local_gradient(im: Image.Image, roi: tuple[int, int, int, int], pad: int = 12):
    """Return a new RGB image patch for roi filled with locally fitted blue gradient."""
    rx1, ry1, rx2, ry2 = roi
    w, h = im.size
    pix = im.load()
    samples: list[tuple[int, int, int, int, int]] = []

    for y in range(max(0, ry1 - pad), min(h, ry2 + pad)):
        for x in range(max(0, rx1 - pad), min(w, rx2 + pad)):
            if not is_whiteish(pix[x, y]):
                r, g, b = pix[x, y]
                samples.append((x, y, r, g, b))

    if len(samples) < 10:
        raise RuntimeError("Not enough background samples for gradient fit")

    # Linear fit: c = a*x + b*y + d per channel (least squares)
    def fit_channel(idx: int) -> tuple[float, float, float]:
        import numpy as np

        A = np.array([[s[0], s[1], 1.0] for s in samples], dtype=float)
        b = np.array([s[idx] for s in samples], dtype=float)
        coef, _, _, _ = np.linalg.lstsq(A, b, rcond=None)
        return float(coef[0]), float(coef[1]), float(coef[2])

    try:
        import numpy as np

        ar, br, dr = fit_channel(2)
        ag, bg, dg = fit_channel(3)
        ab, bb, db = fit_channel(4)
        patch_w, patch_h = rx2 - rx1, ry2 - ry1
        ys, xs = np.mgrid[ry1:ry2, rx1:rx2]
        rr = np.clip(ar * xs + br * ys + dr, 0, 255).astype(np.uint8)
        gg = np.clip(ag * xs + bg * ys + dg, 0, 255).astype(np.uint8)
        bb_ch = np.clip(ab * xs + bb * ys + db, 0, 255).astype(np.uint8)
        patch = np.dstack([rr, gg, bb_ch])
        return Image.fromarray(patch, "RGB")
    except ImportError:
        # Fallback without numpy: average corner colors
        patch = Image.new("RGB", (rx2 - rx1, ry2 - ry1))
        pp = patch.load()
        for dy in range(ry2 - ry1):
            for dx in range(rx2 - rx1):
                x, y = rx1 + dx, ry1 + dy
                # nearest non-white sample
                best = min(samples, key=lambda s: (s[0] - x) ** 2 + (s[1] - y) ** 2)
                pp[dx, dy] = (best[2], best[3], best[4])
        return patch


def extract_eq_block_layout(im: Image.Image) -> list[tuple[int, int, int, int]]:
    """Return list of (x, y, w, h) for each column's blocks, top to bottom per column."""
    pix = im.load()
    rx1, ry1, rx2, ry2 = EQ_ROI
    layout: list[tuple[int, int, int, int]] = []

    for col_name, (y1, x1, x2) in COLUMN_BANDS.items():
        col_pixels = [
            (x, y)
            for y in range(ry1, ry2)
            for x in range(x1, x2)
            if is_whiteish(pix[x, y])
        ]
        if not col_pixels:
            continue
        # cluster by y gaps
        col_pixels.sort(key=lambda p: (p[1], p[0]))
        blocks: list[list[tuple[int, int]]] = []
        current = [col_pixels[0]]
        for px, py in col_pixels[1:]:
            if py - current[-1][1] > 8:
                blocks.append(current)
                current = [(px, py)]
            else:
                current.append((px, py))
        blocks.append(current)
        for block in blocks:
            x0, y0, x1b, y1b = bbox_of_pixels(block)
            layout.append((x0, y0, x1b - x0, y1b - y0))
    return layout


def draw_rounded_rect_ss(
    target: Image.Image,
    x: int,
    y: int,
    w: int,
    h: int,
    radius: int = EQ_RADIUS,
    ss: int = EQ_SS,
    fill: tuple[int, int, int] = (255, 255, 255),
):
    sw, sh = w * ss, h * ss
    sr = radius * ss
    layer = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.rounded_rectangle((0, 0, sw - 1, sh - 1), radius=sr, fill=fill + (255,))
    layer = layer.resize((w, h), Image.LANCZOS)
    target.paste(layer, (x, y), layer)


def cmd_measure(args: argparse.Namespace) -> int:
    path = assets_dir() / args.input
    im = Image.open(path).convert("RGB")
    print(f"file: {path}")
    print(f"size: {im.size} mode: {im.mode}")
    letters = measure_letters(im)
    print("\nLetters:")
    for k, v in letters.items():
        print(f"  {k}: {v}")
    cols = measure_columns(im)
    print("\nColumns:")
    for k, v in cols.items():
        print(f"  {k}: {v}")
    return 0


def cmd_eqletters(args: argparse.Namespace) -> int:
    src = assets_dir() / args.input
    dst = assets_dir() / args.output
    im = Image.open(src).convert("RGB")
    letters = measure_letters(im)
    col_w = letters.get("recommended_col_w", 54)
    if "n" not in letters or "g" not in letters or "v" not in letters:
        print("Cannot measure letters", file=sys.stderr)
        return 1

    n_bb = letters["n"]["bbox"]
    g_bb = letters["g"]["bbox"]
    v_bb = letters["v"]["bbox"]

    # Horizontal centers under letters; vertical blocks from current layout
    layouts = extract_eq_block_layout(im)
    if not layouts:
        print("No EQ blocks found", file=sys.stderr)
        return 1

    # Group layouts into 3 columns by x
    layouts_sorted = sorted(layouts, key=lambda b: (b[0], b[1]))
    col_blocks: list[list[tuple[int, int, int, int]]] = [[], [], []]
    for block in layouts_sorted:
        x, y, w, h = block
        cx = x + w / 2
        if cx < 295:
            col_blocks[0].append(block)
        elif cx < 365:
            col_blocks[1].append(block)
        else:
            col_blocks[2].append(block)

    def col_x(letter_bb: tuple[int, int, int, int]) -> int:
        lx0, _, lx1, _ = letter_bb
        return int((lx0 + lx1) / 2 - col_w / 2)

    new_positions = [
        (col_x(n_bb), col_blocks[0]),
        (col_x(g_bb), col_blocks[1]),
        (col_x(v_bb), col_blocks[2]),
    ]

    out = im.copy()
    patch = fit_local_gradient(out, EQ_ROI)
    out.paste(patch, (EQ_ROI[0], EQ_ROI[1]))

    for col_x0, blocks in new_positions:
        for _, y, _, h in sorted(blocks, key=lambda b: b[1]):
            draw_rounded_rect_ss(out, col_x0, y, col_w, h)

    out.save(dst, "PNG")
    print(f"saved: {dst} (col_w={col_w})")
    return 0


def mark_bbox(im: Image.Image) -> tuple[int, int, int, int]:
    comps = white_components(im)
    if not comps:
        raise RuntimeError("No white mark found")
    all_px = [p for c in comps for p in c]
    return bbox_of_pixels(all_px)


def cmd_upscale(args: argparse.Namespace) -> int:
    src = assets_dir() / args.input
    im = Image.open(src).convert("RGB")
    stem = Path(args.input).stem  # e.g. engvo-logo-square-eqletters
    if args.suffix.startswith("plus") and "-plus" not in stem:
        # engvo-logo-square-eqletters + plus5-eqletters → engvo-logo-square-plus5-eqletters
        base = stem.replace("-eqletters", "").replace("engvo-logo-", "")
        tag = args.suffix.replace("plus", "", 1) if args.suffix.startswith("plus") else args.suffix
        out_name = f"engvo-logo-{base}-{args.suffix}.png"
    else:
        out_name = f"{stem}-{args.suffix}.png" if args.suffix else f"{stem}-scaled.png"
    dst = assets_dir() / out_name

    x0, y0, x1, y1 = mark_bbox(im)
    pad = 4
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(im.width, x1 + pad), min(im.height, y1 + pad)
    crop = im.crop((x0, y0, x1, y1))
    cw, ch = crop.size
    scale = args.scale
    nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
    scaled = crop.resize((nw, nh), Image.LANCZOS)

    out = im.copy()
    # Clear old mark area with local gradient
    clear_roi = (x0 - 2, y0 - 2, x1 + 2, y1 + 2)
    patch = fit_local_gradient(out, clear_roi)
    out.paste(patch, (clear_roi[0], clear_roi[1]))

    # Center scaled mark in original bbox center
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    paste_x = int(cx - nw / 2)
    paste_y = int(cy - nh / 2)

    # Feathered paste
    mask = Image.new("L", (nw, nh), 255)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=1))
    out.paste(scaled, (paste_x, paste_y), mask)

    out.save(dst, "PNG")
    print(f"saved: {dst} (scale={scale})")
    return 0


def cmd_export_1024(args: argparse.Namespace) -> int:
    src = assets_dir() / args.input
    dst = assets_dir() / args.output
    im = Image.open(src).convert("RGB")
    out = im.resize((1024, 1024), Image.LANCZOS)
    out.save(dst, "PNG")
    print(f"saved: {dst}")
    return 0


def cmd_verify(args: argparse.Namespace) -> int:
    path = assets_dir() / args.input
    im = Image.open(path)
    has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
    print(f"path: {path}")
    print(f"size: {im.size} mode: {im.mode} has_alpha: {has_alpha}")
    if args.sha256:
        print(f"sha256: {sha256(path)}")
    return 0


def cmd_pipeline_eqletters(args: argparse.Namespace) -> int:
    assets = assets_dir()
    base = assets / "engvo-logo-square.png"
    watch = [base, assets / "engvo-logo-square-plus5.png"]
    hashes_before = {p: sha256(p) for p in watch if p.exists()}

    steps = [
        ("eqletters", argparse.Namespace(input="engvo-logo-square.png", output="engvo-logo-square-eqletters.png")),
        ("upscale", argparse.Namespace(input="engvo-logo-square-eqletters.png", suffix="plus5-eqletters", scale=1.05)),
        (
            "export-1024",
            argparse.Namespace(
                input="engvo-logo-square-plus5-eqletters.png",
                output="engvo-logo-1024-plus5-eqletters.png",
            ),
        ),
    ]
    for name, ns in steps:
        rc = globals()[f"cmd_{name.replace('-', '_')}"](ns)
        if rc != 0:
            return rc

    for p, h in hashes_before.items():
        if sha256(p) != h:
            print(f"WARNING: {p} was modified!", file=sys.stderr)
            return 2
    print("pipeline complete; watched files unchanged")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Engvo logo pipeline")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("measure")
    p.add_argument("--input", default="engvo-logo-square.png")

    p = sub.add_parser("eqletters")
    p.add_argument("--input", default="engvo-logo-square.png")
    p.add_argument("--output", default="engvo-logo-square-eqletters.png")

    p = sub.add_parser("upscale")
    p.add_argument("--input", required=True)
    p.add_argument("--suffix", default="plus5")
    p.add_argument("--scale", type=float, default=1.05)

    p = sub.add_parser("export-1024")
    p.add_argument("--input", required=True)
    p.add_argument("--output", required=True)

    p = sub.add_parser("verify")
    p.add_argument("--input", required=True)
    p.add_argument("--sha256", action="store_true")

    sub.add_parser("pipeline-eqletters")

    args = parser.parse_args()
    cmd = args.command.replace("-", "_")
    handler = globals().get(f"cmd_{cmd}")
    if not handler:
        print(f"Unknown command: {args.command}", file=sys.stderr)
        return 1
    return handler(args)


if __name__ == "__main__":
    raise SystemExit(main())
