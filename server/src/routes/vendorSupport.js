const createChildRouter = require('./childResource');

module.exports = createChildRouter({
  table: 'vendor_support',
  columns: [
    'vendor_name',
    'support_type',
    'contact_name',
    'contact_email',
    'contact_phone',
    'contract_reference',
    'contract_end_date',
    'sla_notes',
  ],
});
