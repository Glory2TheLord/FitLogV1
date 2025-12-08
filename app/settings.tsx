import BaselineStatsModal from '@/components/BaselineStatsModal';
import { useUser } from '@/contexts/UserContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
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

export default function SettingsScreen() {
  const router = useRouter();
  const { profile } = useUserProfile();
  const { currentUser, clearCurrentUser } = useUser();
  const [showBaselineModal, setShowBaselineModal] = useState(false);
  const { preferences, updatePreferences } = usePreferences();
  const [showPrefsModal, setShowPrefsModal] = useState(false);
  const [stepGoal, setStepGoal] = useState((preferences.dailyStepGoal ?? 0).toString());
  const [waterGoal, setWaterGoal] = useState((preferences.dailyWaterGoal ?? 0).toString());
  const [calorieGoal, setCalorieGoal] = useState((preferences.dailyCalorieGoal ?? 0).toString());
  const [proteinGoal, setProteinGoal] = useState((preferences.dailyProteinGoal ?? 0).toString());

  const handleSavePrefs = () => {
    const steps = Number(stepGoal);
    const water = Number(waterGoal);
    const cals = Number(calorieGoal);
    const protein = Number(proteinGoal);
    if (
      !Number.isFinite(steps) || steps <= 0 ||
      !Number.isFinite(water) || water <= 0 ||
      !Number.isFinite(cals) || cals <= 0 ||
      !Number.isFinite(protein) || protein <= 0
    ) {
      return;
    }
    updatePreferences({
      dailyStepGoal: Math.round(steps),
      dailyWaterGoal: water,
      dailyCalorieGoal: Math.round(cals),
      dailyProteinGoal: Math.round(protein),
    });
    setShowPrefsModal(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.settingsHeader}>
          <View style={styles.headerSide}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>{"< Back"}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.settingsTitle}>Settings</Text>
          </View>
          <View style={styles.headerSide} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Baseline Stats Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Baseline Stats</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => setShowBaselineModal(true)}
          >
            <Text style={styles.editButtonText}>Edit Baseline Stats</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.editButton, styles.prefsButton]}
            onPress={() => {
              setStepGoal((preferences.dailyStepGoal ?? 0).toString());
              setWaterGoal((preferences.dailyWaterGoal ?? 0).toString());
              setCalorieGoal((preferences.dailyCalorieGoal ?? 0).toString());
              setProteinGoal((preferences.dailyProteinGoal ?? 0).toString());
              setShowPrefsModal(true);
            }}
          >
            <Text style={styles.editButtonText}>Edit Goals</Text>
          </TouchableOpacity>
          
          {/* Show current stats summary */}
          {profile.age && (
            <View style={styles.statsSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Age:</Text>
                <Text style={styles.summaryValue}>{profile.age} years</Text>
              </View>
              {profile.sex && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Sex:</Text>
                  <Text style={styles.summaryValue}>{profile.sex}</Text>
                </View>
              )}
              {profile.heightCm && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Height:</Text>
                  <Text style={styles.summaryValue}>
                    {(() => {
                      const totalInches = Math.round(profile.heightCm / 2.54);
                      const feet = Math.floor(totalInches / 12);
                      const inches = totalInches % 12;
                      return `${feet} ft ${inches} in`;
                    })()}
                  </Text>
                </View>
              )}
              {profile.currentWeight && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Current Weight:</Text>
                  <Text style={styles.summaryValue}>{profile.currentWeight} lbs</Text>
                </View>
              )}
              {profile.goalWeight && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Goal Weight:</Text>
                  <Text style={styles.summaryValue}>{profile.goalWeight} lbs</Text>
                </View>
              )}
              {profile.maintenanceCalories && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Maintenance:</Text>
                  <Text style={styles.summaryValue}>{Math.round(profile.maintenanceCalories)} cal/day</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Profile Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile</Text>
          {currentUser && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current User</Text>
              <Text style={styles.currentUserText}>{currentUser.name}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.switchProfileButton}
            onPress={() => {
              clearCurrentUser();
              router.replace('/profileSelect');
            }}
          >
            <Text style={styles.switchProfileButtonText}>Switch Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Baseline Stats Modal */}
      <BaselineStatsModal 
        visible={showBaselineModal} 
        onClose={() => setShowBaselineModal(false)}
      />

      {/* Preferences Modal */}
      <Modal visible={showPrefsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit goals</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Daily steps goal</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={stepGoal}
                onChangeText={setStepGoal}
                placeholder="e.g. 10000"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Daily water goal (L)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={waterGoal}
                onChangeText={setWaterGoal}
                placeholder="e.g. 3"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Daily calories goal</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={calorieGoal}
                onChangeText={setCalorieGoal}
                placeholder="e.g. 1600"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Daily protein goal (g)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={proteinGoal}
                onChangeText={setProteinGoal}
                placeholder="e.g. 165"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => setShowPrefsModal(false)}>
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonPrimary} onPress={handleSavePrefs}>
                <Text style={styles.modalButtonPrimaryText}>Save</Text>
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
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFDF5',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSide: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    paddingVertical: 4,
  },
  backText: {
    fontSize: 16,
    color: ACCENT,
    fontWeight: '600',
  },
  settingsTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFDF5',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#FFFDF5',
  },
  card: {
    backgroundColor: '#FFFDF5',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: ACCENT,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editButton: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 16,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsSummary: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  currentUserText: {
    fontSize: 16,
    fontWeight: '700',
    color: ACCENT,
    padding: 12,
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  switchProfileButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  switchProfileButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#666',
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
  prefsButton: {
    marginTop: 8,
    backgroundColor: '#0F172A',
    borderColor: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFDF5',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
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
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  modalButtonSecondaryText: {
    color: '#4B5563',
    fontSize: 15,
    fontWeight: '700',
  },
});
