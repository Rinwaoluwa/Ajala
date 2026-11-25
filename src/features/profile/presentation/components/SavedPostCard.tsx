import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useCallback, useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { useCardCommentCount } from '@features/home';
import { CardPhotos, JoinPill, PostCardActions, PostListCard, Text, type MediaFrame } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import type { ProfileActivity } from '../../domain/entities/PublicProfile';
import { profileViewCopy } from '../profileViewCopy';

/**
 * A post in "Saved activities": the card it is on Home (`PostListCard`), so a
 * post looks the same wherever it is listed (product, 25 Nov).
 *
 *   - **Photos** at its head when it has any (`CardPhotos`), swiped between; a
 *     tap opens that photo full screen, as on Home.
 *   - **The type's tag, the title and the price** when it has one.
 *   - **When and where, and Join** at the end of their line (`JoinPill`): the
 *     same quick RSVP, so something saved can be joined from here. A private
 *     post says Request, as on Home. The reader's own post says Hosting.
 *   - **Comment and the bookmark** under a hairline (`PostCardActions`).
 *     Comment opens the post at its comments, with their number as on Home.
 *     The bookmark is how a post leaves this list: it empties at once, and the
 *     card goes when the list refreshes behind it.
 *
 * It has no menu: there is nothing to hide in a list the person made, and
 * copying the link and reporting are on the post.
 *
 * A post locked to its reader (a Plan, or one outside their area, without Pro:
 * MOB-077) keeps its title, date and city. Its photo is only a hint (blurred),
 * a lock and why stand where Join would, and every tap on it opens the paywall
 * (`onPress`, which the route sends there). It can be unsaved, not saved again.
 */
export type SavedPostCardProps = {
  activity: ProfileActivity;
  /** The reader's own post: it says Hosting, never Join. */
  mine: boolean;
  /** Opens the post, or the paywall for a locked one. */
  onPress: (activity: ProfileActivity) => void;
  onOpenComments: (activity: ProfileActivity) => void;
  onOpenPhoto: (activity: ProfileActivity, index: number, from: MediaFrame) => void;
  /** Asked before a first RSVP; resolve true to go ahead. */
  onBeforeRsvp: () => Promise<boolean>;
};

function SavedPostCardComponent({
  activity,
  mine,
  onPress,
  onOpenComments,
  onOpenPhoto,
  onBeforeRsvp,
}: SavedPostCardProps) {
  const theme = useTheme();
  const { width: screen } = useWindowDimensions();
  const copy = profileViewCopy.saved;
  const locked = activity.lockReason;
  const commentCount = useCardCommentCount(activity.id);
  const photos = useMemo(() => activity.images.map((p) => p.card), [activity.images]);
  const open = useCallback(() => onPress(activity), [onPress, activity]);
  const openPhoto = useCallback(
    (index: number, from: MediaFrame) => (locked ? onPress(activity) : onOpenPhoto(activity, index, from)),
    [locked, onPress, onOpenPhoto, activity],
  );

  return (
    <PostListCard
      type={activity.type}
      typeLabel={profileViewCopy.types[activity.type]}
      title={activity.title}
      price={activity.price}
      startAt={activity.startAt}
      // A post with no place of its own (or a locked one, whose place is withheld) names its city.
      placeName={activity.placeName ?? activity.locality?.label ?? null}
      localityLabel={activity.locality?.label ?? null}
      onPress={open}
      photos={
        photos.length > 0 ? (
          <CardPhotos
            images={photos}
            // The list is the screen less its margins, and the card its own hairline each side.
            width={screen - SCREEN_GUTTER * 2 - 2}
            onOpen={openPhoto}
            label={activity.title}
            blurred={locked !== null}
          />
        ) : null
      }
      action={
        locked ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36 }}>
            <Ionicons name="lock-closed" size={14} color={theme.muted} />
            <Text variant="labelSm" tone="muted">
              {profileViewCopy.activities.locked[locked]}
            </Text>
          </View>
        ) : (
          <JoinPill
            postId={activity.id}
            rsvpState={activity.rsvpState}
            privatePost={activity.visibility === 'private'}
            mine={mine}
            onBeforeRsvp={onBeforeRsvp}
            labels={copy.join}
          />
        )
      }
      footer={
        <PostCardActions
          postId={activity.id}
          saved={activity.saved}
          commentCount={commentCount}
          // A locked post's comments are behind the paywall with the rest of it.
          onOpenComments={() => (locked ? onPress(activity) : onOpenComments(activity))}
          labels={copy.actions}
          canSave={locked === null}
        />
      }
    />
  );
}

/** Memoised with stable handlers: a bookmark tapped redraws its own card, not the list. */
export const SavedPostCard = memo(SavedPostCardComponent);
