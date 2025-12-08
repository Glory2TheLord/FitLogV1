import { Feather, FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ACCENT = '#f97316';

type FitLogHeaderProps = {
  onSettingsPress?: () => void;
};

export default function FitLogHeader({ onSettingsPress }: FitLogHeaderProps) {
  const handlePress = () => {
    console.log('Gear button pressed in FitLogHeader');
    console.log('onSettingsPress callback exists:', !!onSettingsPress);
    if (onSettingsPress) {
      onSettingsPress();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerLeft}>
        <Image
          source={require('../assets/fitlog-logo2.png')}
          style={styles.headerCombinedLogo}
          resizeMode="contain"
        />
        <View style={styles.taglineRow}>
          <Text style={styles.appTaglineText}>
            Track it. All in one place
          </Text>
          <Feather name="check" size={17} style={styles.taglineCheck} />
        </View>
      </View>

      <View style={styles.headerRight}>
        <TouchableOpacity
          style={styles.headerButton}
          activeOpacity={0.9}
          onPress={handlePress}
        >
          <Feather
            name="settings"
            size={20}
            style={styles.headerButtonIcon}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerButton}
          activeOpacity={0.9}
        >
          <Feather
            name="plus"
            size={22}
            style={styles.headerButtonIcon}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerButton}
          activeOpacity={0.9}
        >
          <FontAwesome5
            name="trophy"
            size={18}
            style={styles.headerButtonIcon}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#FFFDF5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 12,
  },
  headerCombinedLogo: {
    width: 60,
    height: 60,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  appTaglineText: {
    color: '#1a1a1a',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  taglineCheck: {
    marginLeft: 5,
    color: ACCENT,
  },
  headerRight: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  headerButton: {
    width: 90,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 1001,
  },
  headerButtonIcon: {
    color: ACCENT,
  },
});
