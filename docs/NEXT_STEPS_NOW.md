# 🎯 NEXT STEPS - Fix Vercel Login (Follow This)

You've successfully set up Neon CLI! Now let's complete the database setup and fix your Vercel login issue.

---

## **STEP 1: Get Your Database Connection String**

### Option A: Using Neon Dashboard (EASIEST)
```
1. Go to: https://console.neon.tech
2. Click on your project "fahamu-shamba-db" (or the one just created)
3. Click "Connection Details" or "Connect"
4. Copy the connection string - it looks like:
   postgresql://username:password@ep-xxx-xxx.neon.tech/neondb?sslmode=require
5. Save it somewhere - you'll need it!
```

### Option B: Using CLI
```powershell
npx neonctl connection-string
```
(Press Y when asked to install, then copy the output)

---

## **STEP 2: Install PostgreSQL Package**

```powershell
cd backend
npm install pg
```

---

## **STEP 3: Run Database Migration**

Replace `YOUR_CONNECTION_STRING` with the actual string from Step 1:

```powershell
$env:DATABASE_URL="postgresql://username:password@ep-xxx.neon.tech/neondb?sslmode=require"
node migrate-to-postgres.js
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

---

## **STEP 4: Add Environment Variable to Vercel**

### Option A: Vercel Dashboard
```
1. Go to: https://vercel.com/dashboard
2. Click your project "fahamu-shamba1-main"
3. Click "Settings" tab
4. Click "Environment Variables" in left sidebar
5. Click "Add New"
6. Name: DATABASE_URL
7. Value: (paste your Neon connection string)
8. Select all environments: Production, Preview, Development
9. Click "Save"
```

### Option B: Vercel CLI
```powershell
vercel env add DATABASE_URL production
# Paste your connection string when prompted

vercel env add DATABASE_URL preview
# Paste again

vercel env add DATABASE_URL development
# Paste again
```

---

## **STEP 5: Update Your Code**

I've already created the helper files. Now you need to update two main files:

### A. Update `backend/server.js`

Add these imports at the top (after line 20):
```javascript
import pool, { query, getOne } from './database-postgres.js';

// Check if we should use PostgreSQL
const USE_POSTGRES = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres');
```

Find line 35-37 (the database initialization) and replace:
```javascript
// FIND THIS:
const databasePath = IS_VERCEL
  ? (process.env.SQLITE_DB_PATH || '/tmp/fahamu_shamba.db')
  : path.join(__dirname, 'fahamu_shamba.db');
const db = new Database(databasePath, {});

// REPLACE WITH THIS:
let db;
if (USE_POSTGRES) {
  console.log('✅ Using PostgreSQL database');
  db = null; // PostgreSQL doesn't need better-sqlite3
} else {
  const databasePath = IS_VERCEL
    ? (process.env.SQLITE_DB_PATH || '/tmp/fahamu_shamba.db')
    : path.join(__dirname, 'fahamu_shamba.db');
  db = new Database(databasePath, {});
  console.log(`✅ Connected to SQLite database at ${databasePath}`);
}
```

Find the `dbAsync` definition (around line 58) and replace it with this:
```javascript
const dbAsync = USE_POSTGRES ? {
  run: async (sql, params = []) => {
    let paramIndex = 0;
    const pgSQL = sql.replace(/\?/g, () => `$${++paramIndex}`);
    const result = await pool.query(pgSQL, params);
    return {
      lastID: result.rows[0]?.id || null,
      changes: result.rowCount
    };
  },
  get: async (sql, params = []) => {
    let paramIndex = 0;
    const pgSQL = sql.replace(/\?/g, () => `$${++paramIndex}`);
    const result = await pool.query(pgSQL, params);
    return result.rows[0] || null;
  },
  all: async (sql, params = []) => {
    let paramIndex = 0;
    const pgSQL = sql.replace(/\?/g, () => `$${++paramIndex}`);
    const result = await pool.query(pgSQL, params);
    return result.rows;
  }
} : {
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

Find the `initializeDatabase()` function (around line 87) and add this at the beginning:
```javascript
function initializeDatabase() {
  try {
    // Skip SQLite initialization if using PostgreSQL
    if (USE_POSTGRES) {
      console.log('✅ Using PostgreSQL - tables already migrated');
      return;
    }
    
    // Rest of your existing code...
    adminDB.initializeAdminDatabase(db, dbAsync);
    // ... etc
```

### B. Update `backend/auth-routes.js`

Find the `/register` route (around line 65) and make it async, then update the database calls:

```javascript
// FIND THIS (around line 65-70):
const stmt = db.prepare('SELECT id, phone, username FROM users WHERE phone = ? OR username = ?');
const existingUser = stmt.get(normalizedPhone, normalizedUsername);

// REPLACE WITH THIS:
const existingUser = await dbAsync.get(
  'SELECT id, phone, username FROM users WHERE phone = ? OR username = ?',
  [normalizedPhone, normalizedUsername]
);
```

And also update the insert (around line 80):
```javascript
// FIND THIS:
const insertStmt = db.prepare(
  'INSERT INTO users (phone, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
);
const result = insertStmt.run(normalizedPhone, normalizedUsername, passwordHash);

// REPLACE WITH THIS:
const result = await dbAsync.run(
  'INSERT INTO users (phone, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
  [normalizedPhone, normalizedUsername, passwordHash]
);
```

Do similar changes for other database queries in auth-routes.js:
- `/register-profile` route
- `/login` route  
- `/user` route

**Important**: Make sure all routes that use `db.prepare()` are converted to `dbAsync.get()`, `dbAsync.run()`, or `dbAsync.all()`.

---

## **STEP 6: Test Locally (Optional)**

```powershell
$env:DATABASE_URL="your-neon-connection-string"
cd backend
npm start
```

Open http://localhost:5000 and test register + login.

---

## **STEP 7: Commit and Deploy**

```powershell
git add .
git commit -m "Fix: Migrate to PostgreSQL for Vercel deployment"
git push origin main
```

Vercel will automatically deploy (takes 1-2 minutes).

---

## **STEP 8: Test on Vercel!**

```
1. Go to: https://fahamu-shamba1-main.vercel.app
2. Click "Create Account"
3. Fill in:
   - Phone: +254712345678
   - Username: testuser
   - Password: test123
   - Name: Test User
   - Location: Siaya
4. Click "Register"
5. ✅ Should succeed
6. Go to Login page
7. Enter:
   - Username: testuser
   - Password: test123
8. Click "Login"
9. ✅ SUCCESS! Dashboard loads
```

---

## **VERIFICATION CHECKLIST**

After deploying, check Vercel logs:
```powershell
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

## **IF YOU GET STUCK**

### Error: "Cannot find module 'pg'"
```powershell
cd backend
npm install pg
git add backend/package.json backend/package-lock.json
git commit -m "Add pg dependency"
git push
```

### Error: "relation 'users' does not exist"
```powershell
# Run migration again
$env:DATABASE_URL="your-connection-string"
node backend/migrate-to-postgres.js
```

### Error: "Connection refused"
- Check your DATABASE_URL has `?sslmode=require` at the end
- Make sure you added it to Vercel environment variables

### Still not working?
1. Clear browser cache and cookies
2. Try in incognito/private mode
3. Check Vercel deployment logs for errors

---

## **QUICK REFERENCE**

**Your Neon Dashboard**: https://console.neon.tech  
**Your Vercel Dashboard**: https://vercel.com/dashboard  
**Your App**: https://fahamu-shamba1-main.vercel.app

**Helper Files Created**:
- `backend/database-postgres.js` - PostgreSQL connection helper
- `backend/migrate-to-postgres.js` - Migration script
- `VERCEL_DATABASE_FIX.md` - Detailed explanation
- `QUICK_FIX_VERCEL_LOGIN.md` - Quick fix guide

---

## **SUMMARY**

✅ Neon CLI installed  
✅ Helper files created  
⏳ Get connection string (Step 1)  
⏳ Install `pg` package (Step 2)  
⏳ Run migration (Step 3)  
⏳ Add to Vercel (Step 4)  
⏳ Update code (Step 5)  
⏳ Deploy (Step 7)  
⏳ Test (Step 8)  

**Time Required**: 15-20 minutes  
**Difficulty**: Medium  
**Result**: Login will work on Vercel! 🎉

---

Good luck! Follow the steps carefully and you'll have it working in no time! 🚀
