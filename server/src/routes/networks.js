const createChildRouter = require('./childResource');

module.exports = createChildRouter({
  table: 'networks',
  columns: [
    'network',
    'subnet',
    'gateway',
    'vlan',
    'notes',
  ],
});
