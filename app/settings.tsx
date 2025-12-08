import BaselineStatsModal from '@/components/BaselineStatsModal';
import { useUser } from '@/contexts/UserContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.settingsTitle}>Settings</Text>
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
                  <Text style={styles.summaryValue}>{profile.heightCm} cm</Text>
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
  backButton: {
    marginBottom: 8,
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
});
