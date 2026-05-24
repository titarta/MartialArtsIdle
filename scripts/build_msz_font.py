"""
build_msz_font.py
=================

Regenerates `src/assets/fonts/ma-shan-zheng-common.woff2` with a precise
subset of the Ma Shan Zheng brush-calligraphy font: only the Chinese
glyphs the codebase actually renders.

Why: the previous bundled woff2 was a "common Chinese" subset Google
Fonts produces by hand-picking ~200 frequent glyphs. Many glyphs the
codebase wanted (such as the chapter 命) were not in that pick, so
browsers silently fell back to a system serif and the brush style
turned into squareish printed strokes. This script subsets the full
font ourselves so coverage matches usage exactly. The output is small
(under 10 KB) because brush calligraphy glyphs compress tightly under
brotli when there are few of them.

Usage:
    python scripts/build_msz_font.py

If you add a new Chinese glyph anywhere that uses the Ma Shan Zheng
font stack, add it to CHARS below and re-run.

Requires: fonttools, brotli (pip install fonttools brotli).
"""

from __future__ import annotations

import os
import sys
import tempfile
import urllib.request
from pathlib import Path

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

# Canonical Chinese glyph set rendered with Ma Shan Zheng anywhere in
# the app. Add new entries here when you introduce more brush glyphs.
#
#   命 元 圣 归 虚 道 天          : journey chapter glyphs (data/realms.js CHAPTERS)
#   体 气 元 分 仙 圣 王 归 源 虚 道 帝 天 半 : realm name glyphs (JourneyBody.jsx REALM_GLYPHS)
#   玉 道                          : spark seal fallbacks (QiSparkChoiceModal.jsx)
#   灵 神                          : reserved for future plaque variants
#   凰 龍 玄                       : legendary spark per-card seal glyphs
CHARS = sorted(set(
    "命元圣归虚道天"             # chapter glyphs
    + "体气分仙王源帝半"           # realm glyphs not already covered
    + "玉"                          # uncommon seal fallback
    + "灵神"                        # future plaques
    + "凰龍玄"                      # legendary seal per-spark variants
))

# Google Fonts hosts the unsubsetted TTF for non-browser User-Agents.
# Cached locally between runs to avoid hitting the network repeatedly.
MSZ_TTF_URL = (
    "https://fonts.gstatic.com/s/mashanzheng/v17/"
    "NaPecZTRCLxvwo41b4gvzkXaRMQ.ttf"
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = PROJECT_ROOT / "src" / "assets" / "fonts" / "ma-shan-zheng-common.woff2"
CACHE_TTF = Path(tempfile.gettempdir()) / "ma-shan-zheng-full.ttf"


def fetch_ttf() -> Path:
    if CACHE_TTF.exists() and CACHE_TTF.stat().st_size > 1_000_000:
        return CACHE_TTF
    print(f"Downloading {MSZ_TTF_URL}")
    req = urllib.request.Request(
        MSZ_TTF_URL,
        headers={"User-Agent": "Mozilla/5.0"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        CACHE_TTF.write_bytes(resp.read())
    print(f"Cached {CACHE_TTF} ({CACHE_TTF.stat().st_size} bytes)")
    return CACHE_TTF


def main() -> int:
    if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    src = fetch_ttf()
    print(f"Subsetting to {len(CHARS)} chars: {''.join(CHARS)}")

    font = TTFont(str(src))
    opts = Options()
    opts.flavor = "woff2"
    opts.with_zopfli = False  # brotli default is already aggressive
    opts.hinting = False
    opts.desubroutinize = False
    opts.layout_features = []  # we render one glyph at a time, no OpenType layout needed

    sub = Subsetter(options=opts)
    sub.populate(text="".join(CHARS))
    sub.subset(font)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    font.flavor = "woff2"
    font.save(str(OUT_PATH))
    print(f"Wrote {OUT_PATH.relative_to(PROJECT_ROOT)} ({OUT_PATH.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
