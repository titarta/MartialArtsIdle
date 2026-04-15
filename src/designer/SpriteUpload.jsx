import { useState, useRef } from 'react';
import { putBinaryFile } from './github.js';
import { loadPat } from './pat.js';

/**
 * Upload a pair of sprite PNGs (idle + attack) for an enemy.
 *
 * Enemies use the convention `{base}-idle.png` and `{base}-attack.png` under
 * public/sprites/enemies/. The panel commits both files in two sequential
 * PUTs; on success it returns the shared base name so the Enemies editor
 * can set the enemy's `sprite` field.
 *
 * Files over 1 MiB are rejected client-side — GitHub Contents API caps
 * individual files at 100 MiB but pixel art shouldn't come close.
 */

const MAX_SIZE = 1024 * 1024; // 1 MiB per frame
const SPRITE_BASE_PATH = 'public/sprites/enemies';

export default function SpriteUpload({ onUploaded, disabled }) {
  const [idleFile,   setIdleFile]   = useState(null);
  const [attackFile, setAttackFile] = useState(null);
  const [baseName,   setBaseName]   = useState('');
  const [busy,       setBusy]       = useState(false);
  const [msg,        setMsg]        = useState(null);
  const idleInputRef   = useRef(null);
  const attackInputRef = useRef(null);

  const validPair = idleFile && attackFile && baseName.trim();

  const pickFile = (setFile) => (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.includes('png')) {
      setMsg({ type: 'error', text: `${f.name}: must be a PNG file.` });
      return;
    }
    if (f.size > MAX_SIZE) {
      setMsg({ type: 'error', text: `${f.name}: too large (${(f.size / 1024).toFixed(0)} KB). 1 MiB max.` });
      return;
    }
    setFile(f);
    setMsg(null);
  };

  const reset = () => {
    setIdleFile(null);
    setAttackFile(null);
    setBaseName('');
    setMsg(null);
    if (idleInputRef.current)   idleInputRef.current.value   = '';
    if (attackInputRef.current) attackInputRef.current.value = '';
  };

  const upload = async () => {
    const pat = loadPat();
    if (!pat) { setMsg({ type: 'error', text: 'Add a PAT in Settings first.' }); return; }
    const slug = slugify(baseName);
    if (!slug) { setMsg({ type: 'error', text: 'Invalid base name — use lowercase letters, numbers, dashes.' }); return; }

    setBusy(true);
    setMsg({ type: 'info', text: `Uploading ${slug}-idle.png…` });

    const idleBytes   = new Uint8Array(await idleFile.arrayBuffer());
    const attackBytes = new Uint8Array(await attackFile.arrayBuffer());

    const idleRes = await putBinaryFile(pat, {
      path:    `${SPRITE_BASE_PATH}/${slug}-idle.png`,
      bytes:   idleBytes,
      message: `design: add sprite ${slug}-idle.png`,
    });
    if (!idleRes.ok) {
      setBusy(false);
      setMsg({ type: 'error', text: failureMessage('idle', idleRes) });
      return;
    }

    setMsg({ type: 'info', text: `Uploading ${slug}-attack.png…` });
    const attackRes = await putBinaryFile(pat, {
      path:    `${SPRITE_BASE_PATH}/${slug}-attack.png`,
      bytes:   attackBytes,
      message: `design: add sprite ${slug}-attack.png`,
    });
    if (!attackRes.ok) {
      setBusy(false);
      setMsg({
        type: 'error',
        text: `idle upload succeeded but attack failed: ${failureMessage('attack', attackRes)} — the idle frame is live on GitHub; retry the attack upload or pick a different base name.`,
      });
      return;
    }

    setBusy(false);
    setMsg({
      type: 'success',
      text: `Uploaded ${slug}-idle.png + ${slug}-attack.png. Reload the designer to see "${slug}" in the sprite dropdown.`,
    });
    onUploaded?.(slug);
    reset();
  };

  return (
    <div className="dz-sprite-upload">
      <div className="dz-sprite-upload-header">
        <strong>Upload new sprite pair</strong>
        <span className="dz-form-help">
          Commits <code>{'{base}-idle.png'}</code> and <code>{'{base}-attack.png'}</code> to <code>{SPRITE_BASE_PATH}/</code>.
        </span>
      </div>

      <div className="dz-sprite-upload-row">
        <label className="dz-sprite-slot">
          <span className="dz-form-label">Idle frame</span>
          <input
            ref={idleInputRef}
            type="file"
            accept="image/png"
            disabled={disabled || busy}
            onChange={pickFile(setIdleFile)}
          />
          {idleFile && <FilePreview file={idleFile} />}
        </label>
        <label className="dz-sprite-slot">
          <span className="dz-form-label">Attack frame</span>
          <input
            ref={attackInputRef}
            type="file"
            accept="image/png"
            disabled={disabled || busy}
            onChange={pickFile(setAttackFile)}
          />
          {attackFile && <FilePreview file={attackFile} />}
        </label>
      </div>

      <label className="dz-form-row">
        <span className="dz-form-label">Base name</span>
        <input
          type="text"
          className="dz-input"
          value={baseName}
          onChange={(e) => setBaseName(e.target.value)}
          placeholder="lowercase-slug"
          disabled={disabled || busy}
        />
        <span className="dz-form-help">
          Used as the sprite enum value. Files will be named <code>{(slugify(baseName) || 'slug')}-idle.png</code> and <code>{(slugify(baseName) || 'slug')}-attack.png</code>.
        </span>
      </label>

      <div className="dz-sprite-upload-actions">
        <button
          className="dz-btn dz-btn-ghost"
          onClick={reset}
          disabled={busy || (!idleFile && !attackFile && !baseName)}
        >Clear</button>
        <button
          className="dz-btn dz-btn-primary"
          onClick={upload}
          disabled={disabled || busy || !validPair}
        >
          {busy ? 'Uploading…' : 'Upload pair'}
        </button>
      </div>

      {msg && <div className={`dz-msg dz-msg-${msg.type}`}>{msg.text}</div>}
    </div>
  );
}

function FilePreview({ file }) {
  const url = URL.createObjectURL(file);
  return (
    <div className="dz-sprite-preview">
      <img src={url} alt="" onLoad={() => URL.revokeObjectURL(url)} />
      <span className="dz-form-help">{file.name} · {(file.size / 1024).toFixed(1)} KB</span>
    </div>
  );
}

function slugify(name) {
  return name.trim().toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function failureMessage(which, res) {
  if (res.conflict) return `${which} upload rejected — a file with this name may already exist on GitHub. Pick a different base name.`;
  return `${which} upload failed (HTTP ${res.status}).`;
}
