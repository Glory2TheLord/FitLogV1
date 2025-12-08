import FitLogHeader from '@/components/FitLogHeader';
import { ProgramDayId, useProgramDays } from '@/contexts/ProgramDaysContext';
import {
    useWorkouts,
    WorkoutEntry,
    WorkoutTemplate,
    WorkoutType,
} from '@/contexts/WorkoutsContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCENT = '#f97316';

const getDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const workoutTypeLabels: Record<WorkoutType, string> = {
  cardio: 'Cardio',
  strength: 'Strength',
  accessory: 'Accessory',
  other: 'Other',
};

type WorkoutSlot = {
  id: string;
  selectedWorkoutId: string | null;
  selectedWorkoutData: {
    name: string;
    type: WorkoutType;
    sets: number | null;
    reps: number | null;
    weight: number | null;
    minutes: number | null;
    notes?: string;
  } | null;
  isCompleted: boolean;
};

export default function WorkoutsScreen() {
  const router = useRouter();
  const { programDays, getProgramDayByIndex } = useProgramDays();
  const {
    getWorkoutsForDate,
    toggleWorkoutCompleted,
    deleteWorkout,
    addWorkout,
    updateWorkout,
    workoutTemplates,
    addWorkoutTemplate,
    updateWorkoutTemplate,
    deleteWorkoutTemplate,
    getTemplatesForProgramDay,
  } = useWorkouts();

  const today = new Date();
  const todayDateKey = getDateKey(today);
  
  // Calculate today's program day index (1-based, cycling through ACTIVE program days only)
  const activeDays = programDays.filter(d => d.isActive).sort((a, b) => a.index - b.index);
  const startDate = new Date('2025-12-02');
  const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const programDayIndex = activeDays.length > 0 ? activeDays[daysDiff % activeDays.length].index : 1;
  const programDay = getProgramDayByIndex(programDayIndex);

  // Get today's workouts from context
  const todayWorkouts = getWorkoutsForDate(todayDateKey);

  // Workout slots state - sync with actual workout entries
  const [workoutSlots, setWorkoutSlots] = useState<WorkoutSlot[]>([
    { id: '1', selectedWorkoutId: null, selectedWorkoutData: null, isCompleted: false },
    { id: '2', selectedWorkoutId: null, selectedWorkoutData: null, isCompleted: false },
    { id: '3', selectedWorkoutId: null, selectedWorkoutData: null, isCompleted: false },
    { id: '4', selectedWorkoutId: null, selectedWorkoutData: null, isCompleted: false },
  ]);

  // Load existing workouts into slots on mount and when todayWorkouts changes
  useEffect(() => {
    if (todayWorkouts.length > 0) {
      const loadedSlots: WorkoutSlot[] = todayWorkouts.map((workout, index) => ({
        id: (index + 1).toString(),
        selectedWorkoutId: workout.id,
        selectedWorkoutData: {
          name: workout.name,
          type: workout.type,
          sets: workout.sets ?? null,
          reps: workout.reps ?? null,
          weight: workout.weight ?? null,
          minutes: workout.minutes ?? null,
          notes: workout.notes,
        },
        isCompleted: workout.isCompleted,
      }));
      
      // Ensure we have at least 4 slots
      while (loadedSlots.length < 4) {
        loadedSlots.push({
          id: (loadedSlots.length + 1).toString(),
          selectedWorkoutId: null,
          selectedWorkoutData: null,
          isCompleted: false,
        });
      }
      
      setWorkoutSlots(loadedSlots);
    }
  }, [todayWorkouts.length]);

  // Template selection
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);

  // Add workout modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCustomWorkout, setIsCustomWorkout] = useState(false);
  const [currentEditingSlotId, setCurrentEditingSlotId] = useState<string | null>(null);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutType, setWorkoutType] = useState<WorkoutType>('strength');
  const [workoutMinutes, setWorkoutMinutes] = useState('');
  const [workoutSets, setWorkoutSets] = useState('');
  const [workoutReps, setWorkoutReps] = useState('');
  const [workoutWeight, setWorkoutWeight] = useState('');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [selectedProgramDayIds, setSelectedProgramDayIds] = useState<ProgramDayId[]>([]);

  const templatesForToday = programDay ? getTemplatesForProgramDay(programDay.id) : [];
  const otherTemplates = workoutTemplates.filter(t => !programDay || !(t.programDayIds?.includes(programDay.id) ?? false));

  const handleTemplateSelect = (slotId: string, templateId: string) => {
    if (templateId === 'add-new') {
      setCurrentEditingSlotId(slotId);
      setIsCustomWorkout(true);
      setWorkoutName('');
      setWorkoutType('strength');
      setWorkoutMinutes('');
      setWorkoutSets('');
      setWorkoutReps('');
      setWorkoutWeight('');
      setWorkoutNotes('');
      setSelectedProgramDayIds(programDay ? [programDay.id] : []);
      setShowAddModal(true);
      setExpandedSlotId(null);
    } else {
      // Find template and create workout entry
      const template = workoutTemplates.find(t => t.id === templateId);
      if (!template || !programDay) return;

      // Create workout entry in context
      const newWorkoutEntry: Omit<WorkoutEntry, 'id' | 'createdAt' | 'isCompleted'> = {
        dateKey: todayDateKey,
        programDayId: programDay.id,
        programDayIndex: programDay.index,
        focusLabel: programDay.name,
        name: template.name,
        type: template.type,
        minutes: template.defaultMinutes,
        sets: template.defaultSets,
        reps: template.defaultReps,
        weight: template.defaultWeight,
        notes: '',
      };

      addWorkout(newWorkoutEntry);
      setExpandedSlotId(null);
      
      // Note: workoutSlots will update via useEffect when todayWorkouts changes
    }
  };

  const handleToggleCompleted = (slotId: string) => {
    const slot = workoutSlots.find(s => s.id === slotId);
    if (!slot || !slot.selectedWorkoutId) return;
    
    // Toggle completion in context (persisted)
    toggleWorkoutCompleted(todayDateKey, slot.selectedWorkoutId);
    
    // Update local state immediately for UI responsiveness
    setWorkoutSlots(prev =>
      prev.map(s =>
        s.id === slotId ? { ...s, isCompleted: !s.isCompleted } : s
      )
    );
  };

  const handleClearSlot = (slotId: string) => {
    const slot = workoutSlots.find(s => s.id === slotId);
    if (!slot || !slot.selectedWorkoutId) return;
    
    // Delete workout entry from context
    deleteWorkout(todayDateKey, slot.selectedWorkoutId);
    
    // Update local state immediately
    setWorkoutSlots(prev =>
      prev.map(s =>
        s.id === slotId
          ? { ...s, selectedWorkoutId: null, selectedWorkoutData: null, isCompleted: false }
          : s
      )
    );
  };

  const handleAddSlot = () => {
    const newId = Date.now().toString();
    setWorkoutSlots(prev => [
      ...prev,
      { id: newId, selectedWorkoutId: null, selectedWorkoutData: null, isCompleted: false },
    ]);
  };

  const handleDeleteSlot = (slotId: string) => {
    if (workoutSlots.length === 1) {
      Alert.alert('Cannot delete', 'You must have at least one workout slot.');
      return;
    }

    Alert.alert(
      'Remove this workout slot?',
      'This will delete any selection in this slot.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => {
            setWorkoutSlots(prev => prev.filter(slot => slot.id !== slotId));
          },
        },
      ]
    );
  };

  const getWorkoutSummary = (data: WorkoutSlot['selectedWorkoutData']): string => {
    if (!data) return '';
    
    const parts: string[] = [];
    if (data.sets) parts.push(`${data.sets} sets`);
    if (data.reps) parts.push(`${data.reps} reps`);
    if (data.weight) parts.push(`${data.weight} lbs`);
    if (data.minutes) parts.push(`${data.minutes} min`);
    
    return parts.length > 0 ? parts.join(' • ') : workoutTypeLabels[data.type];
  };

  // Export completion status for Home screen
  const isWorkoutDayComplete = workoutSlots.some(slot => slot.isCompleted);

  const handleDeleteTemplate = (template: WorkoutTemplate) => {
    Alert.alert(
      'Delete saved workout?',
      `"${template.name}" will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, delete',
          style: 'destructive',
          onPress: () => deleteWorkoutTemplate(template.id),
        },
      ]
    );
  };

  const handleEditWorkout = (workout: WorkoutEntry) => {
    setEditingWorkoutId(workout.id);
    setIsCustomWorkout(false);
    setWorkoutName(workout.name);
    setWorkoutType(workout.type);
    setWorkoutMinutes(workout.minutes?.toString() || '');
    setWorkoutSets(workout.sets?.toString() || '');
    setWorkoutReps(workout.reps?.toString() || '');
    setWorkoutWeight(workout.weight?.toString() || '');
    setWorkoutNotes(workout.notes || '');
    setSelectedProgramDayIds([]);
    setShowAddModal(true);
  };

  const handleSaveWorkout = () => {
    if (!workoutName.trim()) {
      Alert.alert('Required', 'Please enter a workout name.');
      return;
    }

    const minutesNumber = workoutMinutes ? parseInt(workoutMinutes) : undefined;
    const setsNumber = workoutSets ? parseInt(workoutSets) : undefined;
    const repsNumber = workoutReps ? parseInt(workoutReps) : undefined;
    const weightNumber = workoutWeight ? parseFloat(workoutWeight) : undefined;

    if (workoutType === 'cardio' && (minutesNumber == null || isNaN(minutesNumber) || minutesNumber <= 0)) {
      Alert.alert('Required', 'Please enter how many minutes you did for cardio.');
      return;
    }

    if (editingWorkoutId) {
      // Edit existing workout
      updateWorkout(todayDateKey, editingWorkoutId, {
        name: workoutName.trim(),
        type: workoutType,
        minutes: minutesNumber,
        sets: setsNumber,
        reps: repsNumber,
        weight: weightNumber,
        notes: workoutNotes.trim() || undefined,
      });
    } else {
      // Add new workout
      if (!programDay) {
        Alert.alert('Error', 'Unable to determine program day.');
        return;
      }

      // If custom workout and user wants to save as template
      if (isCustomWorkout && selectedProgramDayIds.length > 0) {
        addWorkoutTemplate({
          name: workoutName.trim(),
          type: workoutType,
          defaultMinutes: minutesNumber,
          defaultSets: setsNumber,
          defaultReps: repsNumber,
          defaultWeight: weightNumber,
          programDayIds: selectedProgramDayIds,
        });
      }

      // Add workout to today
      const newWorkout: Omit<WorkoutEntry, 'id'> = {
        name: workoutName.trim(),
        type: workoutType,
        minutes: minutesNumber || null,
        sets: setsNumber || null,
        reps: repsNumber || null,
        weight: weightNumber || null,
        notes: workoutNotes.trim() || '',
        isCompleted: false,
        programDayIndex: programDay.index,
        focusLabel: programDay.name,
      };

      addWorkout(todayDateKey, newWorkout);
    }

    // Reset and close
    setEditingWorkoutId(null);
    setCurrentEditingSlotId(null);
    setWorkoutName('');
    setWorkoutType('strength');
    setWorkoutMinutes('');
    setWorkoutSets('');
    setWorkoutReps('');
    setWorkoutWeight('');
    setWorkoutNotes('');
    setSelectedProgramDayIds([]);
    setShowAddModal(false);
  };

  const toggleProgramDay = (dayId: ProgramDayId) => {
    setSelectedProgramDayIds(prev =>
      prev.includes(dayId)
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FitLogHeader onSettingsPress={() => router.push('/settings')} />

      <View style={styles.screenContent}>
        <View style={styles.pageTitleRow}>
          <Text style={styles.pageTitle}>Workouts</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.todayInfo}>
            <Text style={styles.todayInfoText}>
              {programDay ? `Today: Day ${programDay.index} \u2013 ${programDay.name}` : 'Today: Rest / Unassigned'}
            </Text>
            <TouchableOpacity
              style={styles.editDaysLink}
              onPress={() => router.push('/programDaysSettings')}
            >
              <Feather name="edit-2" size={14} color="#666" />
              <Text style={styles.editDaysLinkText}>Edit training plan</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.workoutsCard}>
            <Text style={styles.workoutsTitle}>Today's Workouts</Text>

            {workoutSlots.map((slot) => {
              const isExpanded = expandedSlotId === slot.id;

              return (
                <View
                  key={slot.id}
                  style={[
                    styles.workoutSlot,
                    slot.isCompleted && styles.workoutSlotCompleted,
                  ]}
                >
                  {/* Top row: dropdown + actions */}
                  <View style={styles.slotTopRow}>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() =>
                        setExpandedSlotId(isExpanded ? null : slot.id)
                      }
                    >
                      <Text style={styles.dropdownText}>
                        {slot.selectedWorkoutData 
                          ? `${workoutTypeLabels[slot.selectedWorkoutData.type]} · ${slot.selectedWorkoutData.name}`
                          : 'Select workout'}
                      </Text>
                      <Feather
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color="#666666"
                      />
                    </TouchableOpacity>

                    <View style={styles.slotActions}>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          slot.isCompleted && styles.actionButtonCompleted,
                        ]}
                        onPress={() => handleToggleCompleted(slot.id)}
                        disabled={!slot.selectedWorkoutData}
                      >
                        <Feather
                          name="check"
                          size={18}
                          color={
                            slot.selectedWorkoutData
                              ? slot.isCompleted
                                ? '#10b981'
                                : '#666666'
                              : '#cccccc'
                          }
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleClearSlot(slot.id)}
                        disabled={!slot.selectedWorkoutData}
                      >
                        <Feather 
                          name="x" 
                          size={18} 
                          color={slot.selectedWorkoutData ? '#ef4444' : '#cccccc'} 
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteSlot(slot.id)}
                      >
                        <Feather name="trash-2" size={16} color="#666" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Subtitle with workout summary */}
                  {slot.selectedWorkoutData && (
                    <Text style={styles.workoutSubtitle}>
                      {getWorkoutSummary(slot.selectedWorkoutData)}
                    </Text>
                  )}

                  {/* Dropdown options */}
                  {isExpanded && (
                    <View style={styles.dropdownOptions}>
                      {templatesForToday.length > 0 && (
                        <>
                          <Text style={styles.dropdownSection}>For today:</Text>
                          {templatesForToday.map((template) => (
                            <View key={template.id} style={styles.dropdownOptionRow}>
                              <TouchableOpacity
                                style={styles.dropdownOptionMain}
                                onPress={() => handleTemplateSelect(slot.id, template.id)}
                              >
                                <Text style={styles.dropdownOptionText}>
                                  {workoutTypeLabels[template.type]} · {template.name}
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.dropdownOptionDelete}
                                onPress={() => handleDeleteTemplate(template)}
                              >
                                <Feather name="trash-2" size={16} color="#ef4444" />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </>
                      )}

                      {otherTemplates.length > 0 && (
                        <>
                          <Text style={styles.dropdownSection}>Other workouts:</Text>
                          {otherTemplates.map((template) => (
                            <View key={template.id} style={styles.dropdownOptionRow}>
                              <TouchableOpacity
                                style={styles.dropdownOptionMain}
                                onPress={() => handleTemplateSelect(slot.id, template.id)}
                              >
                                <Text style={styles.dropdownOptionText}>
                                  {workoutTypeLabels[template.type]} · {template.name}
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.dropdownOptionDelete}
                                onPress={() => handleDeleteTemplate(template)}
                              >
                                <Feather name="trash-2" size={16} color="#ef4444" />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </>
                      )}

                      <TouchableOpacity
                        style={[styles.dropdownOption, styles.dropdownOptionAdd]}
                        onPress={() => handleTemplateSelect(slot.id, 'add-new')}
                      >
                        <Text style={styles.dropdownOptionAddText}>
                          + Custom workout...
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Add Workout Slot Button */}
            <TouchableOpacity
              style={styles.addSlotButton}
              onPress={handleAddSlot}
            >
              <Feather name="plus-circle" size={18} color={ACCENT} />
              <Text style={styles.addSlotButtonText}>Add workout slot</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Add/Edit Workout Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingWorkoutId ? 'Edit Workout' : isCustomWorkout ? 'New Workout' : 'Add Workout'}
              </Text>

              <Text style={styles.modalLabel}>Workout name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Bench Press"
                placeholderTextColor="#999"
                value={workoutName}
                onChangeText={setWorkoutName}
                editable={isCustomWorkout || editingWorkoutId != null}
              />

              <Text style={styles.modalLabel}>Type</Text>
              <View style={styles.typeSelector}>
                {(['strength', 'cardio', 'accessory', 'other'] as WorkoutType[]).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeButton, workoutType === type && styles.typeButtonActive]}
                    onPress={() => setWorkoutType(type)}
                  >
                    <Text style={[styles.typeButtonText, workoutType === type && styles.typeButtonTextActive]}>
                      {workoutTypeLabels[type]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalRow}>
                <View style={styles.modalHalf}>
                  <Text style={styles.modalLabel}>Sets</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="4"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    value={workoutSets}
                    onChangeText={setWorkoutSets}
                  />
                </View>
                <View style={styles.modalHalf}>
                  <Text style={styles.modalLabel}>Reps</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="10"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    value={workoutReps}
                    onChangeText={setWorkoutReps}
                  />
                </View>
              </View>

              <View style={styles.modalRow}>
                <View style={styles.modalHalf}>
                  <Text style={styles.modalLabel}>Weight (lbs)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 185"
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                    value={workoutWeight}
                    onChangeText={setWorkoutWeight}
                  />
                </View>
                <View style={styles.modalHalf}>
                  <Text style={styles.modalLabel}>Minutes{workoutType === 'cardio' ? ' *' : ''}</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="30"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    value={workoutMinutes}
                    onChangeText={setWorkoutMinutes}
                  />
                </View>
              </View>
              {workoutType === 'cardio' && (
                <Text style={styles.modalHelperText}>* Time is required for cardio</Text>
              )}

              <Text style={styles.modalLabel}>Notes</Text>
              <TextInput
                style={[styles.modalInput, styles.modalInputMultiline]}
                placeholder="Any additional notes..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                value={workoutNotes}
                onChangeText={setWorkoutNotes}
              />

              {isCustomWorkout && (
                <>
                  <Text style={styles.modalLabel}>Assign to program days</Text>
                  <View style={styles.programDaysSelector}>
                    {programDays
                      .slice()
                      .sort((a, b) => a.index - b.index)
                      .map(day => (
                      <TouchableOpacity
                        key={day.id}
                        style={[
                          styles.programDayButton,
                          selectedProgramDayIds.includes(day.id) && styles.programDayButtonActive,
                        ]}
                        onPress={() => toggleProgramDay(day.id)}
                      >
                        <Text
                          style={[
                            styles.programDayButtonText,
                            selectedProgramDayIds.includes(day.id) && styles.programDayButtonTextActive,
                          ]}
                        >
                          {day.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSaveWorkout}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  pageTitleRow: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.3,
  },
  todayInfo: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
  },
  todayInfoText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  editDaysLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
  },
  editDaysLinkText: {
    fontSize: 13,
    color: '#666',
    textDecorationLine: 'underline',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  workoutsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  workoutsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  workoutSlot: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  workoutSlotCompleted: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  slotTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dropdownButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    marginRight: 8,
    minHeight: 44,
  },
  dropdownText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 8,
  },
  dropdownOptions: {
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  dropdownSection: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  dropdownOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  dropdownOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  dropdownOptionMain: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropdownOptionDelete: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  dropdownOptionAdd: {
    borderBottomWidth: 0,
  },
  dropdownOptionAddText: {
    fontSize: 14,
    color: ACCENT,
    fontWeight: '700',
  },
  slotActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  actionButtonCompleted: {
    backgroundColor: '#dcfce7',
    borderColor: '#10b981',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoText: {
    fontSize: 12,
    color: '#666666',
  },
  completedLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noWorkoutText: {
    fontSize: 12,
    color: '#999999',
    fontStyle: 'italic',
  },
  categoryLabel: {
    fontSize: 10,
    color: '#999999',
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 6,
    marginTop: 12,
  },
  modalHelperText: {
    fontSize: 11,
    color: '#999999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#000000',
  },
  modalInputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeButton: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#F9F9F9',
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: ACCENT,
    backgroundColor: '#FFF7ED',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  typeButtonTextActive: {
    color: ACCENT,
    fontWeight: '700',
  },
  modalRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalHalf: {
    flex: 1,
  },
  programDaysSelector: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  programDayButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#F9F9F9',
  },
  programDayButtonActive: {
    borderColor: ACCENT,
    backgroundColor: '#FFF7ED',
  },
  programDayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
  },
  programDayButtonTextActive: {
    color: ACCENT,
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#666666',
  },
  saveButton: {
    backgroundColor: ACCENT,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  manageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  templateCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  templateInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  templateDaysLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  templateDaysRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToggleButtonActive: {
    borderColor: ACCENT,
    backgroundColor: ACCENT,
  },
  dayToggleButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666666',
  },
  dayToggleButtonTextActive: {
    color: '#FFFFFF',
  },
  addSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F9F9F9',
    borderWidth: 2,
    borderColor: ACCENT,
    borderStyle: 'dashed',
    marginTop: 12,
  },
  addSlotButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: ACCENT,
  },
});
