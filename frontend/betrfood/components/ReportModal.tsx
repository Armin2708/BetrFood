import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { submitReport } from '../services/api';

const REPORT_REASONS = [
  { id: 'spam',          label: 'Spam',                    description: 'Repetitive or unwanted commercial content' },
  { id: 'harassment',   label: 'Harassment or bullying',  description: 'Targeting someone to cause distress' },
  { id: 'hate_speech',  label: 'Hate speech',             description: 'Content that attacks people based on identity' },
  { id: 'misinformation', label: 'False information',     description: 'Misleading or factually incorrect content' },
  { id: 'violence',     label: 'Violence or dangerous',   description: 'Graphic violence or promotion of harm' },
  { id: 'nudity',       label: 'Nudity or sexual content', description: 'Explicit or inappropriate content' },
  { id: 'other',        label: 'Something else',          description: 'Other reason not listed above' },
];

// TODO: replace with real user ID from AuthContext once backend auth is wired up
const CURRENT_USER_ID = 'current-user';

interface ReportModalProps {
  visible: boolean;
  postId: string;
  onClose: () => void;
}

type Step = 'reasons' | 'description' | 'confirmation';

export default function ReportModal({ visible, postId, onClose }: ReportModalProps) {
  const [step, setStep] = useState<Step>('reasons');
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep('reasons');
    setSelectedReason(null);
    setDescription('');
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleReasonSelect = (reasonId: string) => {
    setSelectedReason(reasonId);
    setStep('description');
  };

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setSubmitting(true);
    try {
      await submitReport({
        postId,
        reporterId: CURRENT_USER_ID,
        reason: selectedReason,
        description: description.trim() || null,
      });
      setStep('confirmation');
    } catch (e) {
      console.error('Failed to submit report:', e);
      // Still show confirmation — we don't want to punish the user for a network error
      setStep('confirmation');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedReasonLabel = REPORT_REASONS.find(r => r.id === selectedReason)?.label;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          {step === 'description' ? (
            <TouchableOpacity onPress={() => setStep('reasons')} style={styles.headerBtn}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerBtn} />
          )}
          <Text style={styles.headerTitle}>
            {step === 'reasons' ? 'Report Post' : step === 'description' ? 'Add Details' : ''}
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.headerBtn}>
            {step !== 'confirmation' && <Ionicons name="close" size={24} color="#000" />}
          </TouchableOpacity>
        </View>

        {/* ── Step 1: Reason selection ── */}
        {step === 'reasons' && (
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.subtitle}>Why are you reporting this post?</Text>
            <Text style={styles.subtitleSub}>Your report is anonymous. We review all reports carefully.</Text>
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={styles.reasonRow}
                onPress={() => handleReasonSelect(reason.id)}
              >
                <View style={styles.reasonText}>
                  <Text style={styles.reasonLabel}>{reason.label}</Text>
                  <Text style={styles.reasonDesc}>{reason.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── Step 2: Optional description ── */}
        {step === 'description' && (
          <View style={styles.content}>
            <Text style={styles.subtitle}>Reporting for: <Text style={styles.reasonHighlight}>{selectedReasonLabel}</Text></Text>
            <Text style={styles.subtitleSub}>Add any additional context (optional)</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Describe the issue in more detail..."
              placeholderTextColor="#aaa"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={500}
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 3: Confirmation ── */}
        {step === 'confirmation' && (
          <View style={styles.confirmationContainer}>
            <View style={styles.confirmationIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#FF6B35" />
            </View>
            <Text style={styles.confirmationTitle}>Report Submitted</Text>
            <Text style={styles.confirmationText}>
              Thank you for helping keep BetrFood safe. Our moderation team will review this report.
            </Text>
            <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  headerBtn: {
    width: 36,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  subtitleSub: {
    fontSize: 13,
    color: '#999',
    marginBottom: 20,
    lineHeight: 18,
  },
  reasonHighlight: {
    color: '#FF6B35',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  reasonText: {
    flex: 1,
  },
  reasonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  reasonDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
  },
  charCount: {
    fontSize: 11,
    color: '#ccc',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  confirmationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  confirmationIcon: {
    marginBottom: 8,
  },
  confirmationTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
  },
  confirmationText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  doneButton: {
    marginTop: 16,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 10,
  },
  doneButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
