import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, View } from 'react-native';

import { useRsvpPost } from '@shared/hooks/useRsvpPost';
import { useTheme } from '@shared/hooks/useTheme';
import type { RsvpState } from '@shared/state/postRsvps';
import { palette } from '@shared/theme';

import { JellyPress } from '../surface/JellyPress';
import { Text } from '../ui/Text';

/**
 * Join, as a pill on a post: the quick RSVP every card has (`useRsvpPost`).
 * Solid teal until joined; after, a quiet outlined pill with a tick that says
 * where the person stands (Going, Requested, Waitlisted), and a tap asks before
 * leaving. The host's own post says Hosting and takes no tap. Someone the host
 * turned away is offered nothing.
 *
 * It fills the moment it is tapped, on every card showing that post, and goes
 * back if the server refuses. `onBeforeRsvp` is asked before a first RSVP (the
 * "Before you RSVP" notice); resolve true to go ahead.
 *
 * The words are the caller's (`labels`), so each screen keeps its own: the feed
 * says "Request" on a private post where the Explore list says "Join".
 */
export type JoinPillLabels = {
  join: string;
  /** On a private post, which asks its host first. */
  request: string;
  going: string;
  requested: string;
  waitlisted: string;
  hosting: string;
  leaveTitle: string;
  leaveBody: string;
  stay: string;
  leave: string;
};

export type JoinPillProps = {
  postId: string;
  /** The server's `rsvpState` from the card the caller drew. */
  rsvpState: RsvpState;
  privatePost: boolean;
  /** The reader's own post. */
  mine: boolean;
  onBeforeRsvp: () => Promise<boolean>;
  labels: JoinPillLabels;
};

export function JoinPill({ postId, rsvpState, privatePost, mine, onBeforeRsvp, labels }: JoinPillProps) {
  const theme = useTheme();
  const rsvp = useRsvpPost(postId, rsvpState);
  const box = { borderRadius: 999, minHeight: 36, paddingHorizontal: 16, justifyContent: 'center' } as const;

  if (mine) {
    return (
      <View style={[box, { paddingHorizontal: 12 }]}>
        <Text variant="labelSm" tone="muted">
          {labels.hosting}
        </Text>
      </View>
    );
  }
  if (rsvp.closed) return null;

  const press = () => {
    if (rsvp.pending) return;
    if (rsvp.joined) {
      Alert.alert(labels.leaveTitle, labels.leaveBody, [
        { text: labels.stay, style: 'cancel' },
        { text: labels.leave, style: 'destructive', onPress: rsvp.leave },
      ]);
      return;
    }
    void onBeforeRsvp().then((ok) => ok && rsvp.join());
  };
  const label = !rsvp.joined
    ? privatePost
      ? labels.request
      : labels.join
    : rsvp.state === 'requested'
      ? labels.requested
      : rsvp.state === 'waitlisted'
        ? labels.waitlisted
        : labels.going;

  return (
    // The jelly press and light tap every pill in the app has.
    <JellyPress
      onPress={press}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: rsvp.pending, selected: rsvp.joined }}
    >
      <View
        style={[
          box,
          { flexDirection: 'row', alignItems: 'center', gap: 6, opacity: rsvp.pending ? 0.6 : 1 },
          rsvp.joined
            ? { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.primary, paddingHorizontal: 12 }
            : { backgroundColor: theme.primaryFill },
        ]}
      >
        {rsvp.joined ? <Ionicons name="checkmark" size={16} color={theme.primary} /> : null}
        <Text variant="labelSm" style={{ color: rsvp.joined ? theme.primary : palette.white }}>
          {label}
        </Text>
      </View>
    </JellyPress>
  );
}
