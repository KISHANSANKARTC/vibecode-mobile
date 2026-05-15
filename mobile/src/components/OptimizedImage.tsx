import React, { useState, useCallback, useEffect } from 'react';
import { Image, View, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';

interface OptimizedImageProps {
  uri: string | null | undefined;
  width?: number;
  height?: number;
  borderRadius?: number;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  fallbackColor?: string;
  fallbackText?: string;
  showLoadingIndicator?: boolean;
  cachePolicy?: 'force-cache' | 'reload' | 'default';
}

const FALLBACK_COLORS = [
  '#E8F4F8',
  '#F0E8F8',
  '#F8E8E8',
  '#E8F8E8',
  '#F8F8E8',
  '#F8E8F8',
  '#E8E8F8',
];

// Hash function to generate consistent colors based on URI
const getColorForUri = (uri: string | null | undefined): string => {
  if (!uri) {
    return '#F0F0F0';
  }
  let hash = 0;
  for (let i = 0; i < uri.length; i++) {
    const char = uri.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % FALLBACK_COLORS.length;
  return FALLBACK_COLORS[index];
};

export function OptimizedImage({
  uri,
  width,
  height,
  borderRadius = 0,
  resizeMode = 'cover',
  fallbackColor,
  fallbackText = 'No Image',
  showLoadingIndicator = true,
  cachePolicy = 'default',
}: OptimizedImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageSource, setImageSource] = useState<any>(null);

  const backgroundColor = fallbackColor || getColorForUri(uri);

  // Validate and format URI
  useEffect(() => {
    if (!uri || typeof uri !== 'string' || uri.trim() === '') {
      setError(true);
      setLoading(false);
      return;
    }

    // Ensure URI is properly formatted
    let formattedUri = uri.trim();

    // Check if it's a valid URL
    if (!formattedUri.startsWith('http://') && !formattedUri.startsWith('https://') && !formattedUri.startsWith('file://')) {
      setError(true);
      setLoading(false);
      return;
    }

    // Create image source with cache headers
    const source = {
      uri: formattedUri,
      headers: {
        'Cache-Control': cachePolicy === 'force-cache' ? 'max-age=31536000' : 'public',
        'Pragma': 'public',
      },
    };

    setImageSource(source);
    setError(false);
    setLoading(true);
  }, [uri, cachePolicy]);

  const handleLoadStart = useCallback(() => {
    setLoading(true);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setError(true);
    setLoading(false);
    console.warn(`Image failed to load: ${uri}`);
  }, [uri]);

  // If no URI or invalid, show fallback
  if (!imageSource || error) {
    return (
      <View
        style={[
          styles.container,
          {
            width,
            height,
            borderRadius,
            backgroundColor,
          },
        ]}
      >
        <Text style={[styles.fallbackText, { color: '#999' }]}>
          {fallbackText}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius,
          backgroundColor,
        },
      ]}
    >
      {showLoadingIndicator && loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#999" />
        </View>
      ) : null}

      <Image
        source={imageSource}
        style={[
          styles.image,
          {
            width: '100%',
            height: '100%',
            borderRadius,
          },
        ]}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onProgress={(e) => {
          // Track loading progress for better UX
          if (e.nativeEvent.loaded > 0) {
            setLoading(true);
          }
        }}
      />

      {error ? (
        <View style={styles.errorOverlay}>
          <Text style={styles.fallbackText}>{fallbackText}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    zIndex: 1,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  fallbackText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
