/**
 * Complete Database Migration Script: SQLite → PostgreSQL
 * Run this after setting up Neon/Vercel Postgres
 * 
 * Usage: DATABASE_URL="your-postgres-url" node backend/migrate-to-postgres.js
 */

import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable not set');
  console.log('\nUsage:');
  console.log('  DATABASE_URL="postgresql://user:pass@host/db" node backend/migrate-to-postgres.js');
  process.exit(1);
}

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log('🚀 Starting Fahamu Shamba database migration...\n');
    await client.connect();
    console.log('✅ Connected to PostgreSQL database\n');

    // 1. USERS TABLE
    console.log('📋 Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        username VARCHAR(30) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100),
        email VARCHAR(100),
        date_of_birth DATE,
        gender VARCHAR(20),
        id_number VARCHAR(50),
        preferred_language VARCHAR(20) DEFAULT 'english',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    console.log('✅ Users table created\n');

    // 2. FARMS TABLE
    console.log('📋 Creating farms table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS farms (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        location VARCHAR(100),
        ward VARCHAR(100),
        farm_size DECIMAL(10, 2),
        farm_size_unit VARCHAR(20) DEFAULT 'acres',
        soil_type VARCHAR(50),
        water_source VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_farms_user_id ON farms(user_id)');
    console.log('✅ Farms table created\n');

    // 3. FARMERS TABLE
    console.log('📋 Creating farmers table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS farmers (
        id SERIAL PRIMARY KEY,
        phone_number VARCHAR(20) UNIQUE,
        sub_county VARCHAR(100),
        soil_type VARCHAR(50),
        preferred_language VARCHAR(20) DEFAULT 'english',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_farmers_phone ON farmers(phone_number)');
    console.log('✅ Farmers table created\n');

    // 4. PREDICTIONS TABLE
    console.log('📋 Creating predictions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS predictions (
        id SERIAL PRIMARY KEY,
        farmer_id INTEGER REFERENCES farmers(id),
        phone_number VARCHAR(20),
        sub_county VARCHAR(100),
        soil_type VARCHAR(50),
        season VARCHAR(50),
        predicted_crop VARCHAR(100),
        confidence INTEGER,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_predictions_phone ON predictions(phone_number)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_predictions_created ON predictions(created_at)');
    console.log('✅ Predictions table created\n');

    // 5. FEEDBACK TABLE
    console.log('📋 Creating feedback table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        prediction_id INTEGER REFERENCES predictions(id),
        phone_number VARCHAR(20),
        is_helpful BOOLEAN,
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_feedback_prediction ON feedback(prediction_id)');
    console.log('✅ Feedback table created\n');

    // 6. COMMUNITY QUESTIONS TABLE
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

    // 7. COMMUNITY ANSWERS TABLE
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

    // 8. SUCCESS STORIES TABLE
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

    // 9. DISCUSSION TOPICS TABLE
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

    // 10. DISCUSSION POSTS TABLE
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

    // 11. MARKET PRICES TABLE
    console.log('📋 Creating market_prices table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS market_prices (
        id SERIAL PRIMARY KEY,
        crop VARCHAR(100) NOT NULL,
        market VARCHAR(100) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        unit VARCHAR(20) DEFAULT 'kg',
        currency VARCHAR(10) DEFAULT 'KES',
        date DATE DEFAULT CURRENT_DATE,
        source VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_prices_crop ON market_prices(crop)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_prices_market ON market_prices(market)');
    console.log('✅ Market prices table created\n');

    // 12. PRICE ALERTS TABLE
    console.log('📋 Creating price_alerts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS price_alerts (
        id SERIAL PRIMARY KEY,
        phone_number VARCHAR(20) NOT NULL,
        crop VARCHAR(100) NOT NULL,
        target_price DECIMAL(10, 2),
        market VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_alerts_phone ON price_alerts(phone_number)');
    console.log('✅ Price alerts table created\n');

    // 13. ADMIN USERS TABLE
    console.log('📋 Creating admin_users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'admin',
        is_mfa_enabled BOOLEAN DEFAULT FALSE,
        mfa_secret VARCHAR(255),
        last_login TIMESTAMP,
        failed_login_attempts INTEGER DEFAULT 0,
        account_locked BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_admin_email ON admin_users(email)');
    console.log('✅ Admin users table created\n');

    // 14. ADMIN SESSIONS TABLE
    console.log('📋 Creating admin_sessions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        csrf_token VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_admin ON admin_sessions(admin_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_id ON admin_sessions(session_id)');
    console.log('✅ Admin sessions table created\n');

    // 15. AUDIT LOGS TABLE
    console.log('📋 Creating audit_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES admin_users(id),
        email VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id VARCHAR(100),
        details TEXT,
        status VARCHAR(20) DEFAULT 'success',
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_admin ON audit_logs(admin_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)');
    console.log('✅ Audit logs table created\n');

    console.log('🎉 Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   ✅ 15 tables created');
    console.log('   ✅ All indexes created');
    console.log('   ✅ Foreign keys configured\n');
    
    console.log('🔧 Next Steps:');
    console.log('   1. Add DATABASE_URL to Vercel environment variables');
    console.log('   2. Update backend/server.js to use PostgreSQL');
    console.log('   3. Install pg package: npm install pg');
    console.log('   4. Deploy to Vercel');
    console.log('   5. Test registration and login\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed\n');
  }
}

// Run migration
migrate().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
