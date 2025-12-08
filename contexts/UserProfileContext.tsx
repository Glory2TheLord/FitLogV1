import { getUserScopedKey } from '@/storage/userScopedKey';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { BaselineStats, FitLogUser, useUser } from './UserContext';

const BASE_STORAGE_KEY_USER_PROFILE = 'fitlog_user_profile_v1';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type UserProfile = {
  age: number | null;
  sex: 'male' | 'female' | 'other' | null;
  heightCm: number | null;
  currentWeight: number | null; // in lb
  goalWeight: number | null;    // in lb
  startingWeight: number | null; // in lb - weight when user first started tracking
  activityLevel: ActivityLevel;
  maintenanceCalories: number | null;
};

type UserProfileContextType = {
  profile: UserProfile;
  updateProfile: (partial: Partial<UserProfile>) => void;
  recomputeMaintenance: () => void;
  updateBaselineStats: (profileId: string, stats: BaselineStats) => void;
  activeProfile: FitLogUser | null;
};

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

const factorByLevel: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const DEFAULT_PROFILE: UserProfile = {
  age: null,
  sex: null,
  heightCm: null,
  currentWeight: 165,
  goalWeight: 155,
  startingWeight: null,
  activityLevel: 'light',
  maintenanceCalories: null,
};

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { currentUser, updateUserBaselineStats } = useUser();
  const userId = currentUser?.id ?? null;
  
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from AsyncStorage when user changes
  useEffect(() => {
    if (!userId) {
      // No user selected - reset to defaults
      setProfile(DEFAULT_PROFILE);
      setIsLoaded(true);
      return;
    }

    let isCancelled = false;

    const loadData = async () => {
      try {
        const key = getUserScopedKey(BASE_STORAGE_KEY_USER_PROFILE, userId);
        const stored = await AsyncStorage.getItem(key);

        if (isCancelled) return;

        if (stored) {
          setProfile(JSON.parse(stored));
        } else {
          setProfile(DEFAULT_PROFILE);
        }
      } catch (error) {
        console.error('Error loading user profile for user', userId, error);
        if (!isCancelled) {
          setProfile(DEFAULT_PROFILE);
        }
      } finally {
        if (!isCancelled) {
          setIsLoaded(true);
        }
      }
    };

    setIsLoaded(false);
    loadData();

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  // Save to AsyncStorage
  useEffect(() => {
    if (!isLoaded || !userId) return;

    const saveData = async () => {
      try {
        const key = getUserScopedKey(BASE_STORAGE_KEY_USER_PROFILE, userId);
        await AsyncStorage.setItem(key, JSON.stringify(profile));
      } catch (error) {
        console.error('Error saving user profile for user', userId, error);
      }
    };
    saveData();
  }, [profile, isLoaded, userId]);

  const updateProfile = (partial: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...partial }));
  };

  const updateBaselineStats = (profileId: string, stats: BaselineStats) => {
    updateUserBaselineStats(profileId, stats);
    const weightLb = Math.round(stats.weightKg * 2.20462 * 10) / 10;

    setProfile(prev => ({
      ...prev,
      heightCm: stats.heightCm,
      currentWeight: weightLb,
      age: stats.age,
    }));
  };

  const recomputeMaintenance = () => {
    // Check if we have all required inputs
    if (!profile.age || !profile.sex || !profile.heightCm || !profile.currentWeight) {
      return; // Leave maintenanceCalories as-is
    }

    // Convert weight from lb to kg
    const weightKg = profile.currentWeight / 2.20462;

    // Calculate BMR using Mifflin-St Jeor equation
    let bmr: number;
    if (profile.sex === 'male') {
      bmr = 10 * weightKg + 6.25 * profile.heightCm - 5 * profile.age + 5;
    } else if (profile.sex === 'female') {
      bmr = 10 * weightKg + 6.25 * profile.heightCm - 5 * profile.age - 161;
    } else {
      // Use male formula as neutral default for 'other'
      bmr = 10 * weightKg + 6.25 * profile.heightCm - 5 * profile.age + 5;
    }

    // Apply activity factor
    const maintenance = Math.round(bmr * factorByLevel[profile.activityLevel]);

    // Update maintenance calories
    setProfile(prev => ({ ...prev, maintenanceCalories: maintenance }));
  };

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        activeProfile: currentUser ?? null,
        updateProfile,
        recomputeMaintenance,
        updateBaselineStats,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}
