# 401 Invalid Credentials - PERMANENT FIX

## What Was Fixed

### Problem
Users could create accounts but got "Invalid username or password" (401) errors when trying to login, even with correct credentials.

### Root Causes Identified
1. **SQLite LOWER() function not available** - Code used `LOWER(username)` in SQL queries which doesn't work in SQLite without custom functions
2. **Password hash validation too strict** - If password_hash was NULL or empty, no proper error logging
3. **Case-sensitivity issues** - Username stored as mixed case but compared case-sensitively
4. **Missing fallback logic** - No alternative search if primary lookup failed

## Changes Made

### 1. Fixed auth-routes.js (Backend)

#### Change 1: Added validation for empty password hash
```javascript
const verifyPassword = async (password, hash) => {
  if (!hash) {
    console.warn('⚠️ Password hash is empty or null');
    return false;
  }
  return await bcryptjs.compare(password, hash);
};
```

#### Change 2: Removed SQLite LOWER() function from registration check
```javascript
// BEFORE (doesn't work in SQLite):
const stmt = db.prepare('SELECT id, phone, username FROM users WHERE phone = ? OR LOWER(username) = ?');

// AFTER (explicit lowercase in code):
const stmt = db.prepare('SELECT id, phone, username FROM users WHERE phone = ? OR username = ?');
```

#### Change 3: Added case-insensitive fallback in login
```javascript
// Use exact match with lowercase since we normalize on registration
const stmt = db.prepare('SELECT id, phone, username, password_hash, name FROM users WHERE username = ?');
const user = stmt.get(usernameIdentifier);

// If not found, try case-insensitive search as fallback
if (!user) {
  const fallbackStmt = db.prepare('SELECT id, phone, username, password_hash, name FROM users');
  const allUsers = fallbackStmt.all();
  const fallbackUser = allUsers.find(u => u.username && u.username.toLowerCase() === usernameIdentifier);
  if (fallbackUser) {
    Object.assign(user = {}, fallbackUser);
  }
}
```

### 2. Fixed init-auth-tables.js (Database Schema)

#### Change: Added COLLATE NOCASE and made password_hash nullable
```javascript
// BEFORE:
username VARCHAR(50) UNIQUE,
password_hash VARCHAR(255) NOT NULL,

// AFTER:
username VARCHAR(50) UNIQUE COLLATE NOCASE,
password_hash VARCHAR(255),
```

**Why?**
- `COLLATE NOCASE` ensures case-insensitive username uniqueness at database level
- Changed `NOT NULL` to nullable for password_hash to allow graceful error handling

## How to Apply the Fix

### Step 1: Backup Database
```bash
copy backend\fahamu_shamba.db backend\fahamu_shamba.db.backup
```

### Step 2: Clear Problem Users (if any)
Run the diagnostic tool:
```bash
node backend/fix-401-login.js
```

This shows which users have empty password hashes. If any exist:
- Use SQLite browser to delete them
- Or run: `sqlite3 backend/fahamu_shamba.db "DELETE FROM users WHERE password_hash IS NULL;"`

### Step 3: Restart Server
The schema changes will apply on next database initialization.
```bash
npm start
```

### Step 4: Test with Fresh Account
1. Go to signup page
2. Create new account with:
   - Phone: `+254712345678`
   - Username: `testfarm04`
   - Password: `password123`
3. Complete profile setup
4. Logout
5. Try login with same credentials

### Step 5: Verify with Diagnostic Tool
```bash
node backend/fix-401-login.js password123 testfarm04
```

Expected output: `✅ Password MATCHES - Login should work`

## Why This Fixes the Issue

| Problem | Solution |
|---------|----------|
| SQLite doesn't have LOWER() function | Normalize username in JavaScript code before storing |
| Case-sensitive lookups fail | Add case-insensitive fallback search |
| Silent failures on NULL password_hash | Add explicit validation and logging |
| Database schema mismatch | Update schema with COLLATE NOCASE |

## Prevention: Best Practices Going Forward

1. **Always normalize user input** before database storage:
   ```javascript
   const normalizedUsername = username.trim().toLowerCase();
   ```

2. **Use case-insensitive collation** for usernames:
   ```sql
   username VARCHAR(50) UNIQUE COLLATE NOCASE
   ```

3. **Validate required fields** before storage:
   ```javascript
   if (!passwordHash) {
     return res.status(500).json({message: 'Password hashing failed'});
   }
   ```

4. **Log password verification attempts** for debugging:
   ```javascript
   console.log(`Password verification: ${isValid ? 'MATCH' : 'MISMATCH'}`);
   ```

5. **Add fallback search mechanisms** for flexible lookups

## Testing Commands

### Run Diagnostic
```bash
node backend/fix-401-login.js
```

### Test Specific User
```bash
node backend/fix-401-login.js mypassword farmer04
```

### Test with cURL
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"farmer04\", \"password\": \"password123\"}"
```

## Files Modified
- `backend/auth-routes.js` - Login/registration logic
- `backend/init-auth-tables.js` - Database schema
- `backend/fix-401-login.js` - New diagnostic tool

## Verification Checklist
- [ ] Database backed up
- [ ] Problem users identified (if any)
- [ ] Server restarted
- [ ] New account created successfully
- [ ] Login works with new credentials
- [ ] Diagnostic tool confirms password match
- [ ] Browser cache cleared

## If Issues Persist

1. **Check server logs** for error messages
2. **Verify database exists** at `backend/fahamu_shamba.db`
3. **Clear browser storage**: `localStorage.clear()` in console
4. **Try in incognito/private** window
5. **Restart server** with `npm start`
6. **Check network tab** in browser DevTools for actual response

## Support

If login still fails after applying these fixes:
1. Run: `node backend/fix-401-login.js` to get diagnostic info
2. Check browser console and network tab
3. Check server logs for detailed error messages
4. Verify password_hash is NOT NULL in database
