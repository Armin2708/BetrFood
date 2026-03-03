import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

function ShimmerBlock({ style }: { style: any }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return <Animated.View style={[styles.shimmer, style, { opacity }]} />;
}

export default function PostSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ShimmerBlock style={styles.avatar} />
        <ShimmerBlock style={styles.username} />
      </View>
      <ShimmerBlock style={styles.image} />
      <View style={styles.captionArea}>
        <ShimmerBlock style={styles.line} />
        <ShimmerBlock style={styles.lineShort} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#ddd' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  shimmer: { backgroundColor: '#e0e0e0', borderRadius: 4 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  username: { width: 120, height: 16 },
  image: { width: '100%', height: 300, borderRadius: 0 },
  captionArea: { padding: 10 },
  line: { width: '90%', height: 14, marginBottom: 6 },
  lineShort: { width: '60%', height: 14 },
});
