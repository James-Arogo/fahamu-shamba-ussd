/**
 * Unified Sidebar Navigation Functions
 * Centralized hamburger toggle logic for ALL pages
 * 
 * This is the SINGLE SOURCE OF TRUTH for sidebar functionality.
 */

(function() {
    'use strict';
    
    // ===== SIDEBAR LOADER =====
    
    /**
     * Dynamically loads the sidebar component into the page
     */
    async function loadSidebar() {
        const sidebarContainer = document.getElementById('sidebar-container');
        if (!sidebarContainer) return;

        try {
            const response = await fetch('/components/sidebar.html');
            if (!response.ok) throw new Error('Failed to fetch sidebar component');
            
            const html = await response.text();
            sidebarContainer.innerHTML = html;
            
            // ENSURE SIDEBAR IS CLOSED ON INITIAL LOAD
            // This fixes the "dull screen" issue where old states might persist
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (sidebar) {
                sidebar.classList.remove('mobile-open');
                sidebar.classList.remove('active');
            }
            if (overlay) {
                overlay.classList.remove('mobile-open');
                overlay.classList.remove('active');
            }
            document.body.style.overflow = '';
            
            // Set active menu item based on current URL
            setActiveMenuItem();
            
            // Set user info from localStorage
            setUserInfo();
            
            // Add "subside" transition to all sidebar links
            addNavEventListeners();
            
            // Re-bind hamburger buttons across the page
            bindHamburgerButtons();
            
            console.log('Sidebar component loaded and initialized (Closed state)');
            
        } catch (error) {
            console.error('Error loading sidebar component:', error);
        }
    }

    function setActiveMenuItem() {
        const path = window.location.pathname;
        const navItems = {
            '/dashboard': 'nav-dashboard',
            '/dashboard.html': 'nav-dashboard',
            '/recommendations': 'nav-recommendations',
            '/recommendations.html': 'nav-recommendations',
            '/market': 'nav-market',
            '/market.html': 'nav-market',
            '/market-trends': 'nav-market',
            '/market-trends.html': 'nav-market',
            '/community': 'nav-community',
            '/community.html': 'nav-community',
            '/feedback': 'nav-feedback',
            '/feedback.html': 'nav-feedback',
            '/profile': 'nav-profile',
            '/profile.html': 'nav-profile',
            '/settings': 'nav-settings',
            '/settings.html': 'nav-settings'
        };

        const activeId = navItems[path];
        if (activeId) {
            document.querySelectorAll('.sidebar .nav-item').forEach(el => el.classList.remove('active'));
            const element = document.getElementById(activeId);
            if (element) element.classList.add('active');
        }
    }

    function setUserInfo() {
        try {
            const userData = localStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                const nameEl = document.getElementById('sidebar-user-name');
                const phoneEl = document.getElementById('sidebar-user-phone');
                const avatarEl = document.getElementById('sidebar-user-avatar');

                if (nameEl) nameEl.textContent = user.username || user.name || 'Farmer';
                if (phoneEl) phoneEl.textContent = user.phone || '';
                
                if (avatarEl) {
                    if (user.profile_photo) {
                        avatarEl.innerHTML = `<img src="${user.profile_photo}" alt="Profile" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                    } else if (user.username || user.name) {
                        const initial = (user.username || user.name).charAt(0).toUpperCase();
                        avatarEl.innerHTML = `<span>${initial}</span>`;
                    }
                }
            }
        } catch (e) {
            console.error('Error setting user info:', e);
        }
    }

    /**
     * Adds event listeners to nav items to "subside" sidebar before navigation
     */
    function addNavEventListeners() {
        const navItems = document.querySelectorAll('.sidebar .nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                if (window.innerWidth <= 992) {
                    const href = this.getAttribute('href');
                    if (href && href !== '#' && !href.startsWith('javascript:')) {
                        e.preventDefault();
                        
                        // 1. SUBIDE EFFECT: Close sidebar first
                        closeMobileSidebar();
                        
                        // 2. SMOOTH DELAY: Wait for transition to finish before changing page
                        setTimeout(() => {
                            window.location.href = href;
                        }, 350); // Matches the 0.3s CSS transition + small buffer
                    }
                }
            });
        });
    }

    // ===== CENTRALIZED TOGGLE FUNCTIONS =====
    
    function toggleMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (!sidebar) {
            console.warn('Sidebar not ready yet');
            return;
        }
        
        const isOpen = sidebar.classList.toggle('mobile-open');
        sidebar.classList.toggle('active'); // Dual-class support for safety
        
        if (overlay) {
            if (isOpen) {
                overlay.classList.add('mobile-open', 'active');
            } else {
                overlay.classList.remove('mobile-open', 'active');
            }
        }
        
        const hamburger = document.getElementById('hamburger') || 
                         document.querySelector('.nav-hamburger') || 
                         document.querySelector('.mobile-menu-btn');
        if (hamburger) {
            hamburger.setAttribute('aria-expanded', isOpen);
        }
        
        // Prevent background scrolling while menu is open
        document.body.style.overflow = isOpen ? 'hidden' : '';
    }
    
    function closeMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (sidebar) {
            sidebar.classList.remove('mobile-open', 'active');
        }
        
        if (overlay) {
            overlay.classList.remove('mobile-open', 'active');
        }
        
        const hamburger = document.getElementById('hamburger') || 
                         document.querySelector('.nav-hamburger') || 
                         document.querySelector('.mobile-menu-btn');
        if (hamburger) {
            hamburger.setAttribute('aria-expanded', 'false');
        }
        
        document.body.style.overflow = '';
    }

    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        }
    }
    
    function bindHamburgerButtons() {
        // Direct click binding for instant response
        const selectors = ['#hamburger', '.nav-hamburger', '.mobile-menu-btn'];
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(btn => {
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleMobileSidebar();
                };
            });
        });
    }
    
    // Logout function
    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }
    
    // ===== INITIALIZATION =====
    
    function init() {
        // 1. Load sidebar immediately
        loadSidebar();

        // 2. Global event delegation (Backup for async loading)
        document.addEventListener('click', (e) => {
            const hamburger = e.target.closest('#hamburger') || 
                             e.target.closest('.nav-hamburger') || 
                             e.target.closest('.mobile-menu-btn');
            
            if (hamburger) {
                e.preventDefault();
                e.stopPropagation();
                toggleMobileSidebar();
                return;
            }
            
            // Check for overlay clicks to close
            if (e.target.id === 'sidebarOverlay' || e.target.classList.contains('sidebar-overlay')) {
                closeMobileSidebar();
            }
        });

        // 3. Handle Desktop State
        if (window.innerWidth > 992) {
            const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            if (isCollapsed) {
                const checkSidebar = setInterval(() => {
                    const sidebar = document.getElementById('sidebar');
                    if (sidebar) {
                        sidebar.classList.add('collapsed');
                        clearInterval(checkSidebar);
                    }
                }, 100);
                setTimeout(() => clearInterval(checkSidebar), 3000);
            }
        }

        // 4. Auto-close on resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 992) {
                closeMobileSidebar();
            }
        });
    }
    
    // Export to global scope
    window.toggleMobileSidebar = toggleMobileSidebar;
    window.closeMobileSidebar = closeMobileSidebar;
    window.toggleSidebar = toggleSidebar;
    window.setUserInfo = setUserInfo;
    window.logout = logout;
    window.goToDashboard = () => window.location.href = '/dashboard.html';
    window.goToRecommendations = () => window.location.href = '/recommendations.html';
    window.goToMarket = () => window.location.href = '/market.html';
    window.goToCommunity = () => window.location.href = '/community.html';
    window.goToFeedback = () => window.location.href = '/feedback.html';
    window.goToProfile = () => window.location.href = '/profile.html';
    window.goToSettings = () => window.location.href = '/settings.html';
    
    // Auto-run
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
