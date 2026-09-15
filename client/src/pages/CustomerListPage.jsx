import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api/client.js';

const EMPTY_FORM = {
  name: '',
  primary_contact_name: '',
  primary_contact_email: '',
  primary_contact_phone: '',
  account_manager_name: '',
  account_manager_email: '',
  address_line1: '',
  address_line2: '',
  town_city: '',
  county: '',
  postcode: '',
  notes: '',
};

export default function CustomerListPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function load(searchTerm) {
    setLoading(true);
    api
      .get('/api/customers', { params: searchTerm ? { search: searchTerm } : {} })
      .then((res) => setCustomers(res.data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function handleSearchSubmit(e) {
    e.preventDefault();
    load(search);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post('/api/customers', form);
      setForm(EMPTY_FORM);
      setShowForm(false);
      load(search);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(customer) {
    const confirmed = window.confirm(
      `Delete "${customer.name}"? This permanently removes this customer along with all of its sites and audits ` +
        '(infrastructure, connections, software, photos, everything captured under them). This cannot be undone.'
    );
    if (!confirmed) return;
    try {
      await api.delete(`/api/customers/${customer.id}`);
      load(search);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Customers</h1>
        <button className="btn-view" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ New Customer'}
        </button>
      </div>

      {showForm && (
        <form className="card" onSubmit={handleCreate}>
          <h4 className="form-section-heading">Account Manager</h4>
          <div className="entity-row-card" style={{ border: 'none', padding: 0, marginBottom: '1.25rem' }}>
            <label>
              Full Name
              <input
                value={form.account_manager_name}
                onChange={(e) => setForm({ ...form, account_manager_name: e.target.value })}
              />
            </label>
            <label>
              Email Address
              <input
                type="email"
                value={form.account_manager_email}
                onChange={(e) => setForm({ ...form, account_manager_email: e.target.value })}
              />
            </label>
          </div>

          <h4 className="form-section-heading">Contact</h4>
          <div className="entity-row-card" style={{ border: 'none', padding: 0, marginBottom: '1.25rem' }}>
            <label>
              Primary Contact Name
              <input
                value={form.primary_contact_name}
                onChange={(e) => setForm({ ...form, primary_contact_name: e.target.value })}
              />
            </label>
            <label>
              Primary Contact Email
              <input
                type="email"
                value={form.primary_contact_email}
                onChange={(e) => setForm({ ...form, primary_contact_email: e.target.value })}
              />
            </label>
            <label>
              Primary Contact Phone
              <input
                value={form.primary_contact_phone}
                onChange={(e) => setForm({ ...form, primary_contact_phone: e.target.value })}
              />
            </label>
          </div>

          <h4 className="form-section-heading">Address</h4>
          <div className="entity-row-card" style={{ border: 'none', padding: 0, marginBottom: '1.25rem' }}>
            <label className="span-full">
              <span>
                Company Name <span className="required-marker">*</span>
              </span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="span-full">
              Address Line 1
              <input value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} />
            </label>
            <label className="span-full">
              Address Line 2
              <input value={form.address_line2} onChange={(e) => setForm({ ...form, address_line2: e.target.value })} />
            </label>
            <label>
              Town/City
              <input value={form.town_city} onChange={(e) => setForm({ ...form, town_city: e.target.value })} />
            </label>
            <label>
              County
              <input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} />
            </label>
            <label>
              Postcode
              <input value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} />
            </label>
          </div>

          <label className="span-full" style={{ marginBottom: '1rem' }}>
            Notes
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>

          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Customer'}
          </button>
        </form>
      )}

      <form className="filter-bar" onSubmit={handleSearchSubmit}>
        <input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn-secondary" type="submit">Search</button>
      </form>

      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p className="muted">Loading...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Primary Contact</th>
              <th>Phone</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.primary_contact_name || '-'}</td>
                <td>{c.primary_contact_phone || '-'}</td>
                <td>
                  <Link className="btn-view" to={`/customers/${c.id}`}>
                    View
                  </Link>
                  <button className="btn-danger" type="button" onClick={() => handleDelete(c)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
