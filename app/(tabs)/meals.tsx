import FitLogHeader from '@/components/FitLogHeader';
import { MealCategory, MealTemplate, useMealTracking } from '@/contexts/MealTrackingContext';
import { useDayMetrics } from '@/contexts/DayMetricsContext';
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

const categoryConfig: Record<MealCategory, { icon: string; label: string }> = {
  meal: { icon: '🍽️', label: 'Meal' },
  snack: { icon: '🥨', label: 'Snack' },
  cheat: { icon: '🍕', label: 'Cheat' },
};

export default function MealsScreen() {
  const router = useRouter();
  const { 
    mealTemplates, 
    setMealTemplates, 
    mealSlots, 
    setMealSlots,
    recalculateDailyTotals 
  } = useMealTracking();
  const { addHistoryEventForToday } = useDayMetrics();
  const [editingCustomMeal, setEditingCustomMeal] = useState<MealTemplate | null>(null);

  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [currentEditingSlotId, setCurrentEditingSlotId] = useState<number | null>(null);
  const [newMealName, setNewMealName] = useState('');
  const [newMealCalories, setNewMealCalories] = useState('');
  const [newMealProtein, setNewMealProtein] = useState('');
  const [newMealFat, setNewMealFat] = useState('');
  const [newMealCategory, setNewMealCategory] = useState<MealCategory>('meal');
  const [expandedSlotId, setExpandedSlotId] = useState<number | null>(null);

  // Recalculate daily totals whenever slots or templates change
  useEffect(() => {
    recalculateDailyTotals();
  }, [mealSlots, mealTemplates]);

  const handleTemplateSelect = (slotId: number, templateId: string) => {
    if (templateId === 'add-new') {
      setCurrentEditingSlotId(slotId);
      setEditingCustomMeal(null);
      setShowAddMealModal(true);
      setExpandedSlotId(null);
    } else {
      setMealSlots((prev) =>
        prev.map((slot) =>
          slot.id === slotId ? { ...slot, templateId } : slot
        )
      );
      setExpandedSlotId(null);
    }
  };

  const handleToggleCompleted = (slotId: number) => {
    setMealSlots((prev) => {
      const target = prev.find((slot) => slot.id === slotId);
      const wasCompleted = target?.completed ?? false;
      const mealsCompletedPrev = prev.filter(s => s.completed).length;
      const updated = prev.map((slot) =>
        slot.id === slotId ? { ...slot, completed: !slot.completed } : slot
      );
      const mealsCompleted = updated.filter(s => s.completed).length;
      const mealsPlanned = updated.filter(s => s.templateId !== null).length;

      if (!wasCompleted) {
        const template = getTemplateById(target?.templateId ?? null);
        addHistoryEventForToday({
          type: 'mealCompleted',
          summary: `${template?.name ?? 'Meal'} completed${template?.calories ? ` — ${template.calories} kcal` : ''}${template?.protein ? `, ${template.protein} g protein` : ''}`,
          details: {
            mealsCompleted,
            mealsPlanned,
            mealId: target?.id,
            mealName: template?.name,
            calories: template?.calories,
            proteinGrams: template?.protein,
          },
        });
      }

      const allMealsDoneBefore = mealsPlanned > 0 ? mealsCompletedPrev >= mealsPlanned : false;
      const allMealsDoneNow = mealsPlanned > 0 ? mealsCompleted >= mealsPlanned : false;

      if (!allMealsDoneBefore && allMealsDoneNow) {
        const totals = updated.reduce(
          (acc, slot) => {
            if (slot.completed && slot.templateId) {
              const t = getTemplateById(slot.templateId);
              if (t) {
                acc.calories += t.calories;
                acc.protein += t.protein;
              }
            }
            return acc;
          },
          { calories: 0, protein: 0 }
        );
        addHistoryEventForToday({
          type: 'mealsAllCompleted',
          summary: `Completed all meals (${mealsCompleted}/${mealsPlanned})`,
          details: {
            mealsCompleted,
            mealsPlanned,
            totalCaloriesForDay: totals.calories,
            totalProteinForDay: totals.protein,
          },
        });
      }

      return updated;
    });
  };

  const handleClearSlot = (slotId: number) => {
    setMealSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId
          ? { ...slot, templateId: null, completed: false }
          : slot
      )
    );
  };

  const handleSaveNewMeal = () => {
    if (!newMealName.trim() || !newMealCalories || !newMealProtein) return;
    const parsedFat = newMealFat.trim() === '' ? undefined : parseInt(newMealFat, 10);

    if (editingCustomMeal) {
      const updatedTemplate: MealTemplate = {
        ...editingCustomMeal,
        name: newMealName.trim(),
        calories: parseInt(newMealCalories, 10),
        protein: parseInt(newMealProtein, 10),
        fatGrams: parsedFat,
        category: newMealCategory,
      };

      setMealTemplates((prev) =>
        prev.map((t) => (t.id === editingCustomMeal.id ? updatedTemplate : t))
      );

      setMealSlots((prev) =>
        prev.map((slot) =>
          slot.templateId === editingCustomMeal.id ? { ...slot, templateId: updatedTemplate.id } : slot
        )
      );
    } else {
      const newTemplate: MealTemplate = {
        id: Date.now().toString(),
        name: newMealName.trim(),
        calories: parseInt(newMealCalories, 10),
        protein: parseInt(newMealProtein, 10),
        fatGrams: parsedFat,
        category: newMealCategory,
      };

      setMealTemplates((prev) => [...prev, newTemplate]);

      if (currentEditingSlotId !== null) {
        setMealSlots((prev) =>
          prev.map((slot) =>
            slot.id === currentEditingSlotId
              ? { ...slot, templateId: newTemplate.id }
              : slot
          )
        );
      }
    }

    setShowAddMealModal(false);
    setNewMealName('');
    setNewMealCalories('');
    setNewMealProtein('');
    setNewMealFat('');
    setNewMealCategory('meal');
    setCurrentEditingSlotId(null);
    setEditingCustomMeal(null);
  };

  const handleCancelAddMeal = () => {
    setShowAddMealModal(false);
    setNewMealName('');
    setNewMealCalories('');
    setNewMealProtein('');
    setNewMealFat('');
    setNewMealCategory('meal');
    setCurrentEditingSlotId(null);
    setEditingCustomMeal(null);
  };

  const deleteMealTemplate = (templateId: string) => {
    const template = mealTemplates.find((t) => t.id === templateId);
    if (!template) return;

    Alert.alert(
      'Delete saved meal?',
      `This will remove "${template.name}" from your saved meals and clear it from any slots using it. Are you sure?`,
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, delete',
          style: 'destructive',
          onPress: () => {
            // Remove from templates
            setMealTemplates((prev) => prev.filter((t) => t.id !== templateId));
            
            // Clear any slots using this template
            setMealSlots((prev) =>
              prev.map((slot) =>
                slot.templateId === templateId
                  ? { ...slot, templateId: null, completed: false }
                  : slot
              )
            );
            setEditingCustomMeal(null);
          },
        },
      ]
    );
  };

  const handleEditCustomMeal = (template: MealTemplate) => {
    setEditingCustomMeal(template);
    setCurrentEditingSlotId(null);
    setNewMealName(template.name);
    setNewMealCalories(String(template.calories));
    setNewMealProtein(String(template.protein));
    setNewMealFat(template.fatGrams != null ? String(template.fatGrams) : '');
    setNewMealCategory(template.category);
    setShowAddMealModal(true);
  };

  const getTemplateById = (id: string | null) => {
    if (!id) return null;
    return mealTemplates.find((t) => t.id === id) || null;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FitLogHeader onSettingsPress={() => router.push('/settings')} />
      
      <View style={styles.screenContent}>
        <View style={styles.pageTitleRow}>
          <Text style={styles.pageTitle}>Meals</Text>
        </View>
        
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.mealsCard}>
          <Text style={styles.mealsTitle}>Meals</Text>

          {mealSlots.map((slot) => {
            const template = getTemplateById(slot.templateId);
            const isExpanded = expandedSlotId === slot.id;

            return (
              <View
                key={slot.id}
                style={[
                  styles.mealSlot,
                  slot.completed && styles.mealSlotCompleted,
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
                      {template 
                        ? `${categoryConfig[template.category].icon} ${categoryConfig[template.category].label} · ${template.name}`
                        : 'Select meal'}
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
                        slot.completed && styles.actionButtonCompleted,
                      ]}
                      onPress={() => handleToggleCompleted(slot.id)}
                      disabled={!slot.templateId}
                    >
                      <Feather
                        name="check"
                        size={18}
                        color={
                          slot.templateId
                            ? slot.completed
                              ? '#10b981'
                              : '#666666'
                            : '#cccccc'
                        }
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleClearSlot(slot.id)}
                    >
                      <Feather name="x" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Dropdown options */}
                {isExpanded && (
                  <View style={styles.dropdownOptions}>
                    {mealTemplates.map((temp) => (
                      <View key={temp.id} style={styles.dropdownOptionRow}>
                        <TouchableOpacity
                          style={styles.dropdownOptionMain}
                          onPress={() => handleTemplateSelect(slot.id, temp.id)}
                        >
                          <Text style={styles.dropdownOptionText}>
                            {categoryConfig[temp.category].icon} {categoryConfig[temp.category].label} · {temp.name}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.dropdownOptionEdit}
                          onPress={() => handleEditCustomMeal(temp)}
                        >
                          <Feather name="edit-2" size={16} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.dropdownOptionDelete}
                          onPress={() => deleteMealTemplate(temp.id)}
                        >
                          <Feather name="trash-2" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TouchableOpacity
                      style={[styles.dropdownOption, styles.dropdownOptionAdd]}
                      onPress={() => handleTemplateSelect(slot.id, 'add-new')}
                    >
                      <Text style={styles.dropdownOptionAddText}>
                        + Add Meal…
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Info line */}
                {template ? (
                  <View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoText}>
                        <Text style={styles.infoNumber}>{template.calories}</Text> cal
                        {' | '}
                        <Text style={styles.infoNumber}>{template.protein}</Text> g protein
                        {template.fatGrams != null && (
                          <>
                            {' | '}
                            <Text style={styles.infoNumber}>{template.fatGrams}</Text> g fat
                          </>
                        )}
                      </Text>
                      {slot.completed && (
                        <Text style={styles.completedLabel}>Completed</Text>
                      )}
                    </View>
                    <Text style={styles.categoryLabel}>
                      {categoryConfig[template.category].label}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.noMealText}>
                    No meal selected for this slot
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Add Meal Modal */}
      <Modal
        visible={showAddMealModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelAddMeal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Meal</Text>

            <Text style={styles.inputLabel}>Meal Name</Text>
            <TextInput
              style={styles.input}
              value={newMealName}
              onChangeText={setNewMealName}
              placeholder="e.g. Chicken & Rice"
              placeholderTextColor="#999999"
            />

            <Text style={styles.inputLabel}>Calories</Text>
            <TextInput
              style={styles.input}
              value={newMealCalories}
              onChangeText={setNewMealCalories}
              placeholder="e.g. 450"
              keyboardType="numeric"
              placeholderTextColor="#999999"
            />

            <Text style={styles.inputLabel}>Protein (g)</Text>
            <TextInput
              style={styles.input}
              value={newMealProtein}
              onChangeText={setNewMealProtein}
              placeholder="e.g. 35"
              keyboardType="numeric"
              placeholderTextColor="#999999"
            />

            <Text style={styles.inputLabel}>Fat (g)</Text>
            <TextInput
              style={styles.input}
              value={newMealFat}
              onChangeText={setNewMealFat}
              placeholder="Optional"
              keyboardType="numeric"
              placeholderTextColor="#999999"
            />

            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categorySelector}>
              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  newMealCategory === 'meal' && styles.categoryButtonActive,
                ]}
                onPress={() => setNewMealCategory('meal')}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    newMealCategory === 'meal' && styles.categoryButtonTextActive,
                  ]}
                >
                  {categoryConfig.meal.icon} {categoryConfig.meal.label}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  newMealCategory === 'snack' && styles.categoryButtonActive,
                ]}
                onPress={() => setNewMealCategory('snack')}
              >
                <View style={styles.categoryButtonTextWrap}>
                  <Text
                    style={[
                      styles.categoryButtonText,
                      newMealCategory === 'snack' && styles.categoryButtonTextActive,
                    ]}
                  >
                    {categoryConfig.snack.icon}
                  </Text>
                  <Text
                    style={[
                      styles.categoryButtonText,
                      newMealCategory === 'snack' && styles.categoryButtonTextActive,
                    ]}
                  >
                    {categoryConfig.snack.label}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  newMealCategory === 'cheat' && styles.categoryButtonActive,
                ]}
                onPress={() => setNewMealCategory('cheat')}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    newMealCategory === 'cheat' && styles.categoryButtonTextActive,
                  ]}
                >
                  {categoryConfig.cheat.icon} {categoryConfig.cheat.label}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelAddMeal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveNewMeal}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>
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
    paddingTop: 8,
  },
  pageTitleRow: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  mealsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  mealsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  mealSlot: {
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
  mealSlotCompleted: {
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
  dropdownOptionEdit: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownOptionDelete: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
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
  infoNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
  },
  completedLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noMealText: {
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

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#000000',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666666',
    marginBottom: 6,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#FFFFFF',
  },
  categorySelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  categoryButtonActive: {
    borderColor: ACCENT,
    backgroundColor: '#fff7ed',
  },
  categoryButtonTextWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
  },
  categoryButtonTextActive: {
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
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#666666',
  },
  saveButton: {
    backgroundColor: ACCENT,
    borderWidth: 2,
    borderColor: '#000000',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
