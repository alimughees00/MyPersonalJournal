# Inter Font Setup Instructions

## Step 1: Download Inter Font Files

1. Go to [Inter Font Releases](https://github.com/rsms/inter/releases) or [Google Fonts Inter](https://fonts.google.com/specimen/Inter)
2. Download the font family (you need TTF files for different weights)
3. Download these specific weights:
   - Inter-Thin.ttf
   - Inter-ExtraLight.ttf
   - Inter-Light.ttf
   - Inter-Regular.ttf
   - Inter-Medium.ttf
   - Inter-SemiBold.ttf
   - Inter-Bold.ttf
   - Inter-ExtraBold.ttf
   - Inter-Black.ttf

## Step 2: Place Font Files

1. Place all downloaded `.ttf` files in `src/assets/fonts/` directory

## Step 3: Link Fonts to Native Projects

Run the following command to automatically link fonts:

```bash
npx react-native-cli link
```

Or manually link:

**For Android:**

- Ensure `react-native.config.js` includes font configuration (already done)
- Create directory: `android/app/src/main/assets/fonts/`
- Copy all `.ttf` files to that directory

**For iOS:**

- Open `ios/MyJournal.xcodeproj` in Xcode
- Add the font files to the project (drag and drop into Xcode)
- Make sure they're added to the `MyJournal` target
- Open `Info.plist` and add the following key:

```xml
<key>UIAppFonts</key>
<array>
    <string>Inter-Thin.ttf</string>
    <string>Inter-ExtraLight.ttf</string>
    <string>Inter-Light.ttf</string>
    <string>Inter-Regular.ttf</string>
    <string>Inter-Medium.ttf</string>
    <string>Inter-SemiBold.ttf</string>
    <string>Inter-Bold.ttf</string>
    <string>Inter-ExtraBold.ttf</string>
    <string>Inter-Black.ttf</string>
</array>
```

## Step 4: Use Inter Font in Your Components

### Example 1: Simple Usage

```javascript
import {StyleSheet} from 'react-native';
import {fontFamily} from '../utils/fonts';

const styles = StyleSheet.create({
  text: {
    fontFamily: fontFamily.Inter_400,
    fontSize: 14,
  },
  boldText: {
    fontFamily: fontFamily.Inter_700,
    fontSize: 16,
  },
});
```

### Example 2: Using the Helper Function

```javascript
import {StyleSheet} from 'react-native';
import {getFontFamily} from '../utils/fonts';

const styles = StyleSheet.create({
  heading: {
    fontFamily: getFontFamily(700),
    fontSize: 24,
  },
  body: {
    fontFamily: getFontFamily(400),
    fontSize: 14,
  },
});
```

## Step 5: Update Your Components

Replace any `fontFamily` references with Inter fonts:

```javascript
// Before
const styles = StyleSheet.create({
  text: {
    fontSize: 14,
  },
});

// After
import {fontFamily} from '../utils/fonts';

const styles = StyleSheet.create({
  text: {
    fontFamily: fontFamily.Inter_400,
    fontSize: 14,
  },
});
```

## Troubleshooting

- **Fonts not appearing on Android**: Clear cache with `npm run android -- --reset-cache`
- **Fonts not appearing on iOS**: Clean build folder in Xcode (Cmd+Shift+K), delete derived data
- **Build error**: Ensure all `.ttf` files are in the correct directories

## Quick Test

Create a simple test component to verify fonts are working:

```javascript
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {fontFamily} from '../utils/fonts';

const FontTest = () => {
  return (
    <View>
      <Text style={{fontFamily: fontFamily.Inter_400}}>Inter Regular</Text>
      <Text style={{fontFamily: fontFamily.Inter_600}}>Inter SemiBold</Text>
      <Text style={{fontFamily: fontFamily.Inter_700}}>Inter Bold</Text>
    </View>
  );
};

export default FontTest;
```
