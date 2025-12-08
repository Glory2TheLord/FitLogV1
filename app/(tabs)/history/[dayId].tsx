import FitLogHeader from '@/components/FitLogHeader';
import { useDayMetrics } from '@/contexts/DayMetricsContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCENT = '#f97316';

export default function HistoryDayDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ dayId?: string }>();
  const dayIdParam = Array.isArray(params.dayId) ? params.dayId[0] : params.dayId;

  const { getHistoryEntryById } = useDayMetrics();
  const entry = useMemo(() => (dayIdParam ? getHistoryEntryById(dayIdParam) : undefined), [dayIdParam, getHistoryEntryById]);

  const formattedDate = dayIdParam
    ? new Date(`${dayIdParam}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '--';

  if (!entry) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <FitLogHeader onSettingsPress={() => router.push('/settings')} />
        <View style={styles.fallbackContainer}>
          <Text style={styles.pageTitle}>History Detail</Text>
          <Text style={styles.fallbackText}>No data saved for this day.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Back to History</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FitLogHeader onSettingsPress={() => router.push('/settings')} />
      <ScrollView style={styles.screenContent} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.pageTitleRow}>
          <Text style={styles.pageTitle}>History Detail</Text>
          <Text style={styles.date}>{formattedDate}</Text>
          <Text style={styles.status}>{entry.isDayComplete ? 'Day complete ✅' : 'Day not complete'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Overview</Text>
          {entry.didWeighIn && entry.weightLbs !== undefined ? (
            <Text style={styles.rowText}>Weight: {entry.weightLbs} lb</Text>
          ) : (
            <Text style={styles.rowText}>Weight: not recorded</Text>
          )}
          {entry.weeksUntilGoalAtThatTime !== undefined && entry.weeksUntilGoalAtThatTime !== null ? (
            <Text style={styles.rowText}>Weeks until goal: {entry.weeksUntilGoalAtThatTime}</Text>
          ) : (
            <Text style={styles.rowText}>Weeks until goal: --</Text>
          )}
          {entry.cheatInfo ? (
            entry.cheatInfo.isCheatDay ? (
              <Text style={styles.rowText}>Cheat day</Text>
            ) : (
              <Text style={styles.rowText}>
                Cheat cycle: {entry.cheatInfo.cycleDay ?? '--'} · {entry.cheatInfo.daysUntilCheat ?? '--'} days until next cheat
              </Text>
            )
          ) : (
            <Text style={styles.rowText}>Cheat info: --</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tracking</Text>
          <Text style={styles.rowText}>Steps: {entry.steps} / {entry.stepGoal}</Text>
          <Text style={styles.rowText}>Water: {entry.water} / {entry.waterGoal} L</Text>
          <Text style={styles.rowText}>Calories: {entry.calories} / {entry.calorieGoal}</Text>
          <Text style={styles.rowText}>Protein: {entry.protein} / {entry.proteinGoal} g</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Workouts</Text>
          <Text style={styles.rowText}>Workouts completed: {entry.workoutsCompleted}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Meals</Text>
          {entry.mealsPlanned !== undefined ? (
            <Text style={styles.rowText}>Meals completed: {entry.mealsCompleted} / {entry.mealsPlanned}</Text>
          ) : (
            <Text style={styles.rowText}>Meals completed: {entry.mealsCompleted}</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Check-ins</Text>
          {entry.didWeighIn && entry.weightLbs !== undefined ? (
            <Text style={styles.rowText}>Weigh-in: yes ({entry.weightLbs} lb)</Text>
          ) : (
            <Text style={styles.rowText}>Weigh-in: no</Text>
          )}
          <Text style={styles.rowText}>
            Photos: {entry.photosTaken} / {entry.photosRequired}
            {entry.didPhotos ? ' · Completed' : ''}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Timeline</Text>
          {entry.events && entry.events.length > 0 ? (
            entry.events
              .slice()
              .sort((a, b) => new Date(a.timestampISO).getTime() - new Date(b.timestampISO).getTime())
              .map(ev => {
                const time = new Date(ev.timestampISO).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                });
                return (
                  <View key={ev.id} style={styles.timelineRow}>
                    <Text style={styles.timelineTime}>{time}</Text>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineSummary}>{ev.summary}</Text>
                      {renderTimelineDetails(ev)}
                    </View>
                  </View>
                );
              })
          ) : (
            <Text style={styles.rowText}>No detailed events recorded for this day yet.</Text>
          )}
        </View>

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back to History</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function renderTimelineDetails(event: any) {
  if (!event?.details) return null;

  if (event.type === 'workoutLogged') {
    const { workoutName, sets, repsPerSet, durationMinutes, isCardio, stepsAddedFromWorkout } = event.details as any;
    if (isCardio && durationMinutes != null) {
      return (
        <Text style={styles.timelineDetails}>
          {durationMinutes} min cardio{stepsAddedFromWorkout != null ? ` · ${stepsAddedFromWorkout} steps` : ''}
        </Text>
      );
    }
    return (
      <Text style={styles.timelineDetails}>
        {workoutName ? `${workoutName} ` : ''}
        {sets != null ? `${sets} sets` : ''}{repsPerSet ? ` · reps: ${repsPerSet.join(', ')}` : ''}
      </Text>
    );
  }

  if (event.type === 'mealCompleted' && event.details) {
    const { mealName, calories, proteinGrams } = event.details as any;
    return (
      <Text style={styles.timelineDetails}>
        {mealName ? `${mealName} — ` : ''}
        {calories != null ? `${calories} kcal` : ''}
        {proteinGrams != null ? ` · ${proteinGrams} g protein` : ''}
      </Text>
    );
  }

  if (event.type === 'photosSlotCompleted' && event.details) {
    const { slot } = event.details as any;
    return <Text style={styles.timelineDetails}>Slot: {slot}</Text>;
  }

  if (event.type === 'waterLogged' && event.details) {
    const { delta, current, waterGoal } = event.details as any;
    return <Text style={styles.timelineDetails}>+{delta} L (total {current}/{waterGoal} L)</Text>;
  }

  if (event.type === 'stepsLogged' && event.details) {
    const { delta, current, stepGoal } = event.details as any;
    return <Text style={styles.timelineDetails}>+{delta} steps (total {current}/{stepGoal})</Text>;
  }

  if (event.type === 'goalWeightReached' && event.details) {
    const { weightLbs, goalWeightLbs } = event.details as any;
    return <Text style={styles.timelineDetails}>Reached {weightLbs} lb (goal {goalWeightLbs} lb)</Text>;
  }

  return null;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFDF5',
  },
  screenContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  pageTitleRow: {
    paddingTop: 4,
    paddingBottom: 12,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.3,
  },
  date: {
    fontSize: 16,
    color: '#0F172A',
    marginTop: 4,
  },
  status: {
    fontSize: 14,
    color: '#16a34a',
    marginTop: 4,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F2E9D8',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  rowText: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  timelineTime: {
    width: 70,
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  timelineSummary: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  timelineContent: {
    flex: 1,
  },
  timelineDetails: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fallbackText: {
    fontSize: 15,
    color: '#334155',
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 16,
    backgroundColor: ACCENT,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
