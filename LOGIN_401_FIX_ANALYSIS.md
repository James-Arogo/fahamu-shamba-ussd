# 401 Invalid Credentials - Root Cause Analysis

## Problem
New accounts created and login attempts fail with "Invalid username or password" (401 error) even when credentials are correct.

## Root Cause Identified

The issue is in the **registration process** - specifically in how Step 1 and Step 2 interact:

### Current Flow (BROKEN):
1. **Step 1** (`/api/auth/register`): Creates user with password hash ✅
2. **Step 2** (`/api/auth/register-profile`): Creates farm profile and generates token ✅
3. **Problem**: The `userId` returned from Step 1 is a `lastInsertRowid`, but when doing Step 2, if there's any issue or delay, the user record might not exist properly, OR the password_hash might not be saved correctly.

### Key Issues Found:

1. **Password Hash Not Being Stored**: In `auth-routes.js` line 124, the password is hashed and inserted, but check if `bcryptjs.hash()` is actually being awaited properly in all cases.

2. **Username Case Sensitivity**: 
   - Registration stores username with `.toLowerCase()` (line 102)
   - Login queries with `LOWER(username) = ?` (line 237)
   - But storage might be storing the original case - check if LOWER() function works in SQLite

3. **Race Condition Between Steps**: 
   - Step 1 returns `lastInsertRowid`
   - Step 2 tries to find user by `userId`
   - If database transaction incomplete, user lookup fails

4. **Potential SQLite LOWER() Issue**:
   - SQLite may not have LOWER() function by default
   - Should use `LOWER(username)` in schema or trim/lowercase in code

## Solutions (Priority Order)

### Solution 1: Fix Password Hash Storage (IMMEDIATE)
Ensure bcryptjs.hash is properly awaited and error-checked.

### Solution 2: Normalize Username Consistently
Change the query to normalize username case during comparison, not during storage.

### Solution 3: Add Transaction Safety
Wrap Step 1 registration in explicit transaction.

### Solution 4: Debug Current Users
Check if existing "farmer04" account has proper password_hash stored.

## Verification Steps

1. Query the database:
```sql
SELECT id, username, password_hash, phone FROM users WHERE username LIKE '%farmer04%';
```

2. Check if password_hash column has data:
- If empty or NULL → Problem is in Step 1 storage
- If populated → Problem is in bcryptjs.compare during login

3. Check username case:
- If stored as "Farmer04" but login sends "farmer04" → Case sensitivity issue
- If stored as "farmer04" → Good

## Fix Strategy
1. Verify password_hash is stored for farmer04
2. If not, re-register with fixed code
3. If yes, fix the bcryptjs.compare logic or authentication flow
