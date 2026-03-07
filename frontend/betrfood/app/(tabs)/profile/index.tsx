import { View, Text, Pressable, StyleSheet, Image, FlatList, Dimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router'
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get('window');
const ITEM_SIZE = width / 3;

const mockPosts = Array.from({ length: 18 }).map((_, i) => ({
  id: i.toString(),
}));

export default function ProfileScreen() {
  const router = useRouter()
  
  return (
    <>
      {/* Settings cog */}
      <Stack.Screen 
        options={{ 
          headerRight: () => (
            <Pressable onPress={() => router.push('/profile/settings')}>
              <Ionicons name='settings-outline' size={24}/>
            </Pressable>
          ),
        }}
      />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={{ uri: 'https://i.pravatar.cc/150?img=3' }}
            style={styles.avatar}
          />

          <View style={styles.statsRow}>
            <Stat label="Following" value="120" callback={ () => router.push('/profile/info/followingScreen') }/>
            <Stat label="Followers" value="1.2K" callback={ () => router.push('/profile/info/followersScreen') } />
            <Stat label="Likes" value="8.4K" callback={ () => {} }/>
          </View>
        </View>

        {/* Username + Bio */}
        <View style={styles.userInfo}>
          <Text style={styles.username}>@yourusername</Text>
          <Text style={styles.bio}>building cool stuff with expo 🚀</Text>
        </View>

        {/* Edit Profile Button */}
        <Pressable style={styles.editButton} onPress={() => router.push("/profile/info/editProfile")}>
          <View>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </View>
        </Pressable>

        {/* Post Grid */}
        <FlatList
          data={mockPosts}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={() => <View style={styles.gridItem} />}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </>
  );
}

function Stat({ label, value, callback }: { label: string; value: string; callback: () => void }) {
  return (
    <View style={styles.statItem}>
      <Pressable onPress={ callback }>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statLabel: {
    color: '#555',
    fontSize: 12,
  },
  userInfo: {
    paddingHorizontal: 20,
  },
  username: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bio: {
    color: '#555',
    marginTop: 4,
  },
  editButton: {
    margin: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#000',
    fontWeight: '500',
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    backgroundColor: '#eee',
    borderWidth: 0.5,
    borderColor: '#fff',
  },
});