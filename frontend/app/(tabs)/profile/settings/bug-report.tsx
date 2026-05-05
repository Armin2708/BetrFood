import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../../../../context/ThemeContext';
import { useScaledTypography } from '../../../../hooks/useScaledTypography';
import BugReportModal from '../../../../components/BugReportModal';
import { colors, spacing } from '../../../../constants/theme';

export default function HelpSettings() {
  const [bugReportVisible, setBugReportVisible] = useState(false);
  const [lastBugReportRef, setLastBugReportRef] = useState<string | null>(null);
  const navigation = useNavigation();
  const { colors: themeColors } = useAppTheme();
  const scaledTypography = useScaledTypography();

  const handleBugReportSuccess = (bugReportId: string, reference: string) => {
    setLastBugReportRef(reference);
    // Optionally navigate to bug report history after submission
  };

  const openBugReport = () => {
    setBugReportVisible(true);
  };

  const closeBugReport = () => {
    setBugReportVisible(false);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]} showsVerticalScrollIndicator={false}>
      
        <View style={styles.supportBox}>
          <Text style={[scaledTypography.title, { color: themeColors.textPrimary }]}>
            Found something not working as expected? 
          </Text>
          <Text style={[scaledTypography.body, { color: themeColors.textSecondary }]}>
            Help us improve the app by reporting bugs with
            screenshots and device information.</Text>
          <Pressable
            style={styles.reportButton}
            onPress={openBugReport}
          >
            <Text style={[scaledTypography.label, styles.reportButtonText]}>Report a Bug</Text>
          </Pressable>
        </View>

        {lastBugReportRef && (
          <View style={styles.lastReportBox}>
            <Text style={[scaledTypography.body, styles.lastReportText]}>
              ✓ Last report reference: <Text style={[scaledTypography.small, styles.reference]}>{lastBugReportRef}</Text>
            </Text>
          </View>
        )}

      {/* Bug Report Modal */}
      <BugReportModal
        visible={bugReportVisible}
        onClose={closeBugReport}
        onSuccess={handleBugReportSuccess}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  supportBox: {
    backgroundColor: '#f0f8ff',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  reportButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 50,
  },
  reportButtonText: {
    color: '#fff',
  },
  lastReportBox: {
    backgroundColor: '#f0f8f0',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  lastReportText: {
    color: '#2e7d32',
  },
  reference: {
    fontFamily: 'monospace',
  },
});
