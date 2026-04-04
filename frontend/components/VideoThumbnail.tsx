import React, { useState, useEffect } from 'react';
import { Image, View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

let VideoThumbnails: typeof import('expo-video-thumbnails') | null = null;
if (Platform.OS !== 'web') {
  VideoThumbnails = require('expo-video-thumbnails');
}

interface VideoThumbnailProps {
  videoUri: string;
  style?: ViewStyle;
}

function getWebThumbnail(videoUri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';

    video.onloadeddata = () => {
      video.currentTime = 0.5;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          reject(new Error('No canvas context'));
        }
      } catch {
        reject(new Error('Failed to capture frame'));
      } finally {
        video.remove();
      }
    };

    video.onerror = () => {
      video.remove();
      reject(new Error('Video load failed'));
    };

    video.src = videoUri;
    video.load();
  });
}

export default function VideoThumbnailView({ videoUri, style }: VideoThumbnailProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (Platform.OS === 'web') {
      getWebThumbnail(videoUri)
        .then((uri) => { if (mounted) setThumbnail(uri); })
        .catch(() => {});
    } else if (VideoThumbnails) {
      VideoThumbnails.getThumbnailAsync(videoUri, { time: 1000 })
        .then(({ uri }) => { if (mounted) setThumbnail(uri); })
        .catch(() => {});
    }

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
