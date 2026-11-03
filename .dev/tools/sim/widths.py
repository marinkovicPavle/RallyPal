"""Measures the characters RallyPal can show, for the simulator's text widths (zos.js) to match what
render.py draws: Inter Medium, and for a text with a character Inter doesn't have (Japanese) the IPA
Gothic font for the whole text (from SaunaPal). Run again after the texts change.

Usage: python3 .dev/tools/sim/widths.py   (writes .dev/tools/sim/inter-widths.json)
"""
import glob
import json
import os

from PIL import ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..', '..')
INTER = '/usr/share/fonts/opentype/inter/Inter-Medium.otf'
CJK = '/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf'

inter = ImageFont.truetype(INTER, 1000)
cjk = ImageFont.truetype(CJK, 1000)
# a character the font doesn't have is drawn as its "missing" box
MISSING = (inter.getlength('\U0010fffd'), bytes(inter.getmask('\U0010fffd')))


def has(c):
    return (inter.getlength(c), bytes(inter.getmask(c))) != MISSING


chars = set(chr(i) for i in range(32, 127))
chars |= set('°·×÷–—…←↑→↓−✓ÄÅÖÜßàäåçèéñöüĆćČčĐđŠšŽž')
# every character of the texts (the whole files: the code around them adds nothing new)
for path in glob.glob(os.path.join(ROOT, 'shared', 'lang', '*.js')) + glob.glob(os.path.join(ROOT, 'setting', 'lang', '*.js')) + \
        [os.path.join(ROOT, 'setting', 'text.js')]:
    if os.path.exists(path):
        chars |= set(open(path, encoding='utf-8').read())
chars -= {'\n', '\r', '\t'}

out = {
    'inter': {c: round(inter.getlength(c)) for c in sorted(chars) if has(c)},
    'cjk': {c: round(cjk.getlength(c)) for c in sorted(chars)},
}
json.dump(out, open(os.path.join(HERE, 'inter-widths.json'), 'w', encoding='utf-8'), ensure_ascii=False)
missing = sorted(c for c in chars if not has(c))
print(f"{len(out['inter'])} characters in Inter, {len(missing)} only in the CJK font")
