const createChildRouter = require('./childResource');

module.exports = createChildRouter({
  table: 'software',
  columns: [
    'name',
    'vendor',
    'version',
    'license_type',
    'license_count',
    'license_expiry_date',
    'notes',
  ],
});
