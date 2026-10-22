import { View } from 'react-native';

import { Button } from '@shared/components';

import type { IdentityProvider } from '../../domain/entities/Account';
import { providerIcons } from '../assets';

/**
 * The Apple, Google and email buttons on both "options" screens: large neutral
 * buttons, full width, 8pt apart.
 *
 * The provider being signed in with shows a spinner. The others stay as they are
 * rather than greying out — a second tap is ignored by the view model anyway, and
 * a whole column going grey reads as an error.
 *
 * Apple is left out where Sign in with Apple cannot run (Android).
 */

export type ProviderButtonsProps = {
  /** "Sign up with" or "Continue with". */
  verb: string;
  pending: IdentityProvider | null;
  showApple: boolean;
  onApple: () => void;
  onGoogle: () => void;
  onEmail: () => void;
  testID: string;
};

export function ProviderButtons({
  verb,
  pending,
  showApple,
  onApple,
  onGoogle,
  onEmail,
  testID,
}: ProviderButtonsProps) {
  return (
    <View className="gap-8">
      {showApple ? (
        <Button
          label={`${verb} Apple`}
          variant="neutral"
          size="lg"
          fullWidth
          icon={providerIcons.apple}
          loading={pending === 'apple'}
          onPress={onApple}
          testID={`${testID}-apple`}
        />
      ) : null}
      <Button
        label={`${verb} Google`}
        variant="neutral"
        size="lg"
        fullWidth
        icon={providerIcons.google}
        loading={pending === 'google'}
        onPress={onGoogle}
        testID={`${testID}-google`}
      />
      <Button
        label={`${verb} Email Address`}
        variant="neutral"
        size="lg"
        fullWidth
        icon={providerIcons.email}
        onPress={onEmail}
        testID={`${testID}-email`}
      />
    </View>
  );
}
