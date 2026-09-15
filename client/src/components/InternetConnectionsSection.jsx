import { forwardRef } from 'react';
import EntityTable from './EntityTable.jsx';

const FIELDS = [
  { name: 'isp', label: 'ISP' },
  { name: 'circuit_id', label: 'Circuit ID' },
  {
    name: 'connection_type',
    label: 'Connection Type',
    type: 'select',
    options: ['Ethernet', 'SoGEA', 'FTTC', 'ADSL2+', '4G', '5G'],
  },
  {
    name: 'presentation',
    label: 'Presentation',
    type: 'select',
    options: ['Fibre', 'Copper', 'Other'],
  },
  { name: 'download_mbps', label: 'Download (Mbps)', type: 'number' },
  { name: 'upload_mbps', label: 'Upload (Mbps)', type: 'number' },
  {
    name: 'ip_assignment',
    label: 'IP Assignment',
    type: 'select',
    options: [
      { value: 'static', label: 'Static' },
      { value: 'dynamic', label: 'Dynamic' },
    ],
  },
  { name: 'public_ip', label: 'Public IP' },
  { name: 'router_model', label: 'Router/Firewall Model' },
  { name: 'contract_end_date', label: 'Contract End Date', type: 'date' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

const InternetConnectionsSection = forwardRef(function InternetConnectionsSection({ auditId, sites, onSaved }, ref) {
  return (
    <EntityTable
      ref={ref}
      title="Internet Connections"
      resourcePath="/api/internet-connections"
      auditId={auditId}
      sites={sites}
      fields={FIELDS}
      emptyRow={{}}
      onSaved={onSaved}
    />
  );
});

export default InternetConnectionsSection;
