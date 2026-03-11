# 🚨 CRITICAL: Vercel Database Issue & Solution

## **THE PROBLEM**

Your Fahamu Shamba app works perfectly on localhost but **fails on Vercel** because:

### **Root Cause:**
```javascript
// In backend/server.js line 35-37
const databasePath = IS_VERCEL
  ? (process.env.SQLITE_DB_PATH || '/tmp/fahamu_shamba.db')  // ❌ EPHEMERAL!
  : path.join(__dirname, 'fahamu_shamba.db');
```

**Why This Fails:**
1. Vercel uses **serverless functions** (AWS Lambda)
2. Each function has its own `/tmp` directory
3. `/tmp` storage is **wiped after each "cold start"**
4. Your account creation writes to one `/tmp` → Login reads from a different `/tmp`
5. **Result: "Invalid username or password" because the user doesn't exist!**

---

## **SOLUTION OPTIONS**

### ✅ **Option 1: Vercel Postgres (RECOMMENDED)**
**Free tier:** 60 hours compute/month, perfect for MVP

#### **Steps:**
1. **Install Vercel Postgres:**
```bash
npm install @vercel/postgres
```

2. **Add to your Vercel project:**
```bash
vercel env add POSTGRES_URL
# Vercel will guide you through creating a database
```

3. **Update backend/server.js:**
```javascript
import { sql } from '@vercel/postgres';

// Replace better-sqlite3 with Postgres queries
// Example:
const result = await sql`SELECT * FROM users WHERE phone = ${phone}`;
```

---

### ✅ **Option 2: Neon Database (FREE & EASY)**
**Why Neon:**
- Free forever tier (0.5GB storage)
- PostgreSQL-compatible
- Serverless architecture
- Perfect for Vercel

#### **Steps:**

**1. Create Neon Account:**
- Go to https://neon.tech
- Sign up (free)
- Create a new project: "fahamu-shamba"

**2. Get Connection String:**
```
postgresql://username:password@ep-xxx.neon.tech/fahamudb?sslmode=require
```

**3. Install PostgreSQL driver:**
```bash
cd backend
npm install pg
```

**4. Create `backend/database-postgres.js`:**
```javascript
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const query = async (text, params) => {
  const result = await pool.query(text, params);
  return result.rows;
};

export const getOne = async (text, params) => {
  const result = await pool.query(text, params);
  return result.rows[0];
};

export default pool;
```

**5. Update backend/server.js:**
```javascript
// Replace lines 31-37 with:
import pool, { query, getOne } from './database-postgres.js';

// Replace SQLite queries with PostgreSQL:
// SQLite: db.prepare('SELECT * FROM users WHERE phone = ?').get(phone)
// PostgreSQL: await getOne('SELECT * FROM users WHERE phone = $1', [phone])
```

**6. Add Environment Variable to Vercel:**
```bash
vercel env add DATABASE_URL
# Paste your Neon connection string
```

**7. Migrate Schema:**
```sql
-- Run in Neon SQL Editor
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  username VARCHAR(30) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  email VARCHAR(100),
  preferred_language VARCHAR(20) DEFAULT 'english',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE farms (
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
);

-- Add indexes
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_farms_user_id ON farms(user_id);

-- Repeat for other tables: farmers, predictions, feedback, etc.
```

---

### ✅ **Option 3: Supabase (FREE + AUTH)**
**Bonus:** Built-in authentication, real-time, storage

**Steps:**
1. Go to https://supabase.com
2. Create project → Get connection string
3. Use same PostgreSQL approach as Neon above
4. Optional: Replace JWT auth with Supabase Auth

---

### 🚀 **QUICK FIX (Temporary - NOT for Production)**

If you need a **quick demo fix** while migrating:

**1. Create `backend/database-memory.js`:**
```javascript
// In-memory database (DATA WILL BE LOST!)
let users = [];
let farms = [];
let predictions = [];

export const memoryDB = {
  users: {
    create: (user) => {
      users.push({ id: users.length + 1, ...user });
      return users[users.length - 1];
    },
    findByPhone: (phone) => users.find(u => u.phone === phone),
    findByUsername: (username) => users.find(u => u.username === username)
  },
  farms: {
    create: (farm) => {
      farms.push({ id: farms.length + 1, ...farm });
      return farms[farms.length - 1];
    }
  }
  // ... etc
};
```

**2. Update auth-routes.js to use memoryDB**

⚠️ **WARNING:** This is only for testing. All data resets on every deploy!

---

## **RECOMMENDED MIGRATION PATH**

### **Phase 1: Immediate (Today)**
1. Sign up for Neon (5 minutes)
2. Install `pg` package
3. Create connection helper
4. Update auth routes only
5. Test login/register on Vercel
6. Deploy

### **Phase 2: Complete Migration (This Week)**
1. Migrate all tables to PostgreSQL
2. Update all routes to use PostgreSQL
3. Run schema migrations
4. Test all features
5. Update documentation

### **Phase 3: Optimization (Next Week)**
1. Add connection pooling
2. Add database indexes
3. Implement caching (Vercel KV)
4. Monitor query performance

---

## **STEP-BY-STEP: NEON SETUP (15 MINUTES)**

### **1. Create Neon Account**
```bash
# Open browser
https://neon.tech
# Click "Sign Up" → GitHub/Google
# Create project: "fahamu-shamba-db"
# Copy connection string
```

### **2. Install Dependencies**
```bash
cd c:/Users/ADMIN/fahamu-shamba1-main/backend
npm install pg
```

### **3. Add Environment Variable**
```bash
# In Vercel dashboard:
# Settings → Environment Variables → Add
# Name: DATABASE_URL
# Value: postgresql://user:pass@ep-xxx.neon.tech/fahamudb?sslmode=require
```

### **4. Create Migration Script**
Create `backend/migrate-to-postgres.js`:
```javascript
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  await client.connect();
  
  // Create users table
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      phone VARCHAR(20) UNIQUE NOT NULL,
      username VARCHAR(30) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100),
      email VARCHAR(100),
      preferred_language VARCHAR(20) DEFAULT 'english',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE
    )
  `);
  
  // Create farms table
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
  
  console.log('✅ Migration complete!');
  await client.end();
}

migrate().catch(console.error);
```

Run it:
```bash
DATABASE_URL="your-neon-url" node backend/migrate-to-postgres.js
```

---

## **TESTING THE FIX**

### **Before Fix:**
```
1. Visit https://fahamu-shamba1-main.vercel.app
2. Create account → Success
3. Login → ❌ "Invalid username or password"
```

### **After Fix:**
```
1. Visit https://fahamu-shamba1-main.vercel.app
2. Create account → Success
3. Login → ✅ Success! Dashboard loads
```

---

## **WHY THIS HAPPENS**

### **SQLite on Vercel:**
```
Request 1 (Register):
  → Lambda Instance A starts
  → Creates /tmp/db.db
  → Writes user to DB
  → Lambda shuts down after 30s
  → /tmp/db.db DELETED

Request 2 (Login):
  → Lambda Instance B starts (or A restarted)
  → Creates NEW empty /tmp/db.db
  → Tries to find user → NOT FOUND
  → Returns "Invalid credentials"
```

### **PostgreSQL on Vercel:**
```
Request 1 (Register):
  → Lambda Instance A
  → Connects to Neon DB
  → Writes user to PERSISTENT database
  → Lambda shuts down
  → Data PERSISTS in Neon

Request 2 (Login):
  → Lambda Instance B
  → Connects to SAME Neon DB
  → Finds user → SUCCESS
  → Returns JWT token
```

---

## **NEED HELP?**

1. **Neon Setup Issues:** https://neon.tech/docs/get-started-with-neon
2. **Vercel Postgres:** https://vercel.com/docs/storage/vercel-postgres
3. **PostgreSQL Docs:** https://www.postgresql.org/docs/

---

## **NEXT STEPS**

✅ Choose Option 2 (Neon) - Easiest & Free
✅ Follow "STEP-BY-STEP: NEON SETUP"
✅ Test registration + login
✅ Migrate remaining tables
✅ Update all database queries
✅ Deploy to Vercel
✅ Celebrate! 🎉
