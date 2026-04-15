import { useState } from 'react';
import RecordEditor from './RecordEditor.jsx';
import SpriteUpload from '../SpriteUpload.jsx';
import ENEMIES from '../../data/enemies.js';
import enemiesSchemaBase from '../schemas/enemies.js';
import { spriteOptions } from '../enumSources.js';

export default function EnemiesEditor({ edited, onChangeRecords }) {
  // Sprites uploaded during this session aren't in the build-time glob yet.
  // Keep them in local state and merge into the dropdown options so the
  // designer can reference a sprite they just uploaded without reloading.
  const [sessionSprites, setSessionSprites] = useState(() => []);

  // Rebuild the schema with a sprite options provider that includes session uploads.
  const schema = enemiesSchemaBase.map((field) => {
    if (field.key === 'sprite') {
      return {
        ...field,
        options: () => {
          const base = spriteOptions();
          const known = new Set(base.map((o) => o.value));
          for (const s of sessionSprites) if (!known.has(s)) base.push({ value: s, label: `${s} (just uploaded)` });
          return base;
        },
      };
    }
    return field;
  });

  return (
    <div className="dz-enemies-editor">
      <RecordEditor
        baselineRecords={ENEMIES}
        editedRecords={edited.records || {}}
        onChangeRecords={onChangeRecords}
        schema={schema}
        displayLabel={(rec, key) => `${rec?.name ?? key}`}
        allowAdd={true}
        newIdPlaceholder="new_enemy_id"
        initialNewRecord={{ name: 'New Enemy', statMult: { hp: 1, atk: 1 }, drops: [] }}
      />
      <details className="dz-sprite-upload-wrap">
        <summary>Upload a new sprite pair</summary>
        <SpriteUpload onUploaded={(slug) => setSessionSprites((prev) => [...prev, slug])} />
      </details>
    </div>
  );
}
