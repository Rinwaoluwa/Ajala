import { Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, RoundFlag, SvgIcon, SwirlPattern, Text, enterRise } from '@shared/components';
import { SCREEN_GUTTER, palette } from '@shared/theme';

import { travelPaywallCopy } from '../copy';

/**
 * "Travel to London" (Figma Travel paywall, and its "alternative").
 *
 * The design sets it over a photo of the city; there are no city photos in the
 * app or the API, so it is the brand's night gradient with the swirl, which both
 * variants already fade into at the foot. The badge is the design's own
 * (`travel-badge.svg`), with the home flag and the destination's on its line.
 *
 * The subscription is not built (API map §12): the button says "Coming soon" and
 * does nothing, as agreed with product. "Maybe later" goes back.
 *
 * The column enters in a short stagger; it scrolls at large text sizes.
 */

const SEAL = 104;
/** As drawn: about a third of the badge, centred on each end of its dashed line. */
const FLAG = 37;

export type TravelPaywallScreenProps = {
  /** The destination, or null for "anywhere" (from the Pro banner). */
  city: { name: string; countryCode: string } | null;
  homeCountryCode: string;
  onClose: () => void;
};

export function TravelPaywallScreen({ city, homeCountryCode, onClose }: TravelPaywallScreenProps) {
  const insets = useSafeAreaInsets();
  const copy = travelPaywallCopy;

  return (
    <View
      style={{
        flex: 1,
        experimental_backgroundImage: 'linear-gradient(180deg, #5E7E93 0%, #2C4048 45%, #0F1A1A 100%)',
      }}
    >
      <SwirlPattern color={palette.white} opacity={0.06} />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: SCREEN_GUTTER + 12,
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <Animated.View entering={enterRise(0)} style={{ alignItems: 'center' }}>
          {/* The design's badge (`travel-badge.svg`): the seal, its check, and the
              dashed line the two flags sit on — home at its left end, the
              destination at its right, overlapping the seal's lower edge. */}
          <View style={{ width: SEAL, height: SEAL }} accessibilityLabel={city ? `${city.name}` : undefined}>
            <SvgIcon name="travelBadge" size={SEAL} />
            <View style={{ position: 'absolute', left: SEAL * 0.17 - FLAG / 2, top: SEAL * 0.93 - FLAG / 2 }}>
              <RoundFlag countryCode={homeCountryCode} size={FLAG} />
            </View>
            <View style={{ position: 'absolute', left: SEAL * 0.83 - FLAG / 2, top: SEAL * 0.93 - FLAG / 2 }}>
              {city ? (
                <RoundFlag countryCode={city.countryCode} size={FLAG} />
              ) : (
                <SvgIcon name="earth" size={FLAG} />
              )}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={enterRise(60)}>
          <Text
            variant="headingXl"
            className="mt-20 text-center"
            style={{ color: palette.white }}
            accessibilityRole="header"
          >
            {city ? copy.title(city.name) : copy.anywhere}
          </Text>
          <Text variant="bodyMd" className="mt-8 text-center" style={{ color: 'rgba(255,255,255,0.88)' }}>
            {city ? copy.body(city.name) : copy.bodyAnywhere}
          </Text>
        </Animated.View>

        <Animated.View entering={enterRise(120)} className="mt-32" style={{ gap: 18 }}>
          {copy.benefits.map((benefit) => (
            <View key={benefit} className="flex-row items-center" style={{ gap: 12 }}>
              <SvgIcon name="check" size={20} />
              <Text variant="bodyMd" style={{ color: palette.white, flex: 1 }}>
                {benefit}
              </Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={enterRise(180)} className="mt-40 items-center" style={{ gap: 16 }}>
          <View style={{ alignSelf: 'stretch' }}>
            <Button label={`${copy.comingSoon} — ${copy.price}`} size="lg" fullWidth disabled />
          </View>
          {/* White on the night backdrop in both schemes; a text link's tones follow the scheme. */}
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
            {({ pressed }) => (
              <Text variant="bodyMd" style={{ color: palette.white, opacity: pressed ? 0.6 : 1 }}>
                {copy.later}
              </Text>
            )}
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
