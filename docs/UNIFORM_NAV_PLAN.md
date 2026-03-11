# Uniform Nav Bar Implementation Plan

## Objective
Implement a uniform nav bar design across all pages with:
- ☰ Hamburger button (always visible, opens sidebar)
- ⬅ Back to Dashboard button (visible on all pages except dashboard)
- 📌 Page Title (center, bold)
- 👤 Farmer Profile (right side, shows name/ID)

## Language Handling
- Language dropdown ONLY on landing page
- Store language in localStorage/sessionStorage
- Auto-load language on all other pages

## Implementation Steps

### Step 1: Create shared CSS (public/css/navbar.css) ✅
- Uniform nav bar styles
- Green/white theme
- Responsive design
- Smooth animations

### Step 2: Update shared JavaScript (public/js/navbar.js) ✅
- Nav bar toggle functions
- Language auto-load
- Profile display

### Step 3: Update Pages ✅
- [x] dashboard.html - Updated with uniform nav
- [x] recommendations.html - Added uniform nav, removed language dropdown
- [x] market.html - Added uniform nav, removed language dropdown
- [x] community.html - Added uniform nav, removed language dropdown
- [x] feedback.html - Added uniform nav, removed language dropdown
- [x] profile.html - Added uniform nav, removed language dropdown, ADDED back button
- [x] settings.html - Added uniform nav, removed language dropdown

### Step 4: Visual Enhancements ✅
- Active page title highlighted (bold/underline)
- Smooth sidebar animation
- Large touch targets for mobile

## Files Created/Modified
1. public/css/navbar.css (created)
2. public/js/navbar.js (created)
3. public/dashboard.html (updated)
4. public/recommendations.html (updated)
5. public/market.html (updated)
6. public/community.html (updated)
7. public/feedback.html (updated)
8. public/profile.html (updated)
9. public/settings.html (updated)

