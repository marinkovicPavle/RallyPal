# Store pictures for the Zepp console (phase 7), drawn from the simulator's screens (npm run sim first):
#   docs/store/icon-240.png                    the app icon, 240 x 240, transparent around the circle
#   docs/store/screenshots/<NN-lang>/round/N-name.png   360 x 360, transparent outside the round screen
#   docs/store/screenshots/<NN-lang>/square/N-name.png  360 x 360, the square screen scaled in, transparent around it
#   (one set per language, the folders named as the texts in docs/store/text)
#   docs/store/kiezelpay-logo.png              the app icon, 512 x 512, for the KiezelPay product (as SaunaPal)
# Usage: python3 .dev/tools/store.py [sim-out-dir]

import json
import os
import sys

from PIL import Image, ImageDraw

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.abspath(os.path.join(here, '..', '..'))
sys.path.insert(0, os.path.join(here, 'sim'))
import render  # noqa: E402

OUT = os.path.join(root, 'docs', 'store')
SIM = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, 'sim', 'out')
SIZE = 360

# the match first (most people only see the first two or three), then the six sports, the summary,
# the pickleball call and the history
SHOTS = [
    ('1-match', 'Match, break point'),
    ('2-sports', 'Match setups'),
    ('3-padel', 'Padel, star point'),
    ('4-summary', 'Summary, won'),
    ('5-pickleball', 'Pickleball, score call'),
    ('6-history', 'History')
]
LANGS = [('en', '01-en-English'), ('sr', '02-sr-Serbian'), ('es', '03-es-Spanish'), ('it', '04-it-Italian'),
         ('de', '05-de-German'), ('fr', '06-fr-French'), ('pt', '07-pt-Portuguese'), ('nl', '08-nl-Dutch'),
         ('pl', '09-pl-Polish'), ('cs', '10-cs-Czech'), ('uk', '11-uk-Ukrainian'), ('ru', '12-ru-Russian'),
         ('sv', '13-sv-Swedish'), ('nb', '14-nb-Norwegian'), ('da', '15-da-Danish'), ('fi', '16-fi-Finnish'),
         ('ja', '17-ja-Japanese')]


def cut(dev, shot):
    frame, _, _ = render.render_shot(dev, shot)
    W, H = dev['w'], dev['h']
    mask = Image.new('L', (W, H), 0)
    md = ImageDraw.Draw(mask)
    if dev['round']:
        md.ellipse((0, 0, W - 1, H - 1), fill=255)
    else:
        md.rounded_rectangle((0, 0, W - 1, H - 1), radius=int(W * 0.12), fill=255)
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    out.paste(frame, (0, 0), mask)
    if (W, H) == (SIZE, SIZE):
        return out
    scale = SIZE / max(W, H)
    small = out.resize((round(W * scale), round(H * scale)), Image.LANCZOS)
    canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    canvas.paste(small, ((SIZE - small.width) // 2, (SIZE - small.height) // 2), small)
    return canvas


def main():
    os.makedirs(OUT, exist_ok=True)
    icon = Image.open(os.path.join(here, 'icon-1024.png')).convert('RGBA').resize((240, 240), Image.LANCZOS)
    icon.save(os.path.join(OUT, 'icon-240.png'))
    Image.open(os.path.join(here, 'icon-1024.png')).convert('RGBA').resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'kiezelpay-logo.png'))
    for kind, device in (('round', 'round360'), ('square', 'sq390x450')):
        data = json.load(open(os.path.join(SIM, device + '.json')))
        by = {s['label']: s for s in data['shots']}
        for lang, lang_folder in LANGS:
            folder = os.path.join(OUT, 'screenshots', lang_folder, kind)
            os.makedirs(folder, exist_ok=True)
            for name, label in SHOTS:
                key = f'{lang} · {label}'
                if key not in by:
                    raise SystemExit(f'{device}: no screen "{key}" (run npm run sim first)')
                cut(data['device'], by[key]).save(os.path.join(folder, name + '.png'))
    print('written to', OUT)


if __name__ == '__main__':
    main()
