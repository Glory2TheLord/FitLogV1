import { getUserScopedKey } from '@/storage/userScopedKey';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useUser } from './UserContext';
import { useDayMetrics } from './DayMetricsContext';
import { usePreferences } from './PreferencesContext';

const BASE_STORAGE_KEY_MEAL_TEMPLATES = 'fitlog_meal_templates_v1';
const BASE_STORAGE_KEY_MEAL_SLOTS = 'fitlog_meal_slots_v1';
const BASE_STORAGE_KEY_DAILY_TOTALS = 'fitlog_daily_totals_v1';
const BASE_STORAGE_KEY_CHEAT_USED = 'fitlog_cheat_used_today_v1';
const BASE_STORAGE_KEY_STREAK = 'fitlog_eating_streak_v1';

export type MealCategory = 'meal' | 'snack' | 'cheat';

export type MealTemplate = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  category: MealCategory;
};

export type MealSlot = {
  id: number;
  templateId: string | null;
  completed: boolean;
};

type DailyTotals = {
  calories: number;
  protein: number;
};

type MealTrackingContextType = {
  // Meal templates
  mealTemplates: MealTemplate[];
  setMealTemplates: React.Dispatch<React.SetStateAction<MealTemplate[]>>;
  
  // Meal slots
  mealSlots: MealSlot[];
  setMealSlots: React.Dispatch<React.SetStateAction<MealSlot[]>>;
  
  // Daily totals
  dailyTotals: DailyTotals;
  setDailyTotals: React.Dispatch<React.SetStateAction<DailyTotals>>;
  
  // Cheat meal tracking
  cheatUsedToday: boolean;
  setCheatUsedToday: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Streak tracking
  goodEatingStreak: number;
  setGoodEatingStreak: React.Dispatch<React.SetStateAction<number>>;
  
  // Helpers
  recalculateDailyTotals: () => void;
  evaluateTodayForStreak: () => void;
};

const MealTrackingContext = createContext<MealTrackingContextType | undefined>(undefined);

export const CALORIE_GOAL = 1600;
export const PROTEIN_GOAL = 165;

const DEFAULT_MEAL_TEMPLATES: MealTemplate[] = [
  { id: 'protein-shake', name: 'Protein Shake', calories: 195, protein: 42, category: 'meal' },
];

const DEFAULT_MEAL_SLOTS: MealSlot[] = [
  { id: 1, templateId: null, completed: false },
  { id: 2, templateId: null, completed: false },
  { id: 3, templateId: null, completed: false },
  { id: 4, templateId: null, completed: false },
  { id: 5, templateId: null, completed: false },
];

const DEFAULT_DAILY_TOTALS: DailyTotals = {
  calories: 0,
  protein: 0,
};

export function MealTrackingProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useUser();
  const userId = currentUser?.id ?? null;
  const { addHistoryEventForToday } = useDayMetrics();
  const { preferences } = usePreferences();
  
  const [mealTemplates, setMealTemplates] = useState<MealTemplate[]>(DEFAULT_MEAL_TEMPLATES);
  const [mealSlots, setMealSlots] = useState<MealSlot[]>(DEFAULT_MEAL_SLOTS);
  const [dailyTotals, setDailyTotals] = useState<DailyTotals>(DEFAULT_DAILY_TOTALS);
  const [cheatUsedToday, setCheatUsedToday] = useState(false);
  const [goodEatingStreak, setGoodEatingStreak] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from AsyncStorage when user changes
  useEffect(() => {
    if (!userId) {
      // No user selected - reset to defaults
      setMealTemplates(DEFAULT_MEAL_TEMPLATES);
      setMealSlots(DEFAULT_MEAL_SLOTS);
      setDailyTotals(DEFAULT_DAILY_TOTALS);
      setCheatUsedToday(false);
      setGoodEatingStreak(0);
      setIsLoaded(true);
      return;
    }

    let isCancelled = false;

    const loadData = async () => {
      try {
        const [templatesStored, slotsStored, totalsStored, cheatStored, streakStored] = await Promise.all([
          AsyncStorage.getItem(getUserScopedKey(BASE_STORAGE_KEY_MEAL_TEMPLATES, userId)),
          AsyncStorage.getItem(getUserScopedKey(BASE_STORAGE_KEY_MEAL_SLOTS, userId)),
          AsyncStorage.getItem(getUserScopedKey(BASE_STORAGE_KEY_DAILY_TOTALS, userId)),
          AsyncStorage.getItem(getUserScopedKey(BASE_STORAGE_KEY_CHEAT_USED, userId)),
          AsyncStorage.getItem(getUserScopedKey(BASE_STORAGE_KEY_STREAK, userId)),
        ]);

        if (isCancelled) return;

        setMealTemplates(templatesStored ? JSON.parse(templatesStored) : DEFAULT_MEAL_TEMPLATES);
        setMealSlots(slotsStored ? JSON.parse(slotsStored) : DEFAULT_MEAL_SLOTS);
        setDailyTotals(totalsStored ? JSON.parse(totalsStored) : DEFAULT_DAILY_TOTALS);
        setCheatUsedToday(cheatStored ? JSON.parse(cheatStored) : false);
        setGoodEatingStreak(streakStored ? JSON.parse(streakStored) : 0);
      } catch (error) {
        console.error('Error loading meal data for user', userId, error);
        if (!isCancelled) {
          setMealTemplates(DEFAULT_MEAL_TEMPLATES);
          setMealSlots(DEFAULT_MEAL_SLOTS);
          setDailyTotals(DEFAULT_DAILY_TOTALS);
          setCheatUsedToday(false);
          setGoodEatingStreak(0);
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

  // Save meal templates
  useEffect(() => {
    if (!isLoaded || !userId) return;
    AsyncStorage.setItem(getUserScopedKey(BASE_STORAGE_KEY_MEAL_TEMPLATES, userId), JSON.stringify(mealTemplates))
      .catch(e => console.error('Error saving meal templates for user', userId, e));
  }, [mealTemplates, isLoaded, userId]);

  // Save meal slots
  useEffect(() => {
    if (!isLoaded || !userId) return;
    AsyncStorage.setItem(getUserScopedKey(BASE_STORAGE_KEY_MEAL_SLOTS, userId), JSON.stringify(mealSlots))
      .catch(e => console.error('Error saving meal slots for user', userId, e));
  }, [mealSlots, isLoaded, userId]);

  // Save daily totals
  useEffect(() => {
    if (!isLoaded || !userId) return;
    AsyncStorage.setItem(getUserScopedKey(BASE_STORAGE_KEY_DAILY_TOTALS, userId), JSON.stringify(dailyTotals))
      .catch(e => console.error('Error saving daily totals for user', userId, e));
  }, [dailyTotals, isLoaded, userId]);

  // Save cheat used today
  useEffect(() => {
    if (!isLoaded || !userId) return;
    AsyncStorage.setItem(getUserScopedKey(BASE_STORAGE_KEY_CHEAT_USED, userId), JSON.stringify(cheatUsedToday))
      .catch(e => console.error('Error saving cheat status for user', userId, e));
  }, [cheatUsedToday, isLoaded, userId]);

  // Save eating streak
  useEffect(() => {
    if (!isLoaded || !userId) return;
    AsyncStorage.setItem(getUserScopedKey(BASE_STORAGE_KEY_STREAK, userId), JSON.stringify(goodEatingStreak))
      .catch(e => console.error('Error saving eating streak for user', userId, e));
  }, [goodEatingStreak, isLoaded, userId]);

  const recalculateDailyTotals = () => {
    let totalCalories = 0;
    let totalProtein = 0;
    let hasCheat = false;
    const cheatMeals: MealTemplate[] = [];

    mealSlots.forEach((slot) => {
      if (slot.completed && slot.templateId) {
        const template = mealTemplates.find((t) => t.id === slot.templateId);
        if (template) {
          totalCalories += template.calories;
          totalProtein += template.protein;
          if (template.category === 'cheat') {
            hasCheat = true;
            cheatMeals.push(template);
          }
        }
      }
    });

    setDailyTotals(prev => {
      const prevCalories = prev.calories;
      const prevProtein = prev.protein;
      const calorieGoal = preferences.dailyCalorieGoal;
      const proteinGoal = preferences.dailyProteinGoal;

      const reachedCalorieGoal = prevCalories < calorieGoal && totalCalories >= calorieGoal;
      const reachedProteinGoal = prevProtein < proteinGoal && totalProtein >= proteinGoal;

      if (reachedCalorieGoal) {
        addHistoryEventForToday({
          type: 'calorieGoalReached',
          summary: `Reached calorie goal: ${totalCalories}/${calorieGoal}`,
          details: {
            previous: prevCalories,
            current: totalCalories,
            calorieGoal,
          },
        });
      }

      if (reachedProteinGoal) {
        addHistoryEventForToday({
          type: 'proteinGoalReached',
          summary: `Reached protein goal: ${totalProtein}/${proteinGoal} g`,
          details: {
            previous: prevProtein,
            current: totalProtein,
            proteinGoal,
          },
        });
      }

      return {
        calories: totalCalories,
        protein: totalProtein,
      };
    });
    if (!cheatUsedToday && hasCheat) {
      const firstCheat = cheatMeals[0];
      addHistoryEventForToday({
        type: 'cheatMealLogged',
        summary: 'Cheat meal logged',
        details: {
          description: firstCheat?.name,
          caloriesEstimate: firstCheat?.calories,
        },
      });
    }

    setCheatUsedToday(hasCheat);
  };

  const evaluateTodayForStreak = () => {
    const meetsCalorieGoal = dailyTotals.calories > 0 && dailyTotals.calories <= CALORIE_GOAL;
    const meetsProteinGoal = dailyTotals.protein >= PROTEIN_GOAL;
    const isGoodDay = meetsCalorieGoal && meetsProteinGoal && !cheatUsedToday;

    setGoodEatingStreak((prev) => (isGoodDay ? prev + 1 : 0));
  };

  return (
    <MealTrackingContext.Provider
      value={{
        mealTemplates,
        setMealTemplates,
        mealSlots,
        setMealSlots,
        dailyTotals,
        setDailyTotals,
        cheatUsedToday,
        setCheatUsedToday,
        goodEatingStreak,
        setGoodEatingStreak,
        recalculateDailyTotals,
        evaluateTodayForStreak,
      }}
    >
      {children}
    </MealTrackingContext.Provider>
  );
}

export function useMealTracking() {
  const context = useContext(MealTrackingContext);
  if (!context) {
    throw new Error('useMealTracking must be used within a MealTrackingProvider');
  }
  return context;
}
