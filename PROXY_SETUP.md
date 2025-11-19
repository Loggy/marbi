# Next.js Proxy Setup - CORS Solution

## What Was Done

Instead of dealing with CORS, we've set up a Next.js proxy that routes all API requests through the UI server to the backend. This completely eliminates CORS issues.

## Changes Made

### 1. Updated `ui/next.config.ts`

Added a rewrite rule to proxy all `/api/*` requests to the backend:

```typescript
async rewrites() {
  return [
    {
      source: "/api/:path*",
      destination: "http://localhost:3000/:path*",
    },
  ];
}
```

### 2. Updated `ui/lib/api.ts`

Changed the API base URL to use the proxy:

```typescript
// Before:
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// After:
const API_BASE_URL = '/api';
```

## How It Works

```
Browser Request:
http://localhost:3001/api/dexes
              ↓
Next.js Proxy (same origin, no CORS)
              ↓
Backend:
http://localhost:3000/dexes
              ↓
Response back through proxy
              ↓
Browser receives response
```

All API calls now go through the same domain (localhost:3001), so there are **no CORS issues**.

## ⚠️ IMPORTANT: Restart Required

**You MUST restart the UI dev server** for the Next.js config changes to take effect:

### Stop the UI:
- Press `Ctrl+C` in the terminal running the UI

### Start the UI again:
```bash
cd ui
pnpm dev
```

The UI will restart with the new proxy configuration.

## Testing

1. **Restart the UI dev server** (important!)
2. Open http://localhost:3001
3. Navigate to any page (e.g., DEXes page)
4. Check browser DevTools → Network tab
5. You should see requests to `/api/dexes` (not `http://localhost:3000/dexes`)
6. Requests should succeed with status 200

## Advantages of Proxy Approach

✅ **No CORS issues** - All requests are same-origin
✅ **Simpler setup** - No need to configure CORS headers
✅ **Better for development** - Works reliably in all browsers
✅ **Production ready** - Can be used in production too
✅ **Secure** - Backend doesn't need to expose CORS headers

## For Production

The proxy approach works great in production too! Next.js will handle the rewrites at the edge.

### Option 1: Keep using proxy in production

Update `next.config.ts` to use environment variable:

```typescript
async rewrites() {
  return [
    {
      source: "/api/:path*",
      destination: `${process.env.BACKEND_URL || 'http://localhost:3000'}/:path*`,
    },
  ];
}
```

Then set environment variable:
```env
BACKEND_URL=https://api.yourdomain.com
```

### Option 2: Use direct API calls in production

```typescript
// ui/lib/api.ts
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? process.env.NEXT_PUBLIC_API_URL || 'https://api.yourdomain.com'
  : '/api';
```

This uses the proxy in development but direct calls in production.

## Troubleshooting

### Still seeing CORS errors?

1. **Verify UI is restarted**: Make sure you stopped and started the UI dev server
2. **Hard refresh browser**: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
3. **Check proxy is working**:
   - Open http://localhost:3001/api/dexes directly in browser
   - You should see JSON response from backend (or an error, but not CORS)
4. **Check backend is running**: Visit http://localhost:3000 to verify backend is up

### 404 errors on API calls?

- Verify backend is running on port 3000
- Check backend logs for incoming requests
- Try accessing backend directly: http://localhost:3000/dexes

### Proxy not working?

1. Verify `next.config.ts` has the rewrites section
2. Check for syntax errors in the config file
3. Restart the UI dev server
4. Check terminal for Next.js errors during startup

## Alternative: Development Proxy Only

If you want to use direct API calls in production but proxy in dev:

```typescript
// ui/next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    turbo: { root: "." },
  },
  async rewrites() {
    // Only use proxy in development
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: "/api/:path*",
          destination: "http://localhost:3000/:path*",
        },
      ];
    }
    return [];
  },
};
```

## Summary

✅ Next.js proxy configured
✅ CORS issues eliminated
✅ API base URL changed to `/api`
⚠️ **Restart UI dev server required**
✅ All API calls will now be proxied through Next.js

**Restart your UI and CORS issues will be gone!** 🎉
