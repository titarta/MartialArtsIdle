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

ICONS: home, combat, character, inventory, production
"""

import json, base64, time, sys
from pathlib import Path
import urllib.request, urllib.error
from PIL import Image

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

ICON_SIZE = 48

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

def crop_transparent_edges(src_path, dst_path):
    img = Image.open(src_path).convert("RGBA")
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    img.save(str(dst_path))

# ── Style anchor ──────────────────────────────────────────────────────────────
# All icons share this base to look like a set.
S = (
    "Xianxia cultivation fantasy pixel art icon. "
    "48x48 pixels. Transparent background. "
    "Clean bold pixel linework with dark charcoal (#1a1a2a) outline. "
    "Warm limited palette: aged gold, dark jade green, ivory/off-white, deep charcoal. "
    "Iconic and immediately readable at small size — strong clear silhouette. "
    "No background fill, no frame border, no drop shadow. Just the icon object."
)

# ── Icon definitions ──────────────────────────────────────────────────────────
ICONS = {

    "home": (
        "A pixel art icon of a cultivator silhouette sitting cross-legged in lotus pose, "
        "viewed from the front, legs forming a wide diamond at the base, hands resting on knees. "
        "A dramatic golden qi vortex spirals tightly around the seated figure — thick luminous "
        "swirling lines of gold and pale ivory energy coiling from the base upward and "
        "radiating outward at the top like a crown of power. "
        "The vortex is the dominant visual: bright, bold, unmistakably energy-charged. "
        "The figure itself is a clean dark silhouette inside the glow. "
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
}

# ── Pipeline ──────────────────────────────────────────────────────────────────

def run_generate(icon_id):
    if icon_id not in ICONS:
        print(f"Unknown icon: {icon_id}. Known: {', '.join(ICONS)}")
        sys.exit(1)

    print(f"\nGenerating candidates for: {icon_id}")
    status, r = api_post("/generate-image-v2", {
        "description": ICONS[icon_id],
        "image_size":  {"width": ICON_SIZE, "height": ICON_SIZE},
        "no_background": True,
    })
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
    crop_transparent_edges(src, dst)
    print(f"  Saved: {dst}")


if __name__ == "__main__":
    # python gen_nav_icons.py generate     <icon_id>
    # python gen_nav_icons.py generate-all
    # python gen_nav_icons.py finalize     <icon_id> <cand_n>
    if len(sys.argv) >= 3 and sys.argv[1] == "generate":
        run_generate(sys.argv[2])
    elif len(sys.argv) == 2 and sys.argv[1] == "generate-all":
        for icon_id in ICONS:
            run_generate(icon_id)
    elif len(sys.argv) == 4 and sys.argv[1] == "finalize":
        run_finalize(sys.argv[2], sys.argv[3])
    else:
        print("Usage:")
        print(f"  python {sys.argv[0]} generate     <icon_id>")
        print(f"  python {sys.argv[0]} generate-all")
        print(f"  python {sys.argv[0]} finalize     <icon_id> <cand_n>")
        print(f"\nKnown icons: {', '.join(ICONS)}")
