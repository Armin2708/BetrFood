import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { colors } from '../constants/theme';

interface PromptModalProps {
  visible: boolean;
  title: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function PromptModal({ visible, title, value, onChangeText, onSubmit, onCancel }: PromptModalProps) {
  const inputRef = useRef<TextInput>(null);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.promptOverlay} onPress={onCancel}>
        <Pressable style={styles.promptBox} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.promptTitle}>{title}</Text>
          <TextInput
            ref={inputRef}
            style={styles.promptInput}
            value={value}
            onChangeText={onChangeText}
            placeholder="Enter a name..."
            placeholderTextColor={colors.placeholder}
            maxLength={100}
            returnKeyType="done"
            onSubmitEditing={onSubmit}
            autoFocus
          />
          <View style={styles.promptButtons}>
            <TouchableOpacity style={styles.promptCancelBtn} onPress={onCancel}>
              <Text style={styles.promptCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.promptConfirmBtn} onPress={onSubmit}>
              <Text style={styles.promptConfirmText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Prompt modal
  promptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptBox: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 24,
    width: 300,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  promptInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  promptButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  promptCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  promptCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  promptConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  promptConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});
