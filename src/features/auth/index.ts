/**
 * Public API of the `auth` feature.
 *
 * This file is the ONLY entry point other features and the `app/` route tree may
 * import from. Repositories, use cases, hooks and internal components stay private.
 */

export { SignUpFlowProvider } from './presentation/state/SignUpFlowContext';
export { SignUpOptionsScreen, type SignUpOptionsScreenProps } from './presentation/screens/SignUpOptionsScreen';
export { SignUpDetailsScreen, type SignUpDetailsScreenProps } from './presentation/screens/SignUpDetailsScreen';
export { VerifyEmailScreen, type VerifyEmailScreenProps } from './presentation/screens/VerifyEmailScreen';
export { SignUpStepHeader } from './presentation/components/SignUpStepHeader';
export { signUpRoutes } from './presentation/navigation/routes';
