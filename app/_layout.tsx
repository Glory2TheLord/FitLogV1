
// app/_layout.tsx
import { Slot, usePathname, useRouter } from 'expo-router';
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
function AppShell() {
  const { currentUser, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const statusBarHeight =
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

  React.useEffect(() => {
    if (!isLoaded) return;

    // If no user is selected, force the profile selection route.
    if (!currentUser) {
      if (pathname !== '/profileSelect') {
        router.replace('/profileSelect');
      }
      return;
    }

    // If a user exists but we are on the profile selection route, send to the app.
    if (currentUser && pathname === '/profileSelect') {
      router.replace('/(tabs)');
    }
  }, [currentUser, isLoaded, pathname, router]);

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
      {!isLoaded ? null : <Slot />}
    </View>
  );
}

export default function RootLayout() {
  return (
    <UserProvider>
      <DayMetricsProvider>
        <UserProfileProvider>
          <PreferencesProvider>
            <ProgramDaysProvider>
              <MealTrackingProvider>
                <WorkoutsProvider>
                  <PhotoDayProvider>
                    <AppShell />
                  </PhotoDayProvider>
                </WorkoutsProvider>
              </MealTrackingProvider>
            </ProgramDaysProvider>
          </PreferencesProvider>
        </UserProfileProvider>
      </DayMetricsProvider>
    </UserProvider>
  );
}
