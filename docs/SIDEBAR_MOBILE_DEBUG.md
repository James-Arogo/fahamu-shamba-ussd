# Sidebar Mobile Toggle - Debug & Testing Guide

## Current Setup Verification

### ✅ What's Correctly Implemented:

1. **CSS Rules** (Lines 256-269 in dashboard.html):
   ```css
   @media (max-width: 992px) {
       .sidebar {
           transform: translateX(-100%);
           transition: transform 0.3s ease;
       }
       
       .sidebar.mobile-open {
           transform: translateX(0);  /* This slides sidebar IN */
       }
   }
   ```

2. **JavaScript Function** (Lines 1627-1634):
   ```javascript
   window.toggleMobileSidebar = function (e) {
       if (e) e.preventDefault();
       var sidebar = document.getElementById('sidebar');
       var overlay = document.getElementById('sidebarOverlay');
       if (sidebar) sidebar.classList.toggle('mobile-open');  // Adds/removes .mobile-open class
       if (overlay) overlay.classList.toggle('mobile-open');
       return false;
   };
   ```

3. **HTML Button** (Line 1704):
   ```html
   <button id="hamburger" class="nav-hamburger" type="button" 
       onclick="return toggleMobileSidebar(event)"
       aria-label="Open menu" aria-expanded="false">
       <i class="fas fa-bars"></i>
   </button>
   ```

4. **Event Listener Setup** (Lines 1643-1653):
   ```javascript
   document.addEventListener('DOMContentLoaded', function () {
       var hamburger = document.getElementById('hamburger');
       if (hamburger) {
           hamburger.onclick = function (e) { 
               window.toggleMobileSidebar(e); 
               return false; 
           };
       }
   });
   ```

## Testing Steps

### Step 1: Verify Mobile Viewport
Open browser DevTools (F12) and:
1. Click the device toggle icon (top-left of DevTools)
2. Select a mobile device (iPhone, Pixel, etc.) or manually set width < 992px
3. Refresh the page

### Step 2: Check if Hamburger is Visible
- Look at the top-left of the navbar
- You should see a hamburger icon (☰) button
- On desktop (>992px), this button should be HIDDEN
- On mobile (<992px), this button should be VISIBLE

### Step 3: Test Click Handler
In browser console (F12 → Console tab), run:
```javascript
// Test if function exists
console.log(typeof window.toggleMobileSidebar);  // Should print: "function"

// Check sidebar element
var sidebar = document.getElementById('sidebar');
console.log(sidebar);  // Should print the sidebar element

// Check current classes
console.log(sidebar.classList);  // Look for 'mobile-open' class

// Manually test the toggle
window.toggleMobileSidebar();
console.log(sidebar.classList);  // Should show 'mobile-open' was added
```

### Step 4: Verify Transform is Applied
In DevTools Inspector:
1. Right-click on sidebar → Inspect
2. Look at Computed Styles tab
3. Find `transform` property
4. When `mobile-open` class is present, it should show: `transform: translateX(0)`
5. Without class, it should show: `transform: translateX(-260px)` or `translateX(-100%)`

### Step 5: Check Media Query is Active
In DevTools Console:
```javascript
// Check if media query is active
var styles = window.getComputedStyle(document.querySelector('.sidebar'));
console.log(styles.transform);  // Should be "translateX(-260px)" on mobile before clicking

// After clicking hamburger:
// Should change to "translateX(0)" or "matrix(1, 0, 0, 1, 0, 0)"
```

## Possible Issues & Solutions

### Issue 1: Hamburger Not Visible
**Symptom:** Can't see hamburger button on mobile
- [ ] Check viewport is < 992px wide
- [ ] Check CSS `.nav-hamburger { display: flex; }` in media query
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Hard refresh (Ctrl+Shift+R)

### Issue 2: Hamburger Visible but Doesn't Respond to Click
**Symptom:** Click hamburger, nothing happens
- [ ] Check if `toggleMobileSidebar` function is defined (use console test)
- [ ] Check if hamburger element has proper `onclick` attribute
- [ ] Check browser console for JavaScript errors (F12 → Console)
- [ ] Try clicking hamburger and check console for errors

### Issue 3: Class Added but Sidebar Doesn't Slide
**Symptom:** Click hamburger, `mobile-open` class is added but sidebar stays off-screen
- [ ] Verify CSS media query is active:
  ```javascript
  var mq = window.matchMedia('(max-width: 992px)');
  console.log(mq.matches);  // Should be true on mobile
  ```
- [ ] Check for CSS specificity issues (use DevTools Inspector)
- [ ] Check if transform is being overridden by another rule
- [ ] Add `!important` flag to debug:
  ```css
  .sidebar.mobile-open {
      transform: translateX(0) !important;
  }
  ```

### Issue 4: Sidebar Slides Out but Hard to Close
**Symptom:** Can open sidebar but clicking overlay or close button doesn't work
- [ ] Check if overlay element exists: `document.getElementById('sidebarOverlay')`
- [ ] Check if close button has proper `onclick="return closeMobileSidebar(event)"`
- [ ] Check `closeMobileSidebar` function is defined

## Quick Fix Checklist

If sidebar still doesn't work after above steps:

1. **Add Enhanced CSS** (Lines 1500-1512 in second media query):
   ```css
   @media (max-width: 992px) {
       .sidebar {
           transform: translateX(-100%);
           width: var(--sidebar-width) !important;
           z-index: 1001;
       }

       .sidebar.mobile-open {
           transform: translateX(0) !important;  /* Force with !important */
           z-index: 1001;
       }

       .sidebar-overlay {
           display: none !important;
       }

       .sidebar-overlay.mobile-open {
           display: block !important;
           z-index: 1000;
       }

       .sidebar-close-btn {
           display: flex !important;  /* Show close button on mobile */
       }
   }
   ```

2. **Verify Both Media Queries Exist**:
   - First at line 250-282 (detailed rules)
   - Second at line 1500-1512 (override rules)
   - Both should have the same `.mobile-open` transform rules

3. **Test with Browser DevTools**:
   - Set viewport to iPhone SE (375px)
   - Toggle device mode on/off to reload
   - Click hamburger
   - Sidebar should smoothly slide from left

## Expected Behavior

✅ **Desktop (>992px)**:
- Sidebar fully visible on left
- Hamburger button hidden
- Main content has left margin

✅ **Mobile (<992px)**:
- Sidebar hidden off-screen (translateX(-100%))
- Hamburger button visible in top-left
- Click hamburger → sidebar slides in from left
- Overlay appears (semi-transparent background)
- Click overlay or close button (X) → sidebar slides back out
- Sidebar should have smooth 0.3s transition animation

## Contact Notes
If sidebar still doesn't appear after following all steps, check:
- Network tab for failed CSS file loads
- Console for JavaScript errors
- Verify sidebar element has `id="sidebar"` attribute
- Verify overlay element has `id="sidebarOverlay"` attribute
