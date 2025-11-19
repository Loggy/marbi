# Quick Fix: CORS Issue Resolution

## 🔴 ACTION REQUIRED

**Restart your UI dev server** for the proxy changes to take effect:

### Step 1: Stop the UI
Press `Ctrl+C` in the terminal running the UI dev server

### Step 2: Restart the UI
```bash
cd ui
pnpm dev
```

### Step 3: Test
Open http://localhost:3001 and try navigating to any management page (DEXes, RPCs, etc.)

## What Changed

We've switched from CORS to a Next.js proxy approach:

- ✅ `ui/next.config.ts` - Added proxy rewrite rule
- ✅ `ui/lib/api.ts` - Changed API URL from `http://localhost:3000` to `/api`

## How It Works Now

```
Before (CORS issues):
Browser → http://localhost:3000/dexes ❌ CORS Error

After (Proxy):
Browser → http://localhost:3001/api/dexes → Proxied to → http://localhost:3000/dexes ✅ Works!
```

All requests go through the same origin (localhost:3001), eliminating CORS entirely.

## Verification

After restarting the UI:

1. Open browser DevTools (F12) → Network tab
2. Navigate to DEXes or RPCs page
3. Look for requests to `/api/dexes` or `/api/evm-listener/status`
4. They should return status 200 (not CORS errors)

## Still Not Working?

1. **Hard refresh**: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. **Clear cache**: DevTools → Application → Clear storage
3. **Verify backend is running**: Open http://localhost:3000 in browser
4. **Check terminal logs**: Look for errors in both backend and UI terminals

## Documentation

See [PROXY_SETUP.md](PROXY_SETUP.md) for complete details.

---

**TL;DR: Just restart the UI dev server and it will work!** 🚀
