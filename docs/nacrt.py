"""Racket score app, draft 1: watch screens on a 480 px round screen (T-Rex 3 Pro).

Screens: pick a saved match setup, who serves first, the match screen (tennis in 3 colour
variants, pickleball doubles), the menu and the end-of-match summary.

Usage: python3 nacrt.py <out.png>
"""
import math
import sys
from PIL import Image, ImageDraw, ImageFont

S = 2  # supersampling
CELL_W, CELL_H, TOP, CAP_H = 540, 480, 30, 96
COLS = 3

INTER = '/usr/share/fonts/opentype/inter/Inter-{}.otf'
DJV = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

WHITE = (255, 255, 255)
GRAY = (150, 150, 150)
DGRAY = (95, 95, 95)
DARK = (40, 40, 40)
PILL = (52, 52, 52)
HEART = (255, 69, 90)
BLACK = (0, 0, 0)

# colour variants: accent (serve ball, labels), points box fill, points text, my colour, their colour
VARIANTS = {
    'A': dict(name='A: teniska loptica', accent=(212, 240, 43), box=(212, 240, 43), box_text=BLACK,
              me=WHITE, them=WHITE),
    'B': dict(name='B: plavo i narandžasto', accent=(255, 196, 0), box=None, box_text=None,
              me=(64, 170, 255), them=(255, 122, 40)),
    'C': dict(name='C: belo i zeleno', accent=(46, 204, 113), box=DARK, box_text=WHITE,
              me=WHITE, them=WHITE),
}

_fonts = {}


def F(size, weight='SemiBold', path=None):
    key = (size, weight, path)
    if key not in _fonts:
        _fonts[key] = ImageFont.truetype(path or INTER.format(weight), int(size * S))
    return _fonts[key]


class Panel:
    def __init__(self, w=480, h=480):
        self.w, self.h = w, h
        self.img = Image.new('RGB', (w * S, h * S), BLACK)
        self.d = ImageDraw.Draw(self.img)

    def text(self, x, y, s, size, fill=WHITE, weight='SemiBold', anchor='mm', path=None):
        self.d.text((x * S, y * S), s, font=F(size, weight, path), fill=fill, anchor=anchor)

    def rrect(self, x0, y0, x1, y1, r, fill=None, outline=None, width=0):
        self.d.rounded_rectangle([x0 * S, y0 * S, x1 * S, y1 * S], radius=r * S, fill=fill,
                                 outline=outline, width=width * S)

    def circle(self, x, y, r, fill=None, outline=None, width=0):
        self.d.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], fill=fill,
                       outline=outline, width=width * S)

    def heart(self, x, y, r, fill=HEART):
        # two circles and a triangle
        self.circle(x - r * 0.5, y - r * 0.2, r * 0.55, fill=fill)
        self.circle(x + r * 0.5, y - r * 0.2, r * 0.55, fill=fill)
        self.d.polygon([((x - r * 1.03) * S, (y - r * 0.05) * S), ((x + r * 1.03) * S, (y - r * 0.05) * S),
                        (x * S, (y + r * 1.0) * S)], fill=fill)

    def ball(self, x, y, r, fill, seam=BLACK):
        self.circle(x, y, r, fill=fill)
        # seam
        self.d.arc([(x - r * 1.5) * S, (y - r) * S, (x - r * 0.25) * S, (y + r) * S], -60, 60,
                   fill=seam, width=max(2, int(r * 0.22 * S)))
        self.d.arc([(x + r * 0.25) * S, (y - r) * S, (x + r * 1.5) * S, (y + r) * S], 120, 240,
                   fill=seam, width=max(2, int(r * 0.22 * S)))

    def poly(self, pts, fill):
        self.d.polygon([(x * S, y * S) for x, y in pts], fill=fill)

    def button(self, x, y, w, h, label, size=26, fill=PILL, fg=WHITE):
        self.rrect(x - w / 2, y - h / 2, x + w / 2, y + h / 2, h / 2, fill=fill)
        self.text(x, y, label, size, fg)

    def done(self):
        img = self.img.resize((self.w, self.h), Image.LANCZOS)
        mask = Image.new('L', (self.w * S, self.h * S), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, self.w * S - 1, self.h * S - 1], fill=255)
        mask = mask.resize((self.w, self.h), Image.LANCZOS)
        out = Image.new('RGB', (self.w, self.h), (24, 24, 24))
        out.paste(img, (0, 0), mask)
        return out


# ---------- serve marker, one per sport ----------

def serve_marker(p, sport, x, y, r):
    if sport in ('tennis', 'padel'):
        # padel balls look like tennis balls; a warmer yellow tells them apart
        p.ball(x, y, r, (212, 240, 43) if sport == 'tennis' else (255, 214, 10), seam=WHITE)
    elif sport == 'pickleball':
        p.circle(x, y, r, fill=(236, 232, 40))
        for dx, dy in ((0, 0), (-0.5, -0.45), (0.5, -0.45), (-0.5, 0.45), (0.5, 0.45)):
            p.circle(x + dx * r, y + dy * r, r * 0.17, fill=(110, 110, 0))
    elif sport == 'table tennis':
        p.circle(x, y, r * 0.85, fill=(250, 250, 250))
    elif sport == 'squash':
        p.circle(x, y, r * 0.85, fill=(45, 45, 45), outline=(160, 160, 160), width=max(1, round(r / 8)))
        for dx in (-0.25, 0.25):
            p.circle(x + dx * r, y - r * 0.32, r * 0.16, fill=(255, 214, 10))
    elif sport == 'badminton':
        # shuttlecock pointing up-right: cork at the bottom-left, feather skirt to the top-right
        # a bit smaller and shifted left so the feathers stay clear of the name
        r *= 0.85
        x, y = x - r * 0.35, y + r * 0.2
        ux, uy, wx, wy = 0.707, -0.707, 0.707, 0.707
        cx, cy = x - ux * r * 0.6, y - uy * r * 0.6
        at = lambda a, b: (cx + ux * a * r + wx * b * r, cy + uy * a * r + wy * b * r)
        p.poly([at(0.15, -0.32), at(0.15, 0.32), at(1.75, 0.8), at(1.75, -0.8)], WHITE)
        for b in (-0.4, 0, 0.4):
            p.d.line([at(0.2, b * 0.35)[0] * S, at(0.2, b * 0.35)[1] * S, at(1.7, b)[0] * S, at(1.7, b)[1] * S],
                     fill=(170, 170, 170), width=max(1, round(r / 10)) * S)
        p.circle(cx, cy, r * 0.42, fill=(236, 206, 160))


# ---------- screens ----------

def status_row(p, hr='142', dur='47:12'):
    p.heart(176, 62, 11)
    p.text(196, 62, hr, 28, WHITE, anchor='lm')
    p.text(300, 62, dur, 28, GRAY, anchor='mm')


def score_row(p, v, y, name, sets, games, points, serving=False, side=None, me=True, sport='tennis'):
    col = v['me'] if me else v['them']
    # serve ball, name and serve side
    if serving:
        serve_marker(p, sport, 58, y - 16, 12)
    p.text(78, y - 16, name, 26, col, anchor='lm')
    if serving and side:
        p.text(78, y + 18, side, 17, v['accent'], weight='Medium', anchor='lm')
    # finished sets (small, gray), then games in the current set (none for pickleball etc.)
    x = 218
    for s in sets:
        p.text(x, y, str(s), 32, GRAY, weight='Medium')
        x += 34
    if games is not None:
        p.text(x + 4, y, str(games), 44, col, weight='Bold')
    # current points
    bx = 378
    if v['box']:
        p.rrect(bx - 42, y - 38, bx + 42, y + 38, 18, fill=v['box'])
        p.text(bx, y + 1, points, 48, v['box_text'], weight='Bold')
    else:
        p.rrect(bx - 42, y - 38, bx + 42, y + 38, 18, outline=col, width=3)
        p.text(bx, y + 1, points, 48, col, weight='Bold')


def middle(p, v):
    p.d.line([(40 * S, 240 * S), (440 * S, 240 * S)], fill=DARK, width=2 * S)
    p.button(178, 240, 108, 50, 'UNDO', 22)
    p.button(302, 240, 108, 50, 'MENU', 22)


def match_tennis(v):
    p = Panel()
    status_row(p)
    score_row(p, v, 158, 'THEM', [6, 3], 4, '30', me=False)
    middle(p, v)
    score_row(p, v, 322, 'YOU', [4, 6], 5, '40', serving=True, side='serve right', me=True)
    p.text(240, 420, 'SET POINT', 26, v['accent'], weight='Bold')
    return p.done()


def match_pickle(v):
    p = Panel()
    status_row(p, '151', '23:40')
    # pickleball doubles: game score + server number
    score_row(p, v, 158, 'THEM', [11], None, '5', me=False)
    middle(p, v)
    score_row(p, v, 322, 'YOU', [8], None, '7', serving=True, side='partner serves', me=True)
    p.text(240, 420, '7 – 5 – 2', 30, v['accent'], weight='Bold')
    return p.done()


def pick_setup(v):
    p = Panel()
    p.text(240, 66, 'New match', 30, WHITE, weight='Bold')
    rows = ['Tennis · No-ad', 'Padel · Star point', 'Pickleball · Doubles', 'Table tennis']
    y = 134
    for i, r in enumerate(rows):
        p.rrect(80, y - 30, 400, y + 30, 30, fill=PILL)
        p.text(240, y, r, 26, WHITE)
        y += 72
    p.text(240, 418, 'More setups on the phone', 19, GRAY, weight='Medium')
    return p.done()


def who_serves(v):
    p = Panel()
    p.text(240, 96, 'Tennis · No-ad', 26, GRAY, weight='Medium')
    p.text(240, 146, 'Who serves first?', 34, WHITE, weight='Bold')
    p.rrect(70, 200, 410, 284, 42, fill=v['me'] if v['me'] != WHITE else PILL)
    p.text(240, 242, 'YOU', 36, BLACK if v['me'] != WHITE else WHITE, weight='Bold')
    p.rrect(70, 304, 410, 388, 42, fill=v['them'] if v['them'] != WHITE else PILL)
    p.text(240, 346, 'THEM', 36, BLACK if v['them'] != WHITE else WHITE, weight='Bold')
    return p.done()


def menu(v):
    p = Panel()
    p.text(240, 70, 'Menu', 30, WHITE, weight='Bold')
    rows = [('Change server', WHITE), ('End match', (255, 90, 80)), ('New match', WHITE), ('Back', GRAY)]
    y = 140
    for r, c in rows:
        p.rrect(80, y - 30, 400, y + 30, 30, fill=PILL)
        p.text(240, y, r, 26, c)
        y += 72
    return p.done()


def summary(v):
    p = Panel()
    p.ball(146, 72, 14, v['accent'])
    p.text(250, 72, 'YOU WON', 34, v['me'], weight='Bold')
    p.text(240, 128, '6–4   3–6   10–7', 34, WHITE, weight='Bold')
    p.text(240, 168, 'Tennis · No-ad · 1:12:05', 22, GRAY, weight='Medium')
    # key stats
    rows = [('Points won', '78 – 71'), ('On your serve', '64%'), ('Break points', '3 / 7')]
    y = 220
    for k, val in rows:
        p.text(96, y, k, 24, GRAY, weight='Medium', anchor='lm')
        p.text(384, y, val, 26, WHITE, weight='Bold', anchor='rm')
        y += 40
    p.heart(150, 343, 10)
    p.text(168, 343, 'avg 138 · max 171', 24, WHITE, weight='Medium', anchor='lm')
    p.button(176, 400, 132, 52, 'REMATCH', 21, fill=v['accent'], fg=BLACK)
    p.button(306, 400, 104, 52, 'DONE', 21)
    return p.done()


# ---------- sheet ----------

def sheet(cells, out):
    rows = math.ceil(len(cells) / COLS)
    W = COLS * CELL_W
    H = rows * (CELL_H + CAP_H) + TOP
    img = Image.new('RGB', (W, H), (18, 18, 18))
    d = ImageDraw.Draw(img)
    cap = ImageFont.truetype(INTER.format('SemiBold'), 22)
    sub = ImageFont.truetype(INTER.format('Medium'), 17)
    for i, (title, note, panel) in enumerate(cells):
        cx = (i % COLS) * CELL_W + CELL_W // 2
        y0 = TOP + (i // COLS) * (CELL_H + CAP_H)
        img.paste(panel, (cx - 240, y0))
        d.text((cx, y0 + CELL_H + 22), title, font=cap, fill=WHITE, anchor='mm')
        d.text((cx, y0 + CELL_H + 52), note, font=sub, fill=GRAY, anchor='mm')
    img.save(out)


def main(out):
    A, B, C = VARIANTS['A'], VARIANTS['B'], VARIANTS['C']
    cells = [
        ('1. Izbor meča', 'kombinacije sačuvane na telefonu', pick_setup(A)),
        ('2. Ko prvi servira', 'u dublu sledi: ti ili partner', who_serves(A)),
        ('3. Meč, tenis', A['name'], match_tennis(A)),
        ('3. Meč, tenis', B['name'], match_tennis(B)),
        ('3. Meč, tenis', C['name'], match_tennis(C)),
        ('4. Meč, pikleball dubl', 'dole poziv rezultata: 7-5-2', match_pickle(A)),
        ('5. Meni', 'kraj meča traži potvrdu', menu(A)),
        ('6. Kraj meča', 'detaljna statistika na telefonu', summary(A)),
    ]
    sheet(cells, out)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'nacrt-sat.png')
