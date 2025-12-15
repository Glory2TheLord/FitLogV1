import FitLogHeader from '@/components/FitLogHeader';
import { useMealTracking } from '@/contexts/MealTrackingContext';
import { useProgramDays } from '@/contexts/ProgramDaysContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { DayHistoryEntry, useDayMetrics } from '@/contexts/DayMetricsContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useWorkouts } from '@/contexts/WorkoutsContext';
import { usePhotoDays } from '@/contexts/PhotoDayContext';
import {
    Feather,
    FontAwesome5,
    MaterialCommunityIcons
} from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pedometer } from 'expo-sensors';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Brand orange
const ACCENT = '#f97316';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, activeProfile, recordWeighIn, isWeighInRequiredOn } = useUserProfile();
  const {
    stepsToday,
    setStepsToday,
    addSteps,
    waterLiters,
    setWaterLiters,
    addWater,
    history,
    upsertHistoryEntry,
    addHistoryEventForToday,
    evaluateTodayGoals,
    todayBloodPressure,
    setTodayBloodPressure,
  } = useDayMetrics();
  
  // Get meal tracking context
  const {
    dailyTotals,
    goodEatingStreak,
    evaluateTodayForStreak,
    setCheatUsedToday,
    setDailyTotals,
    mealSlots,
    cheatUsedToday,
    resetTodayMealCompletion,
    mealTemplates,
    resetCheatCycle,
  } = useMealTracking();
  const { preferences } = usePreferences();
  const { photoDays, isProgressPhotosRequiredOn } = usePhotoDays();
  
  // Get workouts context
  const {
    getWorkoutsForDate,
    resetTodayWorkoutCompletion,
  } = useWorkouts();
  
  const today = new Date();
  const datePart = today
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    .toUpperCase(); // e.g. "DEC 4, 2025"

  // Tomorrow's date (for weigh-in reminder)
  const tomorrowDate = new Date(today);
  tomorrowDate.setDate(today.getDate() + 1);
  const isTomorrowSunday = tomorrowDate.getDay() === 0; // 0 = Sunday
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayDateKey = `${year}-${month}-${day}`;

  // ===== STEP TRACKER STATE =====
  const [isPedometerAvailable, setIsPedometerAvailable] = useState<
    boolean | null
  >(null);
  // stepsToday now comes from context
  const [stepError, setStepError] = useState<string | null>(null);

  // ===== WATER TRACKER STATE (manual for now) =====
  // waterLiters now comes from context

  // ===== DERIVED VALUES FROM MEAL TRACKING & GOALS =====
  // dailyTotals comes from context
  const hasMetStepGoal = stepsToday >= preferences.dailyStepGoal;
  // Calculate days to cheat meal using preference interval and eating streak
  const daysToCheatMeal = Math.max(0, preferences.cheatMealIntervalDays - goodEatingStreak);
  const hasCompletedCheatMealToday = mealSlots.some(slot => {
    if (!slot.completed || !slot.templateId) return false;
    const template = mealTemplates.find(t => t.id === slot.templateId);
    return template?.category === 'cheat';
  });

  // Weigh-in requirement/completion
  const hasWeighedInToday = (profile.weighIns || []).some(w => w.date.slice(0, 10) === todayDateKey);
  const lastWeighInDate = (() => {
    const weighIns = profile.weighIns || [];
    if (weighIns.length === 0) return null;
    const sorted = [...weighIns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted[0].date;
  })();
  const isWeighInRequiredToday = isWeighInRequiredOn(today, preferences.daysUntilWeighInInterval);
  const isWeighInRequiredTomorrow = isWeighInRequiredOn(tomorrowDate, preferences.daysUntilWeighInInterval);

  // Photos requirement/completion
  const todayPhotoDay = photoDays.find(day => day.dateKey === todayDateKey);
  const photosRequiredPerDay = 4; // front, side, back, flex
  const hasCompletedPhotosToday = !!(todayPhotoDay && todayPhotoDay.positions.filter(p => p.imageUri).length >= photosRequiredPerDay);
  const lastPhotoDate = (() => {
    if (photoDays.length === 0) return null;
    const sorted = [...photoDays].sort((a, b) => new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime());
    return sorted[0].dateKey;
  })();
  const isProgressPhotosRequiredToday = isProgressPhotosRequiredOn(today, preferences.daysUntilProgressPhotosInterval);
  const isProgressPhotosRequiredTomorrow = isProgressPhotosRequiredOn(tomorrowDate, preferences.daysUntilProgressPhotosInterval);

  // ===== STATUS COMPLETE STATES FOR MARK DAY ICONS =====
  // Steps complete: meets goal
  const stepsComplete = hasMetStepGoal;

  // Meals complete: meets calorie/protein goals, all selected slots completed, no cheat
  const mealsComplete = (() => {
    const meetsCalories = dailyTotals.calories >= preferences.dailyCalorieGoal;
    const meetsProtein = dailyTotals.protein >= preferences.dailyProteinGoal;
    const allSelectedSlotsCompleted = mealSlots.every(slot => slot.completed === true);
    return meetsCalories && meetsProtein && allSelectedSlotsCompleted && !cheatUsedToday;
  })();

  // ===== WEEK SUMMARY (placeholders for now) =====
  const [workoutsThisWeek] = useState<number>(3);
  const [stepsThisWeek] = useState<number>(24300);
  const [avgWaterThisWeek] = useState<number>(2.1); // liters

  // ===== DAY HISTORY & GOAL ESTIMATION =====
  const [estimatedDaysToGoal, setEstimatedDaysToGoal] = useState<number | null>(null);

  // ===== WORKOUT STREAK - Calculate from consecutive days with workouts completed =====
  const calculateWorkoutStreak = () => {
    try {
      if (!history || history.length === 0) return 0;

      let streak = 0;
      const sorted = [...history].sort((a, b) => b.id.localeCompare(a.id));
      for (const entry of sorted) {
        if (entry.workoutsCompleted > 0) {
          streak++;
        } else {
          break;
        }
      }
      return streak;
    } catch (error) {
      console.error('Error calculating workout streak:', error);
      return 0;
    }
  };
  
  const streakDays = calculateWorkoutStreak() || 0;

  // ===== WEIGHT TRACKING STATE =====
  const startingWeight = profile.startingWeight ?? 180;
  const currentWeight = profile.currentWeight ?? 165;
  const goalWeight = profile.goalWeight ?? 155;

  // Computed weight values
  // Show 0 for lost weight until user has completed at least one day
  const poundsLost = history.length > 0 ? startingWeight - currentWeight : 0;
  const poundsToGo = currentWeight - goalWeight;

  // Derive estimated weeks to goal from days
  const estimatedWeeksToGoal = estimatedDaysToGoal !== null
    ? Math.ceil(estimatedDaysToGoal / 7)
    : null;

  // ===== TODAY'S FOCUS CYCLE (5-DAY PROGRAM) =====
  const { getProgramDayForDate } = useProgramDays();
  const { programDay: todayProgramDay, dayIndex: todayDayIndex } = getProgramDayForDate(today);
  const { programDay: tomorrowProgramDay, dayIndex: tomorrowDayIndex } = getProgramDayForDate(tomorrowDate);
  const todayFocus = { name: todayProgramDay?.name || `Day ${todayDayIndex}` };
  const tomorrowFocus = { name: tomorrowProgramDay?.name || `Day ${tomorrowDayIndex}` };
  const programStartDate = new Date(2025, 11, 3);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSinceStart = Math.floor(
    (today.getTime() - programStartDate.getTime()) / msPerDay
  );

  const todaysWorkouts = getWorkoutsForDate(todayDateKey);
  const atLeastOneWorkoutCompleted = todaysWorkouts.some(w => w.isCompleted);
  const completedWorkouts = todaysWorkouts.filter(w => w.isCompleted).length;
  const mealsCompletedCount = mealSlots.filter(slot => slot.completed).length;
  const mealsPlannedCount = mealSlots.filter(slot => slot.templateId !== null).length;
  const photosTaken = todayPhotoDay ? todayPhotoDay.positions.filter(p => p.imageUri).length : 0;
  const photosRequired = todayPhotoDay ? todayPhotoDay.positions.length : 5;
  const isCheatMealDay = daysToCheatMeal === 0;

  useEffect(() => {
    let subscription: any;

    const startStepTracking = async () => {
      try {
        setStepError(null);

        const available = await Pedometer.isAvailableAsync();
        setIsPedometerAvailable(available);

        if (!available) {
          setStepError('Step tracking not available on this device/emulator.');
          return;
        }

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        try {
          const result = await Pedometer.getStepCountAsync(
            startOfDay,
            new Date()
          );
          if (result && typeof result.steps === 'number') {
            setStepsToday(result.steps);
          }
        } catch (stepError) {
          console.log('getStepCountAsync failed:', stepError);
          // Continue to watchStepCount even if getStepCountAsync fails
        }

        subscription = Pedometer.watchStepCount(result => {
          setStepsToday(current => current + result.steps);
        });
      } catch (err) {
        console.error('Error with pedometer:', err);
        setStepError('Error reading steps.');
      }
    };

    startStepTracking();

    return () => {
      if (subscription && subscription.remove) {
        subscription.remove();
      }
    };
  }, []);

  const formattedSteps = stepsToday.toLocaleString('en-US', {
    useGrouping: false,
  });

  const formattedWater = `${waterLiters.toFixed(1)}L`;
  const weeksToGoalFromWeighIns = profile.weeksUntilGoal ?? null;
  const formattedWeeksToGoal = (() => {
    if (weeksToGoalFromWeighIns === null || weeksToGoalFromWeighIns === undefined) return '--';
    if (weeksToGoalFromWeighIns <= 0) return '0 wks';
    const rounded = Math.round(weeksToGoalFromWeighIns);
    return `${rounded} wks`;
  })();

  const formattedStepsWeek = stepsThisWeek.toLocaleString('en-US');

  const bloodPressureDisplay = todayBloodPressure
    ? `${todayBloodPressure.systolic} / ${todayBloodPressure.diastolic}`
    : '-- / --';

  // Dev-only reset handler
  // ===== GOAL ESTIMATION HELPER =====
  const recalculateEstimatedDaysToGoal = (entries: DayHistoryEntry[]) => {
    if (!goalWeight || !currentWeight) {
      setEstimatedDaysToGoal(null);
      return;
    }

    const poundsToLose = Math.max(0, currentWeight - goalWeight);
    if (poundsToLose === 0) {
      setEstimatedDaysToGoal(0);
      return;
    }

    // Use maintenance calories from user profile (default to 2000 if not set)
    const MAINTENANCE_CALORIES = profile.maintenanceCalories ?? 2000;

    // Use the last 14 days to estimate average daily deficit
    const recentDays = entries.slice(0, 14);
    if (recentDays.length === 0) {
      setEstimatedDaysToGoal(null);
      return;
    }

    let totalDeficit = 0;
    recentDays.forEach(day => {
      const deficit = MAINTENANCE_CALORIES - day.calories;
      if (deficit > 0) {
        totalDeficit += deficit;
      }
    });

    const avgDailyDeficit = totalDeficit / recentDays.length;
    if (avgDailyDeficit <= 0) {
      setEstimatedDaysToGoal(null);
      return;
    }

    // 3500 kcal ≈ 1 lb of fat
    const totalDeficitNeeded = poundsToLose * 3500;
    const estimatedDays = Math.ceil(totalDeficitNeeded / avgDailyDeficit);

    setEstimatedDaysToGoal(estimatedDays);
    
    // TODO: Future enhancements:
    // - Adjust maintenance calories based on activity level
    // - Factor in high step counts / workouts as increasing effective deficit
    // - Use actual weight trend from weigh-ins rather than only calories
  };

  useEffect(() => {
    recalculateEstimatedDaysToGoal(history);
  }, [history]);

  // ===== LOG DAY AND RECALCULATE GOAL =====
  type GoalEvaluation = ReturnType<typeof evaluateTodayGoals>;

  const buildHistoryEntryForToday = (goalEvaluation: GoalEvaluation): DayHistoryEntry => {
    const todaysWeighIn = (profile.weighIns || []).find(w => w.date.slice(0, 10) === todayDateKey);

    const existing = history.find(h => h.id === todayDateKey);

    return {
      id: todayDateKey,
      dateISO: new Date().toISOString(),
      isDayComplete: true,
      allGoalsReached: goalEvaluation.allGoalsReached,
      missedGoals: goalEvaluation.missedGoals,
      steps: stepsToday,
      stepGoal: preferences.dailyStepGoal,
        water: waterLiters,
        waterGoal: preferences.dailyWaterGoal,
      calories: dailyTotals.calories,
      calorieGoal: preferences.dailyCalorieGoal,
      protein: dailyTotals.protein,
      proteinGoal: preferences.dailyProteinGoal,
      carbs: dailyTotals.carbs,
      fats: dailyTotals.fats,
      bloodPressure: todayBloodPressure ?? undefined,
      workoutsCompleted: completedWorkouts,
      mealsCompleted: mealsCompletedCount,
      mealsPlanned: mealsPlannedCount,
      didWeighIn: hasWeighedInToday,
      weightLbs: hasWeighedInToday ? todaysWeighIn?.weightLbs : undefined,
      didPhotos: hasCompletedPhotosToday,
      photosTaken,
      photosRequired,
      cheatInfo: {
        isCheatDay: cheatUsedToday,
        daysUntilCheat: daysToCheatMeal,
        cycleDay: Math.max(0, preferences.cheatMealIntervalDays - daysToCheatMeal),
      },
      weeksUntilGoalAtThatTime: profile.weeksUntilGoal ?? null,
      events: existing?.events ?? [],
    };
  };

  // ===== RESET DAILY STATE =====
  const resetDailyState = () => {
    // Reset per-day trackers
    setStepsToday(0);
    setWaterLiters(0.0);
    setDailyTotals({ calories: 0, protein: 0, carbs: 0, fats: 0 });
    setCheatUsedToday(false);
    setTodayBloodPressure(null);
  };

  const completeDay = (goalEvaluation: GoalEvaluation) => {
    // 1. Update streak / days-to-cheat logic
    if (hasCompletedCheatMealToday) {
      resetCheatCycle();
    } else {
      evaluateTodayForStreak();
    }

    // 2. Log today and recalculate days/weeks to goal
    const entry = buildHistoryEntryForToday(goalEvaluation);
    const updatedHistory = [...history.filter(h => h.id !== entry.id), entry].sort((a, b) => b.id.localeCompare(a.id));
    upsertHistoryEntry(entry);
    recalculateEstimatedDaysToGoal(updatedHistory);
    addHistoryEventForToday({
      type: 'markDayComplete',
      summary: goalEvaluation.allGoalsReached ? 'Marked day complete' : 'Marked day complete (goals missed)',
        details: {
          steps: stepsToday,
          calories: dailyTotals.calories,
          protein: dailyTotals.protein,
          carbs: dailyTotals.carbs,
          fats: dailyTotals.fats,
          water: waterLiters,
          workoutsCompleted: entry.workoutsCompleted,
          mealsCompleted: entry.mealsCompleted,
        mealsPlanned: entry.mealsPlanned,
        allGoalsReached: goalEvaluation.allGoalsReached,
        missedGoals: goalEvaluation.missedGoals,
      },
    });

    // Clear per-day completion flags (keep selections/workouts)
    resetTodayMealCompletion();
    resetTodayWorkoutCompletion(todayDateKey);

    // 3. Reset all daily state for tomorrow
    resetDailyState();
  };

  // ===== MARK DAY COMPLETE HANDLER =====
  const handleMarkDayComplete = () => {
    const goalEvaluation = evaluateTodayGoals({
      stepsToday,
      stepGoal: preferences.dailyStepGoal,
      calories: dailyTotals.calories,
      calorieGoal: preferences.dailyCalorieGoal,
      protein: dailyTotals.protein,
      proteinGoal: preferences.dailyProteinGoal,
      water: waterLiters,
      waterGoal: preferences.dailyWaterGoal,
      workoutsCompleted: completedWorkouts,
      mealsCompleted: mealsCompletedCount,
      mealsPlanned: mealsPlannedCount,
      weighInRequired: isWeighInRequiredToday,
      hasWeighedInToday,
      photosRequired: isProgressPhotosRequiredToday,
      hasCompletedPhotosToday,
      isCheatMealDay,
      hasCompletedCheatMeal: hasCompletedCheatMealToday,
    });

    const missedList = goalEvaluation.missedGoals.join(', ') || 'some goals';

    if (goalEvaluation.allGoalsReached) {
      Alert.alert(
        'Mark today as complete?',
        'All goals reached. Mark today as complete?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Mark complete', onPress: () => completeDay(goalEvaluation) },
        ]
      );
      return;
    }

    Alert.alert(
      'Goals missed',
      `You didn't reach: ${missedList}. Mark day complete anyway?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark anyway', onPress: () => completeDay(goalEvaluation) },
      ]
    );
  };

  // Handler for settings navigation
  const handleSettingsPress = () => {
    console.log('Settings button pressed - attempting navigation');
    try {
      router.push('/settings');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Navigation Error', 'Could not open settings');
    }
  };

  // Quick add state
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [stepsDialogVisible, setStepsDialogVisible] = useState(false);
  const [waterDialogVisible, setWaterDialogVisible] = useState(false);
  const [bloodPressureDialogVisible, setBloodPressureDialogVisible] = useState(false);
  const [stepInput, setStepInput] = useState('');
  const [waterInput, setWaterInput] = useState('');
  const [systolicInput, setSystolicInput] = useState('');
  const [diastolicInput, setDiastolicInput] = useState('');
  const [weighDialogVisible, setWeighDialogVisible] = useState(false);
  const [weighInput, setWeighInput] = useState('');
  const [noteDialogVisible, setNoteDialogVisible] = useState(false);
  const [noteInput, setNoteInput] = useState('');

  useEffect(() => {
    if (bloodPressureDialogVisible) {
      setSystolicInput(todayBloodPressure ? String(todayBloodPressure.systolic) : '');
      setDiastolicInput(todayBloodPressure ? String(todayBloodPressure.diastolic) : '');
    }
  }, [bloodPressureDialogVisible, todayBloodPressure]);

  const closeAllDialogs = () => {
    setQuickAddVisible(false);
    setStepsDialogVisible(false);
    setWaterDialogVisible(false);
    setBloodPressureDialogVisible(false);
    setWeighDialogVisible(false);
    setStepInput('');
    setWaterInput('');
    setSystolicInput('');
    setDiastolicInput('');
    setWeighInput('');
    setNoteDialogVisible(false);
    setNoteInput('');
  };

  const handleWeighInConfirm = () => {
    const amount = Number(weighInput);
    if (Number.isFinite(amount) && amount > 0) {
      recordWeighIn(amount);
    }
    closeAllDialogs();
  };

  const handleAddStepsConfirm = () => {
    const amount = Number(stepInput);
    if (Number.isFinite(amount) && amount > 0) {
      const prevSteps = stepsToday;
      const nextSteps = prevSteps + amount;
      const stepGoal = preferences.dailyStepGoal;
      addSteps(amount);
      addHistoryEventForToday({
        type: 'stepsLogged',
        summary: `Logged ${amount} steps (total ${nextSteps}/${stepGoal})`,
        details: {
          previous: prevSteps,
          current: nextSteps,
          stepGoal,
          delta: amount,
          source: 'manual',
        },
      });
      if (prevSteps < stepGoal && nextSteps >= stepGoal) {
        addHistoryEventForToday({
          type: 'stepGoalReached',
          summary: `Reached step goal: ${nextSteps}/${stepGoal}`,
          details: {
            previous: prevSteps,
            current: nextSteps,
            stepGoal,
          },
        });
      }
    }
    closeAllDialogs();
  };

  const handleAddWaterConfirm = () => {
    const amount = Number(waterInput);
    if (Number.isFinite(amount) && amount > 0) {
      const prevWater = waterLiters;
      const nextWater = prevWater + amount;
      const waterGoal = preferences.dailyWaterGoal;
      addWater(amount);
      addHistoryEventForToday({
        type: 'waterLogged',
        summary: `Added ${amount} L water (total ${nextWater}/${waterGoal} L)`,
        details: {
          previous: prevWater,
          current: nextWater,
          delta: amount,
          waterGoal,
        },
      });
    }
    closeAllDialogs();
  };

  const handleAddBloodPressureConfirm = () => {
    const systolic = Number(systolicInput);
    const diastolic = Number(diastolicInput);
    if (!Number.isFinite(systolic) || !Number.isFinite(diastolic) || systolic <= 0 || diastolic <= 0) {
      Alert.alert('Invalid values', 'Please enter valid numbers for both systolic and diastolic.');
      return;
    }

    const timestamp = new Date().toISOString();
    setTodayBloodPressure({ systolic, diastolic, timestamp });
    closeAllDialogs();
  };

  const handleAddNoteConfirm = () => {
    const text = noteInput.trim();
    if (text) {
      addHistoryEventForToday({
        type: 'dayNoteAdded',
        summary: 'Note added',
        details: { note: text },
      });
    }
    closeAllDialogs();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FitLogHeader
        onSettingsPress={handleSettingsPress}
      />
      
      <ScrollView
        style={styles.screenContent}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageTitleRow}>
          <Text style={styles.pageTitle}>Home</Text>
          <Text style={styles.welcomeText}>
            <Text style={styles.welcomeText}>Welcome back, </Text>
            {activeProfile?.name ? (
              <Text style={styles.welcomeName}>{activeProfile.name}</Text>
            ) : null}
            <Text style={styles.welcomeText}>!</Text>
          </Text>
        </View>
        
        <View style={styles.homeCardsContainer}>
            {/* ====== TODAY CARD: TODAY + DATE + PILL TRACKERS ====== */}
            <View style={styles.heroCard}>
              <View style={styles.heroDateRow}>
                <Text style={styles.heroDateLeft}>TODAY</Text>
                <Text style={styles.heroDateRight}>{datePart}</Text>
              </View>

              <View style={styles.trackersRow}>
                {/* Steps */}
                <View style={styles.trackerPill}>
                  <FontAwesome5
                    name="running"
                    size={20}
                    style={styles.trackerIcon}
                  />
                  <View style={styles.trackerValueRow}>
                    {stepsToday > preferences.dailyStepGoal && (
                      <Text style={styles.goalPlusGreen}>+</Text>
                    )}
                    <Text
                      style={styles.trackerNumber}
                      adjustsFontSizeToFit
                      numberOfLines={1}
                      minimumFontScale={0.7}
                    >
                      {formattedSteps}
                    </Text>
                  </View>
                </View>

                {/* Water */}
                <View style={styles.trackerPill}>
                  <FontAwesome5
                    name="tint"
                    size={20}
                    style={styles.trackerIcon}
                  />
                  <Text
                    style={styles.trackerNumber}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    minimumFontScale={0.7}
                  >
                    {formattedWater}
                  </Text>
                </View>

                {/* Weeks to goal – target */}
                <View style={styles.trackerPill}>
                  <MaterialCommunityIcons
                    name="target"
                    size={22}
                    style={styles.trackerIcon}
                  />
                  <Text
                    style={styles.trackerNumber}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    minimumFontScale={0.7}
                  >
                    {formattedWeeksToGoal}
                  </Text>
                </View>
              </View>

              {/* SECOND ROW OF TRACKERS */}
              <View style={styles.trackersRow}>
                {/* Calories */}
                <View style={styles.trackerPill}>
                  <MaterialCommunityIcons
                    name="speedometer"
                    size={20}
                    style={styles.trackerIcon}
                  />
                  <View style={styles.trackerValueRow}>
                    {dailyTotals.calories > preferences.dailyCalorieGoal && (
                      <Text style={styles.goalPlusRed}>+</Text>
                    )}
                    <Text
                      style={styles.trackerNumber}
                      adjustsFontSizeToFit
                      numberOfLines={1}
                      minimumFontScale={0.7}
                    >
                      {dailyTotals.calories}
                    </Text>
                  </View>
                  <Text style={styles.trackerLabel}>cal</Text>
                </View>

                {/* Protein */}
                <View style={styles.trackerPill}>
                  <MaterialCommunityIcons
                    name="dna"
                    size={20}
                    style={styles.trackerIcon}
                  />
                  <View style={styles.trackerValueRow}>
                    {dailyTotals.protein > preferences.dailyProteinGoal && (
                      <Text style={styles.goalPlusRed}>+</Text>
                    )}
                    <Text
                      style={styles.trackerNumber}
                      adjustsFontSizeToFit
                      numberOfLines={1}
                      minimumFontScale={0.7}
                    >
                      {dailyTotals.protein}
                    </Text>
                  </View>
                  <Text style={styles.trackerLabel}>g</Text>
                </View>

                {/* Carbs */}
                <View style={styles.trackerPill}>
                  <MaterialCommunityIcons
                    name="bread-slice"
                    size={20}
                    style={styles.trackerIcon}
                  />
                  <Text
                    style={styles.trackerNumber}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    minimumFontScale={0.7}
                  >
                    {dailyTotals.carbs}
                  </Text>
                  <Text style={styles.trackerLabel}>g carbs</Text>
                </View>
              </View>

              <View style={styles.trackersRow}>
                {/* Fats */}
                <View style={styles.trackerPill}>
                  <MaterialCommunityIcons
                    name="peanut"
                    size={20}
                    style={styles.trackerIcon}
                  />
                  <Text
                    style={styles.trackerNumber}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    minimumFontScale={0.7}
                  >
                    {dailyTotals.fats}
                  </Text>
                  <Text style={styles.trackerLabel}>g fat</Text>
                </View>

                {/* Blood Pressure */}
                <View style={styles.trackerPill}>
                  <MaterialCommunityIcons
                    name="heart-pulse"
                    size={20}
                    style={styles.trackerIcon}
                  />
                  <Text
                    style={styles.trackerNumber}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    minimumFontScale={0.7}
                  >
                    {bloodPressureDisplay}
                  </Text>
                </View>

                {/* Days to cheat meal */}
                <View style={styles.trackerPill}>
                  <FontAwesome5
                    name="pizza-slice"
                    size={20}
                    style={styles.trackerIcon}
                  />
                  <Text
                    style={styles.trackerNumber}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    minimumFontScale={0.7}
                  >
                    {daysToCheatMeal}
                  </Text>
                  <Text style={styles.trackerLabel}>days</Text>
                </View>
              </View>

              <View style={styles.trackerStatusRow}>
                {stepError ? (
                  <Text style={styles.stepsStatusError}>{stepError}</Text>
                ) : isPedometerAvailable === false ? (
                  <Text style={styles.stepsStatusError}>
                    Step tracking not available.
                  </Text>
                ) : (
                  <Text style={styles.stepsStatusOk}>
                    Steps from phone pedometer · Water manual · Weeks to goal coming later
                  </Text>
                )}
              </View>
            </View>

            {/* ====== MARK DAY COMPLETE BUTTON ====== */}
            <TouchableOpacity 
              style={styles.markDayButton}
              onPress={handleMarkDayComplete}
            >
              <Text style={styles.markDayButtonText}>Mark Day Complete</Text>
              
              <View style={styles.statusIconsRow}>
                {/* Steps */}
                <FontAwesome5
                  name="running"
                  size={16}
                  color={stepsComplete ? '#16a34a' : '#d1d5db'}
                  style={styles.statusIcon}
                />
                
                {/* Meals */}
                <FontAwesome5
                  name="utensils"
                  size={16}
                  color={mealsComplete ? '#16a34a' : '#d1d5db'}
                  style={styles.statusIcon}
                />
                
                {/* Photos - only show when due */}
                {isProgressPhotosRequiredToday && (
                  <Feather
                    name="camera"
                    size={16}
                    color={hasCompletedPhotosToday ? '#16a34a' : '#d1d5db'}
                    style={styles.statusIcon}
                  />
                )}
                
                {/* Workouts */}
                <FontAwesome5
                  name="dumbbell"
                  size={16}
                  color={atLeastOneWorkoutCompleted ? '#16a34a' : '#d1d5db'}
                  style={styles.statusIcon}
                />

                {/* Weigh-in - only show when due */}
                {isWeighInRequiredToday && (
                  <MaterialCommunityIcons
                    name="scale-bathroom"
                    size={18}
                    color={hasWeighedInToday ? '#16a34a' : '#d1d5db'}
                    style={styles.statusIcon}
                  />
                )}
              </View>
            </TouchableOpacity>

            {/* ====== TODAY / TOMORROW FOCUS CARD ====== */}
          <View style={styles.tilesSection}>
            <View style={styles.tile}>
              <View style={styles.focusRow}>
                {/* Today column */}
                <View style={styles.focusColumn}>
                  <Text style={styles.focusLabel}>Today</Text>
                  <Text style={styles.focusName}>{todayFocus.name}</Text>
                  {(isWeighInRequiredToday || isProgressPhotosRequiredToday) && (
                    <Text style={styles.focusMetaText}>
                      {isWeighInRequiredToday && 'Weigh-in day'}
                      {isWeighInRequiredToday && isProgressPhotosRequiredToday && ' · '}
                      {isProgressPhotosRequiredToday && 'Photo day'}
                    </Text>
                  )}
                </View>

                {/* Tomorrow column */}
                <View style={[styles.focusColumn, styles.focusColumnRight]}>
                  <Text style={styles.focusLabel}>Tomorrow</Text>
                  <Text style={styles.focusName}>{tomorrowFocus.name}</Text>

                  {(isWeighInRequiredTomorrow || isProgressPhotosRequiredTomorrow) && (
                    <Text style={styles.focusMetaText}>
                      {isWeighInRequiredTomorrow && 'Weigh-in day'}
                      {isWeighInRequiredTomorrow && isProgressPhotosRequiredTomorrow && ' · '}
                      {isProgressPhotosRequiredTomorrow && 'Photo day'}
                    </Text>
                  )}
                </View>
              </View>

                {/* Streak line under the split info, "9 Day Streak!!" style */}
                <Text style={styles.streakText}>
                  <Text style={styles.streakNumber}>{streakDays}</Text>
                  <Text> Day Streak!!</Text>
                </Text>
              </View>
            </View>

            {/* ====== WEIGHT CARD (2×2 GRID) ====== */}
            <View style={styles.weightCard}>
              {/* Top Row */}
              <View style={styles.weightRow}>
                {/* Current */}
                <View style={styles.weightItem}>
                  <Text style={styles.weightLabel}>Current</Text>
                  <Text 
                    style={styles.weightValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {currentWeight.toFixed(1)} lb
                  </Text>
                </View>
                {/* Goal */}
                <View style={styles.weightItem}>
                  <Text style={styles.weightLabel}>Goal</Text>
                  <Text 
                    style={styles.weightValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {goalWeight.toFixed(1)} lb
                  </Text>
                </View>
              </View>

              {/* Bottom Row */}
              <View style={styles.weightRow}>
                {/* Lost */}
                <View style={styles.weightItem}>
                  <Text style={styles.weightLabel}>Lost</Text>
                  <Text 
                    style={styles.weightValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {poundsLost.toFixed(1)} lb
                  </Text>
                </View>
                {/* To go */}
                <View style={styles.weightItem}>
                  <Text style={styles.weightLabel}>To go</Text>
                  <Text 
                    style={styles.weightValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {poundsToGo.toFixed(1)} lb
                  </Text>
                </View>
              </View>
            </View>
        </View>
      </ScrollView>

      {/* Quick Add Menu */}
      {quickAddVisible && (
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setQuickAddVisible(false)}>
          <View style={styles.quickAddMenu}>
            <Text style={styles.quickAddTitle}>Quick add</Text>
            <TouchableOpacity
              style={styles.quickAddButton}
              onPress={() => {
                setQuickAddVisible(false);
                setStepsDialogVisible(true);
              }}
            >
              <Text style={styles.quickAddButtonText}>Add Steps</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAddButton}
              onPress={() => {
                setQuickAddVisible(false);
                setWaterDialogVisible(true);
              }}
            >
              <Text style={styles.quickAddButtonText}>Add Water</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAddButton}
              onPress={() => {
                setQuickAddVisible(false);
                setWeighDialogVisible(true);
              }}
            >
              <Text style={styles.quickAddButtonText}>Weigh in</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAddButton}
              onPress={() => {
                setQuickAddVisible(false);
                setSystolicInput(todayBloodPressure ? String(todayBloodPressure.systolic) : '');
                setDiastolicInput(todayBloodPressure ? String(todayBloodPressure.diastolic) : '');
                setBloodPressureDialogVisible(true);
              }}
            >
              <Text style={styles.quickAddButtonText}>Log blood pressure</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAddButton}
              onPress={() => {
                setQuickAddVisible(false);
                setNoteDialogVisible(true);
              }}
            >
              <Text style={styles.quickAddButtonText}>Add Note</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAddCancel}
              onPress={() => setQuickAddVisible(false)}
            >
              <Text style={styles.quickAddCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Add Steps Dialog */}
      {stepsDialogVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>How many steps do you want to add to today?</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="e.g. 1000"
              placeholderTextColor="#9ca3af"
              value={stepInput}
              onChangeText={setStepInput}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonSecondary} onPress={closeAllDialogs}>
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonPrimary} onPress={handleAddStepsConfirm}>
                <Text style={styles.modalButtonPrimaryText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Add Water Dialog */}
      {waterDialogVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>How much water do you want to add?</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="e.g. 0.5"
              placeholderTextColor="#9ca3af"
              value={waterInput}
              onChangeText={setWaterInput}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonSecondary} onPress={closeAllDialogs}>
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonPrimary} onPress={handleAddWaterConfirm}>
                <Text style={styles.modalButtonPrimaryText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Blood Pressure Dialog */}
      {bloodPressureDialogVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log blood pressure</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="Systolic (top number)"
              placeholderTextColor="#9ca3af"
              value={systolicInput}
              onChangeText={setSystolicInput}
            />
            <TextInput
              style={[styles.modalInput, { marginTop: 10 }]}
              keyboardType="numeric"
              placeholder="Diastolic (bottom number)"
              placeholderTextColor="#9ca3af"
              value={diastolicInput}
              onChangeText={setDiastolicInput}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonSecondary} onPress={closeAllDialogs}>
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonPrimary} onPress={handleAddBloodPressureConfirm}>
                <Text style={styles.modalButtonPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Weigh In Dialog */}
      {weighDialogVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>What is your current weight (lbs)?</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="e.g. 165"
              placeholderTextColor="#9ca3af"
              value={weighInput}
              onChangeText={setWeighInput}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonSecondary} onPress={closeAllDialogs}>
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonPrimary} onPress={handleWeighInConfirm}>
                <Text style={styles.modalButtonPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Add Note Dialog */}
      {noteDialogVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Note</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 100, textAlignVertical: 'top' }]}
              placeholder="Type your note for today..."
              placeholderTextColor="#9ca3af"
              value={noteInput}
              onChangeText={setNoteInput}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonSecondary} onPress={closeAllDialogs}>
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonPrimary} onPress={handleAddNoteConfirm}>
                <Text style={styles.modalButtonPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFDF5',
  },
  screenContent: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  pageTitleRow: {
    marginTop: 8,
    paddingTop: 4,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.3,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  welcomeName: {
    color: ACCENT,
  },
  homeCardsContainer: {
    gap: 8,
  },

  // ===== TODAY CARD =====
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  heroDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroDateLeft: {
    color: '#1a1a1a',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroDateRight: {
    color: '#1a1a1a',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
  },

  trackersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  trackerPill: {
    flex: 1,
    height: 72,
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  trackerIcon: {
    color: '#FFFFFF',
    marginBottom: 4,
  },
  trackerValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trackerNumber: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  goalPlusGreen: {
    color: '#2ecc71',
    fontSize: 12,
    fontWeight: 'bold',
  },
  goalPlusRed: {
    color: '#e74c3c',
    fontSize: 12,
    fontWeight: 'bold',
  },
  trackerLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    opacity: 0.9,
  },
  trackerStatusRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  stepsStatusOk: {
    color: '#666666',
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
  stepsStatusError: {
    color: '#cc0000',
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },

  // ===== FOCUS CARD =====
  tilesSection: {
    marginVertical: 4,
  },
  tile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },

  focusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  focusColumn: {
    flex: 1,
    marginRight: 12,
  },
  focusColumnRight: {
    alignItems: 'flex-end',
    marginRight: 0,
    marginLeft: 12,
  },
  focusLabel: {
    color: '#666666',
    fontSize: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  focusName: {
    color: ACCENT,
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.2,
  },
  weighInText: {
    marginTop: 4,
    fontSize: 10,
    color: ACCENT,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  focusMetaText: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  streakText: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
  },
  streakNumber: {
    fontWeight: '700',
    color: ACCENT,
    fontSize: 13,
  },

  // ===== WEIGHT CARD =====
  weightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000000',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 4,
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  weightItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  weightLabel: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  weightValue: {
    fontSize: 17,
    fontWeight: '800',
    color: ACCENT,
    letterSpacing: 0.2,
  },

  // ===== MARK DAY BUTTON =====
  markDayButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  markDayButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  markDayButtonDisabled: {
    backgroundColor: '#7F1D1D',
    borderColor: '#991B1B',
  },
  statusIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    // Individual icon spacing handled by gap in parent
  },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 90,
  },
  quickAddMenu: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
    gap: 8,
  },
  quickAddTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  quickAddButton: {
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  quickAddButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  quickAddCancel: {
    marginTop: 4,
    alignItems: 'center',
    paddingVertical: 8,
  },
  quickAddCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalButtonSecondaryText: {
    color: '#4B5563',
    fontSize: 15,
    fontWeight: '700',
  },
  markDayHint: {
    marginTop: 4,
    color: '#6b7280',
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
});
