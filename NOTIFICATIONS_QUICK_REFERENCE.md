# Notifications Table - Quick Reference Card

## Table At a Glance

```
TABLE: public.notifications
SCHEMA: public
SUPABASE: https://tghuqwogmnslvlbhchpu.supabase.co

Columns:
  id UUID PK             - unique identifier
  user_id UUID FK        - links to auth.users (CRITICAL - indexed)
  type TEXT              - verification_approved, verification_rejected, booking_accepted, payment, message
  title TEXT             - short label
  body TEXT              - message content
  is_read BOOLEAN        - false = new, true = read (indexed)
  deep_link TEXT         - navigation target
  created_at TIMESTAMP   - when created (indexed)
  updated_at TIMESTAMP   - when modified
```

## RLS Policies (All Must Exist)

| # | Name | Type | Condition |
|---|------|------|-----------|
| 1 | Users can read their own notifications | SELECT | `auth.uid() = user_id` |
| 2 | Users can update their own notifications | UPDATE | `auth.uid() = user_id` |
| 3 | Users can delete their own notifications | DELETE | `auth.uid() = user_id` |
| 4 | Service role can insert notifications | INSERT | `true` |

## Current Error

```
[notifications-store] Error fetching unread count: [object Object]
```

**Cause**: Table doesn't exist or RLS is misconfigured
**Fix**: Use NOTIFICATIONS_SQL_SETUP.md to create/fix

## Quick Diagnosis (Run in Supabase SQL Editor)

```sql
-- Does table exist?
SELECT * FROM public.notifications LIMIT 1;

-- Does it have right columns?
SELECT column_name FROM information_schema.columns WHERE table_name='notifications';

-- Is RLS enabled?
SELECT rowsecurity FROM pg_tables WHERE tablename='notifications';

-- Do all 4 policies exist?
SELECT policyname, cmd FROM pg_policies WHERE tablename='notifications';
```

Expected results:
- Step 1: Either rows or "does not exist"
- Step 2: 9 rows with column names
- Step 3: TRUE (or 't')
- Step 4: 4 rows with SELECT, UPDATE, DELETE, INSERT

## To Create Table (2 minutes)

1. Open: https://tghuqwogmnslvlbhchpu.supabase.co
2. Go to: SQL Editor
3. Copy SQL from: NOTIFICATIONS_SQL_SETUP.md
4. Paste and run

## Files to Read

- **Quick setup**: NOTIFICATIONS_SQL_SETUP.md
- **Master guide**: NOTIFICATIONS_DOCUMENTATION_INDEX.md
- **Detailed schema**: NOTIFICATIONS_TABLE_SCHEMA.md
- **Diagnostics**: NOTIFICATIONS_VERIFICATION_CHECKLIST.md
- **Deep analysis**: NOTIFICATIONS_COMPLETE_ANALYSIS.md

## What Each RLS Policy Does

### SELECT Policy
Allows users to fetch only their own notifications:
```sql
WHERE auth.uid() = user_id
```
Prevents privacy breach - user can't see others' notifications

### UPDATE Policy
Allows users to update only their own notifications:
```sql
WHERE auth.uid() = user_id
```
Used for marking notifications as read

### DELETE Policy
Allows users to delete only their own notifications:
```sql
WHERE auth.uid() = user_id
```
Optional - used if app supports dismissal

### INSERT Policy
Allows backend/service role to create notifications:
```sql
CHECK (true)  -- Service role bypasses RLS
```
Only backend should have service role key

## How App Uses This Table

1. **Badge Count**: `SELECT COUNT(*) WHERE is_read = false` (on startup)
2. **Feed**: `SELECT * ORDER BY created_at DESC` (when opening screen)
3. **Mark Read**: `UPDATE SET is_read = true` (when user taps)
4. **Real-time**: Subscribe to INSERT events (for instant delivery)

All queries are RLS-protected by `auth.uid() = user_id`

## Critical Columns

### user_id (MOST IMPORTANT)
- Links to `auth.users(id)`
- Used in every RLS policy
- MUST be indexed
- If wrong: users see wrong notifications or nothing

### is_read
- Default: false (new notifications)
- Updated when: user marks as read
- Used for: badge count calculation
- MUST be indexed (app queries this frequently)

### created_at
- Used for: sorting (newest first)
- Displayed as: "2h ago", "just now"
- MUST be indexed (needed for ORDER BY)

### type
- Used for: choosing icon and color in UI
- Values: verification_approved, verification_rejected, booking_accepted, payment, message
- Not indexed (low cardinality)

## Indexes Required

```
Index                           Columns              Why
─────────────────────────────────────────────────────────────────────
idx_notifications_user_id       user_id              Filter by user (every query)
idx_notifications_created_at    created_at DESC      Sort by date
idx_notifications_is_read       is_read              Count unread notifications
```

Without indexes: Queries slow down as data grows
With indexes: Fast even with 10,000+ notifications

## Files in Codebase

```
mobile/src/
├── lib/state/notifications-store.ts
│   └── fetchUnreadCount() - Gets count for badge
├── app/(talent)/notifications/
│   ├── index.tsx - Main feed
│   ├── feed.tsx - Alternative display
│   └── settings.tsx - Preferences
└── helpers/notificationHelpers.ts
```

## Test After Creating Table

```sql
-- Insert test
INSERT INTO public.notifications (user_id, type, title, body)
VALUES ('USER-UUID', 'verification_approved', 'Test', 'Test');

-- View all
SELECT * FROM public.notifications;

-- Check columns
SELECT column_name FROM information_schema.columns WHERE table_name='notifications';

-- Verify RLS
SELECT rowsecurity FROM pg_tables WHERE tablename='notifications';

-- View policies
SELECT policyname, cmd FROM pg_policies WHERE tablename='notifications';

-- Test user access
SELECT * FROM public.notifications WHERE user_id = auth.uid();
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Table doesn't exist | Create it (NOTIFICATIONS_SQL_SETUP.md) |
| Permission denied | Check RLS policies exist and are correct |
| Users see other's notifications | Enable RLS on table |
| Real-time not working | Check RLS filters |
| Slow queries | Add missing indexes |
| Empty list despite data | SELECT policy missing |

## Key Numbers

- **Columns**: 9 total
- **Policies**: 4 required
- **Indexes**: 3 critical
- **Setup time**: 2-3 minutes
- **Notification types**: 5 (extensible)
- **Max length of fields**: Unlimited (TEXT type)

## Next Steps

1. Read NOTIFICATIONS_DOCUMENTATION_INDEX.md (master guide)
2. Choose your scenario (setup vs. diagnose)
3. Follow the relevant file
4. Run diagnostic queries
5. Test with sample data

## Success Criteria

- [ ] Table exists in Supabase
- [ ] 9 columns present
- [ ] RLS is enabled
- [ ] 4 policies exist
- [ ] 3 indexes created
- [ ] SELECT query works (no permissions error)
- [ ] Test notification inserted successfully
- [ ] App shows unread badge correctly

---

**Reference Card v1.0**
**Created**: March 16, 2026
**Project**: Engage - Creative Talent Marketplace
