# Android Studio APK Build - Visual Step-by-Step Guide

## Your Current Setup ✅

**Good news**: Your MainActivity.java already has correct URL!

```java
Line 24: private String websiteUrl = "https://fahamu-shamba.vercel.app";
```

This points to your **Vercel deployment** (already live). No changes needed!

---

## Visual Step-by-Step Guide

### STEP 1: Install Android Studio (if not already installed)

#### 1.1 Download
```
Website: https://developer.android.com/studio
Click: "Download Android Studio"
```

**What you'll see**:
```
┌─────────────────────────────────────────┐
│  Android Studio Download Page           │
│                                         │
│  [Download Android Studio]  ← Click   │
│                                         │
│  System Requirements: Windows 10/11    │
│  Disk Space: 10GB free                 │
└─────────────────────────────────────────┘
```

#### 1.2 Install
```
1. Run android-studio-2024.1.1-windows.exe
2. Click "Next"
3. Accept default installation path: C:\Program Files\Android\Android Studio
4. Click "Next" → "Install"
5. Wait 5-10 minutes
6. Click "Finish"
```

#### 1.3 First Launch
```
1. Android Studio opens
2. It downloads SDK and tools (5-10 minutes)
3. Show welcome screen
4. Click "Open" button (left side)
```

---

### STEP 2: Open Your Project

#### 2.1 Click "Open" in Android Studio

```
┌──────────────────────────────────────────┐
│ Android Studio Welcome                   │
│                                          │
│ [Open]  [Create New Project]  [Projects] │
│   ↑                                      │
│   Click this button                     │
└──────────────────────────────────────────┘
```

#### 2.2 Navigate to Your Project Folder

```
Folder Path: c:\Users\ADMIN\fahamu-shamba1-main\android-studio\FahamuShamba

Steps:
1. Paste path in "File name" field
2. Or browse:
   C: → Users → ADMIN → fahamu-shamba1-main 
   → android-studio → FahamuShamba
3. Click "Open"
```

**What you'll see**:
```
┌──────────────────────────────────────────┐
│ Select Project                           │
│                                          │
│ File name: c:\Users\ADMIN\fahamu-shamba  │
│             1-main\android-studio\       │
│             FahamuShamba                 │
│                                          │
│                          [Open] [Cancel] │
└──────────────────────────────────────────┘
```

#### 2.3 Wait for Project to Load

Android Studio will:
```
Stage 1: Indexing files
        ████████████████░░░░░  (2-3 min)

Stage 2: Gradle sync
        ████████████████░░░░░  (5-10 min)

Stage 3: Ready
        ████████████████████  ✓ Complete
```

**Expected display**:
```
Left Panel (Project Structure):
├─ FahamuShamba/
│  ├─ app/
│  │  ├─ manifests/
│  │  ├─ java/
│  │  │  └─ com.fahamu.shamba/
│  │  │     ├─ MainActivity.java
│  │  │     └─ ...
│  │  ├─ res/
│  │  └─ build.gradle
│  ├─ gradle/
│  └─ settings.gradle

Bottom: "Sync successful"
```

---

### STEP 3: View and Verify MainActivity.java (Optional)

This step is to **verify** the API URL. No changes needed - it's already correct!

#### 3.1 Navigate to MainActivity
```
Left panel:
1. Click arrow next to "app" to expand
2. Expand "java" folder
3. Expand "com.fahamu.shamba"
4. Double-click "MainActivity.java"
```

**Visual**:
```
Left Panel (Project):
├─ FahamuShamba/ 
│  ├─ app/
│  │  └─ java/
│  │     └─ com.fahamu.shamba/
│  │        └─ MainActivity.java  ← Double-click here
```

#### 3.2 Verify API URL

File opens in center panel. Look for **Line 24**:

```java
private String websiteUrl = "https://fahamu-shamba.vercel.app";
                              ↑
                         This is your API URL
                         Already correct! ✓
```

**What you'll see**:
```
┌──────────────────────────────────────┐
│ MainActivity.java  X                 │
├──────────────────────────────────────┤
│ 1: package com.fahamu.shamba;        │
│ 2:                                   │
│ ...                                  │
│ 24: private String websiteUrl =      │
│     "https://fahamu-shamba.vercel"   │
│     ".app";                          │ ← URL is correct!
│ ...                                  │
└──────────────────────────────────────┘
```

**No changes needed!** URL already points to your Vercel deployment.

---

### STEP 4: Build APK

#### 4.1 Open Build Menu

```
Top menu: Build
          ↓
Click "Build"
```

**Visual**:
```
┌─────────────────────────────────────┐
│ File Edit Build Run Tools Help      │
│         ↑                           │
│         Click "Build"               │
│         ↓                           │
│    ┌────────────────────────────┐   │
│    │ Build Bundle(s)/APK(s)  → | │ │
│    │ Clean Project            | │ │
│    │ Rebuild Project          | │ │
│    └────────────────────────────┘   │
└─────────────────────────────────────┘
```

#### 4.2 Click "Build APK(s)"

```
From submenu, click: Build Bundle(s) / APK(s)
                     ↓
                  Then: Build APK(s)
```

**Visual**:
```
Build Menu Opens:
├─ Build Bundle(s) / APK(s) →
│  ├─ Build APK(s)           ← Click this!
│  └─ Build Bundle(s)
├─ Clean Project
└─ Rebuild Project
```

#### 4.3 Wait for Build to Complete

Android Studio will compile your app:

```
Progress shown at BOTTOM of window:

Gradle Build Running
████████████░░░░░░░░░░░░░  45%

Build Output Console (lower panel):
> Task :app:compileReleaseJavaWithJavac
> Task :app:shrinkReleaseResources
> Task :app:packageRelease
> Task :app:assembleRelease

✓ BUILD SUCCESSFUL in 45s
```

**Expected time**: 10-15 minutes (first build), 5-10 minutes (subsequent)

#### 4.4 Verify Build Success

When build completes, look for **green checkmark**:

```
┌──────────────────────────────────────────┐
│ ✓ BUILD SUCCESSFUL                       │
│                                          │
│ Built the following APK(s):             │
│ - app-release.apk                       │
│   (35.4 MB)                             │
│                                          │
│ [Show in Explorer]  [Analyze APK]       │
└──────────────────────────────────────────┘
```

**Click "Show in Explorer"** to see APK file location

---

### STEP 5: Find Your APK File

#### 5.1 APK Location
The APK is saved at:
```
c:\Users\ADMIN\fahamu-shamba1-main\android-studio\
FahamuShamba\app\release\app-release.apk
```

#### 5.2 Verify File Exists
```
Windows Explorer:
C: → Users → ADMIN → fahamu-shamba1-main 
  → android-studio → FahamuShamba 
  → app → release 
  → app-release.apk  (35-40 MB)
                     ✓ File should be here
```

**Visual**:
```
┌──────────────────────────────────────┐
│ 📁 release (Folder)                  │
├──────────────────────────────────────┤
│ 📄 app-release.apk    35.4 MB  ✓    │
│ 📄 app-release.apk.aab                │
│ 📁 outputs                           │
└──────────────────────────────────────┘
```

---

### STEP 6: Install APK on Android Phone

#### 6.1 Connect Phone via USB

```
1. Take Android phone
2. Connect via USB cable to your PC
3. On phone: Allow USB access if prompted
4. On phone: Settings → Developer Options 
            → USB Debugging → ON
```

**Visual - Phone Screen**:
```
┌─────────────────────────┐
│ Settings                │
├─────────────────────────┤
│ > Display               │
│ > Sound                 │
│ > Developer Options  ← Go here
│ > About Phone           │
│ > ...                   │
└─────────────────────────┘

Developer Options Screen:
├─ USB Debugging        [ON] ✓
├─ USB Configuration    [File Transfer]
└─ ...
```

#### 6.2 Verify Phone Connected

Open PowerShell and type:
```bash
adb devices
```

Expected output:
```
List of attached devices:
emulator-5554          device
12AB34CD56EF           device  ← Your phone (list shows serial)

(If this shows, phone is connected!)
```

#### 6.3 Install APK

In PowerShell:
```bash
cd c:\Users\ADMIN\fahamu-shamba1-main\android-studio\FahamuShamba\app\release\
adb install app-release.apk
```

**Visual - PowerShell Output**:
```
C:\> adb install app-release.apk

✓ Starting install (might take a minute or more)...
✓ Success

(Takes 1-2 minutes)
```

**On Phone**: Watch as app installs (progress bar)

#### 6.4 App Icon Appears

After installation:
```
Phone Home Screen:
┌─────────────────────────┐
│ 🟢 Fahamu Shamba        │
│ 📱 Settings             │
│ 📸 Camera               │
│ ...                     │
└─────────────────────────┘
          ↑
    Tap to open app
```

---

### STEP 7: Test on Phone

#### 7.1 Open App
Tap the "Fahamu Shamba" icon

```
Phone Screen:
┌─────────────────────────────────────┐
│ Fahamu Shamba                       │
├─────────────────────────────────────┤
│                                     │
│  🌱 Loading...                      │
│                                     │
│  (Splash screen loads)              │
│                                     │
└─────────────────────────────────────┘
```

#### 7.2 Check Features

Test each feature:

```
✓ Login/Register
┌─────────────────────┐
│ Email: [_________] │
│ Password: [_____]  │
│ [Login]            │
└─────────────────────┘

✓ Language Selection
┌─────────────────────┐
│ Choose Language:    │
│ 🇬🇧 English       │
│ 🇰🇪 Kiswahili    │
│ 👨‍🌾 Dholuo       │
└─────────────────────┘

✓ Crop Prediction
┌─────────────────────┐
│ Sub-County: [...]   │
│ Soil Type: [...]    │
│ Season: [...]       │
│ [Get Prediction]    │
└─────────────────────┘

✓ Results
┌─────────────────────┐
│ 🌾 MAIZE            │
│ Confidence: 89%     │
│ Reason: ...         │
│ [Helpful?]          │
└─────────────────────┘
```

#### 7.3 Verify API Connection

Look for:
- ✓ Data loads from backend
- ✓ Predictions display
- ✓ No "Connection error" messages
- ✓ Responsive to taps
- ✓ Smooth scrolling

---

### STEP 8: Share APK with Farmers

#### Option A: Email APK

```bash
# In Windows, copy APK to Desktop
copy "c:\Users\ADMIN\fahamu-shamba1-main\android-studio\
FahamuShamba\app\release\app-release.apk" 
"C:\Users\ADMIN\Desktop\app-release.apk"
```

Then:
1. Attach to email
2. Send to farmers
3. They download and install

#### Option B: Upload to Cloud

```
1. Go to Google Drive (drive.google.com)
2. Upload app-release.apk
3. Right-click → Share
4. Copy share link
5. Send link to farmers
```

**Farmers do**:
1. Click link
2. Download app-release.apk
3. Open Downloads folder
4. Tap file to install

#### Option C: Host on Website

```
1. Upload APK to your web server
2. Create download link
3. Share via QR code or URL
```

---

## Summary Visual

```
┌─────────────────────────────────────────────────────────┐
│           ANDROID APK BUILD - COMPLETE FLOW             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Install Android Studio      30-45 min (1st time)   │
│     └─ Download & install                              │
│                                                         │
│  2. Open Project                10-15 min              │
│     └─ File → Open → Select folder                    │
│                                                         │
│  3. Verify API URL              < 1 min               │
│     └─ Already correct (Vercel) ✓                    │
│                                                         │
│  4. Build APK                   10-15 min              │
│     └─ Build → Build APK(s)                           │
│                                                         │
│  5. Connect Phone               2-5 min               │
│     └─ USB cable + USB Debugging ON                   │
│                                                         │
│  6. Install APK                 2-5 min               │
│     └─ adb install app-release.apk                    │
│                                                         │
│  7. Test Features               10-15 min              │
│     └─ Verify login, predictions, results             │
│                                                         │
│  8. Share with Farmers          5-10 min              │
│     └─ Email, Cloud, or Download link                 │
│                                                         │
│  TOTAL TIME:        1-1.5 hours (first time)          │
│  SUBSEQUENT BUILD:  15-20 minutes                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Key Points

✅ **Your API URL is already correct**
- Points to: https://fahamu-shamba.vercel.app
- No changes needed!

✅ **Follow the steps in order**
- Don't skip steps
- Wait for each stage to complete

✅ **When stuck**
- Check ANDROID_STUDIO_STEP_BY_STEP.md for details
- Google the error message
- Check Build console output

✅ **After build completes**
- APK file is ready
- Test thoroughly
- Share with farmers

---

**Ready to start? Begin with STEP 1: Install Android Studio**

(If already installed, skip to STEP 2)
