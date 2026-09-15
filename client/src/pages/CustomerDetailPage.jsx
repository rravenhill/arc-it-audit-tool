import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage } from '../api/client.js';
import { formatDate, formatStatus, todayIsoDate } from '../utils/format.js';
import NewSiteForm from '../components/NewSiteForm.jsx';

export default function CustomerDetailPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [sites, setSites] = useState([]);
  const [audits, setAudits] = useState([]);
  const [error, setError] = useState(null);
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [startingAuditSiteId, setStartingAuditSiteId] = useState(null);

  function load() {
    api.get(`/api/customers/${customerId}`).then((res) => setCustomer(res.data)).catch((err) => setError(errorMessage(err)));
    api.get('/api/sites', { params: { customer_id: customerId } }).then((res) => setSites(res.data));
    api.get('/api/audits', { params: { customer_id: customerId } }).then((res) => setAudits(res.data));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  function handleSiteAdded() {
    setShowSiteForm(false);
    load();
  }

  async function handleStartAudit(site) {
    setStartingAuditSiteId(site.id);
    setError(null);
    try {
      const res = await api.post('/api/audits', {
        customer_id: Number(customerId),
        status: 'in_progress',
        audit_date: todayIsoDate(),
        site_ids: [site.id],
      });
      navigate(`/audits/${res.data.id}/edit`);
    } catch (err) {
      setError(errorMessage(err));
      setStartingAuditSiteId(null);
    }
  }

  async function handleDeleteSite(site) {
    const confirmed = window.confirm(
      `Delete "${site.name}"? This permanently removes this site and all audit data recorded against it ` +
        '(infrastructure, connections, software, photos, everything captured under it). Any audit that only ' +
        'covered this site is removed entirely too. This cannot be undone.'
    );
    if (!confirmed) return;
    try {
      await api.delete(`/api/sites/${site.id}`);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (!customer) return <p className="muted">Loading...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>{customer.name}</h1>
      </div>
      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <h3>Customer Details</h3>
        <p>
          <strong>Contact:</strong> {customer.primary_contact_name || '-'}{' '}
          {customer.primary_contact_email ? `(${customer.primary_contact_email})` : ''} {customer.primary_contact_phone || ''}
        </p>
        {customer.address && <p><strong>Address:</strong> {customer.address}</p>}
        {customer.notes && <p><strong>Notes:</strong> {customer.notes}</p>}
      </div>

      <div className="page-header">
        <h3>Sites</h3>
        <button className="btn-view" onClick={() => setShowSiteForm((v) => !v)}>
          {showSiteForm ? 'Cancel' : '+ Add Site'}
        </button>
      </div>

      {showSiteForm && (
        <div className="card">
          <NewSiteForm customerId={Number(customerId)} customer={customer} submitLabel="Save Site" onCreated={handleSiteAdded} />
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Site Name</th>
            <th>Address</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.address || '-'}</td>
              <td>
                {!s.active_audit_id && (
                  <button
                    className="btn-view"
                    type="button"
                    disabled={startingAuditSiteId === s.id}
                    onClick={() => handleStartAudit(s)}
                  >
                    {startingAuditSiteId === s.id ? 'Starting...' : '+ New Audit'}
                  </button>
                )}
                <Link className="btn-view" to={`/sites/${s.id}`}>
                  View
                </Link>
                <button className="btn-danger" type="button" onClick={() => handleDeleteSite(s)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {sites.length === 0 && (
            <tr>
              <td colSpan={3} className="muted">No sites yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      <h3 style={{ marginTop: '1.5rem' }}>Audit History</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Audit Date</th>
            <th>Site</th>
            <th>Ticket #</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {audits.map((a) => (
            <tr key={a.id}>
              <td>{a.audit_date ? formatDate(a.audit_date) : '-'}</td>
              <td>{a.site_names || '-'}</td>
              <td>{a.autotask_ticket_number || '-'}</td>
              <td>{formatStatus(a.status)}</td>
              <td>
                <Link className="btn-view" to={`/audits/${a.id}/edit`}>Edit</Link>
              </td>
            </tr>
          ))}
          {audits.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">No audits yet for this customer.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
