import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { submitSupportTicket } from '../../../../../services/api';
import {
  buildSupportMetadata,
  SUPPORT_ESTIMATED_RESPONSE,
  validateSupportForm,
} from '../../../../../utils/supportFormUtils';

export default function SupportScreen() {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const metadata = useMemo(() => buildSupportMetadata(), []);

  const pickScreenshot = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access to attach a screenshot.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setScreenshotUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    const validationError = validateSupportForm(subject, description);
    if (validationError) {
      Alert.alert('Missing information', validationError);
      return;
    }

    setIsSubmitting(true);
    setConfirmation(null);
    try {
      await submitSupportTicket({
        subject: subject.trim(),
        description: description.trim(),
        screenshotUri,
        ...metadata,
      });

      setSubject('');
      setDescription('');
      setScreenshotUri(null);
      setConfirmation(`Your support request was submitted. We typically respond ${SUPPORT_ESTIMATED_RESPONSE}.`);
    } catch (error: any) {
      Alert.alert('Submission failed', error?.message || 'Failed to submit support request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Contact Support</Text>
        <Text style={styles.subtitle}>
          Tell us what happened and we will help you resolve it.
        </Text>

        {confirmation ? (
          <View style={styles.confirmationCard}>
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            <Text style={styles.confirmationText}>{confirmation}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.label}>Subject</Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            style={styles.input}
            placeholder="Brief summary of your issue"
            placeholderTextColor="#94A3B8"
            maxLength={120}
            autoCapitalize="sentences"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.textArea]}
            placeholder="What were you doing, and what went wrong?"
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
            maxLength={1500}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Screenshot (optional)</Text>
          {screenshotUri ? (
            <View style={styles.screenshotCard}>
              <Image source={{ uri: screenshotUri }} style={styles.screenshotImage} />
              <Pressable style={styles.removeButton} onPress={() => setScreenshotUri(null)}>
                <Ionicons name="close" size={16} color="#0F172A" />
                <Text style={styles.removeButtonText}>Remove</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.attachmentButton} onPress={pickScreenshot}>
              <Ionicons name="image-outline" size={18} color="#0F172A" />
              <Text style={styles.attachmentButtonText}>Attach screenshot</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.metaCard}>
          <Text style={styles.metaTitle}>Included automatically</Text>
          <Text style={styles.metaLine}>Device: {metadata.deviceInfo}</Text>
          <Text style={styles.metaLine}>OS Version: {metadata.osVersion}</Text>
          <Text style={styles.metaLine}>App Version: {metadata.appVersion}</Text>
        </View>

        <Pressable
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit support request</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: 20,
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0F172A',
    fontSize: 15,
  },
  textArea: {
    minHeight: 140,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  attachmentButtonText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '500',
  },
  screenshotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 10,
  },
  screenshotImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  removeButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  removeButtonText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  metaCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  metaTitle: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '700',
    marginBottom: 2,
  },
  metaLine: {
    fontSize: 13,
    color: '#64748B',
  },
  confirmationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#ECFDF3',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
  },
  confirmationText: {
    flex: 1,
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
  },
  submitButton: {
    marginTop: 6,
    backgroundColor: '#16A34A',
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
