import { View } from 'react-native';

import { Button, Illustration, Sheet, Text } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import type { PostKind } from '../../domain/postKinds';
import { KIND_ART } from '../kindArt';

/**
 * "Meetup published!" and its siblings: the success sheet, with the kind's own
 * art in the badge in place of a check (the same art as its "Create something"
 * card), the heading in the success colour, a line, and one way forward.
 *
 * React Native's `Sheet` rather than the native `StatusSheet`, which can only
 * draw single-colour marks. Dismissing it leads on like the button does.
 */
const BADGE = 64;

export function PublishedSheet({
  isPresented,
  kind,
  title,
  message,
  actionLabel,
  onAction,
}: {
  isPresented: boolean;
  kind: PostKind;
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const theme = useTheme();
  const art = KIND_ART[kind];
  return (
    <Sheet isPresented={isPresented} onDismiss={onAction}>
      <View style={{ gap: 4 }}>
        <View
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={{
            width: BADGE,
            height: BADGE,
            borderRadius: 16,
            backgroundColor: theme.successSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <Illustration name={art.name} width={art.width} active />
        </View>
        <Text variant="headingMd" accessibilityRole="header" style={{ color: theme.successTitle }}>
          {title}
        </Text>
        <Text variant="bodySm" tone="muted">
          {message}
        </Text>
        <View style={{ marginTop: 24 }}>
          <Button label={actionLabel} size="lg" fullWidth onPress={onAction} testID="status-sheet-action" />
        </View>
      </View>
    </Sheet>
  );
}
