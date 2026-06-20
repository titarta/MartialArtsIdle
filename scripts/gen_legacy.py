"""
gen_legacy.py — "Founding Sovereign" legacy cosmetic skin (earthly gold emperor).

Revives the original character (recovered from git: state1.png) as a full 13-tier
cultivator skin that stays an EARTHLY gold-dragon emperor at every realm — it
escalates in regalia (gold, dragons, crown, cape) but never morphs cosmic, and
the WHOLE figure always stays inside the frame (no cropping).

Anchor = the recovered original art, placed at t8_origin_king (its gold + cape +
detail read as a late tier). Every other tier is generated with that anchor as the
identity reference. Focused pose = the SAME sprite with the eyes blazing fiery
amber-gold — nothing else.

Identity is locked HARD to the original: a mature serene face (calm rounded jaw,
gentle closed-eyes meditation), black hair parted in the middle with two face-
framing locks gathered into a topknot under a black cap + gold hairpin (NOT loose).
Hands rest EMPTY in the lap. There is NO recurring medallion/gem — the round chest
detail belongs only to the original suit, not to other tiers.

Pipeline (per tier):
  gen-normal <tier> | pick-normal <tier> <N> | gen-focused <tier> | pick-focused <tier> <N>
  gen-all-normals | gen-all-focused   (resumable batch: skips anchor + existing)
Output:     public/sprites/cultivator/skins/legacy/<tier>_<pose>.png (256x256 RGBA)
Candidates: tmp/legacy_skin/<tier>_<pose>_cand_N.png
"""

import json, base64, time, sys
from pathlib import Path
import urllib.request, urllib.error
from PIL import Image

API_KEY     = "886d28c4-fb31-429d-832e-1242e312160e"
BASE_URL    = "https://api.pixellab.ai/v2"
ROOT        = Path(__file__).parent.parent
OUT_DIR     = ROOT / "public/sprites/cultivator/skins/legacy"
TMP_DIR     = ROOT / "tmp/legacy_skin"
ANCHOR_TIER = "t10_dao_source"                        # the recovered original art (its grand look = T10)
REF_PATH    = OUT_DIR / f"{ANCHOR_TIER}_normal.png"   # PALETTE/style reference for all tiers
CANVAS      = 256
OUT_DIR.mkdir(parents=True, exist_ok=True)
TMP_DIR.mkdir(parents=True, exist_ok=True)

if hasattr(sys.stdout, "reconfigure"): sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"): sys.stderr.reconfigure(encoding="utf-8")

# ── HTTP helpers ──────────────────────────────────────────────────────────────
def _headers(): return {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

def api_post(path, body):
    data = json.dumps(body).encode()
    req  = urllib.request.Request(f"{BASE_URL}{path}", data=data, headers=_headers())
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.load(resp)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code} on {path}: {e.read().decode()[:600]}") from e

def api_get(path):
    req = urllib.request.Request(f"{BASE_URL}{path}", headers=_headers())
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)

def poll_job(job_id, max_wait=1500):
    print(f"    polling {job_id[:8]}...", end="", flush=True)
    for _ in range(max_wait // 5):
        time.sleep(5)
        r = api_get(f"/background-jobs/{job_id}")
        if r.get("status") == "completed": print(" done"); return r
        if r.get("status") == "failed":    raise RuntimeError(f"Job failed: {r}")
        print(".", end="", flush=True)
    raise TimeoutError(f"Job {job_id} timed out after {max_wait}s")

def decode_b64(b64):
    if "," in b64: b64 = b64.split(",", 1)[1]
    return base64.b64decode(b64)

def save_image(img_obj, path):
    if img_obj.get("type") == "rgba_bytes":
        Image.frombytes("RGBA", (img_obj["width"], img_obj["height"]),
                        decode_b64(img_obj["base64"])).save(str(path))
    else:
        Path(path).write_bytes(decode_b64(img_obj["base64"]))

def crop_transparent_edges(img):
    if img.mode != "RGBA": img = img.convert("RGBA")
    w, h = img.size; px = img.load()
    def row(y): return any(px[x, y][3] > 4 for x in range(w))
    def col(x): return any(px[x, y][3] > 4 for y in range(h))
    left  = next((x for x in range(w)        if col(x)), 0)
    right = next((x for x in range(w-1,-1,-1) if col(x)), w-1)
    top   = next((y for y in range(h)        if row(y)), 0)
    bot   = next((y for y in range(h-1,-1,-1) if row(y)), h-1)
    return img.crop((left, top, right+1, bot+1))

def pad_to_canvas(img, side=CANVAS, max_w=0.90, max_h=0.93):
    """Bottom-anchor + centre the figure, scaled DOWN so it leaves margin on the
    top and both sides (the base sits at the bottom). Guarantees no edge-touch."""
    if img.mode != "RGBA": img = img.convert("RGBA")
    cw, ch = img.size
    scale = min(side * max_w / cw, side * max_h / ch, 1.0)   # shrink only, never enlarge
    if scale < 1.0:
        img = img.resize((max(1, round(cw*scale)), max(1, round(ch*scale))), Image.NEAREST)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    cw, ch = img.size
    canvas.paste(img, ((side - cw) // 2, side - ch), img)
    return canvas

def encode_reference(path, usage=None):
    b64 = base64.b64encode(path.read_bytes()).decode()
    rw, rh = Image.open(path).size
    d = {"image": {"type": "base64", "base64": b64, "format": "png"},
         "size": {"width": rw, "height": rh}}
    if usage: d["usage_description"] = usage
    return d

# ── Shared prompt anchors ─────────────────────────────────────────────────────
S = ("Xianxia pixel art, 16-bit clean lines, limited palette. Fully transparent "
     "background. The emperor is the SOLE subject — no seat, no throne, no pedestal, "
     "no scenery, no props. No UI, no text, no drop shadow.")

# The unchanging identity through-line — keep IDENTICAL on every tier.
CORE = ("SAME man every tier, kept IDENTICAL: a mature, serene, dignified face — calm "
        "rounded jaw, soft cheekbones, gentle CLOSED-eyes meditation with the faintest "
        "calm smile, clean-shaven. His skin is a warm TAN and his hair is JET BLACK — "
        "keep that EXACT skin tone and hair colour on every single tier (never paler "
        "skin, never lighter, browner or different-coloured hair). Hair PARTED IN THE "
        "MIDDLE, two locks framing the face to the jaw, the rest in a topknot held by a "
        "BLACK CAP (a Chinese guan) with a horizontal GOLD-TIPPED HAIRPIN through it — "
        "this black cap + hairpin is ALWAYS worn on EVERY tier, never bare-headed. Hair "
        "NOT loose, NOT flowing down the chest. Seated cross-legged in lotus, hovering "
        "(no seat), facing the camera, back straight, BOTH hands resting EMPTY in the "
        "lap, palms up, holding nothing. Only his robe, armour and cape change.")

# In-frame composition — the recurring failure mode was capes blowing out of frame.
FRAME = ("Compose the WHOLE figure (crown, shoulders, robe, cape) INSIDE the frame "
         "with clear margin at the TOP and SIDES (base may sit at the bottom). NOTHING "
         "cropped, nothing touching the top or side edges. Keep the cape contained, "
         "never oversized, never spilling past the edges.")

NO_FX = ("No external qi: no halo, no floating orbs, no motes, no glyph rings, no glow "
         "past the silhouette (qi VFX are separate layers). No held object, no "
         "medallion or gem in or near the hands.")

FOC_NEG = ("Do NOT change the robe, cap, armour, cape, hands or face — ONLY the eyes "
           "change. No spiral, no vortex, no motes, no particles, no halo, no rings, "
           "no beams, no aura past the silhouette.")

def design(desc):
    return (f"Xianxia cultivator-emperor pixel-art sprite. This tier: {desc} "
            f"{CORE} {FRAME} {NO_FX} {S}")

def design_up(desc):
    """Leaner wrapper for tiers ABOVE the anchor (t11/t12): the references + style_image
    already lock identity/colour/style hard, so the text needs only the grander-regalia
    desc plus a compact identity+colour reminder, framing and the no-FX/scene rules."""
    return (f"Xianxia cultivator-emperor pixel-art sprite. This tier: {desc} "
            f"SAME man as the reference image: serene tan face, jet-black hair, black guan "
            f"cap with gold hairpin, seated cross-legged and hovering with the robe draped "
            f"OVER the lap and knees (the legs stay hidden UNDER the robe, never poking in "
            f"front), both hands resting EMPTY in the lap. Keep the EXACT dark-navy / gold "
            f"/ crimson palette and the "
            f"pixel-art style, density and detail of the reference. {FRAME} {NO_FX} {S}")

def focused(label):
    return (f"Same {label} as the reference image — identical robe, cap, armour, cape, "
            f"empty resting hands, face and silhouette. The ONLY change: the closed "
            f"eyes blaze with fiery amber-gold light through the eyelids (eyes shut but "
            f"visibly glowing), a faint warm cast on the brow. {FOC_NEG} {S}")

# ── 13-tier earthly-emperor escalation (anchor = t8, the original art) ─────────
# Dark navy-black robe throughout. No recurring medallion. Grandeur via gold detail,
# crown height and pauldrons — NOT bigger capes (capes stay contained).
LEGACY = {
  "t0_novice":            {"label": "humble founder",
    "desc": ("a clean, elegant dark-indigo silk robe with a crisp layered cross-"
             "collar, a neat woven waist sash, well-defined silk folds and clean "
             "shading; a simple black scholar's cap with a plain hairpin over the "
             "topknot. Dignified and handsome though humble — never ragged, never a "
             "shapeless drab robe. No gold, no armour, no cape.")},
  "t1_qi_transformation": {"label": "minor lord",
    "desc": ("a refined dark-navy silk robe with a layered cross-collar, a woven "
             "waist sash and a single restrained gold-thread hem at the collar; crisp "
             "silk folds and clean shading; the black cap with a small jade-tipped "
             "hairpin. Elegant and composed, still no shoulder armour and no cape.")},
  "t2_true_element":      {"label": "rising official",
    "desc": ("the same dark-navy silk robe, now with a gold-trimmed collar and cuffs "
             "and a woven sash bordered in gold — clearly a step richer than the "
             "single gold sash-thread of the tier below; clean silk folds; the black "
             "cap with a small gold band and gold-tipped hairpin. NAVY AND GOLD ONLY, "
             "no green of any kind, no pauldrons or cape yet.")},
  "t3_separation":        {"label": "provincial lord",
    "desc": ("the dark-navy robe now bearing the FIRST small gold dragon on the chest "
             "and small gold shoulder accents, plus a SHORT contained CRIMSON cape "
             "appearing for the first time (the crimson he will wear at his peak); the "
             "black cap with gold band and gold-tipped hairpin. A clear step up from "
             "the plain official below.")},
  "t4_immortal_ascension":{"label": "ascendant prince",
    "desc": ("KEEP the tier below (the reference) EXACTLY as it is — same robe, same "
             "colours, same cap, same cape, same everything — and ADD ONLY a few thin "
             "gold borders / trim along the robe's collar, cuffs and hem. One small "
             "addition; nothing else changes.")},
  "t5_saint":             {"label": "saint",
    "desc": ("KEEP the reference EXACTLY as it is and ADD ONLY small inner gold "
             "shoulder pads (subtle flat gold plates on the shoulders). Same robe, "
             "colours, cap, cape and borders — one small addition, nothing else.")},
  "t6_saint_king":        {"label": "saint king",
    "desc": ("KEEP the reference EXACTLY as it is and ADD ONLY gold forearm guards / "
             "bracers on both lower arms. Same robe, colours, cap, cape and shoulders "
             "— one small addition, nothing else changes.")},
  "t7_origin_returning":  {"label": "origin returning",
    "desc": ("KEEP the reference EXACTLY as it is and ADD ONLY a raised gold chest "
             "ornament (the chest dragon becoming an embossed gold plate). Same robe, "
             "colours, cap, cape, shoulders and arms — one small addition, nothing "
             "else.")},
  "t8_origin_king":       {"label": "origin king",
    "desc": ("KEEP the reference EXACTLY as it is and ADD ONLY a step up on the "
             "shoulders: the pads grow into small rounded gold pauldrons. Same robe, "
             "colours, cap and cape — one small addition, nothing else changes.")},
  "t9_void_king":         {"label": "near-emperor",
    "desc": ("KEEP the reference EXACTLY as it is and ADD ONLY a dragon-head shape to "
             "the gold pauldrons — now ALMOST the full emperor. Same robe, colours, "
             "cap and cape — one small addition, nothing else changes.")},
  "t10_dao_source":       {"label": "gold dragon emperor",
    "desc": ("the full gold-dragon emperor: gold dragon-head pauldrons, ornate gold "
             "chest ornament, dark-navy robe, crimson cape, black cap with gold-tipped "
             "hairpin.")},
  "t11_emperor_realm":    {"label": "supreme emperor",
    "desc": ("a clear GRANDER step ABOVE the gold-dragon emperor (the reference): the "
             "gold dragon-head pauldrons grow larger and more ornate with curling horns "
             "and whiskers; the gold chest dragon becomes a fuller coiled gold relief; "
             "the black guan cap is now crowned with ornate gold filigree (still the "
             "SAME black cap, gilded and a touch taller); ornate gold bracers on both "
             "forearms; a band of gold dragon-motif embroidery along the crimson cape's "
             "edge. Use the EXACT same dark-navy robe, gold and crimson colours as the "
             "reference — ADD only richer gold ornament, change NO colour.")},
  "t12_open_heaven":      {"label": "open-heaven emperor",
    "desc": ("his absolute peak: a near fully gold-dragon-scaled sovereign. KEEP "
             "EVERYTHING from the reference: the dragon-head pauldrons, the gold "
             "chestplate, the gold-edged crimson cape. TWO upgrades only. (1) The gold "
             "crest on the black cap grows a little larger and more detailed, slightly "
             "richer and wider, but the SAME height (NOT taller). (2) FILL every "
             "remaining dark-navy robe surface with GOLD DRAGON SCALES: the upper arms "
             "and sleeves, the draped lap and knees, and the small central navy panel "
             "between the crossed legs ALL become overlapping gold dragon-scale brocade, "
             "reverse-carved so the dark navy shows ONLY as thin seams between chunky "
             "pixelated gold scales. The robe now reads mostly GOLD, navy only in the "
             "seams; scales lie flat on the draped robe. Same palette and pixel density; "
             "same size.")},
}
TIER_ORDER = list(LEGACY.keys())

# Tiers ABOVE the anchor (t11/t12) build grander regalia UP from the tier below, but
# pin palette + art style HARD to the t10 emperor so colours/detail/density never drift.
STYLE_OPTS = {"color_palette": True, "outline": True, "detail": True, "shading": True}
UP_USAGE = ("Identity + COLOUR + STYLE floor: KEEP this exact man (face, jet-black hair, "
            "black guan cap + gold hairpin), the EXACT dark-navy robe colour, gold colour "
            "and crimson cape colour, the same pixel-art style, pixel density and level of "
            "detail. Build UPWARD from here — ADD grander, more ornate gold dragon regalia; "
            "change NO colour, drop nothing that already exists.")
COLOR_ANCHOR_USAGE = ("COLOUR + STYLE anchor: match this image's EXACT dark-navy / gold / "
            "crimson palette, pixel density and detail level. Take colours and art style "
            "from here; take the grander regalia structure from the other reference.")

# ── Pipeline ──────────────────────────────────────────────────────────────────
def _check(tier):
    if tier not in LEGACY: raise ValueError(f"Unknown tier '{tier}'. Known: {TIER_ORDER}")

def _gen(tier, pose, prompt, refs, style, ref_label="", style_options=None):
    print(f"\n{'='*60}\n  Legacy {tier} {pose.upper()}  ({CANVAS}x{CANVAS})\n{'='*60}")
    print(f"  Reference: {ref_label}\n  Prompt: {len(prompt)} chars (limit 2000)\n")
    if len(prompt) > 2000: raise ValueError(f"Prompt too long: {len(prompt)} chars")
    body = {"description": prompt, "image_size": {"width": CANVAS, "height": CANVAS},
            "no_background": True, "reference_images": refs, "style_image": style}
    if style_options: body["style_options"] = style_options
    status, r = api_post("/generate-image-v2", body)
    if status != 202: raise RuntimeError(f"generate-image-v2 returned {status}: {r}")
    images = poll_job(r["background_job_id"]).get("last_response", {}).get("images", [])
    if not images: raise RuntimeError("No images returned")
    print(f"\n  Saved {len(images)} candidate(s) to: {TMP_DIR}")
    for i, img in enumerate(images):
        p = TMP_DIR / f"{tier}_{pose}_cand_{i}.png"
        save_image(img, p); print(f"    cand_{i}: {p.name}  ({img['width']}x{img['height']})")
    print(f"\n  Review, then: python scripts/gen_legacy.py pick-{pose} {tier} <N>")

def _pick(tier, pose, n):
    src = TMP_DIR / f"{tier}_{pose}_cand_{n}.png"
    if not src.exists(): raise FileNotFoundError(f"Candidate not found: {src}")
    img = pad_to_canvas(crop_transparent_edges(Image.open(src).convert("RGBA")))
    out = OUT_DIR / f"{tier}_{pose}.png"; img.save(str(out))
    print(f"\n  cand_{n} -> {out.relative_to(ROOT)}  ({img.size[0]}x{img.size[1]} RGBA)")

def _chain_ref(tier):
    """The tier this one chains off — the tier BELOW it (we escalate upward, adding
    ornament). None for the bottom seed (t0), which has nothing below it."""
    i = TIER_ORDER.index(tier)
    return TIER_ORDER[i - 1] if i > 0 else None

def _chain_order():
    """Bottom-up escalation order so each tier's lower chain ref exists first; the
    anchor (original art) is skipped."""
    return [t for t in TIER_ORDER if t != ANCHOR_TIER]

def run_gen_normal(tier):
    _check(tier)
    if tier == ANCHOR_TIER: raise ValueError(f"{ANCHOR_TIER} is the anchor (original art) — do not generate it.")
    if not REF_PATH.exists(): raise FileNotFoundError(f"Anchor missing: {REF_PATH}")
    prev = _chain_ref(tier)
    if prev is None:
        # Bottom seed (t0): reference + style = the anchor; the humble prompt strips it.
        ref = encode_reference(REF_PATH)
        _gen(tier, "normal", design(LEGACY[tier]["desc"]), [ref], ref,
             ref_label=f"{ANCHOR_TIER} (seed: ref+style)")
        return
    prev_path = OUT_DIR / f"{prev}_normal.png"
    if not prev_path.exists():
        raise FileNotFoundError(f"chain reference {prev_path} missing — generate {prev} first.")
    if TIER_ORDER.index(tier) > TIER_ORDER.index(ANCHOR_TIER):
        # ABOVE the emperor (t11/t12): no ceiling — build grander regalia UP from the tier
        # below, but lock palette + style to the t10 anchor (style_image + color_palette).
        refs = [encode_reference(prev_path, usage=UP_USAGE)]
        if prev != ANCHOR_TIER:
            refs.append(encode_reference(REF_PATH, usage=COLOR_ANCHOR_USAGE))
        _gen(tier, "normal", design_up(LEGACY[tier]["desc"]), refs, encode_reference(REF_PATH),
             ref_label=f"build-up from {prev}_normal, colour/style anchor {ANCHOR_TIER}",
             style_options=STYLE_OPTS)
        return
    # PURE CHAIN: reference AND style = the tier directly below. The navy/gold/crimson
    # palette propagates through the chain (t0 was seeded from the anchor), so colours
    # stay on-target WITHOUT re-feeding the grand emperor each step — feeding the anchor
    # every step is what kept inflating the regalia (the t4/t6/t7 blowups).
    ref = encode_reference(prev_path)
    _gen(tier, "normal", design(LEGACY[tier]["desc"]), [ref], ref,
         ref_label=f"{prev}_normal (pure chain: reference + style)")

def run_gen_focused(tier):
    _check(tier)
    ref = OUT_DIR / f"{tier}_normal.png"
    if not ref.exists(): raise FileNotFoundError(f"Normal sprite missing: {ref}. gen+pick normal first.")
    r = encode_reference(ref)
    _gen(tier, "focused", focused(LEGACY[tier]["label"]), [r], r, ref_label=f"{tier}_normal (pose+identity)")

def run_all(pose, force=True):
    """Generate + auto-finalize cand_0 for the whole set IN CHAIN ORDER so each tier
    builds on its neighbour. force=True regenerates everything (needed for a cleanly
    chained set); the anchor's normal is always skipped (it is the original art)."""
    order = _chain_order() if pose == "normal" else list(TIER_ORDER)
    gen = run_gen_normal if pose == "normal" else run_gen_focused
    done, skip, fail = [], [], []
    for t in order:
        if pose == "normal" and t == ANCHOR_TIER: skip.append(t); continue
        out = OUT_DIR / f"{t}_{pose}.png"
        if out.exists() and not force: skip.append(t); continue
        try:
            gen(t); _pick(t, pose, 0); done.append(t)
        except Exception as e:
            print(f"  !! FAILED {t} {pose}: {e}"); fail.append(t)
    print(f"\n{'='*60}\n  BATCH {pose} done={done}\n  skipped={skip}\n  FAILED={fail}\n{'='*60}")

CMDS = {
    "gen-normal":      lambda a: run_gen_normal(a[0]),
    "pick-normal":     lambda a: _pick(a[0], "normal", int(a[1])),
    "gen-focused":     lambda a: run_gen_focused(a[0]),
    "pick-focused":    lambda a: _pick(a[0], "focused", int(a[1])),
    "gen-all-normals": lambda a: run_all("normal"),
    "gen-all-focused": lambda a: run_all("focused"),
    "prompt":          lambda a: print(design(LEGACY[a[0]]["desc"]) if len(a) else "\n".join(TIER_ORDER)),
}

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in CMDS:
        print(__doc__); print("Commands:", ", ".join(CMDS)); sys.exit(1)
    CMDS[sys.argv[1]](sys.argv[2:])
