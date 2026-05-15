# Profile Completion Calculation Specification

**Last Updated**: February 24, 2026
**Status**: ✅ Implemented in Vibecode
**Purpose**: Ensure profile completion percentage is consistent across all platforms (Lovable, Vibecode, etc.)

---

## Overview

There are **TWO separate completion calculations** in Vibecode:

1. **Banner Percentage** (6-7 steps) - Used for the "Complete Your Profile" card
2. **Overall Percentage** (10 steps) - Used for visibility score and dashboard statistics

---

## Banner Completion (6-7 Steps)

This is displayed in the "Complete Your Profile" card with the checklist.

### Steps (in order):

| # | Step | Completion Criteria |
|---|------|-------------------|
| 1 | Write your bio | Bio text ≥ 10 characters (after trim) |
| 2 | Add specialties | `subcategories` is object AND has ≥1 key |
| 3* | Complete model details | **ONLY if** `category === 'model'` AND missing (height_cm, build, or nationality) |
| 4 | Upload portfolio | `portfolio_sections.count >= 3` (types: 'image', 'media_gallery', 'embed') |
| 5 | Verify your identity | `is_verified === true` |
| 6 | Add cover photo | `banner_url` exists and not null/empty |
| 7 | Add payout method | `bank_accounts.count > 0` |

\* = Conditional step (only shown for models missing specs)

### Calculation:
```
banner_completed = count of completed steps
banner_total = 6 (or 7 if model with missing specs)
banner_percentage = ROUND((banner_completed / banner_total) * 100)
```

### Example:
- Non-model with 4/6 steps done: (4 / 6) × 100 = **67%** ✅
- Model with missing specs + 3/7 done: (3 / 7) × 100 = **43%** ✅

---

## Overall Profile Completion (10 Steps)

Used for visibility score calculation and overall dashboard stats.

### Steps (exactly 10):

| # | Step | Completion Criteria |
|---|------|-------------------|
| 1 | Avatar | `profile.avatar_url` exists |
| 2 | Bio | `talentProfile.bio.trim().length >= 10` |
| 3 | Location | `talentProfile.location_text` exists |
| 4 | Category | `talentProfile.category` exists |
| 5 | Specialties | `subcategories` is object AND has ≥1 key |
| 6 | Portfolio | `portfolio_sections.count >= 3` |
| 7 | Rates | `hourly_rate OR day_rate OR session_rate` set |
| 8 | Verified | `is_verified === true` |
| 9 | Cover photo | `banner_url` exists |
| 10 | Payout method | `bank_accounts.count > 0` |

### Calculation:
```
overall_completed = count of 10 completed steps
overall_percentage = ROUND((overall_completed / 10) * 100)
```

### Examples:
- 6 steps done: (6 / 10) × 100 = **60%** ✅
- 7 steps done: (7 / 10) × 100 = **70%** ✅
- 10 steps done: (10 / 10) × 100 = **100%** ✅

---

## Where Each is Used

| Percentage | Purpose | Component |
|-----------|---------|-----------|
| `bannerPercentage` | "Complete Your Profile" card display | Dashboard banner card |
| `overallPercentage` | Visibility score calculation | ProfileVisibility widget, stats |
| `bannerPercentage` | Hide banner when 100% | Conditional rendering |

---

## Implementation Details

### Banner Steps Code:
```typescript
const bannerSteps: ProfileCompletionStep[] = [];

bannerSteps.push({
  id: 1,
  label: 'Write your bio',
  completed: !!(talentProfile.bio && talentProfile.bio.trim().length >= 10),
  href: '/(talent)/profile/edit-bio',
});

bannerSteps.push({
  id: 2,
  label: 'Add specialties',
  completed: !!(talentProfile.subcategories && typeof talentProfile.subcategories === 'object' && Object.keys(talentProfile.subcategories).length > 0),
  href: '/(talent)/profile/specialties',
});

// Conditional model specs step
if (talentProfile.category === 'model' && !(talentProfile.height_cm && talentProfile.build && talentProfile.nationality)) {
  bannerSteps.push({
    id: 3,
    label: 'Complete model details',
    completed: false,
    href: '/(talent)/profile/edit-profile',
  });
}

// Portfolio, verification, cover, payout steps follow...

const bannerPercentage = Math.round((bannerSteps.filter(s => s.completed).length / bannerSteps.length) * 100);
```

### Overall Completion Code:
```typescript
let overallCompleted = 0;
const overallTotal = 10;

if (profile?.avatar_url) overallCompleted++;
if (talentProfile.bio && talentProfile.bio.trim().length >= 10) overallCompleted++;
if (talentProfile.location_text) overallCompleted++;
if (talentProfile.category) overallCompleted++;
if (talentProfile.subcategories && typeof talentProfile.subcategories === 'object' && Object.keys(talentProfile.subcategories).length > 0) overallCompleted++;
if (portfolioMediaCount >= 3) overallCompleted++;
if (talentProfile.hourly_rate || talentProfile.day_rate || talentProfile.session_rate) overallCompleted++;
if (talentProfile.is_verified) overallCompleted++;
if (talentProfile.banner_url) overallCompleted++;
if (bankAccountInfo.count > 0) overallCompleted++;

const overallPercentage = Math.round((overallCompleted / overallTotal) * 100);
```

---

## Important Validation Rules

- ✅ Bio: Minimum **10 characters** (use `trim()` to exclude whitespace)
- ✅ Subcategories: Must be **object with at least 1 key** (not array, not empty)
- ✅ Portfolio: Minimum **3 media items** (not projects)
- ✅ Rates: Accept **ANY ONE** of the three rate types
- ✅ Model specs: Only check if `category === 'model'`
- ✅ Rounding: Use `Math.round()`, not ceiling/floor
- ✅ No decimals: Results are whole numbers only (60%, not 60.5%)

---

## Comparison with Lovable

### Banner Display:
| Platform | Steps | Example % |
|----------|-------|-----------|
| Lovable | 6-7 | 67% (4/6 for non-models) |
| Vibecode | 6-7 | 67% (matches) ✅ |

### Overall Completion:
| Platform | Steps | Example % |
|----------|-------|-----------|
| Lovable | 10 | 60% (6/10) |
| Vibecode | 10 | 60% (matches) ✅ |

---

## REMINDERS

- **NEVER** change database tables, columns, RLS policies, migrations, or functions
- **NEVER** change the bottom navigation bar
- Use `Alert.alert()` instead of web toasts
- Banner uses **6-7 steps**, NOT 10
- Overall uses exactly **10 steps**
- Both calculations must match Lovable exactly

---

## Testing Checklist

When verifying the fix:

- [ ] Non-model with 4/6 banner steps done shows **67%**
- [ ] Model with missing specs + 3/7 done shows **43%**
- [ ] 6/10 overall steps shows **60%**
- [ ] 7/10 overall steps shows **70%**
- [ ] 10/10 overall steps shows **100%** (banner hidden)
- [ ] Bio must be trimmed before length check
- [ ] Subcategories checked as object with keys, not array
- [ ] Portfolio count is 3+ media sections
- [ ] Rates check accepts any one of three types


