# Filter UI - Visual Reference & Code Examples

## Visual Layout Guide (Text-Based Mockup)

### Current Problem Areas (What NOT to do):
```
❌ Country Chips (Wrapping):
┌──────────────────────────┐
│ 🇦🇪 United Arab         │  ← Text wraps to 2 lines
│    Emirates              │
└──────────────────────────┘

❌ Toggle Row (Misaligned):
┌────────────────────────────────┐
│  🛡️              Verified Only │  ← Icon floating above text
│    [Toggle]                    │
│    ID verified                 │
└────────────────────────────────┘

❌ Inconsistent Spacing:
┌──────────────┐  ← Different gaps
│   Section 1  │  8px gap
┌──────────────┐
│   Section 2  │  15px gap
┌──────────────┐
│   Section 3  │
└──────────────┘
```

### What It Should Look Like (Best Practice):
```
✅ Country Chips (Single Line):
┌────────────────────────────┐
│ 🇦🇪 United Arab Emirates   │  ← One line, proper padding
└────────────────────────────┘

✅ Toggle Row (Centered):
┌──────────────────────────────┐
│ 🛡️  Verified Only    [Toggle]│  ← Perfect alignment
│    ID verified               │  ← Subtitle below
└──────────────────────────────┘

✅ Consistent Spacing:
┌────────────────────────┐
│     Section 1          │  20px gap
│                        │
│                        │  padding: 16px
└────────────────────────┘
                           ↑ 20px
┌────────────────────────┐
│     Section 2          │  20px gap
│                        │
│                        │  padding: 16px
└────────────────────────┘
```

---

## React Native Code Examples

### ❌ WRONG Way (Text Wrapping):
```javascript
<TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
  <Text style={{ fontSize: 13 }}>
    {country.flag} {country.label}  {/* CAN WRAP! */}
  </Text>
</TouchableOpacity>
```

### ✅ RIGHT Way (Single Line):
```javascript
<TouchableOpacity
  style={{
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 180,  // ← Prevent wrapping
  }}
>
  <Text
    style={{ fontSize: 13 }}
    numberOfLines={1}  // ← Force single line
    ellipsizeMode="tail"  // ← Add ... if too long
  >
    {country.flag} {country.label}
  </Text>
</TouchableOpacity>
```

---

### ❌ WRONG Way (Misaligned Icon):
```javascript
<View style={{ flexDirection: 'row', gap: 12 }}>
  <View style={{ width: 36, height: 36 }}>
    <Ionicons name="shield-checkmark" size={16} />
    {/* Icon not centered! */}
  </View>
  <View>
    <Text>Verified Only</Text>
    <Text>ID verified</Text>
  </View>
  <Switch />
</View>
```

### ✅ RIGHT Way (Perfectly Centered):
```javascript
<View style={{
  flexDirection: 'row',
  alignItems: 'center',  // ← CENTER EVERYTHING
  justifyContent: 'space-between',
  paddingVertical: 12,
  height: 56,  // ← Minimum height
}}>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
    <View style={{
      width: 32,
      height: 32,
      borderRadius: 6,
      backgroundColor: '#f3f4f6',
      alignItems: 'center',  // ← CENTER ICON
      justifyContent: 'center',
    }}>
      <Ionicons name="shield-checkmark" size={16} color="#6b7280" />
    </View>
    <View>
      <Text style={{ fontSize: 13, fontWeight: '500' }}>Verified Only</Text>
      <Text style={{ fontSize: 11, color: '#9ca3af' }}>ID verified</Text>
    </View>
  </View>
  <Switch />
</View>
```

---

### ❌ WRONG Way (Button Text Not Centered):
```javascript
<TouchableOpacity style={{ flex: 1, height: 44, borderRadius: 12 }}>
  <Text style={{ fontSize: 13 }}>  {/* Text floats to top-left! */}
    4+
  </Text>
</TouchableOpacity>
```

### ✅ RIGHT Way (Perfectly Centered Text):
```javascript
<TouchableOpacity
  style={{
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',  // ← CENTER HORIZONTALLY
    justifyContent: 'center',  // ← CENTER VERTICALLY
    backgroundColor: minRating === rating ? '#7c3aed' : '#f3f4f6',
  }}
>
  <Text style={{
    fontSize: 13,
    fontWeight: '600',
    color: minRating === rating ? '#ffffff' : '#6b7280',
  }}>
    {rating === 0 ? 'Any' : `${rating}+`}
  </Text>
</TouchableOpacity>
```

---

### ❌ WRONG Way (Inconsistent Spacing):
```javascript
<ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
  {/* Some sections with 16px gap - looks crowded! */}
  <Section1 />
  <Section2 />
  <Section3 />
</ScrollView>
```

### ✅ RIGHT Way (Consistent Spacing):
```javascript
<ScrollView contentContainerStyle={{
  padding: 16,
  gap: 20,  // ← Increased from 16 to 20
  paddingBottom: 40,
}}>
  <Section1 />  {/* Each with 16px internal padding */}
  <Section2 />  {/* 20px gap between sections */}
  <Section3 />
</ScrollView>
```

---

## Color & Style Constants (Reusable)

### ✅ Define These Once, Use Everywhere:
```javascript
// At top of file
const COLORS = {
  // Gray theme (unselected)
  gray50: '#f3f4f6',
  gray100: '#e5e7eb',
  gray600: '#6b7280',
  gray700: '#9ca3af',
  gray900: '#111827',

  // Purple theme (selected)
  purple600: '#7c3aed',
  white: '#ffffff',
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

const DIMENSIONS = {
  iconSmall: 32,
  iconMedium: 36,
  minTouchTarget: 44,
  toggleRowHeight: 56,
  cardBorderRadius: 16,
  chipBorderRadius: 8,
  iconBorderRadius: 6,
};

// Then use them:
<TouchableOpacity style={{
  height: DIMENSIONS.minTouchTarget,
  backgroundColor: selected ? COLORS.purple600 : COLORS.gray50,
  borderRadius: DIMENSIONS.chipBorderRadius,
  paddingHorizontal: SPACING.md,
}}>
  <Text style={{ color: selected ? COLORS.white : COLORS.gray600 }}>
    Text
  </Text>
</TouchableOpacity>
```

---

## Alignment Checklist (Copy to Your Code)

```javascript
// Toggle Row Template - Copy this pattern:
<View style={{
  flexDirection: 'row',
  alignItems: 'center',  // ✅ CRITICAL for vertical alignment
  justifyContent: 'space-between',
  paddingVertical: SPACING.md,
  height: DIMENSIONS.toggleRowHeight,  // ✅ Minimum 56px
  borderBottomWidth: 1,
  borderBottomColor: COLORS.gray100,
}}>
  {/* LEFT SIDE: Icon + Label (flexible) */}
  <View style={{
    flexDirection: 'row',
    alignItems: 'center',  // ✅ Center icon & text together
    gap: SPACING.md,
    flex: 1,  // ✅ Takes up available space
  }}>
    {/* Icon Container */}
    <View style={{
      width: DIMENSIONS.iconSmall,
      height: DIMENSIONS.iconSmall,
      borderRadius: DIMENSIONS.iconBorderRadius,
      backgroundColor: COLORS.gray50,
      alignItems: 'center',  // ✅ Center icon inside
      justifyContent: 'center',  // ✅ Center icon inside
    }}>
      <Ionicons name="icon-name" size={16} color={COLORS.gray600} />
    </View>

    {/* Text Container */}
    <View>
      <Text style={{
        fontSize: 13,
        fontWeight: '500',
        color: COLORS.gray900,
      }}>
        Label Text
      </Text>
      <Text style={{
        fontSize: 11,
        color: COLORS.gray700,
      }}>
        Description
      </Text>
    </View>
  </View>

  {/* RIGHT SIDE: Toggle (fixed width) */}
  <Switch
    value={value}
    onValueChange={setValue}
    trackColor={{ false: COLORS.gray100, true: COLORS.purple600 }}
    thumbColor={COLORS.white}
  />
</View>
```

---

## Section Card Template - Copy This:

```javascript
{/* SECTION: Title */}
<View style={{
  borderRadius: DIMENSIONS.cardBorderRadius,
  borderWidth: 1,
  borderColor: COLORS.gray100,
  backgroundColor: COLORS.white,
  padding: SPACING.lg,  // ✅ 16px padding
}}>
  {/* Header: Icon + Title */}
  <View style={{
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,  // ✅ 12px bottom margin
  }}>
    <View style={{
      width: DIMENSIONS.iconMedium,
      height: DIMENSIONS.iconMedium,
      borderRadius: DIMENSIONS.iconBorderRadius,
      backgroundColor: COLORS.gray50,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Ionicons name="icon-name" size={18} color={COLORS.gray600} />
    </View>
    <View>
      <Text style={{
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.gray900,
      }}>
        Section Title
      </Text>
      <Text style={{
        fontSize: 12,
        color: COLORS.gray700,
      }}>
        Subtitle or description
      </Text>
    </View>
  </View>

  {/* Content Area */}
  <View>
    {/* Add your content here */}
  </View>
</View>
```

---

## Quick Reference: What to Copy-Paste

### For Consistency, Use These Exact Values Everywhere:
- **Section padding**: `16px`
- **Gap between sections**: `20px`
- **Icon + text gap**: `12px`
- **Section border radius**: `16px`
- **Chip border radius**: `8px`
- **Icon border radius**: `6px`
- **Toggle row height**: `56px`
- **Button minimum height**: `44px`
- **Unselected bg**: `#f3f4f6`
- **Selected bg**: `#7c3aed`
- **All icons color**: `#6b7280`

---

**Use these templates and you'll get perfect alignment every time! 🎯**
