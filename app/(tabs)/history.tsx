import FitLogHeader from '@/components/FitLogHeader';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCENT = '#f97316';

export default function HistoryScreen() {
  const router = useRouter();
  
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FitLogHeader onSettingsPress={() => router.push('/settings')} />
      
      <View style={styles.screenContent}>
        <View style={styles.pageTitleRow}>
          <Text style={styles.pageTitle}>History</Text>
        </View>
        
        <View style={styles.container}>
          <Text style={styles.subtitle}>View your fitness journey</Text>
        </View>
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
  container: {
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
});
