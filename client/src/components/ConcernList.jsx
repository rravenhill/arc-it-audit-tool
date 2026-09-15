import { useEffect, useState } from 'react';
import { api, errorMessage } from '../api/client.js';
import ConcernBadge from './ConcernBadge.jsx';

// Human-readable version of each `entity_type` the v_concerns view can flag - shown in bold
// so a concern reads as "what it applies to" (e.g. Comms Room, Software) rather than the
// specific record's name. Manual concerns are excluded - they keep the generic "General"
// fallback the view already assigns them (entity_type is never set for those).
const ENTITY_TYPE_LABELS = {
  infrastructure_item: 'Infrastructure Item',
  comms_room: 'Comms Room',
  software: 'Software',
  vendor_support: 'Vendor Support',
  internet_connection: 'Internet Connection',
  active_directory: 'Active Directory',
};

function concernTitle(c) {
  if (c.category === 'manual') return c.title || 'General';
  return ENTITY_TYPE_LABELS[c.entity_type] || c.title || 'General';
}

export default function ConcernList({ auditId, onSaved }) {
  const [concerns, setConcerns] = useState([]);
  const [error, setError] = useState(null);
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [saving, setSaving] = useState(false);

  function load() {
    api
      .get('/api/concerns', { params: { audit_id: auditId } })
      .then((res) => setConcerns(res.data))
      .catch((err) => setError(errorMessage(err)));
  }

  useEffect(load, [auditId]);

  async function handleAddManual(e) {
    e.preventDefault();
    if (!description.trim()) return;
    setSaving(true);
    try {
      await api.post('/api/concerns', { audit_id: auditId, description, severity });
      setDescription('');
      load();
      onSaved?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id) {
    await api.delete(`/api/concerns/${id}`);
    load();
    onSaved?.();
  }

  return (
    <section className="entity-section">
      <h3>Findings &amp; Areas of Concern</h3>
      <p className="muted">
        End-of-life equipment, faulted/poor condition, expired warranties, expired licenses/contracts are detected automatically. Add
        anything else worth flagging below.
      </p>
      {error && <p className="error-text">{error}</p>}

      {concerns.length === 0 ? (
        <p className="muted">No concerns identified yet.</p>
      ) : (
        concerns.map((c) => (
          <div key={c.concern_key} className="card" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <ConcernBadge severity={c.severity} />
            <div style={{ flex: 1 }}>
              <strong>{concernTitle(c)}</strong>
              <p style={{ margin: '0.15rem 0 0' }}>{c.description}</p>
            </div>
            {c.category === 'manual' && (
              <button className="btn-danger" onClick={() => handleRemove(c.concern_key.slice('manual_'.length))}>
                Remove
              </button>
            )}
          </div>
        ))
      )}

      <form className="card" onSubmit={handleAddManual} style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={{ flex: '3 1 260px' }}>
            Add a Manual Concern
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. No offsite backup in place"
            />
          </label>
          <label style={{ flex: '1 1 120px' }}>
            Severity
            <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <button className="btn-view" type="submit" disabled={saving}>
            {saving ? 'Adding...' : 'Add'}
          </button>
        </div>
      </form>
    </section>
  );
}
