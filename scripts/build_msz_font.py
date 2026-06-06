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
#   突 印                          : breakthrough button Ceremonial Edict
#                                    (HomeScreen.jsx - watermark + seal stamp)
#   脉 一 二 三 四 五 六 七        : Tracing Meridians minigame
#                                    (HomeScreen.jsx PatternClickOverlay -
#                                     title "气脉" + numerals 1-7 on the
#                                     acupressure nodes; 气 + 印 already
#                                     covered by realm-glyphs + BT button)
CHARS = sorted(set(
    "命元圣归虚道天"             # chapter glyphs
    + "体气分仙王源帝半"           # realm glyphs not already covered
    + "玉"                          # uncommon seal fallback
    + "灵神"                        # future plaques
    + "凰龍玄"                      # legendary seal per-spark variants
    + "突印"                        # BT button: 突 watermark + 印 seal stamp
    + "脉一二三四五六七"            # Tracing Meridians: title 脉 + numerals 1-7
    # 2026-05-29 coverage fix: glyphs rendered with the Ma Shan Zheng stack
    # that were missing from the subset, so they fell back to a system serif.
    + "市"                          # Spirit Bazaar watermark + blood-lotus achievement
    + "关宗弟念符"                  # tutorial card glyphs (TutorialModal)
    + "封眠舍"                      # achievement plaque seals (AchievementPlaque)
    + "失蓮"                        # Blood Lotus shop glyphs
    + "時解賞"                      # toast / event glyphs (App.jsx)
    + "山"                          # notification glyph (useNotifications)
    + "修境无止行收时"             # About screen + Offline-earnings modal glyphs
    + "丹兵兽盾矛祖苗虛香鳳昇壁憩戰徵火練群銳閉風鼓"  # producer minigames + disciple army
    # 2026-06-04 coverage fix: Eternal Tree real nodes + placeholders +
    # reincarnate button glyph. Without these, 21 of the 25 tree nodes
    # fell through to system serif, producing the "some characters look
    # rounder than others" artefact (Windows OS pulls SimSun for some,
    # YaHei for others, char by char, when nothing in the fallback stack
    # is installed).
    + "星晶眼儉響長"               # real tree node glyphs (n_2..n_7; n_1=道 already covered)
    + "筋岩瞳勇靜魂雙雷霧辰永冕"   # tree placeholder preview glyphs
    + "輪"                          # reincarnate footer button glyph (wheel of rebirth)
    # 2026-06-05 Eternal Tree redesign (28-node single-root tree): node glyphs
    # introduced by the reincarnation respec. (The placeholder glyphs above are
    # now unused but harmless to keep bundled.)
    + "升育超施萬露留沃藝紋髓承庫韻守福基"  # new Eternal Tree node glyphs
))

# Google Fonts hosts the unsubsetted TTF for non-browser User-Agents.
# Cached locally between runs to avoid hitting the network repeatedly.
MSZ_TTF_URL = (
    "https://fonts.gstatic.com/s/mashanzheng/v17/"
    "NaPecZTRCLxvwo41b4gvzkXaRMQ.ttf"
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = PROJECT_ROOT / "src" / "assets" / "fonts" / "ma-shan-zheng-common.woff2"
# Manifest sibling so JS code can detect at render time whether a given
# glyph is in the bundled subset. The build script is the SINGLE source
# of truth: regenerating the woff2 also regenerates the manifest, so the
# runtime check can never drift from the bundle. Consumed by
# src/utils/glyphCoverage.js.
MANIFEST_PATH = PROJECT_ROOT / "src" / "assets" / "fonts" / "ma-shan-zheng-subset.generated.json"
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

    # Emit the JSON manifest the runtime glyph-coverage check reads. UTF-8
    # without BOM (global file-encoding rule). Sorted for stable diffs.
    import json
    manifest = {"glyphs": sorted(CHARS), "count": len(CHARS)}
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {MANIFEST_PATH.relative_to(PROJECT_ROOT)} ({len(CHARS)} glyphs)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
