import BaselineStatsModal from '@/components/BaselineStatsModal';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { Text } from 'react-native';

export default function BaselineStatsScreen() {
  const router = useRouter();
  const { activeProfile, updateBaselineStats } = useUserProfile();

  useEffect(() => {
    if (!activeProfile) {
      router.replace('/profileSelect');
    }
  }, [activeProfile, router]);

  const loginLabel = useMemo(() => {
    const baseStyle = {
      fontSize: 16,
      fontWeight: '800' as const,
      color: '#FFFFFF',
      letterSpacing: 0.3,
    };
    return (
      <Text style={baseStyle}>
        <Text style={{ ...baseStyle, color: '#0b0f19' }}>Log</Text>
        <Text style={baseStyle}>in</Text>
      </Text>
    );
  }, []);

  if (!activeProfile) return null;

  return (
    <BaselineStatsModal
      visible
      onClose={() => router.replace('/profileSelect')}
      onSaved={() => router.replace('/(tabs)')}
      onSaveBaseline={(stats) => updateBaselineStats(activeProfile.id, stats)}
      showCancelButton={false}
      primaryButtonContent={loginLabel}
    />
  );
}
