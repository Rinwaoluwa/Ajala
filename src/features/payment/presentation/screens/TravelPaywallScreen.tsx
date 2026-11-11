import { useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  RoundFlag,
  StatusSheet,
  SvgIcon,
  SwirlPattern,
  Text,
  enterRise,
} from '@shared/components';
import { SCREEN_GUTTER, palette } from '@shared/theme';
import { WEB_SUBSCRIBE_URL } from '@core/config/payments';

import { subscriptionSummary, type SubscriptionSummary } from '../../domain/rules/subscriptionRules';
import { travelPaywallCopy } from '../copy';
import { useManageSubscription } from '../hooks/useManageSubscription';
import { useSubscription } from '../hooks/useSubscription';

/**
 * "Travel to London" (Figma Travel paywall, and its "alternative").
 *
 * The design sets it over a photo of the city; there are no city photos in the
 * app or the API, so it is the brand's night gradient with the swirl, which both
 * variants already fade into at the foot. The badge is the design's own
 * (`travel-badge.svg`), with the home flag and the destination's on its line.
 * Travel picks cities by Google place id, and a place suggestion carries no
 * country, so either end shows the globe when its country is not known.
 *
 * It reads the subscription afresh on opening (`GET /me/subscription`): it may
 * have opened because a teleport just came back 402.
 *
 *   - Not subscribed: the benefits and Subscribe. People pay on the web:
 *     Subscribe opens the payment page (`WEB_SUBSCRIBE_URL`) in the phone's
 *     default browser, outside the app. With no page set for this build, or
 *     when the browser cannot open it, a sheet says buying isn't available yet.
 *     Coming back to the app reads the subscription again. "Maybe later" goes back.
 *   - Subscribed: "Travel is on", when it renews or ends, and Manage, which
 *     opens the store's subscription settings or the web billing portal.
 *
 * The column enters in a short stagger; it scrolls at large text sizes.
 */

const SEAL = 104;
/** As drawn: about a third of the badge, centred on each end of its dashed line. */
const FLAG = 37;

const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const formatDate = (iso: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : DATE.format(d);
};

export type TravelPaywallScreenProps = {
  /** The destination, or null for "anywhere" (from the Pro banner). `countryCode` when known. */
  city: { name: string; countryCode?: string | null } | null;
  /** The home place's country (`MeDto.homePlace.countryCode`), or null when there is none. */
  homeCountryCode: string | null;
  /** Why it opened: a teleport (the default), or a Plan, which is a Pro feature. */
  reason?: 'teleport' | 'plans';
  onClose: () => void;
};

export function TravelPaywallScreen({
  city,
  homeCountryCode,
  reason = 'teleport',
  onClose,
}: TravelPaywallScreenProps) {
  const insets = useSafeAreaInsets();
  const copy = travelPaywallCopy;
  const { subscription, loading } = useSubscription({ fresh: true });
  const manage = useManageSubscription(subscription);
  const [notice, setNotice] = useState(false);
  const summary = subscriptionSummary(subscription);

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
              {homeCountryCode ? (
                <RoundFlag countryCode={homeCountryCode} size={FLAG} />
              ) : (
                <SvgIcon name="earth" size={FLAG} />
              )}
            </View>
            <View style={{ position: 'absolute', left: SEAL * 0.83 - FLAG / 2, top: SEAL * 0.93 - FLAG / 2 }}>
              {city?.countryCode ? (
                <RoundFlag countryCode={city.countryCode} size={FLAG} />
              ) : (
                <SvgIcon name="earth" size={FLAG} />
              )}
            </View>
          </View>
        </Animated.View>

        {summary ? (
          <>
            <Animated.View entering={enterRise(60)}>
              <Text
                variant="headingXl"
                className="mt-20 text-center"
                style={{ color: palette.white }}
                accessibilityRole="header"
              >
                {copy.subscribed.title}
              </Text>
              <Text variant="bodyMd" className="mt-8 text-center" style={{ color: 'rgba(255,255,255,0.88)' }}>
                {copy.subscribed.body}
              </Text>
              <Text
                variant="labelMd"
                className="mt-16 text-center"
                style={{ color: palette.white }}
                accessibilityLiveRegion="polite"
              >
                {summaryLine(summary)}
              </Text>
            </Animated.View>

            <Animated.View entering={enterRise(120)} className="mt-40 items-center" style={{ gap: 16 }}>
              {manage.available ? (
                <View style={{ alignSelf: 'stretch' }}>
                  <Button
                    label={copy.subscribed.manage}
                    size="lg"
                    fullWidth
                    loading={manage.opening}
                    onPress={manage.manage}
                  />
                </View>
              ) : null}
              {manage.error ? (
                <Text
                  variant="bodySm"
                  className="text-center"
                  style={{ color: palette.white }}
                  accessibilityLiveRegion="polite"
                >
                  {copy.errors[manage.error]}
                </Text>
              ) : null}
              <WhiteLink label={copy.subscribed.done} onPress={onClose} />
            </Animated.View>
          </>
        ) : (
          <>
            <Animated.View entering={enterRise(60)}>
              <Text
                variant="headingXl"
                className="mt-20 text-center"
                style={{ color: palette.white }}
                accessibilityRole="header"
              >
                {reason === 'plans' ? copy.plans.title : city ? copy.title(city.name) : copy.anywhere}
              </Text>
              <Text variant="bodyMd" className="mt-8 text-center" style={{ color: 'rgba(255,255,255,0.88)' }}>
                {reason === 'plans' ? copy.plans.body : city ? copy.body(city.name) : copy.bodyAnywhere}
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
                <Button
                  label={`${copy.subscribe} — ${copy.price(null)}`}
                  size="lg"
                  fullWidth
                  loading={loading}
                  onPress={() =>
                    WEB_SUBSCRIBE_URL
                      ? void Linking.openURL(WEB_SUBSCRIBE_URL).catch(() => setNotice(true))
                      : setNotice(true)
                  }
                />
              </View>
              <WhiteLink label={copy.later} onPress={onClose} />
            </Animated.View>
          </>
        )}
      </ScrollView>

      {/* No payment page set for this build (EXPO_PUBLIC_SUBSCRIBE_URL), or it would not open. */}
      <StatusSheet
        isPresented={notice}
        tone="info"
        title={copy.notInBuild.title}
        message={copy.notInBuild.body}
        actionLabel={copy.notInBuild.ok}
        onAction={() => setNotice(false)}
        onDismiss={() => setNotice(false)}
      />
    </View>
  );
}

function summaryLine(summary: SubscriptionSummary): string {
  const c = travelPaywallCopy.subscribed;
  switch (summary.kind) {
    case 'renews':
      return c.renews(formatDate(summary.on) ?? '');
    case 'ends':
      return c.ends(formatDate(summary.on) ?? '');
    case 'grace':
      return c.grace;
    case 'complimentary':
      return c.complimentary(formatDate(summary.until));
    default:
      return c.active;
  }
}

/** White on the night backdrop in both schemes; a text link's tones follow the scheme. */
function WhiteLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} accessibilityRole="button">
      {({ pressed }) => (
        <Text variant="bodyMd" style={{ color: palette.white, opacity: pressed ? 0.6 : 1 }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
