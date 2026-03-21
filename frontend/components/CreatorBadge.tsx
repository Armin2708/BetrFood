import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

type CreatorBadgeProps = {
  size?: number;
  showLabel?: boolean;
};

export default function CreatorBadge({
  size = 16,
  showLabel = false,
}: CreatorBadgeProps) {
  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel="Verified creator"
    >
      <Ionicons name="checkmark-circle" size={size} color={colors.verified} />
      {showLabel ? <Text style={styles.label}>Creator</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 6,
  },
  label: {
    color: colors.verified,
    fontSize: 12,
    fontWeight: '700',
  },
});
