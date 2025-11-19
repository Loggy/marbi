# CORS Configuration Fixed

## What Was Done

Added CORS configuration to the backend (`src/main.ts`) to allow requests from the UI.

## Changes Made

```typescript
// Enable CORS for UI
app.enableCors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
});
```

## Required Action

**You MUST restart the backend server** for the changes to take effect:

### Stop the backend:
- Press `Ctrl+C` in the terminal running the backend

### Start the backend again:
```bash
pnpm run start:dev
```

The backend will restart and apply the CORS configuration.

## Verify CORS is Working

1. **Restart the backend** (important!)
2. Open the UI at http://localhost:3001
3. Open browser DevTools (F12) → Network tab
4. Navigate to any page (e.g., DEXes or RPCs)
5. Check that API requests succeed (status 200, not CORS errors)

## For Production

When deploying to production, update the CORS origins in `src/main.ts`:

```typescript
app.enableCors({
  origin: [
    'https://your-ui-domain.com',
    'https://app.yourdomain.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
});
```

Or use environment variable:

```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
});
```

Then in `.env`:
```env
CORS_ORIGIN=https://your-ui-domain.com,https://app.yourdomain.com
```

## Troubleshooting

### Still seeing CORS errors after restart?

1. **Verify backend is actually restarted**:
   ```bash
   curl http://localhost:3000
   ```

2. **Check browser cache**: Hard refresh the UI (Ctrl+Shift+R or Cmd+Shift+R)

3. **Check the backend console** for CORS-related logs

4. **Verify the UI URL**: Make sure you're accessing http://localhost:3001 (not 3000)

5. **Check browser console** for the exact CORS error message

### Alternative: Use a proxy (if CORS still doesn't work)

Edit `ui/next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  experimental: {
    turbo: {
      root: ".",
    },
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/:path*',
      },
    ];
  },
};
```

Then update `ui/lib/api.ts`:
```typescript
const API_BASE_URL = '/api'; // Use proxy instead of direct URL
```

This will proxy all `/api/*` requests through Next.js, avoiding CORS entirely.

## Summary

✅ CORS configuration added to backend
⚠️ **Backend restart required**
✅ UI will now be able to communicate with backend
✅ Both localhost:3000 and localhost:3001 are allowed origins
