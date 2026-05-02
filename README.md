# WHOOP Clone - React Native iOS App

## Setup Instructions

### Prerequisites
- Node.js 18+
- Xcode 15+ (from Mac App Store)
- CocoaPods (`sudo gem install cocoapods`)
- An Apple Developer account (for testing on real device - required for BLE)
- Supabase project (free tier works)

### 1. Create Expo Project

```bash
npx create-expo-app@latest whoop-clone --template blank-typescript
cd whoop-clone
```

### 2. Install Dependencies

```bash
# BLE Library
npx expo install react-native-ble-plx
npx expo install expo-build-properties

# Navigation
npx expo install @react-navigation/native @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context

# Supabase
npm install @supabase/supabase-js
npx expo install expo-secure-store

# UI & Charts
npm install react-native-svg
npm install victory-native
npx expo install expo-linear-gradient
npx expo install expo-haptics
npx expo install expo-notifications

# Background task
npx expo install expo-task-manager
npx expo install expo-background-fetch
```

### 3. Configure app.json

Replace the contents of `app.json` with the provided `app.json` file.

### 4. Configure Expo Build Properties

Add to `app.json` plugins:
```json
[
  "expo-build-properties",
  {
    "ios": {
      "deploymentTarget": "15.0"
    }
  }
]
```

### 5. Setup Supabase

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor and run `supabase-schema.sql`
3. Copy your project URL and anon key
4. Update `src/lib/supabase.ts` with your credentials

### 6. Build for iOS

Since we use native modules (BLE), we need a development build:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Create development build for iOS
eas build --platform ios --profile development

# OR build locally (requires Xcode)
npx expo prebuild --platform ios
cd ios && pod install && cd ..
npx expo run:ios
```

### 7. Important: BLE requires a REAL device

BLE does NOT work in the iOS Simulator. You must test on a physical iPhone.

## Project Structure

```
whoop-clone/
  src/
    lib/
      supabase.ts          # Supabase client
      ble.ts               # BLE connection manager
      hrParser.ts          # Heart rate data parser
      calculations.ts      # Strain, Recovery, HRV calculations
    hooks/
      useBLE.ts            # BLE React hook
      useHRData.ts         # HR data hook with Supabase sync
    screens/
      OverviewScreen.tsx   # Main dashboard
      StrainScreen.tsx     # Strain details
      RecoveryScreen.tsx   # Recovery details
      SleepScreen.tsx      # Sleep details
      DeviceScreen.tsx     # Device management
      ConnectScreen.tsx    # Initial connection
    components/
      CircularProgress.tsx # Ring chart
      HRChart.tsx          # Heart rate sparkline
      StrainBar.tsx        # Strain gradient bar
      StatCard.tsx         # Metric card
    navigation/
      TabNavigator.tsx     # Bottom tabs
    theme/
      colors.ts            # Color palette
      typography.ts        # Font styles
  app.json
  supabase-schema.sql
```
