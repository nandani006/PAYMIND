require('dotenv').config();
const { validateEnv } = require('./src/config/env');

validateEnv();

const app = require('./src/app');
const { pool } = require('./src/config/db');

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL connected');
  } catch (err) {
    console.warn('⚠️  PostgreSQL not connected:', err.message);
    console.warn('   Start the server without DB or run migrations first.');
  }

  app.listen(PORT, () => {
    console.log(`🚀 PAYMIND Backend running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Frontend origin: ${process.env.FRONTEND_URL}`);
    console.log(`   AI Service: ${process.env.AI_SERVICE_URL}`);
  });
}

start();
