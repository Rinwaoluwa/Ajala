import { router } from 'expo-router';
import { Alert } from 'react-native';

import { SignUpOptionsScreen, signUpRoutes } from '@features/auth';

/**
 * Apple (MOB-004) and Google (MOB-003) sign-up need their SDKs and backend support,
 * which do not exist yet, so those buttons say so rather than doing nothing.
 */
const notYet = (provider: string) =>
  Alert.alert(`${provider} sign-up is coming soon`, 'For now, sign up with your email address.');

export default function SignUpOptionsRoute() {
  return (
    <SignUpOptionsScreen
      onApple={() => notYet('Apple')}
      onGoogle={() => notYet('Google')}
      onEmail={() => router.push(signUpRoutes.details)}
      onSignIn={() => router.replace(signUpRoutes.signIn)}
    />
  );
}
