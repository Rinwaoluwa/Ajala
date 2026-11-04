import { Host } from '@expo/ui';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Illustration, NativeIcon, Sheet, Text, icons, type IllustrationName } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import { POST_KINDS, type PostKind } from '../../domain/postKinds';

/**
 * "Create something" (Figma modal, light and dark): four cards — Meetup, Event,
 * Plan, Group activity — each with its art, a title, a line, and a radio.
 *
 * Each card shows its art in colour (the supplied `assets/icons/colored_*.svg`,
 * as the "More" modal draws them). Picking one fills the card mint with a teal
 * outline and ticks the radio, holds for a beat (`CONFIRM_MS`) so the choice is
 * seen, then closes and reports it. Everything cross-fades in 180ms.
 */

const CONFIRM_MS = 260;

const ART: Record<PostKind, { name: IllustrationName; width: number }> = {
  meetup: { name: 'meet', width: 44 },
  event: { name: 'confetti', width: 36 },
  plan: { name: 'calendar', width: 36 },
  group: { name: 'group', width: 42 },
};

export type CreateSomethingSheetProps = {
  isPresented: boolean;
  onDismiss: () => void;
  onChoose: (kind: PostKind) => void;
};

export function CreateSomethingSheet({ isPresented, onDismiss, onChoose }: CreateSomethingSheetProps) {
  const [chosen, setChosen] = useState<PostKind | null>(null);

  // A fresh sheet starts with nothing chosen.
  if (!isPresented && chosen !== null) setChosen(null);

  const choose = (kind: PostKind) => {
    setChosen(kind);
    setTimeout(() => onChoose(kind), CONFIRM_MS);
  };

  return (
    <Sheet isPresented={isPresented} title="Create something" onDismiss={onDismiss}>
      <View style={{ gap: 12 }} accessibilityRole="radiogroup">
        {POST_KINDS.map((option) => (
          <KindCard
            key={option.kind}
            title={option.title}
            body={option.body}
            art={ART[option.kind]}
            selected={chosen === option.kind}
            onPress={() => choose(option.kind)}
          />
        ))}
      </View>
    </Sheet>
  );
}

function KindCard({
  title,
  body,
  art,
  selected,
  onPress,
}: {
  title: string;
  body: string;
  art: { name: IllustrationName; width: number };
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const on = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    on.value = withTiming(selected ? 1 : 0, { duration: 180, easing: Easing.out(Easing.quad) });
  }, [selected, on]);

  const cardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [theme.card, theme.selectedFill]),
    borderColor: interpolateColor(on.value, [0, 1], [theme.border, theme.selectedForeground]),
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${body}`}
    >
      <Animated.View
        style={[
          {
            minHeight: 76,
            borderRadius: 16,
            borderWidth: 1.5,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            gap: 16,
          },
          cardStyle,
        ]}
      >
        <View style={{ width: 48, alignItems: 'center' }}>
          <Illustration name={art.name} width={art.width} active />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="headingSm" style={selected ? { color: theme.selectedForeground } : undefined}>
            {title}
          </Text>
          <Text variant="bodySm" tone="muted">
            {body}
          </Text>
        </View>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: selected ? 0 : 1.5,
            borderColor: theme.track,
            backgroundColor: selected ? theme.primaryFill : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected ? (
            <Host matchContents pointerEvents="none" ignoreSafeArea="all">
              <NativeIcon source={icons.check} size={11} color={theme.primaryFillForeground} />
            </Host>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}
