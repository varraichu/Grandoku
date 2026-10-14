# Regenerates public/type/title.svg and src/assets/{solved,new-game}.svg from the licensed fonts in Fonts/ (not committed).
# Usage: pip install fonttools uharfbuzz && python scripts/outline-type.py .

import sys, json
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

P = sys.argv[1]
INTEGRAL = f"{P}/Fonts/integralcf-mediumoblique.otf"
ANNABELLE = f"{P}/Fonts/Annabelle JF Regular.ttf"

def outline(path, text, size, x, baseline, letter_spacing=0.0):
    """Shape text and return (svg path d, bounds) with the baseline at (x, baseline)."""
    blob = hb.Blob.from_file_path(path)
    hbfont = hb.Font(hb.Face(blob))
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(hbfont, buf, {"kern": True, "liga": True})
    tt = TTFont(path); gs = tt.getGlyphSet(); upem = tt["head"].unitsPerEm
    s = size / upem
    svg = SVGPathPen(gs); bp = BoundsPen(gs)
    pen_x = 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = tt.getGlyphName(info.codepoint)
        gx = x + (pen_x + pos.x_offset) * s
        gy = baseline - pos.y_offset * s
        t = (s, 0, 0, -s, gx, gy)  # flip y: font units are y-up
        gs[name].draw(TransformPen(svg, t)); gs[name].draw(TransformPen(bp, t))
        pen_x += pos.x_advance + letter_spacing / s
    return svg.getCommands(), bp.bounds

def r(v): return round(v, 3)

def write(fname, parts, pad=1.0):
    xs0, ys0, xs1, ys1 = zip(*[b for _, b, _ in parts])
    x0, y0, x1, y1 = min(xs0) - pad, min(ys0) - pad, max(xs1) + pad, max(ys1) + pad
    paths = "".join(f'<path fill="{fill}" d="{d}"/>' for d, _, fill in parts)
    w, h = x1 - x0, y1 - y0
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{r(x0)} {r(y0)} {r(w)} {r(h)}" width="{r(w)}" height="{r(h)}">{paths}</svg>'
    # Sheet headings live in src/assets so Vite inlines them; the title stays in public/type.
    folder = "public/type" if fname == "title.svg" else "src/assets"
    open(f"{P}/{folder}/{fname}", "w").write(svg)
    return {"file": fname, "x": r(x0), "y": r(y0), "w": r(w), "h": r(h)}

out = {}
# Title, in the 226 × 94 title box coordinates measured in the browser at 1:1 scale.
ariana = outline(INTEGRAL, "ARIANA", 29.592, 104, 32)
g = outline(ANNABELLE, "G", 69.991, 0, 67.5, -4.8994)
randoku = outline(INTEGRAL, "RANDOKU", 29.592, 59.328, 59.008)
out["title"] = write("title.svg", [(*ariana, "#101820"), (*g, "#000"), (*randoku, "#101820")])
# Sheet headings at 32px, baseline at y=0.
for word, fname in [("SOLVED", "solved.svg"), ("NEW GAME", "new-game.svg")]:
    out[fname] = write(fname, [(*outline(INTEGRAL, word, 32, 0, 0), "#101820")])
print(json.dumps(out, indent=1))
