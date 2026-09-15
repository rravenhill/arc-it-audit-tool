import { forwardRef } from 'react';
import EntityTable from './EntityTable.jsx';
import { SERVER_TYPE_OPTIONS, HYPERVISOR_TYPE_OPTIONS, SERVER_ROLE_OPTIONS } from '../utils/serverOptions.js';

const isServer = (row) => row.category === 'server';
const isVirtualServer = (row) => isServer(row) && row.server_type === 'virtual';
const isNetworking = (row) => row.category === 'networking';
const isPrinter = (row) => row.category === 'printer';
const isStorage = (row) => row.category === 'nas' || row.category === 'san';

const RAID_LEVEL_OPTIONS = ['RAID 0', 'RAID 1', 'RAID 5', 'RAID 6', 'RAID 10', 'JBOD', 'Other'];

const STORAGE_CONNECTION_OPTIONS = ['iSCSI', 'Fibre Channel', 'NFS', 'SMB/CIFS', 'SAS', 'Other'];

const NETWORKING_TYPE_OPTIONS = [
  'Router',
  'Firewall',
  'Managed Switch',
  'Unmanaged Switch',
  'Access Point',
  'Wireless Controller',
  'Media Convertor',
];

const OPERATING_SYSTEM_OPTIONS = [
  'Windows Server 2012 R2',
  'Windows Server 2016',
  'Windows Server 2019',
  'Windows Server 2022',
  'Windows Server 2025',
  'Ubuntu Server',
  'Debian',
  'CentOS',
  'Red Hat Enterprise Linux',
  'Rocky Linux',
  'AlmaLinux',
  'SUSE Linux Enterprise Server',
  'Other',
];

function savedHypervisorsAtSite(row, allRows) {
  return allRows.filter(
    (r) => r.id && r.category === 'server' && r.server_type === 'hypervisor' && r.site_id === row.site_id
  );
}

const FIELDS = [
  {
    name: 'category',
    label: 'Category',
    type: 'select',
    options: [
      { value: 'networking', label: 'Network Equipment' },
      { value: 'printer', label: 'Printer' },
      { value: 'server', label: 'Server' },
      { value: 'nas', label: 'NAS' },
      { value: 'san', label: 'SAN' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    name: 'subtype',
    label: 'Type',
    type: 'select',
    options: NETWORKING_TYPE_OPTIONS,
    visibleIf: isNetworking,
  },
  { name: 'manufacturer', label: 'Manufacturer', visibleIf: (row) => !isVirtualServer(row) },
  { name: 'model', label: 'Model', visibleIf: (row) => !isVirtualServer(row) },
  { name: 'serial_number', label: 'Serial Number', visibleIf: (row) => !isVirtualServer(row) },
  { name: 'firmware_version', label: 'Firmware Version', visibleIf: (row) => !isServer(row) },
  {
    name: 'operating_system',
    label: 'Operating System',
    type: 'select',
    options: OPERATING_SYSTEM_OPTIONS,
    visibleIf: isServer,
  },
  {
    name: 'form_factor',
    label: 'Form Factor',
    type: 'select',
    options: ['Rack Mount', 'Free Standing'],
    visibleIf: (row) => isServer(row) && !isVirtualServer(row),
  },
  { name: 'hostname', label: 'Hostname', visibleIf: isServer },
  { name: 'ip_address', label: 'IP Address' },
  { name: 'mac_address', label: 'MAC Address', visibleIf: isPrinter },
  { name: 'location_description', label: 'Location' },
  { name: 'install_date', label: 'Install Date', type: 'date' },
  { name: 'end_of_life_date', label: 'End-of-Life Date', type: 'date', visibleIf: (row) => !isVirtualServer(row) },
  { name: 'warranty_end_date', label: 'Warranty End Date', type: 'date', visibleIf: (row) => !isVirtualServer(row) },
  {
    name: 'condition',
    label: 'Condition',
    type: 'select',
    options: [
      { value: 'good', label: 'Good' },
      { value: 'fair', label: 'Fair' },
      { value: 'poor', label: 'Poor' },
      { value: 'faulted', label: 'Faulted' },
    ],
    visibleIf: (row) => !isVirtualServer(row),
  },
  {
    name: 'server_type',
    label: 'Physical, Virtual or Hypervisor?',
    type: 'select',
    visibleIf: isServer,
    // "Virtual Machine" only appears once at least one hypervisor has been documented and
    // saved at this site - the engineer must capture physical hosts/hypervisors first.
    dynamicOptions: (row, allRows) =>
      savedHypervisorsAtSite(row, allRows).length
        ? SERVER_TYPE_OPTIONS
        : SERVER_TYPE_OPTIONS.filter((o) => o.value !== 'virtual'),
    hint: (row, allRows) =>
      savedHypervisorsAtSite(row, allRows).length
        ? null
        : 'Add and save a hypervisor server at this site to unlock "Virtual Machine".',
  },
  {
    name: 'hypervisor_type',
    label: 'Hypervisor Type',
    type: 'select',
    options: HYPERVISOR_TYPE_OPTIONS,
    visibleIf: (row) => isServer(row) && row.server_type === 'hypervisor',
  },
  {
    name: 'host_infrastructure_item_id',
    label: 'Runs on Hypervisor',
    type: 'select',
    numeric: true,
    visibleIf: (row) => isServer(row) && row.server_type === 'virtual',
    hint: 'Only hypervisors already saved at this site appear here - save the hypervisor row first.',
    dynamicOptions: (row, allRows) =>
      savedHypervisorsAtSite(row, allRows).map((r) => ({
        value: r.id,
        label: [r.manufacturer, r.model].filter(Boolean).join(' ') || `Hypervisor #${r.id}`,
      })),
  },
  {
    name: 'domain_joined',
    label: 'Domain Joined',
    type: 'checkbox',
    visibleIf: isServer,
  },
  {
    name: 'server_roles',
    label: 'Server Roles (Select All That Apply)',
    type: 'checkboxGroup',
    options: SERVER_ROLE_OPTIONS,
    visibleIf: isServer,
  },
  {
    name: 'managed_print_contract',
    label: 'Managed Print Contract',
    type: 'checkbox',
    visibleIf: isPrinter,
  },
  {
    name: 'asset_tag',
    label: 'Asset ID/Tag',
    visibleIf: (row) => isPrinter(row) && row.managed_print_contract,
  },
  {
    name: 'total_capacity',
    label: 'Total Capacity',
    visibleIf: isStorage,
    hint: 'e.g. "24TB usable / 36TB raw"',
  },
  {
    name: 'raid_level',
    label: 'RAID Level',
    type: 'select',
    options: RAID_LEVEL_OPTIONS,
    visibleIf: isStorage,
  },
  {
    name: 'drive_count',
    label: 'Number of Drives',
    type: 'number',
    visibleIf: isStorage,
  },
  {
    name: 'connection_type',
    label: 'Connection Type',
    type: 'select',
    options: STORAGE_CONNECTION_OPTIONS,
    visibleIf: isStorage,
  },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

const InfrastructureItemsSection = forwardRef(function InfrastructureItemsSection({ auditId, sites, onSaved }, ref) {
  return (
    <EntityTable
      ref={ref}
      title="Infrastructure (Networking / Printers / Servers / Storage)"
      resourcePath="/api/infrastructure-items"
      auditId={auditId}
      sites={sites}
      fields={FIELDS}
      emptyRow={{ category: 'networking' }}
      onSaved={onSaved}
    />
  );
});

export default InfrastructureItemsSection;
