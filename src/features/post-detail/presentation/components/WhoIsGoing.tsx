import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  Avatar,
  EmptyState,
  SkeletonBlock,
  SkeletonPulse,
  Text,
  TextLink,
  enterRise,
} from '@shared/components';
import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import type { Attendee } from '../../domain/entities/PostDetail';
import { postCopy } from '../copy';

/**
 * "Who's Going" (Figma post detail): the heading with "N total" in teal, then
 * one row per person — photo, name, "Attending". The host also sees requests
 * first, marked "Pending", with Accept and Decline (`POST …/accept|decline`).
 *
 * Nobody yet: "No one's joined yet / Be the first to join…" with the people art.
 * Rows rise in, staggered a little, the first time they appear.
 */
/** People shown before "Show all", as the design lists them. */
const PREVIEW = 4;

export function WhoIsGoing({
  going,
  requested,
  total,
  loading,
  failed,
  hasMore,
  responding,
  onRetry,
  onMore,
  onOpenPerson,
  onRespond,
}: {
  going: Attendee[];
  requested: Attendee[];
  total: number;
  loading: boolean;
  failed: boolean;
  hasMore: boolean;
  responding: string | null;
  onRetry: () => void;
  onMore: () => void;
  onOpenPerson: (userId: string) => void;
  onRespond: (userId: string, answer: 'accept' | 'decline') => void;
}) {
  const theme = useTheme();
  const c = postCopy.going;
  const [expanded, setExpanded] = useState(false);
  const empty = !loading && !failed && going.length === 0 && requested.length === 0;
  // Requests first (they need the host), then who is going; four until "Show all".
  const everyone = [...requested, ...going];
  const shown = expanded ? everyone : everyone.slice(0, PREVIEW);
  const hidden = everyone.length - shown.length;

  return (
    <View style={{ gap: 12 }}>
      <View
        style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}
      >
        <Text variant="headingMd" accessibilityRole="header">
          {c.title}
        </Text>
        <Text variant="bodySm" tone="primary">
          {c.total(total)}
        </Text>
      </View>

      {loading ? (
        <SkeletonPulse>
          <View style={{ gap: 14 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <SkeletonBlock width={48} height={48} radius={24} />
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonBlock width="50%" height={14} />
                  <SkeletonBlock width="30%" height={12} />
                </View>
              </View>
            ))}
          </View>
        </SkeletonPulse>
      ) : failed ? (
        // One line of text with the retry inside it, so the two share a baseline and wrap together.
        <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">
          {`${c.failed} `}
          <Text variant="bodySm" tone="link" onPress={onRetry} accessibilityRole="link">
            {c.retry}
          </Text>
        </Text>
      ) : empty ? (
        <EmptyState
          art={<Ionicons name="people-outline" size={56} color={theme.primary} />}
          title={c.emptyTitle}
          body={c.emptyBody}
        />
      ) : (
        <View style={{ gap: 14 }}>
          {shown.map((a, i) => (
            <Animated.View key={`${a.state}-${a.userId}`} entering={i < 6 ? enterRise(i * 40) : undefined}>
              <PersonRow
                person={a}
                busy={responding === a.userId}
                onOpen={() => onOpenPerson(a.userId)}
                onRespond={(answer) => onRespond(a.userId, answer)}
              />
            </Animated.View>
          ))}
          {hidden > 0 || (expanded && hasMore) ? (
            <View style={{ alignItems: 'flex-start' }}>
              <TextLink
                label={hidden > 0 ? c.showAll(requested.length + total) : c.showMore}
                onPress={hidden > 0 ? () => setExpanded(true) : onMore}
                emphasis="plain"
              />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

function PersonRow({
  person,
  busy,
  onOpen,
  onRespond,
}: {
  person: Attendee;
  busy: boolean;
  onOpen: () => void;
  onRespond: (answer: 'accept' | 'decline') => void;
}) {
  const c = postCopy.going;
  // At large text the two pills would leave the name a sliver: they drop under it,
  // lined up with the text past the photo (48 + 14).
  const stacked = useFontScale() > 1.3;
  const status =
    person.state === 'requested'
      ? c.pending
      : person.state === 'waitlisted'
        ? c.waitlisted(person.position)
        : c.attending;
  return (
    <View style={stacked ? { gap: 10 } : { flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${person.name}, ${status}`}
        style={{ flex: stacked ? undefined : 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}
      >
        <Avatar name={person.name} uri={person.avatarUrl} size={48} ring />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyMd" numberOfLines={1}>
            {person.name}
          </Text>
          <Text variant="bodySm" tone="muted">
            {status}
          </Text>
        </View>
      </TouchableOpacity>
      {person.state === 'requested' ? (
        // Two pills of one size, centred on the row, so they always line up.
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
            paddingLeft: stacked ? 62 : 0,
          }}
        >
          <RespondPill
            label={c.decline}
            kind="decline"
            disabled={busy}
            onPress={() => onRespond('decline')}
          />
          <RespondPill label={c.accept} kind="accept" busy={busy} onPress={() => onRespond('accept')} />
        </View>
      ) : null}
    </View>
  );
}

/** Decline (outlined) and Accept (teal): the same height, padding and capsule. */
function RespondPill({
  label,
  kind,
  busy = false,
  disabled = false,
  onPress,
}: {
  label: string;
  kind: 'accept' | 'decline';
  busy?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const accept = kind === 'accept';
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      style={{
        minHeight: 36,
        paddingHorizontal: 16,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: accept ? theme.primaryFill : 'transparent',
        borderWidth: accept ? 0 : 1,
        borderColor: theme.border,
        opacity: disabled && !accept ? 0.5 : 1,
      }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={palette.white} />
      ) : (
        <Text variant="labelSm" style={{ color: accept ? palette.white : theme.foreground }}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
