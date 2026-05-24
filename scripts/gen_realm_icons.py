"""
gen_realm_icons.py — Progressive realm badge pipeline for MartialArtsIdle.

Generates 13 cultivation realm badges at 128×128 as a CHAIN — each tier's
generation uses the previous tier's finalized PNG as `style_image` and
`reference_images`, so the badge form, palette, and ornament continuity
are preserved by the API itself, not just by prompt language.

Mirrors the proven `gen_crystals.py` pattern (locked → tier_1 → ... → tier_10).

WORKFLOW (per realm — 2 steps each):
  1. Generate candidates (auto-uses previous tier as reference):
       python gen_realm_icons.py generate <realm_id>
       → 4 candidates → tmp/realm_icon_gen/<realm_id>_cand_N.png
       → review the 4, pick best

  2. Finalize chosen candidate:
       python gen_realm_icons.py finalize <realm_id> <cand_n>
       → crops + writes to public/ui/realms/<realm_id>.png

  Batch all 13 in order (still need to pick best per tier; this just
  fires sequential generates — caller still finalizes each):
       python gen_realm_icons.py generate-all

  Preview a prompt without spending credits:
       python gen_realm_icons.py prompt <realm_id>

DESIGN — progressive additive escalation:
  Each tier KEEPS the prior tier's ornaments and ADDS new symbolism that
  maps to the realm's name. Rim color shifts on band transitions:
    bronze (T1-3) → silver (T4-5) → gold (T6-9) → platinum (T10-12)
    → radiant gold (T13)
  At T10 the jade FIELD transforms into violet-black VOID (first format
  break). Subsequent tiers layer ornament onto the void.

REALM ORDER (chain reference order):
   1. tempered_body          8. origin_returning
   2. qi_transformation      9. origin_king
   3. true_element          10. void_king
   4. separation_reunion    11. dao_source
   5. immortal_ascension    12. emperor_realm
   6. saint                 13. open_heaven
   7. saint_king

DEPENDENCIES:
  pip install Pillow
"""

import json, base64, time, sys
from pathlib import Path
import urllib.request, urllib.error
from PIL import Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

API_KEY  = "886d28c4-fb31-429d-832e-1242e312160e"
BASE_URL = "https://api.pixellab.ai/v2"
OUT_DIR  = Path(__file__).parent.parent / "public/ui/realms"
TMP_DIR  = Path(__file__).parent.parent / "tmp/realm_icon_gen"
OUT_DIR.mkdir(parents=True, exist_ok=True)
TMP_DIR.mkdir(parents=True, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# HTTP helpers
# ─────────────────────────────────────────────────────────────────────────────

def _headers():
    return {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

def api_post(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(f"{BASE_URL}{path}", data=data, headers=_headers())
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.load(resp)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code} on {path}: {e.read().decode()[:600]}") from e

def api_get(path):
    req = urllib.request.Request(f"{BASE_URL}{path}", headers=_headers())
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)

def poll_job(job_id, max_wait=900):
    print(f"    polling {job_id[:8]}...", end="", flush=True)
    for _ in range(max_wait // 5):
        time.sleep(5)
        r = api_get(f"/background-jobs/{job_id}")
        if r.get("status") == "completed":
            print(" done")
            return r
        if r.get("status") == "failed":
            raise RuntimeError(f"Job failed: {r}")
        print(".", end="", flush=True)
    raise TimeoutError(f"Job {job_id} timed out after {max_wait}s")

def decode_b64(b64):
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    return base64.b64decode(b64)

def save_image(img_obj, path):
    if img_obj.get("type") == "rgba_bytes":
        Image.frombytes(
            "RGBA", (img_obj["width"], img_obj["height"]),
            decode_b64(img_obj["base64"])
        ).save(str(path))
    else:
        Path(path).write_bytes(decode_b64(img_obj["base64"]))

# ─────────────────────────────────────────────────────────────────────────────
# Shared style anchor (appended to every realm prompt)
# ─────────────────────────────────────────────────────────────────────────────

S = (
    "Xianxia cultivation realm badge — circular medallion in 16-bit pixel art, "
    "clean lines, limited palette. Heraldic oriental seal aesthetic, like a "
    "Tang-dynasty talisman. NOT a literal illustration — just the symbolic "
    "emblem. Centred in frame with generous transparent margin all around. "
    "Fully transparent background. "
    "NO pixel text, NO captions, NO words, NO labels of any kind in the image. "
    "Oriental wuxia symbolism, NO western fantasy aesthetics."
)

# ─────────────────────────────────────────────────────────────────────────────
# Realm definitions — each chained on the previous tier's finalized PNG
# ─────────────────────────────────────────────────────────────────────────────

REALM_ORDER = [
    "tempered_body",
    "qi_transformation",
    "true_element",
    "separation_reunion",
    "immortal_ascension",
    "saint",
    "saint_king",
    "origin_returning",
    "origin_king",
    "void_king",
    "dao_source",
    "emperor_realm",
    "open_heaven",
]

REALMS = {

    # ── T1 — Tempered Body ────────────────────────────────────────────────────
    "tempered_body": {
        "size": (128, 128),
        "desc": (
            "TIER 1 of 13 — the foundation. "
            "FORM: a circular medallion centred in the frame with generous "
            "transparent margin on all sides. "
            "RIM: a thick weathered BRONZE ring with subtle hammered texture and "
            "four small round bronze studs at the cardinal points (N/S/E/W). "
            "FIELD inside the rim: deep matte JADE GREEN (#1f4d3a), completely "
            "clean with NO marks, NO sparks, NO dots — just the trigram on "
            "uniform jade. "
            "CENTRE MOTIF: a bold MOUNTAIN TRIGRAM (the Bagua symbol ☶) "
            "rendered as three horizontal bars stacked vertically inside the field "
            "— TOP bar one unbroken solid line, MIDDLE bar broken into two short "
            "segments with a small gap between them, BOTTOM bar broken in the "
            "same way. The bars are dark BRONZE on the jade field, sharp clean "
            "pixel-art strokes. The trigram fills about half the field height "
            "and sits centred (slightly above the medallion's vertical centre). "
            "Mountain trigram = stillness, foundation, immovable physical "
            "refinement — the meaning of Tempered Body. "
            f"{S}"
        ),
    },

    # ── T2 — Qi Transformation ────────────────────────────────────────────────
    "qi_transformation": {
        "size": (128, 128),
        "desc": (
            "TIER 2 of 13. "
            "KEEPS from the reference image: the exact bronze rim with hammered "
            "texture and four cardinal studs, the deep jade-green field, the "
            "mountain trigram at the centre (top bar solid, middle and bottom "
            "broken). Preserve all of these — do not move them or change their "
            "proportions. "
            "ADDS: thin LUMINOUS JADE-GREEN QI MIST swirling behind and around "
            "the mountain trigram — wispy ribbon strands curling upward from "
            "below the trigram, looping behind the middle bar and rising past "
            "the top bar. Like incense smoke catching light. The mist sits "
            "BEHIND the trigram bars so the trigram stays dominant. "
            "ADDS: one small pale-white luminous core dot at the exact centre of "
            "the trigram — the first qi awakening inside the tempered body. "
            "Meaning: qi first TRANSFORMS inside the mortal body — flesh now "
            "channels living energy. The added mist conveys that first breath. "
            f"{S}"
        ),
    },

    # ── T3 — True Element ─────────────────────────────────────────────────────
    "true_element": {
        "size": (128, 128),
        "desc": (
            "TIER 3 of 13 — Bronze metal band, third badge in the journey. "
            "SAME medallion form, bronze rim with hammered texture, four cardinal "
            "bronze studs, deep jade-green field, and outer jade ribbon decorations "
            "as the reference image. Preserve the badge's frame exactly. "
            "REPLACE the centre of the field (currently trigram + qi mist in the "
            "reference) with the NEW CENTRAL MOTIF: FIVE small WUXING ELEMENT "
            "DOTS arranged at the five vertices of an imaginary pentagon centred "
            "inside the bronze rim. Each dot is a small filled circle (~6 pixels "
            "diameter) with a 1-pixel inner highlight, positioned well inside "
            "the rim with the centre of the field empty between them. "
            "DOT COLOURS (each a single pure colour): "
            "TOP ember RED (fire), UPPER-RIGHT warm YELLOW-OCHRE (earth), "
            "LOWER-RIGHT pale SILVER-WHITE (metal), LOWER-LEFT deep AZURE BLUE "
            "(water), UPPER-LEFT dark FOREST-GREEN (wood). "
            "ABSOLUTELY NO 5-pointed star, NO pentagram star outline, NO lines "
            "connecting the dots, NO geometric shape between them — just five "
            "isolated coloured dots inside the bronze rim. "
            "ABSOLUTELY NO trigram bars, NO qi mist in the field — the previous "
            "centre motif is FULLY REPLACED. The badge identity is now the five "
            "wuxing dots and nothing else inside the rim. "
            "Meaning: WUXING crystallized — the five true elements manifest. "
            f"{S}"
        ),
    },

    # ── T4 — Separation & Reunion ─────────────────────────────────────────────
    "separation_reunion": {
        "size": (128, 128),
        "desc": (
            "TIER 4 of 13 — Silver metal band, first SILVER badge. "
            "SAME medallion form, hammered ring texture, four cardinal studs, "
            "outer jade ribbon decorations, deep jade-green field as the reference. "
            "CHANGE: the rim COLOUR shifts from bronze to polished cool SILVER "
            "(moonlight tone, #c0c8d0 highlights with darker #6a7080 shadows). "
            "The four cardinal studs are also silver. The hammered texture and "
            "rim thickness are identical to the bronze rim — only the metal "
            "colour changes. "
            "REPLACE the centre of the field with the NEW CENTRAL MOTIF: a "
            "bold YIN-YANG TAIJITU disc filling the jade field — a classic "
            "black-and-white swirled circle with two contrasting dots (small "
            "white dot inside the black teardrop half, small black dot inside "
            "the white teardrop half). The taijitu is LARGE — about 70% of the "
            "field diameter — and dominates the centre. Crisp curving S-line "
            "between the black and white halves. "
            "ABSOLUTELY NO trigram bars, NO wuxing dots, NO qi mist — the centre "
            "is purely the taijitu disc on the jade field, nothing else. "
            "Meaning: yin and yang of the cultivator's soul SEPARATE and REUNITE "
            "stronger. Silver rim signals the transition into a higher band. "
            f"{S}"
        ),
    },

    # ── T5 — Immortal Ascension ───────────────────────────────────────────────
    "immortal_ascension": {
        "size": (128, 128),
        "desc": (
            "TIER 5 of 13 — Silver metal band, second silver badge. "
            "SAME medallion form, polished SILVER rim with hammered texture, four "
            "cardinal silver studs, deep jade-green field, and outer jade ribbon "
            "decorations as the reference. Preserve the silver rim exactly. "
            "REPLACE the centre of the field with the NEW CENTRAL MOTIF: a "
            "single WHITE CRANE silhouette in mid-flight at the centre of the "
            "jade field — pixel-art profile view, wings fully spread wide (left "
            "and right), long graceful neck stretched forward, long thin legs "
            "trailing behind, soaring upward and slightly to the right. The "
            "crane is pure pearl-white with subtle pale-silver shadow tones "
            "along its underwing, fills about 60% of the field width. Recognizable "
            "as a Chinese crane (he 鶴) — the immortality bird. "
            "BENEATH the crane, a single small RUYI CLOUD silhouette — a wispy "
            "scrolling-cloud puff in pale pearl-white, like the crane has just "
            "launched from it. Just one cloud, compact (~12 pixels wide), near "
            "the bottom-centre of the field. "
            "ABSOLUTELY NO taijitu, NO trigram, NO wuxing dots — the previous "
            "motif is fully replaced. The badge identity is the crane + cloud. "
            "Meaning: the cultivator ASCENDS — stepping onto the cloud path of "
            "the immortals. Cranes carry the soul upward in Chinese mythology. "
            f"{S}"
        ),
    },

    # ── T6 — Saint ────────────────────────────────────────────────────────────
    "saint": {
        "size": (128, 128),
        "desc": (
            "TIER 6 of 13 — Gold metal band, first GOLD badge. "
            "SAME medallion form, hammered ring texture, four cardinal studs, "
            "outer jade ribbon decorations, deep jade-green field as the reference. "
            "CHANGE: the rim COLOUR shifts from silver to polished warm GOLD "
            "(rich gold #c89548 highlights with darker #6a4a18 shadows). The "
            "four cardinal studs are also gold. Hammered texture preserved. "
            "REPLACE the centre of the field with the NEW CENTRAL MOTIF: an "
            "EIGHT-PETAL LOTUS MANDALA filling the jade field — fully symmetrical, "
            "radial bloom centred in the medallion. Eight elongated petals "
            "(narrow at the centre, tapering to rounded points) radiate outward "
            "from a small bright golden centre point, one petal pointing to each "
            "of the eight directions (N, NE, E, SE, S, SW, W, NW). The petals "
            "are pale jade-cream (#dde8c8) with subtle gold-cream highlights "
            "along their inner edges. The lotus fills about 75% of the field "
            "diameter. Sacred Buddhist lotus aesthetic — clean, symmetrical, "
            "luminous. "
            "ABSOLUTELY NO crane, NO taijitu, NO trigram — the previous motif "
            "is fully replaced. The badge identity is the lotus mandala on jade. "
            "Meaning: the cultivator becomes a SAINT — divine sanctity attained. "
            "Lotus is the universal Buddhist symbol of purity. "
            f"{S}"
        ),
    },

    # ── T7 — Saint King ───────────────────────────────────────────────────────
    "saint_king": {
        "size": (128, 128),
        "desc": (
            "TIER 7 of 13 — Gold metal band, second gold badge. "
            "SAME medallion form, polished warm GOLD rim with hammered texture, "
            "four cardinal gold studs, deep jade-green field, and outer jade "
            "ribbon decorations as the reference. Preserve the gold rim exactly. "
            "REPLACE the centre of the field with the NEW CENTRAL MOTIF: an "
            "ornate IMPERIAL CROWN sitting upright at the centre of the jade "
            "field — front-on view, Chinese-imperial style. Three pointed peaks "
            "on top (taller central peak with two slightly shorter flanking "
            "peaks), a single rounded JADE-GREEN GEM set into the centre peak, "
            "fine scrollwork etched horizontally across the crown band. The "
            "crown is rendered in dark BRONZE with jade-green highlights, "
            "rich and ornate. Optional: a tiny single lotus petal silhouette "
            "(pale jade-cream) sits beneath the crown's base as a quiet echo "
            "of the saintly origin. The crown fills about 65% of the field "
            "height, sitting upright and centred. "
            "ABSOLUTELY NO lotus mandala filling the field, NO trigram, NO "
            "taijitu, NO wuxing dots — the lotus mandala from T6 is fully "
            "replaced. The badge identity is the crown. "
            "Meaning: SAINT KING — rulership over saints. The cultivator who "
            "wears the crown of sanctity. "
            f"{S}"
        ),
    },

    # ── T8 — Origin Returning ─────────────────────────────────────────────────
    "origin_returning": {
        "size": (128, 128),
        "desc": (
            "TIER 8 of 13 — Gold metal band, third gold badge. "
            "SAME medallion form, polished warm GOLD rim with hammered texture, "
            "four cardinal gold studs, deep jade-green field, and outer jade "
            "ribbon decorations as the reference. Preserve the gold rim exactly. "
            "REPLACE the centre of the field with the NEW CENTRAL MOTIF: an "
            "OUROBOROS — a single Chinese-style serpent biting its own tail, "
            "forming a complete circular ring inside the jade field. The serpent "
            "is rendered in dark BRONZE with subtle scale highlights along its "
            "spine (1-pixel highlights), head positioned at the TOP-CENTRE with "
            "small open mouth gently biting its own tail-tip at the upper-right. "
            "Body curves around the inside of the field in a complete circle, "
            "about 3-4 pixels thick. Inside the ouroboros ring, the jade field "
            "is empty except for a single tiny JADE-GREEN dot at the exact "
            "centre — the primordial seed at the heart of the cycle. "
            "The ouroboros ring fills about 75% of the field diameter. "
            "ABSOLUTELY NO crown, NO lotus, NO trigram — the previous motif is "
            "fully replaced. The badge identity is the ouroboros + centre seed. "
            "Meaning: the cultivator RETURNS to their primordial dao. The cycle "
            "comes full circle. Ouroboros = eternal return, snake of cycles. "
            f"{S}"
        ),
    },

    # ── T9 — Origin King ──────────────────────────────────────────────────────
    "origin_king": {
        "size": (128, 128),
        "desc": (
            "TIER 9 of 13 — Gold metal band, fourth and final gold badge. "
            "SAME medallion form, polished warm GOLD rim with hammered texture, "
            "four cardinal gold studs, deep jade-green field, and outer jade "
            "ribbon decorations as the reference. Preserve the gold rim exactly. "
            "REPLACE the centre of the field with the NEW CENTRAL MOTIF: an "
            "ornate BRONZE IMPERIAL THRONE rendered front-on at the centre of "
            "the jade field — Chinese-imperial style with a tall straight back, "
            "two small carved peaks on top of the back, a single rounded JADE-"
            "GREEN GEM set into the centre of the headrest, two armrests with "
            "subtle dragon-head tips, and two visible front legs. The throne "
            "fills about 60% of the field height, sitting upright at the centre. "
            "ABOVE the throne, hovering just over the headrest: a single small "
            "luminous JADE-GREEN ORB (~6px diameter) — the dao essence enthroned. "
            "The throne is dark bronze with jade-green highlights; the orb glows "
            "softly. "
            "ABSOLUTELY NO ouroboros, NO crown, NO lotus, NO trigram — the "
            "previous motif is fully replaced. The badge identity is the throne "
            "+ jade orb above it. "
            "Meaning: ORIGIN KING — sovereign over the origin. The cultivator "
            "enthroned at the very source of dao, ruling the primordial. "
            f"{S}"
        ),
    },

    # ── T10 — Void King ───────────────────────────────────────────────────────
    "void_king": {
        "size": (128, 128),
        "desc": (
            "TIER 10 of 13 — Platinum metal band, first PLATINUM badge. The "
            "field also transforms — the most dramatic visual shift in the chain. "
            "SAME medallion form, hammered ring texture, four cardinal studs, "
            "outer jade ribbon decorations as the reference. Preserve the badge "
            "frame structure. "
            "CHANGE: the rim COLOUR shifts from gold to cool PLATINUM with a "
            "subtle violet undertone (#c8c0d8 highlights with darker #5a526a "
            "shadows) — divine metal beyond gold. The four cardinal studs are "
            "also platinum. "
            "CHANGE: the FIELD inside the rim transforms from jade-green to "
            "deep VIOLET-BLACK COSMIC VOID (gradient from #0d0518 at the edges "
            "to #1a0a2a near the centre) — starless cosmic emptiness inside "
            "the medallion. "
            "REPLACE the centre with the NEW CENTRAL MOTIF: a single cold "
            "WHITE-VIOLET STAR pinpoint at the exact centre of the void field "
            "— a small radiant 4-point star (or compact 4-pixel cross with a "
            "single-pixel bloom) glowing icy white with faint violet edges. "
            "The only bright thing in the cosmic dark. Around the star, 3-4 "
            "tiny single-pixel dust-pinpoints scattered very sparsely in the "
            "void (no constellations, just hints of distant stars). "
            "ABSOLUTELY NO throne, NO ouroboros, NO crown, NO lotus visible in "
            "the field — the void has consumed all prior motifs. The badge "
            "identity is the platinum rim + violet-black void + lone star. "
            "Meaning: VOID KING — lord of the cosmic void. The cultivator's "
            "domain is now empty cosmos. The field becoming void IS the "
            "symbolism — there is nothing left to add, only what was subtracted. "
            f"{S}"
        ),
    },

    # ── T11 — Dao Source ──────────────────────────────────────────────────────
    "dao_source": {
        "size": (128, 128),
        "desc": (
            "TIER 11 of 13 — Platinum metal band, second platinum badge. "
            "SAME medallion form, cool PLATINUM rim with hammered texture and "
            "four cardinal platinum studs, deep VIOLET-BLACK cosmic void field, "
            "outer jade ribbon decorations as the reference. Preserve the "
            "platinum rim and void field exactly. "
            "REPLACE the centre with the NEW CENTRAL MOTIF: a single BOLD "
            "LUMINOUS JADE-GREEN CALLIGRAPHY BRUSHSTROKE forming the simplified "
            "Chinese DAO character (道) painted in seal-script across the void "
            "field. The character should be readable as 道 — flowing brushstrokes "
            "with the characteristic top-left radical and bottom-right walking "
            "component, painted in one confident sweep. Thick where the brush "
            "pressed, thin where it lifted, slightly uneven — calligraphic and "
            "alive, not geometric. Luminous jade-green (#3fbf6a) glowing against "
            "the violet-black void. Fills about 75% of the field. "
            "Around the character, 3-4 tiny luminous jade-green INK SPECKS "
            "scattered sparsely in the void — droplets of pure dao essence. "
            "ABSOLUTELY NO lone star at the top (the star is replaced by the "
            "character), NO previous silhouettes — the badge identity is now "
            "the dao character on the cosmic void. "
            "Meaning: DAO SOURCE — the wellspring of the Dao itself. The "
            "character IS the Dao made visible, written across the cosmos. "
            f"{S}"
        ),
    },

    # ── T12 — Emperor Realm ───────────────────────────────────────────────────
    "emperor_realm": {
        "size": (128, 128),
        "desc": (
            "TIER 12 of 13 — Radiant Gold metal band. The field returns to jade. "
            "SAME medallion form, hammered ring texture, four cardinal studs, "
            "outer jade ribbon decorations as the reference. "
            "CHANGE: the rim COLOUR shifts from platinum to RADIANT WARM GOLD "
            "(#ffcc44 highlights with #b08820 shadows) — brightest metal tier, "
            "luminous. The cardinal studs are also gleaming gold. "
            "CHANGE: the FIELD returns from violet-black void to deep matte "
            "JADE-GREEN (#1f4d3a). "
            "REPLACE the centre with the NEW CENTRAL MOTIF: a single COILED "
            "FIVE-CLAWED CHINESE SKY DRAGON wrapped in a tight spiral at the "
            "centre of the jade field. Long body with antler horns and flowing "
            "whiskers; head upper-left with fierce open mouth; body coils "
            "clockwise; tail tucks under the head; one front claw at bottom-"
            "centre clutching a small luminous JADE-GREEN PEARL. Rich warm "
            "GOLD (#d4a040) with fine 1-pixel scale highlights, single CRIMSON "
            "eye spark. Fills the field. "
            "ABSOLUTELY NO dao character, NO void, NO previous motifs in the "
            "centre. Badge identity: coiled imperial dragon + jade pearl. "
            "Meaning: EMPEROR REALM — imperial dragon authority. The five-"
            "clawed dragon is THE imperial symbol of China, historically "
            "reserved for emperors alone. "
            f"{S}"
        ),
    },

    # ── T13 — Open Heaven ─────────────────────────────────────────────────────
    "open_heaven": {
        "size": (128, 128),
        "desc": (
            "TIER 13 of 13 — the pinnacle of the journey. "
            "SAME medallion form, outer footprint, outer jade ribbons, hammered "
            "ring texture, four cardinal studs as the reference. Medallion size "
            "MATCHES prior tiers — NO rays or wings extending beyond the rim. "
            "CHANGE: the rim becomes IRIDESCENT GOLD-WHITE-ROSE SHIMMER — divine "
            "prismatic gradient flowing around the rim: warm gold blending into "
            "pale white-gold blending into soft rose-gold and back, with mother-"
            "of-pearl shimmer highlights. Cardinal studs become rose-gold gems. "
            "REPLACE the centre with the NEW CENTRAL MOTIF: a GOLDEN FENGHUANG "
            "PHOENIX viewed front-on with wings spread wide INSIDE the rim — "
            "head at top with feathered crest and curved beak, both wings "
            "stretching to the inner edge of the rim (left wing left, right "
            "wing right) framing the centre, long tail feathers curling "
            "beneath. Rich GOLD (#e8b440) with rose-gold highlights on wing "
            "and tail tips, white-gold accents along wing leading edges. "
            "At the phoenix's chest, between the spread wings: a HEAVEN "
            "TRIGRAM (three SOLID UNBROKEN horizontal bars stacked vertically) "
            "glowing pale white-gold with a soft halo. The trigram is small "
            "but luminous. Behind the phoenix, deep matte JADE-GREEN field. "
            "ABSOLUTELY NO dragon, NO dao character, NO void, NO clouds, NO "
            "rays beyond the rim — entire badge stays within medallion "
            "footprint. Phoenix wings stay INSIDE the rim. "
            "Meaning: OPEN HEAVEN — Fenghuang carries the cultivator into the "
            "heavens. Phoenix = imperial divine bird, counterpart to dragon. "
            f"{S}"
        ),
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Image helpers
# ─────────────────────────────────────────────────────────────────────────────

def crop_transparent_edges(img):
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    def col_has_content(x):
        return any(px[x, y][3] > 4 for y in range(h))
    def row_has_content(y):
        return any(px[x, y][3] > 4 for x in range(w))
    left  = next((x for x in range(w)           if col_has_content(x)), 0)
    right = next((x for x in range(w-1, -1, -1) if col_has_content(x)), w - 1)
    top   = next((y for y in range(h)           if row_has_content(y)), 0)
    bot   = next((y for y in range(h-1, -1, -1) if row_has_content(y)), h - 1)
    return img.crop((left, top, right + 1, bot + 1))


def _prev_finalized(realm_id):
    """Return the finalized PNG path of the previous realm in the chain, or None."""
    if realm_id not in REALM_ORDER:
        return None
    idx = REALM_ORDER.index(realm_id)
    if idx <= 0:
        return None
    prev = OUT_DIR / f"{REALM_ORDER[idx - 1]}.png"
    return prev if prev.exists() else None

# ─────────────────────────────────────────────────────────────────────────────
# Pipeline steps
# ─────────────────────────────────────────────────────────────────────────────

def run_generate(realm_id, ref_path=None):
    if realm_id not in REALMS:
        raise ValueError(f"Unknown realm '{realm_id}'. Known: {list(REALMS)}")

    cfg = REALMS[realm_id]
    w, h = cfg["size"]

    # Auto-detect previous finalized realm as reference unless overridden.
    if ref_path is None:
        ref_path = _prev_finalized(realm_id)

    desc_len = len(cfg["desc"])
    print(f"\n{'='*60}")
    print(f"  Generating: {realm_id}  ({w}×{h})")
    print(f"  Prompt length: {desc_len} chars (limit 2000)")
    if ref_path:
        print(f"  Reference:  {ref_path.name}")
    else:
        print(f"  Reference:  none (base tier)")
    print(f"{'='*60}")

    if desc_len > 2000:
        raise RuntimeError(
            f"Prompt for {realm_id} is {desc_len} chars (limit 2000) — trim it."
        )

    body = {
        "description":   cfg["desc"],
        "image_size":    {"width": w, "height": h},
        "no_background": True,
    }

    if ref_path and ref_path.exists():
        ref_b64  = base64.b64encode(ref_path.read_bytes()).decode()
        ref_img  = {"type": "base64", "base64": ref_b64, "format": "png"}
        rw, rh   = Image.open(ref_path).size
        ref_sized = {"image": ref_img, "size": {"width": rw, "height": rh}}
        body["reference_images"] = [ref_sized]
        body["style_image"]      = ref_sized

    status, r = api_post("/generate-image-v2", body)
    if status != 202:
        raise RuntimeError(f"generate-image-v2 returned {status}: {r}")

    result = poll_job(r["background_job_id"])
    images = result.get("last_response", {}).get("images", [])
    if not images:
        raise RuntimeError("No images returned")

    print(f"\n  Saved {len(images)} candidates to: {TMP_DIR}")
    for i, img in enumerate(images):
        path = TMP_DIR / f"{realm_id}_cand_{i}.png"
        save_image(img, path)
        print(f"    cand_{i}: {path.name}  ({img['width']}×{img['height']})")

    print(f"\n  Review, then run:")
    print(f"    python gen_realm_icons.py finalize {realm_id} <cand_number>")


def run_finalize(realm_id, cand_n):
    if realm_id not in REALMS:
        raise ValueError(f"Unknown realm '{realm_id}'. Known: {list(REALMS)}")

    src = TMP_DIR / f"{realm_id}_cand_{cand_n}.png"
    if not src.exists():
        raise FileNotFoundError(f"Candidate not found: {src}")

    print(f"\n  Finalizing {realm_id} from cand_{cand_n}...")

    img = Image.open(src).convert("RGBA")
    img = crop_transparent_edges(img)

    out_path = OUT_DIR / f"{realm_id}.png"
    img.save(str(out_path))
    print(f"  Saved {img.size[0]}×{img.size[1]} RGBA → {out_path}")


def run_generate_all():
    print(f"\n  Generating all {len(REALM_ORDER)} realm badges sequentially.")
    print(f"  Each call auto-uses the prior tier's finalized PNG as reference.")
    print(f"  You still need to finalize each picked candidate before the next.")
    for realm_id in REALM_ORDER:
        try:
            run_generate(realm_id)
        except Exception as e:
            print(f"\n  ERROR on {realm_id}: {e}")
            print("  Continuing with next...")


def run_show_prompt(realm_id):
    if realm_id not in REALMS:
        raise ValueError(f"Unknown realm '{realm_id}'. Known: {list(REALMS)}")
    cfg = REALMS[realm_id]
    print(f"\n{'='*60}")
    print(f"  {realm_id}  ({cfg['size'][0]}×{cfg['size'][1]})")
    print(f"  Prompt length: {len(cfg['desc'])} chars (limit 2000)")
    print(f"{'='*60}\n")
    for line in cfg["desc"].split(". "):
        line = line.strip()
        if line:
            print(f"  {line}.")
    print()

# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) == 2 and args[0] == "generate":
        run_generate(args[1])
    elif len(args) == 3 and args[0] == "finalize":
        run_finalize(args[1], args[2])
    elif len(args) == 1 and args[0] == "generate-all":
        run_generate_all()
    elif len(args) == 2 and args[0] == "prompt":
        run_show_prompt(args[1])
    else:
        print("Usage:")
        print(f"  python {sys.argv[0]} prompt <realm_id>             — preview a prompt (no API cost)")
        print(f"  python {sys.argv[0]} generate <realm_id>           — 4 candidates → tmp/")
        print(f"  python {sys.argv[0]} finalize <realm_id> <cand_n>  — crop + save → public/ui/realms/<id>.png")
        print(f"  python {sys.argv[0]} generate-all                  — fire all 13 sequentially")
        print(f"\nRealms in chain order ({len(REALM_ORDER)}):")
        for i, rid in enumerate(REALM_ORDER, 1):
            print(f"  T{i:2d}  {rid}")
