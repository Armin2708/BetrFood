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
import BugReportModal from '../../../../components/BugReportModal';
import { colors, spacing } from '../../../../constants/theme';

export default function HelpSettings() {
  const [bugReportVisible, setBugReportVisible] = useState(false);
  const [lastBugReportRef, setLastBugReportRef] = useState<string | null>(null);
  const navigation = useNavigation();

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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      
        <View style={styles.supportBox}>
          <Text style={styles.sectionTitle}>
            Found something not working as expected? 
          </Text>
          <Text style={styles.supportDescription}>
            Help us improve the app by reporting bugs with
            screenshots and device information.</Text>
          <Pressable
            style={styles.reportButton}
            onPress={openBugReport}
          >
            <Text style={styles.reportButtonText}>Report a Bug</Text>
          </Pressable>
        </View>

        {lastBugReportRef && (
          <View style={styles.lastReportBox}>
            <Text style={styles.lastReportText}>
              ✓ Last report reference: <Text style={styles.reference}>{lastBugReportRef}</Text>
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
  sectionTitle: {
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: spacing.md,
    color: '#000',
  },
  // Support Styles
  supportBox: {
    backgroundColor: '#f0f8ff',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  supportDescription: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 18,
    marginBottom: 50,
  },
  reportButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  reportButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
    fontSize: 13,
    color: '#2e7d32',
  },
  reference: {
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  contactBox: {
    backgroundColor: '#fff3e0',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffe0b2',
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e65100',
    marginBottom: 6,
  },
  contactDescription: {
    fontSize: 13,
    color: '#bf360c',
    lineHeight: 18,
  },
});
