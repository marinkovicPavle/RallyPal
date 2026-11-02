"""RallyPal as a standalone app (decision 26): all watch screens, round (T-Rex 3 Pro, 480 px)
and square (Bip 6, 390 x 450), with the key tabs next to the physical buttons like SaunaPal.

Reuses the drawing helpers and the agreed match screen parts from nacrt.py.
Usage: python3 nacrt2.py <out.png>
"""
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nacrt import (Panel, S, VARIANTS, INTER, WHITE, GRAY, DGRAY, DARK, PILL, BLACK,  # noqa: E402
                   status_row, score_row, middle, serve_marker, summary)

A = VARIANTS['A']
ACCENT = A['accent']
RED = (255, 90, 80)
TAB_GRAY = (110, 110, 110)
CARD = (38, 38, 38)

# key tabs, clockwise from 12 o'clock (T-Rex 3 Pro: SELECT upper right, BACK lower right,
# DOWN lower left, UP upper left), as in SaunaPal utils/keys.js
TAB_ANGLE = {'ur': 60, 'lr': 120, 'll': 240, 'ul': 300}


def tabs(p, spec):
    for key, color in spec.items():
        a = TAB_ANGLE[key] - 90
        inset = 7
        p.d.arc([inset * S, inset * S, (p.w - inset) * S, (p.h - inset) * S], a - 11, a + 11, fill=color,
                width=8 * S)


def tab_label(p, key, label):
    # kept inside the arcs so no letter touches them
    pos = {'ur': (402, 104, 'mm'), 'lr': (402, 380, 'mm'), 'll': (106, 374, 'mm'), 'ul': (106, 110, 'mm')}[key]
    p.text(pos[0], pos[1], label, 15, GRAY, weight='Medium', anchor=pos[2])


def caret(p, x, y, size=7, fill=WHITE):
    p.poly([(x - size, y - size / 2), (x + size, y - size / 2), (x, y + size / 2 + 1)], fill)


def icon_history(p, x, y, r=13, fill=WHITE):
    w = max(2, round(r / 5))
    p.circle(x, y, r, outline=fill, width=w)
    p.d.line([x * S, y * S, x * S, (y - r * 0.6) * S], fill=fill, width=w * S)
    p.d.line([x * S, y * S, (x + r * 0.45) * S, (y + r * 0.2) * S], fill=fill, width=w * S)


def icon_gear(p, x, y, r=13, fill=WHITE, bg=PILL):
    for k in range(8):
        a = math.radians(k * 45)
        cx, cy = x + math.cos(a) * r * 0.95, y + math.sin(a) * r * 0.95
        p.circle(cx, cy, r * 0.28, fill=fill)
    p.circle(x, y, r * 0.8, fill=fill)
    p.circle(x, y, r * 0.35, fill=bg)


def who_serves_keys():
    p = Panel()
    p.text(240, 92, 'Tennis · No-ad', 24, GRAY, weight='Medium')
    p.text(240, 140, 'Who serves first?', 34, WHITE, weight='Bold')
    p.rrect(70, 196, 410, 280, 42, fill=PILL)
    p.text(240, 238, 'THEM', 36, WHITE, weight='Bold')
    p.rrect(70, 300, 410, 384, 42, fill=PILL)
    p.text(240, 342, 'YOU', 36, WHITE, weight='Bold')
    tabs(p, {'ur': ACCENT, 'lr': ACCENT})
    return p.done()


def round_icon_button(p, x, y, kind):
    p.circle(x, y, 32, fill=PILL)
    (icon_history if kind == 'history' else icon_gear)(p, x, y)


def done_square(p, radius=64):
    img = p.img.resize((p.w, p.h), Image.LANCZOS)
    mask = Image.new('L', (p.w * S, p.h * S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, p.w * S - 1, p.h * S - 1], radius=radius * S, fill=255)
    mask = mask.resize((p.w, p.h), Image.LANCZOS)
    out = Image.new('RGB', (p.w, p.h), (24, 24, 24))
    out.paste(img, (0, 0), mask)
    return out


def side_bar(p, y0, y1, color):
    p.rrect(p.w - 7, y0, p.w + 4, y1, 3, fill=color)


# ---------- round screens ----------

def home(locked=False):
    p = Panel()
    tabs(p, {'ur': ACCENT, 'ul': TAB_GRAY, 'll': TAB_GRAY})
    # above the trial line, so the two do not read as one sentence
    p.text(112, 94, 'Settings', 15, GRAY, weight='Medium')
    tab_label(p, 'll', 'History')
    p.text(240, 72, 'RallyPal', 36, ACCENT, weight='Bold')
    p.text(240, 110, 'Free matches used' if locked else '2 free matches left', 19, GRAY, weight='Medium')
    p.rrect(98, 142, 382, 196, 27, fill=PILL)
    serve_marker(p, 'tennis', 132, 169, 11)
    p.text(152, 169, 'Tennis · Best of 3', 23, WHITE, anchor='lm')
    caret(p, 356, 168)
    p.text(240, 228, 'Last: won 6–4 3–6 10–7 · Marko', 19, GRAY, weight='Medium')
    if locked:
        p.button(240, 296, 270, 70, 'UNLOCK', 30, fill=ACCENT, fg=BLACK)
    else:
        p.button(240, 296, 270, 70, 'NEW MATCH', 30, fill=ACCENT, fg=BLACK)
    round_icon_button(p, 196, 384, 'history')
    round_icon_button(p, 284, 384, 'settings')
    return p.done()


def setup_list():
    p = Panel()
    tabs(p, {'ur': ACCENT})
    p.text(240, 62, 'MATCH SETUP', 26, WHITE, weight='Bold')
    rows = [('tennis', 'Tennis · Best of 3', '', True), ('tennis', 'Tennis · No-ad', 'Marko', False),
            ('padel', 'Padel · Star point', 'with Ana', False), ('pickleball', 'Pickleball · Doubles', '', False),
            ('table tennis', 'Table tennis · Bo5', '', False)]
    y = 114
    for sport, label, extra, sel in rows:
        p.rrect(66, y - 27, 414, y + 27, 27, fill=PILL, outline=ACCENT if sel else None, width=3 if sel else 0)
        serve_marker(p, sport, 98, y, 10)
        p.text(120, y, label, 21, WHITE, anchor='lm')
        if extra:
            p.text(392, y, extra, 17, GRAY, weight='Medium', anchor='rm')
        y += 64
    p.text(240, 434, 'Edit setups on the phone', 16, GRAY, weight='Medium')
    return p.done()


def match_keys():
    p = Panel()
    status_row(p)
    score_row(p, A, 158, 'THEM', [6, 3], 4, '30', me=False)
    middle(p, A)
    score_row(p, A, 322, 'YOU', [4, 6], 5, '40', serving=True, side='serve right', me=True)
    p.text(240, 420, 'SET POINT', 26, ACCENT, weight='Bold')
    tabs(p, {'ur': ACCENT, 'lr': ACCENT, 'ul': TAB_GRAY, 'll': TAB_GRAY})
    tab_label(p, 'ur', '+1')
    tab_label(p, 'lr', '+1')
    tab_label(p, 'ul', 'Undo')
    tab_label(p, 'll', 'Menu')
    return p.done()


def menu():
    p = Panel()
    p.text(240, 62, 'Menu', 30, WHITE, weight='Bold')
    rows = [('Change server', WHITE), ('End match', RED), ('New match', WHITE),
            ('Leave · match keeps going', WHITE), ('Back', GRAY)]
    y = 116
    for label, color in rows:
        p.rrect(78, y - 27, 402, y + 27, 27, fill=PILL)
        p.text(240, y, label, 23 if len(label) < 20 else 20, color)
        y += 64
    return p.done()


def leave():
    p = Panel()
    p.text(240, 110, 'Leave RallyPal?', 30, WHITE, weight='Bold')
    p.text(240, 172, 'The match keeps going.', 22, GRAY, weight='Medium')
    p.text(240, 204, 'Open RallyPal again', 22, GRAY, weight='Medium')
    p.text(240, 236, 'to continue scoring.', 22, GRAY, weight='Medium')
    p.button(240, 314, 220, 62, 'LEAVE', 26)
    p.button(240, 392, 150, 50, 'STAY', 22, fill=DARK)
    return p.done()


def history():
    p = Panel()
    p.text(240, 60, 'HISTORY', 26, WHITE, weight='Bold')
    p.text(240, 94, '12 matches · 8 won', 18, GRAY, weight='Medium')
    rows = [('tennis', 'W', '6–4 3–6 10–7', 'Marko · Today', '1:12'),
            ('padel', 'L', '4–6 2–6', 'Ana & Ivan · Sat 18', '0:58'),
            ('pickleball', 'W', '11–7 11–9', 'Doubles · Thu 16', '0:41'),
            ('badminton', 'W', '21–18 21–15', 'Luka · Mon 13', '0:37')]
    y = 146
    for sport, wl, score, sub, dur in rows:
        p.rrect(58, y - 29, 422, y + 29, 22, fill=PILL)
        serve_marker(p, sport, 86, y, 10)
        p.text(110, y - 11, wl, 20, ACCENT if wl == 'W' else RED, weight='Bold', anchor='lm')
        p.text(140, y - 11, score, 20, WHITE, weight='Bold', anchor='lm')
        p.text(110, y + 13, sub, 16, GRAY, weight='Medium', anchor='lm')
        p.text(402, y - 11, dur, 18, GRAY, weight='Medium', anchor='rm')
        y += 66
    p.text(240, 422, 'Tap a match: details, delete', 16, GRAY, weight='Medium')
    return p.done()


def detail():
    p = Panel()
    p.text(240, 58, 'Tennis · Oct 20', 26, WHITE, weight='Bold')
    p.text(240, 90, 'vs Marko · 18:05–19:17', 18, GRAY, weight='Medium')
    p.text(240, 132, '6–4   3–6   10–7', 32, WHITE, weight='Bold')
    p.text(240, 168, 'YOU WON', 20, ACCENT, weight='Bold')
    rows = [('Duration', '1:12:05'), ('Heart rate', '138 avg · 171 max'), ('Points won', '78 – 71'),
            ('On your serve', '64%'), ('Break points', '3 / 7'), ('Longest streak', '6 points')]
    y = 208
    for k, v in rows:
        p.text(84, y, k, 21, GRAY, weight='Medium', anchor='lm')
        p.text(396, y, v, 21, WHITE, weight='Bold', anchor='rm')
        y += 34
    p.rrect(186, 404, 294, 440, 18, outline=RED, width=2)
    p.text(240, 422, 'DELETE', 17, RED, weight='Bold')
    return p.done()


def settings():
    p = Panel()
    p.text(240, 58, 'SETTINGS', 26, WHITE, weight='Bold')
    rows = [('Vibration', 'Point · Game · Set · Match'), ('Serve display', 'Side and player'),
            ('Labels', 'Set, match, break point'), ('Screen in a match', 'Off with wrist down'),
            ('Strava', 'Linked · with heart rate')]
    y = 110
    for label, sub in rows:
        p.rrect(66, y - 28, 414, y + 28, 20, fill=PILL)
        p.text(88, y - 11, label, 21, WHITE, anchor='lm')
        p.text(88, y + 13, sub, 16, ACCENT, weight='Medium', anchor='lm')
        y += 64
    p.text(240, 424, 'Below: Unlock, About', 16, GRAY, weight='Medium')
    # scroll position, like SaunaPal lists
    p.d.arc([12 * S, 12 * S, 468 * S, 468 * S], -40, 10, fill=TAB_GRAY, width=4 * S)
    return p.done()


def unlock():
    p = Panel()
    p.text(240, 64, 'Unlock RallyPal', 28, WHITE, weight='Bold')
    p.text(240, 108, 'Go to kzl.io/code', 24, (200, 200, 200), weight='Medium')
    p.text(240, 180, '482137', 76, ACCENT, weight='Bold')
    p.text(240, 258, '$2.99 once, yours forever', 24, WHITE, weight='Medium')
    p.text(240, 300, 'Already paid? kzl.io/unlock', 19, GRAY, weight='Medium')
    p.text(240, 340, 'Waiting for your payment…', 18, GRAY, weight='Medium')
    p.text(240, 396, 'History stays open', 18, GRAY, weight='Medium')
    return p.done()


def card():
    p = Panel()
    # neighbouring cards in the card list
    p.rrect(60, -40, 420, 110, 30, fill=(28, 28, 28))
    p.rrect(60, 400, 420, 520, 30, fill=(28, 28, 28))
    p.rrect(46, 128, 434, 382, 34, fill=CARD)
    p.circle(88, 168, 16, fill=(124, 58, 237))
    p.circle(91, 166, 8, fill=ACCENT)
    p.text(116, 168, 'RallyPal', 22, WHITE, weight='Bold', anchor='lm')
    p.text(76, 222, 'Last: won 6–4 3–6 10–7', 22, WHITE, anchor='lm')
    p.text(76, 254, 'Marko · Tennis · Today', 18, GRAY, weight='Medium', anchor='lm')
    p.button(240, 326, 240, 58, 'NEW MATCH', 24, fill=ACCENT, fg=BLACK)
    return p.done()


# ---------- square screens (Bip 6, 390 x 450, two keys on the right) ----------

def sq_score_row(p, y, name, sets, games, points, serving=False, side=None, me=True, sport='tennis'):
    if serving:
        serve_marker(p, sport, 28, y - 16, 11)
    p.text(46, y - 16, name, 25, WHITE, anchor='lm')
    if serving and side:
        p.text(46, y + 16, side, 16, ACCENT, weight='Medium', anchor='lm')
    x = 166
    for s in sets:
        p.text(x, y, str(s), 30, GRAY, weight='Medium')
        x += 30
    if games is not None:
        p.text(x + 4, y, str(games), 42, WHITE, weight='Bold')
    bx = 314
    p.rrect(bx - 40, y - 36, bx + 40, y + 36, 18, fill=ACCENT)
    p.text(bx, y + 1, points, 46, BLACK, weight='Bold')


def sq_match():
    p = Panel(390, 450)
    p.heart(140, 44, 10)
    p.text(158, 44, '142', 26, WHITE, anchor='lm')
    p.text(246, 44, '47:12', 26, GRAY)
    sq_score_row(p, 134, 'THEM', [6, 3], 4, '30', me=False)
    p.d.line([(24 * S, 224 * S), (366 * S, 224 * S)], fill=DARK, width=2 * S)
    p.button(137, 224, 104, 48, 'UNDO', 21)
    p.button(253, 224, 104, 48, 'MENU', 21)
    sq_score_row(p, 314, 'YOU', [4, 6], 5, '40', serving=True, side='serve right')
    p.text(195, 402, 'SET POINT', 25, ACCENT, weight='Bold')
    side_bar(p, 96, 172, ACCENT)
    side_bar(p, 276, 352, ACCENT)
    p.text(372, 186, '+1', 14, GRAY, weight='Medium')
    p.text(372, 366, '+1', 14, GRAY, weight='Medium')
    return done_square(p)


def sq_home():
    p = Panel(390, 450)
    p.text(195, 50, 'RallyPal', 34, ACCENT, weight='Bold')
    p.text(195, 86, '2 free matches left', 18, GRAY, weight='Medium')
    p.rrect(52, 116, 338, 168, 26, fill=PILL)
    serve_marker(p, 'tennis', 84, 142, 11)
    p.text(104, 142, 'Tennis · Best of 3', 22, WHITE, anchor='lm')
    caret(p, 314, 141)
    p.text(195, 200, 'Last: won 6–4 3–6 10–7 · Marko', 17, GRAY, weight='Medium')
    p.button(195, 266, 260, 66, 'NEW MATCH', 28, fill=ACCENT, fg=BLACK)
    round_icon_button(p, 151, 356, 'history')
    round_icon_button(p, 239, 356, 'settings')
    side_bar(p, 96, 172, ACCENT)
    side_bar(p, 276, 352, TAB_GRAY)
    p.text(360, 182, 'Start', 14, GRAY, weight='Medium')
    p.text(354, 366, 'History', 14, GRAY, weight='Medium')
    return done_square(p)


# ---------- sheet ----------

CELL_W, CELL_H, TOP, CAP_H, COLS = 540, 480, 30, 96, 3


def sheet(cells, out):
    rows = math.ceil(len(cells) / COLS)
    img = Image.new('RGB', (COLS * CELL_W, rows * (CELL_H + CAP_H) + TOP), (18, 18, 18))
    d = ImageDraw.Draw(img)
    cap = ImageFont.truetype(INTER.format('SemiBold'), 22)
    sub = ImageFont.truetype(INTER.format('Medium'), 17)
    for i, (title, note, panel) in enumerate(cells):
        cx = (i % COLS) * CELL_W + CELL_W // 2
        y0 = TOP + (i // COLS) * (CELL_H + CAP_H)
        img.paste(panel, (cx - panel.width // 2, y0 + (CELL_H - panel.height) // 2))
        d.text((cx, y0 + CELL_H + 22), title, font=cap, fill=WHITE, anchor='mm')
        d.text((cx, y0 + CELL_H + 52), note, font=sub, fill=GRAY, anchor='mm')
    img.save(out)


def main(out):
    cells = [
        ('1. Početni ekran', 'desno gore nov meč; levo podešavanja i istorija', home()),
        ('2. Izbor kombinacije', 'tap na kombinaciju na početnom ekranu', setup_list()),
        ('3. Ko prvi servira', 'protivnik gore, ti dole, kao u meču', who_serves_keys()),
        ('4. Meč, oznake uz dugmad', 'desno: poen protivnika / tvoj; levo: vrati / meni', match_keys()),
        ('5. Meni', 'kraj meča traži potvrdu', menu()),
        ('6. Izlaz', 'meč nastavlja kad opet otvoriš RallyPal', leave()),
        ('7. Kraj meča', 'detaljna statistika i na telefonu', summary(A)),
        ('8. Istorija', 'najnoviji prvi; tap otvara detalj', history()),
        ('9. Detalj meča', 'imena se menjaju na telefonu', detail()),
        ('10. Podešavanja', 'iste kao na telefonu', settings()),
        ('11. Posle 3 besplatna meča', 'UNLOCK umesto NEW MATCH', home(locked=True)),
        ('12. Otključavanje', 'isti kod i u podešavanjima na telefonu', unlock()),
        ('13. Prečica u listi kartica', 'poslednji rezultat i nov meč', card()),
        ('14. Četvrtasti sat (Bip 6), početni', 'gornje dugme nov meč, donje istorija', sq_home()),
        ('15. Četvrtasti sat, meč', 'gornje dugme poen protivnika, donje tvoj', sq_match()),
    ]
    sheet(cells, out)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'nacrt2-sat.png')
