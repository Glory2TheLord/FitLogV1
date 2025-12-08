import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FitLogUser, useUser } from '../contexts/UserContext';

const ORANGE = '#F97316';
const CREAM = '#FFF7EA';

const ProfileSelectScreen: React.FC = () => {
  const [profileName, setProfileName] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { users, addUser, setCurrentUser, deleteUser } = useUser();
  const router = useRouter();

  // Select profile from dropdown
  const handleSelectProfile = (profile: FitLogUser) => {
    setProfileName(profile.name);
    setDropdownOpen(false);
  };

  // Delete profile logic
  const handleDeleteProfile = (profile: FitLogUser) => {
    Alert.alert(
      'Delete profile?',
      `Are you sure you want to delete "${profile.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteUser(profile.id);
            if (profileName === profile.name) setProfileName('');
          },
        },
      ]
    );
  };

  // Main button logic
  const handleContinue = () => {
    const trimmedName = profileName.trim();

    if (!trimmedName) {
      Alert.alert('Profile required', 'Please enter a profile name or select one.');
      return;
    }

    // Check if a profile already exists with this name (case-insensitive)
    const existing = users.find(
      (u) => u.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existing) {
      setCurrentUser(existing.id);
      const hasBaseline = !!existing.baselineStats;
      router.replace(hasBaseline ? '/(tabs)' : '/baselineStats');
      return;
    }

    // New profile: create it and open baseline stats
    const newUser = addUser(trimmedName);
    if (newUser) {
      setCurrentUser(newUser.id);
      router.replace('/baselineStats');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centeredHeader}>
          <Image
            source={require('../assets/fitlog-logo2.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.taglineRow}>
            <Text style={styles.taglineText}>Track it. All in one place</Text>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
        </View>
        <View style={styles.profileCard}>
          <Text style={styles.profileLabel}>Profile</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            activeOpacity={0.8}
            onPress={() => setDropdownOpen((open) => !open)}
          >
            <Text style={styles.dropdownText} numberOfLines={1}>
              {profileName ? profileName : 'Select profile'}
            </Text>
            <Feather
              name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={22}
              color="#888"
              style={styles.chevronIcon}
            />
          </TouchableOpacity>
          {dropdownOpen && (
            <View style={styles.dropdownPanel}>
              {users.length === 0 ? (
                <Text style={styles.emptyText}>No profiles yet.</Text>
              ) : (
                users.map((profile) => (
                  <View key={profile.id} style={styles.dropdownRow}>
                    <TouchableOpacity
                      style={styles.dropdownNameArea}
                      onPress={() => handleSelectProfile(profile)}
                    >
                      <Text style={styles.dropdownName}>{profile.name}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dropdownDelete}
                      onPress={() => handleDeleteProfile(profile)}
                    >
                      <Feather name="x" size={18} color="#CC0000" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
          <View style={styles.dropdownDivider} />
          <TextInput
            style={styles.input}
                        placeholder="Create new profile"
            value={profileName}
            onChangeText={setProfileName}
            placeholderTextColor="#B0B0B0"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Save & Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ProfileSelectScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CREAM,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  centeredHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 8,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    gap: 6,
  },
  taglineText: {
    fontSize: 16,
    color: '#111',
    fontWeight: '600',
    textAlign: 'center',
  },
  checkIcon: {
    color: ORANGE,
    fontWeight: '900',
    fontSize: 18,
    marginLeft: 4,
  },
  profileCard: {
    backgroundColor: '#FFF8EE',
    borderRadius: 20,
    padding: 24,
    minWidth: 320,
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginTop: 8,
  },
  profileLabel: {
    fontSize: 13,
    color: '#777',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 4,
    minHeight: 48,
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    color: '#222',
    fontWeight: '600',
    marginRight: 8,
  },
  chevronIcon: {
    marginLeft: 4,
  },
  dropdownPanel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginTop: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  dropdownNameArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dropdownName: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  currentTag: {
    fontSize: 11,
    color: ORANGE,
    fontWeight: '700',
    marginLeft: 6,
  },
  dropdownDelete: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#777',
    paddingVertical: 4,
    textAlign: 'center',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#222',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  primaryButton: {
    marginTop: 4,
    height: 50,
    borderRadius: 25,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
