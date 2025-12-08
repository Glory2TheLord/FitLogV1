import { getUserScopedKey } from '@/storage/userScopedKey';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { ProgramDayId } from './ProgramDaysContext';
import { useUser } from './UserContext';

const BASE_STORAGE_KEY_WORKOUTS = 'fitlog_workouts_v1';
const BASE_STORAGE_KEY_TEMPLATES = 'fitlog_workout_templates_v1';

export type WorkoutType = 'cardio' | 'strength' | 'accessory' | 'other';

export type WorkoutTemplate = {
  id: string;
  name: string;
  type: WorkoutType;
  defaultMinutes?: number;
  defaultSets?: number;
  defaultReps?: number;
  defaultWeight?: number;
  programDayIds: ProgramDayId[];
};

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
  addWorkout: (entry: Omit<WorkoutEntry, 'id' | 'createdAt' | 'isCompleted'>) => void;
  updateWorkout: (
    dateKey: string,
    workoutId: string,
    updates: Partial<Pick<WorkoutEntry, 'name' | 'type' | 'minutes' | 'sets' | 'reps' | 'weight' | 'notes'>>
  ) => void;
  deleteWorkout: (dateKey: string, workoutId: string) => void;
  toggleWorkoutCompleted: (dateKey: string, workoutId: string) => void;
  addWorkoutTemplate: (template: Omit<WorkoutTemplate, 'id'>) => void;
  updateWorkoutTemplate: (templateId: string, updates: Partial<Omit<WorkoutTemplate, 'id'>>) => void;
  deleteWorkoutTemplate: (templateId: string) => void;
  getWorkoutsForDate: (dateKey: string) => WorkoutEntry[];
  hasCompletedWorkoutsForDate: (dateKey: string) => boolean;
  hasWorkoutsForDate: (dateKey: string) => boolean;
  getTemplatesForProgramDay: (dayId: ProgramDayId) => WorkoutTemplate[];
};

const WorkoutsContext = createContext<WorkoutsContextValue | undefined>(undefined);

export function WorkoutsProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useUser();
  const userId = currentUser?.id ?? null;
  
  const [workoutsByDate, setWorkoutsByDate] = useState<WorkoutsByDate>({});
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
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
        
        const [workoutsStored, templatesStored] = await Promise.all([
          AsyncStorage.getItem(workoutsKey),
          AsyncStorage.getItem(templatesKey),
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
          }));
          setWorkoutTemplates(migratedTemplates);
        } else {
          setWorkoutTemplates([]);
        }
      } catch (error) {
        console.error('Error loading workout data for user', userId, error);
        if (!isCancelled) {
          setWorkoutsByDate({});
          setWorkoutTemplates([]);
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
    updates: Partial<Pick<WorkoutEntry, 'name' | 'type' | 'minutes' | 'sets' | 'reps' | 'weight' | 'notes'>>
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
      return {
        ...prev,
        [dateKey]: dateWorkouts.map(w =>
          w.id === workoutId ? { ...w, isCompleted: !w.isCompleted } : w
        ),
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

  return (
    <WorkoutsContext.Provider
      value={{
        workoutsByDate,
        workoutTemplates,
        addWorkout,
        updateWorkout,
        deleteWorkout,
        toggleWorkoutCompleted,
        addWorkoutTemplate,
        updateWorkoutTemplate,
        deleteWorkoutTemplate,
        getWorkoutsForDate,
        hasCompletedWorkoutsForDate,
        hasWorkoutsForDate,
        getTemplatesForProgramDay,
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
