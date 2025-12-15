import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useDayMetrics } from './DayMetricsContext';
import { usePreferences } from './PreferencesContext';
import { useUserProfile } from './UserProfileContext';

type QuickActionsContextValue = {
  openQuickActions: () => void;
  closeQuickActions: () => void;
};

const QuickActionsContext = createContext<QuickActionsContextValue | undefined>(undefined);

const ACCENT = '#f97316';

export function QuickActionsProvider({ children }: { children: ReactNode }) {
  const {
    addSteps,
    stepsToday,
    addWater,
    waterLiters,
    addHistoryEventForToday,
    setStepsToday,
    setTodayBloodPressure,
    todayBloodPressure,
  } = useDayMetrics();
  const { preferences } = usePreferences();
  const { recordWeighIn } = useUserProfile();

  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [stepsDialogVisible, setStepsDialogVisible] = useState(false);
  const [waterDialogVisible, setWaterDialogVisible] = useState(false);
  const [weighDialogVisible, setWeighDialogVisible] = useState(false);
  const [noteDialogVisible, setNoteDialogVisible] = useState(false);
  const [bloodPressureDialogVisible, setBloodPressureDialogVisible] = useState(false);

  const [stepInput, setStepInput] = useState('');
  const [waterInput, setWaterInput] = useState('');
  const [weighInput, setWeighInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [systolicInput, setSystolicInput] = useState('');
  const [diastolicInput, setDiastolicInput] = useState('');

  const closeAllDialogs = () => {
    setQuickAddVisible(false);
    setStepsDialogVisible(false);
    setWaterDialogVisible(false);
    setWeighDialogVisible(false);
    setBloodPressureDialogVisible(false);
    setNoteDialogVisible(false);
    setStepInput('');
    setWaterInput('');
    setWeighInput('');
    setNoteInput('');
    setSystolicInput('');
    setDiastolicInput('');
    setStepMode('fitbit');
  };

  const [stepMode, setStepMode] = useState<'fitbit' | 'manual'>('fitbit');

  const handleAddStepsConfirm = () => {
    const current = stepsToday;
    const parsed = Number(stepInput);

    if (!Number.isFinite(parsed) || parsed < 0) {
      closeAllDialogs();
      return;
    }

    if (stepMode === 'manual') {
      const amount = parsed;
      if (amount <= 0) {
        closeAllDialogs();
        return;
      }
      const prevSteps = current;
      const nextSteps = prevSteps + amount;
      const stepGoal = preferences.dailyStepGoal;
      addSteps(amount);
      addHistoryEventForToday({
        type: 'stepsAddedManual',
        summary: 'Steps added manually',
        details: {
          previous: prevSteps,
          current: nextSteps,
          delta: amount,
          stepGoal,
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
      closeAllDialogs();
      return;
    }

    // Fitbit mode
    const fitbitTotal = parsed;
    const diff = fitbitTotal - current;

    if (diff === 0) {
      closeAllDialogs();
      return;
    }

    const prevSteps = current;
    const nextSteps = fitbitTotal;
    const stepGoal = preferences.dailyStepGoal;

    if (diff > 0) {
      addSteps(diff);
    } else {
      // Need to allow lowering; set directly
      setStepsToday(fitbitTotal);
    }

    addHistoryEventForToday({
      type: 'stepsUpdatedFromFitbit',
      summary: 'Steps updated from Fitbit',
      details: {
        previous: prevSteps,
        current: nextSteps,
        delta: diff,
        stepGoal,
        source: 'fitbit',
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

  const handleWeighInConfirm = () => {
    const amount = Number(weighInput);
    if (Number.isFinite(amount) && amount > 0) {
      recordWeighIn(amount);
    }
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

  const handleAddBloodPressureConfirm = () => {
    const systolic = Number(systolicInput);
    const diastolic = Number(diastolicInput);
    if (!Number.isFinite(systolic) || !Number.isFinite(diastolic) || systolic <= 0 || diastolic <= 0) {
      Alert.alert('Invalid values', 'Please enter valid numbers for both systolic and diastolic.');
      return;
    }
    setTodayBloodPressure({
      systolic,
      diastolic,
      timestamp: new Date().toISOString(),
    });
    closeAllDialogs();
  };

  useEffect(() => {
    if (bloodPressureDialogVisible) {
      setSystolicInput(todayBloodPressure ? String(todayBloodPressure.systolic) : '');
      setDiastolicInput(todayBloodPressure ? String(todayBloodPressure.diastolic) : '');
    }
  }, [bloodPressureDialogVisible, todayBloodPressure]);

  const openQuickActions = () => {
    setQuickAddVisible(true);
  };

  const closeQuickActions = () => {
    closeAllDialogs();
  };

  return (
    <QuickActionsContext.Provider value={{ openQuickActions, closeQuickActions }}>
      {children}

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

      {stepsDialogVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Update steps</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleButton, stepMode === 'fitbit' && styles.toggleButtonActive]}
                onPress={() => setStepMode('fitbit')}
              >
                <Text style={[styles.toggleButtonText, stepMode === 'fitbit' && styles.toggleButtonTextActive]}>Fitbit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, stepMode === 'manual' && styles.toggleButtonActive]}
                onPress={() => setStepMode('manual')}
              >
                <Text style={[styles.toggleButtonText, stepMode === 'manual' && styles.toggleButtonTextActive]}>Manual</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHelper}>Current FitLog steps: {stepsToday.toLocaleString('en-US')}</Text>
            <Text style={styles.modalLabel}>
              {stepMode === 'fitbit' ? 'Fitbit steps right now' : 'Steps to add manually'}
            </Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder={stepMode === 'fitbit' ? 'e.g. 8430' : 'e.g. 1000'}
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
    </QuickActionsContext.Provider>
  );
}

export function useQuickActions() {
  const ctx = useContext(QuickActionsContext);
  if (!ctx) {
    throw new Error('useQuickActions must be used within QuickActionsProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
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
  modalHelper: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 8,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666666',
    marginBottom: 6,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  toggleButtonActive: {
    borderColor: ACCENT,
    backgroundColor: '#FFF3E9',
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  toggleButtonTextActive: {
    color: ACCENT,
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
});
