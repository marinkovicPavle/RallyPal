"""RallyPal icon drafts, round 4: variations of A (ball in flight) plus four new ideas.

Reuses the helpers from ikonice3.py.
Usage: python3 ikonice4.py <sheet.png> [<folder for single 1024 px icons>]
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ikonice3 import (S, WHITE, LIME, NAVY, hexc, base, layer, with_shadow, clip_circle,  # noqa: E402
                      circle_mask, ball_layer, font, gradient, i_rally)

PURPLE = ('#4F46E5', '#7C3AED')


def streaks(d, x1, y, color=WHITE, alphas=(230, 255, 230), lens=(520, 640, 520), gap=150, h=34):
    for off, ln, a in zip((-gap, 0, gap), lens, alphas):
        d.rounded_rectangle((x1 - ln, y + off - h, x1, y + off + h), radius=h, fill=color + (a,))


def rally(c1, c2):
    img = base(c1, c2)
    lay = layer()
    streaks(ImageDraw.Draw(lay), 1020, 1080)
    with_shadow(img, lay, blur=30, alpha=60)
    with_shadow(img, ball_layer(1240, 1000, 330), dy=40, blur=50, alpha=110)
    return clip_circle(img)


def i_arc():
    img = base(*PURPLE)
    lay = layer()
    d = ImageDraw.Draw(lay)
    p0, p1, p2 = (360, 1600), (560, 760), (1120, 860)
    n = 9
    for i in range(n):
        t = i / (n - 1) * 0.92
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]
        r = 26 + 30 * t
        d.ellipse((x - r, y - r, x + r, y + r), fill=WHITE + (int(110 + 140 * t),))
    with_shadow(img, lay, blur=24, alpha=50)
    with_shadow(img, ball_layer(1340, 920, 310), dy=40, blur=50, alpha=110)
    return clip_circle(img)


def i_comet():
    img = base('#7C3AED', '#DB2777')
    bx, by, r = 1270, 880, 300
    tip = np.array((380.0, 1620.0))
    v = np.array((bx, by)) - tip
    v /= np.linalg.norm(v)
    perp = np.array((-v[1], v[0]))
    poly = [tuple(tip), tuple(np.array((bx, by)) + perp * r * 0.98), tuple(np.array((bx, by)) - perp * r * 0.98)]
    m = Image.new('L', (S, S), 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    yy, xx = np.mgrid[0:S, 0:S]
    t = ((xx - tip[0]) * v[0] + (yy - tip[1]) * v[1]) / np.hypot(bx - tip[0], by - tip[1])
    a = (np.clip(t, 0, 1) ** 0.9 * 250).astype(np.uint8)
    alpha = Image.fromarray(a, 'L')
    tail = Image.new('RGBA', (S, S), WHITE + (255,))
    tail.putalpha(Image.fromarray(np.minimum(np.array(m), a), 'L'))
    img.alpha_composite(tail)
    with_shadow(img, ball_layer(bx, by, r), dy=40, blur=50, alpha=110)
    return clip_circle(img)


def i_white():
    img = layer()
    img.paste(Image.new('RGBA', (S, S), WHITE + (255,)), (0, 0), circle_mask())
    lay = layer()
    streaks(ImageDraw.Draw(lay), 1020, 1080, color=hexc('#6D28D9'), alphas=(170, 255, 170))
    img.alpha_composite(lay)
    with_shadow(img, ball_layer(1240, 1000, 330, light=(236, 255, 120), edge=(120, 150, 0)),
                dy=40, blur=50, alpha=70)
    return clip_circle(img)


def i_plus():
    img = base('#FB923C', '#E11D48')
    with_shadow(img, ball_layer(900, 1150, 400), dy=40, blur=50, alpha=110)
    lay = layer()
    d = ImageDraw.Draw(lay)
    cx, cy, r = 1430, 640, 270
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=WHITE + (255,))
    d.text((cx - 8, cy + 6), '+1', font=font('Inter-Black', 300), fill=hexc('#E11D48') + (255,), anchor='mm')
    with_shadow(img, lay, blur=34, alpha=100)
    return clip_circle(img)


def i_ring():
    img = base('#22C55E', '#0F766E')
    lay = layer()
    d = ImageDraw.Draw(lay)
    c, R, w, n, on = S / 2, 700, 96, 12, 8
    span = 360 / n
    for k in range(n):
        a0 = -90 + k * span + 4
        d.arc((c - R, c - R, c + R, c + R), a0, a0 + span - 8, fill=WHITE + (255 if k < on else 70,), width=w)
    with_shadow(img, lay, blur=24, alpha=50)
    with_shadow(img, ball_layer(c, c, 360), dy=40, blur=50, alpha=110)
    return clip_circle(img)


def i_halves():
    top = gradient(hexc('#312E81'), hexc('#6366F1'), 135)
    bot = gradient(hexc('#BEF264'), hexc('#65A30D'), 135)
    img = layer()
    m = Image.new('L', (S, S), 0)
    ImageDraw.Draw(m).rectangle((0, 0, S, S / 2), fill=255)
    img.paste(bot, (0, 0), circle_mask())
    img.paste(top, (0, 0), Image.fromarray(np.minimum(np.array(m), np.array(circle_mask())), 'L'))
    lay = layer()
    d = ImageDraw.Draw(lay)
    streaks(d, 760, S / 2, alphas=(200, 255, 200), lens=(380, 480, 380), gap=120, h=28)
    with_shadow(img, lay, blur=24, alpha=60)
    b = ball_layer(1060, S / 2, 300, light=(255, 255, 255), mid=WHITE, edge=(200, 206, 222))
    with_shadow(img, b, dy=40, blur=50, alpha=120)
    return clip_circle(img)


def i_net():
    img = base('#0EA5E9', '#6366F1')
    lay = layer()
    d = ImageDraw.Draw(lay)
    ground, nx = 1640, 1024
    d.rounded_rectangle((180, ground - 22, 1868, ground + 22), radius=22, fill=WHITE + (255,))
    d.rectangle((nx - 18, 1180, nx + 18, ground), fill=WHITE + (255,))
    d.rounded_rectangle((nx - 70, 1160, nx + 70, 1204), radius=20, fill=WHITE + (255,))
    # dotted path over the net
    for i in range(8):
        t = i / 7 * 0.82
        x = 420 + t * 1000
        y = 1500 - math.sin(math.pi * t * 0.95) * 760
        r = 22 + 26 * t
        d.ellipse((x - r, y - r, x + r, y + r), fill=WHITE + (int(110 + 140 * t),))
    with_shadow(img, lay, blur=24, alpha=60)
    with_shadow(img, ball_layer(1500, 1020, 230), dy=36, blur=44, alpha=110)
    return clip_circle(img)


ICONS = [
    ('A', 'lopta u letu (tvoj izbor)', i_rally),
    ('A2', 'lopta u luku', i_arc),
    ('A3', 'kometa', i_comet),
    ('A4', 'A u tirkiznoj', lambda: rally('#14B8A6', '#2563EB')),
    ('A5', 'A na belom (kao SaunaPal)', i_white),
    ('G', '+1 poen', i_plus),
    ('H', 'prsten poena', i_ring),
    ('I', 'dve polovine ekrana', i_halves),
    ('J', 'preko mreže', i_net),
]


def main(out, folder=None):
    rendered = []
    for key, name, fn in ICONS:
        ic = fn().resize((1024, 1024), Image.LANCZOS)
        rendered.append((key, name, ic))
        if folder:
            ic.save(os.path.join(folder, f'ikonica-{key}.png'))
    CW, big, small, RH, cols = 440, 280, 96, 560, 3
    rows = math.ceil(len(rendered) / cols)
    sheet = Image.new('RGB', (CW * cols, RH * rows), (236, 236, 238))
    d = ImageDraw.Draw(sheet)
    cap = font('Inter-SemiBold', 22)
    for i, (key, name, ic) in enumerate(rendered):
        cx = (i % cols) * CW + CW // 2
        y0 = (i // cols) * RH
        b = ic.resize((big, big), Image.LANCZOS)
        sheet.paste(b, (cx - big // 2, y0 + 20), b)
        d.ellipse((cx - 76, y0 + 318, cx + 76, y0 + 470), fill=(0, 0, 0))
        s = ic.resize((small, small), Image.LANCZOS)
        sheet.paste(s, (cx - small // 2, y0 + 346), s)
        d.text((cx, y0 + 510), f'{key}: {name}', font=cap, fill=(40, 40, 40), anchor='mm')
    sheet.save(out)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
