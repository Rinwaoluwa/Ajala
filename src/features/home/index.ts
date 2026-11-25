/**
 * Public API of the `home` feature: the feed, and Travel (the city picker that
 * teleports the feed; its paywall belongs to `payment`).
 */

export { HomeScreen, type HomeScreenProps } from './presentation/screens/HomeScreen';
export { TravelScreen, type TravelScreenProps } from './presentation/screens/TravelScreen';
export { homeRoutes } from './presentation/navigation/routes';
export type { PostCard, PostType } from './domain/entities/Feed';
/** A post's comment count for its card, wherever the feed's card is drawn (the Saved list). */
export { useCardCommentCount } from './presentation/hooks/useCardCommentCount';
