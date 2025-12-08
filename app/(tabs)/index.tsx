import FitLogHeader from '@/components/FitLogHeader';
import { CALORIE_GOAL, PROTEIN_GOAL, useMealTracking } from '@/contexts/MealTrackingContext';
import { useProgramDays } from '@/contexts/ProgramDaysContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useWorkouts } from '@/contexts/WorkoutsContext';
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
  const { profile, activeProfile } = useUserProfile();
  
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
  
  // Get workouts context
  const { hasCompletedWorkoutsForDate } = useWorkouts();
  
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

  // ===== STEP TRACKER STATE =====
  const [isPedometerAvailable, setIsPedometerAvailable] = useState<
    boolean | null
  >(null);
  const [stepsToday, setStepsToday] = useState<number>(0);
  const [stepError, setStepError] = useState<string | null>(null);

  // ===== WATER TRACKER STATE (manual for now) =====
  const [waterLiters, setWaterLiters] = useState<number>(0.0);

  // ===== WEEKS-TO-GOAL TRACKER STATE (placeholder for now) =====
  const [weeksToGoal, setWeeksToGoal] = useState<number>(8);

  // ===== DERIVED VALUES FROM MEAL TRACKING =====
  // dailyTotals comes from context
  // Calculate days to cheat meal from streak
  const daysToCheatMeal = Math.max(0, 9 - goodEatingStreak);

  // ===== STATUS COMPLETE STATES FOR MARK DAY ICONS =====
  // Steps complete: 10k steps or more
  const stepsComplete = stepsToday >= 10000;

  // Meals complete: meets calorie/protein goals, all selected slots completed, no cheat
  const mealsComplete = (() => {
    const meetsCalories = dailyTotals.calories > 0 && dailyTotals.calories <= CALORIE_GOAL;
    const meetsProtein = dailyTotals.protein >= PROTEIN_GOAL;
    const allSelectedSlotsCompleted = mealSlots.every(slot => {
      if (!slot.templateId) return true; // empty slot is fine
      return slot.completed === true;
    });
    return meetsCalories && meetsProtein && allSelectedSlotsCompleted && !cheatUsedToday;
  })();

  // Compute today's date key for workouts
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayDateKey = `${year}-${month}-${day}`;
  
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
  const canMarkDayComplete =
    stepsComplete &&
    mealsComplete &&
    workoutsComplete &&
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
  const formattedWeeksToGoal = estimatedWeeksToGoal !== null
    ? `${estimatedWeeksToGoal} wks`
    : (weeksToGoal <= 0 ? '--' : `${weeksToGoal} wks`);

  const formattedStepsWeek = stepsThisWeek.toLocaleString('en-US');

  // Dev-only reset handler
  const handleDevReset = () => {
    Alert.alert(
      'Reset cheat-meal progress?',
      "This will reset your good eating streak, days-to-cheat counter, and clear today's logged slots. This is intended for development/testing only.",
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FitLogHeader onSettingsPress={handleSettingsPress} />
      
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
                  <Text
                    style={styles.trackerNumber}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    minimumFontScale={0.7}
                  >
                    {formattedSteps}
                  </Text>
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
                  <Text
                    style={styles.trackerNumber}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    minimumFontScale={0.7}
                  >
                    {dailyTotals.calories}
                  </Text>
                  <Text style={styles.trackerLabel}>cal</Text>
                </View>

                {/* Protein */}
                <View style={styles.trackerPill}>
                  <MaterialCommunityIcons
                    name="dna"
                    size={20}
                    style={styles.trackerIcon}
                  />
                  <Text
                    style={styles.trackerNumber}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    minimumFontScale={0.7}
                  >
                    {dailyTotals.protein}
                  </Text>
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
                {photosDueToday && (
                  <Feather
                    name="camera"
                    size={16}
                    color={photosComplete ? '#16a34a' : '#d1d5db'}
                    style={styles.statusIcon}
                  />
                )}
                
                {/* Workouts */}
                <FontAwesome5
                  name="dumbbell"
                  size={16}
                  color={workoutsComplete ? '#16a34a' : '#d1d5db'}
                  style={styles.statusIcon}
                />
                
                {/* Weigh-in - only show when due */}
                {weighInDueToday && (
                  <MaterialCommunityIcons
                    name="scale-bathroom"
                    size={18}
                    color={weighInComplete ? '#16a34a' : '#d1d5db'}
                    style={styles.statusIcon}
                  />
                )}
              </View>
            </TouchableOpacity>

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
                  </View>

                  {/* Tomorrow column */}
                  <View style={[styles.focusColumn, styles.focusColumnRight]}>
                    <Text style={styles.focusLabel}>Tomorrow</Text>
                    <Text style={styles.focusName}>{tomorrowFocus.name}</Text>

                    {isTomorrowSunday && (
                      <Text style={styles.weighInText}>WEIGH-IN DAY</Text>
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
  trackerNumber: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
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
});
