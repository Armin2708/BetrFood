import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius } from '../constants/theme';
import { useScaledTypography } from '../hooks/useScaledTypography';
import BaseModal from './BaseModal';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const scaledTypography = useScaledTypography();
  return (
    <BaseModal visible={visible} onClose={onCancel}>
      <Text style={[styles.title, scaledTypography.subtitle]}>{title}</Text>
      <Text style={[styles.message, scaledTypography.body]}>{message}</Text>
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={[styles.cancelText, scaledTypography.body]}>{cancelLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, destructive && styles.confirmBtnDestructive]}
          onPress={onConfirm}
        >
          <Text style={[styles.confirmText, scaledTypography.body, destructive && styles.confirmTextDestructive]}>
            {confirmLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    marginBottom: 8,
  },
  message: {
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: 20,
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
  confirmBtnDestructive: {
    backgroundColor: colors.delete,
  },
  confirmText: {
    color: colors.white,
  },
  confirmTextDestructive: {
    color: colors.white,
  },
});
