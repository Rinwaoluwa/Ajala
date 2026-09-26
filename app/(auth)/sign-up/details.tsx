import { router } from 'expo-router';

import { SignUpDetailsScreen, signUpRoutes } from '@features/auth';

export default function SignUpDetailsRoute() {
  return (
    <SignUpDetailsScreen onBack={() => router.back()} onCodeSent={() => router.push(signUpRoutes.verify)} />
  );
}
