import RecordEditor from './RecordEditor.jsx';
import REALMS from '../../data/realms.js';
import realmsSchema from '../schemas/realms.js';

export default function RealmsEditor({ edited, onChangeRecords }) {
  return (
    <RecordEditor
      baselineRecords={REALMS}
      editedRecords={edited.records || {}}
      onChangeRecords={onChangeRecords}
      schema={realmsSchema}
      isArrayIndex={true}
      displayLabel={(rec, key) => `#${key} · ${rec.name} — ${rec.stage}`}
      allowAdd={false} /* realm indices are save-file identity */
    />
  );
}
