# Quick Copy-Paste Prompt for Filter UI Improvement

## Simplified Prompt (Easy to Use)

---

### **Fix Filter Modal Text Alignment & UI Design**

Make the Find Talent filter modal look like a premium mobile app with perfect alignment and spacing:

1. **Text Alignment Issues to Fix:**
   - All section titles (Location, Country, Quick Filters) must have consistent left padding and vertical centering with icons
   - Filter labels (Verified Only, Premium Only) should be vertically centered with their icons - no misalignment
   - Description text should appear below labels, not overlapping
   - Long text like "United Arab Emirates" should not wrap - use proper width constraints
   - All button text should be centered horizontally and vertically

2. **Spacing & Padding:**
   - All section cards: 16px padding on all sides
   - Gap between sections: 20px (not 16px)
   - Icon-to-text gap: 12px (consistent throughout)
   - Toggle row height: minimum 56px with centered content

3. **Icon Styling:**
   - All section icons: exactly 36x36px with 8px border radius
   - All icons: neutral gray color (#6b7280)
   - Perfect vertical alignment with text (not floating above/below)

4. **Interactive Elements:**
   - All buttons/toggles: minimum 44px height (iOS standard)
   - Text should fit in buttons without wrapping
   - Toggle switch on the right side, label + icon on left side with flex: 1

5. **Color Consistency:**
   - Unselected: gray background (#f3f4f6), gray text (#6b7280)
   - Selected: purple background (#7c3aed), white text (#ffffff)
   - Borders: light gray (#e5e7eb)

6. **Specific Fixes:**
   - Location toggle: "Find talent near you" text should be properly aligned
   - Country chips: no text overflow, proper internal padding
   - Rating buttons: 44px height, centered text
   - Gender/Build: equal flex distribution, centered text

7. **Mobile First:**
   - No horizontal scrolling
   - Safe area respected
   - All touch targets 44x44px minimum
   - Proper line height for readability

---

## Even Shorter Version (For Direct Copy-Paste)

**"Fix the Find Talent filter modal to have perfect text alignment, consistent spacing (16px padding, 20px gaps between sections), properly centered icon-text pairs, minimum 44px touch targets, and a premium mobile app feel. Ensure no text wrapping, consistent border radius (16px), and gray icons (#6b7280). Test on mobile device."**

---

## Visual Checklist

After improvements, verify:
- [ ] All text is aligned left with consistent padding
- [ ] Icons are perfectly centered with their labels
- [ ] No text overlaps or wrapping
- [ ] Section spacing is consistent (20px gaps)
- [ ] All buttons are at least 44x44px
- [ ] Colors are consistent (gray vs purple for selected)
- [ ] Toggle switches are on the right side only
- [ ] Looks good on both portrait and landscape
- [ ] Can tap all buttons without hitting text

---
