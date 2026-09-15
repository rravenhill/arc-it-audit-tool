import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorMessage } from '../api/client.js';
import ConcernList from '../components/ConcernList.jsx';
import { formatDate } from '../utils/format.js';

export default function AuditReviewPage() {
  const { auditId } = useParams();
  const [audit, setAudit] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    api
      .get(`/api/audits/${auditId}`)
      .then((res) => setAudit(res.data))
      .catch((err) => setError(errorMessage(err)));
  }

  useEffect(load, [auditId]);

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
        <div>
          <a className="btn-view" href={`/api/exports/${auditId}/csv`}>
            Export CSV
          </a>
          <a className="btn-view" href={`/api/exports/${auditId}/pdf`}>
            Export PDF
          </a>
          <Link className="btn-secondary" to={`/audits/${auditId}/edit`}>
            Back to Audit
          </Link>
        </div>
      </div>

      <ConcernList auditId={audit.id} onSaved={load} />
    </div>
  );
}
