import { getUserScopedKey } from '@/storage/userScopedKey';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useDayMetrics } from './DayMetricsContext';
import { ProgramDayId } from './ProgramDaysContext';
import { useUser } from './UserContext';

const BASE_STORAGE_KEY_WORKOUTS = 'fitlog_workouts_v1';
const BASE_STORAGE_KEY_TEMPLATES = 'fitlog_workout_templates_v1';
const BASE_STORAGE_KEY_CUSTOM = 'fitlog_custom_workouts_v1';

export type WorkoutType = 'cardio' | 'strength' | 'accessory' | 'other';

export type WorkoutTemplate = {
  id: string;
  name: string;
  type: WorkoutType;
  description?: string;
  steps?: number;
  defaultMinutes?: number;
  defaultSets?: number;
  defaultReps?: number;
  defaultWeight?: number;
  defaultSteps?: number;
  programDayIds: ProgramDayId[];
};

export type CustomWorkout = WorkoutTemplate;

export type WorkoutEntry = {
  id: string;
  dateKey: string;      // "YYYY-MM-DD" e.g. "2025-12-05"
  programDayId: ProgramDayId;
  programDayIndex: number;
  focusLabel: string;   // e.g. "Chest & Tris", "Shoulders", etc.
  name: string;
  type: WorkoutType;
  minutes?: number;
  sets?: number;
  reps?: number;
  weight?: number;
  steps?: number;
  notes?: string;
  isCompleted: boolean;
  createdAt: string;
};

export type WorkoutsByDate = {
  [dateKey: string]: WorkoutEntry[];
};

type WorkoutsContextValue = {
  workoutsByDate: WorkoutsByDate;
  workoutTemplates: WorkoutTemplate[];
  customWorkouts: CustomWorkout[];
  addWorkout: (entry: Omit<WorkoutEntry, 'id' | 'createdAt' | 'isCompleted'>) => void;
  updateWorkout: (
    dateKey: string,
    workoutId: string,
    updates: Partial<Pick<WorkoutEntry, 'name' | 'type' | 'minutes' | 'sets' | 'reps' | 'weight' | 'notes' | 'steps'>>
  ) => void;
  deleteWorkout: (dateKey: string, workoutId: string) => void;
  toggleWorkoutCompleted: (dateKey: string, workoutId: string) => void;
  addWorkoutTemplate: (template: Omit<WorkoutTemplate, 'id'>) => void;
  updateWorkoutTemplate: (templateId: string, updates: Partial<Omit<WorkoutTemplate, 'id'>>) => void;
  deleteWorkoutTemplate: (templateId: string) => void;
  addCustomWorkout: (workout: Omit<CustomWorkout, 'id'>) => CustomWorkout;
  updateCustomWorkout: (id: string, updates: Partial<CustomWorkout>) => void;
  deleteCustomWorkout: (id: string) => void;
  getCustomWorkouts: () => CustomWorkout[];
  getWorkoutsForDate: (dateKey: string) => WorkoutEntry[];
  hasCompletedWorkoutsForDate: (dateKey: string) => boolean;
  hasWorkoutsForDate: (dateKey: string) => boolean;
  getTemplatesForProgramDay: (dayId: ProgramDayId) => WorkoutTemplate[];
  clearWorkoutsForDate: (dateKey: string) => void;
};

const WorkoutsContext = createContext<WorkoutsContextValue | undefined>(undefined);

export function WorkoutsProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useUser();
  const userId = currentUser?.id ?? null;
  const { addHistoryEventForToday, addSteps, stepsToday } = useDayMetrics();
  
  const [workoutsByDate, setWorkoutsByDate] = useState<WorkoutsByDate>({});
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
  const [customWorkouts, setCustomWorkouts] = useState<CustomWorkout[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from AsyncStorage when user changes
  useEffect(() => {
    if (!userId) {
      // No user selected - reset to empty state
      setWorkoutsByDate({});
      setWorkoutTemplates([]);
      setIsLoaded(true);
      return;
    }

    let isCancelled = false;

    const loadData = async () => {
      try {
        const workoutsKey = getUserScopedKey(BASE_STORAGE_KEY_WORKOUTS, userId);
        const templatesKey = getUserScopedKey(BASE_STORAGE_KEY_TEMPLATES, userId);
        
        const [workoutsStored, templatesStored, customStored] = await Promise.all([
          AsyncStorage.getItem(workoutsKey),
          AsyncStorage.getItem(templatesKey),
          AsyncStorage.getItem(getUserScopedKey(BASE_STORAGE_KEY_CUSTOM, userId)),
        ]);

        if (isCancelled) return;

        if (workoutsStored) {
          setWorkoutsByDate(JSON.parse(workoutsStored));
        } else {
          setWorkoutsByDate({});
        }

        if (templatesStored) {
          const parsed = JSON.parse(templatesStored);
          // Ensure all templates have programDayIds array (migration for old data)
          const migratedTemplates = parsed.map((t: WorkoutTemplate) => ({
            ...t,
            programDayIds: t.programDayIds || [],
            defaultSteps: t.defaultSteps ?? 0,
          }));
          setWorkoutTemplates(migratedTemplates);
        } else {
          setWorkoutTemplates([]);
        }

        if (customStored) {
          const parsedCustom = JSON.parse(customStored) as CustomWorkout[];
          const migratedCustom = parsedCustom.map(c => ({
            ...c,
            programDayIds: c.programDayIds || [],
            defaultSteps: c.defaultSteps ?? c.steps ?? 0,
          }));
          setCustomWorkouts(migratedCustom);
        } else {
          setCustomWorkouts([]);
        }
      } catch (error) {
        console.error('Error loading workout data for user', userId, error);
        if (!isCancelled) {
          setWorkoutsByDate({});
          setWorkoutTemplates([]);
          setCustomWorkouts([]);
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

  // Save workouts to AsyncStorage
  useEffect(() => {
    if (!isLoaded || !userId) return;
    
    const saveWorkouts = async () => {
      try {
        const key = getUserScopedKey(BASE_STORAGE_KEY_WORKOUTS, userId);
        await AsyncStorage.setItem(key, JSON.stringify(workoutsByDate));
      } catch (error) {
        console.error('Error saving workouts for user', userId, error);
      }
    };
    saveWorkouts();
  }, [workoutsByDate, isLoaded, userId]);

  // Save templates to AsyncStorage
  useEffect(() => {
    if (!isLoaded || !userId) return;
    
    const saveTemplates = async () => {
      try {
        const key = getUserScopedKey(BASE_STORAGE_KEY_TEMPLATES, userId);
        await AsyncStorage.setItem(key, JSON.stringify(workoutTemplates));
      } catch (error) {
        console.error('Error saving templates for user', userId, error);
      }
    };
    saveTemplates();
  }, [workoutTemplates, isLoaded, userId]);

  // Save custom workouts to AsyncStorage
  useEffect(() => {
    if (!isLoaded || !userId) return;
    const saveCustom = async () => {
      try {
        const key = getUserScopedKey(BASE_STORAGE_KEY_CUSTOM, userId);
        await AsyncStorage.setItem(key, JSON.stringify(customWorkouts));
      } catch (error) {
        console.error('Error saving custom workouts for user', userId, error);
      }
    };
    saveCustom();
  }, [customWorkouts, isLoaded, userId]);

  const addWorkout = (entry: Omit<WorkoutEntry, 'id' | 'createdAt' | 'isCompleted'>) => {
    const newWorkout: WorkoutEntry = {
      ...entry,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };

    setWorkoutsByDate(prev => {
      const dateWorkouts = prev[entry.dateKey] || [];
      return {
        ...prev,
        [entry.dateKey]: [...dateWorkouts, newWorkout],
      };
    });
  };

  const updateWorkout = (
    dateKey: string,
    workoutId: string,
    updates: Partial<Pick<WorkoutEntry, 'name' | 'type' | 'minutes' | 'sets' | 'reps' | 'weight' | 'notes' | 'steps'>>
  ) => {
    setWorkoutsByDate(prev => {
      const existing = prev[dateKey];
      if (!existing) return prev;

      const updatedForDate = existing.map(w =>
        w.id === workoutId ? { ...w, ...updates } : w
      );

      return {
        ...prev,
        [dateKey]: updatedForDate,
      };
    });
  };

  const deleteWorkout = (dateKey: string, workoutId: string) => {
    setWorkoutsByDate(prev => {
      const dateWorkouts = prev[dateKey] || [];
      const filtered = dateWorkouts.filter(w => w.id !== workoutId);
      
      if (filtered.length === 0) {
        const newState = { ...prev };
        delete newState[dateKey];
        return newState;
      }
      
      return {
        ...prev,
        [dateKey]: filtered,
      };
    });
  };

  const toggleWorkoutCompleted = (dateKey: string, workoutId: string) => {
    setWorkoutsByDate(prev => {
      const dateWorkouts = prev[dateKey] || [];
      const target = dateWorkouts.find(w => w.id === workoutId);
      const wasCompleted = target?.isCompleted ?? false;
      const updatedForDate = dateWorkouts.map(w =>
        w.id === workoutId ? { ...w, isCompleted: !w.isCompleted } : w
      );
      const updatedCompletedCount = updatedForDate.filter(w => w.isCompleted).length;

      if (!wasCompleted) {
        addHistoryEventForToday({
          type: 'workoutLogged',
            summary: target
            ? `${target.name} — ${target.type === 'cardio' ? `${target.minutes ?? 0} min cardio` : `${target.sets ?? 0} sets`}`
            : `Completed workout (${updatedCompletedCount} total today)`,
          details: {
            workoutsCompleted: updatedCompletedCount,
            workoutId: target?.id,
            workoutName: target?.name,
            focus: target?.focusLabel,
            sets: target?.sets,
            repsPerSet: target?.reps ? [target.reps] : undefined,
            weightPerSetLbs: target?.weight ? [target.weight] : undefined,
            isCardio: target?.type === 'cardio',
            durationMinutes: target?.minutes,
            stepsAddedFromWorkout: target?.steps,
            stepsTotalAfter: stepsToday + (target?.steps ?? 0),
          },
        });
        const workoutSteps = target?.steps ?? 0;
        if (workoutSteps > 0) {
          addSteps(workoutSteps);
          addHistoryEventForToday({
            type: 'stepsLogged',
            summary: `Logged ${workoutSteps} steps (total ${stepsToday + workoutSteps})`,
            details: {
              previous: stepsToday,
              current: stepsToday + workoutSteps,
              delta: workoutSteps,
              stepGoal: undefined,
              source: 'cardio',
            },
          });
        }
      }

      return {
        ...prev,
        [dateKey]: updatedForDate,
      };
    });
  };

  const addWorkoutTemplate = (template: Omit<WorkoutTemplate, 'id'>) => {
    const newTemplate: WorkoutTemplate = {
      ...template,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    setWorkoutTemplates(prev => [...prev, newTemplate]);
  };

  const updateWorkoutTemplate = (
    templateId: string,
    updates: Partial<Omit<WorkoutTemplate, 'id'>>
  ) => {
    setWorkoutTemplates(prev =>
      prev.map(t => (t.id === templateId ? { ...t, ...updates } : t))
    );
  };

  const deleteWorkoutTemplate = (templateId: string) => {
    setWorkoutTemplates(prev => prev.filter(t => t.id !== templateId));
  };

  const addCustomWorkout = (workout: Omit<CustomWorkout, 'id'>): CustomWorkout => {
    const created: CustomWorkout = {
      ...workout,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    setCustomWorkouts(prev => [...prev, created]);
    return created;
  };

  const updateCustomWorkout = (id: string, updates: Partial<CustomWorkout>) => {
    setCustomWorkouts(prev =>
      prev.map(c => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const deleteCustomWorkout = (id: string) => {
    setCustomWorkouts(prev => prev.filter(c => c.id !== id));
  };

  const getCustomWorkouts = () => customWorkouts;

  const getWorkoutsForDate = (dateKey: string): WorkoutEntry[] => {
    return workoutsByDate[dateKey] || [];
  };

  const hasCompletedWorkoutsForDate = (dateKey: string): boolean => {
    const workouts = workoutsByDate[dateKey] ?? [];
    // Return true only if there are workouts AND all are completed
    if (workouts.length === 0) return false;
    return workouts.every(w => w.isCompleted);
  };

  const hasWorkoutsForDate = (dateKey: string): boolean => {
    const workouts = workoutsByDate[dateKey] ?? [];
    return workouts.length > 0;
  };

  const getTemplatesForProgramDay = (dayId: ProgramDayId): WorkoutTemplate[] => {
    return workoutTemplates.filter(t => (t.programDayIds || []).includes(dayId));
  };

  const clearWorkoutsForDate = (dateKey: string) => {
    setWorkoutsByDate(prev => {
      const newState = { ...prev };
      delete newState[dateKey];
      return newState;
    });
  };

  return (
    <WorkoutsContext.Provider
      value={{
        workoutsByDate,
        workoutTemplates,
        customWorkouts,
        addWorkout,
        updateWorkout,
        deleteWorkout,
        toggleWorkoutCompleted,
        addWorkoutTemplate,
        updateWorkoutTemplate,
        deleteWorkoutTemplate,
        addCustomWorkout,
        updateCustomWorkout,
        deleteCustomWorkout,
        getCustomWorkouts,
        getWorkoutsForDate,
        hasCompletedWorkoutsForDate,
        hasWorkoutsForDate,
        getTemplatesForProgramDay,
        clearWorkoutsForDate,
      }}
    >
      {children}
    </WorkoutsContext.Provider>
  );
}

export function useWorkouts() {
  const context = useContext(WorkoutsContext);
  if (!context) {
    throw new Error('useWorkouts must be used within WorkoutsProvider');
  }
  return context;
}
