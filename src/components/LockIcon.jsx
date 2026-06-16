const BASE = import.meta.env.BASE_URL;

// Pixel-art lock glyph that replaces the 🔒 emoji in locked-state UI.
// image-rendering follows the global Settings → Rendering toggle
// (.rendering-pixelated img in App.css); never hardcode it here.
export default function LockIcon({ size = 16, className, style }) {
  return (
    <img
      src={`${BASE}ui/lock.png`}
      alt=""
      draggable="false"
      className={className}
      style={{ width: size, height: size, objectFit: 'contain', verticalAlign: 'middle', ...style }}
    />
  );
}
