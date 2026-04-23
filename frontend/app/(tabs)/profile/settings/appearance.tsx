import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { FeedLayout, useFeedLayout } from "../../../../context/FeedLayoutContext";

interface LayoutOption {
  value: FeedLayout;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const OPTIONS: LayoutOption[] = [
  {
    value: "grid",
    title: "Grid",
    description: "Compact 3-column grid. See more posts at a glance.",
    icon: "grid-outline",
  },
  {
    value: "list",
    title: "List",
    description: "Single column with larger previews and captions.",
    icon: "list-outline",
  },
];

export default function AppearanceSettings() {
  const { layout, setLayout } = useFeedLayout();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>FEED LAYOUT</Text>
      <Text style={styles.sectionDescription}>
        Choose how posts appear on profile feeds. Changes apply instantly.
      </Text>

      <View style={styles.optionsGroup}>
        {OPTIONS.map((option) => {
          const selected = layout === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setLayout(option.value)}
              style={[styles.optionCard, selected && styles.optionCardSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.title} layout`}
            >
              <View style={[styles.iconBubble, selected && styles.iconBubbleSelected]}>
                <Ionicons
                  name={option.icon}
                  size={22}
                  color={selected ? "#22C55E" : "#64748B"}
                />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <View style={styles.radioDot} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 20,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 6,
    marginLeft: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 16,
    marginLeft: 4,
    lineHeight: 18,
  },
  optionsGroup: {
    gap: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
    gap: 14,
  },
  optionCardSelected: {
    borderColor: "#22C55E",
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBubbleSelected: {
    backgroundColor: "#F0FDF4",
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: "#22C55E",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },
});
