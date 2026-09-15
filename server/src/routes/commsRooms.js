const createChildRouter = require('./childResource');

module.exports = createChildRouter({
  table: 'comms_rooms',
  columns: [
    'location',
    'ups_present',
    'ups_model',
    'ups_battery_replace_date',
    'cooling_type',
    'cooling_condition',
    'cabling_condition',
    'power_redundancy',
    'physical_security_description',
    'notes',
  ],
});
