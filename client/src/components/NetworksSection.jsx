import { forwardRef } from 'react';
import EntityTable from './EntityTable.jsx';
import { SUBNET_MASK_OPTIONS, validateGatewayInSubnet } from '../utils/subnet.js';

const FIELDS = [
  { name: 'network', label: 'Network' },
  { name: 'subnet', label: 'Subnet', type: 'select', options: SUBNET_MASK_OPTIONS },
  { name: 'gateway', label: 'Gateway' },
  { name: 'vlan', label: 'VLAN', type: 'number' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

function validateRow(row) {
  return validateGatewayInSubnet(row.network, row.subnet, row.gateway);
}

const NetworksSection = forwardRef(function NetworksSection({ auditId, sites, onSaved }, ref) {
  return (
    <EntityTable
      ref={ref}
      title="Networks"
      resourcePath="/api/networks"
      auditId={auditId}
      sites={sites}
      fields={FIELDS}
      emptyRow={{}}
      validateRow={validateRow}
      onSaved={onSaved}
    />
  );
});

export default NetworksSection;
