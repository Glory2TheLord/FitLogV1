import FitLogHeader from '@/components/FitLogHeader';
import { useProgramDays } from '@/contexts/ProgramDaysContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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

export default function ProgramDaysScreen() {
  const router = useRouter();
  const { programDays, addProgramDay, updateProgramDay } = useProgramDays();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newDayName, setNewDayName] = useState('');

  const handleEditDay = (dayId: string, currentName: string) => {
    setEditingDayId(dayId);
    setEditingName(currentName);
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingName.trim() || !editingDayId) {
      Alert.alert('Required', 'Please enter a day name.');
      return;
    }

    updateProgramDay(editingDayId, { name: editingName.trim() });
    setEditingDayId(null);
    setEditingName('');
    setShowEditModal(false);
  };

  const handleAddDay = () => {
    setNewDayName('');
    setShowAddModal(true);
  };

  const handleSaveAdd = () => {
    if (!newDayName.trim()) {
      Alert.alert('Required', 'Please enter a day name.');
      return;
    }

    addProgramDay(newDayName.trim());
    setNewDayName('');
    setShowAddModal(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FitLogHeader onSettingsPress={() => router.push('/settings')} />

      <View style={styles.screenContent}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Program Days</Text>
          <View style={styles.backButton} />
        </View>

        <Text style={styles.subtitle}>
          Manage your training split. Rename days or add more to customize your program.
        </Text>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {programDays
            .slice()
            .sort((a, b) => a.index - b.index)
            .map(day => (
              <TouchableOpacity
                key={day.id}
                style={styles.dayCard}
                onPress={() => handleEditDay(day.id, day.name)}
                activeOpacity={0.7}
              >
                <View style={styles.dayCardContent}>
                  <Text style={styles.dayCardTitle}>
                    Day {day.index} – {day.name}
                  </Text>
                </View>
                <Feather name="edit-2" size={18} color="#666666" />
              </TouchableOpacity>
            ))}

          <TouchableOpacity style={styles.addButton} onPress={handleAddDay}>
            <Feather name="plus" size={20} color={ACCENT} />
            <Text style={styles.addButtonText}>Add program day</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Program Day</Text>

            <Text style={styles.modalLabel}>
              Day {programDays.find(d => d.id === editingDayId)?.index} name
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Chest & Tris"
              placeholderTextColor="#999"
              value={editingName}
              onChangeText={setEditingName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Program Day</Text>

            <Text style={styles.modalLabel}>Day name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Cardio Only"
              placeholderTextColor="#999"
              value={newDayName}
              onChangeText={setNewDayName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveAdd}
              >
                <Text style={styles.saveButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayCardContent: {
    flex: 1,
  },
  dayCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 2,
    borderColor: ACCENT,
    borderStyle: 'dashed',
    gap: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: ACCENT,
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
  },
  modalInput: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#000000',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
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
});
