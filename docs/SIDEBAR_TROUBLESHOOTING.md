# Sidebar Mobile Toggle - Complete Troubleshooting Guide

## Quick Summary

The sidebar mobile toggle uses:
1. **CSS Transform** to hide/show sidebar
2. **JavaScript class toggle** to add/remove `.mobile-open` class
3. **Media query** to apply these rules only on mobile (<992px)

## What Should Happen

### On Desktop (>992px):
- ✓ Sidebar is VISIBLE on the left side
- ✓ Hamburger button is HIDDEN
- ✓ Main content has 260px left margin

### On Mobile (<992px):
- ✓ Sidebar is HIDDEN off-screen (translateX(-100%))
- ✓ Hamburger button is VISIBLE in top-left
- ✓ Click hamburger → sidebar slides in from left (translateX(0))
- ✓ Overlay appears behind sidebar
- ✓ Click overlay or close button → sidebar slides back out
- ✓ Animation takes 0.3 seconds (smooth transition)

## How to Test

### Method 1: Use Browser DevTools
1. Open dashboard.html
2. Press F12 to open DevTools
3. Click device toggle icon (📱) in top-left of DevTools
4. Select mobile device (iPhone SE, Pixel 5, etc.)
5. Refresh page (F5)
6. Click hamburger button (☰) at top-left

### Method 2: Use Test Page
1. Open `/sidebar-test.html` in your browser
2. This page has status display and test buttons
3. Shows real-time debugging information
4. Can manually test toggle from buttons

### Method 3: Resize Window Manually
1. Open dashboard.html
2. Drag window edge to make it narrower
3. When width < 992px, hamburger should appear
4. Click to test

## Detailed Verification Steps

### Step 1: Check Mobile Viewport
```javascript
// Run in browser console (F12)
window.innerWidth  // Should be < 992 for mobile rules to apply
```

### Step 2: Verify CSS Media Query is Active
```javascript
var mq = window.matchMedia('(max-width: 992px)');
console.log(mq.matches);  // Should be TRUE on mobile
```

### Step 3: Check Hamburger Button
```javascript
var hamburger = document.getElementById('hamburger');
console.log(hamburger);  // Should find the button element
var styles = window.getComputedStyle(hamburger);
console.log(styles.display);  // Should be 'flex' on mobile
```

### Step 4: Check Sidebar Element
```javascript
var sidebar = document.getElementById('sidebar');
console.log(sidebar);  // Should find the <aside> element
console.log(sidebar.classList);  // Check current classes
```

### Step 5: Test Toggle Function
```javascript
// Check function exists
console.log(typeof window.toggleMobileSidebar);  // Should be 'function'

// Check sidebar position BEFORE
var sidebar = document.getElementById('sidebar');
var before = window.getComputedStyle(sidebar).transform;
console.log('Before:', before);

// Toggle
window.toggleMobileSidebar();

// Check sidebar position AFTER
var after = window.getComputedStyle(sidebar).transform;
console.log('After:', after);

// Should change from matrix(1, 0, 0, 1, -260, 0) to matrix(1, 0, 0, 1, 0, 0)
```

## Common Issues & Solutions

### Issue 1: Hamburger Not Visible on Mobile
**Symptom:** Can't see ☰ button even with width < 992px

**Diagnostic:**
```javascript
var mq = window.matchMedia('(max-width: 992px)');
console.log('Mobile:', mq.matches);

var hamburger = document.getElementById('hamburger');
console.log('Hamburger:', hamburger);
console.log('Display:', window.getComputedStyle(hamburger).display);
```

**Solutions:**
- [ ] Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- [ ] Clear browser cache
- [ ] Check CSS file `/css/navbar.css` is loading
- [ ] Verify media query exists at line 250 in dashboard.html
- [ ] Check for conflicting CSS with higher specificity

---

### Issue 2: Hamburger Visible but Doesn't Open Sidebar
**Symptom:** Click hamburger, nothing happens

**Diagnostic:**
```javascript
// Check if function is callable
window.toggleMobileSidebar();

// Check what happens
var sidebar = document.getElementById('sidebar');
console.log('Before:', sidebar.classList);

window.toggleMobileSidebar();
console.log('After:', sidebar.classList);
```

**Solutions:**
- [ ] Check browser console for JavaScript errors
- [ ] Verify `onclick="return toggleMobileSidebar(event)"` on button (line 1704)
- [ ] Test function manually in console: `window.toggleMobileSidebar()`
- [ ] Check if DOMContentLoaded listener is set up (lines 1643-1653)

---

### Issue 3: Class Added but Sidebar Doesn't Slide
**Symptom:** Click hamburger, class is added, but sidebar stays off-screen

**Diagnostic:**
```javascript
var sidebar = document.getElementById('sidebar');
var transform = window.getComputedStyle(sidebar).transform;
console.log('Transform:', transform);
console.log('Classes:', sidebar.className);

// If classes include 'mobile-open', transform should be translateX(0)
// If not, there's a CSS issue
```

**Solutions:**
- [ ] Check CSS media query at line 267-269:
  ```css
  .sidebar.mobile-open {
      transform: translateX(0);  /* THIS IS CRITICAL */
  }
  ```
- [ ] Verify it has SAME specificity as `.sidebar` rule
- [ ] Try adding `!important` flag:
  ```css
  .sidebar.mobile-open {
      transform: translateX(0) !important;
  }
  ```
- [ ] Check for other CSS rules overriding transform
- [ ] Clear CSS cache

---

### Issue 4: Sidebar Opens but Can't Close
**Symptom:** Sidebar slides in but overlay click or close button don't work

**Diagnostic:**
```javascript
// Check close function exists
console.log(typeof window.closeMobileSidebar);

// Check overlay element
var overlay = document.getElementById('sidebarOverlay');
console.log('Overlay:', overlay);
console.log('Overlay onclick:', overlay.onclick);

// Test close manually
window.closeMobileSidebar();
var sidebar = document.getElementById('sidebar');
console.log('Sidebar classes after close:', sidebar.className);
```

**Solutions:**
- [ ] Verify close button has `onclick="return closeMobileSidebar(event)"`
- [ ] Verify overlay has `onclick="closeMobileSidebar(event)"`
- [ ] Check `closeMobileSidebar` function exists (lines 1635-1642)
- [ ] Test manually in console: `window.closeMobileSidebar()`

---

### Issue 5: Animation Jumpy or No Smooth Transition
**Symptom:** Sidebar jumps instead of smoothly sliding

**Diagnostic:**
```javascript
var sidebar = document.getElementById('sidebar');
var styles = window.getComputedStyle(sidebar);
console.log('Transition:', styles.transition);
// Should show: 'transform 0.3s ease'
```

**Solutions:**
- [ ] Verify CSS has transition rule (line 264):
  ```css
  .sidebar {
      transition: transform 0.3s ease;
  }
  ```
- [ ] Check no other rules are removing transition
- [ ] Ensure transform-origin is not set to something unusual

---

## Step-by-Step Fix

If sidebar still doesn't work after above checks:

### Step 1: Verify CSS Exists
Look at lines 250-282 in dashboard.html:
```css
@media (max-width: 992px) {
    .sidebar {
        transform: translateX(-100%);
        transition: transform 0.3s ease;
    }
    
    .sidebar.mobile-open {
        transform: translateX(0);
    }
}
```

### Step 2: Verify JavaScript Exists
Look at lines 1626-1653:
```javascript
window.toggleMobileSidebar = function(e) {
    if (e) e.preventDefault();
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.toggle('mobile-open');
    if (overlay) overlay.classList.toggle('mobile-open');
    return false;
};
```

### Step 3: Verify HTML is Correct
- Line 1704: Hamburger button has `id="hamburger"` ✓
- Line 1670: Sidebar has `id="sidebar"` ✓
- Line 1666: Overlay has `id="sidebarOverlay"` ✓

### Step 4: Test on Test Page
1. Open `sidebar-test.html`
2. Use test buttons to verify components work
3. Try resizing window to < 992px
4. If it works here but not dashboard, check for CSS conflicts

### Step 5: Add Debug CSS
Temporarily add this to see what's happening:
```css
.sidebar {
    border: 3px solid red;  /* See where sidebar is */
}

.sidebar.mobile-open {
    border: 3px solid green;  /* See when class is added */
}
```

## Files to Check

| File | Lines | What to Check |
|------|-------|---------------|
| dashboard.html | 250-282 | First media query with .sidebar.mobile-open |
| dashboard.html | 1500-1512 | Second media query (override rules) |
| dashboard.html | 1626-1653 | JavaScript toggle functions |
| dashboard.html | 1666 | `<div id="sidebarOverlay">` element |
| dashboard.html | 1670 | `<aside id="sidebar">` element |
| dashboard.html | 1704 | `<button id="hamburger">` element |
| css/navbar.css | Entire file | Check for conflicting styles |
| css/sidebar.css | Entire file | Check for conflicting styles |
| js/navbar.js | Lines 72-99 | Check for competing toggle functions |

## Browser DevTools Shortcuts

| Action | Shortcut |
|--------|----------|
| Open DevTools | F12 (or right-click → Inspect) |
| Open Console | Ctrl+Shift+J (or F12 then Console tab) |
| Toggle Device Mode | Ctrl+Shift+M |
| Hard Refresh | Ctrl+Shift+R |
| Inspect Element | Right-click → Inspect |

## Final Checklist

- [ ] Media query active on mobile (<992px width)
- [ ] Hamburger button visible on mobile
- [ ] Hamburger button hidden on desktop
- [ ] Click hamburger adds `mobile-open` class
- [ ] `.sidebar.mobile-open { transform: translateX(0); }` exists in CSS
- [ ] Sidebar slides in smoothly with 0.3s transition
- [ ] Overlay appears when sidebar opens
- [ ] Click overlay removes `mobile-open` class
- [ ] Close button (X) removes `mobile-open` class
- [ ] Sidebar slides out smoothly
- [ ] No console errors
- [ ] Works on real mobile device or DevTools mobile emulation

## Additional Resources

- Test Page: `/sidebar-test.html` - Isolated test with debugging
- Debug Guide: `/SIDEBAR_MOBILE_DEBUG.md` - Detailed testing steps
- Main File: `/public/dashboard.html` - Source of truth

---

**Last Updated:** 2026-03-11
**Status:** ✓ CSS and JavaScript implemented and verified
