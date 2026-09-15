// Shared label sets for the server-specific infrastructure fields (server_type, hypervisor_type,
// server_roles) - used by both the capture form (InfrastructureItemsSection) and the read-only
// audit detail/report views, so the two never drift out of sync.

export const SERVER_TYPE_OPTIONS = [
  { value: 'physical', label: 'Physical' },
  { value: 'virtual', label: 'Virtual Machine' },
  { value: 'hypervisor', label: 'Hypervisor' },
];

export const HYPERVISOR_TYPE_OPTIONS = [
  { value: 'vmware', label: 'VMware' },
  { value: 'hyperv', label: 'Hyper-V' },
  { value: 'other', label: 'Other' },
];

export const SERVER_ROLE_OPTIONS = [
  { value: 'domain_controller', label: 'Domain Controller' },
  { value: 'file_server', label: 'File Server' },
  { value: 'print_server', label: 'Print Server' },
  { value: 'application_server', label: 'Application Server' },
  { value: 'backup_server', label: 'Backup Server' },
  { value: 'nps_server', label: 'NPS Server' },
  { value: 'iis', label: 'IIS' },
  { value: 'dns', label: 'DNS' },
  { value: 'dhcp', label: 'DHCP' },
];

function toLabelMap(options) {
  return Object.fromEntries(options.map((o) => [o.value, o.label]));
}

export const SERVER_TYPE_LABELS = toLabelMap(SERVER_TYPE_OPTIONS);
export const HYPERVISOR_TYPE_LABELS = toLabelMap(HYPERVISOR_TYPE_OPTIONS);
export const SERVER_ROLE_LABELS = toLabelMap(SERVER_ROLE_OPTIONS);
