import { getUserScopedKey } from '@/storage/userScopedKey';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useUser } from './UserContext';

export type EvaluateTodayGoalsInput = {
  stepsToday: number;
  stepGoal: number;
  calories: number;
  calorieGoal: number;
  protein: number;
  proteinGoal: number;
  water: number;
  waterGoal: number;
  workoutsCompleted: number;
  mealsCompleted: number;
  mealsPlanned: number;
  weighInRequired: boolean;
  hasWeighedInToday: boolean;
  photosRequired: boolean;
  hasCompletedPhotosToday: boolean;
  isCheatMealDay: boolean;
  hasCompletedCheatMeal: boolean;
};

export type EvaluateTodayGoalsResult = {
  allGoalsReached: boolean;
  missedGoals: string[];
};

export type DayHistoryEventType =
  | 'markDayComplete'
  | 'goalsChanged'
  | 'weighIn'
  | 'cheatCycleChanged'
  | 'stepsLogged'
  | 'stepsAddedManual'
  | 'stepGoalReached'
  | 'stepsUpdatedFromFitbit'
  | 'calorieGoalReached'
  | 'proteinGoalReached'
  | 'goalWeightReached'
  | 'mealCompleted'
  | 'mealsAllCompleted'
  | 'workoutLogged'
  | 'photosSlotCompleted'
  | 'photosAllCompleted'
  | 'waterLogged'
  | 'cheatMealLogged'
  | 'workoutNotesAdded'
  | 'workoutNotesUpdated'
  | 'workoutTemplateUpdated'
  | 'workoutEdited'
  | 'dayNoteAdded'
  | 'workoutNotes';

export type DayHistoryEvent = {
  id: string;
  timestampISO: string;
  type: DayHistoryEventType;
  summary: string;
  details?: Record<string, any>;
};
// Event detail conventions (not a strict type to keep flexibility):
// - workoutLogged: { workoutId?, workoutName?, sets?, repsPerSet?, weightPerSetLbs?, isCardio?, durationMinutes?, stepsAddedFromWorkout?, stepsTotalAfter?, isPersonalBest?, previousBestInfo? }
// - mealCompleted/mealsAllCompleted: { mealId?, mealName?, calories?, proteinGrams?, carbsGrams?, fatGrams?, mealsCompleted?, mealsPlanned?, totalCaloriesForDay?, totalProteinForDay? }
// - photosSlotCompleted/photosAllCompleted: { slot?, photosTaken?, required? }
// - stepsLogged/stepGoalReached: { previous?, current?, delta?, stepGoal?, source? }
// - waterLogged: { previous?, current?, delta?, waterGoal? }
// - cheatMealLogged: { description?, caloriesEstimate?, notes? }
// - weighIn/goalWeightReached: { previousWeightLbs?, weightLbs?, goalWeightLbs?, weeksUntilGoalBefore?, weeksUntilGoalAfter? }

export type DayHistoryEntry = {
  id: string; // date key, e.g. "2025-12-08"
  dateISO: string; // full ISO string for that day
  isDayComplete: boolean;
  allGoalsReached?: boolean;
  missedGoals?: string[];

  steps: number;
  stepGoal: number;

  water: number;
  waterGoal: number;

  calories: number;
  calorieGoal: number;

  protein: number;
  proteinGoal: number;

  workoutsCompleted: number;

  mealsCompleted: number;
  mealsPlanned?: number;

  didWeighIn: boolean;
  weightLbs?: number;

  didPhotos: boolean;
  photosTaken: number;
  photosRequired: number;

  cheatInfo?: {
    isCheatDay: boolean;
    daysUntilCheat?: number;
    cycleDay?: number;
  };

  weeksUntilGoalAtThatTime?: number | null;
  events: DayHistoryEvent[];
};

type DayMetricsContextValue = {
  stepsToday: number;
  waterLiters: number;
  addSteps: (amount: number) => void;
  addWater: (amount: number) => void;
  setStepsToday: React.Dispatch<React.SetStateAction<number>>;
  setWaterLiters: React.Dispatch<React.SetStateAction<number>>;
  resetTodayTrackingToDefaults: () => void;
  history: DayHistoryEntry[];
  upsertHistoryEntry: (entry: DayHistoryEntry) => void;
  deleteHistoryEntry: (id: string) => void;
  addHistoryEventForToday: (event: Omit<DayHistoryEvent, 'id' | 'timestampISO'>) => void;
  getHistory: () => DayHistoryEntry[];
  getHistoryEntryById: (id: string) => DayHistoryEntry | undefined;
  evaluateTodayGoals: (input: EvaluateTodayGoalsInput) => EvaluateTodayGoalsResult;
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

function normalizeHistoryEntry(entry: DayHistoryEntry): DayHistoryEntry {
  return {
    ...entry,
    allGoalsReached: entry.allGoalsReached ?? entry.isDayComplete ?? false,
    missedGoals: entry.missedGoals ?? [],
    events: entry.events ?? [],
  };
}

export function evaluateTodayGoals(input: EvaluateTodayGoalsInput): EvaluateTodayGoalsResult {
  const missedGoals: string[] = [];

  const stepsGoalMet = input.stepsToday >= input.stepGoal;
  const caloriesGoalMet = input.calories >= input.calorieGoal;
  const proteinGoalMet = input.protein >= input.proteinGoal;
  const waterGoalMet = input.water >= input.waterGoal;
  const mealsGoalMet =
    input.mealsPlanned === 0 ? true : input.mealsCompleted >= input.mealsPlanned;
  const workoutsGoalMet = input.workoutsCompleted > 0;
  const weighInGoalMet = !input.weighInRequired || input.hasWeighedInToday;
  const photosGoalMet = !input.photosRequired || input.hasCompletedPhotosToday;
  const cheatMealGoalMet = !input.isCheatMealDay || input.hasCompletedCheatMeal;

  if (!stepsGoalMet) missedGoals.push('steps');
  if (!caloriesGoalMet) missedGoals.push('calories');
  if (!proteinGoalMet) missedGoals.push('protein');
  if (!mealsGoalMet) missedGoals.push('meals');
  if (!workoutsGoalMet) missedGoals.push('workouts');
  if (!waterGoalMet) missedGoals.push('water');
  if (!weighInGoalMet) missedGoals.push('weighIn');
  if (!photosGoalMet) missedGoals.push('photos');
  if (!cheatMealGoalMet) missedGoals.push('cheatMeal');

  return {
    allGoalsReached:
      stepsGoalMet &&
      caloriesGoalMet &&
      proteinGoalMet &&
      waterGoalMet &&
      mealsGoalMet &&
      workoutsGoalMet &&
      weighInGoalMet &&
      photosGoalMet &&
      cheatMealGoalMet,
    missedGoals,
  };
}

export function DayMetricsProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useUser();
  const userId = currentUser?.id ?? null;

  const todayKey = useMemo(() => getTodayKey(), []);

  const [stepsToday, setStepsToday] = useState(0);
  const [waterLiters, setWaterLiters] = useState(0);
  const [history, setHistory] = useState<DayHistoryEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!userId) {
      setStepsToday(0);
      setWaterLiters(0);
      setHistory([]);
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
          const normalizedHistory = (parsed?.history ?? []).map((entry: DayHistoryEntry) =>
            normalizeHistoryEntry(entry)
          );
          setHistory(normalizedHistory);
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
          setHistory([]);
        }
      } catch (error) {
        console.error('Error loading day metrics', error);
        setStepsToday(0);
        setWaterLiters(0);
        setHistory([]);
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
            history,
          })
        );
      } catch (error) {
        console.error('Error saving day metrics', error);
      }
    };
    saveData();
  }, [stepsToday, waterLiters, history, isLoaded, userId, todayKey]);

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

  const upsertHistoryEntry = (entry: DayHistoryEntry) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h.id !== entry.id);
      const updated = [
        ...filtered,
        {
          ...entry,
          allGoalsReached: entry.allGoalsReached ?? entry.isDayComplete ?? false,
          missedGoals: entry.missedGoals ?? [],
          events: entry.events ?? [],
        },
      ];
      return updated.sort((a, b) => b.id.localeCompare(a.id));
    });
  };

  const deleteHistoryEntry = (id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  const addHistoryEventForToday = (event: Omit<DayHistoryEvent, 'id' | 'timestampISO'>) => {
    const todayKey = getTodayKey();
    const timestampISO = new Date().toISOString();
    const newEvent: DayHistoryEvent = {
      id: `${timestampISO}-${event.type}`,
      timestampISO,
      ...event,
    };

    setHistory(prev => {
      const existing = prev.find(h => h.id === todayKey);
      const baseEntry: DayHistoryEntry =
        existing ??
        {
          id: todayKey,
          dateISO: timestampISO,
          isDayComplete: false,
          allGoalsReached: false,
          missedGoals: [],
          steps: stepsToday,
          stepGoal: 0,
          water: waterLiters,
          waterGoal: 0,
          calories: 0,
          calorieGoal: 0,
          protein: 0,
          proteinGoal: 0,
          workoutsCompleted: 0,
          mealsCompleted: 0,
          mealsPlanned: 0,
          didWeighIn: false,
          weightLbs: undefined,
          didPhotos: false,
          photosTaken: 0,
          photosRequired: 0,
          cheatInfo: undefined,
          weeksUntilGoalAtThatTime: null,
          events: [],
        };

      const updatedEntry: DayHistoryEntry = {
        ...baseEntry,
        events: [...(baseEntry.events || []), newEvent],
      };

      const filtered = prev.filter(h => h.id !== todayKey);
      return [...filtered, updatedEntry].sort((a, b) => b.id.localeCompare(a.id));
    });
  };

  const getHistory = () => history;

  const getHistoryEntryById = (id: string) => history.find(h => h.id === id);

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
        history,
        upsertHistoryEntry,
        deleteHistoryEntry,
        addHistoryEventForToday,
        getHistory,
        getHistoryEntryById,
        evaluateTodayGoals,
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

export function useHistory() {
  const { history } = useDayMetrics();
  return history;
}
