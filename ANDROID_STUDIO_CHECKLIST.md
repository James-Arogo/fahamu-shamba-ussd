# Android Studio APK Build - Quick Checklist

## Pre-Build Checklist

### Prerequisites
- [ ] Windows 10/11
- [ ] 8GB RAM minimum (4GB free)
- [ ] 10GB disk space free
- [ ] Internet connection

### Installation
- [ ] Android Studio installed (https://developer.android.com/studio)
- [ ] Android SDK 12+ installed
- [ ] JDK 17+ installed or available
- [ ] adb accessible in command line

---

## Step-by-Step Execution

### Phase 1: Prepare (5-10 min)

#### Android Studio Installation
- [ ] Download Android Studio from developer.android.com
- [ ] Run installer (accepts defaults)
- [ ] Launch Android Studio
- [ ] Wait for initial setup

#### SDK Configuration
- [ ] File → Settings → Android SDK
- [ ] Verify Android 12+ platform installed
- [ ] Verify SDK Tools installed
- [ ] Click Apply → OK

---

### Phase 2: Open Project (5 min)

- [ ] Click "Open" in Android Studio
- [ ] Navigate to: `c:\Users\ADMIN\fahamu-shamba1-main\android-studio\FahamuShamba`
- [ ] Click "Open"
- [ ] Wait for project indexing (gray bar at bottom finishes)
- [ ] Wait for Gradle sync (shows "Sync in progress...")
- [ ] Verify NO red error lines in editor

---

### Phase 3: Configure API (5 min)

#### Find MainActivity.java
- [ ] Left panel → Expand `app` → `src` → `main` → `java` → `com.fahamu.shamba`
- [ ] Double-click `MainActivity.java`
- [ ] Opens in center editor

#### Update Backend URL
- [ ] Press Ctrl+F (Find)
- [ ] Search: "websiteUrl" or "localhost"
- [ ] Find the line: `String websiteUrl = "..."`
- [ ] Update to your backend URL:
  ```java
  // Local testing (replace IP):
  String websiteUrl = "http://192.168.1.100:5000";
  
  // OR Vercel deployment:
  String websiteUrl = "https://your-api.vercel.app";
  ```
- [ ] Press Ctrl+S (Save)
- [ ] No errors in editor

---

### Phase 4: Build APK (10-15 min)

#### Start Build
- [ ] Click Menu: `Build`
- [ ] Click: `Build Bundle(s) / APK(s)`
- [ ] Click: `Build APK(s)`

#### Wait for Build
- [ ] Status bar shows "Gradle Build Running"
- [ ] Build console shows progress
- [ ] Wait for: "✓ Build Successful" message
- [ ] **Time**: 10-15 minutes (first build longer)

#### Verify Build
- [ ] Message shows: "Built the following APK(s):"
- [ ] Path shown: `app\release\app-release.apk`
- [ ] Look in build console: Click "Show in Explorer" (or find manually)
- [ ] File exists: `app/release/app-release.apk`

---

### Phase 5: Install on Phone (5-10 min)

#### Prepare Phone
- [ ] Enable USB Debugging:
  - Settings → About Phone → Tap "Build Number" 7 times
  - Back → Developer Options → USB Debugging → ON
  
#### Connect Phone
- [ ] Connect phone to PC via USB cable
- [ ] Allow "USB Debugging" permission if prompted on phone
- [ ] Command: `adb devices` shows your phone

#### Install APK
- [ ] Open PowerShell
- [ ] Navigate to APK folder:
  ```bash
  cd c:\Users\ADMIN\fahamu-shamba1-main\android-studio\FahamuShamba\app\release\
  ```
- [ ] Install:
  ```bash
  adb install app-release.apk
  ```
- [ ] Wait for: "Success" message
- [ ] App icon appears on phone home screen

---

### Phase 6: Test on Phone (10-15 min)

#### Basic Functionality
- [ ] Tap app icon to open
- [ ] App opens without crashes
- [ ] Splash screen displays
- [ ] Welcome screen shows

#### Language & Form
- [ ] Can select language (English, Swahili, Luo)
- [ ] Can select sub-county
- [ ] Can select soil type
- [ ] Can select season

#### Prediction
- [ ] Can submit form
- [ ] App connects to backend
- [ ] Results display
- [ ] Shows crop recommendation
- [ ] Shows confidence score

#### Navigation
- [ ] Back button works
- [ ] Portrait mode works
- [ ] Landscape mode works (rotate phone)
- [ ] Can navigate between screens

#### Error Handling
- [ ] No crashes on errors
- [ ] Graceful error messages
- [ ] Can retry failed requests

---

## Troubleshooting Checklist

### If Gradle Sync Fails
- [ ] File → Settings → Gradle
- [ ] Set "Gradle JDK" to "Embedded JDK"
- [ ] Apply → OK
- [ ] Right-click project → "Sync Now"
- [ ] Wait for sync

### If Build Fails
- [ ] Build → Clean Project
- [ ] File → Invalidate Caches / Restart
- [ ] Build → Build APK again
- [ ] Check Build console for errors
- [ ] Google error message if stuck

### If Phone Not Connected
- [ ] Disconnect phone
- [ ] Enable USB Debugging on phone
- [ ] Reconnect phone
- [ ] Allow USB access if prompted
- [ ] Command: `adb devices` (should list phone)
- [ ] Try install again

### If Installation Fails
- [ ] Settings → Security → Allow "Unknown sources"
- [ ] Command: `adb install -r app-release.apk` (force reinstall)
- [ ] Or uninstall first: `adb uninstall com.fahamu.shamba`
- [ ] Then install fresh

### If App Crashes
- [ ] View logs: `adb logcat`
- [ ] Look for errors in log output
- [ ] Check API URL is correct in MainActivity.java
- [ ] Rebuild and reinstall

---

## Success Indicators

When complete, check:
- ✅ APK file exists: `app/release/app-release.apk`
- ✅ APK size: 20-40 MB (normal range)
- ✅ App installed on phone (icon visible)
- ✅ App opens without crashes
- ✅ All features work
- ✅ API calls successful
- ✅ Can make predictions
- ✅ Results display correctly

---

## Time Estimates

| Phase | Duration | Notes |
|-------|----------|-------|
| Prerequisites | 30-45 min | One-time only |
| Open Project | 10-15 min | Depends on PC speed |
| Configure API | 5 min | Change one line |
| Build APK | 10-15 min | First build slower |
| Install | 2-5 min | Via USB cable |
| Test | 10-15 min | Thorough testing |
| **TOTAL** | **1-1.5 hours** | **First time** |
| Subsequent builds | 15-20 min | Much faster |

---

## Commands Reference

```bash
# Check Android SDK
adb --version

# List connected devices
adb devices

# Install APK
adb install app-release.apk

# Reinstall (overwrite)
adb install -r app-release.apk

# Uninstall
adb uninstall com.fahamu.shamba

# View real-time logs
adb logcat

# Clear app cache
adb shell pm clear com.fahamu.shamba

# Launch app
adb shell am start -n com.fahamu.shamba/.MainActivity
```

---

## Distribution After Build

### Option 1: Email APK
```
1. Attach app-release.apk to email
2. Send to farmers
3. They download and install
```

### Option 2: Cloud Upload
```
1. Upload APK to Google Drive or Dropbox
2. Share public link
3. Farmers download via link
4. Install on phone
```

### Option 3: Web Server
```
1. Host APK on web server
2. Create download button
3. Users click and download
4. Install on phone
```

### Option 4: Play Store (Optional)
```
1. Create Google Play Developer account ($25)
2. Upload APK
3. Add screenshots and description
4. Publish
5. Users download from Play Store
```

---

## Final Verification

Before distributing to farmers:

- [ ] App tested on at least 2 different Android phones
- [ ] Works on Android 8+ devices
- [ ] API connection verified
- [ ] Predictions working correctly
- [ ] No crashes observed
- [ ] Performance acceptable
- [ ] All languages work
- [ ] Forms submit correctly

---

## Support

If you get stuck at any step:
1. See ANDROID_STUDIO_STEP_BY_STEP.md (detailed guide)
2. Check troubleshooting section above
3. Google the error message
4. Check Android Studio help: Help → Documentation

---

## Summary

1. Install Android Studio (if needed)
2. Open project
3. Update API URL
4. Build APK (10-15 min)
5. Install on phone
6. Test thoroughly
7. Share with farmers

**Total time: 1-1.5 hours (first time)**

**Ready to start?** Begin with step 1.
