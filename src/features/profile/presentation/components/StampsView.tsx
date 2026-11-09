import { Image } from 'expo-image';
import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';

import { PaginationDots, Pager, Tag, Text, enterRise } from '@shared/components';
import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import { CITY_MILESTONE, type CityStamp } from '../../domain/rules/achievementRules';
import { formatMonthDay, formatMonthYear } from '../profileFormat';
import { profileViewCopy } from '../profileViewCopy';
import { BadgeArt } from './BadgeArt';
import { StampArt } from './StampArt';
import { Meter } from './Meter';

/**
 * Stamps (Figma Achievements / Stamps, light and dark): one passport stamp per
 * city the person joined something in, swiped through with dots; under the
 * chosen one, its city card (Events attended, Experiences, Visited), "Events
 * attended" with a thumbnail each, and the city's milestone ("Lagos progress").
 */
export function StampsView({ stamps }: { stamps: CityStamp[] }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const progress = useSharedValue(0);
  // At large text the three stats stack, and each row's tag drops under its text, so
  // no label is squeezed into a column too narrow to hold a word.
  const roomy = useFontScale() > 1.3;
  const stamp = stamps[Math.min(index, stamps.length - 1)];
  const copy = profileViewCopy.stamps;
  if (!stamp) return null;
  const artWidth = Math.min(width - SCREEN_GUTTER * 2, 360);

  return (
    <View style={{ gap: 20 }}>
      <View>
        <Pager
          pages={stamps}
          keyOf={(s) => s.cityId}
          index={index}
          onIndexChange={setIndex}
          progress={progress}
          height={artWidth * 0.72 + 8}
          renderPage={(s) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <StampArt city={s.city} country={s.country} width={artWidth} />
            </View>
          )}
        />
        {stamps.length > 1 ? (
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <PaginationDots count={stamps.length} progress={progress} activeIndex={index} />
          </View>
        ) : null}
      </View>

      <Animated.View
        key={stamp.cityId}
        entering={enterRise(0)}
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.card,
          padding: 16,
          gap: 12,
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <Text variant="headingMd">{[stamp.city, stamp.country].filter(Boolean).join(', ')}</Text>
          <Text variant="bodySm" tone="muted">
            {copy.journey(stamp.city)}
          </Text>
        </View>
        <View style={{ flexDirection: roomy ? 'column' : 'row', gap: 8 }}>
          <Stat label={copy.eventsAttended} value={String(stamp.activities.length)} stacked={roomy} />
          <Stat label={copy.experiences} value={String(stamp.experiences)} stacked={roomy} />
          <Stat label={copy.visited} value={formatMonthYear(stamp.firstVisit) ?? '–'} stacked={roomy} />
        </View>
      </Animated.View>

      <View style={{ gap: 12 }}>
        <Text variant="headingSm" accessibilityRole="header">
          {copy.attendedTitle}
        </Text>
        {stamp.activities.map((a) => (
          <View
            key={a.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
              padding: 10,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 10,
                overflow: 'hidden',
                backgroundColor: theme.skeleton,
              }}
            >
              {a.imageUrl ? (
                <Image source={{ uri: a.imageUrl }} style={{ flex: 1 }} contentFit="cover" />
              ) : null}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="labelMd">{a.title}</Text>
              <Text variant="bodyXs" tone="muted">
                {[a.interests[0]?.name, formatMonthDay(a.startAt)].filter(Boolean).join(' · ')}
              </Text>
              {a.placeName ? (
                <Text variant="bodyXs" tone="muted" numberOfLines={1}>
                  {a.placeName}
                </Text>
              ) : null}
              {roomy ? (
                <View style={{ alignItems: 'flex-start', marginTop: 4 }}>
                  <Tag label={profileViewCopy.completedTag} tone="success" />
                </View>
              ) : null}
            </View>
            {roomy ? null : <Tag label={profileViewCopy.completedTag} tone="success" />}
          </View>
        ))}
      </View>

      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.card,
          padding: 16,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text variant="headingSm">{copy.progress(stamp.city)}</Text>
            <Text variant="bodySm" tone="muted">
              {copy.experienceCount(stamp.activities.length)}
            </Text>
          </View>
          <View
            style={{
              borderRadius: 999,
              backgroundColor: theme.primaryFill,
              paddingHorizontal: 10,
              paddingVertical: 2,
            }}
          >
            <Text variant="labelXs" style={{ color: theme.primaryFillForeground }}>
              {`${stamp.milestone}/${CITY_MILESTONE}`}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BadgeArt
            look={{ shape: 'shield', tone: 'teal', ribbon: 'INSIDER' }}
            size={52}
            locked={stamp.milestone < CITY_MILESTONE}
          />
          <View style={{ flex: 1 }}>
            <Text variant="labelMd">{copy.milestone}</Text>
            <Text variant="bodySm" tone="muted">
              {stamp.milestone >= CITY_MILESTONE
                ? copy.milestoneDone
                : copy.milestoneToGo(CITY_MILESTONE - stamp.milestone)}
            </Text>
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="bodyXs" tone="muted">
              {copy.progressLabel}
            </Text>
            <Text variant="bodyXs" tone="muted">
              {`${Math.round((stamp.milestone / CITY_MILESTONE) * 100)}%`}
            </Text>
          </View>
          <Meter value={stamp.milestone / CITY_MILESTONE} label={copy.progress(stamp.city)} />
        </View>
      </View>
    </View>
  );
}

function Stat({ label, value, stacked }: { label: string; value: string; stacked: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: stacked ? undefined : 1,
        borderRadius: 12,
        backgroundColor: theme.surfaceMuted,
        padding: 12,
        gap: 4,
      }}
    >
      <Text variant="bodyXs" tone="muted">
        {label}
      </Text>
      <Text variant="headingSm">{value}</Text>
    </View>
  );
}
