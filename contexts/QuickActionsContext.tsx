import React, { createContext, ReactNode, useContext, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  const { addSteps, stepsToday, addWater, waterLiters, addHistoryEventForToday } = useDayMetrics();
  const { preferences } = usePreferences();
  const { recordWeighIn } = useUserProfile();

  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [stepsDialogVisible, setStepsDialogVisible] = useState(false);
  const [waterDialogVisible, setWaterDialogVisible] = useState(false);
  const [weighDialogVisible, setWeighDialogVisible] = useState(false);
  const [noteDialogVisible, setNoteDialogVisible] = useState(false);

  const [stepInput, setStepInput] = useState('');
  const [waterInput, setWaterInput] = useState('');
  const [weighInput, setWeighInput] = useState('');
  const [noteInput, setNoteInput] = useState('');

  const closeAllDialogs = () => {
    setQuickAddVisible(false);
    setStepsDialogVisible(false);
    setWaterDialogVisible(false);
    setWeighDialogVisible(false);
    setNoteDialogVisible(false);
    setStepInput('');
    setWaterInput('');
    setWeighInput('');
    setNoteInput('');
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
});
