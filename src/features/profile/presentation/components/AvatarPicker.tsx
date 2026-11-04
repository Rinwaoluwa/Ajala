import { Host } from '@expo/ui';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { NativeIcon, NativeSpinner, Text, TextLink, icons } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import type { AvatarState } from '../state/ProfileSetupContext';
import { profileErrorMessages, setupCopy } from '../copy';

/**
 * "Add profile photo" (Figma "Set up your profile"): an 84pt circle with a
 * person glyph and a 30pt teal "+" badge at its lower right, and the link below.
 *
 * The circle is the pale chip fill in both schemes, as both frames draw it. A
 * picked photo shows at once, dimmed under a spinner while it uploads; a failed
 * upload puts the old one back and says why. The photo fades in over 200ms.
 *
 * Both the circle and the link open the same choice (library, camera, remove).
 */

const SIZE = 84;
const BADGE = 30;

export type AvatarPickerProps = {
  avatar: AvatarState;
  onPress: () => void;
};

export function AvatarPicker({ avatar, onPress }: AvatarPickerProps) {
  const theme = useTheme();
  const label = avatar.uri ? setupCopy.basics.changePhoto : setupCopy.basics.addPhoto;

  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable
        onPress={onPress}
        disabled={avatar.uploading}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ busy: avatar.uploading }}
        hitSlop={8}
      >
        <View
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            backgroundColor: theme.chipFill,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {avatar.uri ? (
            <Image
              source={{ uri: avatar.uri }}
              style={{
                width: SIZE,
                height: SIZE,
                opacity: avatar.uploading ? 0.5 : 1,
              }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <Host matchContents pointerEvents="none" ignoreSafeArea="all">
              <NativeIcon source={icons.person} size={26} color={palette.inkSecondary} />
            </Host>
          )}
          {avatar.uploading ? (
            <View style={{ position: 'absolute' }} pointerEvents="none">
              <Host matchContents>
                <NativeSpinner size={20} color={theme.primaryFill} />
              </Host>
            </View>
          ) : null}
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: -6,
            bottom: -2,
            width: BADGE,
            height: BADGE,
            borderRadius: BADGE / 2,
            backgroundColor: theme.primaryFill,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Host matchContents>
            <NativeIcon source={icons.add} size={13} color={theme.primaryFillForeground} />
          </Host>
        </View>
      </Pressable>
      <View className="mt-16">
        <TextLink label={label} onPress={onPress} emphasis="plain" />
      </View>
      {avatar.error ? (
        <Text
          variant="bodyXs"
          tone="destructive"
          className="mt-4 text-center"
          accessibilityLiveRegion="polite"
        >
          {profileErrorMessages[avatar.error]}
        </Text>
      ) : null}
    </View>
  );
}
