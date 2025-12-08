import { getUserScopedKey } from '@/storage/userScopedKey';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useUser } from './UserContext';

export type Preferences = {
  dailyStepGoal: number;
  dailyWaterGoal: number; // liters
  dailyCalorieGoal: number; // kcal
  dailyProteinGoal: number; // grams
  cheatMealIntervalDays: number;
};

type PreferencesContextValue = {
  preferences: Preferences;
  updatePreferences: (prefs: Preferences) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

const BASE_STORAGE_KEY_PREFERENCES = 'fitlog_preferences_v1';

const DEFAULT_PREFERENCES: Preferences = {
  dailyStepGoal: 10000,
  dailyWaterGoal: 3, // liters
  dailyCalorieGoal: 1600,
  dailyProteinGoal: 165,
  cheatMealIntervalDays: 7,
};

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useUser();
  const userId = currentUser?.id ?? null;

  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences when user changes
  useEffect(() => {
    if (!userId) {
      setPreferences(DEFAULT_PREFERENCES);
      setIsLoaded(true);
      return;
    }

    let isCancelled = false;
    const loadPrefs = async () => {
      try {
        const key = getUserScopedKey(BASE_STORAGE_KEY_PREFERENCES, userId);
        const stored = await AsyncStorage.getItem(key);
        if (isCancelled) return;
        if (stored) {
          const parsed = JSON.parse(stored);
          setPreferences({
            ...DEFAULT_PREFERENCES,
            ...parsed,
          });
        } else {
          setPreferences(DEFAULT_PREFERENCES);
        }
      } catch (error) {
        console.error('Error loading preferences', error);
        if (!isCancelled) {
          setPreferences(DEFAULT_PREFERENCES);
        }
      } finally {
        if (!isCancelled) {
          setIsLoaded(true);
        }
      }
    };

    setIsLoaded(false);
    loadPrefs();

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  // Persist preferences
  useEffect(() => {
    if (!isLoaded || !userId) return;
    const savePrefs = async () => {
      try {
        const key = getUserScopedKey(BASE_STORAGE_KEY_PREFERENCES, userId);
        await AsyncStorage.setItem(key, JSON.stringify(preferences));
      } catch (error) {
        console.error('Error saving preferences', error);
      }
    };
    savePrefs();
  }, [preferences, isLoaded, userId]);

  const updatePreferences = (prefs: Preferences) => {
    setPreferences(prefs);
  };

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return ctx;
}
