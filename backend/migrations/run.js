require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function run() {
  const client = await pool.connect();
  console.log('✅ Connected to PostgreSQL');

  try {
    // Ensure migrations tracking table exists first
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    VARCHAR(50) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const sqlDir = path.join(__dirname, 'sql');
    const files = fs.readdirSync(sqlDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const version = path.basename(file, '.sql');

      const applied = await client.query(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [version]
      );

      if (applied.rows.length > 0) {
        console.log(`  ⏭  Skipping (already applied): ${file}`);
        continue;
      }

      console.log(`  ▶  Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(sqlDir, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING',
          [version]
        );
        await client.query('COMMIT');
        console.log(`  ✅ Applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ❌ Failed: ${file} — ${err.message}`);
        process.exit(1);
      }
    }

    console.log('\n✅ All migrations applied successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Migration runner failed:', err.message);
  process.exit(1);
});

