import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Text,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface VideoPlayerProps {
  uri: string;
  height?: number;
  autoplay?: boolean;       // autoplay on mount (muted)
  showControls?: boolean;   // show full playback controls
}

export default function VideoPlayer({
  uri,
  height = 300,
  autoplay = false,
  showControls = true,
}: VideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isMuted, setIsMuted] = useState(autoplay); // autoplay always starts muted
  const [isLoaded, setIsLoaded] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [position, setPosition] = useState<number>(0);

  useEffect(() => {
    if (autoplay && isLoaded) {
      videoRef.current?.playAsync();
    }
  }, [isLoaded, autoplay]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
    setPosition(status.positionMillis ?? 0);
    if (status.durationMillis) setDuration(status.durationMillis);
    // Loop video in feed autoplay mode
    if (autoplay && status.didJustFinish) {
      videoRef.current?.replayAsync();
    }
  };

  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      // Unmute when user manually plays
      await videoRef.current.setIsMutedAsync(false);
      setIsMuted(false);
      await videoRef.current.playAsync();
    }
  };

  const toggleMute = async () => {
    if (!videoRef.current) return;
    const next = !isMuted;
    await videoRef.current.setIsMutedAsync(next);
    setIsMuted(next);
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { height }]}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={[styles.video, { width: SCREEN_WIDTH, height }]}
        resizeMode={ResizeMode.COVER}
        isMuted={isMuted}
        shouldPlay={autoplay}
        isLooping={autoplay}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onLoad={() => setIsLoaded(true)}
        useNativeControls={false}
      />

      {/* Tap overlay — toggles play/pause */}
      <TouchableOpacity style={styles.tapOverlay} onPress={togglePlay} activeOpacity={1}>
        {/* Play icon shown when paused */}
        {!isPlaying && (
          <View style={styles.playIcon}>
            <Ionicons name="play" size={40} color="#fff" />
          </View>
        )}
      </TouchableOpacity>

      {/* Mute button — always visible */}
      <TouchableOpacity style={styles.muteButton} onPress={toggleMute}>
        <Ionicons
          name={isMuted ? 'volume-mute' : 'volume-high'}
          size={20}
          color="#fff"
        />
      </TouchableOpacity>

      {/* Duration badge */}
      {duration && (
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>
            {showControls
              ? `${formatTime(position)} / ${formatTime(duration)}`
              : formatTime(duration)}
          </Text>
        </View>
      )}

      {/* Video label badge */}
      <View style={styles.videoBadge}>
        <Ionicons name="videocam" size={12} color="#fff" />
        <Text style={styles.videoBadgeText}>VIDEO</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#000',
  },
  video: {
    backgroundColor: '#000',
  },
  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 16,
    padding: 6,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  videoBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
