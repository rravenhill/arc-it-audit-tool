const { Pool, types } = require('pg');

// DATE columns (OID 1082) default to JS Date objects, which then serialize to
// UTC ISO timestamps - shifting a day backwards/forwards across timezones with
// a UTC offset (e.g. BST). Keep them as plain "YYYY-MM-DD" strings instead.
types.setTypeParser(1082, (value) => value);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;
