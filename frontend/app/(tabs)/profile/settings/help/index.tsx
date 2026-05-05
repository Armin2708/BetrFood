import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Linking,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  FAQ_CATEGORIES,
  FaqCategory,
  FaqItem,
} from "../../../../../constants/faq";
import { fetchFaq, recordFaqView } from "../../../../../services/api";
import { colors } from "../../../../../constants/theme";

const SUPPORT_EMAIL = "support@betrfood.com";

type FilteredCategory = FaqCategory & {
  matchedItems: FaqItem[];
};

function filterCategories(
  categories: FaqCategory[],
  query: string
): FilteredCategory[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return categories.map((category) => ({
      ...category,
      matchedItems: category.items,
    }));
  }
  return categories
    .map((category) => {
      const matchedItems = category.items.filter((item) => {
        const haystack = `${item.question} ${item.answer}`.toLowerCase();
        return haystack.includes(normalized);
      });
      return { ...category, matchedItems };
    })
    .filter((category) => category.matchedItems.length > 0);
}

export default function HelpAndFaqScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [categories, setCategories] = useState<FaqCategory[]>(FAQ_CATEGORIES);
  const [refreshing, setRefreshing] = useState(false);

  const loadFaq = async () => {
    try {
      const remote = await fetchFaq();
      if (remote.length > 0) {
        setCategories(remote);
      }
    } catch {
      // Stay on the bundled fallback if the request fails (offline / server down).
    }
  };

  useEffect(() => {
    loadFaq();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadFaq();
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = useMemo(
    () => filterCategories(categories, query),
    [categories, query]
  );
  const totalMatches = useMemo(
    () => filtered.reduce((sum, c) => sum + c.matchedItems.length, 0),
    [filtered]
  );
  const totalItems = useMemo(
    () => categories.reduce((sum, c) => sum + c.items.length, 0),
    [categories]
  );

  const toggle = (itemId: string) => {
    setExpandedId((current) => {
      const next = current === itemId ? null : itemId;
      if (next === itemId) {
        recordFaqView(itemId).catch(() => {});
      }
      return next;
    });
  };

  const openSupportEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {});
  };

  const clearSearch = () => setQuery("");

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.textTertiary}
          />
        }
      >
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroSubtitle}>
            Browse common questions or search across all topics.
          </Text>
        </View>

        <View style={styles.searchWrapper}>
          <Ionicons
            name="search"
            size={18}
            color={colors.textTertiary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search help articles"
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable
              onPress={clearSearch}
              hitSlop={12}
              style={styles.clearButton}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.textTertiary}
              />
            </Pressable>
          )}
        </View>

        {query.length > 0 && (
          <Text style={styles.resultsCount}>
            {totalMatches === 0
              ? "No matches found"
              : `${totalMatches} of ${totalItems} questions match`}
          </Text>
        )}

        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="help-circle-outline"
              size={40}
              color={colors.textTertiary}
            />
            <Text style={styles.emptyTitle}>No results</Text>
            <Text style={styles.emptyMessage}>
              Try different keywords, or email us directly and we will get back
              to you.
            </Text>
          </View>
        ) : (
          filtered.map((category) => (
            <View key={category.id} style={styles.categoryBlock}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryIcon}>
                  <Ionicons
                    name={category.icon as any}
                    size={16}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.categoryTitle}>{category.title}</Text>
              </View>
              <View style={styles.card}>
                {category.matchedItems.map((item, index) => {
                  const isLast = index === category.matchedItems.length - 1;
                  const isOpen = expandedId === item.id;
                  return (
                    <View key={item.id}>
                      <Pressable
                        style={styles.questionRow}
                        onPress={() => toggle(item.id)}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: isOpen }}
                      >
                        <Text style={styles.questionText}>{item.question}</Text>
                        <Ionicons
                          name={isOpen ? "chevron-up" : "chevron-down"}
                          size={18}
                          color={colors.textTertiary}
                        />
                      </Pressable>
                      {isOpen && (
                        <View style={styles.answerWrapper}>
                          <Text style={styles.answerText}>{item.answer}</Text>
                        </View>
                      )}
                      {!isLast && <View style={styles.divider} />}
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactMessage}>
            Reach out to our support team and we will get back to you within a
            few business days.
          </Text>
          <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-start' }}>
            <Pressable style={styles.contactButton} onPress={openSupportEmail}>
              <Ionicons name="mail-outline" size={16} color={colors.white} />
              <Text style={styles.contactButtonText}>Email support</Text>
            </Pressable>
            <Pressable style={styles.contactButton} onPress={() => router.push("/profile/settings/help/support-ticket") as any}>
              <Ionicons name="mail-outline" size={16} color={colors.white} />
              <Text style={styles.contactButtonText}>Submit a ticket</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  heroSection: {
    paddingBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
  },
  resultsCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    marginLeft: 4,
  },
  categoryBlock: {
    marginTop: 24,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginLeft: 4,
  },
  categoryIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.recipeBackground,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    overflow: "hidden",
  },
  questionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
    lineHeight: 20,
  },
  answerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 16,
  },
  answerText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
  },
  contactCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 20,
    marginTop: 32,
    alignItems: "flex-start",
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  contactMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  contactButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 6,
    borderRadius: 12,
  },
  contactButtonText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 14,
  },
});
