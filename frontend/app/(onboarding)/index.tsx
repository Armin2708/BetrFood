import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../../constants/theme";

export default function Onboarding() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">Welcome to BetrFood</Text>
      <Text style={styles.subtitle}>Share your favorite meals, discover new recipes, and connect with food lovers.</Text>

      <View style={styles.features}>
        <FeatureItem icon="📸" text="Share photos of your favorite dishes" />
        <FeatureItem icon="📖" text="Attach recipes with ingredients and steps" />
        <FeatureItem icon="👥" text="Follow friends and discover new creators" />
        <FeatureItem icon="🔖" text="Save posts to your collections" />
      </View>

      <Pressable
        style={styles.button}
        onPress={() => router.replace("/login")}
        accessibilityRole="button"
        accessibilityLabel="Get started with BetrFood"
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </Pressable>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow} accessibilityLabel={text}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: colors.backgroundPrimary,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 32,
  },
  features: {
    marginBottom: 40,
    gap: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: colors.textPrimary,
    flex: 1,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 17,
  },
});
