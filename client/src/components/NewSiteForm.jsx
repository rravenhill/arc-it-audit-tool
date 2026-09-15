import { useState } from 'react';
import { api, errorMessage } from '../api/client.js';

const EMPTY_ADDRESS = { address_line1: '', address_line2: '', town_city: '', county: '', postcode: '' };

// Shared "create a site" form used by the new-audit flow, the audit Overview tab, and the
// customer detail page - laid out the same way as the new-customer form (a Contact section,
// then a UK address block). `customer`, when present, offers a one-click way to copy the
// customer's registered address into the site instead of retyping it.
export default function NewSiteForm({ customerId, customer, submitLabel = 'Save Site', submitClassName = 'btn-primary', onCreated }) {
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [addressParts, setAddressParts] = useState(EMPTY_ADDRESS);
  const [useCustomerAddress, setUseCustomerAddress] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const hasCustomerAddress = !!(customer && (customer.address_line1 || customer.address));

  function updateAddressPart(field, value) {
    setAddressParts((prev) => ({ ...prev, [field]: value }));
  }

  function toggleUseCustomerAddress(checked) {
    setUseCustomerAddress(checked);
    if (!checked) {
      setAddressParts(EMPTY_ADDRESS);
      return;
    }
    if (customer.address_line1 || customer.town_city || customer.postcode) {
      setAddressParts({
        address_line1: customer.address_line1 || '',
        address_line2: customer.address_line2 || '',
        town_city: customer.town_city || '',
        county: customer.county || '',
        postcode: customer.postcode || '',
      });
    } else {
      // Older customer records may only have the flat address string - fall back to
      // dumping that into line 1 rather than losing it entirely.
      setAddressParts({ ...EMPTY_ADDRESS, address_line1: customer.address || '' });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api.post('/api/sites', {
        customer_id: customerId,
        name,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        ...addressParts,
        notes,
      });
      onCreated(res.data);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="error-text">{error}</p>}

      <label style={{ marginBottom: '1rem' }}>
        <span>
          Site Name <span className="required-marker">*</span>
        </span>
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>

      <h4 className="form-section-heading">Contact</h4>
      <div className="entity-row-card" style={{ border: 'none', padding: 0, marginBottom: '1.25rem' }}>
        <label>
          Contact Name
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </label>
        <label>
          Contact Email
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        </label>
        <label>
          Contact Phone
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
        </label>
      </div>

      <h4 className="form-section-heading">Address</h4>
      <div className="entity-row-card" style={{ border: 'none', padding: 0, marginBottom: '1.25rem' }}>
        <label className="span-full">
          Address Line 1
          <input
            value={addressParts.address_line1}
            onChange={(e) => updateAddressPart('address_line1', e.target.value)}
            disabled={useCustomerAddress}
          />
        </label>
        <label className="span-full">
          Address Line 2
          <input
            value={addressParts.address_line2}
            onChange={(e) => updateAddressPart('address_line2', e.target.value)}
            disabled={useCustomerAddress}
          />
        </label>
        <label>
          Town/City
          <input
            value={addressParts.town_city}
            onChange={(e) => updateAddressPart('town_city', e.target.value)}
            disabled={useCustomerAddress}
          />
        </label>
        <label>
          County
          <input
            value={addressParts.county}
            onChange={(e) => updateAddressPart('county', e.target.value)}
            disabled={useCustomerAddress}
          />
        </label>
        <label>
          Postcode
          <input
            value={addressParts.postcode}
            onChange={(e) => updateAddressPart('postcode', e.target.value)}
            disabled={useCustomerAddress}
          />
        </label>
        {hasCustomerAddress && (
          <label className="span-full" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.4rem' }}>
            <input type="checkbox" checked={useCustomerAddress} onChange={(e) => toggleUseCustomerAddress(e.target.checked)} />
            Use Customer&apos;s Registered Address
          </label>
        )}
      </div>

      <label className="span-full" style={{ marginBottom: '1rem' }}>
        Notes
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      <button className={submitClassName} type="submit" disabled={saving}>
        {saving ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
