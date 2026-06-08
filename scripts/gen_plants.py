"""
gen_plants.py — Spirit Garden plant sprite generation pipeline.

Generates the 10-plant catalogue used by the Spirit Garden minigame, with
four growth stages per plant (seed -> sprout -> growing -> ripe). Each
plant ships as a SINGLE 128x128 PNG sprite sheet laid out as a 2x2 grid
of 64x64 frames:

    ┌────────┬────────┐
    │ seed   │ sprout │
    ├────────┼────────┤
    │ grow   │ ripe   │
    └────────┴────────┘

SpiritGarden.jsx renders one quadrant per stage via CSS background-image
+ background-position.

TWO PIPELINES, picked per plant via the `mode` flag:

  Mode "2x2" (CREDIT EFFICIENT — 20 credits per plant)
    One PixelLab call at 128x128. The prompt asks for "four growth
    stages of the same plant, each as a different candidate." PixelLab
    returns 4 candidates per 128x128 call. If the model cooperates, each
    candidate is a different stage; we resize each to 64x64 and compose
    into the sheet.

    UNPROVEN — needs validation on plant 1 (Spirit Mint) before bulk run.

  Mode "chain" (FALLBACK — 80 credits per plant)
    Four sequential calls, one per stage, each using the previous
    finalized stage as reference_images + style_image (the gen_crystals
    pattern). Slow + costly but reliable. Use only when 2x2 doesn't pan
    out, or for plants where stage-by-stage control matters.

WORKFLOW:

  1. Validate the 2x2 approach on one plant:
       python scripts/gen_plants.py generate spirit_mint --mode 2x2
       (saves 4 candidates to tmp/plant_gen/spirit_mint/cand_0..3.png)
       Look at them — do they show 4 stages or 4 variations of one stage?

  2. If 2x2 worked, finalize that plant:
       python scripts/gen_plants.py finalize spirit_mint --order 0,1,2,3
       (resizes + composes into public/sprites/plants/spirit_mint.png)
       Adjust --order if PixelLab returned stages in a different sequence.

  3. Bulk-run the rest:
       python scripts/gen_plants.py generate-all --mode 2x2
       (skips any plant whose final PNG already exists)

  4. Finalize each one as you review:
       python scripts/gen_plants.py finalize <plant_id> --order 0,1,2,3

  CHAIN-mode pipeline (per plant):
       python scripts/gen_plants.py generate <plant_id> --mode chain --stage seed
       (then sprout / growing / ripe in order, each referencing the previous)
       python scripts/gen_plants.py finalize <plant_id> --mode chain

CREDITS:
  Per the project knowledge graph (reference_pixellab_grid.md): a 128x128
  call returns 4 candidates for 20 credits. So 2x2 mode = 20 credits per
  plant. Chain mode = 4 calls = 80 credits per plant.

DEPENDENCIES:
  pip install Pillow
"""

import argparse
import base64
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
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

PROJECT_ROOT = Path(__file__).parent.parent
OUT_DIR      = PROJECT_ROOT / "public" / "sprites" / "plants"
TMP_DIR      = PROJECT_ROOT / "tmp" / "plant_gen"
OUT_DIR.mkdir(parents=True, exist_ok=True)
TMP_DIR.mkdir(parents=True, exist_ok=True)

STAGES = ("seed", "sprout", "growing", "ripe")

# Final sheet is 128x128 with each stage occupying a 64x64 quadrant
SHEET_SIZE = 128
QUAD_SIZE  = 64
QUAD_POSITIONS = {
    "seed":    (0,         0),
    "sprout":  (QUAD_SIZE,  0),
    "growing": (0,          QUAD_SIZE),
    "ripe":    (QUAD_SIZE,  QUAD_SIZE),
}

# ─────────────────────────────────────────────────────────────────────────────
# Shared style anchor — every plant gets these constraints appended
# ─────────────────────────────────────────────────────────────────────────────

STYLE_ANCHOR = (
    "Xianxia cultivation fantasy pixel art game herb. "
    "16-bit style, limited palette, no hard dark outline (the plant silhouette is "
    "defined by its own colour and shading, not an outline stroke). "
    "Fully transparent background — the plant floats in empty space, no soil border, "
    "no decorative ground tile. "
    "Side view, plant growing upward from an implied (not drawn) ground line. "
    "Centred in the frame with room around for the silhouette. "
    "No western fantasy aesthetics, no UI chrome, no text, no labels, no captions, "
    "no frame borders, no ground shadow."
)

# Stage descriptors plugged into prompts in both modes
STAGE_PROMPTS = {
    "seed": (
        "a single tiny seedling just breaking through soil — one curled sprout "
        "with one or two cotyledon leaves, barely the size of a fingertip"
    ),
    "sprout": (
        "a young plant with the first true paired leaves on a thin upright stem, "
        "still small but unmistakably the species"
    ),
    "growing": (
        "a bushy mid-growth plant with multiple branches and dense foliage, "
        "near full size but not yet flowering or producing harvestable parts"
    ),
    "ripe": (
        "the fully mature plant at peak, in flower or carrying harvestable parts, "
        "ready for the cultivator to crop — the most visually striking stage"
    ),
}

# ─────────────────────────────────────────────────────────────────────────────
# Plant catalogue — the 10 plants we're generating
# Each plant identity has: id, display name, palette, identity blurb
# ─────────────────────────────────────────────────────────────────────────────

PLANTS = {
    # ── Tier 1 — bootstrap floor (free / fast) ─────────────────────────────
    "spirit_mint": {
        "name":     "Spirit Mint",
        "palette":  "pale green (#8fc99a, #b6e2bf, #c8efcf) leaves, soft white (#f6fbf3) blossoms when ripe, faint cool jade tint",
        "identity": (
            "the most basic spiritual herb a cultivator grows — a hardy common mint "
            "that grows quickly in spirit-rich soil. Small soft mint-like paired leaves, "
            "tiny white five-petal blossoms at ripeness"
        ),
    },
    "cinnabar_bloom": {
        "name":     "Cinnabar Bloom",
        "palette":  "red-orange (#d04a30, #e8744a) petals with ochre (#c98a3b, #b87324) leaves, warm earth tones",
        "identity": (
            "a fiery low-tier herb tied to the first inner-fire taste a cultivator "
            "experiences. Sharp pointed orange-red leaves, a single large vermilion "
            "five-petal bloom at ripeness with a golden centre"
        ),
    },
    # ── Tier 2 — modest commitment ──────────────────────────────────────────
    "jade_lotus_bud": {
        "name":     "Jade Lotus Bud",
        "palette":  "jade green (#5fa67a, #8fcfa5) leaves and stem, bone-white (#f4ecd6) closed bud, warm gold (#e6b860) accent at the bud base",
        "identity": (
            "the first cultivator's flower, a calm and contemplative lotus that grows "
            "from a single tight bud into a fully opened pale flower. Broad round "
            "lily-pad leaves, a single elongated closed bud that opens into a flat "
            "many-petalled lotus at ripeness"
        ),
    },
    "moonleaf_vine": {
        "name":     "Moonleaf Vine",
        "palette":  "silver-blue (#a8c0d6, #c8d8e8) crescent leaves on a pale violet (#b39ecb, #d4c2e6) climbing vine, cool moonlight tones",
        "identity": (
            "a yin-energy climbing vine whose crescent leaves catch moonlight. Twisting "
            "stem with paired crescent-shaped silver-blue leaves, small pale violet "
            "five-petal flowers and a few silvery seedpods at ripeness"
        ),
    },
    # ── Tier 3 — long grow ─────────────────────────────────────────────────
    "dragonscale_ginseng": {
        "name":     "Dragonscale Ginseng",
        "palette":  "warm amber (#c69254, #e0b478) scaled root, deep brown (#5a3c1d, #7a5230) leaves with three-finger lobes, coveted look",
        "identity": (
            "a brittle and coveted ginseng whose taproot is scaled like a dragon's body. "
            "A few three-lobed dark-brown leaves at the top, the prized scaled amber "
            "taproot becoming progressively more visible from stage to stage, fully "
            "exposed and curled at ripeness"
        ),
    },
    "phoenix_tail_grass": {
        "name":     "Phoenix Tail Grass",
        "palette":  "vermilion (#c8362a, #e25640) and warm gold (#e8b830, #f5d068) long fronds, fiery feather-like fronds",
        "identity": (
            "a tall grass whose long fronds look like a phoenix's tail feathers. "
            "Multiple long arching fronds in fiery red-and-gold, stiffly upright, "
            "burns if cropped too late. At ripeness the fronds split into feather-like "
            "tips with golden glowing seed nodes"
        ),
    },
    # ── Tier 4 LOCKED — almanac teasers ─────────────────────────────────────
    "gold_crown_peony": {
        "name":     "Gold Crown Peony",
        "palette":  "bright gold (#f1c542, #fcdc80) petals with ivory (#f3eadc) accents, deep ochre (#a47e30) leaves, imperial wealth look",
        "identity": (
            "an imperial wealth-herb with a single huge gold-petalled peony bloom. "
            "Lobed dark green leaves on a thick stem, a tight bud that opens into "
            "a many-petalled cup of gold at ripeness — the very crown of wealth"
        ),
    },
    "black_iron_reed": {
        "name":     "Black Iron Reed",
        "palette":  "charcoal (#2c2e36, #46494f) reed stalks with steel-blue (#5a6a85, #7e91ad) leaf edges and cold metallic glints",
        "identity": (
            "a hard-stemmed iron reed that grows from cracked earth and is used in "
            "armor pills. Straight stiff charcoal stalks with narrow steel-blue-edged "
            "leaves, dark seed nodes that glint metallically at ripeness"
        ),
    },
    "heaven_pierce_bamboo": {
        "name":     "Heaven Pierce Bamboo",
        "palette":  "translucent jade green (#7fc4a6, #aee0c9) culm with white (#f6fbf3) knots and rings, swift growth feel",
        "identity": (
            "a swift-growing bamboo whose translucent jade culm grows visibly between "
            "stages, segmented by white knot rings. Few thin leaves clustered at "
            "the upper segments, no flower — at ripeness the topmost segment is "
            "ready to be cut as the harvestable part"
        ),
    },
    "soul_lily": {
        "name":     "Soul Lily",
        "palette":  "pale blue (#a8c4d8, #d4e2ee) petals with bone-white (#f4ecd6) and violet (#9b7bc3, #b89adb) glow, soul-tempering aura",
        "identity": (
            "a faintly luminous lily used in soul-tempering pills. Slender pale stem, "
            "narrow leaves, a single drooping trumpet-shaped lily flower at ripeness "
            "in pale blue with violet veining and a soft glow around the bloom"
        ),
    },
}

PLANT_ORDER = list(PLANTS.keys())

# ─────────────────────────────────────────────────────────────────────────────
# HTTP helpers (mirrors gen_crystals.py pattern)
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
    raise TimeoutError(f"Job {job_id} timed out after {max_wait}s")

def decode_b64(b64):
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    return base64.b64decode(b64)

def save_image(img_obj, path):
    if img_obj.get("type") == "rgba_bytes":
        Image.frombytes(
            "RGBA",
            (img_obj["width"], img_obj["height"]),
            decode_b64(img_obj["base64"]),
        ).save(str(path))
    else:
        Path(path).write_bytes(decode_b64(img_obj["base64"]))

# ─────────────────────────────────────────────────────────────────────────────
# Prompt builders
# ─────────────────────────────────────────────────────────────────────────────

def prompt_multistage(plant):
    """
    2x2 mode prompt: asks for FOUR growth stages of the same plant.
    PixelLab returns 4 candidates per 128x128 call; if the model
    cooperates each candidate maps to one stage.

    The prompt deliberately AVOIDS frame labels like "FRAME 1:" because
    PixelLab bakes that text into the rendered pixels (lesson_pixellab_
    no_caption_labels). Instead we describe the four stages in plain
    prose and ask the model to produce one per candidate.
    """
    stages_block = "\n".join(
        f"  - stage {i+1} ({s}): {STAGE_PROMPTS[s]}"
        for i, s in enumerate(STAGES)
    )
    return (
        f"{plant['name']} — {plant['identity']}. "
        f"Palette: {plant['palette']}. "
        f"\n\n"
        f"Generate four pixel art sprites of the same {plant['name']} plant at "
        f"four progressive growth stages. The four stages are:\n"
        f"{stages_block}\n\n"
        f"Each of the four candidates returned should depict a DIFFERENT stage "
        f"from the list above, not four variations of the same stage. The plant "
        f"species, palette, and silhouette identity remain consistent across "
        f"the four stages — only its size, complexity, and harvestable-readiness "
        f"change. "
        f"{STYLE_ANCHOR}"
    )

def prompt_single_stage(plant, stage):
    """
    Chain mode prompt: ONE specific stage of the plant. The previous
    finalized stage (if any) is attached as reference_images + style_image
    so the family stays visually consistent across stages.
    """
    return (
        f"{plant['name']} — {plant['identity']}. "
        f"Palette: {plant['palette']}. "
        f"\n\n"
        f"This sprite depicts the {stage} stage: {STAGE_PROMPTS[stage]}. "
        f"Same species and palette as the reference, at this earlier/later "
        f"stage of growth. "
        f"{STYLE_ANCHOR}"
    )

# ─────────────────────────────────────────────────────────────────────────────
# Generation modes
# ─────────────────────────────────────────────────────────────────────────────

def generate_2x2(plant_id):
    """
    One call to PixelLab at 128x128. Asks for 4 stages in 4 candidates.
    Saves all candidates to tmp/plant_gen/<plant_id>/cand_0..3.png so the
    operator can review which candidate maps to which stage.

    Returns the candidate count (typically 4).
    """
    plant = PLANTS[plant_id]
    tmp = TMP_DIR / plant_id
    tmp.mkdir(parents=True, exist_ok=True)

    desc = prompt_multistage(plant)

    print(f"\n{'='*60}")
    print(f"  Generating: {plant_id}  (mode=2x2, 128x128, 1 call)")
    print(f"  Will return up to 4 candidates — each SHOULD be one stage.")
    print(f"{'='*60}")
    print(f"  Prompt preview:")
    print(f"  {desc[:300]}...")
    print()

    body = {
        "description":   desc,
        "image_size":    {"width": 128, "height": 128},
        "no_background": True,
    }

    status, r = api_post("/generate-image-v2", body)
    if status != 202:
        raise RuntimeError(f"generate-image-v2 returned {status}: {r}")

    result = poll_job(r["background_job_id"])
    images = result.get("last_response", {}).get("images", [])
    if not images:
        raise RuntimeError("No images returned")

    print(f"\n  Saved {len(images)} candidate(s) to {tmp.relative_to(PROJECT_ROOT)}:")
    for i, img in enumerate(images):
        path = tmp / f"cand_{i}.png"
        save_image(img, path)
        print(f"    cand_{i}: {path.name}  ({img['width']}x{img['height']})")

    print(f"\n  Review the candidates. Then run:")
    print(f"    python scripts/gen_plants.py finalize {plant_id} --order 0,1,2,3")
    print(f"  (the --order maps candidate-index -> stage. Default 0,1,2,3 means")
    print(f"   cand_0=seed, cand_1=sprout, cand_2=growing, cand_3=ripe.")
    print(f"   Change it if PixelLab returned stages in a different order.)")
    return len(images)


def generate_chain_stage(plant_id, stage):
    """
    Chain-mode: generate ONE stage of the plant. References the previous
    finalized stage as style + content reference, so the family stays
    coherent. Each call is 20 credits, total of 4 calls per plant.
    """
    plant = PLANTS[plant_id]
    tmp = TMP_DIR / plant_id
    tmp.mkdir(parents=True, exist_ok=True)

    # Reference = the previous stage's finalized PNG, if it exists
    prev_finalized = None
    idx = STAGES.index(stage)
    if idx > 0:
        prev_stage = STAGES[idx - 1]
        candidate = tmp / f"chain_{prev_stage}.png"
        if candidate.exists():
            prev_finalized = candidate

    desc = prompt_single_stage(plant, stage)

    print(f"\n{'='*60}")
    print(f"  Generating: {plant_id} / stage={stage}  (mode=chain, 128x128, 1 call)")
    if prev_finalized:
        print(f"  Reference:  {prev_finalized.name}")
    else:
        print(f"  Reference:  (none — this is the first stage in the chain)")
    print(f"{'='*60}")

    body = {
        "description":   desc,
        "image_size":    {"width": 128, "height": 128},
        "no_background": True,
    }

    if prev_finalized:
        ref_b64  = base64.b64encode(prev_finalized.read_bytes()).decode()
        ref_img  = {"type": "base64", "base64": ref_b64, "format": "png"}
        rw, rh   = Image.open(prev_finalized).size
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

    # Save every candidate, then user picks (default = cand_0) by writing
    # the picked one to chain_<stage>.png which the next chain step reads.
    print(f"\n  Saved {len(images)} candidate(s) to {tmp.relative_to(PROJECT_ROOT)}:")
    for i, img in enumerate(images):
        path = tmp / f"chain_{stage}_cand_{i}.png"
        save_image(img, path)
        print(f"    cand_{i}: {path.name}  ({img['width']}x{img['height']})")

    print(f"\n  Pick the best one and copy it to chain_{stage}.png:")
    print(f"    cp {tmp}/chain_{stage}_cand_0.png {tmp}/chain_{stage}.png")
    print(f"  Then run the next stage (or finalize if this was 'ripe').")
    return len(images)

# ─────────────────────────────────────────────────────────────────────────────
# Finalize — compose the 2x2 sheet from 4 picked candidates
# ─────────────────────────────────────────────────────────────────────────────

def trim_alpha(img):
    """Crop fully-transparent border rows/columns from an RGBA image."""
    w, h = img.size
    px = img.load()
    def col_has(x): return any(px[x, y][3] > 10 for y in range(h))
    def row_has(y): return any(px[x, y][3] > 10 for x in range(w))
    left  = next((x for x in range(w)         if col_has(x)), 0)
    right = next((x for x in range(w-1, -1, -1) if col_has(x)), w - 1)
    top   = next((y for y in range(h)         if row_has(y)), 0)
    bot   = next((y for y in range(h-1, -1, -1) if row_has(y)), h - 1)
    return img.crop((left, top, right + 1, bot + 1))

def fit_into_quadrant(stage_img):
    """Scale + centre an arbitrary-shape sprite into a 64x64 quadrant."""
    cropped = trim_alpha(stage_img)
    cw, ch = cropped.size
    scale = min(QUAD_SIZE / cw, QUAD_SIZE / ch) if cw > 0 and ch > 0 else 1
    new_w, new_h = max(1, int(cw * scale)), max(1, int(ch * scale))
    resized = cropped.resize((new_w, new_h), Image.LANCZOS)

    quad = Image.new("RGBA", (QUAD_SIZE, QUAD_SIZE), (0, 0, 0, 0))
    off = ((QUAD_SIZE - new_w) // 2, (QUAD_SIZE - new_h) // 2)
    quad.paste(resized, off, resized)
    return quad

def finalize_2x2(plant_id, order):
    """
    Compose a 128x128 sprite sheet from 4 candidates.
    `order` is a list of 4 candidate indices, in stage order (seed,
    sprout, growing, ripe). E.g. order=[0,1,2,3] means cand_0 is seed,
    cand_1 is sprout, etc.
    """
    if len(order) != 4:
        raise ValueError("--order must be exactly 4 candidate indices (one per stage)")

    tmp = TMP_DIR / plant_id
    if not tmp.exists():
        raise RuntimeError(f"No candidates found at {tmp} — run generate first")

    sheet = Image.new("RGBA", (SHEET_SIZE, SHEET_SIZE), (0, 0, 0, 0))
    for stage, cand_idx in zip(STAGES, order):
        cand_path = tmp / f"cand_{cand_idx}.png"
        if not cand_path.exists():
            raise FileNotFoundError(f"Missing candidate: {cand_path}")
        stage_img = Image.open(cand_path).convert("RGBA")
        quad = fit_into_quadrant(stage_img)
        sheet.paste(quad, QUAD_POSITIONS[stage], quad)
        print(f"  {stage:8s} <- cand_{cand_idx}.png  ->  quadrant {QUAD_POSITIONS[stage]}")

    out_path = OUT_DIR / f"{plant_id}.png"
    sheet.save(str(out_path))
    print(f"\n  Wrote {out_path.relative_to(PROJECT_ROOT)} (128x128, 4-stage sheet)")

def finalize_chain(plant_id):
    """
    Compose the 128x128 sheet from the four chain_<stage>.png files
    produced by chain-mode generation.
    """
    tmp = TMP_DIR / plant_id
    if not tmp.exists():
        raise RuntimeError(f"No chain output found at {tmp}")

    sheet = Image.new("RGBA", (SHEET_SIZE, SHEET_SIZE), (0, 0, 0, 0))
    for stage in STAGES:
        stage_path = tmp / f"chain_{stage}.png"
        if not stage_path.exists():
            raise FileNotFoundError(
                f"Missing chain stage: {stage_path}\n"
                f"Run: python scripts/gen_plants.py generate {plant_id} "
                f"--mode chain --stage {stage}\n"
                f"Then copy your picked candidate to chain_{stage}.png"
            )
        stage_img = Image.open(stage_path).convert("RGBA")
        quad = fit_into_quadrant(stage_img)
        sheet.paste(quad, QUAD_POSITIONS[stage], quad)
        print(f"  {stage:8s} <- chain_{stage}.png  ->  quadrant {QUAD_POSITIONS[stage]}")

    out_path = OUT_DIR / f"{plant_id}.png"
    sheet.save(str(out_path))
    print(f"\n  Wrote {out_path.relative_to(PROJECT_ROOT)} (128x128, 4-stage sheet)")

# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def cmd_generate(args):
    if args.plant not in PLANTS:
        raise ValueError(f"Unknown plant '{args.plant}'. Known: {PLANT_ORDER}")
    if args.mode == "2x2":
        generate_2x2(args.plant)
    elif args.mode == "chain":
        if not args.stage:
            raise ValueError("chain mode requires --stage (seed|sprout|growing|ripe)")
        generate_chain_stage(args.plant, args.stage)
    else:
        raise ValueError(f"unknown mode {args.mode}")

def cmd_generate_all(args):
    skipped = []
    for pid in PLANT_ORDER:
        if (OUT_DIR / f"{pid}.png").exists():
            skipped.append(pid)
            print(f"[skip] {pid} already finalized")
            continue
        try:
            if args.mode == "2x2":
                generate_2x2(pid)
            else:
                for s in STAGES:
                    generate_chain_stage(pid, s)
        except Exception as e:
            print(f"[FAIL] {pid}: {e}")
            return
    print(f"\n{len(PLANT_ORDER) - len(skipped)} plants generated, {len(skipped)} skipped")

def cmd_finalize(args):
    if args.plant not in PLANTS:
        raise ValueError(f"Unknown plant '{args.plant}'.")
    if args.mode == "2x2":
        order = [int(x) for x in args.order.split(",")]
        finalize_2x2(args.plant, order)
    elif args.mode == "chain":
        finalize_chain(args.plant)

def cmd_list(_args):
    print(f"\nPlant catalogue ({len(PLANTS)} plants):\n")
    for pid in PLANT_ORDER:
        p = PLANTS[pid]
        print(f"  {pid:24s}  {p['name']}")
    print(f"\nFinalized: {len(list(OUT_DIR.glob('*.png')))} in {OUT_DIR.relative_to(PROJECT_ROOT)}")

def build_parser():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    pg = sub.add_parser("generate", help="generate candidates for one plant")
    pg.add_argument("plant", help=f"plant id ({', '.join(PLANT_ORDER)})")
    pg.add_argument("--mode", choices=["2x2", "chain"], default="2x2")
    pg.add_argument("--stage", choices=list(STAGES), help="stage for chain mode")
    pg.set_defaults(func=cmd_generate)

    pga = sub.add_parser("generate-all", help="generate candidates for every un-finalized plant in the catalogue")
    pga.add_argument("--mode", choices=["2x2", "chain"], default="2x2")
    pga.set_defaults(func=cmd_generate_all)

    pf = sub.add_parser("finalize", help="compose the final 128x128 sprite sheet for one plant")
    pf.add_argument("plant", help=f"plant id ({', '.join(PLANT_ORDER)})")
    pf.add_argument("--mode", choices=["2x2", "chain"], default="2x2")
    pf.add_argument("--order", default="0,1,2,3", help="candidate->stage mapping for 2x2 mode (default 0,1,2,3 = seed,sprout,growing,ripe)")
    pf.set_defaults(func=cmd_finalize)

    pl = sub.add_parser("list", help="show the plant catalogue and what's been finalized")
    pl.set_defaults(func=cmd_list)

    return p

def main():
    args = build_parser().parse_args()
    args.func(args)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
