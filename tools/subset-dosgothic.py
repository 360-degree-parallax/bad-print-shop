"""Subset DOSGothic (MIT, Damheo Lee) to the characters the page can show.
Run after regenerating content-gen.js:  python3 tools/subset-dosgothic.py /path/to/DOSGothic.ttf
The degraded copies are deterministic, so every syllable they can produce is already in the files."""
import sys
from fontTools import subset
from fontTools.ttLib import TTFont
src = sys.argv[1]
chars = set()
for f in ['content.js', 'content-gen.js', 'wiki.js', 'app.js', 'index.html']:
    chars |= set(open(f, encoding='utf8').read())
chars |= set(chr(c) for c in range(0x20, 0x7f))
cmap = TTFont(src).getBestCmap()
opts = subset.Options(); opts.flavor = 'woff'; opts.hinting = False; opts.desubroutinize = True
font = subset.load_font(src, opts)
s = subset.Subsetter(opts); s.populate(unicodes=[ord(c) for c in chars if ord(c) in cmap]); s.subset(font)
subset.save_font(font, 'assets/DOSGothic-subset.woff', opts)
print('glyphs', len([c for c in chars if ord(c) in cmap]))
