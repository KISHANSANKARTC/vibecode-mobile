# Vibecode Workspace

This workspace contains a mobile app and backend server.

<projects>
  mobile/   — Expo React Native app (port 8081)
  backend/  — Hono API server (port 3000)
</projects>

<environment_variables>
  IMPORTANT: Use the correct env vars for each platform to avoid deployment failures.

  Backend (in backend/src/*.ts):
  - Use `env.BACKEND_URL` from "./env" (validated via Zod)
  - NEVER use `process.env.EXPO_PUBLIC_*` in backend code
  - These are available at runtime: BACKEND_URL, PORT, NODE_ENV

  Mobile (in mobile/src/*.ts):
  - Use `process.env.EXPO_PUBLIC_BACKEND_URL` for API calls
  - EXPO_PUBLIC_* vars are bundled at build time

  Testing backend endpoints:
  - Use $BACKEND_URL environment variable in cURL commands
  - Do NOT use localhost
</environment_variables>

<agents>
  Use subagents for project-specific work:
  - mobile-developer: Changes to the mobile app
  - backend-developer: Changes to the backend API

  Each agent reads its project's CLAUDE.md for detailed instructions.
  When waiting for subagent results with TaskOutput, use a timeout of 600000ms.
</agents>

<coordination>
  When a feature needs both frontend and backend:
  1. Design the API contract (endpoint, request/response shape) in backend/src/types.ts
  2. Implement backend route first, test using cURL with $BACKEND_URL (do not use localhost)
  3. Implement mobile client second
  4. Test the integration
</coordination>

<startup_triage>
  On every user message, you will receive a <startup_error_summary> block (plus raw expo/backend logs).
  If it contains startup-blocking errors (e.g. TS2307, "Cannot find module", ERR_MODULE_NOT_FOUND), fix those first.

  Legacy import compat (temporary; removable once all projects are migrated):
  - If a legacy project fails on an import like `@/shared/contracts`, do NOT use symlinks and do NOT patch tsconfig.
  - Prefer minimal, local, repo-contained fixes:
    - Mobile: create `mobile/src/shared/contracts.ts` and re-export types/constants already present in the mobile app.
    - Backend: if backend uses `@/* -> src/*`, create `backend/src/shared/contracts.ts` and re-export from the backend’s real contracts/types file; otherwise refactor the import to a correct relative path.
</startup_triage>

<skills>
  Shared skills in .claude/skills/:
  - database-auth: Set up Prisma + Better Auth for user accounts and data persistence
  - ai-apis-like-chatgpt: Use this skill when the user asks you to make an app that requires an AI API.
  - upload-assets: Use this skill when the user asks you to store and use assets like images, audio, videos, etc.

  Frontend only skills:
  - frontend-app-design: Create distinctive, production-grade React Native Expo interfaces following iOS Human Interface Guidelines and liquid glass design principles. Use when building mobile screens, components, or styling any React Native UI.
  - expo-docs: Use this skill when the user asks you to use an Expo SDK module or package that you might not know much about.
</skills>

<environment>
  System manages git and dev servers. DO NOT manage these.
  The user views the app through Vibecode App.
  The user cannot see code or terminal. Do everything for them.
  Communicate in an easy to understand manner for non-technical users.
  Be concise and don't talk too much.

  ERROR HANDLING BEST PRACTICES:
  - NEVER use String(err), error.toString(), or JSON.stringify(error) on error objects
    This converts event objects to unparseable JSON like {"isTrusted":true}
  - ALWAYS import and use extractErrorMessage() from @/lib/errorUtils.ts
  - Examples:
    ✅ const msg = extractErrorMessage(err);
    ✅ Alert.alert('Error', extractErrorMessage(err));
    ❌ const msg = String(err);  // Stringifies event objects!
    ❌ Alert.alert('Error', err.toString());  // Also wrong!
  - When displaying errors in catch blocks:
    import { extractErrorMessage } from '@/lib/errorUtils';
    try {
      // ... code ...
    } catch (err) {
      const message = extractErrorMessage(err);
      setError(message);
    }
  - Key error handling files (reference implementations):
    * mobile/src/lib/errorUtils.ts - Error extraction helpers (use this!)
    * mobile/src/lib/errorHandler.ts - Global unhandled rejection handler
    * mobile/src/app/(talent)/notifications/index.tsx - Good example
    * mobile/src/app/onboarding/talent-setup.tsx - getErrorMessage() example

  NAVIGATION MEMORY:
  - Notification icon navigation MUST track where it was opened from:
    * If opened from Dashboard → back button must return to Dashboard
    * If opened from Profile → back button must return to Profile
  - Use router state or navigation props to maintain this context
  - File: src/app/(talent)/notificationsettings.tsx (check implementation)

  OTP FLOW (Talent Signup):
  - The Supabase Edge Functions handle all OTP logic (send-otp, verify-otp)
  - Mobile app MUST use supabase.functions.invoke() - NOT backend API endpoints
  - Flow order is CRITICAL:
    1. Collect form data (no account creation yet)
    2. Call supabase.functions.invoke('send-otp') → Email sent by webhook
       - If EMAIL_EXISTS returned (orphaned profile), still show OTP screen (don't block)
    3. User enters 6-digit OTP code
    4. Call supabase.functions.invoke('verify-otp') → Validates OTP
    5. ONLY if verify-otp succeeds → Call supabase.auth.signUp()
    6. If signUp fails with "already exists" → Fallback to signInWithPassword() (RECOVERY)
    7. AFTER account ready (signup or recovery sign-in) → Upsert talent_profiles & user_roles
    8. Navigate to onboarding wizard (NO ERROR SHOWN for recovery case)
  - File: mobile/src/app/onboarding/auth.tsx (handleSendOtp, handleVerifyOtp, handleCompleteSignup)
  - NEVER call supabase.auth.signUp() before OTP verification completes
  - RECOVERY FLOW: If signUp fails with "already exists", attempt sign-in with same credentials
    - If sign-in succeeds, treat as account recovery and continue (no error)
    - If sign-in fails, show error and stop
  - NOTE: Orphaned profiles (talent_profiles without auth account) are handled transparently
</environment>
