/**
 * Shared Navigation Bar Functions
 * Used across all authenticated pages
 * 
 * NOTE: Sidebar toggle functions are now in sidebar.js
 * This file handles language, profile, and UI utilities
 */

// ===== LANGUAGE HANDLING =====

/**
 * Get stored language preference
 * @returns {string} language code (en, sw, luo) or null
 */
function getStoredLanguage() {
    return localStorage.getItem('fahamu_language') || sessionStorage.getItem('fahamu_language');
}

/**
 * Set language preference
 * @param {string} lang - Language code
 */
function setStoredLanguage(lang) {
    localStorage.setItem('fahamu_language', lang);
    sessionStorage.setItem('fahamu_language', lang);
}

/**
 * Get current language
 * @returns {string} language code
 */
function getCurrentLanguage() {
    return getStoredLanguage() || 'en';
}

/**
 * Change language and update page translations
 * @param {string} lang - Language code
 */
function changeLanguage(lang) {
    setStoredLanguage(lang);
    if (typeof translatePage === 'function') {
        translatePage(lang);
    }
    
    // Update language button text if exists
    var langBtnText = document.getElementById('languageBtnText');
    if (langBtnText) {
        var langNames = {
            'en': '🌐 English',
            'sw': '🌐 Kiswahili',
            'luo': '🌐 Dholuo'
        };
        langBtnText.textContent = langNames[lang] || '🌐 English';
    }
    
    // Update hidden select if exists
    var langSelect = document.getElementById('languageSelect');
    if (langSelect) {
        langSelect.value = lang;
    }
}

/**
 * Toggle language dropdown
 */
function toggleLanguageDropdown() {
    var menu = document.getElementById('languageDropdownMenu');
    if (menu) {
        menu.classList.toggle('show');
    }
}

/**
 * Select language from dropdown
 * @param {string} lang - Language code
 * @param {string} text - Display text
 */
function selectLanguageOption(lang, text) {
    var btnText = document.getElementById('languageBtnText');
    if (btnText) {
        btnText.textContent = text;
    }
    
    var select = document.getElementById('languageSelect');
    if (select) {
        select.value = lang;
    }
    
    var menu = document.getElementById('languageDropdownMenu');
    if (menu) {
        menu.classList.remove('show');
    }
    
    changeLanguage(lang);
}

// ===== PROFILE FUNCTIONS =====

/**
 * Load and display user profile data
 */
function loadUserProfile() {
    var cached = localStorage.getItem('user');
    if (cached) {
        try {
            var user = JSON.parse(cached);
            var name = user.name || user.username || 'Farmer';
            var phone = user.phone || user.phone_number || '—';
            
            // Update sidebar user info
            var userNameEl = document.getElementById('userName');
            var userPhoneEl = document.getElementById('userPhone');
            if (userNameEl) userNameEl.textContent = name;
            if (userPhoneEl) userPhoneEl.textContent = phone;
            
            // Update nav profile (if exists)
            var navProfileName = document.getElementById('navProfileName');
            var navProfileAvatar = document.getElementById('navProfileAvatar');
            
            if (navProfileName) navProfileName.textContent = name;
            if (navProfileAvatar) {
                if (user.profile_photo) {
                    navProfileAvatar.innerHTML = '<img src="' + user.profile_photo + '" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">';
                } else {
                    // Set avatar initial
                    navProfileAvatar.textContent = name.charAt(0).toUpperCase();
                }
            }
            
            return { name: name, phone: phone };
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
    
    // Set defaults
    var userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = 'Farmer';
    
    return { name: 'Farmer', phone: '—' };
}

/**
 * Logout function
 */
function logoutUser() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// ===== INITIALIZATION =====

/**
 * Initialize nav bar on page load
 * @param {Object} options - Configuration options
 * @param {string} options.pageTitle - Page title to display
 * @param {boolean} options.showBackButton - Whether to show back button
 */
function initNavBar(options) {
    options = options || {};
    var pageTitle = options.pageTitle || 'Fahamu Shamba';
    var showBackButton = options.showBackButton !== false;
    
    // Set page title
    var titleEl = document.getElementById('navPageTitle');
    if (titleEl) {
        titleEl.textContent = pageTitle;
    }
    
    // Set back button visibility
    var backBtn = document.getElementById('navBackBtn');
    if (backBtn) {
        if (showBackButton) {
            backBtn.classList.remove('hidden');
        } else {
            backBtn.classList.add('hidden');
        }
    }
    
    // Load user profile
    loadUserProfile();
    
    // Auto-load language
    var storedLang = getStoredLanguage();
    if (storedLang) {
        changeLanguage(storedLang);
    }
}

// ===== EXPORT FOR GLOBAL USE =====

// Make sidebar functions available globally (these are in sidebar.js, but we duplicate for safety)
if (typeof window.toggleMobileSidebar !== 'function') {
    window.toggleMobileSidebar = function() {
        var sidebar = document.getElementById('sidebar');
        var overlay = document.getElementById('sidebarOverlay') || document.getElementById('overlay');
        
        if (!sidebar) {
            console.error('Sidebar element not found!');
            return;
        }
        
        var isOpen = sidebar.classList.toggle('mobile-open');
        sidebar.classList.toggle('active');
        
        if (overlay) {
            overlay.classList.toggle('mobile-open');
            overlay.classList.toggle('active');
        }
        
        var hamburger = document.getElementById('hamburger');
        if (hamburger) {
            hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
    };
}

if (typeof window.closeMobileSidebar !== 'function') {
    window.closeMobileSidebar = function() {
        var sidebar = document.getElementById('sidebar');
        var overlay = document.getElementById('sidebarOverlay') || document.getElementById('overlay');
        
        if (sidebar) {
            sidebar.classList.remove('mobile-open');
            sidebar.classList.remove('active');
        }
        
        if (overlay) {
            overlay.classList.remove('mobile-open');
            overlay.classList.remove('active');
        }
        
        var hamburger = document.getElementById('hamburger');
        if (hamburger) {
            hamburger.setAttribute('aria-expanded', 'false');
        }
    };
}

// Make functions available globally
window.changeLanguage = changeLanguage;
window.toggleLanguageDropdown = toggleLanguageDropdown;
window.selectLanguageOption = selectLanguageOption;
window.loadUserProfile = loadUserProfile;
window.logout = logoutUser;
window.logoutUser = logoutUser;
window.initNavBar = initNavBar;
window.getCurrentLanguage = getCurrentLanguage;
window.setLanguage = setStoredLanguage;
window.getStoredLanguage = getStoredLanguage;

// Auto-initialize if elements exist
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('navProfileAvatar') || document.getElementById('navProfileName')) {
        loadUserProfile();
    }
});

