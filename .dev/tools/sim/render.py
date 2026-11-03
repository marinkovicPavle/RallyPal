"""Draws the screens recorded by tools/sim/run.mjs, one contact sheet per device, and lists layout
problems: text that does not fit its box (cut with an ellipsis or wrapping past its height), buttons
or text that reach outside a round screen, and anything drawn over something else (a button over the
ring, two texts on top of each other) or closer than 4 px to it.

Usage: python3 .dev/tools/sim/render.py <out-dir> [scale]
"""
import glob
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')
FONT = '/usr/share/fonts/opentype/inter/Inter-Medium.otf'
# a text with a character Inter doesn't have (Japanese) is drawn with this font throughout, as zos.js
# measures it (widths.py)
CJK_FONT = '/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf'
INTER_CHARS = set(json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inter-widths.json'), encoding='utf-8'))['inter'])
_fonts = {}
_imgs = {}


def is_cjk(text):
    return any(c not in INTER_CHARS and ord(c) >= 0x2e80 for c in str(text))


def font(size, cjk=False):
    size = max(6, int(round(size)))
    key = (size, cjk)
    if key not in _fonts:
        try:
            _fonts[key] = ImageFont.truetype(CJK_FONT if cjk else FONT, size)
        except OSError:
            _fonts[key] = ImageFont.load_default()
    return _fonts[key]


def rgb(c, a=255):
    c = int(c or 0)
    return ((c >> 16) & 255, (c >> 8) & 255, c & 255, a)


def asset(src, round_):
    key = (src, round_)
    if key not in _imgs:
        path = os.path.join(ROOT, 'assets', 'common.r' if round_ else 'common.s', src)
        _imgs[key] = Image.open(path).convert('RGBA') if os.path.exists(path) else None
    return _imgs[key]


def width(text, f):
    return f.getlength(text)


def wrap(text, f, w, cjk=False):
    # at spaces; in a CJK text between any two characters
    lines = []
    for para in str(text).split('\n'):
        cur = ''
        for part in (list(para) if cjk else para.split(' ')):
            t = (cur + part).lstrip(' ') if cjk else (cur + ' ' + part).strip()
            if width(t, f) <= w or not cur:
                cur = t
            else:
                lines.append(cur)
                cur = part.lstrip(' ') if cjk else part
        lines.append(cur)
    return lines


class Checker:
    def __init__(self, dev, max_scroll=0):
        self.dev = dev
        self.problems = []
        # how far a long page scrolls: on a round screen a row is checked where it can be seen best
        self.max_scroll = max_scroll

    def inside(self, x, y, tol=2):
        if not self.dev['round']:
            return -tol <= x <= self.dev['w'] + tol and -tol <= y <= self.dev['h'] + tol
        r = self.dev['w'] / 2
        return math.hypot(x - r, y - r) <= r + tol

    def box_inside(self, x0, y0, x1, y1, what, scroll):
        y0 += scroll
        y1 += scroll
        if self.dev['round'] and self.max_scroll:
            # a long page: scrolled until the box is in the middle of the screen, as far as the page goes
            s = min(max((y0 + y1) / 2 - self.dev['h'] / 2, 0), self.max_scroll)
            y0 -= s
            y1 -= s
        if y1 < 0 or y0 > self.dev['h']:
            return  # scrolled out of view; checked when it is on screen
        if not self.dev['round'] and y1 > self.dev['h']:
            return  # page content below the screen scrolls
        for px, py in ((x0, y0), (x1, y0), (x0, y1), (x1, y1)):
            if not self.inside(px, py):
                self.problems.append('outside the screen: ' + what)
                return


def draw_text(d, p, chk, scroll, label, fill=None):
    text = str(p.get('text', ''))
    if not text:
        return
    cjk = is_cjk(text)
    f = font(p.get('text_size', 20), cjk)
    x, y, w, h = p['x'], p['y'] + scroll, p['w'], p['h']
    ascent, descent = f.getmetrics()
    lh = ascent + descent
    if p.get('text_style') == 'wrap':
        lines = wrap(text, f, w, cjk)
        if len(lines) * lh > h + 2:
            chk.problems.append(f'wraps past its box ({len(lines)} lines): "{text[:40]}"')
    else:
        lines = [text]
        if width(text, f) > w + 1:
            chk.problems.append(f'cut with ellipsis: "{text}" ({int(width(text, f))} > {w})')
            while text and width(text + '…', f) > w:
                text = text[:-1]
            lines = [text + '…']
    total = len(lines) * lh
    av = p.get('align_v', 'middle')
    ty = y + (h - total) / 2 if av == 'middle' else (y if av == 'top' else y + h - total)
    for line in lines:
        lw = width(line, f)
        ah = p.get('align_h', 'center')
        tx = x + (w - lw) / 2 if ah == 'center' else (x if ah == 'left' else x + w - lw)
        d.text((tx, ty), line, font=f, fill=rgb(p.get('color', 0xffffff)) if fill is None else fill)
        chk.box_inside(tx, ty - scroll + lh * 0.2, tx + lw, ty - scroll + lh * 0.8, f'text "{line}"', scroll)
        ty += lh


# ---- overlaps -------------------------------------------------------------------------------------

GAP = 4  # px: anything closer than this to something else counts as touching it
RING_GAP = 8  # px: the same for the progress ring and the key tabs
EDGE = 12  # px: buttons closer than this to the edge of a round screen sit under the bezel
CARD_PAD = 14  # px: the shortcut card's content keeps this far from the card's edges (Zepp asks for 16 at full size)
LAYERS = ('FILL_RECT', 'STROKE_RECT', 'BUTTON', 'CIRCLE', 'ARC')


def is_cover(wd):
    """The invisible button over a tappable area (utils/ui.js cover): paints nothing."""
    return wd['type'] == 'BUTTON' and wd['props'].get('normal_src') == 'blank.png'


def name_of(wd):
    p = wd['props']
    t = p.get('text') or p.get('src') or ''
    return f'{wd["type"]} "{t}"' if t else wd['type']


def mask_of(dev, wd, size):
    """Pixels a widget paints (text: its letters, not its box), as a bool array."""
    t, p = wd['type'], wd['props']
    if is_cover(wd):
        return None
    m = Image.new('L', size, 0)
    d = ImageDraw.Draw(m)
    if t in ('FILL_RECT', 'BUTTON'):
        if p['w'] <= 2 and p['h'] <= 2:
            return None
        r = p.get('radius', p['h'] / 2 if t == 'BUTTON' else 0) or 0
        d.rounded_rectangle((p['x'], p['y'], p['x'] + p['w'] - 1, p['y'] + p['h'] - 1), radius=min(r, p['h'] / 2, p['w'] / 2), fill=255)
    elif t == 'STROKE_RECT':
        r = p.get('radius', 0) or 0
        d.rounded_rectangle((p['x'], p['y'], p['x'] + p['w'] - 1, p['y'] + p['h'] - 1), radius=min(r, p['h'] / 2, p['w'] / 2),
                            outline=255, width=int(p.get('line_width', 2)))
    elif t == 'CIRCLE':
        cx, cy, r = p['center_x'], p['center_y'], p['radius']
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    elif t == 'ARC':
        s, e = p['start_angle'], p['end_angle']
        if e - s >= 360:
            d.ellipse((p['x'], p['y'], p['x'] + p['w'], p['y'] + p['h']), outline=255, width=int(p['line_width']))
        elif e > s:
            d.arc((p['x'], p['y'], p['x'] + p['w'], p['y'] + p['h']), s, e, fill=255, width=int(p['line_width']))
    elif t == 'IMG':
        im = asset(p['src'], dev['round'])
        if im is None:
            return None
        m.paste(im.getchannel('A'), (int(p['x']), int(p['y'])))
    elif t == 'TEXT':
        draw_text(d, p, Checker(dev), 0, 'text', fill=255)
    elif t == 'QRCODE':
        x, y, w, h = qr_box(p)
        d.rounded_rectangle((x, y, x + w - 1, y + h - 1), radius=p.get('bg_radius', 0) or 0, fill=255)
    else:
        return None
    a = np.asarray(m) > 100
    return a if a.any() else None


def qr_box(p):
    """The area a QRCODE widget paints: its white background when it has one, else the code itself."""
    if 'bg_w' in p:
        return p['bg_x'], p['bg_y'], p['bg_w'], p['bg_h']
    return p['x'], p['y'], p['w'], p['h']


def draw_qr(canvas, p):
    """A QRCODE widget: a white background and the code in black, scaled to its box (as SaunaPal's)."""
    import segno
    x, y, w, h = qr_box(p)
    ImageDraw.Draw(canvas).rounded_rectangle((x, y, x + w - 1, y + h - 1), radius=p.get('bg_radius', 0) or 0, fill=(255, 255, 255, 255))
    rows = [list(r) for r in segno.make(p['content'], error='m').matrix]
    n = len(rows)
    code = Image.new('L', (n, n), 255)
    code.putdata([0 if v else 255 for r in rows for v in r])
    code = code.resize((int(p['w']), int(p['h'])), Image.NEAREST).convert('RGBA')
    canvas.alpha_composite(code, (int(p['x']), int(p['y'])))


def grow(a, g):
    out = a.copy()
    for dy in range(-g, g + 1):
        for dx in range(-g, g + 1):
            if dx * dx + dy * dy > g * g:
                continue
            out |= np.roll(np.roll(a, dy, axis=0), dx, axis=1)
    return out


def overlaps(dev, shot, size):
    W, H = dev['w'], dev['h']
    items = []
    for wd in shot['widgets']:
        p = wd['props']
        # the page background (and the full-screen alarm color) is under everything on purpose
        if wd['type'] == 'FILL_RECT' and p['x'] <= 0 and p['y'] <= 0 and p['w'] >= W and p['h'] >= H:
            continue
        m = mask_of(dev, wd, size)
        if m is not None:
            ys, xs = np.nonzero(m)
            items.append((wd, m, (xs.min(), ys.min(), xs.max(), ys.max()), int(m.sum())))
    # a label or icon fully on top of shapes (a button, a chip, a held key's fill) is drawn on them on purpose
    layers = np.zeros(size[::-1], bool)
    for wd, m, _, _ in items:
        if wd['type'] in LAYERS:
            layers |= m
    on_layers = [wd['type'] in ('TEXT', 'IMG') and int((m & layers).sum()) >= 0.97 * n for wd, m, _, n in items]
    found = []
    for i in range(len(items)):
        a, ma, ba, na = items[i]
        for j in range(i + 1, len(items)):
            b, mb, bb, nb = items[j]
            g = RING_GAP if 'ARC' in (a['type'], b['type']) else GAP
            if ba[0] > bb[2] + g or bb[0] > ba[2] + g or ba[1] > bb[3] + g or bb[1] > ba[3] + g:
                continue
            both = int((ma & mb).sum())
            # a label on its chip, a progress ring on its track: one fully inside the other is fine
            if both and ((b['type'] in LAYERS and both >= 0.97 * na) or (a['type'] in LAYERS and both >= 0.97 * nb)):
                continue
            if both and ((a['type'] in LAYERS and on_layers[j]) or (b['type'] in LAYERS and on_layers[i])):
                continue
            if both > 3:
                found.append(f'overlap: {name_of(a)} and {name_of(b)} ({both} px)')
            elif not both and (a['type'] != 'TEXT' or b['type'] != 'TEXT') and (grow(ma, g) & mb).any():
                found.append(f'too close (< {g} px): {name_of(a)} and {name_of(b)}')
    card = shot.get('card')
    if card:
        for wd, m, (x0, y0, x1, y1), _ in items:
            p = wd['props']
            if wd['type'] == 'FILL_RECT' and p['x'] == card['x'] and p['y'] == card['y'] and p['w'] == card['w']:
                if p['h'] != card['h']:
                    found.append(f'card background is {p["h"]} px high, the card {card["h"]}')
                continue  # the card's own background
            if x0 < card['x'] + CARD_PAD or y0 < card['y'] + CARD_PAD or x1 > card['x'] + card['w'] - CARD_PAD or y1 > card['y'] + card['h'] - CARD_PAD:
                found.append(f'too close to the card edge (< {CARD_PAD} px): {name_of(wd)}')
    if dev['round'] and not shot.get('scroll'):
        yy, xx = np.mgrid[0:size[1], 0:size[0]]
        near = np.hypot(xx - W / 2, yy - H / 2) > W / 2 - EDGE
        for wd, m, _, _ in items:
            if wd['type'] == 'BUTTON' and wd['props'].get('text') and (m & near).any():
                found.append(f'near the edge (< {EDGE} px): {name_of(wd)}')
    return found


def render_shot(dev, shot):
    W, H = dev['w'], dev['h']
    scroll = shot.get('scroll', 0) or 0
    bottom = H
    for wd in shot['widgets']:
        p = wd['props']
        if 'y' in p and 'h' in p:
            bottom = max(bottom, p['y'] + p['h'])
    tall = bottom > H + 4
    card = shot.get('card')
    if card:
        tall = False  # the card list scrolls; only the card is checked
    canvas = Image.new('RGBA', (W, max(H, bottom) if tall else H), (0, 0, 0, 255))
    d = ImageDraw.Draw(canvas)
    chk = Checker(dev, bottom - H if tall else 0)
    if card:
        # the neighbouring cards of the list, dimmed
        gap = 16
        for y in (card['y'] - gap - card['h'], card['y'] + card['h'] + gap):
            d.rounded_rectangle((card['x'], y, card['x'] + card['w'] - 1, y + card['h'] - 1), radius=card['radius'], fill=(24, 24, 24, 255))
        # the card's own background, drawn by the watch (its real color varies with the system theme)
        d.rounded_rectangle((card['x'], card['y'], card['x'] + card['w'] - 1, card['y'] + card['h'] - 1), radius=card['radius'],
                            fill=(40, 40, 40, 255))
    for wd in shot['widgets']:
        t, p = wd['type'], wd['props']
        if t == 'FILL_RECT':
            r = p.get('radius', 0) or 0
            d.rounded_rectangle((p['x'], p['y'], p['x'] + p['w'] - 1, p['y'] + p['h'] - 1), radius=min(r, p['h'] / 2, p['w'] / 2),
                                fill=rgb(p.get('color')))
        elif t == 'STROKE_RECT':
            r = p.get('radius', 0) or 0
            d.rounded_rectangle((p['x'], p['y'], p['x'] + p['w'] - 1, p['y'] + p['h'] - 1), radius=min(r, p['h'] / 2, p['w'] / 2),
                                outline=rgb(p.get('color')), width=int(p.get('line_width', 2)))
        elif t == 'CIRCLE':
            cx, cy, r = p['center_x'], p['center_y'], p['radius']
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgb(p.get('color')))
        elif t == 'ARC':
            s, e = p['start_angle'], p['end_angle']
            if e - s >= 360:
                d.ellipse((p['x'], p['y'], p['x'] + p['w'], p['y'] + p['h']), outline=rgb(p['color']), width=int(p['line_width']))
            elif e > s:
                d.arc((p['x'], p['y'], p['x'] + p['w'], p['y'] + p['h']), s, e, fill=rgb(p['color']), width=int(p['line_width']))
        elif t == 'IMG':
            im = asset(p['src'], dev['round'])
            if im is None:
                chk.problems.append('missing image ' + p['src'])
            else:
                canvas.alpha_composite(im, (int(p['x']), int(p['y'])))
        elif t == 'TEXT':
            draw_text(d, p, chk, 0, 'text')
        elif t == 'QRCODE':
            draw_qr(canvas, p)
            chk.box_inside(*(lambda b: (b[0], b[1], b[0] + b[2], b[1] + b[3]))(qr_box(p)), 'qr code', scroll)
        elif t == 'BUTTON' and not is_cover(wd):
            r = p.get('radius', p['h'] / 2)
            d.rounded_rectangle((p['x'], p['y'], p['x'] + p['w'] - 1, p['y'] + p['h'] - 1), radius=min(r, p['h'] / 2, p['w'] / 2),
                                fill=rgb(p.get('normal_color')))
            hr = min(r, p['h'] / 2)
            # a button without a label is the tap area of a list row: its texts are checked instead
            if p.get('text'):
                chk.box_inside(p['x'] + hr * 0.3, p['y'], p['x'] + p['w'] - hr * 0.3, p['y'] + p['h'],
                               f'button "{p.get("text", "")}"', scroll)
            draw_text(d, {**p, 'align_h': 'center', 'align_v': 'middle'}, chk, 0, 'button')
    # the screen as seen at the current scroll position
    view = canvas.crop((0, -scroll, W, -scroll + H)) if tall or scroll else canvas.copy()
    if view.size[1] < H:
        pad = Image.new('RGBA', (W, H), (0, 0, 0, 255))
        pad.paste(view, (0, 0))
        view = pad
    frame = Image.new('RGBA', (W, H), (60, 60, 60, 255))
    mask = Image.new('L', (W, H), 0)
    md = ImageDraw.Draw(mask)
    if dev['round']:
        md.ellipse((0, 0, W - 1, H - 1), fill=255)
    else:
        md.rounded_rectangle((0, 0, W - 1, H - 1), radius=int(W * 0.12), fill=255)
    frame.paste(view, (0, 0), mask)
    chk.problems += overlaps(dev, shot, canvas.size)
    return frame, (canvas if tall else None), sorted(set(chk.problems))


def sheet(path, scale):
    data = json.load(open(path))
    dev = data['device']
    W, H = dev['w'], dev['h']
    cols = 5
    cells = []
    report = []
    for shot in data['shots']:
        frame, tall, problems = render_shot(dev, shot)
        cells.append((shot['label'], frame, tall))
        for p in problems + shot.get('warnings', []):
            report.append(f"{dev['name']} | {shot['label']} | {p}")
    cw, ch = int(W * scale), int(H * scale)
    lab = 34
    rows = math.ceil(len(cells) / cols)
    out = Image.new('RGB', (cols * (cw + 16) + 16, rows * (ch + lab + 16) + 16), (235, 235, 235))
    d = ImageDraw.Draw(out)
    for i, (label, frame, tall) in enumerate(cells):
        x = 16 + (i % cols) * (cw + 16)
        y = 16 + (i // cols) * (ch + lab + 16)
        out.paste(frame.resize((cw, ch), Image.LANCZOS).convert('RGB'), (x, y))
        d.text((x, y + ch + 6), f'{i + 1}. {label}', font=font(15), fill=(30, 30, 30))
    base = os.path.splitext(path)[0]
    out.save(base + '.png')
    # long pages (lists) in full
    talls = [(label, tall) for label, _, tall in cells if tall is not None]
    if talls:
        th = max(t.size[1] for _, t in talls)
        tw = int(W * scale)
        strip = Image.new('RGB', (len(talls) * (tw + 16) + 16, int(th * scale) + lab + 32), (235, 235, 235))
        sd = ImageDraw.Draw(strip)
        for i, (label, t) in enumerate(talls):
            x = 16 + i * (tw + 16)
            img = t.resize((tw, int(t.size[1] * scale)), Image.LANCZOS).convert('RGB')
            strip.paste(img, (x, 16))
            sd.line((x, 16 + ch, x + tw, 16 + ch), fill=(255, 0, 0), width=1)
            sd.text((x, 16 + img.size[1] + 6), label, font=font(15), fill=(30, 30, 30))
        strip.save(base + '-lists.png')
    return report


def main():
    out = sys.argv[1]
    scale = float(sys.argv[2]) if len(sys.argv) > 2 else 0.6
    report = []
    for path in sorted(glob.glob(os.path.join(out, '*.json'))):
        report += sheet(path, scale)
    with open(os.path.join(out, 'problems.txt'), 'w') as f:
        f.write('\n'.join(report) + '\n')
    print(f'{len(report)} layout problems' + (' (see problems.txt)' if report else ''))


if __name__ == '__main__':
    main()
