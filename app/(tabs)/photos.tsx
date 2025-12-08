import FitLogHeader from '@/components/FitLogHeader';
import { usePhotoDays } from '@/contexts/PhotoDayContext';
import { PhotoDay } from '@/models/photos';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCENT = '#FF5A2C';

export default function PhotosScreen() {
  const router = useRouter();
  const { photoDays, addPhotoDay, removePhotoDay } = usePhotoDays();

  const handleAddCheckIn = () => {
    const today = new Date();
    const dateKey = today.toISOString().split('T')[0]; // e.g. "2025-12-04"
    const displayDate = today.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }); // e.g. "Dec 4, 2025"

    // Check if this date already exists
    const existing = photoDays.find(d => d.dateKey === dateKey);
    
    if (existing) {
      // Navigate to existing album instead of creating duplicate
      router.push({
        pathname: '/photos/[dateKey]',
        params: { dateKey: existing.dateKey },
      });
      return;
    }

    const newDay: PhotoDay = {
      dateKey,
      displayDate,
      positions: [
        { id: 'front', label: 'Front' },
        { id: 'side', label: 'Side' },
        { id: 'back', label: 'Back' },
        { id: 'flex', label: 'Flex' },
      ],
    };

    addPhotoDay(newDay);
    
    // Navigate to the new album
    router.push({
      pathname: '/photos/[dateKey]',
      params: { dateKey: newDay.dateKey },
    });
  };

  const getFirstPhotoUri = (photoDay: PhotoDay): string | undefined => {
    return photoDay.positions.find(p => p.imageUri)?.imageUri;
  };

  const handleDeleteFolder = (dateKey: string, displayDate: string, event: any) => {
    event.stopPropagation();
    Alert.alert(
      'Delete check-in?',
      `This will permanently delete the check-in from "${displayDate}" and all its photos. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removePhotoDay(dateKey),
        },
      ]
    );
  };
  
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FitLogHeader onSettingsPress={() => router.push('/settings')} />
      
      <View style={styles.screenContent}>
        <View style={styles.pageTitleRow}>
          <Text style={styles.pageTitle}>Photos</Text>
        </View>
        <View style={styles.header}>
          <View>
            <Text style={styles.subtitle}>Long-term progress check-ins</Text>
          </View>
          
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.8}
            onPress={handleAddCheckIn}
          >
            <Feather name="plus" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Check-in</Text>
          </TouchableOpacity>
        </View>

        {photoDays.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No photo check-ins yet</Text>
            <Text style={styles.emptyStateText}>
              Tap "Add Check-in" to create your first progress album.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.grid}>
              {photoDays.map(photoDay => {
              const firstPhoto = getFirstPhotoUri(photoDay);
              const completed = photoDay.positions.filter(p => p.imageUri).length;
              const total = photoDay.positions.length;

              return (
                <View key={photoDay.dateKey} style={styles.folderCard}>
                  <TouchableOpacity
                    style={styles.folderDeleteButton}
                    onPress={(e) => handleDeleteFolder(photoDay.dateKey, photoDay.displayDate, e)}
                    activeOpacity={0.7}
                  >
                    <Feather name="trash-2" size={16} color="#FF5A2C" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.folderTouchable}
                    activeOpacity={0.8}
                    onPress={() =>
                      router.push({
                        pathname: '/photos/[dateKey]',
                        params: { dateKey: photoDay.dateKey },
                      })
                    }
                  >
                  <View style={styles.folderIcon}>
                    {firstPhoto ? (
                      <Image
                        source={{ uri: firstPhoto }}
                        style={styles.folderThumbnail}
                        resizeMode="cover"
                      />
                    ) : (
                      <Feather name="folder" size={48} color="#FFD700" />
                    )}
                  </View>
                  <View style={styles.folderInfo}>
                    <Text style={styles.folderDate} numberOfLines={1}>
                      {photoDay.displayDate}
                    </Text>
                    <Text style={styles.folderCount}>
                      {`${completed}/${total} photos`}
                    </Text>
                  </View>
                  </TouchableOpacity>
                </View>
              );
              })}
            </View>
          </ScrollView>
        )}
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
  emptyState: {
    marginTop: 24,
    paddingHorizontal: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    gap: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  gridContainer: {
    paddingBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  folderCard: {
    width: '48%',
    aspectRatio: 1,
    marginBottom: 16,
    position: 'relative',
  },
  folderTouchable: {
    flex: 1,
    backgroundColor: '#FFFDF5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  folderDeleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    padding: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  folderIcon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F7F3EB',
    marginBottom: 8,
  },
  folderThumbnail: {
    width: '100%',
    height: '100%',
  },
  folderInfo: {
    alignItems: 'center',
  },
  folderDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
    textAlign: 'center',
  },
  folderCount: {
    fontSize: 11,
    color: '#999999',
    textAlign: 'center',
  },
});
