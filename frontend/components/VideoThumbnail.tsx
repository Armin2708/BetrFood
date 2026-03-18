import React, { useState, useEffect } from 'react';
import { Image, View, StyleSheet, ViewStyle } from 'react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Ionicons } from '@expo/vector-icons';

interface VideoThumbnailProps {
  videoUri: string;
  style?: ViewStyle;
}

export default function VideoThumbnailView({ videoUri, style }: VideoThumbnailProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    VideoThumbnails.getThumbnailAsync(videoUri, { time: 1000 })
      .then(({ uri }) => {
        if (mounted) setThumbnail(uri);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [videoUri]);

  return (
    <View style={[styles.container, style]}>
      {thumbnail ? (
        <Image source={{ uri: thumbnail }} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]} />
      )}
      <View style={styles.playOverlay}>
        <Ionicons name="play-circle" size={28} color="rgba(255,255,255,0.85)" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#222',
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: '#333',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
});
