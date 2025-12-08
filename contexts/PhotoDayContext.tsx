import { PhotoDay, PhotoPosition } from '@/models/photos';
import { getUserScopedKey } from '@/storage/userScopedKey';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useUser } from './UserContext';

const BASE_STORAGE_KEY_PHOTO_DAYS = 'fitlog_photo_days_v1';

const DEFAULT_POSITIONS: PhotoPosition[] = [
  { id: 'front', label: 'Front' },
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
  { id: 'back', label: 'Back' },
  { id: 'flex', label: 'Flex' },
];

function normalizePhotoDay(day: PhotoDay): PhotoDay {
  const existingIds = day.positions.map(p => p.id);
  const missing = DEFAULT_POSITIONS.filter(p => !existingIds.includes(p.id));
  return missing.length > 0 ? { ...day, positions: [...day.positions, ...missing] } : day;
}

type PhotoDayContextType = {
  photoDays: PhotoDay[];
  setPhotoDays: (days: PhotoDay[]) => void;
  addPhotoDay: (day: PhotoDay) => void;
  updatePhotoDay: (dateKey: string, updatedDay: PhotoDay) => void;
  removePhotoDay: (dateKey: string) => void;
  getNextProgressPhotoInfo: (intervalDays: number) => { nextDate: Date | null; daysUntil: number | null };
  isProgressPhotosRequiredOn: (date: Date, intervalDays: number) => boolean;
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
          const parsed = JSON.parse(stored);
          const normalized = parsed.map((d: PhotoDay) => normalizePhotoDay(d));
          setPhotoDays(normalized);
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
    setPhotoDays(prev => [normalizePhotoDay(day), ...prev]);
  };

  const updatePhotoDay = (dateKey: string, updatedDay: PhotoDay) => {
    setPhotoDays(prev =>
      prev.map(day => (day.dateKey === dateKey ? updatedDay : day))
    );
  };

  const removePhotoDay = (dateKey: string) => {
    setPhotoDays(prev => prev.filter(day => day.dateKey !== dateKey));
  };

  const getNextProgressPhotoInfo = (intervalDays: number) => {
    if (!intervalDays || intervalDays < 0) {
      return { nextDate: null, daysUntil: null };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let lastDate: Date | null = null;
    if (photoDays.length > 0) {
      const sorted = [...photoDays].sort((a, b) => new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime());
      lastDate = new Date(sorted[0].dateKey);
      lastDate.setHours(0, 0, 0, 0);
    }

    const baseDate = lastDate ?? today;
    const nextDate = new Date(baseDate);
    nextDate.setDate(baseDate.getDate() + intervalDays);

    const msDiff = nextDate.getTime() - today.getTime();
    const daysUntil = Math.max(0, Math.round(msDiff / (1000 * 60 * 60 * 24)));

    return { nextDate, daysUntil };
  };

  const isProgressPhotosRequiredOn = (date: Date, intervalDays: number) => {
    if (intervalDays < 0) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const input = new Date(date);
    input.setHours(0, 0, 0, 0);

    const target = new Date(today);
    target.setDate(today.getDate() + (intervalDays || 0));

    return input.getTime() === target.getTime();
  };

  return (
    <PhotoDayContext.Provider value={{ photoDays, setPhotoDays, addPhotoDay, updatePhotoDay, removePhotoDay, getNextProgressPhotoInfo, isProgressPhotosRequiredOn }}>
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
