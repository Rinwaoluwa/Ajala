import { Button as ExpoButton, Host, Text as ExpoText } from '@expo/ui';

import { useTheme } from '@shared/hooks/useTheme';
import { textStyles } from '@shared/theme';

import { NATIVE_BUTTON_INSET } from './nativeButtonInset';

/**
 * A short tappable phrase, such as "SIGN IN" at the end of "Already have an
 * account?".
 *
 * From the sign-up design: Plus Jakarta 600 at 14pt, in the link colour (Teal on
 * light, Marigold on dark). A native Expo UI button, so it gets platform press
 * feedback and reads as a button to VoiceOver. It hugs its label, so place it in a
 * row beside the sentence it finishes.
 */

export type TextLinkProps = {
  label: string;
  onPress: () => void;
  testID?: string;
};

export function TextLink({ label, onPress, testID }: TextLinkProps) {
  const theme = useTheme();

  return (
    // The negative margin cancels the native button's own content padding (Android),
    // so the link sits beside its sentence as it does on iOS.
    <Host matchContents style={{ marginHorizontal: -NATIVE_BUTTON_INSET }}>
      <ExpoButton variant="text" onPress={onPress} testID={testID}>
        <ExpoText
          textStyle={{
            fontFamily: textStyles.headingSm.fontFamily,
            fontSize: textStyles.bodySm.fontSize,
            lineHeight: textStyles.bodySm.lineHeight,
            fontWeight: '600',
            color: theme.link,
          }}
        >
          {label}
        </ExpoText>
      </ExpoButton>
    </Host>
  );
}
