import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { haptics } from '@shared/feedback/haptics';
import { Illustration, Sheet, Text, type IllustrationName } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import { POST_KINDS, type PostKind } from '../../domain/postKinds';
import { KIND_ART } from '../kindArt';

/**
 * "Create something" (Figma modal, light and dark): four cards — Meetup, Event,
 * Plan, Group activity — each with its art, a title and a line.
 *
 * Each card shows its art in colour (the supplied `assets/icons/colored_*.svg`,
 * as the "More" modal draws them). A card answers the finger at once: it fills
 * mint with a teal outline while pressed, and the choice is reported the moment
 * it is tapped, with no radio to tick and no pause before the wizard opens.
 */


export type CreateSomethingSheetProps = {
  isPresented: boolean;
  onDismiss: () => void;
  onChoose: (kind: PostKind) => void;
  /**
   * Kinds that need Travel Pro (a Plan): their card carries a PRO tag. Choosing
   * one is still reported; the caller decides whether it opens the wizard or
   * the paywall.
   */
  proOnly?: readonly PostKind[];
};

export function CreateSomethingSheet({ isPresented, onDismiss, onChoose, proOnly = [] }: CreateSomethingSheetProps) {
  return (
    <Sheet isPresented={isPresented} title="Create something" onDismiss={onDismiss}>
      <View style={{ gap: 12 }}>
        {POST_KINDS.map((option) => (
          <KindCard
            key={option.kind}
            title={option.title}
            body={option.body}
            art={KIND_ART[option.kind]}
            pro={proOnly.includes(option.kind)}
            onPress={() => {
              haptics.select();
              onChoose(option.kind);
            }}
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
  pro,
  onPress,
}: {
  title: string;
  body: string;
  art: { name: IllustrationName; width: number };
  pro: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  // Lit while the finger is down: the fill and outline cross-fade in 120ms, out in 180ms.
  const on = useSharedValue(0);

  const cardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [theme.card, theme.selectedFill]),
    borderColor: interpolateColor(on.value, [0, 1], [theme.border, theme.selectedForeground]),
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => on.set(withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }))}
      onPressOut={() => on.set(withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) }))}
      accessibilityRole="button"
      accessibilityLabel={pro ? `${title}. ${body}. Travel Pro` : `${title}. ${body}`}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text variant="headingSm">{title}</Text>
            {pro ? (
              <View
                style={{ backgroundColor: theme.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}
              >
                <Text variant="labelXs" style={{ color: theme.accentForeground }}>
                  PRO
                </Text>
              </View>
            ) : null}
          </View>
          <Text variant="bodySm" tone="muted">
            {body}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}
