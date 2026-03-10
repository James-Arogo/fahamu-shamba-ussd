/**
 * Shared Navigation Bar Functions
 * Used across all authenticated pages
 * 
 * Features:
 * - Hamburger toggle (opens sidebar)
 * - Back to Dashboard button
 * - Language auto-load from localStorage
 * - Profile display
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
    const langBtnText = document.getElementById('languageBtnText');
    if (langBtnText) {
        const langNames = {
            'en': '🌐 English',
            'sw': '🌐 Kiswahili',
            'luo': '🌐 Dholuo'
        };
        langBtnText.textContent = langNames[lang] || '🌐 English';
    }
    
    // Update hidden select if exists
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) {
        langSelect.value = lang;
    }
}

// ===== NAV BAR FUNCTIONS =====

/**
 * Toggle mobile sidebar
 */
function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) {
        sidebar.classList.toggle('mobile-open');
    }
    
    if (overlay) {
        overlay.classList.toggle('mobile-open');
    }
}

/**
 * Close mobile sidebar
 */
function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) {
        sidebar.classList.remove('mobile-open');
    }
    
    if (overlay) {
        overlay.classList.remove('mobile-open');
    }
}

/**
 * Navigate to dashboard
 */
function goToDashboard() {
    closeMobileSidebar();
    window.location.href = '/dashboard.html';
}

/**
 * Navigate to recommendations
 */
function goToRecommendations() {
    closeMobileSidebar();
    window.location.href = '/recommendations.html';
}

/**
 * Navigate to market prices
 */
function goToMarket() {
    closeMobileSidebar();
    window.location.href = '/market.html';
}

/**
 * Navigate to community
 */
function goToCommunity() {
    closeMobileSidebar();
    window.location.href = '/community.html';
}

/**
 * Navigate to feedback
 */
function goToFeedback() {
    closeMobileSidebar();
    window.location.href = '/feedback.html';
}

/**
 * Navigate to profile
 */
function goToProfile() {
    closeMobileSidebar();
    window.location.href = '/profile.html';
}

/**
 * Navigate to settings
 */
function goToSettings() {
    closeMobileSidebar();
    window.location.href = '/settings.html';
}

/**
 * Toggle language dropdown
 */
function toggleLanguageDropdown() {
    const menu = document.getElementById('languageDropdownMenu');
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
    const btnText = document.getElementById('languageBtnText');
    if (btnText) {
        btnText.textContent = text;
    }
    
    const select = document.getElementById('languageSelect');
    if (select) {
        select.value = lang;
    }
    
    const menu = document.getElementById('languageDropdownMenu');
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
    const cached = localStorage.getItem('user');
    if (cached) {
        try {
            const user = JSON.parse(cached);
            const name = user.name || user.username || 'Farmer';
            const phone = user.phone || user.phone_number || '—';
            
            // Update sidebar user info
            const userNameEl = document.getElementById('userName');
            const userPhoneEl = document.getElementById('userPhone');
            if (userNameEl) userNameEl.textContent = name;
            if (userPhoneEl) userPhoneEl.textContent = phone;
            
            // Update nav profile (if exists)
            const navProfileName = document.getElementById('navProfileName');
            const navProfileAvatar = document.getElementById('navProfileAvatar');
            
            if (navProfileName) navProfileName.textContent = name;
            if (navProfileAvatar) {
                // Set avatar initial
                navProfileAvatar.textContent = name.charAt(0).toUpperCase();
            }
            
            return { name, phone };
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
    
    // Set defaults
    const userNameEl = document.getElementById('userName');
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
function initNavBar(options = {}) {
    const {
        pageTitle = 'Fahamu Shamba',
        showBackButton = true
    } = options;
    
    // Set page title
    const titleEl = document.getElementById('navPageTitle');
    if (titleEl) {
        titleEl.textContent = pageTitle;
    }
    
    // Set back button visibility
    const backBtn = document.getElementById('navBackBtn');
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
    const storedLang = getStoredLanguage();
    if (storedLang) {
        changeLanguage(storedLang);
    }
    
    // Close sidebar on outside click (mobile)
    document.addEventListener('click', function(event) {
        const sidebar = document.getElementById('sidebar');
        const hamburger = document.querySelector('.nav-hamburger');
        
        if (!sidebar || !sidebar.classList.contains('mobile-open')) return;
        if (sidebar.contains(event.target)) return;
        if (hamburger && hamburger.contains(event.target)) return;
        
        closeMobileSidebar();
    });
    
    // Close sidebar on window resize to desktop
    window.addEventListener('resize', function() {
        if (window.innerWidth > 992) {
            closeMobileSidebar();
        }
    });
}

// ===== EXPORT FOR GLOBAL USE =====

// Make functions available globally
window.toggleMobileSidebar = toggleMobileSidebar;
window.closeMobileSidebar = closeMobileSidebar;
window.goToDashboard = goToDashboard;
window.goToRecommendations = goToRecommendations;
window.goToMarket = goToMarket;
window.goToCommunity = goToCommunity;
window.goToFeedback = goToFeedback;
window.goToProfile = goToProfile;
window.goToSettings = goToSettings;
window.changeLanguage = changeLanguage;
window.toggleLanguageDropdown = toggleLanguageDropdown;
window.selectLanguageOption = selectLanguageOption;
window.loadUserProfile = loadUserProfile;
window.logout = logoutUser;
window.initNavBar = initNavBar;
window.getCurrentLanguage = getCurrentLanguage;
window.setLanguage = setStoredLanguage;
window.getStoredLanguage = getStoredLanguage;

// Legacy compatibility
window.logoutUser = logoutUser;

