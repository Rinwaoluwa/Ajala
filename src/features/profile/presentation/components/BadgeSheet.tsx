import { useState } from 'react';
import { Share, View } from 'react-native';

import { Button, Sheet, Text } from '@shared/components';
import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import type { BadgeProgress } from '../../domain/rules/achievementRules';
import { profileViewCopy } from '../profileViewCopy';
import { BadgeArt } from './BadgeArt';
import { Meter } from './Meter';

/**
 * A badge, opened (Figma "Bottom Sheet Panel"): the art, the rule, "3/3
 * completed" with "Badge earned 🎉" once it is, the Marigold bar, the
 * experiences that counted (green ticks), how many are still to go, and
 * Explore more / Share badge.
 */
export function BadgeSheet({
  progress,
  onDismiss,
  onExplore,
}: {
  progress: BadgeProgress | null;
  onDismiss: () => void;
  onExplore: () => void;
}) {
  const theme = useTheme();
  const stacked = useFontScale() > 1.3;
  const copy = profileViewCopy.badges;
  // Keep the last badge on screen while the sheet slides away.
  const [last, setLast] = useState(progress);
  if (progress && progress !== last) setLast(progress);
  const shown = progress ?? last;
  return (
    <Sheet isPresented={progress !== null} title={shown?.badge.name ?? ''} onDismiss={onDismiss}>
      {shown ? (
        <View style={{ gap: 14 }}>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <BadgeArt look={shown.badge.look} size={112} locked={!shown.earned} />
            <Text variant="bodyMd" tone="muted" className="text-center">
              {shown.badge.rule}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text variant="labelMd" style={{ flex: 1 }}>
              {copy.completed(shown.done, shown.badge.target)}
            </Text>
            {shown.earned ? (
              <View
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: theme.accent,
                  paddingHorizontal: 10,
                  paddingVertical: 2,
                }}
              >
                <Text variant="labelXs" style={{ color: palette.marigold }}>
                  {copy.earnedPill}
                </Text>
              </View>
            ) : null}
          </View>
          <Meter
            value={shown.done / shown.badge.target}
            height={8}
            label={copy.completed(shown.done, shown.badge.target)}
          />
          {shown.experiences.length ? (
            <View style={{ gap: 10 }}>
              {shown.experiences.map((e) => (
                <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: palette.success,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text variant="labelXs" style={{ color: palette.white }} maxFontSizeMultiplier={1.2}>
                      ✓
                    </Text>
                  </View>
                  <Text variant="bodyMd" style={{ flex: 1 }}>
                    {e.title}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={{ height: 1, backgroundColor: theme.border }} />
          <Text variant="bodySm" tone="muted" className="text-center">
            {copy.toGo(shown.badge.target - shown.done)}
          </Text>
          <View style={{ flexDirection: stacked ? 'column' : 'row', gap: 12 }}>
            <View style={{ flex: stacked ? undefined : 1 }}>
              <Button label={copy.exploreMore} fullWidth onPress={onExplore} />
            </View>
            <View style={{ flex: stacked ? undefined : 1 }}>
              <Button
                label={copy.share}
                variant="neutral"
                fullWidth
                disabled={!shown.earned}
                onPress={() => void Share.share({ message: copy.shareMessage(shown.badge.name) })}
              />
            </View>
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}
