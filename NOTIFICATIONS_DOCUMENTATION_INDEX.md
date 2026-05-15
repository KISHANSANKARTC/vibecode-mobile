# Notifications Table Documentation Index

## Overview

The mobile app requires a `notifications` table in Supabase to display notifications to talent users about verification approvals, rejections, bookings, and payments. The current error suggests this table is either missing or improperly configured.

**Error**: `[notifications-store] Error fetching unread count: [object Object]`
**Project**: https://tghuqwogmnslvlbhchpu.supabase.co

---

## Documentation Files (4 Total)

### 1. NOTIFICATIONS_SQL_SETUP.md
**Best for**: Getting it done quickly

What you get:
- Ready-to-copy SQL code
- 3-step setup process
- Test queries
- Troubleshooting for common post-setup issues

Use this if: You need to create the table immediately

```sql
-- Copy entire script from file into Supabase SQL Editor
-- Run all at once
-- Takes 2-3 minutes
```

---

### 2. NOTIFICATIONS_TABLE_SCHEMA.md
**Best for**: Understanding the structure

What you get:
- Complete table column definitions
- Column-by-column explanation
- SQL with indexes and RLS
- Real-world usage examples

Use this if: You need to understand what columns exist and why

**Key section**:
- "Column Definitions" table - shows all 9 columns
- "RLS Policies Breakdown" - explains each security rule
- "How Notifications Are Used" - real code from the app

---

### 3. NOTIFICATIONS_VERIFICATION_CHECKLIST.md
**Best for**: Diagnosing problems

What you get:
- Step-by-step verification guide
- Diagnostic SQL queries to run
- Common issues and solutions
- Testing procedures

Use this if: The table might exist but something's wrong

**Key section**:
- "Verification Steps in Supabase Dashboard" - check each aspect
- "Troubleshooting" table - match symptoms to solutions
- "Testing" section - verify everything works

---

### 4. NOTIFICATIONS_COMPLETE_ANALYSIS.md
**Best for**: Deep understanding

What you get:
- Executive summary of what's needed
- Why each column matters (detailed explanation)
- How the app uses the table (4 operations)
- Root cause analysis of the current error
- Security and performance considerations

Use this if: You want complete context before implementing

**Key section**:
- "Why Each Column Matters" - detailed explanations
- "How the App Uses This Table" - code examples with RLS checks
- "The Problem (Current Error)" - possible causes and checks

---

## Quick Reference

### The Table in One Image

```
┌─────────────────────────────────────────────────────────────┐
│           public.notifications TABLE                        │
├─────────────────────────────────────────────────────────────┤
│ Column      │ Type         │ Key Info                       │
├─────────────┼──────────────┼────────────────────────────────┤
│ id          │ UUID         │ Primary Key, auto-generated    │
│ user_id     │ UUID         │ FK→auth.users, INDEXED ⚠️      │
│ type        │ TEXT         │ verification_approved, etc.    │
│ title       │ TEXT         │ Short label                    │
│ body        │ TEXT         │ Message content                │
│ is_read     │ BOOLEAN      │ false=new, INDEXED             │
│ deep_link   │ TEXT         │ Nav target (optional)          │
│ created_at  │ TIMESTAMP+TZ │ When created, INDEXED          │
│ updated_at  │ TIMESTAMP+TZ │ When modified                  │
└─────────────────────────────────────────────────────────────┘

RLS POLICIES: 4 required (all protecting user_id)
- SELECT: user can read own notifications
- UPDATE: user can update own notifications
- DELETE: user can delete own notifications
- INSERT: backend can create notifications
```

### The 4 RLS Policies

| # | Policy | Type | Security Rule |
|---|--------|------|---------------|
| 1 | "Users can read their own notifications" | SELECT | `auth.uid() = user_id` |
| 2 | "Users can update their own notifications" | UPDATE | `auth.uid() = user_id` |
| 3 | "Users can delete their own notifications" | DELETE | `auth.uid() = user_id` |
| 4 | "Service role can insert notifications" | INSERT | `true` (backend only) |

---

## How to Use These Documents

### Scenario 1: "I need to set this up right now"
1. Open **NOTIFICATIONS_SQL_SETUP.md**
2. Copy all SQL from "Step 1: Create Table and Policies"
3. Paste into Supabase SQL Editor
4. Click "Run"
5. Verify with "Step 2" queries

### Scenario 2: "The app is throwing errors, I need to diagnose"
1. Open **NOTIFICATIONS_VERIFICATION_CHECKLIST.md**
2. Follow "Verification Steps" 1-5
3. Use queries to identify the problem
4. Look up your issue in "Common Issues & Solutions"

### Scenario 3: "I need to understand this completely"
1. Read **NOTIFICATIONS_COMPLETE_ANALYSIS.md** top to bottom
2. Reference **NOTIFICATIONS_TABLE_SCHEMA.md** for specific columns
3. Use **NOTIFICATIONS_VERIFICATION_CHECKLIST.md** to verify setup

### Scenario 4: "Table exists but I need to debug specific issues"
1. Go to **NOTIFICATIONS_VERIFICATION_CHECKLIST.md**
2. Jump to "Common Issues & Solutions"
3. Find your issue
4. Run the corresponding diagnostic query

---

## The Error Explained

### What's Happening
The app tries to fetch the unread notification count:
```typescript
// mobile/src/lib/state/notifications-store.ts
const { count, error } = await supabase
  .from('notifications')  // Query this table
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)  // Filter to user's notifications
  .eq('is_read', false);  // Count only unread
```

### Why It Fails
The query fails with `[object Object]` error, which means:
1. Either the table doesn't exist
2. Or the SELECT RLS policy is missing/broken
3. Or the column names are wrong

### How to Fix
Check in order:
1. Does `public.notifications` table exist? (Verification Step 1)
2. Does it have the right columns? (Verification Step 2)
3. Is RLS enabled? (Verification Step 3)
4. Are the 4 policies there? (Use Supabase dashboard)

---

## Column Usage by the App

### user_id (MOST IMPORTANT)
- Links to `auth.users(id)`
- Every query filters on this
- Every RLS policy checks this
- MUST be indexed
- App uses: `eq('user_id', userId)`

### is_read
- Default: false (new notifications)
- Updated when: user taps notification or marks all read
- Shown in UI: unread badge count
- App queries: `eq('is_read', false)`
- MUST be indexed

### type
- Values: `verification_approved`, `verification_rejected`, `booking_accepted`, `payment`, `message`
- Used to: choose icon and color
- Not indexed (low cardinality)

### created_at
- Used to: sort notifications (newest first)
- Displayed as: "2h ago", "just now"
- App queries: `order('created_at', { ascending: false })`
- MUST be indexed

### deep_link
- Used to: navigate when notification is tapped
- Example: `"/(talent)/profile"`
- Optional field (can be null)

### id, title, body, updated_at
- id: unique identifier
- title: short label (e.g., "Verification Approved")
- body: full message content
- updated_at: tracks modifications

---

## RLS Policies Explained

### Why RLS is Critical
Without RLS:
```sql
SELECT * FROM notifications;  -- WRONG: User sees ALL notifications
```

With RLS (what the app expects):
```sql
SELECT * FROM notifications WHERE auth.uid() = user_id;  -- RIGHT: User sees only their own
```

### The 4 Policies

**Policy 1: SELECT**
```sql
CREATE POLICY "Users can read their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);
```
Allows: Users to fetch their own notifications
Prevents: Users from querying other users' notifications

**Policy 2: UPDATE**
```sql
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```
Allows: Users to mark their own notifications as read
Prevents: Users from modifying other users' notifications

**Policy 3: DELETE**
```sql
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);
```
Allows: Users to delete their own notifications (optional)
Prevents: Users from deleting other users' notifications

**Policy 4: INSERT**
```sql
CREATE POLICY "Service role can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);
```
Allows: Backend to create notifications (checks are bypassed for service role)
Prevents: Regular users from creating notifications

---

## Files This Table Serves

### Mobile App Files
```
mobile/src/
├── lib/state/notifications-store.ts
│   └── fetchUnreadCount(userId) - Gets count for badge
├── app/(talent)/notifications/
│   ├── index.tsx - Main feed (select, update)
│   ├── feed.tsx - Alternative display
│   └── settings.tsx - Preferences
└── helpers/notificationHelpers.ts - Utilities
```

### Backend (To Implement)
Should insert notifications when:
- Admin approves talent verification
- Admin rejects talent verification
- Booking is accepted
- Payment is processed

---

## Testing Your Setup

After creating the table, test with:

```sql
-- Insert a test notification
INSERT INTO public.notifications (user_id, type, title, body)
VALUES (
  'REPLACE-WITH-REAL-USER-ID',
  'verification_approved',
  'Verification Approved',
  'Your ID verification has been approved!'
);

-- View all notifications (as admin)
SELECT * FROM public.notifications;

-- View as user (RLS enforced)
SELECT * FROM public.notifications WHERE user_id = auth.uid();
```

---

## Indexes Required

These MUST exist for app performance:

| Index | Columns | Why |
|-------|---------|-----|
| `idx_notifications_user_id` | user_id | Every query filters by user |
| `idx_notifications_created_at` | created_at DESC | Sorting notifications |
| `idx_notifications_is_read` | is_read | Counting unread notifications |

Without indexes: queries slow down as data grows

---

## Next Steps

1. **Choose your path**: Which scenario matches your situation?
2. **Read relevant file**: Use the decision tree above
3. **Take action**: Follow the steps in that file
4. **Verify**: Use verification queries to confirm success
5. **Test**: Try the testing procedures in the relevant file

---

## Document Versions

All files created: **March 16, 2026**
- NOTIFICATIONS_TABLE_SCHEMA.md - Complete schema
- NOTIFICATIONS_VERIFICATION_CHECKLIST.md - Diagnostic guide
- NOTIFICATIONS_COMPLETE_ANALYSIS.md - Deep analysis
- NOTIFICATIONS_SQL_SETUP.md - Copy-paste solution

---

## Support

If you get stuck:
1. **Check error message** - Is it permission denied? Table not found? Column not found?
2. **Read relevant file** - Find the matching symptom
3. **Run diagnostic SQL** - Use queries from checklist file
4. **Verify RLS policies** - Check Supabase dashboard
5. **Check app logs** - Look in browser console or mobile logs

---

**Last Updated**: March 16, 2026
**Status**: Complete documentation ready for implementation
**Effort**: 5 minutes to read all, 2-3 minutes to set up
