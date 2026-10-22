/**
 * Public API of the `auth` feature.
 *
 * This file is the ONLY entry point other features and the `app/` route tree may
 * import from. Repositories, use cases, hooks and internal components stay private.
 */

export { AuthProvider, useAuthState, useSignOut } from './presentation/state/AuthContext';
export { useEntryCheck } from './presentation/hooks/useEntryCheck';
export { SignUpFlowProvider } from './presentation/state/SignUpFlowContext';
export { SignInFlowProvider } from './presentation/state/SignInFlowContext';
export { PasswordResetFlowProvider } from './presentation/state/PasswordResetFlowContext';

export { SignUpOptionsScreen, type SignUpOptionsScreenProps } from './presentation/screens/SignUpOptionsScreen';
export { SignUpDetailsScreen, type SignUpDetailsScreenProps } from './presentation/screens/SignUpDetailsScreen';
export { VerifyEmailScreen, type VerifyEmailScreenProps } from './presentation/screens/VerifyEmailScreen';
export { SignInOptionsScreen, type SignInOptionsScreenProps } from './presentation/screens/SignInOptionsScreen';
export { SignInScreen, type SignInScreenProps } from './presentation/screens/SignInScreen';
export {
  StepUpVerificationScreen,
  type StepUpVerificationScreenProps,
} from './presentation/screens/StepUpVerificationScreen';
export { LinkAccountScreen, type LinkAccountScreenProps } from './presentation/screens/LinkAccountScreen';
export { AcceptTermsScreen, type AcceptTermsScreenProps } from './presentation/screens/AcceptTermsScreen';
export { ForgotPasswordScreen, type ForgotPasswordScreenProps } from './presentation/screens/ForgotPasswordScreen';
export { NewPasswordScreen, type NewPasswordScreenProps } from './presentation/screens/NewPasswordScreen';

export { SignUpStepHeader } from './presentation/components/SignUpStepHeader';
export {
  signUpRoutes,
  signInRoutes,
  accountRoutes,
  passwordResetRoutes,
  appRoutes,
  nextStepRoutes,
} from './presentation/navigation/routes';
export type { IdentityProvider } from './domain/entities/Account';
export type { NextStep } from './domain/rules/accountRules';
