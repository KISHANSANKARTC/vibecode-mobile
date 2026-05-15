# Notifications Table - Complete Analysis Report

## Executive Summary

The mobile app is trying to access a `notifications` table in Supabase's public schema to display notifications to talents (when admins approve/reject their verification). The error `[notifications-store] Error fetching unread count: [object Object]` suggests this table either doesn't exist or isn't properly configured with Row-Level Security (RLS) policies.

**Supabase Project**: https://tghuqwogmnslvlbhchpu.supabase.co

## What the App Expects

### Table Name
- **Schema**: `public`
- **Table**: `notifications`
- **Purpose**: Store notifications for talents about verification status, bookings, payments, and messages

### Required Columns (9 columns)

```
Column          Type                    Constraints              Purpose
─────────────────────────────────────────────────────────────────────────────
id              UUID                    PK, uuid_generate_v4()   Unique ID
user_id         UUID                    FK→auth.users, indexed   Who receives it
type            TEXT                    NOT NULL                 Notification category
title           TEXT                    NOT NULL                 Notification title
body            TEXT                    NOT NULL                 Notification content
is_read         BOOLEAN                 DEFAULT false, indexed   Read status
deep_link       TEXT                    Nullable                 Navigation target
created_at      TIMESTAMP+TZ            DEFAULT now()            When created
updated_at      TIMESTAMP+TZ            DEFAULT now()            When modified
```

### Required Row-Level Security (RLS) Policies

**RLS must be ENABLED on the table**

| Policy Name | Type | Condition | Permission |
|------------|------|-----------|-----------|
| Users can read their own notifications | SELECT | `auth.uid() = user_id` | ✓ REQUIRED |
| Users can update their own notifications | UPDATE | `auth.uid() = user_id` | ✓ REQUIRED |
| Users can delete their own notifications | DELETE | `auth.uid() = user_id` | Optional |
| Service role can insert notifications | INSERT | `true` | ✓ REQUIRED |

## Why Each Column Matters

### `user_id` - THE MOST IMPORTANT
- **Links to**: `auth.users(id)` (Supabase authentication table)
- **Used by RLS**: Every query filters on this column
- **In SQL**: `WHERE auth.uid() = user_id`
- **Must be indexed**: Yes (for performance)
- **Why it's critical**: Without proper RLS on this column, users could see other users' notifications

### `type` - Notification Category
- **Values**: `verification_approved`, `verification_rejected`, `booking_accepted`, `payment`, `message`
- **App uses it to**: Show different icons and colors
- **Example colors**:
  - `verification_approved` → Green checkmark
  - `verification_rejected` → Red alert
  - `booking_accepted` → Blue checkmark
  - `payment` → Amber cash icon

### `is_read` - Visibility State
- **Default**: `false` (new notifications are unread)
- **Updated when**: User taps notification or "Mark all as read"
- **Must be indexed**: Yes (app queries `WHERE is_read = false` frequently)
- **Shown in UI**: Unread count badge and visual indicator

### `deep_link` - Navigation Target
- **Format**: Expo Router path like `/(talent)/profile`
- **Used when**: User taps a notification to navigate somewhere
- **Can be**: `null` if notification doesn't navigate anywhere

### `created_at` & `updated_at` - Timeline
- **created_at is used to**: Sort notifications (newest first)
- **Must be indexed**: Yes (for sorting performance)
- **Displayed as**: "2h ago", "just now", etc.

## How the App Uses This Table

### 1. Bell Icon Badge (On App Startup)
**File**: `mobile/src/lib/state/notifications-store.ts`

```typescript
// Fetches unread notification count
const { count } = await supabase
  .from('notifications')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)
  .eq('is_read', false);  // Only unread

// Updates badge: "5" or "9+"
```

**RLS Check**:
- ✓ SELECT policy must allow this query
- ✓ User can only see their own notifications

### 2. Notifications Feed (When User Opens Screen)
**File**: `mobile/src/app/(talent)/notifications/index.tsx`

```typescript
// Fetch all notifications, most recent first
const { data } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })  // Newest first
  .limit(50);
```

**RLS Check**:
- ✓ SELECT policy must allow viewing own notifications

### 3. Mark as Read (When User Taps Notification)
**File**: `mobile/src/app/(talent)/notifications/index.tsx`

```typescript
// Mark single notification as read
await supabase
  .from('notifications')
  .update({ is_read: true })
  .eq('id', notificationId);

// Mark all as read
await supabase
  .from('notifications')
  .update({ is_read: true })
  .eq('user_id', user.id)
  .eq('is_read', false);
```

**RLS Check**:
- ✓ UPDATE policy must allow updating own notifications

### 4. Real-time Subscription (Instant Notifications)
**File**: `mobile/src/app/(talent)/notifications/index.tsx`

```typescript
// Listen for new notifications in real-time
const channel = supabase
  .channel(`notifications:${user.id}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${user.id}`,  // Only their notifications
    },
    (payload) => {
      // New notification arrived instantly!
      setNotifications(prev => [payload.new, ...prev]);
    }
  )
  .subscribe();
```

**RLS Check**:
- ✓ RLS must filter correctly on INSERT
- ✓ User only gets notifications for their own `user_id`

## The Problem (Current Error)

### Error Message
```
[notifications-store] Error fetching unread count: [object Object]
```

### Root Causes (Most Likely)

| Cause | Why It Happens | How to Check |
|-------|----------------|-------------|
| **Table doesn't exist** | Never created in Supabase | Run: `SELECT * FROM public.notifications LIMIT 1;` |
| **RLS not enabled** | Security feature is off | Check Authentication > Policies in Supabase |
| **SELECT policy missing** | App can't read notifications | Verify policy: `FOR SELECT USING (auth.uid() = user_id)` |
| **Wrong column name** | App expects `user_id` but it's named something else | Check: `SELECT column_name FROM information_schema.columns WHERE table_name='notifications'` |
| **Foreign key broken** | `user_id` not linked to `auth.users` | Check table constraints |
| **Missing indexes** | Queries are slow or failing | Add indexes on `user_id`, `created_at`, `is_read` |

## Verification Checklist

Use this in the Supabase SQL Editor to diagnose:

```sql
-- 1. Does table exist?
SELECT 'TABLE EXISTS' as status
FROM information_schema.tables
WHERE table_schema='public' AND table_name='notifications';

-- If no result: Table doesn't exist - CREATE IT (see below)

-- 2. Check columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name='notifications'
ORDER BY ordinal_position;

-- Expected: id, user_id, type, title, body, is_read, deep_link, created_at, updated_at

-- 3. Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname='public' AND tablename='notifications';

-- Expected: rowsecurity = true (or 't')

-- 4. Check policies
SELECT policyname, permissive, cmd, qual, with_check
FROM pg_policies
WHERE tablename='notifications'
ORDER BY policyname;

-- Expected: 4 policies (SELECT, UPDATE, DELETE, INSERT)

-- 5. Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename='notifications';

-- Expected: Indexes on user_id, created_at, is_read

-- 6. Try a simple query
SELECT COUNT(*) as total_notifications FROM public.notifications;
```

## Complete SQL to Create/Fix Everything

**Run this in Supabase SQL Editor if table doesn't exist:**

```sql
-- DROP TABLE IF EXISTS public.notifications; -- Only if you need to reset

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('verification_approved', 'verification_rejected', 'booking_accepted', 'payment', 'message')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  deep_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES (Critical for app performance)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "Users can read their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);  -- Service role bypasses RLS anyway
```

## Expected Data Example

Once set up, a notification in the table would look like:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "type": "verification_approved",
  "title": "Verification Approved",
  "body": "Your ID verification has been approved!",
  "is_read": false,
  "deep_link": "/(talent)/profile",
  "created_at": "2026-03-16T10:30:00Z",
  "updated_at": "2026-03-16T10:30:00Z"
}
```

## Integration Points

### Where Notifications Are Created
Currently: Not implemented in backend
Should be: When admin approves/rejects verification

### Where Notifications Are Read
- **notifications-store.ts**: Gets unread count for badge
- **notifications/index.tsx**: Displays full list with real-time updates
- **notifications/feed.tsx**: Alternative display format

### Where Notifications Are Updated
- **notifications/index.tsx**: Marks as read when tapped

## Security Considerations

### Why RLS is Critical
Without RLS, the app would read:
```sql
-- WRONG - User could see ALL notifications
SELECT * FROM notifications;
```

With RLS, the app safely reads:
```sql
-- RIGHT - User only sees their own (enforced at database level)
SELECT * FROM notifications WHERE auth.uid() = user_id;
```

### What Each Policy Does
1. **SELECT**: Prevents users from seeing others' notifications
2. **UPDATE**: Prevents users from marking others' notifications as read
3. **DELETE**: Prevents users from deleting others' notifications
4. **INSERT**: Only backend (service role) can create notifications

## Performance Optimization

### Indexes Are Important
The app frequently queries:
- `WHERE user_id = X` (needs index on user_id)
- `WHERE is_read = false` (needs index on is_read)
- `ORDER BY created_at DESC` (needs index on created_at)

Without indexes, queries slow down as notification count grows.

## Next Steps

1. **Verify table exists**: Use SQL queries from checklist above
2. **If missing**: Run the complete SQL creation script
3. **If present**: Check each RLS policy individually
4. **Test**: Insert a test notification and verify RLS works
5. **Monitor**: Check server logs for permission errors

---

**Document**: Complete Notifications Table Analysis
**Project**: Engage - Creative Talent Marketplace
**Supabase Project**: tghuqwogmnslvlbhchpu.supabase.co
**Last Updated**: March 16, 2026
**Status**: Ready for database setup/verification
