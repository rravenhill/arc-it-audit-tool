import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { api, errorMessage } from '../api/client.js';
import InternetConnectionsSection from '../components/InternetConnectionsSection.jsx';
import NetworksSection from '../components/NetworksSection.jsx';
import InfrastructureItemsSection from '../components/InfrastructureItemsSection.jsx';
import ActiveDirectorySection from '../components/ActiveDirectorySection.jsx';
import CommsRoomSection from '../components/CommsRoomSection.jsx';
import SoftwareSection from '../components/SoftwareSection.jsx';
import VendorSupportSection from '../components/VendorSupportSection.jsx';
import ImageUploader from '../components/ImageUploader.jsx';
import NewSiteForm from '../components/NewSiteForm.jsx';
import { formatDate, todayIsoDate } from '../utils/format.js';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'connections', label: 'Internet Connections' },
  { key: 'networks', label: 'Networks' },
  { key: 'infrastructure', label: 'Infrastructure' },
  { key: 'activeDirectory', label: 'Active Directory' },
  { key: 'commsRooms', label: 'Comms Rooms' },
  { key: 'software', label: 'Software' },
  { key: 'vendors', label: 'Vendor Support' },
  { key: 'photos', label: 'Photos' },
];

export default function AuditFormPage() {
  const { auditId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isCreating = !auditId;

  if (isCreating) {
    return <CreateAuditForm presetCustomerId={searchParams.get('customer_id')} onCreated={(id) => navigate(`/audits/${id}/edit`)} />;
  }
  return <EditAuditForm auditId={auditId} />;
}

function CreateAuditForm({ presetCustomerId, onCreated }) {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState(presetCustomerId || '');
  const [customer, setCustomer] = useState(null);
  const [sites, setSites] = useState([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [showNewSiteForm, setShowNewSiteForm] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/api/customers').then((res) => setCustomers(res.data));
  }, []);

  useEffect(() => {
    if (!customerId) {
      setCustomer(null);
      setSites([]);
      setShowNewSiteForm(false);
      return;
    }
    api.get(`/api/customers/${customerId}`).then((res) => setCustomer(res.data));
    setLoadingSites(true);
    api
      .get('/api/sites', { params: { customer_id: customerId } })
      .then((res) => {
        setSites(res.data);
        // Most customers start with zero sites - jump straight to the "create a site" form
        // instead of showing an empty list with nothing to click.
        setShowNewSiteForm(res.data.length === 0);
      })
      .finally(() => setLoadingSites(false));
  }, [customerId]);

  async function startAuditAtSite(siteId) {
    setStarting(true);
    setError(null);
    try {
      const res = await api.post('/api/audits', {
        customer_id: Number(customerId),
        status: 'in_progress',
        audit_date: todayIsoDate(),
        site_ids: [siteId],
      });
      onCreated(res.data.id);
    } catch (err) {
      setError(errorMessage(err));
      setStarting(false);
    }
  }

  return (
    <div>
      <h1>Start a New Audit</h1>
      <div className="card">
        <label>
          <span>
            Customer <span className="required-marker">*</span>
          </span>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} disabled={!!presetCustomerId}>
            <option value="">Select customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="error-text">{error}</p>}

      {customerId && !loadingSites && (
        <fieldset className="card" disabled={starting} style={{ border: 'none' }}>
          <h3>Choose a Site for This Audit</h3>
          <p className="muted">
            Every audit is captured against a site. Ticket number, engineer, and the rest of the audit details
            are filled in on the next screen, once the site is saved.
          </p>

          {sites.length > 0 && (
            <table className="data-table" style={{ marginBottom: '1rem' }}>
              <thead>
                <tr>
                  <th>Site Name</th>
                  <th>Address</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sites.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.address || '-'}</td>
                    <td>
                      {s.active_audit_id ? (
                        <Link className="btn-secondary" to={`/audits/${s.active_audit_id}/edit`}>
                          Audit in Progress
                        </Link>
                      ) : (
                        <button className="btn-primary" type="button" onClick={() => startAuditAtSite(s.id)}>
                          {starting ? 'Starting...' : 'Start Audit Here'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!showNewSiteForm && (
            <button className="btn-secondary" type="button" onClick={() => setShowNewSiteForm(true)}>
              + Add a New Site
            </button>
          )}

          {showNewSiteForm && (
            <NewSiteForm
              customerId={Number(customerId)}
              customer={customer}
              submitLabel="Save Site & Start Audit"
              submitClassName="btn-view"
              onCreated={(site) => startAuditAtSite(site.id)}
            />
          )}
        </fieldset>
      )}
    </div>
  );
}

function EditAuditForm({ auditId }) {
  const [audit, setAudit] = useState(null);
  const [tab, setTab] = useState('overview');
  const [error, setError] = useState(null);
  const activeSectionRef = useRef(null);

  function load() {
    api
      .get(`/api/audits/${auditId}`)
      .then((res) => setAudit(res.data))
      .catch((err) => setError(errorMessage(err)));
  }

  useEffect(load, [auditId]);

  // Engineer name gates every other tab - until it's set and saved, force the
  // engineer back to the Overview tab even if other tabs were reached earlier.
  const engineerSet = !!audit?.engineer_name?.trim();
  useEffect(() => {
    if (audit && !engineerSet) setTab('overview');
  }, [audit, engineerSet]);

  async function handleTabClick(nextTab) {
    if (nextTab === tab) return;
    if (activeSectionRef.current?.flushIfDirty) {
      try {
        await activeSectionRef.current.flushIfDirty();
      } catch {
        // Autosave failed (e.g. a row is missing a required field) - stay put so the
        // engineer sees the section's own error instead of silently losing the edit.
        return;
      }
    }
    setTab(nextTab);
  }

  if (error) return <p className="error-text">{error}</p>;
  if (!audit) return <p className="muted">Loading audit...</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{audit.customer_name}</h1>
          <p className="subtitle">{audit.sites.map((s) => s.name).join(', ') || 'No site selected'}</p>
          <p className="muted">
            Ticket {audit.autotask_ticket_number || 'N/A'} &middot; {audit.audit_date ? formatDate(audit.audit_date) : 'no date set'}
          </p>
        </div>
        {audit.has_data && (
          <Link className="btn-view" to={`/audits/${auditId}/review`}>
            Review
          </Link>
        )}
      </div>

      <div className="tabs">
        {TABS.filter((t) => engineerSet || t.key === 'overview').map((t) => (
          <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => handleTabClick(t.key)} type="button">
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab audit={audit} onSaved={load} />}
      {!engineerSet && tab !== 'overview' ? null : (
        <>
          {tab === 'connections' && (
            <InternetConnectionsSection ref={activeSectionRef} auditId={audit.id} sites={audit.sites} onSaved={load} />
          )}
          {tab === 'networks' && (
            <NetworksSection ref={activeSectionRef} auditId={audit.id} sites={audit.sites} onSaved={load} />
          )}
          {tab === 'infrastructure' && (
            <InfrastructureItemsSection ref={activeSectionRef} auditId={audit.id} sites={audit.sites} onSaved={load} />
          )}
          {tab === 'activeDirectory' && (
            <ActiveDirectorySection ref={activeSectionRef} auditId={audit.id} sites={audit.sites} onSaved={load} />
          )}
          {tab === 'commsRooms' && (
            <CommsRoomSection ref={activeSectionRef} auditId={audit.id} sites={audit.sites} onSaved={load} />
          )}
          {tab === 'software' && (
            <SoftwareSection ref={activeSectionRef} auditId={audit.id} sites={audit.sites} onSaved={load} />
          )}
          {tab === 'vendors' && (
            <VendorSupportSection ref={activeSectionRef} auditId={audit.id} sites={audit.sites} onSaved={load} />
          )}
          {tab === 'photos' && <ImageUploader auditId={audit.id} sites={audit.sites} onSaved={load} />}
        </>
      )}
    </div>
  );
}

function OverviewTab({ audit, onSaved }) {
  const [ticket, setTicket] = useState(audit.autotask_ticket_number || '');
  const [engineer, setEngineer] = useState(audit.engineer_name || '');
  const [auditDate, setAuditDate] = useState(audit.audit_date ? audit.audit_date.slice(0, 10) : '');
  const [status, setStatus] = useState(audit.status);
  const [summary, setSummary] = useState(audit.summary_notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.put(`/api/audits/${audit.id}`, {
        autotask_ticket_number: ticket,
        engineer_name: engineer,
        audit_date: auditDate || null,
        status,
        summary_notes: summary,
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSave}>
      {error && <p className="error-text">{error}</p>}
      <div className="entity-row-card" style={{ border: 'none', padding: 0 }}>
        <label>
          Autotask Ticket #
          <input type="text" value={ticket} onChange={(e) => setTicket(e.target.value)} />
        </label>
        <label>
          <span>
            Engineer Name <span className="required-marker">*</span>
          </span>
          <input type="text" value={engineer} onChange={(e) => setEngineer(e.target.value)} required />
        </label>
        <label>
          Audit Date
          <input type="date" value={auditDate} onChange={(e) => setAuditDate(e.target.value)} />
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label className="span-full">
          Summary Notes
          <textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </label>
      </div>
      <button className="btn-view" type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save Overview'}
      </button>
    </form>
  );
}
