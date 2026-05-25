"""
Build a custom Ma Shan Zheng woff2 covering exactly the Chinese characters
the game uses. Solves the bug where the previous bundle had only 20 chars,
causing 市/印/封/凤/龙/etc to silently fall through to system serif.

Strategy:
  1. Parse the Google Fonts CSS for Ma Shan Zheng (each @font-face block
     has a unicode-range listing the chars in that subset chunk).
  2. For each char the game needs, find the chunk whose unicode-range
     covers it.
  3. Download each needed chunk's woff2.
  4. Merge them into one TTF, subset to ONLY the chars we need, then
     write back out as woff2.

Output: src/assets/fonts/ma-shan-zheng-common.woff2 (replaces the old file).
"""
import os, re, sys, subprocess, urllib.request, urllib.error, tempfile
sys.stdout.reconfigure(encoding='utf-8')

from fontTools.ttLib import TTFont
from fontTools.merge import Merger
from fontTools.subset import Subsetter, Options as SubsetOptions

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS_URL = 'https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
OUT_WOFF2 = os.path.join(ROOT, 'src', 'assets', 'fonts', 'ma-shan-zheng-common.woff2')

def fetch(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req) as r:
        return r.read() if binary else r.read().decode('utf-8')

def parse_unicode_range(s):
    """Parse a unicode-range string like 'U+5E02, U+4E00-4E03' into a set of codepoints."""
    out = set()
    for tok in s.split(','):
        tok = tok.strip().replace('U+', '')
        if '-' in tok:
            a, b = tok.split('-')
            for cp in range(int(a, 16), int(b, 16) + 1):
                out.add(cp)
        elif tok:
            out.add(int(tok, 16))
    return out

def parse_css(css):
    """Yield (src_url, codepoints_set) for each @font-face block."""
    blocks = re.findall(r'@font-face\s*\{([^}]*)\}', css)
    for body in blocks:
        url_m = re.search(r'src:\s*url\((https?://[^)]+\.woff2)\)', body)
        ur_m  = re.search(r'unicode-range:\s*([^;]+);', body)
        if not (url_m and ur_m):
            continue
        yield url_m.group(1), parse_unicode_range(ur_m.group(1))

def main():
    needed_chars = sys.argv[1]
    needed = {ord(ch) for ch in needed_chars}
    print(f'Need {len(needed)} chars: {needed_chars}')

    print(f'Fetching CSS from {CSS_URL} ...')
    css = fetch(CSS_URL)
    chunks = list(parse_css(css))
    print(f'Parsed {len(chunks)} font chunks')

    # For each chunk, see which of our needed chars it covers
    covered_by_chunk = {}
    covered_total = set()
    for url, cps in chunks:
        common = cps & needed
        if common:
            covered_by_chunk[url] = common
            covered_total |= common

    missing = needed - covered_total
    if missing:
        print(f'WARN: {len(missing)} chars not found in any chunk: {"".join(chr(c) for c in missing)}')
    else:
        print(f'All {len(needed)} chars covered by {len(covered_by_chunk)} chunks')

    # Download each needed chunk
    tmpdir = tempfile.mkdtemp(prefix='msz_')
    chunk_files = []
    for i, (url, common) in enumerate(covered_by_chunk.items()):
        print(f'[{i+1}/{len(covered_by_chunk)}] downloading chunk covering {len(common)} of our chars ({"".join(sorted(chr(c) for c in common))[:30]}...)')
        data = fetch(url, binary=True)
        p = os.path.join(tmpdir, f'chunk_{i}.woff2')
        with open(p, 'wb') as f: f.write(data)
        chunk_files.append(p)

    # Each chunk is already a TTF wrapped in woff2. Open them all and merge.
    # fontTools Merger handles glyph dedup + cmap union.
    print(f'Merging {len(chunk_files)} chunks ...')
    if len(chunk_files) == 1:
        merged = TTFont(chunk_files[0])
    else:
        merger = Merger()
        merged = merger.merge(chunk_files)

    # Subset the merged font down to ONLY the chars we need — keeps the file
    # tiny while retaining the brush calligraphy glyphs.
    print(f'Subsetting to {len(needed)} chars ...')
    opts = SubsetOptions()
    opts.flavor = 'woff2'
    opts.layout_features = '*'
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    opts.recalc_bounds = True
    opts.drop_tables = []
    subsetter = Subsetter(options=opts)
    subsetter.populate(unicodes=list(needed))
    subsetter.subset(merged)

    # Write final woff2
    merged.flavor = 'woff2'
    merged.save(OUT_WOFF2)
    size = os.path.getsize(OUT_WOFF2)
    print(f'Wrote {OUT_WOFF2} ({size:,} bytes)')

    # Verify by reopening + checking cmap
    f = TTFont(OUT_WOFF2)
    cmap = f.getBestCmap()
    have = [chr(c) for c in needed if c in cmap]
    miss = [chr(c) for c in needed if c not in cmap]
    print(f'Final bundle covers {len(have)}/{len(needed)} requested chars')
    if miss:
        print(f'  STILL MISSING: {"".join(miss)}')
    else:
        print(f'  All requested chars in final bundle.')

if __name__ == '__main__':
    main()
