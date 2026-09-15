import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../api/client.js';
import { formatDate, formatStatus } from '../utils/format.js';

export default function AuditListPage() {
  const [audits, setAudits] = useState([]);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [filters, setFilters] = useState({ q: '', ticket: '', status: '', date_from: '', date_to: '' });
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  function load(activeFilters) {
    const params = Object.fromEntries(Object.entries(activeFilters).filter(([, v]) => v));
    api
      .get('/api/audits', { params })
      .then((res) => setAudits(res.data))
      .catch((err) => setError(errorMessage(err)));
  }

  useEffect(() => {
    load(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilterSubmit(e) {
    e.preventDefault();
    load(filters);
  }

  async function handleDelete(audit) {
    const confirmed = window.confirm(
      `Delete this audit for "${audit.customer_name}" (ticket ${audit.autotask_ticket_number || 'N/A'})? ` +
        'This permanently removes everything captured under it - infrastructure, connections, software, photos, ' +
        'everything. This cannot be undone.'
    );
    if (!confirmed) return;
    try {
      await api.delete(`/api/audits/${audit.id}`);
      load(filters);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const res = await api.post('/api/exports/import', payload);
      navigate(`/audits/${res.data.audit_id}/edit`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Audits</h1>
        <div>
          <button className="btn-secondary" type="button" disabled={importing} onClick={() => fileInputRef.current?.click()}>
            {importing ? 'Importing...' : 'Import Audit JSON'}
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={handleImportFile} />
          <Link className="btn-view" to="/audits/new">
            + New Audit
          </Link>
        </div>
      </div>

      <form className="filter-bar" onSubmit={handleFilterSubmit}>
        <input
          placeholder="Search customer or ticket #..."
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">Any Status</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <input
          type="date"
          value={filters.date_from}
          onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
          title="From Date"
        />
        <input
          type="date"
          value={filters.date_to}
          onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
          title="To Date"
        />
        <button className="btn-secondary" type="submit">
          Filter
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}

      <table className="data-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Site</th>
            <th>Ticket #</th>
            <th>Audit Date</th>
            <th>Status</th>
            <th>Engineer</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {audits.map((a) => (
            <tr key={a.id}>
              <td>{a.customer_name}</td>
              <td>{a.site_names || '-'}</td>
              <td>{a.autotask_ticket_number || '-'}</td>
              <td>{a.audit_date ? formatDate(a.audit_date) : '-'}</td>
              <td>{formatStatus(a.status)}</td>
              <td>{a.engineer_name || '-'}</td>
              <td>
                <Link className="btn-view" to={`/audits/${a.id}/edit`}>
                  Edit
                </Link>
                <button className="btn-danger" type="button" onClick={() => handleDelete(a)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {audits.length === 0 && (
            <tr>
              <td colSpan={7} className="muted">
                No audits found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
