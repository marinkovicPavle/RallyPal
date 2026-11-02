"""Draws the watch assets: app icon (A, ball in flight, from icon-1024.png), the shortcut card icon, the
heart, the chip caret, the History and Settings icons and the serve marker of each sport (decision 23).

Usage: python3 .dev/tools/assets.py   (writes assets/common.r and assets/common.s, and setting/markers.js:
the same markers for the phone settings page, as images inside the code)
"""
import base64
import io
import math
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
S = 8  # supersampling
HEART = (255, 69, 90)
WHITE = (255, 255, 255)

# serve marker sizes in pixels; a screen picks the one nearest to its scaled design size (utils/ui.js)
MARKER_SIZES = (16, 20, 24, 28)
SPORTS = ('tennis', 'padel', 'pickleball', 'tabletennis', 'squash', 'badminton')


def heart(w):
    img = Image.new('RGBA', (w * S, w * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = w * S / 4
    for cx in (r, 3 * r):
        d.ellipse((cx - r, 0, cx + r, 2 * r), fill=HEART)
    d.polygon([(0, r * 1.1), (4 * r, r * 1.1), (2 * r, 3.7 * r)], fill=HEART)
    out = img.resize((w, w), Image.LANCZOS)
    return out.crop((0, 0, w, int(w * 0.94)))


def caret(w, h):
    img = Image.new('RGBA', (w * S, h * S), (0, 0, 0, 0))
    ImageDraw.Draw(img).polygon([(0, 0), (w * S, 0), (w * S / 2, h * S)], fill=WHITE)
    return img.resize((w, h), Image.LANCZOS)


def history_icon(w):
    """A clock face, as on the approved drawing (nacrt2.py icon_history)."""
    n = w * S
    img = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    lw = max(2 * S, round(n / 11))
    c = n / 2
    r = n / 2 - lw / 2 - S
    d.ellipse((c - r, c - r, c + r, c + r), outline=WHITE, width=lw)
    d.line((c, c, c, c - r * 0.6), fill=WHITE, width=lw)
    d.line((c, c, c + r * 0.45, c + r * 0.2), fill=WHITE, width=lw)
    for x, y in ((c, c), (c, c - r * 0.6), (c + r * 0.45, c + r * 0.2)):
        d.ellipse((x - lw / 2, y - lw / 2, x + lw / 2, y + lw / 2), fill=WHITE)
    return img.resize((w, w), Image.LANCZOS)


def settings_icon(w):
    """A gear: eight round teeth around a disc with a hole (nacrt2.py icon_gear)."""
    n = w * S
    img = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = n / 2
    r = n / 2 / 1.25
    for k in range(8):
        a = math.radians(k * 45)
        x, y = c + math.cos(a) * r * 0.95, c + math.sin(a) * r * 0.95
        t = r * 0.28
        d.ellipse((x - t, y - t, x + t, y + t), fill=WHITE)
    d.ellipse((c - r * 0.8, c - r * 0.8, c + r * 0.8, c + r * 0.8), fill=WHITE)
    h = r * 0.35
    d.ellipse((c - h, c - h, c + h, c + h), fill=(0, 0, 0, 0))
    return img.resize((w, w), Image.LANCZOS)


# ---- serve markers, drawn like nacrt.py serve_marker on a transparent background ------------------

def ball(d, x, y, r, fill, seam):
    d.ellipse((x - r, y - r, x + r, y + r), fill=fill)
    w = max(2, int(r * 0.22))
    d.arc((x - r * 1.5, y - r, x - r * 0.25, y + r), -60, 60, fill=seam, width=w)
    d.arc((x + r * 0.25, y - r, x + r * 1.5, y + r), 120, 240, fill=seam, width=w)


def marker_layer(sport, r):
    """One marker of radius r (in supersampled pixels) centered on a 4r canvas."""
    n = int(4 * r)
    img = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x = y = n / 2
    if sport in ('tennis', 'padel'):
        # padel balls look like tennis balls; a warmer yellow tells them apart
        ball(d, x, y, r, (212, 240, 43) if sport == 'tennis' else (255, 214, 10), WHITE)
        # the seam arcs reach past the ball: keep only what is on the ball
        mask = Image.new('L', (n, n), 0)
        ImageDraw.Draw(mask).ellipse((x - r, y - r, x + r, y + r), fill=255)
        out = Image.new('RGBA', (n, n), (0, 0, 0, 0))
        out.paste(img, (0, 0), mask)
        return out
    if sport == 'pickleball':
        d.ellipse((x - r, y - r, x + r, y + r), fill=(236, 232, 40))
        for dx, dy in ((0, 0), (-0.5, -0.45), (0.5, -0.45), (-0.5, 0.45), (0.5, 0.45)):
            h = r * 0.17
            cx, cy = x + dx * r, y + dy * r
            d.ellipse((cx - h, cy - h, cx + h, cy + h), fill=(110, 110, 0))
    elif sport == 'tabletennis':
        h = r * 0.85
        d.ellipse((x - h, y - h, x + h, y + h), fill=(250, 250, 250))
    elif sport == 'squash':
        h = r * 0.85
        d.ellipse((x - h, y - h, x + h, y + h), fill=(45, 45, 45), outline=(160, 160, 160), width=max(1, round(r / 8)))
        for dx in (-0.25, 0.25):
            t = r * 0.16
            cx, cy = x + dx * r, y - r * 0.32
            d.ellipse((cx - t, cy - t, cx + t, cy + t), fill=(255, 214, 10))
    else:
        # shuttlecock pointing up-right: cork at the bottom left, feather skirt to the top right
        r *= 0.85
        x, y = x - r * 0.35, y + r * 0.2
        ux, uy, wx, wy = 0.707, -0.707, 0.707, 0.707
        cx, cy = x - ux * r * 0.6, y - uy * r * 0.6

        def at(a, b):
            return (cx + ux * a * r + wx * b * r, cy + uy * a * r + wy * b * r)

        d.polygon([at(0.15, -0.32), at(0.15, 0.32), at(1.75, 0.8), at(1.75, -0.8)], fill=WHITE)
        for b in (-0.4, 0, 0.4):
            d.line([at(0.2, b * 0.35), at(1.7, b)], fill=(170, 170, 170), width=max(1, round(r / 10)))
        h = r * 0.42
        d.ellipse((cx - h, cy - h, cx + h, cy + h), fill=(236, 206, 160))
    return img


def markers(sizes=MARKER_SIZES):
    """Every sport's marker at every size; one shared frame so the balls keep their relative sizes."""
    r = 64 * S / 4
    layers = {s: marker_layer(s, r) for s in SPORTS}
    boxes = [lay.getbbox() for lay in layers.values()]
    x0, y0 = min(b[0] for b in boxes), min(b[1] for b in boxes)
    x1, y1 = max(b[2] for b in boxes), max(b[3] for b in boxes)
    n = layers['tennis'].size[0]
    c = n / 2
    half = max(c - x0, x1 - c, c - y0, y1 - c)
    frame = (c - half, c - half, c + half, c + half)
    out = {}
    for s, lay in layers.items():
        crop = lay.crop(tuple(int(round(v)) for v in frame))
        for px in sizes:
            out[(s, px)] = crop.resize((px, px), Image.LANCZOS)
    return out


def main():
    src = Image.open(os.path.join(HERE, 'icon-1024.png')).convert('RGBA')
    mk = markers()
    for shape in ('r', 's'):
        k = 1 if shape == 'r' else 0.86
        folder = os.path.join(ROOT, 'assets', 'common.' + shape)
        os.makedirs(folder, exist_ok=True)
        src.resize((248, 248), Image.LANCZOS).save(os.path.join(folder, 'icon.png'))
        # the invisible button laid over tappable rows, chips and the card (utils/ui.js cover)
        Image.new('RGBA', (8, 8), (0, 0, 0, 0)).save(os.path.join(folder, 'blank.png'))
        # the shortcut card's icon (a smaller file on small screens: images are not scaled)
        cs, small = (32, 26) if shape == 'r' else (28, 24)
        src.resize((cs, cs), Image.LANCZOS).save(os.path.join(folder, 'icon-card.png'))
        src.resize((small, small), Image.LANCZOS).save(os.path.join(folder, 'icon-card-small.png'))
        heart(22 if shape == 'r' else 20).save(os.path.join(folder, 'heart.png'))
        caret(int(14 * k), int(9 * k)).save(os.path.join(folder, 'caret.png'))
        iw = 26 if shape == 'r' else 24
        history_icon(iw).save(os.path.join(folder, 'history.png'))
        settings_icon(iw).save(os.path.join(folder, 'settings.png'))
        for (sport, px), im in mk.items():
            im.save(os.path.join(folder, f'srv-{sport}-{px}.png'))
    # the phone page (Zepp settings) gets the markers as data URIs; drawn at 64 px for sharp phone screens
    lines = ['// Made by .dev/tools/assets.py: the serve marker of each sport, as on the watch, for the phone page.', 'export const MARKERS = {']
    for (sport, px), im in markers((64,)).items():
        buf = io.BytesIO()
        im.save(buf, 'PNG', optimize=True)
        lines.append(f"  {sport}: 'data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}',")
    lines.append('}')
    os.makedirs(os.path.join(ROOT, 'setting'), exist_ok=True)
    with open(os.path.join(ROOT, 'setting', 'markers.js'), 'w') as f:
        f.write('\n'.join(lines) + '\n')
    print('assets written')


if __name__ == '__main__':
    main()
