import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCollections } from "../../../../context/CollectionsContext";
import { getImageUrl, Post } from "../../../../services/api";

const { width } = Dimensions.get("window");
const NUM_COLUMNS = 3;
const ITEM_SIZE = width / NUM_COLUMNS;

export default function CollectionDetailScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { fetchPostsForCollection, removePostFromCollection } = useCollections();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await fetchPostsForCollection(id);
      setPosts(data);
    } catch (error) {
      console.error("Failed to load collection posts:", error);
    } finally {
      setLoading(false);
    }
  }, [id, fetchPostsForCollection]);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts])
  );

  const handleRemovePost = (postId: string) => {
    Alert.alert(
      "Remove Post",
      "Remove this post from the collection?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removePostFromCollection(id, postId);
              setPosts((prev) => prev.filter((p) => p.id !== postId));
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to remove post");
            }
          },
        },
      ]
    );
  };

  const collectionName = name ? decodeURIComponent(name) : "Collection";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {collectionName}
          </Text>
          <Text style={styles.headerCount}>
            {posts.length} {posts.length === 1 ? "post" : "posts"}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/post/${item.id}` as any)}
              onLongPress={() => handleRemovePost(item.id)}
            >
              <Image
                source={{ uri: getImageUrl(item.imagePath) }}
                style={styles.gridItem}
              />
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No posts in this collection</Text>
              <Text style={styles.emptySubtext}>
                Save posts to this collection from the post menu
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  headerCount: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    backgroundColor: "#eee",
    borderWidth: 0.5,
    borderColor: "#fff",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
