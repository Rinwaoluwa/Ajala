import { View } from 'react-native';

import { palette } from '@shared/theme';

import { Text } from '../ui/Text';

/**
 * A small label on a card: "Plan", "Hosting", "Request sent", "Completed",
 * "Earned". `tone` picks the look the designs give each:
 *   - `outline` — white with a hairline (the post type);
 *   - `success` — mint with teal ink (Hosting, Completed, Earned);
 *   - `pending` — pale Marigold with brown ink (Request sent);
 *   - `neutral` — pale grey.
 * Pale in both schemes, as the dark frames draw them, so the ink never flips.
 */
export type TagTone = 'outline' | 'success' | 'pending' | 'neutral';

const LOOK: Record<TagTone, { fill: string; ink: string; border?: string }> = {
  outline: { fill: '#FFFFFF', ink: palette.ink, border: '#E4E7EC' },
  success: { fill: '#E3F4F1', ink: palette.teal },
  pending: { fill: '#FBF0D5', ink: '#8A5A00' },
  neutral: { fill: '#F2F4F7', ink: palette.inkSecondary },
};

export function Tag({ label, tone = 'neutral' }: { label: string; tone?: TagTone }) {
  const look = LOOK[tone];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 3,
        backgroundColor: look.fill,
        borderWidth: look.border ? 1 : 0,
        borderColor: look.border,
      }}
    >
      <Text variant="labelXs" style={{ color: look.ink }}>
        {label}
      </Text>
    </View>
  );
}
