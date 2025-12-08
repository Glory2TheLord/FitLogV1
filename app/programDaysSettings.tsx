import FitLogHeader from '@/components/FitLogHeader';
import { useProgramDays } from '@/contexts/ProgramDaysContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCENT = '#f97316';

export default function ProgramDaysSettingsScreen() {
  const router = useRouter();
  const { programDays, updateProgramDay, addProgramDay, removeProgramDay } = useProgramDays();

  // Local state for editing
  const [editedNames, setEditedNames] = useState<Record<string, string>>(
    programDays.reduce((acc, day) => {
      acc[day.id] = day.name;
      return acc;
    }, {} as Record<string, string>)
  );

  // Sync editedNames when programDays changes (e.g., new day added)
  useEffect(() => {
    setEditedNames(prev => {
      const updated = { ...prev };
      programDays.forEach(day => {
        if (!(day.id in updated)) {
          updated[day.id] = day.name;
        }
      });
      return updated;
    });
  }, [programDays]);

  const handleSave = () => {
    // Update each day with its new name
    programDays.forEach(day => {
      const newName = editedNames[day.id]?.trim();
      if (newName && newName !== day.name) {
        updateProgramDay(day.id, { name: newName });
      }
    });

    Alert.alert('Saved', 'Training day labels have been updated.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const handleToggleActive = (dayId: string, currentActive: boolean) => {
    updateProgramDay(dayId, { isActive: !currentActive });
  };

  const handleAddDay = () => {
    // Calculate next index
    const maxIndex = Math.max(...programDays.map(d => d.index), 0);
    const nextIndex = maxIndex + 1;
    const defaultName = `New day`;
    
    // Create new day with default name (context handles ID and persistence)
    addProgramDay(defaultName);
    
    Alert.alert(
      'Day Added',
      `Day ${nextIndex} has been added. You can edit its name below.`,
      [{ text: 'OK' }]
    );
  };

  const handleRemoveDay = (dayId: string, dayName: string) => {
    Alert.alert(
      'Remove Day',
      `Remove "${dayName}" from your training program? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeProgramDay(dayId);
            setEditedNames(prev => {
              const newState = { ...prev };
              delete newState[dayId];
              return newState;
            });
          },
        },
      ]
    );
  };

  const sortedDays = [...programDays].sort((a, b) => a.index - b.index);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FitLogHeader />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Training Days</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.description}>
          Customize your training split. Toggle days on/off to include them in your rotation, edit names, or add/remove days.
        </Text>

        {sortedDays.map(day => (
          <View key={day.id} style={styles.dayRow}>
            <View style={styles.dayRowLeft}>
              <TouchableOpacity
                onPress={() => handleToggleActive(day.id, day.isActive)}
                style={styles.checkbox}
              >
                <View style={[styles.checkboxInner, day.isActive && styles.checkboxActive]}>
                  {day.isActive && <Feather name="check" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
              <Text style={[styles.dayLabel, !day.isActive && styles.dayLabelInactive]}>
                Day {day.index}
              </Text>
              <TextInput
                style={[styles.input, !day.isActive && styles.inputInactive]}
                value={editedNames[day.id] || ''}
                onChangeText={text => setEditedNames(prev => ({ ...prev, [day.id]: text }))}
                placeholder={`Enter name for Day ${day.index}`}
                placeholderTextColor="#999"
                editable={day.isActive}
              />
            </View>
            {programDays.length > 1 && (
              <TouchableOpacity
                onPress={() => handleRemoveDay(day.id, day.name)}
                style={styles.removeButton}
              >
                <Feather name="trash-2" size={18} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={handleAddDay}>
          <Feather name="plus" size={20} color={ACCENT} />
          <Text style={styles.addButtonText}>Add Day</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFDF5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 20,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  dayRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    padding: 4,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#DDD',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  checkboxActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    width: 60,
  },
  dayLabelInactive: {
    color: '#999',
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#000',
  },
  inputInactive: {
    backgroundColor: '#F5F5F5',
    color: '#999',
  },
  removeButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: ACCENT,
    borderStyle: 'dashed',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: ACCENT,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
