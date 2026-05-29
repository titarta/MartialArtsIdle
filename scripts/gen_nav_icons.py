"""
gen_nav_icons.py — Nav bar icon generation for MartialArtsIdle.

WORKFLOW (2 steps per icon):
  1. Generate candidates:
       python gen_nav_icons.py generate <icon_id>
       python gen_nav_icons.py generate-all
       → saves candidates to tmp/nav_gen/

  2. Finalize chosen candidate:
       python gen_nav_icons.py finalize <icon_id> <cand_number>
       → crops transparent edges, saves to public/sprites/nav/<icon_id>.png

ICONS: home, combat, character, inventory, production,
       sect, journey, eternal_tree, codex, settings
"""

import json, base64, time, sys
from pathlib import Path
import urllib.request, urllib.error
import shutil
from PIL import Image, ImageFilter

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

API_KEY  = "886d28c4-fb31-429d-832e-1242e312160e"
BASE_URL = "https://api.pixellab.ai/v2"
OUT_DIR  = Path(__file__).parent.parent / "public/sprites/nav"
TMP_DIR  = Path(__file__).parent.parent / "tmp/nav_gen"
OUT_DIR.mkdir(parents=True, exist_ok=True)
TMP_DIR.mkdir(parents=True, exist_ok=True)

ICON_SIZE = 64

def _headers():
    return {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

def api_post(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(f"{BASE_URL}{path}", data=data, headers=_headers())
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.load(resp)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode()[:400]}") from e

def api_get(path):
    req = urllib.request.Request(f"{BASE_URL}{path}", headers=_headers())
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)

def poll_job(job_id, max_wait=600):
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
    raise TimeoutError(f"Job {job_id} timed out")

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

def crop_transparent_edges(img):
    img = img.convert("RGBA")
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img

# ── Readability outline ─────────────────────────────────────────────────────
# The nav bars render on a near-black warm-brown gradient (#1c1208→#2d1f10) and
# dim inactive icons to 50% opacity. A dark outline would vanish into that bg,
# so we bake a crisp IVORY sticker-outline around each icon's silhouette. Width
# is proportional to the icon's native size (≈1px once downscaled to the 24px
# nav slot) and clamped so tiny and large sources stay visually uniform.
OUTLINE_COLOR = (242, 234, 210)   # warm ivory — pops on the dark bars, stays on-palette
OUTLINE_FRAC  = 0.05              # outline radius as a fraction of the icon's longest edge
OUTLINE_THR   = 40                # alpha threshold that counts as "solid" silhouette

def add_outline(img, color=OUTLINE_COLOR, frac=OUTLINE_FRAC, thr=OUTLINE_THR):
    img = img.convert("RGBA")
    n = max(2, min(4, round(max(img.size) * frac)))
    alpha = img.split()[3]
    mask  = alpha.point(lambda v: 255 if v > thr else 0)
    w, h  = img.size
    size  = (w + 2 * n, h + 2 * n)
    dilated = mask.filter(ImageFilter.MaxFilter(2 * n + 1))
    big = Image.new("L", size, 0)
    big.paste(dilated, (n, n))
    solid = Image.new("RGBA", size, color + (255,))
    empty = Image.new("RGBA", size, color + (0,))
    canvas = Image.composite(solid, empty, big)
    canvas.alpha_composite(img, (n, n))
    return canvas

# ── Style anchor ──────────────────────────────────────────────────────────────
# All icons share this base to look like a set.
S = (
    "Xianxia cultivation fantasy pixel art icon. "
    "64x64 pixels. Transparent background. "
    "Clean bold pixel linework with dark charcoal (#1a1a2a) outline. "
    "Warm limited palette: aged gold, dark jade green, ivory/off-white, deep charcoal. "
    "Iconic and immediately readable at small size — strong clear silhouette. "
    "High internal contrast with luminous gold and ivory highlights so it stays legible "
    "at tiny sizes on a dark background; keep the form bold and simple, avoid large "
    "dark-on-dark areas and fussy fine detail. "
    "No background fill, no frame border, no drop shadow. Just the icon object."
)

# ── Icon definitions ──────────────────────────────────────────────────────────
ICONS = {

    "home": (
        "A pixel art icon of a cultivator sitting cross-legged in a calm meditation pose, "
        "viewed from the front, forming a strong wide triangular silhouette: knees spread wide, "
        "hands resting on the knees, back straight, head slightly raised. "
        "The figure is the bold dominant subject, rendered in bright luminous GOLD with clear "
        "ivory highlights on the shoulders, knees and crown so it pops instantly. "
        "Behind the head and shoulders sits a restrained, tidy crescent halo of golden qi — "
        "a clean arc of glow, NOT a busy vortex and NOT swirling lines that cover the body. "
        "Simple, centered, unmistakably a glowing meditating cultivator. "
        f"{S}"
    ),

    "combat": (
        "A pixel art icon of three jagged mountain peaks rising from a base of swirling qi mist. "
        "The tallest peak is centred, flanked by two shorter ones. "
        "The mountain faces are dark charcoal stone with gold-lit edges catching light. "
        "Between and below the peaks: pale jade-green qi mist wisps curl upward. "
        "A tiny crescent moon or bright star sits above the central peak. "
        "Silhouette is strong, layered, and instantly readable — classic Chinese ink-painting "
        "mountain composition reduced to clean pixel art. "
        f"{S}"
    ),

    "character": (
        "A pixel art icon of a cultivator standing upright in a front-facing pose, "
        "arms slightly extended and lowered at the sides in a relaxed ready stance. "
        "The figure wears a flowing xianxia robe with a jade-green sash at the waist. "
        "A faint vertical gold qi line rises from the crown of the head, like spiritual energy. "
        "Full body from head to feet, centred, bold, clear silhouette. "
        f"{S}"
    ),

    "inventory": (
        "A pixel art icon of a small worn leather satchel bag, slightly open at the top, "
        "with a rolled scroll tucked inside and the tip of a glowing jade crystal peeking out. "
        "A gold drawstring cord is tied at the top. "
        "The bag sits upright, viewed from a slight 3/4 front angle. "
        "Compact, readable, and clearly an inventory/collection symbol. "
        f"{S}"
    ),

    "production": (
        "A pixel art icon of a small three-legged bronze ding cauldron (ancient Chinese ritual vessel) "
        "viewed from a slight 3/4 front angle. "
        "The cauldron has two upright loop handles, a rounded belly, and three stubby legs. "
        "Wisps of pale jade-green qi smoke curl upward from the open mouth. "
        "The bronze surface has aged patina — dark bronze-brown with gold edge highlights. "
        "Compact, iconic, immediately readable as an alchemy/crafting symbol. "
        f"{S}"
    ),

    # ── New nav set (2026-05-28) ────────────────────────────────────────────
    # Sect (the producer/upgrade economy, renamed from "Cultivation"),
    # Journey (chronicle), Eternal Tree (reincarnation), Codex (records),
    # Settings. Each given a deliberately distinct silhouette so the row
    # reads clearly at the 24px nav display size.

    # Sect — isolated pagoda-hall symbol, regenerated in home.png's gold style
    # via a style_image reference passed at generate time.
    "sect": (
        "A pixel art icon of a single isolated multi-tiered Chinese pavilion / pagoda hall "
        "(a cultivation sect's building), viewed front-on, standing alone — NO ground, NO base "
        "platform scenery, NO surroundings. Stacked roofs with upturned eaves and a gold finial. "
        "Rendered in warm luminous GOLD with ivory highlights and a soft golden glow behind it, "
        "matching the bright gold tone, shading and vibe of the reference image. "
        "Bold, symmetrical, centered, instantly readable as a temple / sect hall. "
        "64x64 pixels, transparent background, clean bold pixel linework, no frame border, no background fill."
    ),

    # Journey — isolated TORII gate symbol (no landscape), matched to home.png's
    # vibe/tones via a style_image reference passed at generate time.
    "journey": (
        "A pixel art icon of a single isolated TORII gate (an architectural gateway) standing alone: "
        "two tall vertical posts crowned by two horizontal beams, the upper beam sweeping gently "
        "upward at both ends. It is a STRUCTURE of posts and beams ONLY — NOT a person, NOT a seated "
        "figure, NOT a creature; no body, no face, no limbs. "
        "NO landscape, NO hills, NO path, NO ground, NO scenery — just the gate as a clean symbol. "
        "Rendered in warm luminous GOLD with ivory highlights and a soft golden glow behind it, "
        "matching the bright gold tone and shading of the reference image. "
        "Bold, symmetrical, centered, instantly readable as a gateway. "
        "64x64 pixels, transparent background, clean bold pixel linework, no frame border, no background fill."
    ),

    # Eternal Tree — the prestige / reincarnation feature. Per art direction this
    # icon deliberately BREAKS the restrained nav style (no {S} anchor): it should
    # feel spectacular and magical, not a plain tree. Still a 64px transparent
    # pixel-art icon with a strong readable silhouette so it works in the nav.
    "eternal_tree": (
        "A pixel art icon of a SPECTACULAR celestial world-tree blazing with divine magic. "
        "A luminous molten-gold trunk twists upward and erupts into a vast glowing canopy that "
        "reads like a galaxy-nebula of radiant jade-green and gold foliage shot through with "
        "ethereal cyan-white starlight; glowing star-fruit and floating light motes drift around it. "
        "Roots of light spread from the base and cradle a brilliant glowing orb-seed of rebirth, "
        "luminous energy streams rising up the trunk. A radiant divine halo and bursting rays of "
        "light blaze behind the crown. "
        "Awe-inspiring, fantastical, sacred — the heart of reincarnation and evolution. "
        "Rich, vivid, luminous colours with strong magical glow; bold clear silhouette that still "
        "reads at small size. 64x64 pixels, transparent background, clean bold pixel linework, "
        "no frame border, no flat background fill."
    ),

    "codex": (
        "A pixel art icon of an open ancient tome lying flat, viewed from a slight "
        "three-quarter top angle, pages fanned open. "
        "The thick cover is dark jade-green with aged bronze-gold corner fittings "
        "and a clasp; a single small gold seal-glyph glows faintly on the open "
        "ivory pages. "
        "Compact and clearly a bound book / codex of records — NOT a rolled "
        "scroll. "
        f"{S}"
    ),

    "settings": (
        "A pixel art icon of a single aged bronze-gold gear (cog) with chunky "
        "rounded teeth, viewed straight-on, a polished dark jade-green round "
        "gemstone set in its center hub. "
        "Gold edge highlights catch the teeth; dark charcoal recesses between "
        "them. "
        "Clean, symmetrical, immediately readable as a settings / mechanism "
        "symbol. "
        f"{S}"
    ),
}

# ── Pipeline ──────────────────────────────────────────────────────────────────

def run_generate(icon_id, ref_path=None):
    if icon_id not in ICONS:
        print(f"Unknown icon: {icon_id}. Known: {', '.join(ICONS)}")
        sys.exit(1)

    body = {
        "description": ICONS[icon_id],
        "image_size":  {"width": ICON_SIZE, "height": ICON_SIZE},
        "no_background": True,
    }

    # Optional style reference — passes an existing PNG as `style_image` +
    # `reference_images` so the API matches its palette/shading/vibe (same
    # mechanism the realm-icon chain uses). Used to give icons the look of an
    # already-approved icon (e.g. home.png) instead of just prompt language.
    if ref_path:
        ref_path = Path(ref_path)
        if ref_path.exists():
            ref_b64   = base64.b64encode(ref_path.read_bytes()).decode()
            rw, rh    = Image.open(ref_path).size
            ref_sized = {"image": {"type": "base64", "base64": ref_b64, "format": "png"},
                         "size":  {"width": rw, "height": rh}}
            # STYLE only — we deliberately do NOT set `reference_images` here.
            # reference_images preserves the source's STRUCTURE/content, which
            # made a figure reference (home.png) reproduce the figure instead of
            # the prompted subject. style_image alone transfers palette/shading
            # while the description controls the actual subject.
            body["style_image"] = ref_sized
            print(f"  Style reference (style only): {ref_path}  ({rw}x{rh})")
        else:
            print(f"  WARNING: style reference not found, generating without it: {ref_path}")

    print(f"\nGenerating candidates for: {icon_id}")
    status, r = api_post("/generate-image-v2", body)
    if status != 202:
        raise RuntimeError(f"API returned {status}")

    result = poll_job(r["background_job_id"])
    images = result.get("last_response", {}).get("images", [])
    if not images:
        raise RuntimeError("No images returned")

    for i, img in enumerate(images):
        path = TMP_DIR / f"{icon_id}_cand_{i}.png"
        save_image(img, path)
        print(f"    cand_{i}: {path}")
    print(f"\n  Open folder: {TMP_DIR}")


def run_finalize(icon_id, cand_n):
    src = TMP_DIR / f"{icon_id}_cand_{cand_n}.png"
    if not src.exists():
        raise FileNotFoundError(f"Candidate not found: {src}")
    dst = OUT_DIR / f"{icon_id}.png"
    # No outline baked here — finalize crops only. The ivory outline lives in
    # the separate opt-in `outline <icon_id>` command if it's ever wanted.
    img = crop_transparent_edges(Image.open(src))
    img.save(str(dst))
    print(f"  Saved (cropped, no outline): {dst}")


def run_outline(icon_id):
    """Bake the ivory outline into an already-finalized nav icon in place.
    Used for icons that are NOT regenerated (e.g. the existing home.png) so the
    whole visible nav set shares one outline treatment. Backs up the pristine
    original to tmp/nav_gen/_orig_backup/ before overwriting."""
    path = OUT_DIR / f"{icon_id}.png"
    if not path.exists():
        raise FileNotFoundError(f"Icon not found: {path}")
    backup_dir = TMP_DIR / "_orig_backup"
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup = backup_dir / f"{icon_id}.png"
    if not backup.exists():            # never clobber a pristine original on re-run
        shutil.copy2(path, backup)
    img = add_outline(crop_transparent_edges(Image.open(path)))
    img.save(str(path))
    print(f"  Outlined in place: {path}  (backup: {backup})")


if __name__ == "__main__":
    # python gen_nav_icons.py generate     <icon_id>
    # python gen_nav_icons.py generate-all
    # python gen_nav_icons.py finalize     <icon_id> <cand_n>
    if len(sys.argv) >= 3 and sys.argv[1] == "generate":
        # Optional 3rd arg: path to a style-reference PNG (e.g. home.png).
        ref = sys.argv[3] if len(sys.argv) >= 4 else None
        run_generate(sys.argv[2], ref)
    elif len(sys.argv) == 2 and sys.argv[1] == "generate-all":
        for icon_id in ICONS:
            run_generate(icon_id)
    elif len(sys.argv) == 4 and sys.argv[1] == "finalize":
        run_finalize(sys.argv[2], sys.argv[3])
    elif len(sys.argv) == 3 and sys.argv[1] == "outline":
        run_outline(sys.argv[2])
    else:
        print("Usage:")
        print(f"  python {sys.argv[0]} generate     <icon_id>")
        print(f"  python {sys.argv[0]} generate-all")
        print(f"  python {sys.argv[0]} finalize     <icon_id> <cand_n>")
        print(f"  python {sys.argv[0]} outline      <icon_id>   # bake outline into an existing icon")
        print(f"\nKnown icons: {', '.join(ICONS)}")
