# Scroll-Aware Collapsing Header Implementation

## Overview
Implemented a smooth scroll-aware collapsing header on the Find Talent page. When users scroll past 100 pixels, the category type row (Photo/Video, Models, Influencers, etc.) smoothly collapses and disappears. A floating scroll-to-top button fades in at the same time. When scrolling back to the top, both elements smoothly reappear.

## Changes Made

### File: `/mobile/src/app/(client)/search.tsx`

#### 1. Imports Added
- `Animated` - for animated values and components
- `Easing` - for smooth animation easing
- `TouchableOpacity` - for the scroll-to-top button

#### 2. State & Refs Added
```typescript
const [isScrolled, setIsScrolled] = useState(false); // Tracks scroll position > 100px

// Animated values
const categoryRowAnim = useRef(new Animated.Value(1)).current; // Category row height/opacity
const scrollBtnOpacity = useRef(new Animated.Value(0)).current; // Button opacity
```

#### 3. Constants
```typescript
const CATEGORY_ROW_HEIGHT = 88; // Height of category row with padding (measured from component)
```

#### 4. Animation Effect
Added `useEffect` that runs when `isScrolled` changes:
- Animates category row height from 0 to 88px (0.25s duration)
- Animates category row opacity from 0 to 1
- Animates scroll button opacity from 0 to 1 (0.2s duration)
- Uses `Easing.out(Easing.ease)` for smooth feel
- Parallel animations for better performance

#### 5. Scroll Handler Updated
Modified `handleScroll` to:
- Check if scroll position > 100px
- Update `isScrolled` state when threshold is crossed (avoids unnecessary re-renders)
- Keep existing infinite scroll and showScrollTop logic

#### 6. Category Row Wrapper
Wrapped the category type row in `Animated.View`:
```typescript
<Animated.View
  style={{
    height: categoryRowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, CATEGORY_ROW_HEIGHT],
    }),
    opacity: categoryRowAnim,
    overflow: 'hidden',
  }}
>
  {/* CategoryCardRow component - unchanged */}
</Animated.View>
```

#### 7. Floating Scroll-to-Top Button
Replaced the conditional `Pressable` with an `Animated.View` floating button:
- Positioned absolutely: `bottom: 100, right: 20`
- Uses `scrollBtnOpacity` animation
- Only receives touch events when visible (`pointerEvents: isScrolled ? 'auto' : 'none'`)
- 48×48px, orange (#FF6B35), rounded
- ChevronUp icon with white color
- Elevation: 8 for shadow effect
- Active opacity: 0.85 for press feedback

#### 8. Removed
- `scrollToTop` callback function (now inline in button)

## Behavior

### When User Scrolls Down (> 100px)
1. `isScrolled` becomes `true`
2. Category row animates: height 88px → 0px, opacity 1 → 0
3. Scroll button animates: opacity 0 → 1
4. Duration: 250ms with smooth easing
5. Result: More vertical space for talent results

### When User Scrolls Back Up (≤ 100px)
1. `isScrolled` becomes `false`
2. Category row animates back: height 0px → 88px, opacity 0 → 1
3. Scroll button animates: opacity 1 → 0
4. Result: Header fully restored

## What Stays Visible
The following always remain visible and do NOT collapse:
- Top header bar (back button, "Find Talent" title, filter button)
- Search bar
- Availability + Sort + View Mode toolbar
- Active filter badges row (if any filters applied)

## Technical Details

### Animation Properties
- **Type**: Animated.Value with interpolation
- **Driver**: Native driver for opacity (performance), layout driver for height
- **Easing**: `Easing.out(Easing.ease)` for smooth deceleration
- **Duration**: 250ms for height/opacity, 200ms for button
- **Parallel**: Both animations run simultaneously for better UX

### Scroll Detection
- Threshold: 100px (not 200px which is for showScrollTop flag)
- Event Throttle: 16ms (60fps) for smooth tracking
- State update: Only when value actually changes (avoids unnecessary re-renders)

### Touch Handling
- `pointerEvents: isScrolled ? 'auto' : 'none'` prevents accidental taps when button is hidden
- `activeOpacity: 0.85` provides visual feedback on press

## No Breaking Changes
- All existing functionality preserved
- Search, filters, and result rendering unchanged
- Session state preservation still works
- Shortlist heart buttons unaffected
- Infinite scroll logic unchanged
- Mobile-optimized image loading unchanged

## Testing Checklist
- [ ] Scroll down past 100px → category row collapses, button appears
- [ ] Scroll back up to <100px → category row expands, button disappears
- [ ] Animation is smooth (not jerky)
- [ ] Scroll button scrolls to top when tapped
- [ ] Header bar stays visible during scroll
- [ ] Search and filters still work while scrolled
- [ ] Works on both grid and list view modes
