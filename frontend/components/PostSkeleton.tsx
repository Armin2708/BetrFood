import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
function ShimmerBlock({ style }: { style: any }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => { const a = Animated.loop(Animated.sequence([Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }), Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true })])); a.start(); return () => a.stop(); }, [opacity]);
  return <Animated.View style={[styles.shimmer, style, { opacity }]} />;
}
export default function PostSkeleton() {
  return (<View style={styles.container}><View style={styles.header}><ShimmerBlock style={styles.avatar} /><ShimmerBlock style={styles.uname} /></View><ShimmerBlock style={styles.image} /><View style={styles.cap}><ShimmerBlock style={styles.line} /><ShimmerBlock style={styles.lineS} /></View></View>);
}
const styles = StyleSheet.create({ container: { marginVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#ddd' }, header: { flexDirection: 'row', alignItems: 'center', padding: 10 }, shimmer: { backgroundColor: '#e0e0e0', borderRadius: 4 }, avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 }, uname: { width: 120, height: 16 }, image: { width: '100%', height: 300, borderRadius: 0 }, cap: { padding: 10 }, line: { width: '90%', height: 14, marginBottom: 6 }, lineS: { width: '60%', height: 14 } });
