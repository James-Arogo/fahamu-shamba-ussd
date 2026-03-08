# Android APK Build - Next Steps

## Current Status ✅

Dependencies installed successfully.
API endpoint configured.
Ready to build APK.

## Step 1: Verify Your Backend URL

Before building, decide where your API is hosted:

### Option A: Local Network Testing
If your backend runs on your computer (localhost:5000):
```typescript
const API_URL = 'http://192.168.x.x:5000/api/predict';
// Replace 192.168.x.x with your computer's IP address
// Find it: ipconfig (Windows) or ifconfig (Mac/Linux)
```

### Option B: Vercel (Recommended for Production)
If your backend is deployed on Vercel:
```typescript
const API_URL = 'https://your-vercel-domain.com/api/predict';
```

### Option C: Cloud Server
If your backend is on a cloud server:
```typescript
const API_URL = 'https://your-server-domain.com/api/predict';
```

**Current Setting**: http://localhost:5000/api/predict (local testing)

Edit `frontend/FahamuShamba/App.tsx` line 135 if you want to change it.

## Step 2: Build APK

Run this command in PowerShell:

```bash
cd c:/Users/ADMIN/fahamu-shamba1-main/frontend/FahamuShamba
eas build --platform android --local
```

### What Happens:
1. Compiles React Native code
2. Builds Android APK
3. Saves to: `dist/app-release.apk`
4. Takes: 15-25 minutes

### What You'll See:
```
✓ Building for Android...
✓ Compiling TypeScript...
✓ Bundling resources...
✓ Creating APK...
✓ Build complete!

APK saved: app-release.apk (size: ~30-40MB)
```

## Step 3: After Build Completes

### Option A: Install on Android Phone (USB Cable)
```bash
# Enable USB debugging on phone first
adb install dist/app-release.apk
```

### Option B: Share APK File
```
1. Copy: dist/app-release.apk
2. Email to users
3. Users download and tap to install
```

### Option C: Host on Cloud (Google Drive, Dropbox)
```
1. Upload dist/app-release.apk
2. Share public link
3. Users download and install
```

## Step 4: Test on Android Phone

After installation:
- [ ] App opens without crashes
- [ ] Can login/register
- [ ] Can select language
- [ ] Can make crop prediction
- [ ] Results display correctly
- [ ] Try in portrait mode
- [ ] Try in landscape mode

## Troubleshooting During Build

### Issue: "EAS account required"
```bash
# If prompted, create free EAS account:
# Visit: https://expo.dev
# Sign up (free)
# Then retry: eas build --platform android --local
```

### Issue: "Java not found"
```bash
# Install Java Development Kit (JDK)
# Download from: java.com
# Or use: choco install openjdk
```

### Issue: "Android SDK not found"
```bash
# Install Android Studio
# Download from: developer.android.com
# Or use: choco install android-studio
```

### Issue: Build takes too long
```bash
# Normal: 15-25 minutes first time
# Faster on subsequent builds: 5-10 minutes
# Just wait, it's working
```

### Issue: Out of disk space
```bash
# Free up 3GB of disk space
# Delete: node_modules (can reinstall)
# Delete: .gradle cache
# Retry build
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `eas build --platform android --local` | Build APK locally |
| `eas build --platform android --status` | Check build status |
| `adb install app-release.apk` | Install on connected phone |
| `adb logcat` | View phone logs for debugging |
| `expo start --android` | Run emulator (optional) |

## File Locations

```
Project: c:/Users/ADMIN/fahamu-shamba1-main/frontend/FahamuShamba/

Key files:
├── App.tsx ..................... Main app (line 135 = API URL)
├── app.json .................... Expo config
├── package.json ................ Dependencies
└── dist/
    └── app-release.apk ........ Final APK (after build)
```

## Expected Output

```
$ eas build --platform android --local

Building for Android locally
✓ Installed EAS CLI version 10.0.0
✓ Found native module @react-native-camera/camera
✓ Building Android app (this may take 10-20 minutes)

...progress...

✓ Build succeeded!
✓ APK saved to: app-release.apk
✓ Total size: 35.4 MB
✓ Ready to distribute
```

## Next: Distribution

After successful APK build and testing:

### Share with Farmers:
```
1. Email APK link
2. Instructions: Download → Open → Install
3. First time: Allow "Unknown sources"
4. App icon appears on home screen
```

### Optional: Play Store Listing
```
1. Create Google Play Developer account ($25 one-time)
2. Upload APK
3. Add screenshots and description
4. Publish (24-48 hour review)
5. Users download from Play Store
```

## Timeline Summary

```
Now: Dependencies ✅ installed
     API configured ✅

Next 30 min: Build APK
             (eas build --platform android --local)

After build: Test on phone (30 min)

Same day: Share APK with farmers

Next week: Gather feedback
          Monitor crashes
          Plan Play Store launch
```

## Success = APK Ready

When build completes:
- ✅ app-release.apk in dist/ folder
- ✅ Ready to install on Android phones
- ✅ All farmers can use app
- ✅ Same data as web version
- ✅ Professional mobile app

---

**Status**: Ready to build
**Next command**: `eas build --platform android --local`
**Expected time**: 20 minutes
**Result**: Working Android app
