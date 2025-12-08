
// app/_layout.tsx
import { Slot } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform, StatusBar, View } from 'react-native';

import { MealTrackingProvider } from '@/contexts/MealTrackingContext';
import { PhotoDayProvider } from '@/contexts/PhotoDayContext';
import { ProgramDaysProvider } from '@/contexts/ProgramDaysContext';
import { DayMetricsProvider } from '@/contexts/DayMetricsContext';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import { UserProvider, useUser } from '@/contexts/UserContext';
import { UserProfileProvider } from '@/contexts/UserProfileContext';
import { WorkoutsProvider } from '@/contexts/WorkoutsContext';

// Login/profile selection screen
import ProfileSelectScreen from './profileSelect';

function AppShell() {
  const { currentUser, isLoaded } = useUser();

  const statusBarHeight =
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

  return (
    <View
      style={{
        flex: 1,
        // Keep this as the app's cream background color:
        backgroundColor: '#FFF7EA',
        paddingTop: statusBarHeight,
      }}
    >
      {/* Black bar under the Android status bar so icons are readable */}
      {Platform.OS === 'android' && statusBarHeight > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: statusBarHeight,
            backgroundColor: '#000',
            zIndex: 10,
          }}
        />
      )}

      {/* Make the actual system status bar use light icons */}
      <ExpoStatusBar
        style="light"
        translucent
        backgroundColor="transparent"
      />

      {/* If we are still initializing, avoid flashing layouts */}
      {!isLoaded ? null : !currentUser ? (
        // No profile yet -> show login/profile selection
        <ProfileSelectScreen />
      ) : (
        // Profile selected -> show the normal routed app (tabs etc.)
        <Slot />
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <UserProvider>
      <UserProfileProvider>
        <ProgramDaysProvider>
          <MealTrackingProvider>
            <PreferencesProvider>
              <DayMetricsProvider>
                <WorkoutsProvider>
                  <PhotoDayProvider>
                    <AppShell />
                  </PhotoDayProvider>
                </WorkoutsProvider>
              </DayMetricsProvider>
            </PreferencesProvider>
          </MealTrackingProvider>
        </ProgramDaysProvider>
      </UserProfileProvider>
    </UserProvider>
  );
}
