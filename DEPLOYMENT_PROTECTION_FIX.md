# Vercel Deployment Protection - API Access Fix

## Current Issue
The `/api/analyze-farm` endpoint is returning **401 Authentication Required** due to Vercel's Deployment Protection feature which blocks public API access.

## Solutions

### Option 1: Disable Deployment Protection (Recommended for Public APIs)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project `fahamu-shamba`
3. Navigate to **Settings** → **Deployment Protection**
4. Toggle **Deployment Protection** to **OFF**
5. Confirm the change

**Result**: API endpoints will be publicly accessible without authentication.

### Option 2: Use Bypass Token (For Testing/Automation)
If you want to keep protection enabled but allow specific requests:

1. Go to **Settings** → **Deployment Protection**
2. Under "Bypass for Automation", copy the **Bypass Token**
3. Use in API requests:
```bash
curl -X POST \
  "https://fahamu-shamba-vert.vercel.app/api/analyze-farm?x-vercel-protection-bypass={BYPASS_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"subCounty":"Ugunja","soilType":"silt loam","season":"short_rains","farmSize":4,"budget":5000,"waterSource":"Rainfall"}'
```

### Option 3: Use Vercel CLI for Authenticated Testing
```bash
vercel curl https://fahamu-shamba-vert.vercel.app/api/analyze-farm \
  --method POST \
  --headers 'Content-Type: application/json' \
  --data '{"subCounty":"Ugunja","soilType":"silt loam","season":"short_rains","farmSize":4,"budget":5000,"waterSource":"Rainfall"}'
```

## API Endpoint Status
✅ **Local Testing**: Working (HTTP 200)
✅ **Code Quality**: No syntax errors
✅ **Recommendation Engine**: Fully functional
⚠️ **Vercel Deployment**: Blocked by protection auth wall

## Configuration Updates Made
- ✅ Enhanced `vercel.json` with explicit API routes
- ✅ Added proper HTTP method support (GET, POST, PUT, DELETE, PATCH, OPTIONS)
- ✅ Configured cache headers for API responses
- ✅ Set Content-Type headers for JSON responses

## Recommendation
**Disable Deployment Protection** if this is a public API that should be accessible to mobile clients, web apps, or external services. The recommendation engine generates legitimate agricultural recommendations that should be freely accessible.

---
**Last Updated**: April 17, 2026
