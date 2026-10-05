"""Draws the small sprites of the Woodcutter playground. Run: python3 tools/make-assets.py"""
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "public")
S = 4  # draw at 4x, then shrink, for clean edges


def canvas(w, h):
    return Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))


def save(img, name, w, h):
    img.resize((w, h), Image.LANCZOS).save(os.path.join(OUT, name))


def tree():
    w, h = 64, 96
    im = canvas(w, h)
    d = ImageDraw.Draw(im)
    # shadow
    d.ellipse([10 * S, 82 * S, 54 * S, 94 * S], fill=(0, 0, 0, 55))
    # trunk
    d.rounded_rectangle([26 * S, 58 * S, 38 * S, 90 * S], radius=3 * S, fill=(111, 78, 55, 255), outline=(70, 48, 32, 255), width=S)
    # crown, three overlapping blobs
    for box, col in [([6, 26, 40, 66], (47, 133, 74, 255)), ([24, 26, 58, 66], (56, 150, 84, 255)), ([14, 6, 50, 50], (72, 170, 98, 255))]:
        d.ellipse([box[0] * S, box[1] * S, box[2] * S, box[3] * S], fill=col, outline=(30, 90, 52, 255), width=S)
    d.ellipse([22 * S, 14 * S, 36 * S, 26 * S], fill=(120, 205, 140, 180))
    save(im, "tree.png", w, h)


def fence():
    w, h = 64, 32
    im = canvas(w, h)
    d = ImageDraw.Draw(im)
    for x in (4, 28, 52):
        d.rounded_rectangle([x * S, 4 * S, (x + 8) * S, 30 * S], radius=2 * S, fill=(168, 124, 78, 255), outline=(98, 66, 38, 255), width=S)
    for y in (10, 20):
        d.rounded_rectangle([0, y * S, w * S, (y + 5) * S], radius=2 * S, fill=(190, 145, 95, 255), outline=(98, 66, 38, 255), width=S)
    save(im, "fence.png", w, h)


def wood():
    w, h = 16, 16
    im = canvas(w, h)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([1 * S, 4 * S, 15 * S, 13 * S], radius=3 * S, fill=(150, 106, 66, 255), outline=(86, 56, 32, 255), width=S)
    d.ellipse([11 * S, 5 * S, 15 * S, 12 * S], fill=(214, 172, 120, 255), outline=(86, 56, 32, 255), width=S)
    d.line([3 * S, 7 * S, 10 * S, 7 * S], fill=(106, 72, 44, 255), width=S)
    d.line([3 * S, 10 * S, 9 * S, 10 * S], fill=(106, 72, 44, 255), width=S)
    save(im, "wood.png", w, h)


def bush():
    w, h = 40, 28
    im = canvas(w, h)
    d = ImageDraw.Draw(im)
    d.ellipse([2 * S, 4 * S, 22 * S, 26 * S], fill=(63, 150, 86, 255), outline=(30, 90, 52, 255), width=S)
    d.ellipse([16 * S, 6 * S, 38 * S, 26 * S], fill=(78, 168, 100, 255), outline=(30, 90, 52, 255), width=S)
    d.ellipse([9 * S, 0, 29 * S, 20 * S], fill=(92, 182, 112, 255), outline=(30, 90, 52, 255), width=S)
    save(im, "bush.png", w, h)


for build in (tree, fence, wood, bush):
    build()
print("sprites written to", os.path.abspath(OUT))
