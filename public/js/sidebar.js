/**
 * Shared Sidebar Navigation Functions
 * Used across all authenticated pages
 */

// Toggle desktop sidebar collapse
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

// Toggle mobile sidebar
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

// Close mobile sidebar
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

// Navigation functions
function goToDashboard() {
    closeMobileSidebar();
    window.location.href = '/dashboard.html';
}

function goToRecommendations() {
    closeMobileSidebar();
    window.location.href = '/recommendations.html';
}

function goToMarket() {
    closeMobileSidebar();
    window.location.href = '/market.html';
}

function goToCommunity() {
    closeMobileSidebar();
    window.location.href = '/community.html';
}

function goToFeedback() {
    closeMobileSidebar();
    window.location.href = '/feedback.html';
}

function goToProfile() {
    closeMobileSidebar();
    window.location.href = '/profile.html';
}

function goToSettings() {
    closeMobileSidebar();
    window.location.href = '/settings.html';
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// Initialize sidebar on page load
document.addEventListener('DOMContentLoaded', function() {
    // Add click listeners to nav items for mobile
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Close mobile sidebar when nav item is clicked
            if (window.innerWidth <= 992) {
                closeMobileSidebar();
            }
        });
    });
    
    // Close sidebar on overlay click
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeMobileSidebar);
    }
    
    // Close sidebar on window resize to desktop
    window.addEventListener('resize', function() {
        if (window.innerWidth > 992) {
            closeMobileSidebar();
        }
    });
});

