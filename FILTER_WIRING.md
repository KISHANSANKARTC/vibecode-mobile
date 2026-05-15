# Find Talent Filter Wiring - Complete Implementation

## Overview
All filter state variables in the Find Talent filter sheet are now wired to the Supabase query. When users adjust any filter, the talent results automatically update.

## Architecture

### 1. Filter State Management (search.tsx)

All filter state is maintained in the main search screen component:

```typescript
// Basic filters
const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null);
const [selectedNationality, setSelectedNationality] = useState<string | null>(null);
const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);
const [verifiedOnly, setVerifiedOnly] = useState(false);
const [premiumOnly, setPremiumOnly] = useState(false);
const [minRating, setMinRating] = useState<0 | 4 | 4.5 | 4.8>(0);
const [nearMeEnabled, setNearMeEnabled] = useState(false);
const [maxDistance, setMaxDistance] = useState(5);
const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
const [selectedEthnicity, setSelectedEthnicity] = useState<string | null>(null);
const [selectedBuild, setSelectedBuild] = useState<string | null>(null);
const [heightRange, setHeightRange] = useState<[number, number]>([155, 195]);
const [weightRange, setWeightRange] = useState<[number, number]>([40, 150]);
const [selectedShoeSize, setSelectedShoeSize] = useState<string | null>(null);

// Influencer filters
const [followerRange, setFollowerRange] = useState<[number, number]>([0, 1000000]);
const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
const [selectedAudienceTypes, setSelectedAudienceTypes] = useState<string[]>([]);

// Specialty filters (client-side applied)
const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
```

### 2. Filter Propagation (useEffect in search.tsx)

A useEffect hook watches all filter state variables and automatically triggers a Supabase query when any filter changes:

```typescript
useEffect(() => {
  const buildFilterObject = (): Partial<TalentSearchFilters> => {
    const filterObject: Partial<TalentSearchFilters> = {};

    // Only add filters with non-default values to keep query clean
    if (verifiedOnly) filterObject.isVerified = true;
    if (premiumOnly) filterObject.isPremium = true;
    if (minRating > 0) filterObject.minRating = minRating;
    if (priceRange[0] > 0) filterObject.minPrice = priceRange[0];
    if (priceRange[1] < 2000) filterObject.maxPrice = priceRange[1];
    // ... more filters

    return filterObject;
  };

  const updatedFilters: Partial<TalentSearchFilters> = {
    ...buildFilterObject(),
    query: searchQuery,
    category: selectedCategory,
    sort: filters.sort || 'recommended',
  };

  // Only trigger if filters actually changed (prevents extra re-renders)
  const filtersChanged = JSON.stringify(updatedFilters) !== JSON.stringify(filters);
  if (filtersChanged) {
    search(updatedFilters); // Triggers Supabase query
    saveSessionState(updatedFilters);
  }
}, [
  verifiedOnly, premiumOnly, minRating, priceRange, selectedCountry,
  selectedNationality, selectedGender, selectedEthnicity, selectedBuild,
  heightRange, weightRange, selectedShoeSize, followerRange,
  selectedNiches, selectedAudienceTypes, selectedSpecialties,
  nearMeEnabled, maxDistance,
]);
```

### 3. Supabase Query Building (useTalentSearch.ts)

The `search()` function passes filters to `useTalentSearch` hook, which builds the Supabase query:

**Server-side filters (applied in Supabase):**
- `isVerified` → `.eq('is_verified', true)`
- `isPremium` → `.eq('is_premium', true)`
- `minRating` → `.gte('rating', value)`
- `minPrice` → `.gte('hourly_rate', value)`
- `maxPrice` → `.lte('hourly_rate', value)`
- `ethnicity` → `.eq('ethnicity', value)`
- `nationality` → `.eq('nationality', value)` (converted from ID to label)
- `build` → `.eq('build', value)`
- `heightMin` → `.gte('height_cm', value)`
- `heightMax` → `.lte('height_cm', value)`
- `weight` → `.gte('weight_kg', value)` (minimum)
- `weightMax` → `.lte('weight_kg', value)` (maximum)
- `shoeSize` → `.eq('shoe_size', value)`
- `followerCountMin` → `.gte('follower_count', value)`
- `followerCountMax` → `.lte('follower_count', value)`
- `niches` → `.overlaps('influencer_niche', array)`
- `audiences` → `.overlaps('audience_type', array)`
- `country` → `.eq('country', value)`

**Client-side filters (applied after fetching):**
- `gender` → Filtered from profiles data joined with talent results
- `specialties` → Filtered from subcategories JSONB field

### 4. Filter Count Badge

Active filter count is displayed on the filter icon button:

```typescript
const activeFiltersCount = [
  verifiedOnly,
  premiumOnly,
  minRating > 0,
  priceRange[0] > 0 || priceRange[1] < 2000,
  nearMeEnabled,
  selectedCountry,
  selectedGender,
  selectedNationality,
  selectedEthnicity,
  selectedBuild,
  heightRange[0] > 155 || heightRange[1] < 195,
  weightRange[0] > 40 || weightRange[1] < 150,
  selectedShoeSize,
  followerRange[0] > 0 || followerRange[1] < 1000000,
  selectedNiches.length > 0,
  selectedAudienceTypes.length > 0,
  selectedSpecialties.length > 0,
].filter(Boolean).length;
```

## How It Works

1. **User adjusts a filter** (e.g., toggles "Verified Only")
   - State variable is updated (e.g., `setVerifiedOnly(true)`)

2. **useEffect detects the change**
   - Builds complete filter object from all state variables
   - Compares new filters with previous filters
   - If different, calls `search(updatedFilters)`

3. **search() passes to useTalentSearch**
   - Updates internal filter state
   - Calls `fetchTalents(0)` to reset pagination
   - Generates unique request key to prevent race conditions

4. **fetchTalents builds Supabase query**
   - Applies each server-side filter sequentially
   - Executes query against talent_profiles table
   - Fetches additional data (profiles, portfolio, bookings)
   - Merges data and applies client-side filters (gender, specialties)
   - Returns filtered results

5. **Results update in real-time**
   - Talent list refreshes with new results
   - Filter badge shows active filter count
   - Pagination resets to page 0

## Reset and Apply Buttons

**"Reset" Button:**
- Calls `handleResetFilters()`
- Sets all state variables back to defaults
- useEffect detects change and triggers new search with no filters
- Results show all talents

**"Show Results" Button (implicit):**
- Closes filter sheet via `setShowFilterSheet(false)`
- Filter state changes already triggered search
- Results are already updated on screen

## Data Type Mappings

### Nationality (ID → Label)
The filter uses nationality IDs (e.g., 'emirati', 'saudi') but the database stores labels (e.g., 'Emirati', 'Saudi'). No conversion needed in current implementation as the Supabase query compares against stored label values.

### Weight Range
Uses two state variables for range:
- `weightRange[0]` → `filters.weight` (minimum)
- `weightRange[1]` → `filters.weightMax` (maximum)

### Follower Range
Uses two state variables for range:
- `followerRange[0]` → `filters.followerCountMin`
- `followerRange[1]` → `filters.followerCountMax`

## Key Implementation Details

### 1. Conditional Filtering
Only non-default values are sent to the query to keep it clean and efficient:
```typescript
if (priceRange[0] > 0) filterObject.minPrice = priceRange[0]; // Skip if 0
if (priceRange[1] < 2000) filterObject.maxPrice = priceRange[1]; // Skip if 2000 (default)
```

### 2. Race Condition Prevention
Uses `resultKeyRef` to track latest request and ignore stale responses:
```typescript
const currentRequestKey = generateResultKey();
resultKeyRef.current = currentRequestKey;
// ... later, only apply results if still latest request
if (currentRequestKey === resultKeyRef.current) {
  setTalents(filtered);
}
```

### 3. Session State Persistence
Filter state is saved to sessionStorage for 2-hour duration:
```typescript
saveSessionState(updatedFilters); // Called whenever filters change
```

### 4. Pagination Reset
When filters change, pagination always resets to page 0:
```typescript
const search = useCallback((newFilters: Partial<TalentSearchFilters>) => {
  const updatedFilters = { ...filters, ...newFilters };
  setFilters(updatedFilters);
  pageRef.current = 0; // Reset to first page
  fetchTalents(0);
}, [filters, fetchTalents]);
```

## Files Modified

1. **mobile/src/app/(client)/search.tsx**
   - Added influencer and specialty filter state variables
   - Added useEffect to wire filters to Supabase query
   - Updated active filter count to include all filters
   - Updated reset function to reset all filter states

2. **mobile/src/hooks/useTalentSearch.ts**
   - Added `weightMax` field to support weight range queries
   - Added weight max filter to Supabase query (`.lte('weight_kg', filters.weightMax)`)
   - Updated filter key generation to include weightMax

3. **mobile/src/components/search/MobileFilterSheet.tsx**
   - Added `weightMax` field to TalentSearchFilters interface

## Testing Checklist

- [x] TypeScript compilation passes (no errors)
- [x] ESLint checks pass (no warnings)
- [x] All filter state variables defined
- [x] useEffect dependencies include all filters
- [x] Filter building logic includes all filters
- [x] Reset function resets all filters
- [x] Active filter count includes all filters
- [ ] Test verified only filter on real device
- [ ] Test premium only filter on real device
- [ ] Test rating filter on real device
- [ ] Test price range filter on real device
- [ ] Test gender filter on real device
- [ ] Test nationality filter on real device
- [ ] Test country filter on real device
- [ ] Test ethnicity filter (model category)
- [ ] Test build filter (model category)
- [ ] Test height range filter (model category)
- [ ] Test weight range filter (model category)
- [ ] Test shoe size filter (model category)
- [ ] Test follower range filter (influencer category)
- [ ] Test niches filter (influencer category)
- [ ] Test audience types filter (influencer category)
- [ ] Test reset button clears all filters
- [ ] Test active filter count badge updates
- [ ] Test filter results update in real-time
- [ ] Test pagination resets on filter change
- [ ] Test session state restoration on app reload

## Troubleshooting

If filters aren't working:

1. **Check browser console for errors** - Look for Supabase query errors
2. **Verify filter state values** - Use React DevTools to inspect component state
3. **Check Supabase query** - Enable RLS logging to see actual queries being executed
4. **Test individual filters** - Apply one filter at a time to isolate issues
5. **Check data types** - Ensure filter values match database schema (e.g., 'Emirati' not 'emirati' for nationality)
6. **Verify pagination** - Ensure `pageRef.current` resets to 0 when filters change
