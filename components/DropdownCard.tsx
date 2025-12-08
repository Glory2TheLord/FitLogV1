import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DropdownCardProps {
  label: string;
  value: string | null;
  placeholder: string;
  onPress: () => void;
  chevronUp?: boolean;
  style?: any;
}

export default function DropdownCard({
  label,
  value,
  placeholder,
  onPress,
  chevronUp = false,
  style,
}: DropdownCardProps) {
  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Feather name={chevronUp ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
      </View>
      <Text style={[styles.value, !value && styles.placeholder]}>
        {value || placeholder}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 2,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    color: '#999',
    fontStyle: 'italic',
  },
});
