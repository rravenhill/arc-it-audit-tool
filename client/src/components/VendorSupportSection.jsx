import { forwardRef } from 'react';
import EntityTable from './EntityTable.jsx';

const FIELDS = [
  { name: 'vendor_name', label: 'Vendor Name' },
  { name: 'support_type', label: 'Support Type (e.g. Hardware, Line-of-Business App)' },
  { name: 'contact_name', label: 'Contact Name' },
  { name: 'contact_email', label: 'Contact Email', type: 'email' },
  { name: 'contact_phone', label: 'Contact Phone' },
  { name: 'contract_reference', label: 'Contract Reference' },
  { name: 'contract_end_date', label: 'Contract End Date', type: 'date' },
  { name: 'sla_notes', label: 'SLA / Notes', type: 'textarea' },
];

const VendorSupportSection = forwardRef(function VendorSupportSection({ auditId, sites, onSaved }, ref) {
  return (
    <EntityTable
      ref={ref}
      title="Third-Party Vendor Support"
      resourcePath="/api/vendor-support"
      auditId={auditId}
      sites={sites}
      fields={FIELDS}
      emptyRow={{}}
      onSaved={onSaved}
    />
  );
});

export default VendorSupportSection;
