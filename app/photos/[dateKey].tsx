import FitLogHeader from '@/components/FitLogHeader';
import { usePhotoDays } from '@/contexts/PhotoDayContext';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCENT = '#FF5A2C'; // FitLog orange

type PoseKey = string;

type CustomPose = {
  key: string;
  label: string;
};

const DEFAULT_POSES: CustomPose[] = [
  { key: 'front', label: 'Front' },
  { key: 'left', label: 'Left' },
  { key: 'right', label: 'Right' },
  { key: 'back', label: 'Back' },
  { key: 'flex', label: 'Flex' },
];

export default function PhotoDetailScreen() {
  const router = useRouter();
  const { dateKey } = useLocalSearchParams<{ dateKey: string }>();
  const { photoDays, updatePhotoDay } = usePhotoDays();
  
  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions({
    writeOnly: true,
  });

  // State for all poses (default + custom)
  const [poses, setPoses] = useState<CustomPose[]>(DEFAULT_POSES);
  const [posePhotos, setPosePhotos] = useState<Record<PoseKey, string | null>>({});

  // Fullscreen viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  // Add photo modal state
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newPoseName, setNewPoseName] = useState('');

  const photoDay = photoDays.find(day => day.dateKey === dateKey);

  // Load existing photos from photoDay
  useEffect(() => {
    if (photoDay) {
      const loadedPhotos: Record<PoseKey, string | null> = {};
      photoDay.positions.forEach(pos => {
        if (pos.imageUri) {
          loadedPhotos[pos.id] = pos.imageUri;
        }
      });
      setPosePhotos(loadedPhotos);
    }
  }, [photoDay?.dateKey]);

  useEffect(() => {
    // Request camera permission on mount
    if (cameraPermission?.status !== 'granted') {
      requestCameraPermission();
    }
  }, []);

  const openViewer = (uri: string) => {
    setViewerUri(uri);
    setViewerVisible(true);
  };

  const closeViewer = () => {
    setViewerVisible(false);
    setViewerUri(null);
  };

  const handleTakePhoto = async (poseKey: PoseKey) => {
    try {
      if (cameraPermission?.status !== 'granted') {
        const result = await requestCameraPermission();
        if (!result.granted) {
          Alert.alert('Permission needed', 'Camera permission is required to take photos.');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: true,
        aspect: [3, 4],
      });

      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        
        // Save to gallery immediately
        try {
          if (!mediaPermission || mediaPermission.status !== 'granted') {
            const permResult = await requestMediaPermission();
            if (!permResult.granted) {
              Alert.alert('Permission needed', 'Media library permission is required to save photos.');
              return;
            }
          }

          // Save to media library
          const asset = await MediaLibrary.createAssetAsync(photoUri);
          
          // Try to add to FitLog album
          try {
            const album = await MediaLibrary.getAlbumAsync('FitLog Progress');
            if (album) {
              await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
            } else {
              await MediaLibrary.createAlbumAsync('FitLog Progress', asset, false);
            }
          } catch (albumError) {
            console.log('Album operation failed, but photo saved to gallery:', albumError);
          }
        } catch (saveError) {
          console.error('Error saving to gallery:', saveError);
        }

        // Update local state
        setPosePhotos(prev => ({ ...prev, [poseKey]: photoUri }));
        
        // Update context to persist
        if (photoDay) {
          const updatedPositions = photoDay.positions.map(pos => 
            pos.id === poseKey ? { ...pos, imageUri: photoUri } : pos
          );
          updatePhotoDay(dateKey!, { ...photoDay, positions: updatedPositions });
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleSavePhoto = async (uri: string) => {
    try {
      if (!mediaPermission || mediaPermission.status !== 'granted') {
        const result = await requestMediaPermission();
        if (!result.granted) {
          Alert.alert('Permission needed', 'Media library permission is required to save photos.');
          return;
        }
      }

      // Save to media library and create album
      const asset = await MediaLibrary.createAssetAsync(uri);
      
      // Try to add to FitLog album, create if doesn't exist
      try {
        const album = await MediaLibrary.getAlbumAsync('FitLog');
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        } else {
          await MediaLibrary.createAlbumAsync('FitLog', asset, false);
        }
      } catch (albumError) {
        console.log('Album operation failed, but photo saved to gallery:', albumError);
      }

      Alert.alert('Success', 'Photo saved to your gallery and FitLog album.');
    } catch (error) {
      console.error('Error saving photo:', error);
      Alert.alert('Error', 'Failed to save photo. Please try again.');
    }
  };

  const handleDeletePhoto = (poseKey: PoseKey) => {
    Alert.alert(
      'Delete photo?',
      'This will remove the photo from this pose. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setPosePhotos(prev => ({ ...prev, [poseKey]: null }));
            
            // Update context to persist deletion
            if (photoDay) {
              const updatedPositions = photoDay.positions.map(pos => 
                pos.id === poseKey ? { ...pos, imageUri: undefined } : pos
              );
              updatePhotoDay(dateKey!, { ...photoDay, positions: updatedPositions });
            }
          },
        },
      ]
    );
  };

  const handleAddPose = () => {
    setNewPoseName('');
    setAddModalVisible(true);
  };

  const handleCreatePose = () => {
    const trimmedName = newPoseName.trim();
    if (!trimmedName) {
      Alert.alert('Invalid name', 'Please enter a name for the photo.');
      return;
    }

    const newKey = `custom_${Date.now()}`;
    setPoses(prev => [...prev, { key: newKey, label: trimmedName }]);
    setAddModalVisible(false);
  };

  const handleDeletePose = (poseKey: PoseKey, poseLabel: string) => {
    Alert.alert(
      'Delete pose?',
      `This will permanently remove "${poseLabel}" and its photo. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setPoses(prev => prev.filter(p => p.key !== poseKey));
            setPosePhotos(prev => {
              const updated = { ...prev };
              delete updated[poseKey];
              return updated;
            });
          },
        },
      ]
    );
  };

  if (!photoDay) {
    return (
      <SafeAreaView style={styles.screen}>
        <FitLogHeader onSettingsPress={() => router.push('/settings')} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Photo day not found</Text>
          <TouchableOpacity
            style={styles.backButtonError}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FitLogHeader onSettingsPress={() => router.push('/settings')} />
      
      <View style={styles.pageTitleRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color="#000" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Photos</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      {/* Photos date row */}
      <View style={styles.photosDateRow}>
        <Text style={styles.photosDate}>{photoDay.displayDate}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.photosGridContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.photosGrid}>
          {poses.map(pose => {
            const uri = posePhotos[pose.key];
            const isCustom = !DEFAULT_POSES.find(p => p.key === pose.key);

            return (
              <View key={pose.key} style={styles.photoCard}>
                <View style={styles.photoCardHeader}>
                  <Text style={styles.photoCardTitle}>{pose.label}</Text>
                  {isCustom && (
                    <TouchableOpacity onPress={() => handleDeletePose(pose.key, pose.label)}>
                      <Feather name="trash-2" size={14} color="#FF5A2C" />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.photoCardStatus}>
                  {uri ? 'Captured' : 'Not captured yet'}
                </Text>

                <TouchableOpacity
                  style={styles.photoCardBody}
                  activeOpacity={0.8}
                  onPress={() => uri && openViewer(uri)}
                >
                  {uri ? (
                    <Image
                      source={{ uri }}
                      style={styles.photoPreview}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Feather name="camera" size={28} color="#CCCCCC" />
                      <Text style={styles.photoPlaceholderText}>No photo yet</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.photoCardActions}>
                  <TouchableOpacity
                    style={styles.photoActionPrimary}
                    onPress={() => handleTakePhoto(pose.key)}
                  >
                    <Text style={styles.photoActionPrimaryText}>Take photo</Text>
                  </TouchableOpacity>
                  {uri && (
                    <View style={styles.photoCardSecondaryActions}>
                      <TouchableOpacity
                        style={styles.photoActionSecondary}
                        onPress={() => handleSavePhoto(uri)}
                      >
                        <Feather name="download" size={14} color="#666" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.photoActionSecondary}
                        onPress={() => handleDeletePhoto(pose.key)}
                      >
                        <Feather name="x" size={14} color="#666" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Add another photo button */}
        <TouchableOpacity 
          style={styles.addPhotoButton} 
          onPress={handleAddPose}
          activeOpacity={0.7}
        >
          <Feather name="plus" size={20} color="#FF5A2C" />
          <Text style={styles.addPhotoButtonText}>Add another photo</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add photo naming modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Name your photo</Text>
            <Text style={styles.modalSubtitle}>Give this photo pose a name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Glutes, Biceps, Legs"
              value={newPoseName}
              onChangeText={setNewPoseName}
              autoFocus
              maxLength={20}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={handleCreatePose}
              >
                <Text style={styles.modalButtonPrimaryText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Fullscreen photo viewer */}
      <Modal
        visible={viewerVisible}
        transparent
        animationType="fade"
        onRequestClose={closeViewer}
      >
        <View style={styles.viewerBackdrop}>
          <TouchableOpacity style={styles.viewerClose} onPress={closeViewer}>
            <Feather name="x" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          {viewerUri && (
            <Image
              source={{ uri: viewerUri }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFDF5',
  },
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: '#FFFDF5',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.3,
  },
  backButton: {
    padding: 6,
  },
  headerSpacer: {
    width: 32,
  },
  photosDateRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFDF5',
  },
  photosDate: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
  },
  backButtonError: {
    backgroundColor: ACCENT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  photosGridContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photoCard: {
    width: '48%',
    aspectRatio: 3 / 4,
    backgroundColor: '#FFFDF5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  photoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  photoCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
  },
  photoCardStatus: {
    fontSize: 10,
    color: '#999999',
    marginBottom: 6,
  },
  photoCardBody: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F7F3EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    marginTop: 6,
    fontSize: 11,
    color: '#BBBBBB',
  },
  photoCardActions: {
    marginTop: 8,
  },
  photoActionPrimary: {
    backgroundColor: ACCENT,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: 6,
  },
  photoActionPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  photoCardSecondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  photoActionSecondary: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF5A2C',
    borderRadius: 999,
    paddingVertical: 12,
    marginTop: 8,
    gap: 8,
  },
  addPhotoButtonText: {
    color: '#FF5A2C',
    fontWeight: '600',
    fontSize: 14,
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: '90%',
    height: '80%',
  },
  viewerClose: {
    position: 'absolute',
    top: 40,
    right: 24,
    zIndex: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    color: '#333333',
    fontWeight: '600',
    fontSize: 16,
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: ACCENT,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
