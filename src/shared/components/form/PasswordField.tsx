import { Button as ExpoButton } from '@expo/ui';
import { memo, useState } from 'react';

import { useTheme } from '@shared/hooks/useTheme';

import { icons } from '../ui/icons';
import { a11yLabel } from '../ui/nativeA11y';
import { NativeIcon } from '../ui/NativeIcon';
import { TextField, type TextFieldProps } from './TextField';

/**
 * A text field for a password, with an eye button that shows or hides it.
 *
 * Switching visibility swaps SwiftUI's `SecureField` for a `TextField`. Both read
 * the same native text state inside Expo UI's `TextInput`, so what the user typed
 * survives the swap.
 */

/** SF Symbols' eye is wide for its size: 12pt draws the 15pt-wide eye in the design. */
const EYE_SIZE = 12;

export type PasswordFieldProps = Omit<TextFieldProps, 'secureTextEntry' | 'trailing'>;

function PasswordFieldComponent(props: PasswordFieldProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const label = visible ? 'Hide password' : 'Show password';

  return (
    <TextField
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="new-password"
      {...props}
      secureTextEntry={!visible}
      trailing={
        <ExpoButton
          variant="text"
          onPress={() => setVisible((v) => !v)}
          modifiers={a11yLabel(label)}
          testID={props.testID ? `${props.testID}-toggle` : undefined}
        >
          <NativeIcon source={visible ? icons.hide : icons.show} size={EYE_SIZE} color={theme.muted} />
        </ExpoButton>
      }
    />
  );
}

/**
 * Memoised: this renders native Expo UI views, so re-rendering it for a change
 * elsewhere on the form does real native work. Its props are stable by
 * construction — see the hooks that build them.
 */
export const PasswordField = memo(PasswordFieldComponent);
