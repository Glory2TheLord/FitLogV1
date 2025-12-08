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

import { useUserProfile } from '@/contexts/UserProfileContext';

const BACKGROUND = '#0B0F19';
const CARD = '#131A2A';
const TEXT = '#F8FAFC';
const MUTED = '#94A3B8';
const ACCENT = '#f97316';

export default function BaselineStatsScreen() {
  const router = useRouter();
  const { activeProfile, updateBaselineStats } = useUserProfile();

  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [age, setAge] = useState(
    activeProfile?.baselineStats?.age?.toString() ?? ''
  );

  useEffect(() => {
    if (!activeProfile) {
      router.replace('/profileSelect');
    }

    if (activeProfile?.baselineStats) {
      const totalInches = activeProfile.baselineStats.heightCm / 2.54;
      const feetVal = Math.floor(totalInches / 12);
      const inchesVal = Math.round(totalInches - feetVal * 12);
      const lbsVal = Math.round(activeProfile.baselineStats.weightKg * 2.20462);

      setHeightFeet(feetVal.toString());
      setHeightInches(inchesVal.toString());
      setWeightLbs(lbsVal.toString());
      setAge(activeProfile.baselineStats.age.toString());
    }
  }, [activeProfile, router]);

  const handleSave = () => {
    if (!activeProfile) return;

    const feetVal = Number(heightFeet);
    const inchesVal = Number(heightInches);
    const lbsVal = Number(weightLbs);
    const ageVal = Number(age);

    if (
      !Number.isFinite(feetVal) ||
      !Number.isFinite(inchesVal) ||
      !Number.isFinite(lbsVal) ||
      !Number.isFinite(ageVal) ||
      feetVal < 0 ||
      inchesVal < 0 ||
      lbsVal <= 0 ||
      ageVal <= 0
    ) {
      Alert.alert('Invalid info', 'Please enter valid numbers for height, weight, and age.');
      return;
    }

    const totalInches = feetVal * 12 + inchesVal;
    if (totalInches <= 0) {
      Alert.alert('Invalid height', 'Please enter a valid height.');
      return;
    }

    const heightCm = Math.round(totalInches * 2.54);
    const weightKg = Math.round((lbsVal / 2.20462) * 10) / 10;

    updateBaselineStats(activeProfile.id, {
      heightCm,
      weightKg,
      age: ageVal,
    });

    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Baseline Stats</Text>
        <Text style={styles.subtitle}>
          We use your height, weight, and age to estimate calories burned and to tailor your workout and nutrition goals. This helps FitLog track your progress more accurately.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Height</Text>
          <View style={styles.row}>
            <View style={styles.halfInputWrapper}>
              <Text style={styles.subLabel}>Height (ft)</Text>
              <TextInput
                value={heightFeet}
                onChangeText={setHeightFeet}
                keyboardType="numeric"
                placeholder="e.g. 5"
                placeholderTextColor={MUTED}
                style={styles.input}
                returnKeyType="next"
              />
            </View>
            <View style={styles.halfInputWrapper}>
              <Text style={styles.subLabel}>Height (in)</Text>
              <TextInput
                value={heightInches}
                onChangeText={setHeightInches}
                keyboardType="numeric"
                placeholder="e.g. 10"
                placeholderTextColor={MUTED}
                style={styles.input}
                returnKeyType="next"
              />
            </View>
          </View>

          <Text style={styles.label}>Weight (lbs)</Text>
          <TextInput
            value={weightLbs}
            onChangeText={setWeightLbs}
            keyboardType="numeric"
            placeholder="e.g. 180"
            placeholderTextColor={MUTED}
            style={styles.input}
            returnKeyType="next"
          />

          <Text style={styles.label}>Age</Text>
          <TextInput
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            placeholder="e.g. 30"
            placeholderTextColor={MUTED}
            style={styles.input}
            returnKeyType="done"
          />

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveButtonText}>Save baseline</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    color: TEXT,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    gap: 8,
  },
  label: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT,
    fontSize: 16,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInputWrapper: {
    flex: 1,
  },
  subLabel: {
    color: MUTED,
    fontSize: 12,
    marginBottom: 6,
  },
  saveButton: {
    marginTop: 12,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#0b0f19',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
