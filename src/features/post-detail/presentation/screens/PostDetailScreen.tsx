import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  useWindowDimensions,
  Share,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReportPostFlow } from '@features/explore';
import {
  Avatar,
  Button,
  EmptyState,
  NoteCard,
  StatusSheet,
  SvgIcon,
  Tag,
  Text,
  VectorIcon,
  enterRise,
  type MenuAction,
} from '@shared/components';
import { useSavePost } from '@shared/hooks/useSavePost';
import { useTheme } from '@shared/hooks/useTheme';

import type { PostComment, PostDetail, PostType } from '../../domain/entities/PostDetail';
import { isPostDetailError } from '../../domain/entities/PostDetailError';
import { commentsClosed } from '../../domain/rules/commentRules';
import { postLink, spotsLeft } from '../../domain/rules/postDetailRules';
import { postCopy, postErrorMessages } from '../copy';
import { formatPrice, formatRecurrence, formatWhen } from '../format';
import { usePostDetail } from '../hooks/usePostDetail';
import { CommentBar, CommentsSection } from '../components/Comments';
import { useComments } from '../hooks/useComments';
import { InfoRow, StatTile } from '../components/InfoRow';
import { ClosedNote, JoinBar } from '../components/JoinBar';
import { LineList } from '../components/LineList';
import { PostHero } from '../components/PostHero';
import { PostSkeleton } from '../components/PostSkeleton';
import { ReportCommentDialog } from '../components/ReportCommentDialog';
import { WhoIsGoing } from '../components/WhoIsGoing';

/**
 * The post page (Figma post detail, API map §6): the photos (with the bookmark),
 * title, host — with Message, or the host's Group chat — and description; when
 * (and until when, and whether it repeats) and where; price or the shared cost
 * and how many have joined; the main button (join, request, going, full…) and
 * Share; an Event's running order or a Plan's itinerary; safety tips; who's
 * going; comments and their replies.
 *
 * States: a skeleton while it loads; "This post isn't available" for a 404 (a
 * draft, removed, or the host blocked the viewer); a retry when the network
 * failed. Pulling down past the top stretches the photo (no gap above it); the
 * post is fetched again each time the page opens.
 *
 * Motion: the body rises in once loaded (`enterRise`); the button's label
 * cross-fades as the state changes; people rows rise in, staggered.
 */

/** What the card that was tapped already shows, drawn at once while the rest loads. */
export type PostPreview = { title: string; imageUrl: string | null; type: PostType };

export type PostDetailScreenProps = {
  postId: string;
  onBack: () => void;
  onOpenProfile: (userId: string) => void;
  /** A direct chat with the host (`POST /conversations { userId }`, behind the chat route). */
  onMessageHost?: (hostId: string) => void;
  /** The host's group chat with everyone going (`POST /conversations { postId }`). */
  onOpenGroupChat?: (postId: string) => void;
  /**
   * The tapped card's photo, title and type. With it the page opens on its real
   * header (the photo is already in the image cache) rather than a blank or a
   * skeleton band, so the zoom from the card never shows an empty screen.
   */
  preview?: PostPreview | null;
};

export function PostDetailScreen({
  postId,
  onBack,
  onOpenProfile,
  onMessageHost,
  onOpenGroupChat,
  preview = null,
}: PostDetailScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height: screenHeight } = useWindowDimensions();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  // The hero's height (see PostHero): the backing fades in over its last 40pt.
  const heroHeight = Math.min(Math.round(width * 0.62), Math.round(screenHeight * 0.42));
  const statusBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [heroHeight - 40, heroHeight], [0, 1], 'clamp'),
  }));
  const vm = usePostDetail(postId);
  const talk = useComments(postId, vm.viewer, commentsClosed(vm.post));
  // The shared save: optimistic, and the same on every card showing this post.
  const save = useSavePost(postId, vm.post?.saved ?? false);
  const [reporting, setReporting] = useState<string | null>(null);

  if (vm.loading) {
    return (
      <View className="flex-1 bg-background">
        {preview ? (
          <>
            <PostHero
              images={preview.imageUrl ? [preview.imageUrl] : []}
              title={preview.title}
              type={preview.type}
              onBack={onBack}
              menu={null}
            />
            <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 16 }}>
              <Text variant="headingLg" accessibilityRole="header">
                {preview.title}
              </Text>
              <PostSkeleton body />
            </View>
          </>
        ) : (
          <PostSkeleton />
        )}
      </View>
    );
  }

  if (!vm.post) {
    const notFound = vm.error === 'notFound';
    const copy = notFound ? postCopy.notFound : postCopy.failed;
    return (
      <View className="flex-1 items-center justify-center bg-background px-20">
        <EmptyState
          title={copy.title}
          body={copy.body}
          action={{ label: copy.action, onPress: notFound ? onBack : vm.retry, variant: 'primary' }}
        />
      </View>
    );
  }

  const post = vm.post;
  const action = vm.action ?? 'none';
  const when = formatWhen(post.startAt, post.endAt);
  const where = post.placeName ?? post.cityLabel;
  const left = spotsLeft(post);
  const priceTile = priceOf(post);
  // Saving answers 409 on a draft or a cancelled post, so the bookmark shows on live ones only.
  const canSave = post.status === 'published';
  const chat =
    post.isHost && post.status === 'published' && onOpenGroupChat
      ? { label: postCopy.groupChat, hint: postCopy.groupChatHint, onPress: () => onOpenGroupChat(post.id) }
      : !post.isHost && onMessageHost
        ? { label: postCopy.message, hint: postCopy.messageHost(post.host.name), onPress: () => onMessageHost(post.host.id) }
        : null;

  const confirmDeleteComment = (comment: PostComment) => {
    const c = postCopy.comments;
    Alert.alert(c.deleteTitle, c.deleteBody, [
      { text: c.keep, style: 'cancel' },
      {
        text: c.deleteConfirm,
        style: 'destructive',
        onPress: () => void talk.deleteComment(comment).catch((e: unknown) => showError(e)),
      },
    ]);
  };

  const confirmLeave = () => {
    const withdraw = post.rsvpState !== 'going';
    const l = postCopy.leave;
    Alert.alert(withdraw ? l.withdrawTitle : l.title(post.type), withdraw ? l.withdrawBody : l.body, [
      { text: l.stay, style: 'cancel' },
      { text: withdraw ? l.withdraw : l.confirm, style: 'destructive', onPress: vm.leave },
    ]);
  };

  const share = () => {
    const link = postLink(post.id);
    void Share.share({ message: postCopy.shareMessage(post.title, link), url: link }).catch(() => undefined);
  };

  const openMaps = () => {
    const label = encodeURIComponent(where ?? post.title);
    const url =
      post.lat !== null && post.lng !== null
        ? Platform.OS === 'ios'
          ? `http://maps.apple.com/?ll=${post.lat},${post.lng}&q=${label}`
          : `geo:${post.lat},${post.lng}?q=${post.lat},${post.lng}(${label})`
        : Platform.OS === 'ios'
          ? `http://maps.apple.com/?q=${label}`
          : `geo:0,0?q=${label}`;
    void Linking.openURL(url).catch(() => undefined);
  };

  const menu = menuActions(post, {
    onReport: () => setReporting(post.id),
    onCancel: () => confirmCancel(),
    onDelete: () => confirmDelete(),
  });

  const confirmCancel = () => {
    const h = postCopy.host;
    Alert.alert(h.cancelTitle, h.cancelBody, [
      { text: h.keep, style: 'cancel' },
      {
        text: h.cancelConfirm,
        style: 'destructive',
        onPress: () => void vm.cancelPost().catch((e: unknown) => showError(e)),
      },
    ]);
  };

  const confirmDelete = () => {
    const h = postCopy.host;
    Alert.alert(h.deleteTitle, h.deleteBody, [
      { text: h.keep, style: 'cancel' },
      {
        text: h.deleteConfirm,
        style: 'destructive',
        onPress: () =>
          void vm
            .deletePost()
            .then(onBack)
            .catch((e: unknown) => {
              if (isPostDetailError(e) && e.code === 'hasAttendees') {
                Alert.alert(h.hasAttendees, undefined, [
                  { text: h.keep, style: 'cancel' },
                  { text: h.cancelConfirm, style: 'destructive', onPress: confirmCancel },
                ]);
              } else showError(e);
            }),
      },
    ]);
  };

  return (
    // The comment bar is under the scroll view, so the screen itself makes room for the keyboard.
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <PostHero
          images={post.images}
          title={post.title}
          type={post.type}
          onBack={onBack}
          menu={menu}
          save={canSave ? { saved: save.saved, onToggle: save.toggle } : null}
          scrollY={scrollY}
          firstPlaceholder={preview?.imageUrl}
        />

        {/* After a preview the title is already there: the rest fades in under it, nothing moves. */}
        <Animated.View
          entering={preview ? FadeIn.duration(180) : enterRise(40)}
          style={{ paddingHorizontal: 20, paddingTop: 20, gap: 16 }}
        >
          <Text variant="headingLg" accessibilityRole="header">
            {post.title}
          </Text>

          {/* Wraps: at large text sizes the chat button drops under the host rather than squeezing them. */}
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 8 }}
          >
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => onOpenProfile(post.host.id)}
              accessibilityRole="button"
              accessibilityLabel={`${postCopy.hostedBy} ${post.host.name}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1, marginRight: 'auto' }}
            >
              <Avatar name={post.host.name} uri={post.host.avatarUrl} size={32} ring />
              <Text variant="bodySm" tone="muted" style={{ flexShrink: 1 }}>
                {postCopy.hostedBy} <Text variant="bodySm">{post.host.name}</Text>
              </Text>
            </TouchableOpacity>
            {chat ? (
              <View accessibilityHint={chat.hint}>
                <Button label={chat.label} variant="secondary" size="sm" onPress={chat.onPress} />
              </View>
            ) : null}
          </View>

          {post.description ? (
            <Text variant="bodyMd" tone="muted">
              {post.description}
            </Text>
          ) : null}

          {post.interests.length ? (
            <View
              accessibilityLabel={`${postCopy.interests}: ${post.interests.map((i) => i.name).join(', ')}`}
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
            >
              {post.interests.map((i) => (
                <Tag key={i.id} label={i.emoji ? `${i.emoji} ${i.name}` : i.name} />
              ))}
            </View>
          ) : null}

          {when ? (
            <InfoRow
              icon={<SvgIcon name="calendar" size={18} tint={theme.selectedForeground} />}
              label={postCopy.dateTime}
              value={when}
              note={post.recurrence ? formatRecurrence(post.recurrence) : null}
            />
          ) : null}
          {where ? (
            <InfoRow
              icon={<VectorIcon name="pin" size={18} color={theme.selectedForeground} />}
              label={postCopy.location}
              value={where}
              onPress={openMaps}
              hint={postCopy.openInMaps}
            />
          ) : null}

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <StatTile label={postCopy.price} value={priceTile.value} note={priceTile.note} />
            <StatTile
              label={postCopy.joined}
              value={String(post.goingCount)}
              note={
                left === null || post.capacity === null
                  ? postCopy.noLimit
                  : postCopy.spotsLeft(left, post.capacity)
              }
            />
          </View>

          <JoinBar
            post={post}
            action={action}
            pending={vm.rsvpPending}
            onJoin={vm.join}
            onBook={() => void vm.book()}
            onLeave={confirmLeave}
            onShare={share}
            manageMenu={menu}
          />
          {post.isHost && post.externalUrl && post.linkClickCount !== null ? (
            <Text variant="bodySm" tone="muted">
              {postCopy.linkClicks(post.linkClickCount)}
            </Text>
          ) : null}
          {vm.rsvpError ? (
            <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">
              {postErrorMessages[vm.rsvpError]}
            </Text>
          ) : null}
          {action === 'full' ? (
            <ClosedNote
              title={postCopy.fullNote.title(post.type)}
              body={postCopy.fullNote.body(post.capacity)}
            />
          ) : action === 'cancelled' ? (
            <ClosedNote title={postCopy.cancelledNote.title} body={postCopy.cancelledNote.body} />
          ) : null}

          <LineList title={postCopy.schedule} lines={post.schedule} numbered={false} />
          <LineList title={postCopy.itinerary} lines={post.itinerary} numbered lineLabel={postCopy.stop} />

          <NoteCard title={postCopy.safety.title} body={postCopy.safety.body} />

          <WhoIsGoing
            going={vm.people.going}
            requested={vm.people.requested}
            total={vm.people.total}
            loading={vm.peopleLoading}
            failed={vm.peopleError !== null}
            hasMore={vm.hasMorePeople}
            responding={vm.responding}
            onRetry={vm.retryPeople}
            onMore={vm.loadMorePeople}
            onOpenPerson={onOpenProfile}
            onRespond={(userId, answer) => vm.respond({ userId, answer })}
          />

          <CommentsSection
            postId={post.id}
            comments={talk.comments}
            total={talk.total}
            loading={talk.loading}
            failed={talk.failed}
            onRetry={talk.retry}
            hasMore={talk.hasMore}
            onLoadMore={talk.loadMore}
            openThreads={talk.openThreads}
            onToggleThread={talk.toggleThread}
            onReply={talk.reply}
            onDelete={confirmDeleteComment}
            onReport={talk.startReport}
            onOpenProfile={onOpenProfile}
          />
        </Animated.View>
      </Animated.ScrollView>

      {/* Behind the status bar once the photo has scrolled away, so text never runs under the clock. */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: insets.top,
            backgroundColor: theme.background,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          },
          statusBarStyle,
        ]}
      />

      <CommentBar
        viewer={vm.viewer}
        replyTo={talk.replyTo}
        onCancelReply={talk.cancelReply}
        onSend={talk.submit}
        sending={talk.sending}
        closed={talk.closed}
      />

      <ReportPostFlow postId={reporting} onClose={() => setReporting(null)} />
      <ReportCommentDialog
        isPresented={talk.reporting !== null}
        submitting={talk.reportSubmitting}
        error={talk.reportError}
        onSubmit={talk.submitReport}
        onDismiss={talk.cancelReport}
      />
      <StatusSheet
        isPresented={talk.reportSent}
        tone="success"
        title={postCopy.reportComment.sentTitle}
        message={postCopy.reportComment.sentBody}
        actionLabel={postCopy.reportComment.sentAction}
        onAction={talk.dismissReportSent}
        onDismiss={talk.dismissReportSent}
      />
    </KeyboardAvoidingView>
  );
}

/**
 * The Price tile: the ticket price, or a Plan's or Group's shared cost as the
 * server split it ("About ₦12,000 each", spec §1.5), or Free. With both, the
 * share is the note under the price.
 */
function priceOf(post: PostDetail): { value: string; note: string | null } {
  const split = post.costSplit;
  if (post.price) {
    return {
      value: formatPrice(post.price),
      note: split ? postCopy.plusCostEach(formatPrice(split.perPerson)) : null,
    };
  }
  if (split) {
    return {
      value: postCopy.costEach(formatPrice(split.perPerson)),
      note: postCopy.costShared(formatPrice(split.total), split.expectedCount),
    };
  }
  return { value: postCopy.free, note: null };
}

function showError(e: unknown) {
  Alert.alert(postErrorMessages[isPostDetailError(e) ? e.code : 'unknown']);
}

/** The ⋯ menu: the host may cancel (a live post) or delete; anyone else may report. */
function menuActions(
  post: PostDetail,
  handlers: { onReport: () => void; onCancel: () => void; onDelete: () => void },
): MenuAction[] {
  const h = postCopy.host;
  if (!post.isHost) {
    return [{ label: postCopy.report, systemImage: 'flag', destructive: true, onPress: handlers.onReport }];
  }
  return [
    ...(post.status === 'published'
      ? [{ label: h.cancel, systemImage: 'xmark.circle', destructive: true, onPress: handlers.onCancel }]
      : []),
    { label: h.delete, systemImage: 'trash', destructive: true, onPress: handlers.onDelete },
  ];
}
