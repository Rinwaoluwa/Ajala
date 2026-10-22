import { memo, useCallback, useMemo, useState } from 'react';

import { useTheme } from '@shared/hooks/useTheme';
import { layout } from '@shared/theme';

import { icons } from '../ui/icons';
import { NativeIcon } from '../ui/NativeIcon';
import { TextField, type TextFieldProps } from './TextField';

/**
 * A text field for a password, with an eye button that shows or hides it.
 *
 * Switching visibility swaps SwiftUI's `SecureField` for a `TextField`. Both read
 * the same native text state inside Expo UI's `TextInput`, so what the user typed
 * survives the swap.
 *
 * The eye is a glyph inside a full platform-size tap area (44pt iOS, 48dp
 * Android) — see `TextField`'s `trailingAction`. It is drawn at the field icon
 * size, which fills the 20pt icon box the design sets the field's height by.
 *
 * Password managers: `autoComplete` defaults to `new-password`, which lets iOS
 * and Google suggest a strong password and offer to save it. Sign-in passes
 * `current-password` so they offer the saved one instead. Pair it with a
 * `username` field for the account — that is what the managers save it under.
 */

const EYE_SIZE = layout.input.iconSize;

export type PasswordFieldProps = Omit<TextFieldProps, 'secureTextEntry' | 'trailing' | 'trailingAction'>;

function PasswordFieldComponent(props: PasswordFieldProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const toggle = useCallback(() => setVisible((v) => !v), []);

  const trailingAction = useMemo(
    () => ({
      onPress: toggle,
      accessibilityLabel: visible ? 'Hide password' : 'Show password',
      testID: props.testID ? `${props.testID}-toggle` : undefined,
    }),
    [toggle, visible, props.testID],
  );

  return (
    <TextField
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="new-password"
      {...props}
      secureTextEntry={!visible}
      trailing={<NativeIcon source={visible ? icons.hide : icons.show} size={EYE_SIZE} color={theme.muted} />}
      trailingAction={trailingAction}
    />
  );
}

/**
 * Memoised: this renders native Expo UI views, so re-rendering it for a change
 * elsewhere on the form does real native work. Its props are stable by
 * construction — see the hooks that build them.
 */
export const PasswordField = memo(PasswordFieldComponent);
