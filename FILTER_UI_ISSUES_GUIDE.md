# Filter UI - Text Alignment & Design Issues Guide

## Current Issues & How to Describe Them

### Issue 1: Text Wrapping in Country Chips
**Problem**: "United Arab Emirates" text wraps to multiple lines or gets cut off
**How to describe it**: "Country chips are wrapping text. Need: `numberOfLines={1}`, `ellipsizeMode="tail"`, and explicit width constraint."
**Solution**: Add `numberOfLines={1}` to country chip Text components, or wrap them with a fixed-width View.

### Issue 2: Toggle Row Misalignment
**Problem**: Icon, label, and description are not vertically centered with the toggle switch
**How to describe it**: "Verified/Premium toggles have the icon floating above the text instead of being centered together."
**Solution**: Wrap icon+label in a View with `flex: 1`, ensure all children use `alignItems: 'center'`, set consistent row height (56px).

### Issue 3: Inconsistent Section Spacing
**Problem**: Some sections have less/more padding than others
**How to describe it**: "Section cards have inconsistent padding. Some have 16px, some have 20px. Also, gaps between sections should be uniform at 20px."
**Solution**: Ensure ALL section cards use `padding: 16` and ScrollView uses `gap: 20`.

### Issue 4: Icon Alignment Issues
**Problem**: Icons are not perfectly centered with their text
**How to describe it**: "Section icons (flag, filter, person icons) are not vertically aligned with the title text - they appear higher or lower."
**Solution**: Use `justifyContent: 'center'` and `alignItems: 'center'` on the container, set explicit icon dimensions (36x36px).

### Issue 5: Button Text Not Centered
**Problem**: Rating buttons or gender chips have text that's left-aligned or bottom-aligned instead of centered
**How to describe it**: "Rating buttons (Any, 4+, 4.5+) have text that appears off-center or not properly distributed within the button."
**Solution**: Add `alignItems: 'center'` and `justifyContent: 'center'` to TouchableOpacity/button containers.

### Issue 6: Border Radius Inconsistency
**Problem**: Section cards have different border radius values
**How to describe it**: "Some cards have 12px border radius, others have 16px. Should be uniform."
**Solution**: Set all section cards to `borderRadius: 16`.

### Issue 7: Color Inconsistency
**Problem**: Selected state colors don't match, some use different backgrounds
**How to describe it**: "When a filter is selected, some show purple (#7c3aed), others show orange. And text color doesn't always change to white."
**Solution**: Ensure selected state: `backgroundColor: '#7c3aed'`, `color: '#ffffff'`.

### Issue 8: Touch Target Size
**Problem**: Some buttons are too small to tap easily
**How to describe it**: "Some filter options (like country chips) are smaller than 44x44px, making them hard to tap on mobile."
**Solution**: Set minimum height of 44px for all interactive elements.

---

## How to Pass This to Someone Fixing It

### Best Approach: Show Examples
1. **Take screenshots** of the current filter modal on mobile
2. **Circle/highlight** the misaligned text with an image editor
3. **Note specific areas**: "See how the 'United Arab Emirates' text wraps? That's Issue #1."
4. **Send the checklist above** so they know what to fix

### Alternative: Use This Text
**"The filter modal has text alignment issues. Specifically:**
- **Country chips**: Text is wrapping when it shouldn't (e.g., "United Arab Emirates")
- **Toggle rows**: Icons are not vertically centered with the label text
- **Spacing**: Inconsistent padding between sections - should be 16px inside cards, 20px between cards
- **Button text**: Rating buttons and gender buttons have text that's not perfectly centered
- **Border radius**: Mix of 12px and 16px - should be uniform at 16px
- **Colors**: When selected, some filters don't change to purple (#7c3aed) with white text
- **Touch targets**: Some chips are smaller than 44x44px minimum
- **Icons**: Not perfectly vertically centered with text

**Priority fixes (in order):**
1. Fix text wrapping (country chips)
2. Fix vertical alignment of icons with labels
3. Make all text perfectly centered in buttons
4. Standardize spacing (16px padding, 20px gaps)
5. Ensure all touch targets are ≥44x44px
6. Verify all colors are consistent (gray vs purple)
"**

---

## Code Quality Checklist for Filter UI

When reviewing/improving filter code, ensure:

- [ ] All Text components with potential overflow have `numberOfLines={1}` + `ellipsizeMode="tail"`
- [ ] All section cards have `padding: 16`
- [ ] Gap between sections is `gap: 20`
- [ ] All icon containers are exactly `36x36` or `32x32` with appropriate `borderRadius`
- [ ] All toggle rows have minimum `height: 56`
- [ ] All buttons have minimum `height: 44`
- [ ] Icon+text pairs use `flexDirection: 'row'`, `alignItems: 'center'`, `gap: 12`
- [ ] Selected state: `backgroundColor: '#7c3aed'`, `color: '#ffffff'`, `borderColor: '#7c3aed'`
- [ ] Unselected state: `backgroundColor: '#f3f4f6'`, `color: '#6b7280'`, `borderColor: '#e5e7eb'`
- [ ] All section titles use `fontSize: 14`, `fontWeight: '600'`, `color: '#111827'`
- [ ] All descriptions use `fontSize: 12`, `color: '#9ca3af'`
- [ ] All borders are `borderWidth: 1`, `borderColor: '#e5e7eb'`
- [ ] All border radius is `borderRadius: 16` for cards, `borderRadius: 8` for chips

---

## Template Message to Copy

> **"Can you improve the Find Talent filter modal UI with perfect text alignment and spacing?**
>
> **Main issues to fix:**
> 1. Country chip text wraps (should use numberOfLines={1})
> 2. Icon + label not vertically centered
> 3. Inconsistent padding/spacing between sections
> 4. Button text not centered
> 5. Inconsistent border radius and colors
> 6. Some touch targets smaller than 44x44px
>
> **Requirements:**
> - All section cards: 16px padding, 16px border radius
> - Gap between sections: 20px
> - All icons: 36x36px with consistent color (#6b7280)
> - All buttons: minimum 44x44px, centered text
> - Selected: purple (#7c3aed) background + white text
> - Unselected: gray (#f3f4f6) background + gray text
>
> **Result should look premium and mobile-friendly with perfect alignment.**"

---
