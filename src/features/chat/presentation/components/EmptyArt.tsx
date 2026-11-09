import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { useTheme } from '@shared/hooks/useTheme';

/**
 * The art above Messages' empty and waiting states: a glyph in a mint circle.
 * Shared by the list's empty states and the start screen's "group chat is
 * full", so a calm state looks like the others rather than like an error.
 */
export function EmptyArt({ name }: { name: React.ComponentProps<typeof Ionicons>['name'] }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 104,
        height: 104,
        borderRadius: 52,
        backgroundColor: theme.selectedFill,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={name} size={44} color={theme.selectedForeground} />
    </View>
  );
}
