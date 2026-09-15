const createChildRouter = require('./childResource');

module.exports = createChildRouter({
  table: 'active_directory',
  columns: [
    'domain_name',
    'netbios_name',
    'forest_functional_level',
    'domain_functional_level',
    'domain_controller_count',
    'fsmo_roles_holder',
    'user_account_count',
    'computer_account_count',
    'ad_recycle_bin_enabled',
    'last_system_state_backup_date',
    'notes',
  ],
});
