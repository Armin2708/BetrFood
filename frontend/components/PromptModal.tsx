import React, { useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius } from '../constants/theme';
import { useScaledTypography } from '../hooks/useScaledTypography';
import BaseModal from './BaseModal';

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
  const scaledTypography = useScaledTypography();

  return (
    <BaseModal visible={visible} onClose={onCancel}>
      <Text style={[styles.title, scaledTypography.subtitle]}>{title}</Text>
      <TextInput
        ref={inputRef}
        style={[styles.input, scaledTypography.body]}
        value={value}
        onChangeText={onChangeText}
        placeholder="Enter a name..."
        placeholderTextColor={colors.placeholder}
        maxLength={100}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        autoFocus
      />
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={[styles.cancelText, scaledTypography.body]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmBtn} onPress={onSubmit}>
          <Text style={[styles.confirmText, scaledTypography.body]}>OK</Text>
        </TouchableOpacity>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xs,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.xs,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  confirmText: {
    color: colors.white,
  },
});
