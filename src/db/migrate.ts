import { sql } from 'drizzle-orm';
import { db } from '../db';

async function migrate() {
  console.log('Running migration: Add daily API tracking columns...');
  
  try {
    // Add daily_api_calls column
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS daily_api_calls INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_api_call_reset TIMESTAMP;
    `);
    
    console.log('✅ Migration complete');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

migrate();