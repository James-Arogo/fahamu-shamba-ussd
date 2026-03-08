# Build Android APK on Windows - Two Methods

## Problem
`eas build --platform android --local` requires macOS/Linux.
You're on Windows - need alternative method.

## Solution 1: EAS Cloud Build (Easiest) ✅ RECOMMENDED

### How It Works
1. Your code uploads to Expo servers
2. Expo builds APK in cloud
3. Download APK to your machine
4. No Android SDK installation needed

### Step 1: Build in Cloud
```bash
cd c:/Users/ADMIN/fahamu-shamba1-main/frontend/FahamuShamba
eas build --platform android
```

### What Happens
```
✓ Compiling your app...
✓ Uploading to EAS...
✓ Building in cloud (5-15 minutes)
✓ Download link: https://...
✓ APK ready!
```

### Expected Time
- First build: 10-15 minutes
- Subsequent builds: 5-10 minutes

### Pros
✅ No local setup needed
✅ Works on Windows
✅ No Android Studio required
✅ Reliable cloud infrastructure

### Cons
⚠️ Requires internet connection
⚠️ Slower than local build
⚠️ Depends on EAS availability

---

## Solution 2: Android Studio (Local Build)

### Install Android Studio
1. Download: https://developer.android.com/studio
2. Run installer
3. Follow setup wizard
4. Install Android SDK (API 31+)
5. Set ANDROID_HOME environment variable

### Setup Environment Variables
```powershell
# In PowerShell (as admin):
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\ADMIN\AppData\Local\Android\Sdk", "User")
```

### Build APK
```bash
cd c:/Users/ADMIN/fahamu-shamba1-main/frontend/FahamuShamba
npx react-native run-android
```

Or:
```bash
npx expo run:android
```

### Expected Time
- First build: 30-45 minutes (downloads SDK)
- Subsequent builds: 10-15 minutes

### Pros
✅ Faster once installed
✅ Full control
✅ Can debug locally
✅ Offline capability

### Cons
⚠️ Large installation (5GB+)
⚠️ Complex setup
⚠️ Slow first build

---

## Solution 3: Use WSL (Windows Subsystem for Linux)

### Install WSL2
```powershell
# PowerShell (as admin):
wsl --install
# Restart computer
wsl --install Ubuntu
```

### Build in WSL
```bash
wsl
cd /mnt/c/Users/ADMIN/fahamu-shamba1-main/frontend/FahamuShamba
eas build --platform android --local
```

### Pros
✅ Local build on Windows
✅ Faster than cloud
✅ Same speed as macOS

### Cons
⚠️ Complex setup
⚠️ Requires WSL knowledge
⚠️ Takes 30+ minutes to install

---

## Recommendation: Use EAS Cloud Build

**Why EAS Cloud is best for you:**
1. ✅ No installation needed
2. ✅ Works right now
3. ✅ Simple command
4. ✅ Reliable
5. ✅ You're already logged in

**Time commitment:**
- Setup: 0 minutes (already done)
- Build: 10-15 minutes
- Total: 10-15 minutes

---

## Run EAS Cloud Build NOW

```bash
cd c:/Users/ADMIN/fahamu-shamba1-main/frontend/FahamuShamba
eas build --platform android
```

### Expected Output
```
$ eas build --platform android

Building for Android with EAS

✓ Linked to account: janganyaderrick@gmail.com
✓ Project connected to EAS Build
✓ Submitting build request...
✓ Build submitted
✓ Build ID: 12345...

You can monitor the build at:
https://expo.dev/builds/12345...

Waiting for build to complete...
✓ Build completed successfully!

✓ Download URL: https://eas-builds-bucket.s3.amazonaws.com/...app-release.apk

APK ready!
```

### Download APK
```
1. Copy download link from output
2. Paste in browser
3. APK downloads
4. Share with users
```

---

## After Download

### Install on Android Phone
```bash
# Via USB cable
adb install Downloads/app-release.apk

# Or email/cloud storage link to users
```

### Test
- [ ] App opens
- [ ] Can login
- [ ] Can predict crops
- [ ] API connects
- [ ] All features work

---

## Comparison Table

| Method | Setup | Time | Works on Windows | Effort |
|--------|-------|------|------------------|--------|
| **EAS Cloud** | ✅ Done | 10-15 min | ✅ Yes | Easy |
| **Android Studio** | Install | 30-45 min | ✅ Yes | Hard |
| **WSL** | Install | 30 min | ✅ Yes | Very Hard |

---

## If EAS Cloud Build Fails

### Issue: "Build failed"
→ Check build log at https://expo.dev
→ Common issues: API timeout, dependency error

### Issue: "Upload failed"
→ Check internet connection
→ Retry: `eas build --platform android --retry`

### Issue: "Out of quota"
→ Free plan has limits
→ Upgrade at https://expo.dev

### Fallback: Use Android Studio
If EAS fails repeatedly, install Android Studio and build locally.

---

## Final Status

**✅ Ready to build APK on Windows**

Option 1: `eas build --platform android` (Recommended)
Option 2: Install Android Studio + `npx react-native run-android`
Option 3: Install WSL + `eas build --platform android --local`

**Best choice: Option 1 (EAS Cloud)**
- Run command
- Wait 10-15 minutes
- Get APK
- Done

---

**Next Step**: Run this command:
```bash
eas build --platform android
```

Expected: APK ready in 10-15 minutes
