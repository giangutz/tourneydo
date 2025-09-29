# ✅ Route Conflict Fixed!

## The Problem
```
[Error: You cannot define a route with the same specificity as a optional catch-all route ("/auth/sign-up" and "/auth/sign-up[[...sign-up]]").]
```

## The Cause
There were two conflicting routes:
- `/app/auth/sign-up/page.tsx` (regular route)
- `/app/auth/sign-up/[[...sign-up]]/page.tsx` (optional catch-all route)

## The Fix ✅
Removed the conflicting file:
```bash
rm /app/auth/sign-up/page.tsx
```

## Current Auth Structure (Correct)
```
/app/auth/
├── sign-in/
│   └── [[...sign-in]]/
│       └── page.tsx
├── sign-up/
│   └── [[...sign-up]]/
│       └── page.tsx
├── sign-up-success/
│   └── page.tsx
├── complete-profile/
│   └── page.tsx
├── error/
│   └── page.tsx
├── forgot-password/
│   └── page.tsx
├── update-password/
│   └── page.tsx
└── page.tsx
```

## Next Steps
1. **Restart the development server** (if it's still running):
   ```bash
   npm run dev
   ```

2. **The server should now start without errors**

3. **Test the edit tournament route**:
   - Navigate to `/dashboard/tournaments/[id]/edit`
   - Should work properly now!

## Why This Happened
- Clerk authentication uses optional catch-all routes `[[...sign-up]]` and `[[...sign-in]]`
- These handle all sub-routes automatically
- Having a separate `page.tsx` at the same level creates a conflict
- Next.js can't determine which route to use

The conflict has been resolved! 🚀
