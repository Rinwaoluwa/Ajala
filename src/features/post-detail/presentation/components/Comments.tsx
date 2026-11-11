import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Avatar,
  EmptyState,
  MenuButton,
  SkeletonBlock,
  SkeletonPulse,
  SvgIcon,
  Text,
  TextField,
  TextLink,
  enterRise,
  type MenuAction,
} from '@shared/components';
import { haptics } from '@shared/feedback/haptics';
import { useKeyboardShown } from '@shared/hooks/useKeyboardShown';
import { useTheme } from '@shared/hooks/useTheme';

import type { PostComment, Viewer } from '../../domain/entities/PostDetail';
import type { PostDetailErrorCode } from '../../domain/entities/PostDetailError';
import { canReport } from '../../domain/rules/commentRules';
import { COMMENT_MAX } from '../../domain/usecases/PostDetailUseCases';
import { postCopy, postErrorMessages } from '../copy';
import { formatAgo } from '../format';
import { useReplies } from '../hooks/useComments';

/** What a comment row can do; the screen asks before deleting and opens the report dialog. */
export type CommentHandlers = {
  onReply: (comment: PostComment) => void;
  onDelete: (comment: PostComment) => void;
  onReport: (comment: PostComment) => void;
  /** The commenter's profile, from their photo or name. */
  onOpenProfile: (userId: string) => void;
};

/**
 * Comments (Figma post detail): "Comments" with the count, then one row per
 * top-level comment — the person's photo, a pale rounded bubble with their name
 * and what they said, and under it "5h ago · Reply · ⋯". The ⋯ is the native
 * menu with Delete (when `canDelete`) and Report (someone else's comment).
 *
 * Replies (one level, spec §2.18) sit indented under their comment behind
 * "View N replies", loaded when opened. A deleted comment that still has
 * replies reads "Comment deleted". Oldest first; new rows rise in (`enterRise`).
 *
 * Empty: "No comments yet / Have a question? Start the conversation."
 */
export function CommentsSection({
  postId,
  comments,
  total,
  loading,
  failed,
  onRetry,
  hasMore,
  onLoadMore,
  openThreads,
  onToggleThread,
  ...handlers
}: {
  postId: string;
  comments: PostComment[];
  total: number;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  hasMore: boolean;
  onLoadMore: () => void;
  openThreads: ReadonlySet<string>;
  onToggleThread: (commentId: string) => void;
} & CommentHandlers) {
  const theme = useTheme();
  const c = postCopy.comments;
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <Text variant="headingMd" accessibilityRole="header">
          {c.title}
        </Text>
        <Text variant="bodySm" tone="muted">
          {total}
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
      ) : failed && comments.length === 0 ? (
        <View style={{ gap: 8, alignItems: 'flex-start' }}>
          <Text variant="bodySm" tone="muted">
            {c.failed}
          </Text>
          <TextLink label={c.retry} onPress={onRetry} emphasis="plain" />
        </View>
      ) : comments.length === 0 ? (
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
              <CommentThread
                postId={postId}
                comment={comment}
                open={openThreads.has(comment.id)}
                onToggle={() => onToggleThread(comment.id)}
                {...handlers}
              />
            </Animated.View>
          ))}
          {hasMore ? <TextLink label={c.more} onPress={onLoadMore} emphasis="plain" /> : null}
        </View>
      )}
    </View>
  );
}

/** A top-level comment and, once opened, its replies indented under it. */
function CommentThread({
  postId,
  comment,
  open,
  onToggle,
  ...handlers
}: { postId: string; comment: PostComment; open: boolean; onToggle: () => void } & CommentHandlers) {
  const c = postCopy.comments;
  const thread = useReplies(postId, comment.id, open);
  const count = comment.replyCount;
  return (
    <CommentRow comment={comment} avatar={44} {...handlers}>
      {count > 0 || (open && thread.replies.length > 0) ? (
        <View style={{ gap: 14 }}>
          {open ? (
            <>
              {thread.replies.map((reply) => (
                <Animated.View key={reply.id} entering={enterRise(0)}>
                  <CommentRow comment={reply} avatar={32} {...handlers} />
                </Animated.View>
              ))}
              {thread.loading ? (
                <SkeletonPulse label={c.loading}>
                  <SkeletonBlock height={48} radius={16} />
                </SkeletonPulse>
              ) : null}
              {thread.failed ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12 }}>
                  <Text variant="bodySm" tone="muted">
                    {c.repliesFailed}
                  </Text>
                  <TextLink label={c.retry} onPress={thread.retry} emphasis="plain" />
                </View>
              ) : null}
              {thread.hasMore ? (
                <TextLink label={c.moreReplies} onPress={thread.loadMore} emphasis="plain" />
              ) : null}
            </>
          ) : null}
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={onToggle}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            style={{ alignSelf: 'flex-start', paddingLeft: 8 }}
          >
            <Text variant="bodySm" tone="primary">
              {open ? c.hideReplies : c.viewReplies(count)}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </CommentRow>
  );
}

function CommentRow({
  comment,
  avatar,
  children,
  onReply,
  onDelete,
  onReport,
  onOpenProfile,
}: {
  comment: PostComment;
  avatar: number;
  /** What sits under it in the same column: the thread's replies. */
  children?: ReactNode;
} & CommentHandlers) {
  const theme = useTheme();
  const c = postCopy.comments;
  const author = comment.author;
  const live = !comment.deleted && !comment.pending && author !== null;
  const menu: MenuAction[] = [
    ...(comment.canDelete && live
      ? [{ label: c.delete, systemImage: 'trash', destructive: true, onPress: () => onDelete(comment) }]
      : []),
    ...(canReport(comment)
      ? [{ label: c.report, systemImage: 'flag', destructive: true, onPress: () => onReport(comment) }]
      : []),
  ];
  const openProfile = author ? () => onOpenProfile(author.userId) : undefined;

  return (
    <View style={{ flexDirection: 'row', gap: 12, opacity: comment.pending ? 0.6 : 1 }}>
      {author ? (
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={openProfile}
          disabled={comment.pending}
          accessibilityRole="button"
          accessibilityLabel={c.openProfile(author.name)}
          style={{ alignSelf: 'flex-start' }}
        >
          <Avatar name={author.name} uri={author.avatarUrl} size={avatar} />
        </TouchableOpacity>
      ) : (
        // The deleted comment's place: a plain disc, so its replies still line up.
        <View
          importantForAccessibility="no"
          style={{ width: avatar, height: avatar, borderRadius: avatar / 2, backgroundColor: theme.skeletonSurface }}
        />
      )}
      <View style={{ flex: 1, gap: 8 }}>
        <View
          accessible
          accessibilityLabel={author ? `${author.name}: ${comment.body ?? ''}` : c.deleted}
          style={{
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 4,
            backgroundColor: theme.skeletonSurface,
          }}
        >
          {author ? (
            <>
              <Text variant="bodyMd" onPress={comment.pending ? undefined : openProfile} suppressHighlighting>
                {author.name}
              </Text>
              <Text variant="bodyMd" tone="muted">
                {comment.body}
              </Text>
            </>
          ) : (
            <Text variant="bodyMd" tone="muted" style={{ fontStyle: 'italic' }}>
              {c.deleted}
            </Text>
          )}
        </View>
        {/* Wraps at large text sizes rather than pushing the ⋯ off the row. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 20, rowGap: 4, paddingLeft: 8 }}>
          <Text variant="bodySm" tone="muted">
            {comment.pending ? c.sending : formatAgo(comment.createdAt)}
          </Text>
          {live ? (
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => onReply(comment)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={c.replyTo(author.name)}
            >
              <Text variant="bodySm" tone="muted">
                {c.reply}
              </Text>
            </TouchableOpacity>
          ) : null}
          {menu.length && live ? (
            <MenuButton actions={menu} accessibilityLabel={c.options} cancelLabel={postCopy.close}>
              <View style={{ minHeight: 28, minWidth: 32, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="ellipsis-horizontal" size={16} color={theme.muted} />
              </View>
            </MenuButton>
          ) : null}
        </View>
        {children}
      </View>
    </View>
  );
}

const NOTICE_MS = 3500;

/** The comment bar's padding above and below its field. */
export const COMMENT_BAR_PAD = 16;

/**
 * The bar at the foot: your photo, "Add a comment…", send. Replying shows
 * "Replying to <name>" above it with a way out. A refusal (too long, offline)
 * shows above the field for a few seconds and keeps the text. On a cancelled
 * post the field gives way to a line saying comments are closed.
 */
export function CommentBar({
  viewer,
  replyTo,
  onCancelReply,
  onSend,
  sending,
  closed,
}: {
  viewer: Viewer | null;
  replyTo: PostComment | null;
  onCancelReply: () => void;
  /** Resolves with null when sent, or why it was not. */
  onSend: (text: string) => Promise<PostDetailErrorCode | null>;
  sending: boolean;
  closed: boolean;
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
    if (!text.trim() || sending || closed) return;
    haptics.tap();
    void onSend(text).then((problem) => {
      // Closed has its own line below; anything else is said for a moment.
      if (problem === 'postCancelled') return;
      if (problem) {
        haptics.error();
        setNotice(postErrorMessages[problem]);
        return;
      }
      setText('');
      setFieldKey((k) => k + 1);
    });
  }, [text, sending, closed, onSend]);

  const c = postCopy.comments;
  const replyName = replyTo?.author?.name ?? null;
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: theme.border,
        backgroundColor: theme.background,
        paddingHorizontal: 20,
        // The same 16pt above the field as below it: below, that is the home indicator's
        // room while the keyboard is down, and 16pt above the keyboard while it is up
        // (iOS: `KeyboardStickyBar gap`; Android: the app shrinks above the keyboard).
        paddingTop: COMMENT_BAR_PAD,
        paddingBottom:
          Platform.OS === 'android' && keyboardShown ? COMMENT_BAR_PAD : Math.max(insets.bottom, COMMENT_BAR_PAD),
        gap: 8,
      }}
    >
      {closed ? (
        <Animated.View entering={FadeIn.duration(180)}>
          <Text variant="bodySm" tone="muted" accessibilityLiveRegion="polite">
            {c.closed}
          </Text>
        </Animated.View>
      ) : (
        <>
          {replyName ? (
            <Animated.View
              entering={FadeIn.duration(160)}
              exiting={FadeOut.duration(120)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Text variant="bodyXs" tone="muted" style={{ flex: 1 }}>
                {c.replyingTo(replyName)}
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
                placeholder={replyName ? c.replyPlaceholder(replyName) : c.placeholder}
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
              {/* The supplied send mark (`assets/icons/send.svg`), as in chat. */}
              <SvgIcon name="send" size={16} tint={text.trim() ? '#FFFFFF' : theme.muted} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
