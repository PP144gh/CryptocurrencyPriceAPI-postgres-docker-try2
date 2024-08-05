const { Pool } = require('pg');

// const pool = new Pool({
//   user: 'postgres',
//   host: 'localhost',
//   database: 'eventLogger',
//   password: 'test',
//   port: 5432,
// });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});


module.exports = pool;
