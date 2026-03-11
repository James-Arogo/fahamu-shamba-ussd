/**
 * Fix Community Tables Schema
 * Drops old community tables and recreates them with correct schema
 */

import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable not set');
  process.exit(1);
}

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixSchema() {
  try {
    console.log('🔧 Fixing community tables schema...\n');
    await client.connect();
    console.log('✅ Connected to PostgreSQL database\n');

    // Drop existing community tables (in correct order due to foreign keys)
    console.log('🗑️  Dropping old community tables...');
    await client.query('DROP TABLE IF EXISTS discussion_posts CASCADE');
    await client.query('DROP TABLE IF EXISTS discussion_topics CASCADE');
    await client.query('DROP TABLE IF EXISTS community_answers CASCADE');
    await client.query('DROP TABLE IF EXISTS community_questions CASCADE');
    await client.query('DROP TABLE IF EXISTS success_stories CASCADE');
    console.log('✅ Old tables dropped\n');

    // Create community_questions table with correct schema
    console.log('📋 Creating community_questions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS community_questions (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        author_phone VARCHAR(20) NOT NULL,
        author_name VARCHAR(100),
        sub_county VARCHAR(100),
        category VARCHAR(50) DEFAULT 'general',
        upvotes INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_questions_author ON community_questions(author_phone)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_questions_category ON community_questions(category)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_questions_status ON community_questions(status)');
    console.log('✅ Community questions table created\n');

    // Create community_answers table with correct schema
    console.log('📋 Creating community_answers table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS community_answers (
        id SERIAL PRIMARY KEY,
        question_id INTEGER NOT NULL REFERENCES community_questions(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        author_phone VARCHAR(20) NOT NULL,
        author_name VARCHAR(100),
        upvotes INTEGER DEFAULT 0,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_answers_question ON community_answers(question_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_answers_author ON community_answers(author_phone)');
    console.log('✅ Community answers table created\n');

    // Create success_stories table with correct schema
    console.log('📋 Creating success_stories table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS success_stories (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        author_phone VARCHAR(20) NOT NULL,
        author_name VARCHAR(100),
        sub_county VARCHAR(100),
        crop_grown VARCHAR(100),
        yield_achieved VARCHAR(100),
        image_url TEXT,
        likes INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_stories_author ON success_stories(author_phone)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_stories_status ON success_stories(status)');
    console.log('✅ Success stories table created\n');

    // Create discussion_topics table
    console.log('📋 Creating discussion_topics table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS discussion_topics (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50) NOT NULL,
        created_by VARCHAR(20) NOT NULL,
        posts_count INTEGER DEFAULT 0,
        is_pinned BOOLEAN DEFAULT FALSE,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_topics_category ON discussion_topics(category)');
    console.log('✅ Discussion topics table created\n');

    // Create discussion_posts table
    console.log('📋 Creating discussion_posts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS discussion_posts (
        id SERIAL PRIMARY KEY,
        topic_id INTEGER NOT NULL REFERENCES discussion_topics(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        author_phone VARCHAR(20) NOT NULL,
        author_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_posts_topic ON discussion_posts(topic_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_posts_author ON discussion_posts(author_phone)');
    console.log('✅ Discussion posts table created\n');

    console.log('🎉 Schema fix completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   ✅ 5 community tables recreated with correct schema');
    console.log('   ✅ All indexes created');
    console.log('   ✅ Foreign keys configured\n');
    
    console.log('✨ The communities page should now work correctly!\n');

  } catch (error) {
    console.error('❌ Schema fix failed:', error);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed\n');
  }
}

// Run fix
fixSchema().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
