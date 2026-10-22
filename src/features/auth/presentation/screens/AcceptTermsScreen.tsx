import { View } from 'react-native';

import { Button, Screen, Text, TextLink } from '@shared/components';

import type { NextStep } from '../../domain/rules/accountRules';
import { AuthIntro } from '../components/AuthIntro';
import { useAcceptTerms } from '../hooks/useAcceptTerms';

/**
 * Updated terms, shown after sign-in when the terms changed since the person
 * last accepted them.
 *
 * NOT IN FIGMA. The screen-to-API map requires it ("termsUpToDate false → show
 * terms"), so it is built from the existing auth parts — the intro block, text
 * links, a large button — in the options screens' layout, and should be replaced
 * when design draws it.
 *
 * There is no way past it but accepting or signing out: the API has said this
 * account may not carry on under the old terms.
 */

const TOP_OFFSET = 40;
const LINK_GAP = 8;

export type AcceptTermsScreenProps = {
  /** With where `GET /me` says to go now: profile setup, or the app. */
  onAccepted: (next: NextStep) => void;
  onSignOut: () => void;
};

export function AcceptTermsScreen({ onAccepted, onSignOut }: AcceptTermsScreenProps) {
  const { openTerms, openPrivacy, submitting, error, accept } = useAcceptTerms({ onAccepted });

  return (
    <Screen scroll>
      <View style={{ paddingTop: TOP_OFFSET }}>
        <AuthIntro
          title="We've updated our terms"
          body="Please read and accept our updated Terms of Service and Privacy Policy to keep using Ajala."
        />

        <View className="mt-20 items-start" style={{ gap: LINK_GAP }}>
          {openTerms ? (
            <TextLink label="Read the Terms of Service" emphasis="plain" onPress={openTerms} testID="terms-read" />
          ) : null}
          {openPrivacy ? (
            <TextLink label="Read the Privacy Policy" emphasis="plain" onPress={openPrivacy} testID="terms-privacy" />
          ) : null}
        </View>
      </View>

      <View className="flex-1" />

      <View className="mb-24">
        <Button
          label="Accept and continue"
          size="lg"
          fullWidth
          loading={submitting}
          onPress={accept}
          testID="terms-accept"
        />
        {error ? (
          <Text variant="bodySm" tone="destructive" className="mt-12" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <View className="mt-16 items-center">
          <TextLink label="Sign out" tone="foreground" emphasis="plain" onPress={onSignOut} testID="terms-sign-out" />
        </View>
      </View>
    </Screen>
  );
}
