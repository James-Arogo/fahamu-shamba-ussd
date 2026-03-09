# Weather Dashboard Images Setup Guide

## Overview
Your farmer dashboard now has a **Google Weather-style design** with **dynamic backgrounds** that change based on the weather condition. You need to add 6 weather background images.

---

## 📁 Folder Structure

Create an `/images/` folder in your **public** directory:

```
fahamu-shamba1-main/
├── public/
│   ├── index.html
│   ├── dashboard.html
│   ├── weather-dashboard-renderer.js
│   └── images/              ← CREATE THIS FOLDER
│       ├── sunny.webp       ← Add image here
│       ├── cloudy.webp      ← Add image here
│       ├── rainy.webp       ← Add image here
│       ├── stormy.webp      ← Add image here
│       ├── foggy.webp       ← Add image here
│       └── snowy.webp       ← Add image here (optional)
```

---

## 📷 Image Specifications

### Recommended Properties:
- **Format**: WebP (lightweight) or PNG/JPG as fallback
- **Dimensions**: 1920×1080px (desktop), optimize for mobile (720px)
- **File Size**: 100-300 KB per image (compressed)
- **Resolution**: 72 DPI (web optimized)
- **Color Space**: sRGB

### Image Suggestions:

| Image | Condition | Suggested Scene |
|-------|-----------|-----------------|
| **sunny.webp** | Clear, sunny weather | Bright blue sky, sunny farmland, crops in sunlight |
| **cloudy.webp** | Overcast, clouds | Grey clouds, overcast field, soft lighting |
| **rainy.webp** | Rain, drizzle | Raindrops, wet field, rain overlay on crops |
| **stormy.webp** | Thunderstorm | Dark clouds, lightning sky, dramatic atmosphere |
| **foggy.webp** | Fog, mist | Misty morning, foggy field, reduced visibility |
| **snowy.webp** | Snow (optional) | Snow-covered field, winter scene |

---

## 🎨 Where to Find Free Images

### Recommended Free Stock Photo Sites:
1. **Unsplash** (unsplash.com)
   - Search: "sunny weather field", "rainy farm", "cloudy sky"
   - License: Free to use (no attribution required)

2. **Pexels** (pexels.com)
   - Search: "clear sky", "overcast weather", "rain"
   - License: Free for commercial use

3. **Pixabay** (pixabay.com)
   - Search: "farming weather", "agricultural conditions"
   - License: Free

4. **Unsplash Editor Tools** (unsplash.com)
   - Convert images to WebP format
   - Compress to optimal size

---

## 🔧 How to Optimize Images

### Using Online Tools:
1. **Squoosh** (squoosh.app)
   - Upload JPG/PNG
   - Convert to WebP
   - Adjust quality to 100-150 KB
   - Download

2. **TinyPNG** (tinypng.com)
   - Compress without quality loss
   - Fast processing

3. **ImageOptim** (imageoptim.com/online)
   - Batch compress images
   - Maintain quality

### Using Command Line (if you have ImageMagick):
```bash
# Convert to WebP
magick sunny.jpg -quality 80 sunny.webp

# Resize for mobile (720px width)
magick sunny.webp -resize 720x480 sunny-mobile.webp
```

---

## 📦 How to Add Images to Your Project

### Option 1: Manual Upload
1. Create `/public/images/` folder
2. Drag & drop images into the folder
3. Name them exactly as shown:
   - `sunny.webp`
   - `cloudy.webp`
   - `rainy.webp`
   - `stormy.webp`
   - `foggy.webp`
   - `snowy.webp` (optional)

### Option 2: Using Git
```bash
# From your project root
mkdir -p public/images

# Copy images to the folder
cp ~/Downloads/sunny.webp public/images/
cp ~/Downloads/cloudy.webp public/images/
cp ~/Downloads/rainy.webp public/images/
# ... and so on

# Commit and push
git add public/images/
git commit -m "Add weather background images"
git push
```

---

## 🎨 Image Quality Tips

### For Best Results:
- **Avoid**: Overly bright or dark images (use overlay for readability)
- **Use**: Natural farm scenes, weather-appropriate landscapes
- **Include**: Subtle texture (not too busy)
- **Color Tone**: Warm for sunny, cool for rainy, grey for cloudy

### Example Lookups:
- `sunny: "bright green field + blue sky"`
- `rainy: "wet crops + rain droplets"`
- `cloudy: "grey clouds + farm landscape"`
- `stormy: "dark sky + lightning backdrop"`
- `foggy: "misty morning + low visibility"`

---

## ✅ Verification Checklist

After adding images:
- [ ] `/public/images/` folder created
- [ ] All 6 images added (or 5 + optional snowy.webp)
- [ ] Filenames are exactly lowercase (sunny.webp, NOT Sunny.webp)
- [ ] Images are WebP or PNG/JPG format
- [ ] File sizes are optimized (< 300 KB each)
- [ ] Committed and pushed to GitHub

---

## 🌦 How the Dashboard Works

Once images are added:

1. **Farmer logs in** → Dashboard loads
2. **Weather data fetched** → Condition determined (sunny, rainy, etc.)
3. **Background changes dynamically** → Matching image displays
4. **Overlay applied** → Dark overlay for text readability (30% opacity)
5. **Hero card + cards** → White cards overlay the background image

The background will smoothly transition when farmers switch between sub-counties or weather changes.

---

## 📱 Responsive Behavior

- **Desktop (1920px+)**: Full resolution images
- **Tablet (768-1024px)**: Optimized medium resolution
- **Mobile (< 768px)**: Smaller, lighter WebP format

All backgrounds are automatically responsive thanks to CSS `background-size: cover`.

---

## 🚀 Deployment Notes

### For Vercel/Production:
- WebP images are supported in modern browsers
- Add fallback PNG images if WebP isn't available
- Use Vercel's image optimization service for automatic resizing

### File Size Targets:
- **WebP**: 80-150 KB per image
- **PNG**: 200-400 KB per image
- **JPG**: 150-300 KB per image

---

## 🎯 Next Steps

1. **Download images** from Unsplash, Pexels, or Pixabay
2. **Optimize** using Squoosh or TinyPNG
3. **Create** `/public/images/` folder
4. **Add images** with exact filenames
5. **Test locally** → `npm run dev` or your dev server
6. **Commit** → `git add && git commit && git push`
7. **Verify in browser** → Weather background should change dynamically

---

## 💡 Tips for Farmers

When the background changes:
- **Sunny** (yellow/bright): Good for manual work but watch for heat stress
- **Cloudy** (grey): Reduced UV, good for planting
- **Rainy** (wet): Watering needs met, avoid chemical sprays
- **Stormy** (dark): Take shelter, avoid outdoor work
- **Foggy** (misty): Spray effectiveness reduced, wait for clarity

The **hero weather card** now gives farmers instant visual feedback with:
- Large temperature display
- Current condition (sunny, cloudy, rainy, etc.)
- High/low for the day
- Farming advisory (crop-specific recommendations)

---

**Questions?** Check `weather-dashboard-renderer.js` for the color-to-background mapping logic.
