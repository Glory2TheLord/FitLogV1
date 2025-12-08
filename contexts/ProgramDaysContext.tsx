import { getUserScopedKey } from '@/storage/userScopedKey';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useUser } from './UserContext';

const BASE_STORAGE_KEY_PROGRAM_DAYS = 'fitlog_program_days_v1';

export type ProgramDayId = string;

export type ProgramDay = {
  id: ProgramDayId;
  index: number;
  name: string;
  isActive: boolean;
};

type ProgramDaysContextValue = {
  programDays: ProgramDay[];
  addProgramDay: (name: string) => void;
  removeProgramDay: (id: ProgramDayId) => void;
  updateProgramDay: (id: ProgramDayId, updates: Partial<Pick<ProgramDay, 'name' | 'isActive'>>) => void;
  getProgramDayById: (id: ProgramDayId) => ProgramDay | undefined;
  getProgramDayByIndex: (index: number) => ProgramDay | undefined;
};

const ProgramDaysContext = createContext<ProgramDaysContextValue | undefined>(undefined);

const DEFAULT_PROGRAM_DAYS: ProgramDay[] = [
  { id: 'day-1', index: 1, name: 'Chest & Tris', isActive: true },
  { id: 'day-2', index: 2, name: 'Shoulders', isActive: true },
  { id: 'day-3', index: 3, name: 'Back & Bis', isActive: true },
  { id: 'day-4', index: 4, name: 'Legs', isActive: true },
  { id: 'day-5', index: 5, name: 'Accessories', isActive: true },
];

export function ProgramDaysProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useUser();
  const userId = currentUser?.id ?? null;
  
  const [programDays, setProgramDays] = useState<ProgramDay[]>(DEFAULT_PROGRAM_DAYS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from AsyncStorage when user changes
  useEffect(() => {
    if (!userId) {
      // No user selected - use default days
      setProgramDays(DEFAULT_PROGRAM_DAYS);
      setIsLoaded(true);
      return;
    }

    let isCancelled = false;

    const loadData = async () => {
      try {
        const key = getUserScopedKey(BASE_STORAGE_KEY_PROGRAM_DAYS, userId);
        const stored = await AsyncStorage.getItem(key);
        
        if (isCancelled) return;

        if (stored) {
          const parsed = JSON.parse(stored);
          // Migration: ensure all days have isActive property
          const migrated = parsed.map((day: any) => ({
            ...day,
            isActive: day.isActive ?? true,
          }));
          setProgramDays(migrated);
        } else {
          setProgramDays(DEFAULT_PROGRAM_DAYS);
        }
      } catch (error) {
        console.error('Error loading program days for user', userId, error);
        if (!isCancelled) {
          setProgramDays(DEFAULT_PROGRAM_DAYS);
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
        const key = getUserScopedKey(BASE_STORAGE_KEY_PROGRAM_DAYS, userId);
        await AsyncStorage.setItem(key, JSON.stringify(programDays));
      } catch (error) {
        console.error('Error saving program days for user', userId, error);
      }
    };
    saveData();
  }, [programDays, isLoaded, userId]);

  const addProgramDay = (name: string) => {
    const maxIndex = Math.max(...programDays.map(d => d.index), 0);
    const newIndex = maxIndex + 1;
    const newDay: ProgramDay = {
      id: `day-${newIndex}-${Date.now()}`,
      index: newIndex,
      name: name.trim() || 'New Day',
      isActive: true,
    };
    setProgramDays(prev => [...prev, newDay]);
  };

  const removeProgramDay = (id: ProgramDayId) => {
    setProgramDays(prev => {
      const filtered = prev.filter(d => d.id !== id);
      // Re-index remaining days
      return filtered.map((day, idx) => ({ ...day, index: idx + 1 }));
    });
  };

  const updateProgramDay = (id: ProgramDayId, updates: Partial<Pick<ProgramDay, 'name' | 'isActive'>>) => {
    setProgramDays(prev =>
      prev.map(day => (day.id === id ? { ...day, ...updates } : day))
    );
  };

  const getProgramDayById = (id: ProgramDayId): ProgramDay | undefined => {
    return programDays.find(d => d.id === id);
  };

  const getProgramDayByIndex = (index: number): ProgramDay | undefined => {
    return programDays.find(d => d.index === index);
  };

  return (
    <ProgramDaysContext.Provider
      value={{
        programDays,
        addProgramDay,
        removeProgramDay,
        updateProgramDay,
        getProgramDayById,
        getProgramDayByIndex,
      }}
    >
      {children}
    </ProgramDaysContext.Provider>
  );
}

export function useProgramDays() {
  const context = useContext(ProgramDaysContext);
  if (!context) {
    throw new Error('useProgramDays must be used within ProgramDaysProvider');
  }
  return context;
}
