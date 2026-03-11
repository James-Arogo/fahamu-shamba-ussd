# Multilingual System Integration Guide

## Overview
This guide explains how the multilingual system works and how to integrate it into your pages.

## System Architecture

### Components
1. **language-utils.js** - Core translation engine (existing)
2. **language-sync.js** - Language synchronization with backend (new)
3. **Backend Database** - Stores user's language preference
4. **Auth Endpoints** - Handle language preference in registration and login

### Flow
```
Landing Page (Select Language)
    ↓
Store in localStorage + Session
    ↓
Login/Register (Pass language to backend)
    ↓
Backend stores in users.preferred_language
    ↓
Login Success → Retrieve language from user profile
    ↓
Apply language across entire app
    ↓
Any page change → Language persists from user profile
```

## Implementation Steps

### 1. Database Migration (Already Done)
The `preferred_language` column has been added to the users table with:
- Default value: 'english'
- Supported languages: 'english', 'swahili', 'luo'

**To apply existing database:**
```bash
node backend/migrate-add-language-preference.js
```

### 2. Backend Changes (Already Done)
- ✅ Auth endpoints include `preferred_language` in responses
- ✅ `/api/auth/register-profile` accepts and saves language
- ✅ `/api/auth/login` returns user's language preference
- ✅ `/api/auth/update-language` endpoint for updating language anytime

### 3. Frontend Integration

#### For Landing Page (landing-page.html)
```html
<!-- Load scripts -->
<script src="/language-utils.js"></script>
<script src="/language-sync.js"></script>

<!-- Language selector in your HTML -->
<div class="language-selector">
  <button onclick="selectLanguage('english')">English</button>
  <button onclick="selectLanguage('swahili')">Swahili</button>
  <button onclick="selectLanguage('luo')">Luo</button>
</div>

<!-- In your JavaScript -->
<script>
  function selectLanguage(language) {
    // This saves to localStorage and dispatches event
    handleLanguageChange(language);
    
    // Translate current page
    if (typeof translatePage === 'function') {
      translatePage(language);
    }
    
    // Redirect to login or proceed
    window.location.href = '/login?mode=login';
  }
  
  // Initialize on load
  document.addEventListener('DOMContentLoaded', () => {
    initializeLanguageSync();
  });
</script>
```

#### For Login/Register Pages (Already Updated)
- ✅ Scripts already included
- ✅ Language selection is passed during registration
- ✅ User's language is applied after login

#### For Dashboard and Other Protected Pages
```html
<head>
  <script src="/language-utils.js"></script>
  <script src="/language-sync.js"></script>
</head>

<body>
  <!-- Add language selector in navbar/header -->
  <div class="language-selector">
    <button data-lang="english" onclick="changeLanguage('english')">EN</button>
    <button data-lang="swahili" onclick="changeLanguage('swahili')">SW</button>
    <button data-lang="luo" onclick="changeLanguage('luo')">LUO</button>
  </div>
  
  <!-- Your content with i18n attributes -->
  <h1 data-i18n="welcome"></h1>
  
  <script>
    // Initialize language on page load
    document.addEventListener('DOMContentLoaded', () => {
      initializeLanguageSync();
      translatePage();
    });
    
    // Handle language change
    function changeLanguage(language) {
      handleLanguageChange(language);
      translatePage(language);
      
      // Update UI to show selected language
      updateLanguageUI(language);
    }
    
    // Optional: Listen for language changes from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === 'fahamuShamba_language') {
        const newLanguage = e.newValue;
        translatePage(newLanguage);
        updateLanguageUI(newLanguage);
      }
    });
  </script>
</body>
```

### 4. HTML Content with Translations
All content that needs translation should use `data-i18n` attributes:

```html
<!-- Translate text content -->
<h1 data-i18n="welcome"></h1>

<!-- Translate button text -->
<button data-i18n="login_button"></button>

<!-- Translate input placeholders -->
<input data-i18n="enter_username" type="text" />

<!-- Translate labels -->
<label data-i18n="username"></label>
```

The `translatePage()` function automatically finds all `[data-i18n]` elements and replaces their content with translations from `language-utils.js`.

## Adding New Translations

### 1. Add key-value pairs to language-utils.js
```javascript
const translations = {
  english: {
    new_key: 'English text',
    // ...
  },
  swahili: {
    new_key: 'Maandishi ya Kiswahili',
    // ...
  },
  luo: {
    new_key: 'Maandishi ya Luo',
    // ...
  }
};
```

### 2. Use in HTML
```html
<button data-i18n="new_key"></button>
```

### 3. Use in JavaScript
```javascript
const text = t('new_key');
const swahiliText = t('new_key', 'swahili');
```

## Available Functions

### From language-utils.js
- `getCurrentLanguage()` - Get current language
- `setLanguage(lang)` - Set language
- `t(key, lang)` - Get translation
- `translatePage(lang)` - Translate all data-i18n elements
- `initializeLanguage()` - Initialize on page load

### From language-sync.js
- `saveLanguagePreference(lang, syncWithBackend)` - Save and sync language
- `loadLanguagePreference()` - Load from localStorage
- `applyUserLanguagePreference(user)` - Apply user's language from profile
- `updateUserLanguagePreference(userId, lang, token)` - Update backend
- `initializeLanguageSync()` - Initialize language system
- `handleLanguageChange(lang)` - Handle UI language change

## User Experience Flow

### First-time User
1. Lands on landing page
2. Selects language (English/Swahili/Dhulo)
3. Language applied immediately
4. Redirects to register/login
5. Language preference passed to backend during registration
6. Language saved in user profile

### Returning User
1. Visits login page
2. Enters credentials
3. Login successful - backend returns user's saved language
4. Language automatically applied
5. Navigates to dashboard
6. App displays in user's preferred language

### Language Change Anytime
1. User is on any page
2. Clicks language selector button
3. Language changes immediately on page
4. Syncs with backend automatically (if user is logged in)
5. Persists for future sessions

## Important Notes

1. **localStorage** - Used for quick local language preference
2. **Database** - Used for persistent user preference
3. **Events** - `languageChanged` event is dispatched when language changes
4. **Auto-sync** - When logged in, changing language syncs with backend

## Troubleshooting

### Language not persisting after login
- Check that `applyUserLanguagePreference()` is called after login
- Verify database has `preferred_language` column
- Check browser console for errors

### Language not changing on page
- Ensure all translatable text has `data-i18n` attribute
- Verify `translatePage()` is called
- Check that key exists in translations object

### Language changes not syncing to backend
- Verify user is logged in (token exists)
- Check browser console for network errors
- Verify `/api/auth/update-language` endpoint is working

## Files Modified/Created

### New Files
- `backend/migrate-add-language-preference.js`
- `frontend/language-sync.js`
- `MULTILINGUAL_IMPLEMENTATION.md`
- `MULTILINGUAL_INTEGRATION_GUIDE.md`

### Updated Files
- `backend/init-auth-tables.js` - Added preferred_language column
- `backend/auth-routes.js` - Updated endpoints to handle language
- `frontend/login-register.html` - Integrated language system

### Ready to Update
- `frontend/landing-page.html` - Add language selector
- All dashboard/profile pages - Add language selector and apply language on load

## Example: Complete Language Selector Implementation

```html
<div class="language-picker">
  <select id="languageSelect" onchange="handleLanguageChange(this.value)">
    <option value="english" data-i18n="english">English</option>
    <option value="swahili" data-i18n="swahili">Swahili</option>
    <option value="luo" data-i18n="luo">Luo</option>
  </select>
</div>

<script>
  // Initialize language system
  document.addEventListener('DOMContentLoaded', () => {
    initializeLanguageSync();
    
    // Set dropdown to current language
    const currentLang = loadLanguagePreference();
    document.getElementById('languageSelect').value = currentLang;
  });
</script>
```

## Support

For issues or questions about the multilingual system, refer to:
1. `language-utils.js` - Translation engine documentation
2. `language-sync.js` - Synchronization logic
3. Backend auth endpoints - Language preference handling
