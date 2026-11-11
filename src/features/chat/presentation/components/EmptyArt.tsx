import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '@shared/hooks/useTheme';

/**
 * The art above Messages' empty and waiting states: a glyph in a mint circle.
 * Shared by the list's empty states and the start screen's "group chat is
 * full", so a calm state looks like the others rather than like an error.
 */
export function EmptyArt({ name }: { name: React.ComponentProps<typeof Ionicons>['name'] }) {
  const theme = useTheme();
  // A plain, large icon in the brand colour, as every empty state draws it (`EmptyState`'s icon).
  return <Ionicons name={name} size={56} color={theme.primary} />;
}
