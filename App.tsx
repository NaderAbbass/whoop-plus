// App.tsx
import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, View } from 'react-native';

import { OverviewScreen } from './src/screens/OverviewScreen';
import { StrainScreen } from './src/screens/StrainScreen';
import { RecoveryScreen } from './src/screens/RecoveryScreen';
import { SleepScreen } from './src/screens/SleepScreen';
import { DeviceScreen } from './src/screens/DeviceScreen';
import { colors } from './src/theme/colors';

const Tab = createBottomTabNavigator();

const DarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: 'rgba(12,12,12,0.95)',
    text: colors.text,
    border: colors.border,
    primary: colors.green,
  },
};

const tabIcons: Record<string, string> = {
  Overview: '◉',
  Strain: '⚡',
  Recovery: '♥',
  Sleep: '☾',
  Device: '⚙',
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={DarkTheme}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: {
              backgroundColor: 'rgba(12,12,12,0.95)',
              borderTopColor: colors.border,
              borderTopWidth: 0.5,
              paddingBottom: 20,
              paddingTop: 8,
              height: 80,
            },
            tabBarActiveTintColor: colors.text,
            tabBarInactiveTintColor: colors.text3,
            tabBarLabelStyle: {
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 0.3,
              fontFamily: 'System',
            },
            tabBarIcon: ({ focused, color }) => (
              <Text
                style={{
                  fontSize: 20,
                  color: focused ? colors.text : colors.text3,
                  opacity: focused ? 1 : 0.4,
                }}
              >
                {tabIcons[route.name]}
              </Text>
            ),
          })}
        >
          <Tab.Screen name="Overview" component={OverviewScreen} />
          <Tab.Screen name="Strain" component={StrainScreen} />
          <Tab.Screen name="Recovery" component={RecoveryScreen} />
          <Tab.Screen name="Sleep" component={SleepScreen} />
          <Tab.Screen name="Device" component={DeviceScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
