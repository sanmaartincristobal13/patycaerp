const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.argv[2] });

pool.query('select count(*) from usuarios')
  .then(r => { console.log('OK', r.rows[0]); process.exit(0); })
  .catch(e => { console.log('ERROR:', e.message); process.exit(1); });