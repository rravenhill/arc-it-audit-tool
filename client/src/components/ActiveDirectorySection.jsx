import { forwardRef } from 'react';
import EntityTable from './EntityTable.jsx';

const FUNCTIONAL_LEVEL_OPTIONS = [
  'Windows 2000',
  'Windows Server 2003',
  'Windows Server 2008',
  'Windows Server 2008 R2',
  'Windows Server 2012',
  'Windows Server 2012 R2',
  'Windows Server 2016',
];

const FIELDS = [
  { name: 'domain_name', label: 'Domain Name (FQDN)', required: true },
  { name: 'netbios_name', label: 'NetBIOS Name' },
  {
    name: 'forest_functional_level',
    label: 'Forest Functional Level',
    type: 'select',
    options: FUNCTIONAL_LEVEL_OPTIONS,
  },
  {
    name: 'domain_functional_level',
    label: 'Domain Functional Level',
    type: 'select',
    options: FUNCTIONAL_LEVEL_OPTIONS,
  },
  { name: 'domain_controller_count', label: 'Number of Domain Controllers', type: 'number' },
  { name: 'fsmo_roles_holder', label: 'FSMO Roles Holder' },
  { name: 'user_account_count', label: 'Number of User Accounts', type: 'number' },
  { name: 'computer_account_count', label: 'Number of Computer Accounts', type: 'number' },
  { name: 'ad_recycle_bin_enabled', label: 'AD Recycle Bin Enabled', type: 'checkbox' },
  { name: 'last_system_state_backup_date', label: 'Last System State Backup', type: 'date' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

const ActiveDirectorySection = forwardRef(function ActiveDirectorySection({ auditId, sites, onSaved }, ref) {
  return (
    <EntityTable
      ref={ref}
      title="Active Directory"
      resourcePath="/api/active-directory"
      auditId={auditId}
      sites={sites}
      fields={FIELDS}
      emptyRow={{}}
      onSaved={onSaved}
    />
  );
});

export default ActiveDirectorySection;
