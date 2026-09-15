import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { api, errorMessage } from '../api/client.js';

let tempIdCounter = 0;

function normalizeOption(opt) {
  return typeof opt === 'string' ? { value: opt, label: opt } : opt;
}

// Shared CRUD card-list UI for every audit-scoped child table (connections, infrastructure,
// comms rooms, software, vendor support). `fields` describes the editable columns; the
// audit/site linkage and create-vs-update-vs-delete reconciliation is handled here once.
// Exposes `flushIfDirty()` via ref so the parent tab bar can autosave before switching tabs.
//
// Field config supports:
//   - type: 'text' | 'number' | 'date' | 'email' | 'select' | 'checkbox' | 'checkboxGroup' | 'textarea'
//   - options: string[] or {value,label}[] (for 'select' / 'checkboxGroup')
//   - dynamicOptions(row, allRows): same shape as options, computed per-row from sibling rows
//     (e.g. picking which hypervisor row a VM runs on)
//   - numeric: true - value is stored/sent as a number (for 'select' fields referencing another row's id)
//   - visibleIf(row): only render/persist this field when true
//   - required: true - blocks Save until filled in (skipped for a row where visibleIf is false).
//     There's no wrapping <form> here, so this is enforced in save(), not via the native
//     HTML attribute alone.
//   - hint: small muted helper text shown under the input
const EntityTable = forwardRef(function EntityTable(
  { title, resourcePath, auditId, sites, fields, emptyRow, onSaved, validateRow },
  ref
) {
  const [rows, setRows] = useState([]);
  const [deletedIds, setDeletedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(false);

  const singleSiteId = sites.length === 1 ? sites[0].id : '';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(resourcePath, { params: { audit_id: auditId } })
      .then((res) => {
        if (cancelled) return;
        setRows(res.data.map((r) => ({ ...r, _key: r.id })));
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(errorMessage(err));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourcePath, auditId]);

  function addRow() {
    tempIdCounter -= 1;
    setRows((prev) => [...prev, { _key: tempIdCounter, site_id: singleSiteId, ...emptyRow }]);
    setDirty(true);
  }

  function removeRow(key) {
    const row = rows.find((r) => r._key === key);
    if (row?.id) setDeletedIds((prev) => [...prev, row.id]);
    setRows((prev) => prev.filter((r) => r._key !== key));
    setDirty(true);
  }

  function updateRow(key, field, value) {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)));
    setDirty(true);
  }

  function hasMissingRequiredField(row) {
    return fields.some((f) => {
      if (!f.required) return false;
      if (f.visibleIf && !f.visibleIf(row)) return false;
      const value = row[f.name];
      if (f.type === 'checkboxGroup') return !Array.isArray(value) || value.length === 0;
      return value === undefined || value === null || value === '';
    });
  }

  function sanitizePayload(payload, row) {
    const clean = { ...payload };
    for (const f of fields) {
      if (f.visibleIf && !f.visibleIf(row)) {
        // Field is hidden for this row's current state (e.g. hypervisor_type on a physical
        // server) - never persist a stale value left over from a previous selection.
        clean[f.name] = f.type === 'checkboxGroup' ? [] : null;
        continue;
      }
      // An empty string means "nothing selected" for numbers, dates, and dropdowns - send it as
      // NULL, not '', so it doesn't trip a CHECK constraint that only expects one of a fixed
      // set of values (or NULL).
      if ((f.type === 'number' || f.type === 'date' || f.type === 'select' || f.numeric) && clean[f.name] === '') {
        clean[f.name] = null;
      }
    }
    return clean;
  }

  async function save() {
    if (rows.some((row) => hasMissingRequiredField(row))) {
      setError('Fill in all required fields (marked *) before saving.');
      return;
    }
    if (validateRow && rows.some((row) => validateRow(row))) {
      setError('Fix the highlighted validation errors before saving.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Persist deletes and writes one at a time, updating state as each succeeds, so a
      // failure partway through never re-submits (and duplicates) rows already saved.
      for (const id of deletedIds) {
        // eslint-disable-next-line no-await-in-loop
        await api.delete(`${resourcePath}/${id}`);
        setDeletedIds((prev) => prev.filter((x) => x !== id));
      }
      for (const row of rows) {
        const { _key, id, ...rest } = row;
        const payload = sanitizePayload(rest, row);
        if (!payload.site_id) {
          throw new Error('Every row needs a site selected before saving.');
        }
        if (id) {
          // eslint-disable-next-line no-await-in-loop
          const res = await api.put(`${resourcePath}/${id}`, payload);
          setRows((prev) => prev.map((r) => (r._key === _key ? { ...res.data, _key } : r)));
        } else {
          // eslint-disable-next-line no-await-in-loop
          const res = await api.post(resourcePath, { ...payload, audit_id: auditId });
          setRows((prev) => prev.map((r) => (r._key === _key ? { ...res.data, _key } : r)));
        }
      }
      setDirty(false);
      onSaved?.();
    } catch (err) {
      setError(errorMessage(err));
      throw err;
    } finally {
      setSaving(false);
    }
  }

  useImperativeHandle(ref, () => ({
    flushIfDirty: () => (dirty ? save() : Promise.resolve()),
  }));

  if (loading) return <p className="muted">Loading {title}...</p>;

  return (
    <section className="entity-section">
      <div className="entity-section-header">
        <h3>
          {title} {dirty && <span className="badge badge-mint">unsaved</span>}
        </h3>
        <div>
          <button type="button" onClick={addRow} className="btn-secondary">
            + Add
          </button>
          {rows.length > 0 && (
            <button type="button" onClick={save} disabled={saving} className="btn-view">
              {saving ? 'Saving...' : 'Save Section'}
            </button>
          )}
        </div>
      </div>
      {error && <p className="error-text">{error}</p>}
      {rows.length === 0 && <p className="muted">No entries yet. Click &ldquo;+ Add&rdquo; to add one.</p>}
      {rows.map((row) => {
        const rowError = validateRow?.(row);
        return (
        <div key={row._key} className="entity-row-card">
          {rowError && <p className="error-text">{rowError}</p>}
          {sites.length > 1 && (
            <label>
              <span>
                Site <span className="required-marker">*</span>
              </span>
              <select value={row.site_id || ''} onChange={(e) => updateRow(row._key, 'site_id', Number(e.target.value))}>
                <option value="">Select site...</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {fields.map((f) => {
            if (f.visibleIf && !f.visibleIf(row)) return null;
            const options = f.dynamicOptions ? f.dynamicOptions(row, rows) : f.options;
            const hint = typeof f.hint === 'function' ? f.hint(row, rows) : f.hint;
            // checkboxGroup renders its own per-option <label>s internally, so its outer
            // wrapper must be a plain element - nesting <label> inside <label> is invalid
            // HTML and makes click targeting on the inner checkboxes unreliable.
            const Wrapper = f.type === 'checkboxGroup' ? 'div' : 'label';
            return (
              <Wrapper
                key={f.name}
                className={
                  f.type === 'textarea' || f.type === 'checkboxGroup' ? 'span-full field-wrapper' : 'field-wrapper'
                }
              >
                <span className={f.type === 'checkboxGroup' ? 'field-label-text' : undefined}>
                  {f.label}
                  {f.required && <span className="required-marker">*</span>}
                </span>
                <FieldInput field={f} row={row} options={options} onChange={(value) => updateRow(row._key, f.name, value)} />
                {hint && <span className="field-hint">{hint}</span>}
              </Wrapper>
            );
          })}
          <button type="button" className="btn-remove" onClick={() => removeRow(row._key)}>
            Remove Row
          </button>
        </div>
        );
      })}
    </section>
  );
});

export default EntityTable;

function FieldInput({ field, row, options, onChange }) {
  let value = row[field.name] ?? '';
  // DATE columns round-trip from the API as full ISO timestamps (e.g. "2024-06-01T00:00:00.000Z"),
  // but <input type="date"> requires exactly YYYY-MM-DD or it silently renders blank.
  if (field.type === 'date' && typeof value === 'string' && value.length > 10) {
    value = value.slice(0, 10);
  }

  if (field.type === 'select') {
    const normalized = (options || []).map(normalizeOption);
    // dynamicOptions can legitimately narrow the list based on other rows (e.g. hiding
    // "Virtual Machine" until a hypervisor exists) - but if this row already holds a value
    // that fell outside the current list, keep showing it instead of silently blanking out
    // a previously saved selection.
    const hasCurrentValue = value === '' || normalized.some((o) => o.value === value);
    return (
      <select
        value={value}
        onChange={(e) => onChange(field.numeric ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
      >
        <option value="">--</option>
        {!hasCurrentValue && <option value={value}>{value} (no longer available)</option>}
        {normalized.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === 'checkboxGroup') {
    const selected = Array.isArray(row[field.name]) ? row[field.name] : [];
    return (
      <div className="checkbox-group">
        {(options || []).map((opt) => {
          const o = normalizeOption(opt);
          const checked = selected.includes(o.value);
          return (
            <label key={o.value} className="checkbox-group-item">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(checked ? selected.filter((v) => v !== o.value) : [...selected, o.value])}
              />
              {o.label}
            </label>
          );
        })}
      </div>
    );
  }
  if (field.type === 'checkbox') {
    return <input type="checkbox" checked={!!row[field.name]} onChange={(e) => onChange(e.target.checked)} />;
  }
  if (field.type === 'textarea') {
    return <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} required={field.required} />;
  }
  return (
    <input
      type={field.type || 'text'}
      value={value}
      onChange={(e) => onChange(field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
      required={field.required}
    />
  );
}
