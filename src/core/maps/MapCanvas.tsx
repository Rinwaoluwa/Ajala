import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import Constants from 'expo-constants';
import { Platform, StyleSheet, Text, View, useColorScheme } from 'react-native';
import MapView, { Marker, type MapPressEvent, type Region } from 'react-native-maps';

import { darkMapStyle } from './darkMapStyle';
import type { MapRegion } from './geo';

/**
 * The map, as the app uses it. The only file that imports react-native-maps, so
 * the provider can change without touching a feature (map README).
 *
 * Apple Maps on iOS (no key), Google Maps on Android (key from
 * `GOOGLE_MAPS_ANDROID_API_KEY`, see app.config.js). It follows the colour
 * scheme: iOS by its own appearance, Android through `darkMapStyle`.
 *
 * The map's own chrome is off — compass, toolbar, points of interest — because
 * the screen draws its own controls over it, and businesses' pins would compete
 * with the posts'.
 */

export type MapKind = 'standard' | 'satellite';

export type MapCanvasHandle = {
  /** Moves the camera to a region, easing over `durationMs`. */
  animateTo: (region: MapRegion, durationMs?: number) => void;
};

export type MapCanvasProps = {
  initialRegion: MapRegion;
  kind?: MapKind;
  /** Whether to draw the person's own position (needs location permission). */
  showsUserLocation?: boolean;
  /** Space the screen's overlays cover, so the map centres in what is left. */
  padding?: { top: number; right: number; bottom: number; left: number };
  /** After a pan or zoom has come to rest. */
  onRegionSettled?: (region: MapRegion) => void;
  /** A tap on the map itself, not on a pin. */
  onPressMap?: () => void;
  children?: ReactNode;
};

/**
 * Whether this build can draw a map. Android's Google Maps closes the app when it
 * starts without an API key, so a build made without GOOGLE_MAPS_ANDROID_API_KEY
 * (app.config.js records it) draws a note in the map's place instead. iOS uses
 * Apple Maps, which needs no key.
 */
export const MAP_AVAILABLE =
  Platform.OS !== 'android' || Constants.expoConfig?.extra?.googleMapsAndroid === true;

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(function MapCanvas(
  {
    initialRegion,
    kind = 'standard',
    showsUserLocation = false,
    padding,
    onRegionSettled,
    onPressMap,
    children,
  },
  ref,
) {
  const map = useRef<MapView>(null);
  const dark = useColorScheme() === 'dark';

  useImperativeHandle(ref, () => ({
    animateTo: (region, durationMs = 450) => map.current?.animateToRegion(region as Region, durationMs),
  }));

  if (!MAP_AVAILABLE) return <MapUnavailable dark={dark} />;

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion as Region}
      mapType={kind}
      userInterfaceStyle={dark ? 'dark' : 'light'}
      customMapStyle={Platform.OS === 'android' && dark ? darkMapStyle : undefined}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      showsPointsOfInterests={false}
      pitchEnabled={false}
      rotateEnabled={false}
      moveOnMarkerPress={false}
      mapPadding={padding}
      onRegionChangeComplete={(region) => onRegionSettled?.(region)}
      onPress={(e: MapPressEvent) => {
        // A marker tap also reaches the map on iOS; only a tap on the map itself closes things.
        if (e.nativeEvent.action !== 'marker-press') onPressMap?.();
      }}
    >
      {children}
    </MapView>
  );
});

function MapUnavailable({ dark }: { dark: boolean }) {
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          backgroundColor: dark ? '#1C2B2A' : '#E8EFEE',
        },
      ]}
      accessible
      accessibilityLabel="The map isn't available in this build."
    >
      <Text style={{ textAlign: 'center', fontSize: 14, color: dark ? '#C9D6D4' : '#4A5958' }}>
        The map isn&apos;t available in this build.
      </Text>
    </View>
  );
}

export type MapPinProps = {
  id: string;
  latitude: number;
  longitude: number;
  onPress: () => void;
  accessibilityLabel: string;
  /** Changes to what the pin draws (selected, say): it is redrawn when this changes. */
  version?: string;
  children: ReactNode;
};

/**
 * A pin drawn by the caller. Map SDKs snapshot a custom marker's view; it is
 * tracked only briefly after mount or a change (so images and fonts land) and
 * then frozen, which keeps hundreds of pins cheap to pan over.
 */
export function MapPin({
  id,
  latitude,
  longitude,
  onPress,
  accessibilityLabel,
  version,
  children,
}: MapPinProps) {
  // The version whose drawing has been frozen; until it matches, the pin is tracked.
  const [frozen, setFrozen] = useState<string | null>(null);
  const current = version ?? '';
  const tracking = frozen !== current;

  useEffect(() => {
    const timer = setTimeout(() => setFrozen(current), 600);
    return () => clearTimeout(timer);
  }, [current]);

  return (
    <Marker
      identifier={id}
      coordinate={{ latitude, longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracking}
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Marker>
  );
}
