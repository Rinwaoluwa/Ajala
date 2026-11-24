import { memo } from 'react';
import { useWindowDimensions } from 'react-native';

import { CardPhotos, JoinPill, PostListCard } from '@shared/components';
import { SCREEN_GUTTER } from '@shared/theme';

import type { ListedPost } from '../../domain/entities/Explore';
import { exploreCopy, typeLabels } from '../copy';
import { usePostDescription } from '../hooks/usePostDescription';

/**
 * A post in the Explore list (search results and Meetups Near You): the app's
 * list card (`PostListCard`), the one the home feed's posts are, so a post
 * looks the same in both places. Its photos at the head when it has any, the
 * type's tag, the title, the host's words, when and where, and Join.
 *
 * What it leaves off the feed's card:
 *   - The foot (Comment and Save): the list is for finding something to go to,
 *     and both are a tap away on the post.
 *   - The menu: there is nothing to hide in a list that was asked for.
 *
 * A photo opens the post here, as the rest of the card does (the feed opens it
 * full screen). Its photos are still swiped between on the card.
 *
 * The words are not in the list's data (backend request B10), so they arrive a
 * moment after the card (`usePostDescription`); the card holds their lines
 * open until then.
 *
 * Join is the quick RSVP every card has (`JoinPill`), in Explore's words: a
 * private post says Join too.
 */
function ListedPostCardComponent({
  post,
  mine,
  onPress,
  onBeforeRsvp,
}: {
  post: ListedPost;
  /** The reader's own post: it says Hosting, never Join. */
  mine: boolean;
  onPress: () => void;
  /** Asked before a first RSVP; resolve true to go ahead. */
  onBeforeRsvp: () => Promise<boolean>;
}) {
  const { width: screen } = useWindowDimensions();
  const words = usePostDescription(post.id);
  return (
    <PostListCard
      type={post.type}
      typeLabel={typeLabels[post.type]}
      title={post.title}
      words={words.text}
      wordsLoading={words.loading}
      startAt={post.startAt}
      placeName={post.placeName}
      localityLabel={post.localityLabel}
      onPress={onPress}
      photos={
        post.images.length > 0 ? (
          <CardPhotos
            images={post.images}
            // The list is the screen less its margins, and the card its own hairline each side.
            width={screen - SCREEN_GUTTER * 2 - 2}
            onOpen={onPress}
            label={post.title}
          />
        ) : null
      }
      action={
        <JoinPill
          postId={post.id}
          rsvpState={post.rsvpState}
          privatePost={post.visibility === 'private'}
          mine={mine}
          onBeforeRsvp={onBeforeRsvp}
          labels={exploreCopy.join}
        />
      }
    />
  );
}

/** Memoised: a long list redraws only the card that changed. */
export const ListedPostCard = memo(ListedPostCardComponent);
