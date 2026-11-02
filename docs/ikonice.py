"""RallyPal icon drafts: four concepts, each shown large and at watch size.

Usage: python3 ikonice.py <out.png>
"""
import math
import sys
from PIL import Image, ImageDraw, ImageFont

N = 1024
BALL = (212, 240, 43)
BALL_DARK = (170, 196, 20)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
INK = (28, 28, 30)
GRAY = (150, 150, 150)
INTER = '/usr/share/fonts/opentype/inter/Inter-{}.otf'


def disc(fill):
    img = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(img).ellipse((0, 0, N - 1, N - 1), fill=fill)
    return img


def ball(d, cx, cy, r, fill=BALL, seam=WHITE, seam_w=None):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=fill)
    w = seam_w or max(4, int(r * 0.11))
    # two seams curving in from left and right
    d.arc((cx - r * 1.75, cy - r * 1.05, cx - r * 0.2, cy + r * 1.05), -52, 52, fill=seam, width=w)
    d.arc((cx + r * 0.2, cy - r * 1.05, cx + r * 1.75, cy + r * 1.05), 128, 232, fill=seam, width=w)


def racket(img, cx, cy, scale, angle, frame, strings=None, grip=None):
    """Tennis racket drawn upright on its own layer, then rotated and pasted."""
    L = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(L)
    hx, hy, hw, hh = N / 2, N * 0.36, 250 * scale, 320 * scale  # head centre and half sizes
    fw = int(34 * scale)
    if strings:
        sw = max(3, int(9 * scale))
        for k in range(-3, 4):
            x = hx + k * hw * 0.24
            dy = hh * math.sqrt(max(0, 1 - (k * 0.24) ** 2))
            d.line((x, hy - dy, x, hy + dy), fill=strings, width=sw)
            y = hy + k * hh * 0.24
            dx = hw * math.sqrt(max(0, 1 - (k * 0.24) ** 2))
            d.line((hx - dx, y, hx + dx, y), fill=strings, width=sw)
    d.ellipse((hx - hw, hy - hh, hx + hw, hy + hh), outline=frame, width=fw)
    # throat
    ty = hy + hh - fw / 2
    d.polygon([(hx - 70 * scale, ty - 20 * scale), (hx - 22 * scale, ty + 150 * scale),
               (hx + 22 * scale, ty + 150 * scale), (hx + 70 * scale, ty - 20 * scale),
               (hx + 40 * scale, ty - 20 * scale), (hx, ty + 90 * scale), (hx - 40 * scale, ty - 20 * scale)],
              fill=frame)
    # handle
    d.rounded_rectangle((hx - 30 * scale, ty + 140 * scale, hx + 30 * scale, ty + 420 * scale),
                        radius=20 * scale, fill=grip or frame)
    L = L.rotate(angle, center=(N / 2, N / 2), resample=Image.BICUBIC)
    img.alpha_composite(L, (int(cx - N / 2), int(cy - N / 2)))


def v1():
    # big ball on black
    img = disc(BLACK)
    d = ImageDraw.Draw(img)
    ball(d, N / 2, N / 2, 330, seam=BLACK, seam_w=40)
    return img


def v2():
    # white racket and yellow-green ball on dark
    img = disc(INK)
    racket(img, N / 2 - 30, N / 2 + 10, 0.8, 35, WHITE, strings=(90, 90, 96))
    d = ImageDraw.Draw(img)
    ball(d, 735, 300, 118, seam=INK, seam_w=16)
    return img


def v3():
    # scoreboard: two score boxes like the watch screen, ball as the serve marker
    img = disc(BLACK)
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(INTER.format('Bold'), 250)
    for y, txt, fill, fg in ((340, '30', (52, 52, 52), WHITE), (684, '40', BALL, BLACK)):
        d.rounded_rectangle((330, y - 150, 790, y + 150), radius=70, fill=fill)
        d.text((560, y + 8), txt, font=f, fill=fg, anchor='mm')
    ball(d, 205, 684, 82, seam=BLACK, seam_w=12)
    return img


def v4():
    # SaunaPal family: coloured object on white
    img = disc(WHITE)
    racket(img, N / 2 - 30, N / 2 + 10, 0.8, 35, INK, strings=(200, 200, 204))
    d = ImageDraw.Draw(img)
    ball(d, 735, 300, 118, seam=WHITE, seam_w=16)
    return img


def sheet(out):
    icons = [('1: lopta', v1()), ('2: reket i lopta, tamno', v2()),
             ('3: rezultat 30-40', v3()), ('4: reket i lopta na belom (kao SaunaPal)', v4())]
    CW, big, small = 420, 300, 96
    W, H = CW * len(icons), 520
    out_img = Image.new('RGB', (W, H), (18, 18, 18))
    d = ImageDraw.Draw(out_img)
    cap = ImageFont.truetype(INTER.format('SemiBold'), 20)
    sub = ImageFont.truetype(INTER.format('Medium'), 16)
    for i, (name, ic) in enumerate(icons):
        cx = i * CW + CW // 2
        b = ic.resize((big, big), Image.LANCZOS)
        out_img.paste(b, (cx - big // 2, 30), b)
        s = ic.resize((small, small), Image.LANCZOS)
        out_img.paste(s, (cx - small // 2, 350), s)
        d.text((cx, 470), name, font=cap, fill=WHITE, anchor='mm')
        d.text((cx, 498), 'gore veliko, dole veličina na satu', font=sub, fill=GRAY, anchor='mm')
    out_img.save(out)


# ---------- universal drafts (round 2: no tennis ball) ----------

def dot(d, cx, cy, r, fill=BALL):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=fill)


def paddle(img, cx, cy, scale, angle, fill, grip=None, holes=None):
    """Solid paddle (pickleball/padel/table tennis) drawn upright, rotated, pasted."""
    L = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(L)
    hx, hy, hw, hh = N / 2, N * 0.38, 210 * scale, 250 * scale
    d.rounded_rectangle((hx - hw, hy - hh, hx + hw, hy + hh), radius=int(190 * scale), fill=fill)
    if holes:
        for i in range(-1, 2):
            for j in range(-2, 3):
                x, y = hx + i * 95 * scale, hy + j * 80 * scale
                r = 20 * scale
                d.ellipse((x - r, y - r, x + r, y + r), fill=holes)
    d.rounded_rectangle((hx - 38 * scale, hy + hh - 20 * scale, hx + 38 * scale, hy + hh + 300 * scale),
                        radius=int(24 * scale), fill=grip or fill)
    L = L.rotate(angle, center=(N / 2, N / 2), resample=Image.BICUBIC)
    img.alpha_composite(L, (int(cx - N / 2), int(cy - N / 2)))


def u1():
    # scoreboard with neutral numbers and a plain dot as the serve marker
    img = disc(BLACK)
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(INTER.format('Bold'), 260)
    for y, txt, fill, fg in ((340, '3', (52, 52, 52), WHITE), (684, '5', BALL, BLACK)):
        d.rounded_rectangle((380, y - 150, 740, y + 150), radius=70, fill=fill)
        d.text((560, y + 8), txt, font=f, fill=fg, anchor='mm')
    dot(d, 245, 684, 64)
    return img


def u2():
    # racket and paddle crossed, plain dot
    img = disc(INK)
    racket(img, N / 2 - 115, N / 2 + 40, 0.62, 30, WHITE, strings=(90, 90, 96))
    paddle(img, N / 2 + 115, N / 2 + 40, 0.62, -30, BALL, grip=BALL_DARK)
    d = ImageDraw.Draw(img)
    dot(d, N / 2, 215, 50, WHITE)
    return img


def u3():
    # rally: ball flying over a net, side view
    img = disc(BLACK)
    d = ImageDraw.Draw(img)
    ground = 700
    d.line((150, ground, 874, ground), fill=WHITE, width=26)
    # net
    d.rectangle((503, 470, 521, ground), fill=WHITE)  # post
    d.rectangle((480, 470, 544, 490), fill=WHITE)  # net tape
    # dotted arc trajectory
    pts = []
    for i in range(0, 15):
        t = i / 14
        x = 230 + t * 520
        y = ground - 40 - math.sin(math.pi * t) * 470
        pts.append((x, y))
    for x, y in pts[:-1]:
        dot(d, x, y, 13, (120, 120, 120))
    dot(d, 760, 600, 70)
    return img


def u4():
    # court seen from above with the net across, plain dot
    img = disc(INK)
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = 300, 170, 724, 854
    d.rectangle((x0, y0, x1, y1), outline=WHITE, width=24)
    d.line((x0, (y0 + y1) / 2, x1, (y0 + y1) / 2), fill=BALL, width=34)  # net
    d.line(((x0 + x1) / 2, y0 + 150, (x0 + x1) / 2, y1 - 150), fill=WHITE, width=16)
    d.line((x0, y0 + 150, x1, y0 + 150), fill=WHITE, width=16)
    d.line((x0, y1 - 150, x1, y1 - 150), fill=WHITE, width=16)
    dot(d, 610, 300, 52)
    return img


def sheet2(out):
    icons = [('5: semafor', u1()), ('6: reket i paleta', u2()),
             ('7: lopta preko mreže', u3()), ('8: teren odozgo', u4())]
    CW, big, small = 420, 300, 96
    W, H = CW * len(icons), 520
    out_img = Image.new('RGB', (W, H), (18, 18, 18))
    d = ImageDraw.Draw(out_img)
    cap = ImageFont.truetype(INTER.format('SemiBold'), 20)
    sub = ImageFont.truetype(INTER.format('Medium'), 16)
    for i, (name, ic) in enumerate(icons):
        cx = i * CW + CW // 2
        b = ic.resize((big, big), Image.LANCZOS)
        out_img.paste(b, (cx - big // 2, 30), b)
        s = ic.resize((small, small), Image.LANCZOS)
        out_img.paste(s, (cx - small // 2, 350), s)
        d.text((cx, 470), name, font=cap, fill=WHITE, anchor='mm')
        d.text((cx, 498), 'gore veliko, dole veličina na satu', font=sub, fill=GRAY, anchor='mm')
    out_img.save(out)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[2] == '2':
        sheet2(sys.argv[1])
    else:
        sheet(sys.argv[1] if len(sys.argv) > 1 else 'ikonice.png')
