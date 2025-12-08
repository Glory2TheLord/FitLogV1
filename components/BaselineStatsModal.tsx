import { ActivityLevel, useUserProfile } from '@/contexts/UserProfileContext';
import React, { ReactNode, useEffect, useState } from 'react';
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

const ACCENT = '#f97316';

type BaselineStatsModalProps = {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
  onSaveBaseline?: (stats: { heightCm: number; weightKg: number; age: number }) => void;
  primaryButtonContent?: ReactNode;
  showCancelButton?: boolean;
};

export default function BaselineStatsModal({
  visible,
  onClose,
  onSaved,
  onSaveBaseline,
  primaryButtonContent,
  showCancelButton = true,
}: BaselineStatsModalProps) {

  const { profile, updateProfile, recomputeMaintenance } = useUserProfile();

  // Convert stored heightCm to feet/inches for initial form state
  function cmToFeetInches(cm: number | null): { feet: number | '', inches: number | '' } {
    if (!cm || isNaN(cm)) return { feet: '', inches: '' };
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  }

  function feetInchesToCm(feet: number | '', inches: number | ''): number {
    const totalInches = (Number(feet) || 0) * 12 + (Number(inches) || 0);
    return totalInches * 2.54;
  }

  // Local state for form inputs
  const [age, setAge] = useState(profile.age?.toString() ?? '');
  const [sex, setSex] = useState<'male' | 'female' | 'other' | null>(profile.sex);
  const initialHeight = cmToFeetInches(profile.heightCm);
  const [heightFeet, setHeightFeet] = useState<number | ''>(initialHeight.feet);
  const [heightInches, setHeightInches] = useState<number | ''>(initialHeight.inches);
  const [startingWeight, setStartingWeight] = useState(profile.startingWeight?.toString() ?? '');
  const [currentWeight, setCurrentWeight] = useState(profile.currentWeight?.toString() ?? '');
  const [goalWeight, setGoalWeight] = useState(profile.goalWeight?.toString() ?? '');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activityLevel);

  // Live maintenance calories preview
  const [maintenancePreview, setMaintenancePreview] = useState<number | null>(profile.maintenanceCalories ?? null);

  // Update form when profile changes
  useEffect(() => {
    setAge(profile.age?.toString() ?? '');
    setSex(profile.sex);
    const h = cmToFeetInches(profile.heightCm);
    setHeightFeet(h.feet);
    setHeightInches(h.inches);
    setStartingWeight(profile.startingWeight?.toString() ?? '');
    setCurrentWeight(profile.currentWeight?.toString() ?? '');
    setGoalWeight(profile.goalWeight?.toString() ?? '');
    setActivityLevel(profile.activityLevel);
    setMaintenancePreview(profile.maintenanceCalories ?? null);
  }, [profile]);

  // Helper for maintenance calculation (same as in context)
  function calculateMaintenanceCalories({ age, sex, heightCm, currentWeight, activityLevel }: {
    age: number | null;
    sex: 'male' | 'female' | 'other' | null;
    heightCm: number | null;
    currentWeight: number | null;
    activityLevel: ActivityLevel;
  }): number | null {
    if (!age || !sex || !heightCm || !currentWeight) return null;
    const weightKg = currentWeight / 2.20462;
    let bmr: number;
    if (sex === 'male') {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    } else if (sex === 'female') {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    } else {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    }
    const factorByLevel: Record<ActivityLevel, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    return Math.round(bmr * factorByLevel[activityLevel]);
  }

  // Recalculate maintenance preview on form change
  useEffect(() => {
    const ageNum = parseInt(age, 10);
    const heightCmVal = feetInchesToCm(heightFeet, heightInches);
    const currentWeightNum = parseFloat(currentWeight);
    const preview = calculateMaintenanceCalories({
      age: isNaN(ageNum) ? null : ageNum,
      sex,
      heightCm: isNaN(heightCmVal) ? null : heightCmVal,
      currentWeight: isNaN(currentWeightNum) ? null : currentWeightNum,
      activityLevel,
    });
    setMaintenancePreview(preview);
  }, [age, sex, heightFeet, heightInches, currentWeight, activityLevel]);

  const handleSave = () => {
    // Validate required fields
    if (!age || !sex || heightFeet === '' || heightInches === '' || !currentWeight || !goalWeight) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    // Parse numeric inputs
    const ageNum = parseInt(age, 10);
    const feetNum = Number(heightFeet);
    const inchesNum = Number(heightInches);
    const startingWeightNum = startingWeight ? parseFloat(startingWeight) : parseFloat(currentWeight);
    const currentWeightNum = parseFloat(currentWeight);
    const goalWeightNum = parseFloat(goalWeight);

    // Validate numbers
    if (
      isNaN(ageNum) ||
      isNaN(feetNum) ||
      isNaN(inchesNum) ||
      isNaN(currentWeightNum) ||
      isNaN(goalWeightNum) ||
      feetNum < 0 || feetNum > 8 ||
      inchesNum < 0 || inchesNum > 11
    ) {
      Alert.alert('Invalid Input', 'Please enter valid numbers for age, height (feet 0-8, inches 0-11), and weights.');
      return;
    }

    // Convert feet/inches to cm
    const heightCmVal = feetInchesToCm(feetNum, inchesNum);

  // Update profile
  updateProfile({
    age: ageNum,
    sex,
    heightCm: heightCmVal,
      startingWeight: startingWeightNum,
      currentWeight: currentWeightNum,
      goalWeight: goalWeightNum,
      activityLevel,
    });

    // Recompute maintenance calories
  recomputeMaintenance();

  // Close modal and trigger callback
  const weightKgVal = currentWeightNum / 2.20462;
  if (!isNaN(weightKgVal)) {
    onSaveBaseline?.({
      heightCm: heightCmVal,
      weightKg: Math.round(weightKgVal * 10) / 10,
      age: ageNum,
    });
  }
  onClose();
  onSaved?.();
};

  const activityLabels: Record<ActivityLevel, string> = {
    sedentary: 'Sedentary (little/no exercise)',
    light: 'Light (1-3 days/week)',
    moderate: 'Moderate (3-5 days/week)',
    active: 'Active (6-7 days/week)',
    very_active: 'Very Active (intense daily)',
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Baseline Stats</Text>
          <Text style={styles.description}>
            We use these details to estimate your maintenance calories, set your starting point,
            and make your progress tracking more accurate.
          </Text>
          <Text style={styles.subtitle}>Set up your profile to calculate goals</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Age */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age *</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              placeholder="Enter age"
              placeholderTextColor="#999"
            />
          </View>

          {/* Sex */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sex *</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segment, sex === 'male' && styles.segmentActive]}
                onPress={() => setSex('male')}
              >
                <Text style={[styles.segmentText, sex === 'male' && styles.segmentTextActive]}>
                  Male
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segment, sex === 'female' && styles.segmentActive]}
                onPress={() => setSex('female')}
              >
                <Text style={[styles.segmentText, sex === 'female' && styles.segmentTextActive]}>
                  Female
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segment, sex === 'other' && styles.segmentActive]}
                onPress={() => setSex('other')}
              >
                <Text style={[styles.segmentText, sex === 'other' && styles.segmentTextActive]}>
                  Other
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Height (Feet + Inches) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Height *</Text>
            <View style={styles.heightRow}>
              <View style={styles.heightCol}>
                <TextInput
                  style={styles.input}
                  value={heightFeet === '' ? '' : String(heightFeet)}
                  onChangeText={val => {
                    const num = val.replace(/[^0-9]/g, '');
                    setHeightFeet(num === '' ? '' : Math.max(0, Math.min(8, Number(num))));
                  }}
                  keyboardType="numeric"
                  placeholder="ft"
                  placeholderTextColor="#999"
                  maxLength={1}
                />
                <Text style={styles.heightLabel}>ft</Text>
              </View>
              <View style={styles.heightCol}>
                <TextInput
                  style={styles.input}
                  value={heightInches === '' ? '' : String(heightInches)}
                  onChangeText={val => {
                    const num = val.replace(/[^0-9]/g, '');
                    setHeightInches(num === '' ? '' : Math.max(0, Math.min(11, Number(num))));
                  }}
                  keyboardType="numeric"
                  placeholder="in"
                  placeholderTextColor="#999"
                  maxLength={2}
                />
                <Text style={styles.heightLabel}>in</Text>
              </View>
            </View>
          </View>
          {/* Maintenance Calories Preview */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Estimated Maintenance</Text>
            <Text style={styles.maintenancePreview}>
              {maintenancePreview ? `${maintenancePreview} kcal/day` : '--'}
            </Text>
          </View>

          {/* Current Weight */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Weight (lbs) *</Text>
            <TextInput
              style={styles.input}
              value={currentWeight}
              onChangeText={setCurrentWeight}
              keyboardType="numeric"
              placeholder="e.g. 165"
              placeholderTextColor="#999"
            />
          </View>

          {/* Starting Weight */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Starting Weight (lbs)</Text>
            <TextInput
              style={styles.input}
              value={startingWeight}
              onChangeText={setStartingWeight}
              keyboardType="numeric"
              placeholder="Leave empty to use current weight"
              placeholderTextColor="#999"
            />
          </View>

          {/* Goal Weight */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Goal Weight (lbs) *</Text>
            <TextInput
              style={styles.input}
              value={goalWeight}
              onChangeText={setGoalWeight}
              keyboardType="numeric"
              placeholder="e.g. 155"
              placeholderTextColor="#999"
            />
          </View>

          {/* Activity Level */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Activity Level *</Text>
            <View style={styles.activityList}>
              {(Object.keys(activityLabels) as ActivityLevel[]).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.activityOption,
                    activityLevel === level && styles.activityOptionActive,
                  ]}
                  onPress={() => setActivityLevel(level)}
                >
                  <Text
                    style={[
                      styles.activityOptionText,
                      activityLevel === level && styles.activityOptionTextActive,
                    ]}
                  >
                    {activityLabels[level]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            {showCancelButton && (
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              {primaryButtonContent ? (
                primaryButtonContent
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  description: {
    marginTop: 8,
    marginBottom: 16,
    fontSize: 13,
    color: '#555',
    textAlign: 'left',
  },
    heightRow: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    heightCol: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    heightLabel: {
      fontSize: 15,
      color: '#666',
      marginLeft: 4,
      fontWeight: '600',
    },
    maintenancePreview: {
      fontSize: 18,
      fontWeight: '700',
      color: ACCENT,
      marginTop: 4,
    },
  container: {
    flex: 1,
    backgroundColor: '#FFFDF5',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#FAFAFA',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  segmentActive: {
    backgroundColor: ACCENT,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  activityList: {
    gap: 8,
  },
  activityOption: {
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
  },
  activityOptionActive: {
    borderColor: ACCENT,
    backgroundColor: '#FFF7ED',
  },
  activityOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activityOptionTextActive: {
    color: ACCENT,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
});
