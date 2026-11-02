"""RallyPal serve marker, one per sport: six markers enlarged, then a match screen per sport
at real size on the 480 px round screen.

Usage: python3 servis.py <out.png>
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nacrt  # noqa: E402
from nacrt import Panel, VARIANTS, status_row, score_row, middle, serve_marker, INTER, WHITE, GRAY  # noqa: E402

A = VARIANTS['A']
SPORTS = [('tennis', 'Tenis'), ('padel', 'Padel'), ('pickleball', 'Pikleball'),
          ('table tennis', 'Stoni tenis'), ('squash', 'Skvoš'), ('badminton', 'Badminton')]


def match(sport, them, you, label, hr='142', dur='47:12'):
    p = Panel()
    status_row(p, hr, dur)
    score_row(p, A, 158, 'THEM', *them, me=False, sport=sport)
    middle(p, A)
    score_row(p, A, 322, 'YOU', *you, me=True, sport=sport)
    if label:
        p.text(240, 420, label, 26 if len(label) < 14 else 24, A['accent'], weight='Bold')
    return p.done()


SCREENS = {
    'tennis': (([6, 3], 4, '30'), ([4, 6], 5, '40', True, 'serve right'), 'SET POINT', 'set 3, ti serviraš sa desne'),
    'padel': (([6], 2, '40'), ([4], 3, '40', True, 'you serve left'), 'GOLDEN POINT', 'dubl, servis sa leve'),
    'pickleball': (([11], None, '5'), ([8], None, '7', True, 'partner serves'), '7 – 5 – 2', 'dubl, servira partner'),
    'table tennis': (([11, 7], None, '6'), ([9, 11], None, '10', True, 'serve 2 of 2'), 'GAME POINT', 'servis se menja na 2 poena'),
    'squash': (([11], None, '4'), ([8], None, '9', True, 'serve left'), None, 'servis sa leve strane'),
    'badminton': (([21], None, '15'), ([18], None, '19', True, 'serve left'), None, 'neparan rezultat, sa leve'),
}


def strip(W):
    s = 2
    H = 230
    p = Panel(W, H)
    step = W / len(SPORTS)
    for i, (sport, name) in enumerate(SPORTS):
        cx = step * i + step / 2
        serve_marker(p, sport, cx - (14 if sport == 'badminton' else 0), 92 + (14 if sport == 'badminton' else 0), 46)
        p.text(cx, 190, name, 22, WHITE)
    img = p.img.resize((W, H), Image.LANCZOS)
    return img


def main(out):
    cells = []
    for sport, name in SPORTS:
        them, you, label, note = SCREENS[sport]
        cells.append((name, note, match(sport, them, you, label)))
    tmp = out + '.tmp.png'
    nacrt.sheet(cells, tmp)
    grid = Image.open(tmp)
    grid.load()
    os.remove(tmp)
    top = strip(grid.width)
    img = Image.new('RGB', (grid.width, grid.height + top.height + 60), (18, 18, 18))
    d = ImageDraw.Draw(img)
    d.text((grid.width // 2, 34), 'Znak servisa po sportu (uvećano), ispod u pravoj veličini na satu',
           font=ImageFont.truetype(INTER.format('SemiBold'), 24), fill=GRAY, anchor='mm')
    img.paste(top, (0, 60))
    img.paste(grid, (0, 60 + top.height))
    img.save(out)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'nacrt-servis.png')
