import { Host } from '@expo/ui';
import { TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import {
  Button,
  MenuButton,
  NativeIcon,
  Text,
  buttonMetrics,
  icons,
  type MenuAction,
} from '@shared/components';
import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';

import type { PostDetail } from '../../domain/entities/PostDetail';
import type { JoinAction } from '../../domain/rules/postDetailRules';
import { postCopy } from '../copy';

/**
 * The main button and Share beside it (Figma post detail): "Join event",
 * "Request to join", "✓ You're Going", "Event full"… — one per `JoinAction`.
 *
 * Going, Requested and Waitlisted stay tappable to leave or withdraw (the
 * screen asks first). Full, started and cancelled are the disabled grey pill.
 * The label cross-fades (150ms) as the state changes. Hidden when the person
 * was declined or removed (spec §2.13). The host gets "Manage post" (cancel or
 * delete) instead.
 *
 * Layout: the Share square is sized from the button's own height at the current
 * text size (`buttonMetrics.heightAt`), and the pair is centred, so they always
 * line up.
 */
export function JoinBar({
  post,
  action,
  pending,
  onJoin,
  onLeave,
  onShare,
  manageMenu,
}: {
  post: PostDetail;
  action: JoinAction;
  pending: boolean;
  /** Joins by RSVP; on a post with a link, the screen's handler opens that too. */
  onJoin: () => void;
  onLeave: () => void;
  onShare: () => void;
  /** The host's choices under "Manage post" (the same as the ⋯ menu). */
  manageMenu: MenuAction[];
}) {
  const theme = useTheme();
  const side = buttonMetrics.heightAt('lg', useFontScale());
  const b = postCopy.button;

  const button = (() => {
    switch (action) {
      case 'join':
        return { label: b.join(post.type), onPress: onJoin };
      case 'request':
        return { label: b.request, onPress: onJoin };
      case 'joinWaitlist':
        return { label: b.joinWaitlist, onPress: onJoin };
      case 'going':
        return { label: b.going, onPress: onLeave, icon: icons.check };
      case 'requested':
        return { label: b.requested, onPress: onLeave, variant: 'secondary' as const };
      case 'waitlisted':
        return {
          label: b.waitlisted(post.waitlistPosition),
          onPress: onLeave,
          variant: 'secondary' as const,
        };
      case 'full':
        return { label: b.full(post.type), disabled: true };
      case 'started':
        return { label: b.started, disabled: true };
      case 'attended':
        return { label: b.attended, disabled: true, icon: icons.check };
      case 'cancelled':
        return { label: b.cancelled, disabled: true };
      case 'host':
        return { label: b.manage, variant: 'secondary' as const };
      case 'none':
        return null;
    }
  })();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {button ? (
        <Animated.View key={button.label} entering={FadeIn.duration(150)} style={{ flex: 1 }}>
          {action === 'host' ? (
            // The host's "Manage post" opens the same native menu as the ⋯ at the top.
            <MenuButton actions={manageMenu} accessibilityLabel={button.label} cancelLabel={postCopy.close}>
              <Button label={button.label} size="lg" fullWidth variant="secondary" testID="post-join" />
            </MenuButton>
          ) : (
            <Button
              label={button.label}
              size="lg"
              fullWidth
              variant={'variant' in button && button.variant ? button.variant : 'primary'}
              icon={'icon' in button ? button.icon : undefined}
              disabled={'disabled' in button ? button.disabled : false}
              loading={pending}
              onPress={'onPress' in button ? button.onPress : undefined}
              testID="post-join"
            />
          )}
        </Animated.View>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={onShare}
        accessibilityRole="button"
        accessibilityLabel={postCopy.share}
        style={{
          // Exactly the button's height at this text size, and square.
          width: side,
          height: side,
          borderRadius: 16,
          backgroundColor: theme.surfaceMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Host matchContents pointerEvents="none" ignoreSafeArea="all">
          <NativeIcon source={icons.share} size={18} color={theme.foreground} />
        </Host>
      </TouchableOpacity>
    </View>
  );
}

/** The note under a closed post: "This event is full", "This was cancelled". */
export function ClosedNote({ title, body }: { title: string; body: string }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ gap: 4 }} accessibilityLiveRegion="polite">
      <Text variant="headingSm">{title}</Text>
      <Text variant="bodySm" tone="muted">
        {body}
      </Text>
    </Animated.View>
  );
}
