import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorMessage } from '../api/client.js';
import { formatDate, formatStatus } from '../utils/format.js';

export default function SiteDetailPage() {
  const { siteId } = useParams();
  const [site, setSite] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [audits, setAudits] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/api/sites/${siteId}`)
      .then((res) => {
        setSite(res.data);
        return api.get(`/api/customers/${res.data.customer_id}`);
      })
      .then((res) => setCustomer(res.data))
      .catch((err) => setError(errorMessage(err)));
    api.get('/api/audits', { params: { site_id: siteId } }).then((res) => setAudits(res.data));
  }, [siteId]);

  if (error) return <p className="error-text">{error}</p>;
  if (!site) return <p className="muted">Loading...</p>;

  const mapSrc = site.address ? `https://www.google.com/maps?q=${encodeURIComponent(site.address)}&output=embed` : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{site.name}</h1>
          {customer && <p className="subtitle">{customer.name}</p>}
        </div>
        {customer && (
          <Link className="btn-secondary" to={`/customers/${customer.id}`}>
            Back to Customer
          </Link>
        )}
      </div>

      <div className="card">
        {(site.contact_name || site.contact_email || site.contact_phone) && (
          <p>
            <strong>Contact:</strong> {site.contact_name || '-'}{' '}
            {site.contact_email ? `(${site.contact_email})` : ''} {site.contact_phone || ''}
          </p>
        )}
        <p>
          <strong>Address:</strong> {site.address || 'No address on file'}
        </p>
        {site.notes && (
          <p>
            <strong>Notes:</strong> {site.notes}
          </p>
        )}
      </div>

      <div className="card">
        <h3>Location</h3>
        {mapSrc ? (
          <iframe
            title={`Map showing ${site.name}`}
            src={mapSrc}
            style={{ width: '100%', height: '350px', border: 0, borderRadius: '6px' }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <p className="muted">Add an address to this site to show it on a map.</p>
        )}
      </div>

      <h3 style={{ marginTop: '1.5rem' }}>Audits at This Site</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Ticket #</th>
            <th>Audit Date</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {audits.map((a) => (
            <tr key={a.id}>
              <td>{a.autotask_ticket_number || '-'}</td>
              <td>{a.audit_date ? formatDate(a.audit_date) : '-'}</td>
              <td>{formatStatus(a.status)}</td>
              <td>
                <Link className="btn-view" to={`/audits/${a.id}/edit`}>
                  Edit
                </Link>
              </td>
            </tr>
          ))}
          {audits.length === 0 && (
            <tr>
              <td colSpan={4} className="muted">
                No audits recorded at this site yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
