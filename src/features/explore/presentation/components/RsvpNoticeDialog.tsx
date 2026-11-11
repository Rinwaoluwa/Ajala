import { Pressable, View } from 'react-native';

import { Host, Button, Dialog, NativeIcon, Text, icons } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import { exploreCopy } from '../copy';

/**
 * "Before you RSVP" (Figma Map_Overlay_Mini): an eye, the heading in teal (Marigold
 * on dark), two paragraphs on meeting safely, "I understand, RSVP" and "Not now".
 * Shown before someone's first RSVP on this phone.
 */
export function RsvpNoticeDialog({
  isPresented,
  onAccept,
  onDismiss,
}: {
  isPresented: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const copy = exploreCopy.notice;
  return (
    <Dialog isPresented={isPresented} onDismiss={onDismiss} accessibilityLabel={copy.title}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Host matchContents>
          <NativeIcon source={icons.show} size={26} color={theme.foreground} />
        </Host>
        <Pressable
          onPress={onDismiss}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={exploreCopy.card.close}
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: theme.surfaceMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Host matchContents pointerEvents="none" ignoreSafeArea="all">
            <NativeIcon source={icons.close} size={10} color={theme.muted} />
          </Host>
        </Pressable>
      </View>
      <Text variant="headingMd" tone="link" className="mt-12" accessibilityRole="header">
        {copy.title}
      </Text>
      <Text variant="bodySm" tone="muted" className="mt-12">
        {copy.body}
      </Text>
      <Text variant="bodySm" tone="muted" className="mt-12">
        {copy.body2}
      </Text>
      <View className="mt-20">
        <Button
          label={copy.accept}
          fullWidth
          surface={theme.surface}
          onPress={onAccept}
          testID="rsvp-notice-accept"
        />
      </View>
      <View className="mt-4 items-center">
        <Button label={copy.later} variant="ghost" surface={theme.surface} onPress={onDismiss} />
      </View>
    </Dialog>
  );
}
