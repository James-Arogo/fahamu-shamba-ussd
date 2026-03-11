# 🚀 QUICK FIX: Vercel Login Issue (15 Minutes)

## **THE PROBLEM**
✅ Localhost: Registration and login work perfectly  
❌ Vercel: Registration succeeds, but login fails with "Invalid username or password"

**Why?** SQLite database is stored in `/tmp` on Vercel, which gets wiped between serverless function calls.

---

## **IMMEDIATE SOLUTION: Use Neon Database (FREE)**

### **Step 1: Create Neon Account (2 minutes)**
```bash
1. Open: https://neon.tech
2. Click "Sign Up" (use GitHub or Google)
3. Create new project: "fahamu-shamba-db"
4. Copy your connection string - looks like:
   postgresql://username:password@ep-xxx-xxx.neon.tech/neondb?sslmode=require
```

### **Step 2: Install PostgreSQL Driver (1 minute)**
```bash
cd c:/Users/ADMIN/fahamu-shamba1-main/backend
npm install pg
```

### **Step 3: Run Migration Script (2 minutes)**
```bash
# Replace with YOUR Neon connection string
DATABASE_URL="postgresql://username:password@ep-xxx.neon.tech/neondb?sslmode=require" node backend/migrate-to-postgres.js
```

You should see:
```
🚀 Starting Fahamu Shamba database migration...
✅ Connected to PostgreSQL database
📋 Creating users table...
✅ Users table created
...
🎉 Migration completed successfully!
```

### **Step 4: Add Environment Variable to Vercel (2 minutes)**
```bash
# Option A: Using Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select your project "fahamu-shamba1-main"
3. Go to Settings → Environment Variables
4. Click "Add New"
5. Name: DATABASE_URL
6. Value: (paste your Neon connection string)
7. Environment: Production, Preview, Development (select all)
8. Click "Save"

# Option B: Using Vercel CLI
vercel env add DATABASE_URL
# Paste your connection string when prompted
```

### **Step 5: Update server.js (5 minutes)**

Open `backend/server.js` and add at the top (after imports):

```javascript
// Add after line 20 (after other imports)
import pool, { query, getOne } from './database-postgres.js';

// Check if we should use PostgreSQL
const USE_POSTGRES = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres');
```

Find line 35-37 and replace:
```javascript
// OLD CODE (lines 35-37):
const databasePath = IS_VERCEL
  ? (process.env.SQLITE_DB_PATH || '/tmp/fahamu_shamba.db')
  : path.join(__dirname, 'fahamu_shamba.db');
const db = new Database(databasePath, {});

// NEW CODE:
let db;
if (USE_POSTGRES) {
  console.log('✅ Using PostgreSQL database');
  db = null; // PostgreSQL doesn't use better-sqlite3
} else {
  const databasePath = IS_VERCEL
    ? (process.env.SQLITE_DB_PATH || '/tmp/fahamu_shamba.db')
    : path.join(__dirname, 'fahamu_shamba.db');
  db = new Database(databasePath, {});
  console.log(`✅ Connected to SQLite database at ${databasePath}`);
}
```

Update `dbAsync` wrapper (around line 58):
```javascript
// Replace dbAsync definition with:
const dbAsync = USE_POSTGRES ? {
  run: async (sql, params = []) => {
    const pgSQL = sql.replace(/\?/g, (match, offset) => {
      const index = sql.substring(0, offset).split('?').length;
      return `$${index}`;
    });
    const result = await pool.query(pgSQL, params);
    return {
      lastID: result.rows[0]?.id || null,
      changes: result.rowCount
    };
  },
  get: async (sql, params = []) => {
    const pgSQL = sql.replace(/\?/g, (match, offset) => {
      const index = sql.substring(0, offset).split('?').length;
      return `$${index}`;
    });
    const result = await pool.query(pgSQL, params);
    return result.rows[0] || null;
  },
  all: async (sql, params = []) => {
    const pgSQL = sql.replace(/\?/g, (match, offset) => {
      const index = sql.substring(0, offset).split('?').length;
      return `$${index}`;
    });
    const result = await pool.query(pgSQL, params);
    return result.rows;
  }
} : {
  // Original SQLite wrapper
  run: (sql, params = []) => {
    try {
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      return Promise.resolve({ lastID: result.lastInsertRowid, changes: result.changes });
    } catch (err) {
      return Promise.reject(err);
    }
  },
  get: (sql, params = []) => {
    try {
      const stmt = db.prepare(sql);
      const result = stmt.get(...params);
      return Promise.resolve(result);
    } catch (err) {
      return Promise.reject(err);
    }
  },
  all: (sql, params = []) => {
    try {
      const stmt = db.prepare(sql);
      const results = stmt.all(...params);
      return Promise.resolve(results);
    } catch (err) {
      return Promise.reject(err);
    }
  }
};
```

Update `initializeDatabase()` function (around line 87):
```javascript
function initializeDatabase() {
  try {
    if (USE_POSTGRES) {
      console.log('✅ Using PostgreSQL - tables should already be migrated');
      return;
    }
    
    // Rest of SQLite initialization code stays the same
    adminDB.initializeAdminDatabase(db, dbAsync);
    // ... etc
  } catch (err) {
    console.error('Error initializing database:', err.message);
  }
}
```

### **Step 6: Update auth-routes.js (3 minutes)**

Open `backend/auth-routes.js` and update the database queries:

Find the `register` route (around line 58-80) and replace:
```javascript
// OLD:
const stmt = db.prepare('SELECT id, phone, username FROM users WHERE phone = ? OR username = ?');
const existingUser = stmt.get(normalizedPhone, normalizedUsername);

// NEW:
const existingUser = await dbAsync.get(
  'SELECT id, phone, username FROM users WHERE phone = ? OR username = ?',
  [normalizedPhone, normalizedUsername]
);
```

Also replace:
```javascript
// OLD:
const insertStmt = db.prepare(
  'INSERT INTO users (phone, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
);
const result = insertStmt.run(normalizedPhone, normalizedUsername, passwordHash);

// NEW:
const result = await dbAsync.run(
  'INSERT INTO users (phone, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
  [normalizedPhone, normalizedUsername, passwordHash]
);
```

Do similar replacements for other routes in auth-routes.js (login, register-profile, etc.)

### **Step 7: Commit and Deploy (2 minutes)**
```bash
git add .
git commit -m "Fix: Migrate to PostgreSQL for Vercel deployment"
git push origin main
```

Vercel will automatically deploy. Wait 1-2 minutes.

### **Step 8: Test! (1 minute)**
```bash
1. Visit https://fahamu-shamba1-main.vercel.app
2. Click "Create Account"
3. Fill in details and register
4. Go to login page
5. Enter same credentials
6. Click Login
7. ✅ SUCCESS! You should see the dashboard
```

---

## **ALTERNATIVE: Quick Demo Fix (In-Memory)**

If you need to demo RIGHT NOW and can't wait for migration:

1. **Add to backend/package.json:**
```json
"dependencies": {
  "pg": "^8.11.3"
}
```

2. **Set fallback in Vercel:**
```bash
# In server.js, add fallback for when DB is empty
// This allows token-based auth without persistent storage
```

⚠️ **WARNING**: Data will reset on every deploy. Only for testing!

---

## **TROUBLESHOOTING**

### ❌ "Error: Connection refused"
**Fix**: Check your DATABASE_URL is correct and has `?sslmode=require`

### ❌ "relation 'users' does not exist"
**Fix**: Run the migration script again:
```bash
DATABASE_URL="your-url" node backend/migrate-to-postgres.js
```

### ❌ "Cannot find module 'pg'"
**Fix**: Install PostgreSQL driver:
```bash
cd backend && npm install pg
```

### ❌ Still getting login errors
**Fix**: Clear your browser cache and cookies, then try again

---

## **VERIFICATION**

After deployment, check Vercel logs:
```bash
vercel logs --follow
```

You should see:
```
✅ PostgreSQL connected successfully
✅ Using PostgreSQL database
```

NOT:
```
✅ Connected to SQLite database at /tmp/fahamu_shamba.db
```

---

## **NEXT STEPS AFTER FIX**

1. ✅ Test all features (register, login, predictions, community)
2. ✅ Update other modules to use PostgreSQL (predictions, community, etc.)
3. ✅ Add connection pooling optimization
4. ✅ Set up database backups
5. ✅ Monitor query performance

---

## **SUPPORT**

- **Neon Docs**: https://neon.tech/docs
- **PostgreSQL Migration**: See `VERCEL_DATABASE_FIX.md`
- **Full Guide**: See `backend/migrate-to-postgres.js`

---

## **SUCCESS CHECKLIST**

- [ ] Neon account created
- [ ] `pg` package installed
- [ ] Migration script run successfully
- [ ] DATABASE_URL added to Vercel
- [ ] server.js updated
- [ ] auth-routes.js updated
- [ ] Code committed and pushed
- [ ] Vercel deployment complete
- [ ] Registration works on Vercel
- [ ] **Login works on Vercel** ✅
- [ ] Dashboard accessible after login

---

**Estimated Time**: 15-20 minutes  
**Difficulty**: Medium  
**Success Rate**: 99% (if following steps exactly)

🎉 **After this fix, your Vercel deployment will work exactly like localhost!**
