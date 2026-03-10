import React, { useRef, useState } from 'react';
import {
  View,
  Image,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ImageCarouselProps {
  images: string[];   // array of fully-resolved URIs
  height?: number;
}

export default function ImageCarousel({ images, height = 300 }: ImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!images || images.length === 0) return null;

  // Single image — plain Image, no scroll overhead
  if (images.length === 1) {
    return (
      <Image
        source={{ uri: images[0] }}
        style={[styles.image, { width: SCREEN_WIDTH, height }]}
        resizeMode="cover"
      />
    );
  }

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  return (
    <View>
      {/* Swipeable images */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {images.map((uri, i) => (
          <Image
            key={i}
            source={{ uri }}
            style={[styles.image, { width: SCREEN_WIDTH, height }]}
            resizeMode="cover"
          />
        ))}
      </ScrollView>

      {/* Top-right counter badge  e.g. "2 / 5" */}
      <View style={styles.counterBadge}>
        <Text style={styles.counterText}>{activeIndex + 1} / {images.length}</Text>
      </View>

      {/* Bottom pagination dots */}
      <View style={styles.dotsRow}>
        {images.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#eee',
  },
  counterBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  counterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ccc',
  },
  dotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B35',
  },
});
