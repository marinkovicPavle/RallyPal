"""RallyPal icon drafts, round 3: colour backgrounds, solid shapes, soft shadows.

Usage: python3 ikonice3.py <sheet.png> [<folder for single 1024 px icons>]
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

S = 2048  # work size, downsampled to 1024 at the end
INTER = '/usr/share/fonts/opentype/inter/{}.otf'

WHITE = (255, 255, 255)
LIME = (206, 236, 34)
NAVY = (22, 34, 64)


def hexc(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def gradient(c1, c2, angle=135, size=S):
    """Linear gradient as an RGBA image, angle in degrees (135 = top-left to bottom-right)."""
    a = math.radians(angle)
    y, x = np.mgrid[0:size, 0:size] / (size - 1) - 0.5
    t = (x * math.cos(a - math.pi / 2) * -1 + y * math.sin(a - math.pi / 2) * -1)
    t = (x * math.sin(a) + y * -math.cos(a))
    t = (t - t.min()) / (t.max() - t.min())
    c1, c2 = np.array(c1, float), np.array(c2, float)
    rgb = c1[None, None, :] * (1 - t[..., None]) + c2[None, None, :] * t[..., None]
    out = np.dstack([rgb, np.full((size, size), 255.0)]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def radial(cx, cy, r, inner, outer, size=S):
    y, x = np.mgrid[0:size, 0:size]
    t = np.clip(np.hypot(x - cx, y - cy) / r, 0, 1)
    inner, outer = np.array(inner, float), np.array(outer, float)
    rgb = inner[None, None, :] * (1 - t[..., None]) + outer[None, None, :] * t[..., None]
    return Image.fromarray(np.dstack([rgb, np.full((size, size), 255.0)]).astype(np.uint8), 'RGBA')


def circle_mask(size=S, inset=0):
    m = Image.new('L', (size, size), 0)
    ImageDraw.Draw(m).ellipse((inset, inset, size - 1 - inset, size - 1 - inset), fill=255)
    return m


def base(c1, c2, angle=135):
    bg = gradient(hexc(c1), hexc(c2), angle)
    # soft light from the top-left
    glow = Image.new('L', (S, S), 0)
    ImageDraw.Draw(glow).ellipse((-S * 0.2, -S * 0.35, S * 0.8, S * 0.55), fill=60)
    glow = glow.filter(ImageFilter.GaussianBlur(S * 0.08))
    white = Image.new('RGBA', (S, S), WHITE + (255,))
    bg = Image.composite(white, bg, glow)
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    out.paste(bg, (0, 0), circle_mask())
    return out


def layer():
    return Image.new('RGBA', (S, S), (0, 0, 0, 0))


def with_shadow(img, lay, dx=0, dy=28, blur=36, alpha=90):
    a = lay.split()[3].point(lambda v: v * alpha // 255)
    sh = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    sh.putalpha(a)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    img.alpha_composite(sh, (dx, dy))
    img.alpha_composite(lay)


def clip_circle(img):
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    out.paste(img, (0, 0), circle_mask())
    return out


def ball_layer(cx, cy, r, light=(240, 255, 140), mid=LIME, edge=(150, 178, 10)):
    lay = layer()
    shade = radial(cx - r * 0.35, cy - r * 0.4, r * 1.6, light, edge)
    m = Image.new('L', (S, S), 0)
    ImageDraw.Draw(m).ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    lay.paste(shade, (0, 0), m)
    # small highlight
    hl = Image.new('L', (S, S), 0)
    ImageDraw.Draw(hl).ellipse((cx - r * 0.55, cy - r * 0.65, cx - r * 0.1, cy - r * 0.3), fill=120)
    hl = hl.filter(ImageFilter.GaussianBlur(r * 0.08))
    white = Image.new('RGBA', (S, S), WHITE + (255,))
    lay = Image.composite(white, lay, hl)
    lay.putalpha(m)
    return lay


def racket_layer(color, inner_alpha=70, string_alpha=110, scale=1.0, angle=0, cx=S / 2, cy=S / 2, grip=None):
    L = layer()
    d = ImageDraw.Draw(L)
    hx, hy, hw, hh = S / 2, S * 0.36, 300 * scale, 380 * scale
    fw = int(56 * scale)
    d.ellipse((hx - hw + fw / 2, hy - hh + fw / 2, hx + hw - fw / 2, hy + hh - fw / 2), fill=color + (inner_alpha,))
    sw = int(14 * scale)
    for k in range(-3, 4):
        x = hx + k * hw * 0.24
        dy = (hh - fw) * math.sqrt(max(0, 1 - (k * 0.26) ** 2))
        d.line((x, hy - dy, x, hy + dy), fill=color + (string_alpha,), width=sw)
        y = hy + k * hh * 0.24
        dx = (hw - fw) * math.sqrt(max(0, 1 - (k * 0.26) ** 2))
        d.line((hx - dx, y, hx + dx, y), fill=color + (string_alpha,), width=sw)
    d.ellipse((hx - hw, hy - hh, hx + hw, hy + hh), outline=color + (255,), width=fw)
    ty = hy + hh - fw * 0.6
    d.polygon([(hx - 95 * scale, ty - 30 * scale), (hx - 34 * scale, ty + 190 * scale),
               (hx + 34 * scale, ty + 190 * scale), (hx + 95 * scale, ty - 30 * scale),
               (hx + 52 * scale, ty - 30 * scale), (hx, ty + 110 * scale), (hx - 52 * scale, ty - 30 * scale)],
              fill=color + (255,))
    d.rounded_rectangle((hx - 44 * scale, ty + 170 * scale, hx + 44 * scale, ty + 560 * scale),
                        radius=int(30 * scale), fill=(grip or color) + (255,))
    L = L.rotate(angle, center=(S / 2, S / 2), resample=Image.BICUBIC)
    out = layer()
    out.alpha_composite(L, (int(cx - S / 2), int(cy - S / 2)))
    return out


def paddle_layer(color, scale=1.0, angle=0, cx=S / 2, cy=S / 2, grip=None, edge=None):
    L = layer()
    d = ImageDraw.Draw(L)
    hx, hy, hw, hh = S / 2, S * 0.38, 270 * scale, 330 * scale
    d.rounded_rectangle((hx - hw, hy - hh, hx + hw, hy + hh), radius=int(250 * scale), fill=(edge or color) + (255,))
    e = int(26 * scale) if edge else 0
    d.rounded_rectangle((hx - hw + e, hy - hh + e, hx + hw - e, hy + hh - e), radius=int(230 * scale),
                        fill=color + (255,))
    d.rounded_rectangle((hx - 50 * scale, hy + hh - 30 * scale, hx + 50 * scale, hy + hh + 400 * scale),
                        radius=int(32 * scale), fill=(grip or color) + (255,))
    L = L.rotate(angle, center=(S / 2, S / 2), resample=Image.BICUBIC)
    out = layer()
    out.alpha_composite(L, (int(cx - S / 2), int(cy - S / 2)))
    return out


def font(name, size):
    return ImageFont.truetype(INTER.format(name), size)


# ---------- icons ----------

def i_rally():
    img = base('#4F46E5', '#7C3AED')
    lay = layer()
    d = ImageDraw.Draw(lay)
    # motion streaks behind the ball
    for k, (off, ln, a) in enumerate(((-150, 520, 230), (0, 640, 255), (150, 520, 230))):
        y = 1080 + off
        x1 = 1020
        d.rounded_rectangle((x1 - ln, y - 34, x1, y + 34), radius=34, fill=WHITE + (a,))
    with_shadow(img, lay, blur=30, alpha=60)
    with_shadow(img, ball_layer(1240, 1000, 330), dy=40, blur=50, alpha=110)
    return clip_circle(img)


def i_crossed():
    img = base('#06B6D4', '#2563EB')
    r = racket_layer(WHITE, scale=0.86, angle=32, cx=S / 2 - 150, cy=S / 2 + 110, grip=(220, 230, 240))
    p = paddle_layer(LIME, scale=0.86, angle=-32, cx=S / 2 + 150, cy=S / 2 + 110, grip=(150, 178, 10))
    with_shadow(img, p, blur=34, alpha=80)
    with_shadow(img, r, blur=34, alpha=80)
    with_shadow(img, ball_layer(S / 2, 400, 120, light=(255, 255, 255), edge=(214, 222, 232)), blur=24, alpha=70)
    return clip_circle(img)


def i_flip():
    img = base('#FB923C', '#E11D48')
    lay = layer()
    d = ImageDraw.Draw(lay)
    f = font('Inter-Black', 560)
    for cx, txt in ((740, '2'), (1308, '1')):
        d.rounded_rectangle((cx - 250, 640, cx + 250, 1400), radius=90, fill=NAVY + (255,))
        d.text((cx, 1030), txt, font=f, fill=WHITE + (255,), anchor='mm')
    with_shadow(img, lay, blur=40, alpha=110)
    # split line of a flip card
    d2 = ImageDraw.Draw(img)
    for cx in (740, 1308):
        d2.rectangle((cx - 250, 1012, cx + 250, 1030), fill=hexc('#0B1328') + (255,))
    with_shadow(img, ball_layer(1024, 470, 120), blur=24, alpha=90)
    return clip_circle(img)


def i_monogram():
    img = base('#22C55E', '#0F766E')
    lay = layer()
    d = ImageDraw.Draw(lay)
    d.text((930, 1080), 'R', font=font('Inter-Black', 1250), fill=WHITE + (255,), anchor='mm')
    with_shadow(img, lay, blur=40, alpha=90)
    with_shadow(img, ball_layer(1460, 640, 190), blur=30, alpha=100)
    # small motion streaks on the ball
    lay2 = layer()
    d2 = ImageDraw.Draw(lay2)
    for off, ln in ((-70, 170), (70, 130)):
        d2.rounded_rectangle((1460 - 230 - ln, 640 + off - 20, 1460 - 230, 640 + off + 20), radius=20,
                             fill=WHITE + (200,))
    img.alpha_composite(lay2)
    return clip_circle(img)


def i_white():
    img = layer()
    img.paste(Image.new('RGBA', (S, S), WHITE + (255,)), (0, 0), circle_mask())
    r = racket_layer(NAVY, inner_alpha=25, string_alpha=70, scale=0.86, angle=32, cx=S / 2 - 150, cy=S / 2 + 110)
    p = paddle_layer(LIME, scale=0.86, angle=-32, cx=S / 2 + 150, cy=S / 2 + 110, grip=NAVY, edge=(150, 178, 10))
    with_shadow(img, p, blur=30, alpha=50)
    with_shadow(img, r, blur=30, alpha=50)
    b = ball_layer(S / 2, 400, 120, light=(255, 196, 120), edge=(234, 88, 12))
    with_shadow(img, b, blur=24, alpha=60)
    return clip_circle(img)


def i_court():
    img = base('#38BDF8', '#0EA5E9', angle=180)
    lay = layer()
    d = ImageDraw.Draw(lay)
    # court in perspective
    top, bot = 980, 1900
    d.polygon([(560, top), (1488, top), (1900, bot), (148, bot)], fill=hexc('#16A34A') + (255,))
    lw = 22
    d.line([(560, top), (1488, top), (1900, bot), (148, bot), (560, top)], fill=WHITE + (255,), width=lw)
    d.line([(1024, top), (1024, bot)], fill=WHITE + (255,), width=lw)
    # net
    ny = 1260
    xl = 560 + (148 - 560) * (ny - top) / (bot - top)
    xr = 1488 + (1900 - 1488) * (ny - top) / (bot - top)
    d.rectangle((xl, ny - 120, xr, ny), fill=hexc('#0F172A') + (200,))
    for k in range(1, 4):
        d.line((xl, ny - 120 + k * 30, xr, ny - 120 + k * 30), fill=WHITE + (60,), width=6)
    d.rectangle((xl, ny - 136, xr, ny - 110), fill=WHITE + (255,))
    img.alpha_composite(lay)
    # ball shadow on the court and the ball above it
    sh = layer()
    ImageDraw.Draw(sh).ellipse((1180, 1560, 1420, 1610), fill=(0, 0, 0, 90))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(12)))
    with_shadow(img, ball_layer(1300, 760, 170), blur=24, alpha=60)
    return clip_circle(img)


ICONS = [
    ('A', 'lopta u letu', i_rally),
    ('B', 'reket i paleta', i_crossed),
    ('C', 'semafor', i_flip),
    ('D', 'slovo R i lopta', i_monogram),
    ('E', 'na belom, kao SaunaPal', i_white),
    ('F', 'teren', i_court),
]


def main(out, folder=None):
    rendered = []
    for key, name, fn in ICONS:
        ic = fn().resize((1024, 1024), Image.LANCZOS)
        rendered.append((key, name, ic))
        if folder:
            ic.save(os.path.join(folder, f'ikonica-{key}.png'))
    CW, big, small, rows, RH = 440, 280, 96, 2, 560
    cols = 3
    W, H = CW * cols, rows * RH
    sheet = Image.new('RGB', (W, H), (236, 236, 238))
    d = ImageDraw.Draw(sheet)
    cap = font('Inter-SemiBold', 22)
    for i, (key, name, ic) in enumerate(rendered):
        cx = (i % cols) * CW + CW // 2
        y0 = (i // cols) * RH
        b = ic.resize((big, big), Image.LANCZOS)
        sheet.paste(b, (cx - big // 2, y0 + 20), b)
        # watch-size preview on a black watch face
        d.ellipse((cx - 76, y0 + 318, cx + 76, y0 + 470), fill=(0, 0, 0))
        s = ic.resize((small, small), Image.LANCZOS)
        sheet.paste(s, (cx - small // 2, y0 + 346), s)
        d.text((cx, y0 + 510), f'{key}: {name}', font=cap, fill=(40, 40, 40), anchor='mm')
    sheet.save(out)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
