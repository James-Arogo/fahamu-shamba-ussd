# Android Studio APK Build - Complete Step-by-Step Guide

## Overview
Build standalone Android APK using Android Studio (native approach).

**Time required**: 45 minutes - 1 hour (first time)
**Result**: Production-ready APK file

---

## Phase 1: Prerequisites & Installation

### Step 1.1: Check if Android Studio is Installed
```bash
# PowerShell
where.exe Android Studio
# or
Get-Command AndroidStudio
```

**If installed**: Skip to Step 2 (Open Project)
**If NOT installed**: Continue below

### Step 1.2: Install Android Studio
1. Visit: https://developer.android.com/studio
2. Click "Download Android Studio"
3. Run installer
4. Follow installation wizard:
   - Accept license
   - Select installation path (default OK)
   - Choose components (default: Android SDK, Android Emulator, etc.)
5. Wait for installation (10-15 minutes)
6. Click "Finish"

### Step 1.3: Install Java Development Kit (JDK)
Android Studio includes JDK, but verify:
1. Open Android Studio
2. Help → About
3. Should show JDK path
4. If not found:
   - Download JDK 17+ from: https://www.oracle.com/java/technologies/downloads/
   - Or: `choco install openjdk17` (if Chocolatey installed)

### Step 1.4: Configure Android SDK
1. Open Android Studio
2. File → Settings (or Android Studio → Preferences on Mac)
3. Appearance & Behavior → System Settings → Android SDK
4. Verify:
   - SDK Platforms tab: Android 12+ selected
   - SDK Tools tab: Android SDK Build-Tools, Android Emulator installed
5. Click "Apply" → "OK"

**Expected time for all prerequisites**: 30-45 minutes (one-time only)

---

## Phase 2: Open Project in Android Studio

### Step 2.1: Launch Android Studio
1. Open Android Studio
2. Click "Open"
3. Navigate to: `c:\Users\ADMIN\fahamu-shamba1-main\android-studio\FahamuShamba`
4. Click "Open"

### Step 2.2: Wait for Project to Load
```
Android Studio will:
✓ Index project files (2-3 minutes)
✓ Download gradle dependencies (5-10 minutes)
✓ Sync project (1-2 minutes)

Status shown at bottom: "Gradle Sync"
Wait until complete (no errors)
```

### Step 2.3: Verify Project Loaded
You should see:
```
Left panel: Project structure
├── app
│   ├── manifests
│   ├── java
│   ├── res (resources)
│   └── build.gradle
├── gradle
└── settings.gradle

Center panel: Code editor (empty initially)
Right panel: Build/Run tools
```

If you see errors in red:
- Wait 30 seconds
- Right-click project → "Sync Now"
- Wait for gradle sync to complete

---

## Phase 3: Configure Backend API URL

### Step 3.1: Open MainActivity.java
1. In left panel, expand: `app` → `src` → `main` → `java` → `com.fahamu.shamba`
2. Double-click `MainActivity.java`
3. Opens in center editor

### Step 3.2: Find API URL
Search in file (Ctrl+F):
```
Search for: "websiteUrl"
or "localhost"
or "http"
```

### Step 3.3: Update URL
Find this line:
```java
// Before:
String websiteUrl = "http://localhost:5000";

// Change to your backend:
String websiteUrl = "https://your-backend-domain.com";
```

**Options:**
```java
// Option 1: Local testing
String websiteUrl = "http://192.168.1.100:5000";
// (Replace 192.168.1.100 with your PC's IP)

// Option 2: Vercel deployment
String websiteUrl = "https://your-vercel-api.vercel.app";

// Option 3: Cloud server
String websiteUrl = "https://api.yourdomain.com";
```

### Step 3.4: Save File
Press: `Ctrl+S` or File → Save

---

## Phase 4: Build APK

### Step 4.1: Start Build Process
Menu → Build → Build Bundle(s) / APK(s) → Build APK(s)

```
Expected status messages:
√ Gradle preparation...
√ Compiling...
√ Building APK...
✓ Build Successful
```

### Step 4.2: Wait for Build
Expected time: 5-10 minutes
- First build: 10-15 minutes
- Subsequent builds: 5-10 minutes

**Progress shown in**:
- Bottom status bar: "Build: ..."
- Build console: Details and warnings

### Step 4.3: Verify Build Success
You should see:
```
✓ Built the following APK(s):
c:\Users\ADMIN\fahamu-shamba1-main\android-studio\FahamuShamba\app\release\app-release.apk

Build Successful
```

If build FAILS:
- See "Troubleshooting" section below
- Check Build console for errors
- Try "Build → Clean Project" then rebuild

### Step 4.4: Locate APK File
APK location:
```
c:\Users\ADMIN\fahamu-shamba1-main\android-studio\FahamuShamba\app\release\app-release.apk
```

Or in Android Studio:
- At bottom of Build Output: Click "Show in Explorer" link

---

## Phase 5: Install on Android Phone

### Option A: USB Cable (Recommended for Testing)

#### Step 5.1: Connect Phone via USB
1. Connect Android phone to PC with USB cable
2. On phone:
   - Settings → Developer Options → USB Debugging → Enable
   - (If "Developer Options" not visible: Settings → About Phone → Tap Build Number 7 times)
3. Allow USB access when prompted on phone

#### Step 5.2: Install APK
```bash
# PowerShell
cd c:\Users\ADMIN\fahamu-shamba1-main\android-studio\FahamuShamba\app\release\
adb install app-release.apk
```

Expected output:
```
✓ Starting install (might take a minute or more)...
✓ Success
```

#### Step 5.3: Run App
On phone:
- App icon appears automatically
- Tap to open
- First launch may take 10-30 seconds

### Option B: Email APK to Users

#### Step 5.1: Prepare APK
```bash
# Copy APK
Copy-Item "app\release\app-release.apk" "Desktop\app-release.apk"
```

#### Step 5.2: Email or Cloud Upload
```
1. Email file to users
   OR
2. Upload to Google Drive, Dropbox
3. Share download link
4. Users download and tap to install
```

#### Step 5.3: Installation on User's Phone
User does:
1. Download APK file
2. Open Downloads folder
3. Tap APK file
4. Allow installation from "Unknown sources" if prompted
5. Wait for installation (1-2 minutes)
6. App appears on home screen

### Option C: Host on Web Server
```
1. Upload APK to your web server
2. Create download link
3. Share via QR code or URL
4. Users tap link → Download → Install
```

---

## Phase 6: Test on Android Phone

### Step 6.1: Open App
Tap app icon or:
```bash
adb shell am start -n com.fahamu.shamba/.MainActivity
```

### Step 6.2: Test Functionality
- [ ] App opens without crashes
- [ ] Splash screen displays
- [ ] Can navigate screens
- [ ] Can login/register
- [ ] Can select language
- [ ] Can select sub-county
- [ ] Can select soil type
- [ ] Can select season
- [ ] Can submit form (calls backend API)
- [ ] Results display correctly
- [ ] Portrait mode works
- [ ] Landscape mode works
- [ ] Back button navigation works

### Step 6.3: Check Network Connection
```bash
# View phone logs
adb logcat

# Look for:
# - "API call successful"
# - "Response received"
# - No "Connection refused" errors
```

### Step 6.4: Debug if Issues
```bash
# Clear app data
adb shell pm clear com.fahamu.shamba

# Reinstall
adb install -r app-release.apk

# Check logs
adb logcat | grep "Fahamu"
```

---

## Phase 7: Troubleshooting

### Issue: "Gradle sync failed"
**Solution**:
1. File → Settings → Gradle
2. Set Gradle JDK to: "Embedded JDK"
3. Click Apply
4. Right-click project → "Sync Now"

### Issue: "SDK not found"
**Solution**:
1. File → Settings → Android SDK
2. Check "Android 12+" is selected
3. Click Apply
4. Retry build

### Issue: "Build failed - Unknown error"
**Solution**:
1. Build → Clean Project
2. File → Invalidate Caches / Restart
3. Build → Build APK again
4. Check Build console for specific errors

### Issue: "Insufficient storage"
**Solution**:
Free up disk space (3GB minimum needed)

### Issue: "adb not found"
**Solution**:
```bash
# Check adb path
where adb

# If not found, add to PATH:
$env:Path += ";C:\Users\ADMIN\AppData\Local\Android\Sdk\platform-tools"
adb devices
```

### Issue: "Phone not recognized by adb"
**Solution**:
1. Disconnect phone
2. Enable Developer Options on phone
3. Enable USB Debugging
4. Reconnect phone
5. Allow USB access when prompted
6. `adb devices` should show phone

### Issue: "Installation blocked - Unknown sources"
**Solution**:
Phone settings:
1. Settings → Security
2. Enable "Unknown sources" or "Install unknown apps"
3. Try again

---

## Complete Command Reference

```bash
# Build APK (in Android Studio UI)
Menu → Build → Build Bundle(s) / APK(s) → Build APK(s)

# Or command line:
cd c:\Users\ADMIN\fahamu-shamba1-main\android-studio\FahamuShamba
.\gradlew assembleRelease

# Install on connected phone
adb install app\release\app-release.apk

# Reinstall (overwrite existing)
adb install -r app\release\app-release.apk

# Check connected devices
adb devices

# View logs
adb logcat

# Clear app data
adb shell pm clear com.fahamu.shamba

# Start app
adb shell am start -n com.fahamu.shamba/.MainActivity

# Uninstall
adb uninstall com.fahamu.shamba
```

---

## File Locations Reference

| Item | Location |
|------|----------|
| **Project** | `android-studio/FahamuShamba/` |
| **MainActivity** | `app/src/main/java/com/fahamu/shamba/MainActivity.java` |
| **Resources** | `app/src/main/res/` |
| **Manifest** | `app/src/main/AndroidManifest.xml` |
| **Build config** | `app/build.gradle` |
| **Output APK** | `app/release/app-release.apk` |

---

## Timeline Summary

```
Installation & Setup:  30-45 min (one-time)
├─ Android Studio install
├─ JDK installation
└─ SDK configuration

Project Load:          10-15 min
├─ Open in Android Studio
├─ Gradle index
└─ Sync dependencies

Configuration:         5 min
└─ Update API URL in MainActivity.java

Build:                 5-15 min
├─ Compile code
└─ Create APK

Installation:          2-5 min
└─ Transfer to phone

Testing:               10-15 min
└─ Verify functionality

TOTAL FIRST TIME:      1-1.5 hours
SUBSEQUENT BUILDS:     15-20 min
```

---

## Success Criteria

After following all steps:
- ✅ APK file exists at: `app/release/app-release.apk`
- ✅ APK installs on Android phone
- ✅ App opens without crashes
- ✅ Can login
- ✅ Can make predictions
- ✅ API calls work
- ✅ Results display correctly

---

## Next Steps After Successful Build

1. **Share APK with farmers**
   - Email APK file
   - Or share cloud download link

2. **Gather feedback**
   - Test on multiple devices
   - Collect user feedback
   - Fix issues if any

3. **Optional: Play Store**
   - Create Play Store developer account ($25)
   - Upload APK
   - Publish to store

4. **Maintenance**
   - Update code as needed
   - Rebuild and redistribute
   - Monitor crashes

---

## Quick Start Summary

**If you just want to get started NOW:**

1. ✅ Open Android Studio
2. ✅ File → Open → Select project
3. ✅ Wait for Gradle sync
4. ✅ Update API URL in MainActivity.java
5. ✅ Build → Build APK
6. ✅ Connect phone via USB
7. ✅ adb install app-release.apk
8. ✅ Test on phone

Done. APK ready to share.

---

**Start with Step 1 above. Ask for help at any step.**
