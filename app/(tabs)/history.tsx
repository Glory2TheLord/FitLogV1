import FitLogHeader from '@/components/FitLogHeader';
import { useHistory, useDayMetrics } from '@/contexts/DayMetricsContext';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCENT = '#f97316';

export default function HistoryScreen() {
  const router = useRouter();
  const history = useHistory();
  const { deleteHistoryEntry } = useDayMetrics();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState('');

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => b.id.localeCompare(a.id)),
    [history]
  );

  const formatDate = (dateKey: string) => {
    const parsed = new Date(`${dateKey}T00:00:00`);
    return parsed.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const openDeleteModal = (id: string) => {
    setDeleteTargetId(id);
    setDeleteInput('');
  };

  const closeDeleteModal = () => {
    setDeleteTargetId(null);
    setDeleteInput('');
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetId) return;
    deleteHistoryEntry(deleteTargetId);
    closeDeleteModal();
    Alert.alert('Deleted', 'This day has been removed from your history.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FitLogHeader onSettingsPress={() => router.push('/settings')} />
      
      <View style={styles.screenContent}>
        <View style={styles.pageTitleRow}>
          <Text style={styles.pageTitle}>History</Text>
        </View>
        
        {sortedHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.subtitle}>No days logged yet. Complete a day to see it here.</Text>
          </View>
        ) : (
          <FlatList
            data={sortedHistory}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/history/[dayId]',
                      params: { dayId: item.id },
                    })
                  }
                  style={styles.cardBody}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardDate}>{formatDate(item.id)}</Text>
                  </View>
                  {(() => {
                    const allGoalsReached = item.allGoalsReached ?? item.isDayComplete;
                    const missedGoals = item.missedGoals ?? [];
                    const statusText = !item.isDayComplete
                      ? 'Day incomplete'
                      : allGoalsReached
                      ? 'Day complete'
                      : 'Day complete (goals missed)';
                    const statusStyle = !item.isDayComplete
                      ? styles.cardStatusIncomplete
                      : allGoalsReached
                      ? styles.cardStatusComplete
                      : styles.cardStatusPartial;
                    return (
                      <>
                        <Text
                          style={[
                            styles.cardStatus,
                            statusStyle,
                          ]}
                        >
                          {statusText}
                        </Text>
                        {!allGoalsReached && item.isDayComplete && missedGoals.length > 0 && (
                          <Text style={styles.cardMissed}>Missed: {missedGoals.join(', ')}</Text>
                        )}
                      </>
                    );
                  })()}
                  <Text style={styles.cardSummary}>
                    Steps: {item.steps}/{item.stepGoal} · Protein: {item.protein}/{item.proteinGoal}
                  </Text>
                  <Text style={styles.cardSubSummary}>
                    Calories: {item.calories}/{item.calorieGoal} · Water: {item.water}L/{item.waterGoal}L
                  </Text>
                  <Text style={styles.cardMeta}>
                    {item.didWeighIn ? 'Weigh-in ✔  ' : ''}
                    {item.didPhotos ? 'Photos ✔' : ''}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openDeleteModal(item.id)} style={styles.deleteButtonInline}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>

      <Modal
        visible={!!deleteTargetId}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete this day?</Text>
            <Text style={styles.modalBody}>
              This will permanently delete all logged data for this day from your history. This cannot be undone.
            </Text>
            <Text style={styles.modalPrompt}>Type DELETE to confirm</Text>
            <TextInput
              value={deleteInput}
              onChangeText={setDeleteInput}
              placeholder="DELETE"
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={closeDeleteModal}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  deleteInput === 'DELETE' ? styles.deleteButtonEnabled : styles.deleteButtonDisabled,
                ]}
                onPress={handleConfirmDelete}
                disabled={deleteInput !== 'DELETE'}
              >
                <Text style={styles.deleteButtonText}>Confirm delete</Text>
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFFDF5',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  listContent: {
    paddingBottom: 24,
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
  cardBody: {
    paddingBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  deleteText: {
    fontSize: 14,
    color: ACCENT,
    fontWeight: '600',
  },
  deleteButtonInline: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  cardStatus: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  cardStatusComplete: {
    color: '#16a34a',
  },
  cardStatusPartial: {
    color: '#f97316',
  },
  cardStatusIncomplete: {
    color: '#9ca3af',
  },
  cardMissed: {
    marginTop: 2,
    fontSize: 13,
    color: '#f97316',
    fontWeight: '600',
  },
  cardSummary: {
    marginTop: 6,
    fontSize: 14,
    color: '#0F172A',
  },
  cardSubSummary: {
    marginTop: 2,
    fontSize: 13,
    color: '#334155',
  },
  cardMeta: {
    marginTop: 6,
    fontSize: 12,
    color: '#475569',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 420,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 12,
  },
  modalPrompt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#E2E8F0',
  },
  cancelText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  deleteButtonEnabled: {
    backgroundColor: ACCENT,
    marginLeft: 8,
  },
  deleteButtonDisabled: {
    backgroundColor: '#F2E9D8',
    marginLeft: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
