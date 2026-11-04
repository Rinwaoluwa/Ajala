import Ionicons from '@expo/vector-icons/Ionicons';
import { Host } from '@expo/ui';
import { useCallback, useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Avatar,
  EmptyState,
  NativeIcon,
  SkeletonBlock,
  SkeletonPulse,
  Text,
  TextField,
  TextLink,
  enterRise,
  icons,
} from '@shared/components';
import { useKeyboardShown } from '@shared/hooks/useKeyboardShown';
import { useTheme } from '@shared/hooks/useTheme';

import type { PostComment, Viewer } from '../../domain/entities/PostDetail';
import type { PostDetailErrorCode } from '../../domain/entities/PostDetailError';
import { COMMENT_MAX } from '../../domain/usecases/PostDetailUseCases';
import { postCopy, postErrorMessages } from '../copy';
import { formatAgo } from '../format';

/**
 * Comments (Figma post detail): "Comments" with the count, then one row per
 * comment — the person's photo, a pale rounded bubble with their name and what
 * they said, and under it "5h ago · Reply". A reply opens with the name it
 * answers, in teal. Oldest first; new comments rise in (`enterRise`).
 *
 * Empty, or while the API has no comments (API map §12): "No comments yet /
 * Have a question? Start the conversation."
 */
export function CommentsSection({
  comments,
  total,
  loading,
  unavailable,
  hasMore,
  onLoadMore,
  onReply,
}: {
  comments: PostComment[];
  total: number;
  loading: boolean;
  unavailable: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onReply: (comment: PostComment) => void;
}) {
  const theme = useTheme();
  const c = postCopy.comments;
  const empty = unavailable || (!loading && comments.length === 0);
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text variant="headingMd" accessibilityRole="header">
          {c.title}
        </Text>
        <Text variant="bodySm" tone="muted">
          {unavailable ? 0 : total}
        </Text>
      </View>
      {loading ? (
        <SkeletonPulse label={c.loading}>
          <View style={{ gap: 16 }}>
            {[0, 1].map((i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                <SkeletonBlock width={44} height={44} radius={22} />
                <View style={{ flex: 1 }}>
                  <SkeletonBlock height={72} radius={20} />
                </View>
              </View>
            ))}
          </View>
        </SkeletonPulse>
      ) : empty ? (
        <EmptyState
          art={<Ionicons name="chatbox-ellipses-outline" size={56} color={theme.primary} />}
          title={c.emptyTitle}
          body={c.emptyBody}
        />
      ) : (
        <View style={{ gap: 18 }}>
          {comments.map((comment, i) => (
            <Animated.View
              key={comment.id}
              entering={i < 6 || comment.pending ? enterRise(i < 6 ? i * 40 : 0) : undefined}
            >
              <CommentRow comment={comment} onReply={() => onReply(comment)} />
            </Animated.View>
          ))}
          {hasMore ? <TextLink label={c.more} onPress={onLoadMore} emphasis="plain" /> : null}
        </View>
      )}
    </View>
  );
}

function CommentRow({ comment, onReply }: { comment: PostComment; onReply: () => void }) {
  const theme = useTheme();
  const c = postCopy.comments;
  return (
    <View style={{ flexDirection: 'row', gap: 12, opacity: comment.pending ? 0.6 : 1 }}>
      <Avatar name={comment.author.name} uri={comment.author.avatarUrl} size={44} />
      <View style={{ flex: 1, gap: 8 }}>
        <View
          accessible
          accessibilityLabel={`${comment.author.name}: ${comment.replyTo ? `@${comment.replyTo.name} ` : ''}${comment.text}`}
          style={{
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 4,
            backgroundColor: theme.skeletonSurface,
          }}
        >
          <Text variant="bodyMd">{comment.author.name}</Text>
          <Text variant="bodyMd" tone="muted">
            {comment.replyTo ? (
              <Text variant="bodyMd" tone="primary">{`@${comment.replyTo.name} `}</Text>
            ) : null}
            {comment.text}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, paddingLeft: 8 }}>
          <Text variant="bodySm" tone="muted">
            {comment.pending ? c.sending : formatAgo(comment.createdAt)}
          </Text>
          {comment.pending ? null : (
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={onReply}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={c.replyTo(comment.author.name)}
            >
              <Text variant="bodySm" tone="muted">
                {c.reply}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const NOTICE_MS = 3500;

/**
 * The bar at the foot: your photo, "Add a comment…", send. Replying shows
 * "Replying to <name>" above it with a way out. While comments are not in the
 * API, a send keeps the text and says so for a few seconds.
 */
export function CommentBar({
  viewer,
  replyTo,
  onCancelReply,
  onSend,
  sending,
}: {
  viewer: Viewer | null;
  replyTo: PostComment | null;
  onCancelReply: () => void;
  /** Resolves with null when sent, or why it was not. */
  onSend: (text: string) => Promise<PostDetailErrorCode | null>;
  sending: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardShown = useKeyboardShown();
  const [text, setText] = useState('');
  // Remounting the uncontrolled field is how it is cleared after a send.
  const [fieldKey, setFieldKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const change = useCallback((t: string) => setText(t), []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const send = useCallback(() => {
    if (!text.trim() || sending) return;
    void onSend(text).then((problem) => {
      if (problem) {
        setNotice(postErrorMessages[problem]);
        return;
      }
      setText('');
      setFieldKey((k) => k + 1);
    });
  }, [text, sending, onSend]);

  const c = postCopy.comments;
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: theme.border,
        backgroundColor: theme.background,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: keyboardShown ? 12 : Math.max(insets.bottom, 12),
        gap: 8,
      }}
    >
      {replyTo ? (
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(120)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Text variant="bodyXs" tone="muted" style={{ flex: 1 }}>
            {c.replyingTo(replyTo.author.name)}
          </Text>
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={onCancelReply}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text variant="bodyXs" tone="primary">
              {c.cancelReply}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      ) : null}
      {notice ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)}>
          <Text variant="bodyXs" tone="muted" accessibilityLiveRegion="polite">
            {notice}
          </Text>
        </Animated.View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={viewer?.name ?? postCopy.going.you} uri={viewer?.avatarUrl ?? null} size={40} />
        <View style={{ flex: 1 }}>
          <TextField
            key={fieldKey}
            label={c.placeholder}
            labelHidden
            filled
            placeholder={replyTo ? c.replyPlaceholder(replyTo.author.name) : c.placeholder}
            onChangeText={change}
            onSubmitEditing={send}
            returnKeyType="send"
            maxLength={COMMENT_MAX}
          />
        </View>
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={send}
          disabled={sending}
          accessibilityRole="button"
          accessibilityLabel={c.send}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: text.trim() ? theme.primaryFill : theme.surfaceMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Host matchContents pointerEvents="none" ignoreSafeArea="all">
            <NativeIcon source={icons.send} size={16} color={text.trim() ? '#FFFFFF' : theme.muted} />
          </Host>
        </TouchableOpacity>
      </View>
    </View>
  );
}
