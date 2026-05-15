# Filter Page UI Improvement Prompt

Use this prompt to improve the Find Talent filter modal with better text alignment, spacing, and overall design:

---

## Comprehensive Prompt for Better Filter UI

**Improve the Find Talent filter modal page to have perfect text alignment, better spacing, and a premium mobile app interface. Focus on:**

### 1. Text Alignment & Typography
- **Section Headers**: Ensure all section titles (Location, Country, Quick Filters, Gender, Nationality, etc.) are perfectly aligned left, with consistent padding
- **Label Text**: All filter labels (e.g., "Verified Only", "Premium Only") should be vertically centered with their icons
- **Description Text**: Smaller gray descriptions below labels should be right-aligned below the main label text, not overlapping
- **Button Text**: All button/chip text (rating buttons, country chips) should be centered both horizontally and vertically
- **Prevent Text Wrapping**: Ensure long country names like "United Arab Emirates" don't wrap awkwardly - use proper width constraints

### 2. Icon & Text Pairing
- **Icon-Text Spacing**: Consistent 12px gap between section icons and titles
- **Icon Sizing**: All section icons should be exactly 36x36px with consistent corner radius
- **Icon Alignment**: Icons should be perfectly centered vertically with the section title
- **Icon Colors**: All icons should use the same neutral gray (#6b7280)

### 3. Section Layout
- **Card Padding**: Each section card should have consistent 16px padding on all sides
- **Border Radius**: Uniform 16px border radius for all section cards
- **Section Spacing**: 20px gap between section cards (not 16px)
- **Internal Padding**: 12px padding within toggle rows and other internal elements

### 4. Toggle Row Alignment
- **Verified/Premium Toggles**:
  - Icon + Label + Description on the LEFT (flex: 1)
  - Toggle switch on the RIGHT (fixed width)
  - Vertical center alignment for all elements
  - Proper height (at least 56px for good touch targets)

### 5. Filter Controls
- **Rating Buttons**: Should have minimum 44px height, text perfectly centered
- **Country Chips**: Text should fit without wrapping, proper padding (12px horizontal, 8px vertical)
- **Gender/Build Buttons**: Equal flex distribution, centered text
- **Plus More Button**: Should have the same styling as other chips but with purple (#7c3aed) text

### 6. Color Consistency
- **Unselected State**: Gray background (#f3f4f6), gray text (#6b7280), gray border (#e5e7eb)
- **Selected State**: Purple background (#7c3aed), white text (#ffffff), purple border (#7c3aed)
- **Primary Text**: Dark gray (#111827)
- **Secondary Text**: Light gray (#9ca3af)
- **Icons**: Neutral gray (#6b7280)

### 7. Overall Visual Improvements
- **Cleaner Hierarchy**: Better visual distinction between primary (section headers) and secondary text (descriptions)
- **Breathing Room**: 20px gaps between sections prevent crowding
- **Touch Targets**: All interactive elements should be at least 44px high
- **Visual Balance**: Icons should be perfectly aligned with text, no overlaps or misalignment
- **Border & Shadow**: Subtle 1px border (#e5e7eb), light shadow if needed

### 8. Specific Areas to Fix
- **Location Section**: Toggle label "Find talent near you" should be right-aligned below "Location"
- **Country Section**: Flag + country name should not wrap, use proper container width
- **Quick Filters**: Icon, title, subtitle should all be vertically centered
- **Gender/Build Chips**: Ensure text is centered in buttons, no overflow
- **Price/Height/Weight Controls**: Proper vertical alignment of +/- buttons with input display

### 9. Mobile-First Design
- **Safe Area**: Respect safe area padding on all sides
- **Finger-Friendly**: All interactive areas at least 44x44px
- **No Horizontal Scroll**: All content should fit within screen width
- **Proper Line Height**: Use 1.5x line height for better readability
- **Keyboard Safe**: Ensure modal doesn't obscure inputs when keyboard opens

### 10. Before Applying
- Take a screenshot of the current filter modal
- Note any text overlaps or misalignments
- Check both portrait and landscape orientations
- Test with longer text (e.g., "United Arab Emirates")

---

## Example Areas That Likely Need Fixing

1. **Country chips** - Text may wrap or overflow (need: `numberOfLines={1}` or fixed width)
2. **Toggle rows** - Icon/label vertical alignment issues (need: explicit height + center alignment)
3. **Section spacing** - Crowding between sections (increase gap to 20px)
4. **Border inconsistency** - Some sections may have different border colors
5. **Padding variance** - Sections may have different padding amounts
6. **Text size inconsistency** - Headers might not align with consistent font sizes

---

## Implementation Tips

1. **Use flexbox properly**: `flex: 1` for labels, fixed widths for icons and toggles
2. **Add numberOfLines**: Prevent text wrapping with `numberOfLines={1}` and `ellipsizeMode="tail"`
3. **Consistent height**: Give all rows a minimum height (56px for controls, 44px for buttons)
4. **Vertical center**: Use `alignItems: 'center'` + `justifyContent: 'center'` for perfect alignment
5. **Test on device**: Always test on real mobile device to check text alignment
6. **Use style variables**: Define spacing (8, 12, 16, 20) as constants to stay consistent

---

## Expected Result

After implementing these improvements, the filter modal should:
- ✅ Have no text wrapping or overflow issues
- ✅ Show perfect vertical alignment between icons and text
- ✅ Have consistent spacing throughout
- ✅ Look professional with proper typography hierarchy
- ✅ Be easy to tap (all touch targets ≥44x44px)
- ✅ Match iOS Human Interface Guidelines
- ✅ Feel like a premium mobile app
