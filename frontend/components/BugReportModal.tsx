import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import BaseModal from './BaseModal';
import { reportBug } from '../services/api/bugReports';
import { formatDeviceInfo, getDeviceInfo } from '../utils/deviceInfo';
import { colors, radius, spacing, typography } from '../constants/theme';
import { useScaledTypography } from '../hooks/useScaledTypography';

interface BugReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (bugReportId: string, reference: string) => void;
}

export default function BugReportModal({ visible, onClose, onSuccess }: BugReportModalProps) {
  const scaledTypography = useScaledTypography();
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [deviceInfo] = useState(() => getDeviceInfo());

  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to access your photo library.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const filename = asset.fileName || `screenshot-${Date.now()}.jpg`;
        setSelectedImage({
          uri: asset.uri,
          name: filename,
          type: asset.type === 'image' ? 'image/jpeg' : 'image/png',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      console.error('Image picker error:', error);
    }
  };

  const handleTakeScreenshot = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to access your camera.');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const filename = asset.fileName || `screenshot-${Date.now()}.jpg`;
        setSelectedImage({
          uri: asset.uri,
          name: filename,
          type: asset.type === 'image' ? 'image/jpeg' : 'image/png',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      console.error('Camera error:', error);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please describe the bug you encountered.');
      return;
    }

    if (description.trim().length > 5000) {
      Alert.alert('Description Too Long', 'Please limit your description to 5000 characters.');
      return;
    }

    setLoading(true);
    try {
      const response = await reportBug(description.trim(), selectedImage || undefined);

      Alert.alert(
        'Bug Report Submitted',
        `Thank you for reporting this issue!\n\nReference ID: ${response.reference}\n\nWe'll review it shortly.`,
        [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              onClose();
              onSuccess?.(response.id, response.reference);
            },
          },
        ]
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit bug report';
      Alert.alert('Submission Failed', errorMessage, [{ text: 'Try Again' }]);
      console.error('Bug report submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDescription('');
    setSelectedImage(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const maxChars = 5000;
  const charCount = description.length;
  const charPercentage = (charCount / maxChars) * 100;

  return (
    <BaseModal visible={visible} onClose={handleClose} width={350}>
      {/* Header */}
      <Text style={[styles.title, scaledTypography.title]}>Report a Bug</Text>
      <Text style={[styles.subtitle, scaledTypography.caption]}>Help us improve the app by describing the issue you found</Text>

      {/* Description Input */}
      <View style={styles.section}>
        <Text style={[styles.label, scaledTypography.label]}>Description *</Text>
        <TextInput
          style={[styles.textInput, scaledTypography.body]}
          placeholder="What went wrong? What did you expect to happen?"
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
          editable={!loading}
          maxLength={maxChars}
        />
        <View style={styles.charCountContainer}>
          <View style={[styles.charCountBar, { width: `${Math.min(charPercentage, 100)}%` }]} />
        </View>
        <Text style={[styles.charCount, scaledTypography.small]}>
          {charCount}/{maxChars}
        </Text>
      </View>

      {/* Screenshot Section */}
      <View style={styles.section}>
        <Text style={[styles.label, scaledTypography.label]}>Screenshot (Optional)</Text>
        <Text style={[styles.screenshotHint, scaledTypography.small]}>Attach a screenshot to help us understand the issue</Text>

        {selectedImage ? (
          <>
            <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
            <Pressable
              style={styles.removeImageButton}
              onPress={handleRemoveImage}
              disabled={loading}
            >
              <Text style={[styles.removeImageText, scaledTypography.caption]}>Remove Image</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.imageButtonsContainer}>
            <Pressable
              style={styles.imageButton}
              onPress={handlePickImage}
              disabled={loading}
            >
              <Text style={[styles.imageButtonText, scaledTypography.caption]}>📸 Gallery</Text>
            </Pressable>
            <Pressable
              style={styles.imageButton}
              onPress={handleTakeScreenshot}
              disabled={loading}
            >
              <Text style={[styles.imageButtonText, scaledTypography.caption]}>📷 Camera</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Device Info */}
      <View style={styles.section}>
        <Text style={[styles.label, scaledTypography.label]}>Device Information</Text>
        <View style={styles.deviceInfoBox}>
          <Text style={[styles.deviceInfoText, scaledTypography.small]}>{formatDeviceInfo(deviceInfo)}</Text>
        </View>
        <Text style={[styles.deviceInfoNote, scaledTypography.small]}>
          This info helps us track bugs more easily
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonsContainer}>
        <Pressable
          style={[styles.button, styles.cancelButton]}
          onPress={handleClose}
          disabled={loading}
        >
          <Text style={[styles.cancelButtonText, scaledTypography.label]}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading || !description.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[styles.submitButtonText, scaledTypography.label]}>Submit Report</Text>
          )}
        </Pressable>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    color: '#000',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: radius.sm,
    padding: 12,
    color: '#000',
    textAlignVertical: 'top',
  },
  charCountContainer: {
    height: 3,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  charCountBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  charCount: {
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  screenshotHint: {
    color: '#999',
    marginBottom: 12,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: radius.sm,
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
  },
  removeImageButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff3cd',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  removeImageText: {
    color: '#856404',
    textAlign: 'center',
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  imageButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  imageButtonText: {
    color: '#333',
  },
  deviceInfoBox: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  deviceInfoText: {
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  deviceInfoNote: {
    color: '#999',
    fontStyle: 'italic',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
  },
});
