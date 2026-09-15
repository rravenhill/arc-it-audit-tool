import { forwardRef } from 'react';
import EntityTable from './EntityTable.jsx';

const FIELDS = [
  { name: 'name', label: 'Software Name' },
  { name: 'vendor', label: 'Vendor' },
  { name: 'version', label: 'Version' },
  { name: 'license_type', label: 'License Type' },
  { name: 'license_count', label: 'License Count', type: 'number' },
  { name: 'license_expiry_date', label: 'License Expiry Date', type: 'date' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

const SoftwareSection = forwardRef(function SoftwareSection({ auditId, sites, onSaved }, ref) {
  return (
    <EntityTable
      ref={ref}
      title="Software In Use"
      resourcePath="/api/software"
      auditId={auditId}
      sites={sites}
      fields={FIELDS}
      emptyRow={{}}
      onSaved={onSaved}
    />
  );
});

export default SoftwareSection;
