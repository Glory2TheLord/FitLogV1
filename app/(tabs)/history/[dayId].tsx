import FitLogHeader from '@/components/FitLogHeader';
import { useDayMetrics } from '@/contexts/DayMetricsContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCENT = '#f97316';

const formatMacro = (value?: number | null): string | null => {
  if (value == null) return null;
  return Number.isInteger(value) ? `${value}` : `${Number(value.toFixed(1))}`;
};

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

  const allGoalsReached = entry.allGoalsReached ?? entry.isDayComplete;
  const statusText = !entry.isDayComplete
    ? 'Day incomplete'
    : allGoalsReached
    ? 'Day complete'
    : 'Day complete (goals missed)';

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FitLogHeader onSettingsPress={() => router.push('/settings')} />
      <ScrollView style={styles.screenContent} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.pageTitleRow}>
          <Text style={styles.pageTitle}>History Detail</Text>
          <Text style={styles.date}>{formattedDate}</Text>
          <Text
            style={[
              styles.status,
              !entry.isDayComplete ? styles.statusIncomplete : allGoalsReached ? styles.statusComplete : styles.statusPartial,
            ]}
          >
            {statusText}
          </Text>
          {entry.isDayComplete && !allGoalsReached && (entry.missedGoals ?? []).length > 0 && (
            <Text style={styles.statusMissed}>Missed: {(entry.missedGoals ?? []).join(', ')}</Text>
          )}
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
          <Text style={styles.rowText}>
            Carbs: {entry.carbs} g{entry.carbsGoal ? ` / ${entry.carbsGoal} g` : ''}
          </Text>
          <Text style={styles.rowText}>
            Fats: {entry.fats} g{entry.fatsGoal ? ` / ${entry.fatsGoal} g` : ''}
          </Text>
          <Text style={styles.rowText}>
            Blood Pressure:{' '}
            {entry.bloodPressure
              ? `${entry.bloodPressure.systolic} / ${entry.bloodPressure.diastolic}`
              : 'not logged'}
          </Text>
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
                    <View style={styles.timelineContent}>{renderTimelineRow(ev)}</View>
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

function renderTimelineComment(details: any) {
  const comment = details?.comment ?? details?.notes ?? details?.newNotes;
  if (!comment) return null;
  return <Text style={styles.timelineComment}>{comment}</Text>;
}

function renderTimelineRow(event: any) {
  const details = event.details || {};

  if (event.type === 'markDayComplete') {
    const missed = Array.isArray(details?.missedGoals) ? details.missedGoals : [];
    const missedText = missed.length > 0 ? `Missed goals: ${missed.join(', ')}` : null;
    return (
      <>
        <Text style={styles.timelineSummary}>{event.summary || 'Marked day complete'}</Text>
        {missedText ? <Text style={styles.timelineComment}>{missedText}</Text> : null}
      </>
    );
  }

  if (event.type === 'mealCompleted' || event.type === 'mealsAllCompleted') {
    const mealName = details?.mealName ?? event.summary ?? 'Meal';
    const calories = details?.calories;
    const protein = details?.proteinGrams;
    const fat = details?.fatGrams;
    const carbs = details?.carbsGrams;
    const completed = details?.mealsCompleted;
    const planned = details?.mealsPlanned;

    let mainText = mealName;
    const parts: string[] = [];
    if (calories != null) parts.push(`${formatMacro(calories) ?? calories} kcal`);
    if (protein != null) parts.push(`${formatMacro(protein) ?? protein} g protein`);
    if (fat != null) parts.push(`${formatMacro(fat)} g fat`);
    if (carbs != null) parts.push(`${formatMacro(carbs)} g carbs`);
    if (parts.length > 0) {
      mainText = `${mealName} — ${parts.join(', ')}`;
    }
    if (event.type === 'mealsAllCompleted' && completed != null && planned != null) {
      mainText = `Completed all meals (${completed}/${planned})`;
    }

    return (
      <>
        <Text style={styles.timelineSummary}>{mainText}</Text>
        {renderTimelineComment(details)}
      </>
    );
  }

  if (event.type === 'workoutLogged') {
    const { workoutName, sets, repsPerSet, durationMinutes, isCardio, stepsAddedFromWorkout } = details as any;
    let mainText = workoutName || event.summary;
    if (isCardio && durationMinutes != null) {
      const extra = stepsAddedFromWorkout != null ? ` · ${stepsAddedFromWorkout} steps` : '';
      mainText = `${workoutName || 'Cardio'} — ${durationMinutes} min cardio${extra}`;
    } else {
      const repsText = repsPerSet ? ` reps: ${repsPerSet.join(', ')}` : '';
      const setsText = sets != null ? `${sets} sets` : '';
      mainText = `${workoutName || 'Workout'}${setsText ? ` — ${setsText}` : ''}${repsText ? ` ·${repsText}` : ''}`;
    }
    return (
      <>
        <Text style={styles.timelineSummary}>{mainText}</Text>
        {renderTimelineComment(details)}
      </>
    );
  }

  if (event.type === 'photosSlotCompleted' && event.details) {
    const { slot } = event.details as any;
    return (
      <>
        <Text style={styles.timelineSummary}>Completed progress photo: {slot}</Text>
        {renderTimelineComment(details)}
      </>
    );
  }

  if (event.type === 'waterLogged' && event.details) {
    const { delta, current, waterGoal } = event.details as any;
    return (
      <>
        <Text style={styles.timelineSummary}>+{delta} L (total {current}/{waterGoal} L)</Text>
        {renderTimelineComment(details)}
      </>
    );
  }

  if (event.type === 'stepsLogged' && event.details) {
    const { delta, current, stepGoal } = event.details as any;
    return (
      <>
        <Text style={styles.timelineSummary}>+{delta} steps (total {current}/{stepGoal})</Text>
        {renderTimelineComment(details)}
      </>
    );
  }

  if (event.type === 'stepsAddedManual' && event.details) {
    const { delta, current } = event.details as any;
    return (
      <>
        <Text style={styles.timelineSummary}>Steps added manually</Text>
        <Text style={styles.timelineComment}>+{Number(delta || 0).toLocaleString('en-US')} (total {Number(current || 0).toLocaleString('en-US')})</Text>
      </>
    );
  }

  if (event.type === 'stepsUpdatedFromFitbit' && event.details) {
    const { delta, current } = event.details as any;
    return (
      <>
        <Text style={styles.timelineSummary}>Steps updated from Fitbit</Text>
        <Text style={styles.timelineComment}>+{Number(delta || 0).toLocaleString('en-US')} (total {Number(current || 0).toLocaleString('en-US')})</Text>
      </>
    );
  }

  if (event.type === 'goalWeightReached' && event.details) {
    const { weightLbs, goalWeightLbs } = event.details as any;
    return (
      <>
        <Text style={styles.timelineSummary}>Reached {weightLbs} lb (goal {goalWeightLbs} lb)</Text>
        {renderTimelineComment(details)}
      </>
    );
  }

  if ((event.type === 'workoutNotesAdded' || event.type === 'workoutNotesUpdated' || event.type === 'workoutNotes') && event.details) {
    const { newNotes, notes, workoutName } = event.details as any;
    const noteBody = newNotes ?? notes;
    if (!noteBody) return null;
    const headline =
      event.type === 'workoutNotesUpdated'
        ? workoutName
          ? `Notes updated for ${workoutName}`
          : 'Notes updated for workout'
        : workoutName
        ? `Notes added to ${workoutName}`
        : 'Notes added to workout';
    return (
      <>
        <Text style={styles.timelineSummary}>{headline}</Text>
        <Text style={styles.timelineComment}>{noteBody}</Text>
      </>
    );
  }

  if (event.type === 'dayNoteAdded' && event.details) {
    const noteText = event.details?.note || event.details?.text || event.summary;
    return (
      <>
        <Text style={styles.timelineSummary}>Note added</Text>
        {noteText ? <Text style={styles.timelineComment}>{noteText}</Text> : null}
      </>
    );
  }

  if (event.type === 'workoutTemplateUpdated' && event.details) {
    const { workoutName, summary } = event.details as any;
    const title = workoutName ? `Updated workout template for ${workoutName}` : 'Updated workout template';
    return (
      <>
        <Text style={styles.timelineSummary}>{title}</Text>
        {summary ? <Text style={styles.timelineComment}>{summary}</Text> : null}
      </>
    );
  }

  if (event.type === 'workoutEdited' && event.details) {
    return (
      <>
        <Text style={styles.timelineSummary}>Updated workout template settings.</Text>
        {renderTimelineComment(details)}
      </>
    );
  }

  if ((event.type === 'bloodPressureLogged' || event.type === 'bloodPressureUpdated') && event.details) {
    const { systolic, diastolic } = event.details as any;
    const verb = event.type === 'bloodPressureUpdated' ? 'updated' : 'logged';
    const valueText = systolic && diastolic ? `${systolic} / ${diastolic}` : '';
    return (
      <>
        <Text style={styles.timelineSummary}>Blood pressure {verb} — {valueText}</Text>
      </>
    );
  }

  const summary = (event.summary || '').trim();
  const detailsText = (details?.text || '').trim();
  const shouldShowDetails = detailsText && detailsText.toLowerCase() !== summary.toLowerCase();

  return (
    <>
      <Text style={styles.timelineSummary}>{summary || 'Event'}</Text>
      {shouldShowDetails && <Text style={styles.timelineDetails}>{detailsText}</Text>}
      {renderTimelineComment(details)}
    </>
  );
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
    marginTop: 4,
    fontWeight: '600',
  },
  statusComplete: {
    color: '#16a34a',
  },
  statusPartial: {
    color: '#f97316',
  },
  statusIncomplete: {
    color: '#9ca3af',
  },
  statusMissed: {
    fontSize: 13,
    color: '#f97316',
    marginTop: 2,
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
  timelineComment: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
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
