import { PhotoDay } from '@/models/photos';
import { getUserScopedKey } from '@/storage/userScopedKey';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useUser } from './UserContext';

const BASE_STORAGE_KEY_PHOTO_DAYS = 'fitlog_photo_days_v1';

type PhotoDayContextType = {
  photoDays: PhotoDay[];
  setPhotoDays: (days: PhotoDay[]) => void;
  addPhotoDay: (day: PhotoDay) => void;
  updatePhotoDay: (dateKey: string, updatedDay: PhotoDay) => void;
  removePhotoDay: (dateKey: string) => void;
};

const PhotoDayContext = createContext<PhotoDayContextType | undefined>(undefined);

export function PhotoDayProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useUser();
  const userId = currentUser?.id ?? null;
  
  const [photoDays, setPhotoDays] = useState<PhotoDay[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from AsyncStorage when user changes
  useEffect(() => {
    if (!userId) {
      // No user selected - reset to empty
      setPhotoDays([]);
      setIsLoaded(true);
      return;
    }

    let isCancelled = false;

    const loadData = async () => {
      try {
        const key = getUserScopedKey(BASE_STORAGE_KEY_PHOTO_DAYS, userId);
        const stored = await AsyncStorage.getItem(key);

        if (isCancelled) return;

        if (stored) {
          setPhotoDays(JSON.parse(stored));
        } else {
          setPhotoDays([]);
        }
      } catch (error) {
        console.error('Error loading photo days for user', userId, error);
        if (!isCancelled) {
          setPhotoDays([]);
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
        const key = getUserScopedKey(BASE_STORAGE_KEY_PHOTO_DAYS, userId);
        await AsyncStorage.setItem(key, JSON.stringify(photoDays));
      } catch (error) {
        console.error('Error saving photo days for user', userId, error);
      }
    };
    saveData();
  }, [photoDays, isLoaded, userId]);

  const addPhotoDay = (day: PhotoDay) => {
    setPhotoDays(prev => [day, ...prev]);
  };

  const updatePhotoDay = (dateKey: string, updatedDay: PhotoDay) => {
    setPhotoDays(prev =>
      prev.map(day => (day.dateKey === dateKey ? updatedDay : day))
    );
  };

  const removePhotoDay = (dateKey: string) => {
    setPhotoDays(prev => prev.filter(day => day.dateKey !== dateKey));
  };

  return (
    <PhotoDayContext.Provider value={{ photoDays, setPhotoDays, addPhotoDay, updatePhotoDay, removePhotoDay }}>
      {children}
    </PhotoDayContext.Provider>
  );
}

export function usePhotoDays() {
  const context = useContext(PhotoDayContext);
  if (!context) {
    throw new Error('usePhotoDays must be used within PhotoDayProvider');
  }
  return context;
}
