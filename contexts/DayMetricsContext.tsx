import { getUserScopedKey } from '@/storage/userScopedKey';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useUser } from './UserContext';

type DayMetricsContextValue = {
  stepsToday: number;
  waterLiters: number;
  addSteps: (amount: number) => void;
  addWater: (amount: number) => void;
  setStepsToday: React.Dispatch<React.SetStateAction<number>>;
  setWaterLiters: React.Dispatch<React.SetStateAction<number>>;
  resetTodayTrackingToDefaults: () => void;
};

const DayMetricsContext = createContext<DayMetricsContextValue | undefined>(undefined);

const BASE_STORAGE_KEY_DAY_METRICS = 'fitlog_day_metrics_v1';

function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DayMetricsProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useUser();
  const userId = currentUser?.id ?? null;

  const todayKey = useMemo(() => getTodayKey(), []);

  const [stepsToday, setStepsToday] = useState(0);
  const [waterLiters, setWaterLiters] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!userId) {
      setStepsToday(0);
      setWaterLiters(0);
      setIsLoaded(true);
      return;
    }

    let isCancelled = false;

    const loadData = async () => {
      try {
        const key = getUserScopedKey(BASE_STORAGE_KEY_DAY_METRICS, userId);
        const stored = await AsyncStorage.getItem(key);
        if (isCancelled) return;
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.dateKey === todayKey) {
            setStepsToday(parsed.stepsToday ?? 0);
            setWaterLiters(parsed.waterLiters ?? 0);
          } else {
            setStepsToday(0);
            setWaterLiters(0);
          }
        } else {
          setStepsToday(0);
          setWaterLiters(0);
        }
      } catch (error) {
        console.error('Error loading day metrics', error);
        setStepsToday(0);
        setWaterLiters(0);
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
  }, [userId, todayKey]);

  useEffect(() => {
    if (!isLoaded || !userId) return;
    const saveData = async () => {
      try {
        const key = getUserScopedKey(BASE_STORAGE_KEY_DAY_METRICS, userId);
        await AsyncStorage.setItem(
          key,
          JSON.stringify({
            dateKey: todayKey,
            stepsToday,
            waterLiters,
          })
        );
      } catch (error) {
        console.error('Error saving day metrics', error);
      }
    };
    saveData();
  }, [stepsToday, waterLiters, isLoaded, userId, todayKey]);

  const addSteps = (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    setStepsToday(prev => prev + amount);
  };

  const addWater = (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    setWaterLiters(prev => prev + amount);
  };

  const resetTodayTrackingToDefaults = () => {
    setStepsToday(0);
    setWaterLiters(0);
  };

  return (
    <DayMetricsContext.Provider
      value={{
        stepsToday,
        waterLiters,
        addSteps,
        addWater,
        setStepsToday,
        setWaterLiters,
        resetTodayTrackingToDefaults,
      }}
    >
      {children}
    </DayMetricsContext.Provider>
  );
}

export function useDayMetrics() {
  const ctx = useContext(DayMetricsContext);
  if (!ctx) {
    throw new Error('useDayMetrics must be used within DayMetricsProvider');
  }
  return ctx;
}
