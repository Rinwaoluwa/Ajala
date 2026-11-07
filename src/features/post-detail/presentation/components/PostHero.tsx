import Ionicons from '@expo/vector-icons/Ionicons';
import { Host } from '@expo/ui';
import { useEffect, useState, type ReactNode } from 'react';
import { TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  GlassSurface,
  ImageCarousel,
  MenuButton,
  NativeIcon,
  PaginationDots,
  Text,
  icons,
  type MenuAction,
} from '@shared/components';
import { useLiquidGlass } from '@shared/hooks/useLiquidGlass';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import type { PostType } from '../../domain/entities/PostDetail';
import { TYPE_LABEL, postCopy } from '../copy';

/**
 * The photos at the top of the post (Figma post detail): swipe between them,
 * dots under them, a round back button at the top-left and the type tag at the
 * top-right — floating chrome, so Liquid Glass where the phone has it, kept light
 * so its dark marks read over any photo. A bookmark beside the tag saves the
 * post to the account (the same save as every card's). A ⋯ after it opens the post's
 * options (report, or the host's cancel and delete) — on iOS the native
 * pull-down menu, anchored to the button.
 *
 * The photo band is a share of the width (about 4:7), capped so the title and
 * the button still show on a short screen.
 */

const BUTTON = 40;

export function PostHero({
  images,
  title,
  type,
  onBack,
  menu,
  save = null,
  scrollY,
  firstPlaceholder,
}: {
  images: string[];
  title: string;
  type: PostType;
  onBack: () => void;
  /** The ⋯ menu's choices (report; or the host's cancel and delete); none hides it. */
  menu: MenuAction[] | null;
  /** The bookmark: whether it is saved and how to flip it. None hides it (a draft or cancelled post). */
  save?: { saved: boolean; onToggle: () => void } | null;
  /**
   * The page's scroll position. Pulled down past the top, the photo stretches
   * to fill the gap (and the buttons stay put) instead of showing the page's
   * background above it.
   */
  scrollY?: SharedValue<number>;
  /** The tapped card's copy of the first photo, shown under it until it loads. */
  firstPlaceholder?: string | null;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height: screen } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const progress = useSharedValue(0);
  const height = Math.min(Math.round(width * 0.62), Math.round(screen * 0.42)) + insets.top;
  // Scaled about its centre: half the pull moves it up, the growth covers the rest,
  // so its top stays at the screen's top and its bottom where it was.
  const stretch = useAnimatedStyle(() => {
    const pull = Math.min(scrollY?.value ?? 0, 0);
    return { transform: [{ translateY: pull / 2 }, { scale: 1 - pull / height }] };
  });
  const pinned = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.min(scrollY?.value ?? 0, 0) }],
  }));

  return (
    <View style={{ height }}>
      <Animated.View style={[{ height, backgroundColor: theme.skeleton }, stretch]}>
        {images.length ? (
          <ImageCarousel
            images={images.map((uri, i) => ({
              key: `${i}-${uri}`,
              source: { uri },
              accessibilityLabel: `${title}, photo ${i + 1} of ${images.length}`,
            }))}
            index={index}
            onIndexChange={setIndex}
            height={height}
            progress={progress}
          />
        ) : null}
      </Animated.View>
      {images.length > 1 ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 14, alignItems: 'center' }}
        >
          <PaginationDots count={images.length} progress={progress} activeIndex={index} onSurface />
        </View>
      ) : null}

      <Animated.View
        pointerEvents="box-none"
        style={[
          {
            position: 'absolute',
            top: insets.top + 8,
            left: 16,
            right: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          },
          pinned,
        ]}
      >
        <RoundButton label={postCopy.back} icon={icons.chevronLeft} onPress={onBack} />
        <View style={{ flex: 1 }} />
        <GlassSurface
          fallbackColor={theme.selectedFill}
          appearance="light"
          shadow={false}
          style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}
        >
          <Text variant="labelSm" style={{ color: palette.teal }}>
            {TYPE_LABEL[type]}
          </Text>
        </GlassSurface>
        {save ? <SaveButton saved={save.saved} onToggle={save.onToggle} /> : null}
        {menu?.length ? (
          <MenuButton actions={menu} accessibilityLabel={postCopy.more} cancelLabel={postCopy.close}>
            <RoundFace icon={icons.more} />
          </MenuButton>
        ) : null}
      </Animated.View>
    </View>
  );
}

function RoundButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: (typeof icons)[keyof typeof icons];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <RoundFace icon={icon} />
    </TouchableOpacity>
  );
}

/**
 * The bookmark (Ionicons, as on every post card). Outline and filled cross-fade
 * in 160ms, so the mark keeps its shape and only fills; the glass never moves.
 */
function SaveButton({ saved, onToggle }: { saved: boolean; onToggle: () => void }) {
  const on = useSharedValue(saved ? 1 : 0);
  useEffect(() => {
    on.set(withTiming(saved ? 1 : 0, { duration: 160, easing: Easing.out(Easing.quad) }));
  }, [saved, on]);
  const outline = useAnimatedStyle(() => ({ opacity: 1 - on.value }));
  const filled = useAnimatedStyle(() => ({ opacity: on.value }));
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onToggle}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={saved ? postCopy.saved : postCopy.save}
      accessibilityState={{ selected: saved }}
    >
      <RoundFace>
        <Animated.View style={[{ position: 'absolute' }, outline]}>
          <Ionicons name="bookmark-outline" size={18} color={palette.teal} />
        </Animated.View>
        <Animated.View style={filled}>
          <Ionicons name="bookmark" size={18} color={palette.teal} />
        </Animated.View>
      </RoundFace>
    </TouchableOpacity>
  );
}

/** The round glass face of the hero's buttons: a native glyph, or what is passed in. */
function RoundFace({
  icon,
  children,
}: {
  icon?: (typeof icons)[keyof typeof icons];
  children?: ReactNode;
}) {
  const theme = useTheme();
  const glass = useLiquidGlass();
  return (
    <GlassSurface
      fallbackColor={theme.selectedFill}
      appearance="light"
      // Glass darkens over a dark part of the photo; a white tint keeps it pale, so the teal mark reads.
      tint={glass ? 'rgba(255,255,255,0.6)' : null}
      interactive
      shadow={false}
      style={{
        width: BUTTON,
        height: BUTTON,
        borderRadius: BUTTON / 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon ? (
        <Host matchContents pointerEvents="none" ignoreSafeArea="all">
          <NativeIcon source={icon} size={15} color={palette.teal} />
        </Host>
      ) : (
        children
      )}
    </GlassSurface>
  );
}
