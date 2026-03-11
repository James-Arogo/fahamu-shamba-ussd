# Multilingual System Implementation Plan

## Current State Analysis

### What Already Exists:
1. **Landing Page (index.html)** - Has language selection (English/Swahili/Dholuo), stores in localStorage as 'fs_language'
2. **Backend API** - Has `/api/auth/update-language` endpoint, stores `preferred_language` in users table
3. **Login Response** - Returns `preferred_language` from database
4. **language-utils.js** - Has translations for all three languages with `setLanguage()` and `getCurrentLanguage()` functions
5. **language-sync.js** - Has functions to sync language with backend

### What's Missing/Broken:
1. **Landing Page** - Does NOT save language preference to database when user selects language
2. **Login Page** - Does NOT automatically load user's saved language preference on page load
3. **Dashboard** - Does NOT use language system at all (hardcoded English text)
4. **All Pages** - Don't use `data-i18n` attributes for automatic translation

---

## Implementation Plan

### Phase 1: Fix Landing Page - Save Language to Database

**File: index.html**

Modify the `setLanguage()` function to:
1. Continue storing in localStorage (for non-logged-in users)
2. Check if user is logged in (has token)
3. If logged in, call `/api/auth/update-language` to save to database

### Phase 2: Fix Login Page - Load User's Language Preference

**File: public/login.html**

Modify to:
1. On page load, check if user is already logged in
2. If logged in, get their `preferred_language` from the user object in localStorage
3. Apply that language immediately to the page

### Phase 3: Add Language System to Dashboard

**File: public/dashboard.html**

Add:
1. Include `<script src="/language-utils.js"></script>` in head
2. Add `data-i18n` attributes to all text elements that need translation
3. Call `initializeLanguage()` on page load
4. Apply user's preferred language from localStorage

### Phase 4: Add Language System to All Pages

Files to update:
- public/recommendations.html
- public/market.html
- public/community.html
- public/feedback.html
- public/profile.html
- public/settings.html

For each page:
1. Include language-utils.js
2. Add data-i18n attributes
3. Call initializeLanguage() on load

### Phase 5: Ensure Registration Saves Language

**File: public/signup.html** (or wherever registration happens)

Ensure:
1. Language preference is passed to `/api/auth/register-profile`
2. The selected language is saved to the database

---

## Implementation Details

### Language Codes:
- 'english' or 'en' → English
- 'swahili' or 'sw' → Kiswahili  
- 'luo' or 'dh' → Dholuo

### LocalStorage Keys:
- `fahamuShamba_language` - Current language (used by language-utils.js)
- `fs_language` - Legacy key from landing page
- `token` - JWT token (indicates user is logged in)
- `user` - User object including preferred_language

### API Endpoints:
- `POST /api/auth/update-language` - Save language preference to database
- Login response includes `preferred_language` field

---

## Files to Modify:

1. **index.html** - Landing page: save language to database when user selects
2. **public/login.html** - Load user's language preference on page load  
3. **public/dashboard.html** - Add language system and translations
4. **public/recommendations.html** - Add language system
5. **public/market.html** - Add language system
6. **public/community.html** - Add language system
7. **public/feedback.html** - Add language system
8. **public/profile.html** - Add language system
9. **public/settings.html** - Add language system (for language change)
10. **public/signup.html** - Ensure language is saved on registration

---

## Testing Checklist:

1. [ ] Select language on landing page → should save to database (if logged in)
2. [ ] Close browser, reopen login page → should load in previously selected language
3. [ ] Login → dashboard should show in user's preferred language
4. [ ] Change language on any page → should update all pages
5. [ ] Logout and login again → should remember language preference

