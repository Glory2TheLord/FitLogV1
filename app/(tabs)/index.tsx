import FitLogHeader from '@/components/FitLogHeader';
import { useMealTracking } from '@/contexts/MealTrackingContext';
import { useProgramDays } from '@/contexts/ProgramDaysContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useDayMetrics } from '@/contexts/DayMetricsContext';
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

// Type for daily history tracking
type DaySummary = {
  date: string; // ISO date YYYY-MM-DD
  calories: number;
  protein: number;
  steps: number;
  didWorkout: boolean;
  weight?: number; // optional if there was a weigh-in that day
};

export default function HomeScreen() {
  const router = useRouter();
  const { profile, activeProfile, recordWeighIn, isWeighInRequiredOn } = useUserProfile();
  const { stepsToday, setStepsToday, addSteps, waterLiters, setWaterLiters, addWater, resetTodayTrackingToDefaults } = useDayMetrics();
  
  // Get meal tracking context
  const {
    dailyTotals,
    goodEatingStreak,
    evaluateTodayForStreak,
    setGoodEatingStreak,
    setCheatUsedToday,
    setDailyTotals,
    setMealSlots,
    mealSlots,
    cheatUsedToday
  } = useMealTracking();
  const { preferences } = usePreferences();
  const { photoDays, isProgressPhotosRequiredOn } = usePhotoDays();
  
  // Get workouts context
  const {
    getWorkoutsForDate,
    hasCompletedWorkoutsForDate,
    clearWorkoutsForDate,
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
  const hasMetCalorieGoal = dailyTotals.calories > 0 && dailyTotals.calories <= preferences.dailyCalorieGoal;
  const hasMetProteinGoal = dailyTotals.protein >= preferences.dailyProteinGoal;
  // Calculate days to cheat meal using preference interval and eating streak
  const daysToCheatMeal = Math.max(0, preferences.cheatMealIntervalDays - goodEatingStreak);

  // Weigh-in requirement/completion
  const hasWeighedInToday = (profile.weighIns || []).some(w => w.date.slice(0, 10) === todayDateKey);
  const lastWeighInDate = (() => {
    const weighIns = profile.weighIns || [];
    if (weighIns.length === 0) return null;
    const sorted = [...weighIns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted[0].date;
  })();
  const daysSinceLastWeighIn = lastWeighInDate
    ? Math.floor((today.getTime() - new Date(lastWeighInDate).getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;
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
  const daysSinceLastPhotoDay = lastPhotoDate
    ? Math.floor((today.getTime() - new Date(lastPhotoDate).getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;
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

  // Workouts complete: all workouts for today are marked complete
  const workoutsComplete = hasCompletedWorkoutsForDate(todayDateKey);

  // Stubs for future features
  const [photosComplete, setPhotosComplete] = useState(false);
  const [weighInComplete, setWeighInComplete] = useState(false);

  // ===== WEEK SUMMARY (placeholders for now) =====
  const [workoutsThisWeek] = useState<number>(3);
  const [stepsThisWeek] = useState<number>(24300);
  const [avgWaterThisWeek] = useState<number>(2.1); // liters

  // ===== DAY HISTORY & GOAL ESTIMATION =====
  const [dayHistory, setDayHistory] = useState<DaySummary[]>([]);
  const [estimatedDaysToGoal, setEstimatedDaysToGoal] = useState<number | null>(null);

  // ===== WORKOUT STREAK - Calculate from consecutive days with workouts completed =====
  const calculateWorkoutStreak = () => {
    try {
      if (!dayHistory || dayHistory.length === 0) return 0;
      
      let streak = 0;
      // Start from most recent day and count backwards
      for (let i = dayHistory.length - 1; i >= 0; i--) {
        if (dayHistory[i] && dayHistory[i].didWorkout) {
          streak++;
        } else {
          break; // Streak is broken
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
  const poundsLost = dayHistory.length > 0 ? startingWeight - currentWeight : 0;
  const poundsToGo = currentWeight - goalWeight;

  // Derive estimated weeks to goal from days
  const estimatedWeeksToGoal = estimatedDaysToGoal !== null
    ? Math.ceil(estimatedDaysToGoal / 7)
    : null;

  // ===== TODAY'S FOCUS CYCLE (5-DAY PROGRAM) =====
  const { programDays, getProgramDayByIndex } = useProgramDays();
  
  // Anchor: Dec 3, 2025 = Day 1 (Chest & Tris)
  const programStartDate = new Date(2025, 11, 3); // months are 0-based (11 = December)
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSinceStart = Math.floor(
    (today.getTime() - programStartDate.getTime()) / msPerDay
  );
  
  // Only cycle through ACTIVE days
  const activeDays = programDays.filter(d => d.isActive).sort((a, b) => a.index - b.index);
  const todayDayIndex = activeDays.length > 0 ? activeDays[daysSinceStart % activeDays.length].index : 1;
  const todayProgramDay = getProgramDayByIndex(todayDayIndex);
  const todayFocus = { name: todayProgramDay?.name || `Day ${todayDayIndex}` };

  const tomorrowDayIndex = activeDays.length > 0 ? activeDays[(daysSinceStart + 1) % activeDays.length].index : 1;
  const tomorrowProgramDay = getProgramDayByIndex(tomorrowDayIndex);
  const tomorrowFocus = { name: tomorrowProgramDay?.name || `Day ${tomorrowDayIndex}` };

  // ===== "DUE TODAY" LOGIC FOR PHOTOS AND WEIGH-IN =====
  const photosDueToday = ((daysSinceStart + 1) % 30) === 0;
  const weighInDueToday = ((daysSinceStart + 1) % 10) === 0;

  // ===== GATE: CAN MARK DAY COMPLETE =====
  const atLeastOneWorkoutCompleted = getWorkoutsForDate(todayDateKey).some(w => w.isCompleted);

  const meetsWeighInRequirement = !isWeighInRequiredToday || hasWeighedInToday;
  const meetsPhotoRequirement = !isProgressPhotosRequiredToday || hasCompletedPhotosToday;

  const canMarkDayComplete =
    stepsComplete &&
    mealsComplete &&
    atLeastOneWorkoutCompleted &&
    meetsWeighInRequirement &&
    meetsPhotoRequirement &&
    (!photosDueToday || photosComplete) &&
    (!weighInDueToday || weighInComplete);

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

  // Dev-only reset handler
  const handleDevReset = () => {
    Alert.alert(
      'Reset cheat-meal progress?',
      "This will reset your good eating streak, days-to-cheat counter, and clear today's logged slots and trackers. This is intended for development/testing only.",
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, reset',
          style: 'destructive',
          onPress: () => {
            setGoodEatingStreak(0);
            setCheatUsedToday(false);
            setDailyTotals({ calories: 0, protein: 0 });
            setMealSlots((prev) =>
              prev.map((slot) => ({
                ...slot,
                templateId: null,
                completed: false,
              }))
            );
            resetTodayTrackingToDefaults();
            clearWorkoutsForDate(todayDateKey);
          },
        },
      ]
    );
  };

  // ===== GOAL ESTIMATION HELPER =====
  const recalculateEstimatedDaysToGoal = (history: DaySummary[]) => {
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
    const recentDays = history.slice(-14);
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

  // ===== LOG DAY AND RECALCULATE GOAL =====
  const logDayAndRecalculateGoal = () => {
    const todayDateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const newSummary: DaySummary = {
      date: todayDateStr,
      calories: dailyTotals.calories,
      protein: dailyTotals.protein,
      steps: stepsToday,
      didWorkout: workoutsComplete,
      // Only include weight if today was a weigh-in day and it was completed
      ...(weighInDueToday && weighInComplete && { weight: currentWeight }),
    };

    const updatedHistory = [...dayHistory, newSummary];
    setDayHistory(updatedHistory);
    recalculateEstimatedDaysToGoal(updatedHistory);
  };

  // ===== RESET DAILY STATE =====
  const resetDailyState = () => {
    // Reset per-day trackers
    setStepsToday(0);
    setWaterLiters(0.0);
    setDailyTotals({ calories: 0, protein: 0 });
    setCheatUsedToday(false);
    
    // Reset completion flags
    setPhotosComplete(false);
    setWeighInComplete(false);
    
    // Reset meal slots for the new day
    setMealSlots((prev) =>
      prev.map((slot) => ({
        ...slot,
        templateId: null,
        completed: false,
      }))
    );
  };

  // ===== MARK DAY COMPLETE HANDLER =====
  const handleMarkDayComplete = () => {
    if (!canMarkDayComplete) return;

    // 1. Update streak / days-to-cheat logic
    evaluateTodayForStreak();

    // 2. Log today and recalculate days/weeks to goal
    logDayAndRecalculateGoal();

    // 3. Reset all daily state for tomorrow
    resetDailyState();
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
  const [stepInput, setStepInput] = useState('');
  const [waterInput, setWaterInput] = useState('');
  const [weighDialogVisible, setWeighDialogVisible] = useState(false);
  const [weighInput, setWeighInput] = useState('');

  const closeAllDialogs = () => {
    setQuickAddVisible(false);
    setStepsDialogVisible(false);
    setWaterDialogVisible(false);
    setWeighDialogVisible(false);
    setStepInput('');
    setWaterInput('');
    setWeighInput('');
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
      addSteps(amount);
    }
    closeAllDialogs();
  };

  const handleAddWaterConfirm = () => {
    const amount = Number(waterInput);
    if (Number.isFinite(amount) && amount > 0) {
      addWater(amount);
    }
    closeAllDialogs();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FitLogHeader
        onSettingsPress={handleSettingsPress}
        onPlusPress={() => setQuickAddVisible(true)}
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
              style={[
                styles.markDayButton,
                !canMarkDayComplete && styles.markDayButtonDisabled
              ]}
              disabled={!canMarkDayComplete}
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
            {!canMarkDayComplete && (
              <Text style={styles.markDayHint}>
                Complete steps, calories, protein, meals, and at least one workout to mark the day complete.
              </Text>
            )}

            {/* ====== DEV RESET BUTTON ====== */}
            {__DEV__ && (
              <TouchableOpacity 
                style={styles.devResetButton}
                onPress={handleDevReset}
              >
                <Text style={styles.devResetButtonText}>DEV: Reset cheat progress</Text>
              </TouchableOpacity>
            )}

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

  // ===== DEV RESET BUTTON =====
  devResetButton: {
    backgroundColor: '#999999',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#666666',
  },
  devResetButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
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
