const createChildRouter = require('./childResource');

module.exports = createChildRouter({
  table: 'internet_connections',
  columns: [
    'isp',
    'circuit_id',
    'connection_type',
    'presentation',
    'download_mbps',
    'upload_mbps',
    'ip_assignment',
    'public_ip',
    'router_model',
    'contract_end_date',
    'notes',
  ],
});
