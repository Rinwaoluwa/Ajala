import type { IdentityProvider } from '../../domain/entities/Account';
import type { NextStep } from '../../domain/rules/accountRules';
import { CodeEntryForm } from '../components/CodeEntryForm';
import { CodeScreenLayout } from '../components/CodeScreenLayout';
import { linkAccountCopy, providerNames } from '../copy';
import { useAccountLink } from '../hooks/useAccountLink';

/**
 * Verification for linking Google or Apple to an account that already uses the
 * same email (409 ACCOUNT_LINK_REQUIRED).
 *
 * Not drawn in Figma: the screen-to-API map says to reuse the Verification
 * screen. The API does not say which address the code went to, so the copy
 * names the account rather than masking an address it does not have.
 */

export type LinkAccountScreenProps = {
  challengeId: string | null;
  provider: IdentityProvider;
  onBack: () => void;
  onSignedIn: (next: NextStep) => void;
};

export function LinkAccountScreen({ challengeId, provider, onBack, onSignedIn }: LinkAccountScreenProps) {
  const { otpRef, entry } = useAccountLink({ challengeId, onSignedIn });
  const name = providerNames[provider];

  return (
    <CodeScreenLayout headerTitle={linkAccountCopy.header(name)} onBack={onBack}>
      <CodeEntryForm
        body={linkAccountCopy.body(entry.length, name)}
        otpRef={otpRef}
        entry={entry}
        testID="link-account"
      />
    </CodeScreenLayout>
  );
}
